import { 
  SessionState, 
  ActivitySegment, 
  SessionMetrics, 
  PopupState, 
  PopupMessage, 
  BackgroundResponse,
  SessionContext,
  NonLockReason,
  StoredSessionState,
  PendingUpload,
  AuthState
} from './types';
import { classifyDomain, loadDomainConfig, isProductiveDomainCached, isUnproductiveDomainCached } from './config/configStore';
import { extractDomain, isValidWebPage } from './utils/domain';
import { getCurrentTimestamp, calculateIdleSeconds, calculateSegmentDuration } from './utils/time';
import { startSession, uploadActivity, endSession } from './api/client';

// ============================================================================
// State Management
// ============================================================================

let currentSessionState: SessionState = 'noSession';
let currentTabId: number | null = null;
let currentUrl: string | null = null;
let currentDomain: string | null = null;
let domainClassification: 'productive' | 'unproductive' | 'neutral' = 'neutral';
let isProductive: boolean = false;  // Legacy: true if productive, false otherwise

let lastActivityTimestamp: number = getCurrentTimestamp();
let currentIdleSeconds: number = 0;
let lastCheckPopupStatus: 'passed' | 'failed' | 'none' = 'none';

let sessionId: string | null = null;
let sessionStartTimestamp: number = 0;
let activitySegments: ActivitySegment[] = [];
let currentSegment: ActivitySegment | null = null;

// Metrics counters
let totalSessionSeconds: number = 0;
let lockedInSeconds: number = 0;
let nonLockSeconds: number = 0;
let idleBeyond2minSeconds: number = 0;
let tabSwitchCount: number = 0;
let lockBreakCount: number = 0;  // Count transitions from locked-in → not-locked-in

// Domain config cache
let domainConfigCache: { productiveDomains: string[]; unproductiveDomains: string[] } | null = null;

// Finished session data (stored temporarily until user decides to upload or discard)
let finishedSessionMetrics: SessionMetrics | null = null;

// Random check state
let randomCheckAlarmName: string | null = null;
let randomCheckCountdown: number | null = null;
let randomCheckNotificationId: string | null = null;

// Upload interval
let uploadIntervalId: number | null = null;
const UPLOAD_INTERVAL_MS = 5 * 60 * 1000; // Upload every 5 minutes

// ============================================================================
// Lock-In State Machine
// ============================================================================

/**
 * Update lock-in state based on current context
 * Implements the core state machine logic:
 * - If no session → noSession
 * - If productive domain + idle < 120s + no failed checks → lockedIn
 * - If unproductive domain OR neutral domain OR idle >= 120s OR failed check → notLockedIn
 * 
 * Lock-in rules:
 * - Productive domains: eligible for lock-in when active and not idle
 * - Unproductive domains: always non-lock
 * - Neutral domains: always non-lock (neither productive nor unproductive)
 * - Idle > 2 minutes: time beyond 2:00 counts as non-lock
 * - Failed random check: switches to non-lock
 */
function updateLockInState(): SessionState {
  // If no session active, always return noSession
  if (currentSessionState === 'noSession' || !sessionId) {
    return 'noSession';
  }

  // Check if we should be locked in
  const isProductiveDomain = domainClassification === 'productive';
  const isNeutralDomain = domainClassification === 'neutral';
  const isUnproductiveDomain = domainClassification === 'unproductive';
  const idleUnder2Min = currentIdleSeconds < 120;
  const noFailedChecks = lastCheckPopupStatus !== 'failed';

  // Lock-in only if: productive domain AND idle < 2min AND no failed checks
  // Neutral and unproductive domains are always non-lock
  if (isProductiveDomain && idleUnder2Min && noFailedChecks) {
    return 'sessionActive_lockedIn';
  } else {
    return 'sessionActive_notLockedIn';
  }
}

/**
 * Get current session context for state machine
 */
function getSessionContext(): SessionContext {
  return {
    currentDomain,
    isProductiveDomain: isProductive,
    currentIdleSeconds,
    lastCheckPopupStatus,
    currentSessionState,
  };
}

/**
 * Check if state transition occurred and handle it
 */
function checkAndHandleStateTransition(): void {
  const newState = updateLockInState();
  
  if (newState !== currentSessionState) {
    const oldState = currentSessionState;
    currentSessionState = newState;
    
    // Track lock break count: increment when transitioning from locked-in → not-locked-in
    if (oldState === 'sessionActive_lockedIn' && newState === 'sessionActive_notLockedIn') {
      lockBreakCount++;
    }
    
    // Close current segment and start new one
    closeCurrentSegment();
    createActivitySegment();
    
    console.log(`State transition: ${oldState} → ${newState}`);
  }
}

// ============================================================================
// Activity Segment Management
// ============================================================================

/**
 * Create a new activity segment with current state
 */
function createActivitySegment(): void {
  if (currentSessionState === 'noSession') {
    return;
  }

  const now = getCurrentTimestamp();
  const lockedIn = currentSessionState === 'sessionActive_lockedIn';
  
  // Determine reason for non-lock segments
  // Note: Backend expects underscores, not hyphens
  let reason: NonLockReason | undefined;
  if (!lockedIn) {
    if (domainClassification === 'unproductive') {
      reason = 'unproductive_domain';
    } else if (domainClassification === 'neutral') {
      reason = 'neutral_domain';
    } else if (currentIdleSeconds >= 120) {
      reason = 'idle_beyond_2m';
    } else if (lastCheckPopupStatus === 'failed') {
      reason = 'failed_check';
    } else {
      reason = 'other';
    }
  }
  // Locked-in segments don't need a reason

  currentSegment = {
    start: now,
    domain: currentDomain,
    productive: domainClassification === 'productive',
    lockedIn,
    reason,
  };

  activitySegments.push(currentSegment);
}

/**
 * Close the current activity segment and update metrics
 */
function closeCurrentSegment(): void {
  if (!currentSegment) {
    return;
  }

  const now = getCurrentTimestamp();
  currentSegment.end = now;

  // Don't update totalSessionSeconds here - it's calculated from sessionStartTimestamp
  // Just close the segment so it can be included in metrics calculation
  currentSegment = null;
}

/**
 * Recalculate all metrics from segments
 * This should only recalculate locked-in time, not total time
 * Total time is calculated from sessionStartTimestamp
 */
function updateMetrics(): void {
  // Reset only the metrics that need recalculation
  lockedInSeconds = 0;
  nonLockSeconds = 0;
  idleBeyond2minSeconds = 0;

  // Calculate from closed segments only
  activitySegments.forEach(segment => {
    if (segment.end) {
      const duration = calculateSegmentDuration(segment.start, segment.end);

      if (segment.lockedIn) {
        lockedInSeconds += duration;
      } else {
        nonLockSeconds += duration;
        
        if (segment.reason === 'idle-beyond-2m') {
          // For closed segments, use the stored reason
          const idleBeyond2Min = Math.max(0, currentIdleSeconds - 120);
          idleBeyond2minSeconds += Math.min(idleBeyond2Min, duration);
        }
      }
    }
  });

  // Add current segment duration if it exists
  if (currentSegment) {
    const now = getCurrentTimestamp();
    const duration = calculateSegmentDuration(currentSegment.start, now);
    
    if (currentSegment.lockedIn) {
      lockedInSeconds += duration;
    } else {
      nonLockSeconds += duration;
      
      if (currentSegment.reason === 'idle-beyond-2m') {
        const idleBeyond2Min = Math.max(0, currentIdleSeconds - 120);
        idleBeyond2minSeconds += Math.min(idleBeyond2Min, duration);
      }
    }
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Start a new focus session
 */
async function startNewSession(): Promise<void> {
  if (currentSessionState !== 'noSession') {
    console.warn('Session already active');
    return;
  }

  try {
    // Get auth token from sync storage
    const result = await chrome.storage.sync.get(['authToken']);
    const authState = result as AuthState;
    const authToken = authState.authToken;

    let newSessionId: string;
    
    // Try to call API, but fall back to local session ID for testing
    if (authToken) {
      try {
        const response = await startSession(authToken);
        newSessionId = response.sessionId;
      } catch (apiError) {
        // If API fails, use local session ID for testing
        console.warn('API call failed, using local session ID for testing:', apiError);
        newSessionId = `local_${Date.now()}`;
      }
    } else {
      // No auth token - use local session ID for testing
      console.warn('No auth token found. Using local session ID for testing.');
      newSessionId = `local_${Date.now()}`;
    }
    
    // Initialize session state
    sessionId = newSessionId;
    sessionStartTimestamp = getCurrentTimestamp();
    currentSessionState = 'sessionActive_lockedIn'; // Start optimistic
    lastActivityTimestamp = getCurrentTimestamp();
    currentIdleSeconds = 0;
    lastCheckPopupStatus = 'none';
    activitySegments = [];
    lockedInSeconds = 0;
    nonLockSeconds = 0;
    idleBeyond2minSeconds = 0;
    tabSwitchCount = 0;
    lockBreakCount = 0;

    // Get current tab
    await updateCurrentTab();

    // Create first segment
    createActivitySegment();

    // Schedule first random check (15-30 minutes)
    scheduleRandomCheck();

    // Start periodic uploads
    startPeriodicUploads();

    // Save session state to storage
    await saveSessionState();

    console.log('Session started:', sessionId);
  } catch (error) {
    console.error('Failed to start session:', error);
    throw error;
  }
}

/**
 * Finish the current session
 */
async function finishCurrentSession(): Promise<void> {
  if (currentSessionState === 'noSession' || !sessionId) {
    console.warn('No active session to finish');
    return;
  }

  try {
    // Close current segment
    closeCurrentSegment();

    // Cancel random check
    if (randomCheckAlarmName && chrome.alarms) {
      chrome.alarms.clear(randomCheckAlarmName);
      randomCheckAlarmName = null;
    }

    // Cancel upload interval
    if (uploadIntervalId !== null) {
      clearInterval(uploadIntervalId);
      uploadIntervalId = null;
    }

    // Finalize metrics
    updateMetrics();
    const sessionEndTimestamp = getCurrentTimestamp();
    
    // Calculate total session time from start timestamp
    const finalTotalSeconds = sessionStartTimestamp > 0
      ? Math.floor((sessionEndTimestamp - sessionStartTimestamp) / 1000)
      : 0;
    
    // Calculate focus rate
    const focusRate = finalTotalSeconds > 0 
      ? lockedInSeconds / finalTotalSeconds 
      : 0;

    // Build metrics object
    const metrics: SessionMetrics = {
      sessionId,
      sessionStartTimestamp,
      sessionEndTimestamp,
      totalSessionSeconds: finalTotalSeconds,
      lockedInSeconds,
      nonLockSeconds,
      focusRate,
      idleBeyond2minSeconds,
      tabSwitchCount,
      lockBreakCount,
      segments: activitySegments,
    };

    // Store finished session metrics for summary page (don't upload yet)
    finishedSessionMetrics = metrics;
    
    // Save finished session to storage so it persists across popup closes
    await chrome.storage.local.set({ finishedSession: metrics });

    // Clear active session state (but keep finishedSessionMetrics)
    sessionId = null;
    sessionStartTimestamp = 0;
    currentSessionState = 'noSession';
    activitySegments = [];
    currentSegment = null;
    lockedInSeconds = 0;
    nonLockSeconds = 0;
    idleBeyond2minSeconds = 0;
    tabSwitchCount = 0;
    lockBreakCount = 0;
    lastCheckPopupStatus = 'none';

    // Clear storage
    await chrome.storage.local.remove(['sessionState']);

    console.log('Session finished:', metrics);
  } catch (error) {
    console.error('Failed to finish session:', error);
    throw error;
  }
}

// ============================================================================
// Tab Tracking
// ============================================================================

/**
 * Update current tab information
 */
async function updateCurrentTab(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0 || !tabs[0].id) {
      return;
    }

    const tab = tabs[0];
    currentTabId = tab.id;
    currentUrl = tab.url || null;

    if (currentUrl && isValidWebPage(currentUrl)) {
      const domain = extractDomain(currentUrl);
      const previousDomain = currentDomain;
      
      currentDomain = domain;
      
      // Debug logging for q.utoronto.ca BEFORE classification
      if (domain && domain.toLowerCase().includes('q.utoronto.ca')) {
        console.log('[updateCurrentTab] 🔍 Detected q.utoronto.ca - URL:', currentUrl, 'Extracted domain:', domain);
      }
      
      // Classify domain using configStore
      domainClassification = await classifyDomain(domain);
      isProductive = domainClassification === 'productive';
      
      // Debug logging for q.utoronto.ca AFTER classification
      if (domain && domain.toLowerCase().includes('q.utoronto.ca')) {
        console.log('[updateCurrentTab] ✅ Final result - Domain:', domain, 'Classification:', domainClassification, 'IsProductive:', isProductive, 'URL:', currentUrl);
      }

      // Check if domain changed (tab switch)
      if (previousDomain !== domain && previousDomain !== null && currentSessionState !== 'noSession') {
        tabSwitchCount++;
        closeCurrentSegment();
        checkAndHandleStateTransition();
        createActivitySegment();
      } else {
        // Domain might be same but state could change
        checkAndHandleStateTransition();
      }
    } else {
      currentDomain = null;
      domainClassification = 'neutral';
      isProductive = false;
      checkAndHandleStateTransition();
    }
  } catch (error) {
    console.error('Error updating current tab:', error);
  }
}

/**
 * Handle tab activation (user switches tabs)
 */
function handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
  currentTabId = activeInfo.tabId;
  updateCurrentTab();
}

/**
 * Handle tab update (URL changes, page loads)
 */
function handleTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
  if (tabId === currentTabId && changeInfo.status === 'complete' && tab.url) {
    updateCurrentTab();
  }
}

// ============================================================================
// Idle Tracking
// ============================================================================

/**
 * Update idle state
 */
function updateIdleState(): void {
  const now = getCurrentTimestamp();
  currentIdleSeconds = calculateIdleSeconds(lastActivityTimestamp);
  
  // Check for state transition due to idle threshold
  const wasUnder2Min = currentIdleSeconds < 120;
  checkAndHandleStateTransition();
  const isUnder2Min = currentIdleSeconds < 120;
  
  // If we crossed the 2-minute threshold, close segment and create new one
  if (wasUnder2Min !== isUnder2Min && currentSessionState !== 'noSession') {
    closeCurrentSegment();
    createActivitySegment();
  }
}

/**
 * Handle idle state change from Chrome API
 */
function handleIdleStateChange(newState: chrome.idle.IdleState): void {
  if (newState === 'active') {
    // User became active
    lastActivityTimestamp = getCurrentTimestamp();
    currentIdleSeconds = 0;
    lastCheckPopupStatus = 'none'; // Reset check status on activity
    
    if (currentSessionState !== 'noSession') {
      checkAndHandleStateTransition();
    }
  } else {
    // User is idle (locked, idle)
    updateIdleState();
  }
}

// ============================================================================
// Random Check System
// ============================================================================

/**
 * Schedule a random check (15-30 minutes from now)
 */
function scheduleRandomCheck(): void {
  if (currentSessionState !== 'sessionActive_lockedIn') {
    return;
  }

  // Clear existing alarm
  if (randomCheckAlarmName && chrome.alarms) {
    chrome.alarms.clear(randomCheckAlarmName);
  }

  // Random delay between 15-30 minutes (900-1800 seconds)
  const minDelay = 15 * 60;
  const maxDelay = 30 * 60;
  const delaySeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  
  randomCheckAlarmName = `randomCheck_${Date.now()}`;
  
  if (chrome.alarms) {
    chrome.alarms.create(randomCheckAlarmName, {
      delayInMinutes: delaySeconds / 60,
    });
  } else {
    console.warn('chrome.alarms API not available');
  }

  console.log(`Random check scheduled in ${delaySeconds} seconds`);
}

/**
 * Handle random check alarm
 */
async function handleRandomCheck(): Promise<void> {
  if (currentSessionState !== 'sessionActive_lockedIn') {
    return;
  }

  console.log('Random check triggered');

  // Show notification
  const notificationId = await chrome.notifications.create({
    type: 'basic',
    title: 'Focus Check',
    message: 'Are you still focused? Click to confirm.',
    buttons: [
      { title: 'Yes, I\'m focused' },
      { title: 'No, I\'m distracted' }
    ],
    requireInteraction: true,
  });

  randomCheckNotificationId = notificationId;

  // Start countdown (25 seconds)
  let countdown = 25;
  randomCheckCountdown = countdown;

  const countdownInterval = setInterval(() => {
    countdown--;
    randomCheckCountdown = countdown;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      handleCheckTimeout();
    }
  }, 1000);
}

/**
 * Handle check timeout (user didn't respond)
 */
async function handleCheckTimeout(): Promise<void> {
  if (randomCheckNotificationId) {
    chrome.notifications.clear(randomCheckNotificationId);
    randomCheckNotificationId = null;
  }

  lastCheckPopupStatus = 'failed';
  closeCurrentSegment();
  checkAndHandleStateTransition();
  createActivitySegment();

  console.log('Random check failed: timeout');
}

/**
 * Handle notification button click
 */
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === randomCheckNotificationId) {
    chrome.notifications.clear(notificationId);
    randomCheckNotificationId = null;

    if (buttonIndex === 0) {
      // User confirmed focus
      lastCheckPopupStatus = 'passed';
      console.log('Random check passed');
    } else {
      // User admitted distraction
      lastCheckPopupStatus = 'failed';
      closeCurrentSegment();
      checkAndHandleStateTransition();
      createActivitySegment();
      console.log('Random check failed: user response');
    }

    // Schedule next check if still locked in
    if (currentSessionState === 'sessionActive_lockedIn') {
      scheduleRandomCheck();
    }
  }
});

// ============================================================================
// API Upload
// ============================================================================

/**
 * Upload activity segments to backend
 */
async function uploadActivitySegments(): Promise<void> {
  if (!sessionId || activitySegments.length === 0) {
    return;
  }

  try {
    const result = await chrome.storage.sync.get(['authToken']);
    const authState = result as AuthState;
    const authToken = authState.authToken;

    if (!authToken || !sessionId) {
      return;
    }

    // Get segments that need to be uploaded (closed segments only)
    const segmentsToUpload = activitySegments.filter(s => s.end !== undefined);
    
    if (segmentsToUpload.length === 0) {
      return;
    }

    try {
      // Upload segments that haven't been uploaded yet
      await uploadActivity(sessionId, segmentsToUpload, authToken);
      console.log('Activity segments uploaded');
      
      // Remove successfully uploaded segments from pending queue
      await removeFromPendingQueue(sessionId, segmentsToUpload);
    } catch (error) {
      console.error('Failed to upload activity:', error);
      // Add to pending queue for retry
      await addToPendingQueue(sessionId, segmentsToUpload);
    }
  } catch (error) {
    console.error('Failed to upload activity:', error);
  }
}

/**
 * Start periodic uploads
 */
function startPeriodicUploads(): void {
  if (uploadIntervalId !== null) {
    clearInterval(uploadIntervalId);
  }

  uploadIntervalId = setInterval(() => {
    uploadActivitySegments();
  }, UPLOAD_INTERVAL_MS);
}

// ============================================================================
// Pending Upload Queue
// ============================================================================

/**
 * Add segments to pending upload queue
 */
async function addToPendingQueue(sessionId: string, segments: ActivitySegment[]): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    
    // Add new pending upload
    pendingUploads.push({
      sessionId,
      segments,
      timestamp: getCurrentTimestamp(),
    });
    
    await chrome.storage.local.set({ pendingUploads });
  } catch (error) {
    console.error('Failed to add to pending queue:', error);
  }
}

/**
 * Remove successfully uploaded segments from pending queue
 */
async function removeFromPendingQueue(sessionId: string, uploadedSegments: ActivitySegment[]): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    
    // Remove segments that were successfully uploaded
    const updatedQueue = pendingUploads.filter(pending => {
      if (pending.sessionId !== sessionId) {
        return true; // Keep uploads for other sessions
      }
      
      // Remove segments that match uploaded ones
      const uploadedStartTimes = new Set(uploadedSegments.map(s => s.start));
      const remainingSegments = pending.segments.filter(s => !uploadedStartTimes.has(s.start));
      
      // If no segments left, remove this pending upload entirely
      return remainingSegments.length > 0;
    });
    
    await chrome.storage.local.set({ pendingUploads: updatedQueue });
  } catch (error) {
    console.error('Failed to remove from pending queue:', error);
  }
}

/**
 * Flush pending upload queue - attempt to upload queued segments
 */
async function flushPendingUploadQueue(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    
    if (pendingUploads.length === 0) {
      return;
    }

    const authResult = await chrome.storage.sync.get(['authToken']);
    const authState = authResult as AuthState;
    const authToken = authState.authToken;

    if (!authToken) {
      return; // Can't upload without auth token
    }

    const remainingUploads: PendingUpload[] = [];

    for (const pending of pendingUploads) {
      try {
        await uploadActivity(pending.sessionId, pending.segments, authToken);
        console.log('Flushed pending upload for session:', pending.sessionId);
        // Don't add to remainingUploads - successfully uploaded
      } catch (error) {
        console.error('Failed to flush pending upload:', error);
        // Keep in queue for retry
        remainingUploads.push(pending);
      }
    }

    // Update queue with remaining failed uploads
    await chrome.storage.local.set({ pendingUploads: remainingUploads });
  } catch (error) {
    console.error('Failed to flush pending upload queue:', error);
  }
}

// ============================================================================
// Storage Persistence
// ============================================================================

/**
 * Save current session state to storage using StoredSessionState structure
 */
async function saveSessionState(): Promise<void> {
  const storedState: StoredSessionState = {
    hasActiveSession: currentSessionState !== 'noSession',
    sessionId: sessionId || undefined,
    sessionStartTimestamp: sessionStartTimestamp || undefined,
    metrics: {
      totalSessionSeconds: 0, // Calculated from timestamps
      lockedInSeconds,
      nonLockSeconds,
      idleBeyond2minSeconds,
      tabSwitchCount,
      lockBreakCount,
    },
    sessionState: currentSessionState,
    currentSegment,
    activitySegments,
    lastActivityTimestamp,
  };

  await chrome.storage.local.set({ sessionState: storedState });
}

/**
 * Restore session state from storage (on service worker restart)
 */
async function restoreSessionState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['sessionState']);
    const savedState = result.sessionState as StoredSessionState | undefined;

    if (!savedState || !savedState.hasActiveSession || !savedState.sessionId) {
      return;
    }

    sessionId = savedState.sessionId;
    sessionStartTimestamp = savedState.sessionStartTimestamp || getCurrentTimestamp();
    currentSessionState = savedState.sessionState || 'noSession';
    lastActivityTimestamp = savedState.lastActivityTimestamp || getCurrentTimestamp();
    activitySegments = savedState.activitySegments || [];
    currentSegment = savedState.currentSegment || null;
    
    // Restore metrics
    if (savedState.metrics) {
      lockedInSeconds = savedState.metrics.lockedInSeconds || 0;
      nonLockSeconds = savedState.metrics.nonLockSeconds || 0;
      idleBeyond2minSeconds = savedState.metrics.idleBeyond2minSeconds || 0;
      tabSwitchCount = savedState.metrics.tabSwitchCount || 0;
      lockBreakCount = savedState.metrics.lockBreakCount || 0;
    }

    // Update current tab
    await updateCurrentTab();

    // Restore idle state
    updateIdleState();

    // Resume periodic uploads
    if (currentSessionState !== 'noSession') {
      startPeriodicUploads();
    }
    
    // Flush pending upload queue
    await flushPendingUploadQueue();

    console.log('Session state restored');
  } catch (error) {
    console.error('Failed to restore session state:', error);
  }
}

// ============================================================================
// Popup Communication
// ============================================================================

/**
 * Get current popup state
 */
async function getPopupState(): Promise<PopupState> {
  // Calculate total session time from start timestamp (more accurate)
  const now = getCurrentTimestamp();
  const elapsedSeconds = sessionStartTimestamp > 0 
    ? Math.floor((now - sessionStartTimestamp) / 1000)
    : 0;
  
  // Recalculate metrics to get accurate locked-in time
  updateMetrics();
  
  // Use elapsed time for total, but keep recalculated locked-in time
  const actualTotalSeconds = elapsedSeconds > 0 ? elapsedSeconds : totalSessionSeconds;
  const focusRate = actualTotalSeconds > 0 
    ? lockedInSeconds / actualTotalSeconds 
    : 0;

  // Check connection status (authToken in sync storage)
  const authResult = await chrome.storage.sync.get(['authToken']);
  const authState = authResult as AuthState;
  const isConnected = !!authState.authToken;

  // Determine isProductiveDomain: true = productive, false = unproductive, null = neutral
  let isProductiveDomain: boolean | null = null;
  if (currentDomain) {
    if (domainClassification === 'productive') {
      isProductiveDomain = true;
    } else if (domainClassification === 'unproductive') {
      isProductiveDomain = false;
    } else {
      isProductiveDomain = null; // neutral
    }
  }

  // Debug logging for q.utoronto.ca in popup state
  if (currentDomain && currentDomain.toLowerCase().includes('q.utoronto.ca')) {
    console.log('[getPopupState] 🔍 q.utoronto.ca - domainClassification:', domainClassification, 'isProductiveDomain:', isProductiveDomain, 'currentDomain:', currentDomain);
  }

  return {
    hasActiveSession: currentSessionState !== 'noSession',
    sessionState: currentSessionState,
    totalSessionSeconds: actualTotalSeconds,
    lockedInSeconds,
    focusRate,
    currentDomain,
    isProductiveDomain,
    tabSwitchCount,
    idleBeyond2minSeconds,
    lockBreakCount,
    isConnected,
  };
}

/**
 * Handle messages from external sources (web pages)
 */
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(
    (message: any, sender, sendResponse) => {
      (async () => {
        try {
          // Handle connection from web app
          if (message.type === 'ANCHOR_CONNECT' && message.authToken) {
            try {
              await chrome.storage.sync.set({ 
                authToken: message.authToken,
                userId: message.userId || null 
              });
              console.log('Extension connected with auth token from web app');
              sendResponse({ success: true, message: 'Extension connected successfully' });
              return;
            } catch (error) {
              console.error('Failed to store auth token:', error);
              sendResponse({ success: false, message: 'Failed to store auth token' });
              return;
            }
          }
          sendResponse({ success: false, message: 'Unknown message type' });
        } catch (error) {
          console.error('External message error:', error);
          sendResponse({ success: false, message: 'Error processing message' });
        }
      })();
      return true; // Keep channel open for async response
    }
  );
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener(
  (message: any, sender, sendResponse) => {
    (async () => {
      try {

        // Handle popup messages
        const popupMessage = message as PopupMessage;
        switch (popupMessage.type) {
          case 'GET_STATE':
            const state = await getPopupState();
            sendResponse({ type: 'STATE_UPDATE', state } as BackgroundResponse);
            break;

          case 'START_SESSION':
            await startNewSession();
            await saveSessionState();
            const startState = await getPopupState();
            sendResponse({ type: 'STATE_UPDATE', state: startState } as BackgroundResponse);
            break;

          case 'FINISH_SESSION':
            await finishCurrentSession();
            // Return finished session metrics instead of state
            if (finishedSessionMetrics) {
              sendResponse({ type: 'FINISHED_SESSION', metrics: finishedSessionMetrics } as BackgroundResponse);
            } else {
              const finishState = await getPopupState();
              sendResponse({ type: 'STATE_UPDATE', state: finishState } as BackgroundResponse);
            }
            break;

          case 'GET_FINISHED_SESSION':
            // Check if we have a finished session in memory or storage
            if (finishedSessionMetrics) {
              sendResponse({ type: 'FINISHED_SESSION', metrics: finishedSessionMetrics } as BackgroundResponse);
            } else {
              // Try to load from storage
              const stored = await chrome.storage.local.get(['finishedSession']);
              if (stored.finishedSession) {
                finishedSessionMetrics = stored.finishedSession as SessionMetrics;
                sendResponse({ type: 'FINISHED_SESSION', metrics: finishedSessionMetrics } as BackgroundResponse);
              } else {
                sendResponse({ type: 'ERROR', message: 'No finished session found' } as BackgroundResponse);
              }
            }
            break;

          case 'UPLOAD_FINISHED_SESSION':
            if (!finishedSessionMetrics) {
              sendResponse({ type: 'ERROR', message: 'No finished session to upload' } as BackgroundResponse);
              break;
            }

            try {
              // Get auth token
              const authResult = await chrome.storage.sync.get(['authToken']);
              const authState = authResult as AuthState;
              const authToken = authState.authToken;

              if (!authToken) {
                sendResponse({ type: 'ERROR', message: 'No auth token. Please connect your account first.' } as BackgroundResponse);
                break;
              }

              // Get file IDs from message if provided
              const fileIds = (message as any).fileIds || [];

              console.log('Uploading finished session to API:', {
                sessionId: finishedSessionMetrics.sessionId,
                totalSeconds: finishedSessionMetrics.totalSessionSeconds,
                lockedInSeconds: finishedSessionMetrics.lockedInSeconds,
                segmentsCount: finishedSessionMetrics.segments.length,
                fileIdsCount: fileIds.length,
              });

              // Add fileIds to metrics for upload
              const metricsWithFiles = {
                ...finishedSessionMetrics,
                fileIds,
              };

              await endSession(finishedSessionMetrics.sessionId, metricsWithFiles, authToken);
              console.log('Session successfully uploaded to API');

              // Clear finished session data
              finishedSessionMetrics = null;
              await chrome.storage.local.remove(['finishedSession']);

              const uploadState = await getPopupState();
              sendResponse({ type: 'STATE_UPDATE', state: uploadState } as BackgroundResponse);
            } catch (apiError) {
              console.error('Failed to upload finished session:', apiError);
              const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
              sendResponse({ type: 'ERROR', message: `Upload failed: ${errorMessage}` } as BackgroundResponse);
            }
            break;

          case 'DISCARD_FINISHED_SESSION':
            // Clear finished session data without uploading
            finishedSessionMetrics = null;
            await chrome.storage.local.remove(['finishedSession']);
            const discardState = await getPopupState();
            sendResponse({ type: 'STATE_UPDATE', state: discardState } as BackgroundResponse);
            break;

          default:
            sendResponse({ type: 'ERROR', message: 'Unknown message type' } as BackgroundResponse);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendResponse({ type: 'ERROR', message: errorMessage } as BackgroundResponse);
      }
    })();

    return true; // Keep channel open for async response
  }
);

// ============================================================================
// Event Listeners Setup
// ============================================================================

/**
 * Initialize background service worker
 */
async function initializeBackground(): Promise<void> {
  console.log('Background service worker initialized');

  // Restore session state if exists
  await restoreSessionState();

  // Restore finished session from storage if exists
  const stored = await chrome.storage.local.get(['finishedSession']);
  if (stored.finishedSession) {
    finishedSessionMetrics = stored.finishedSession as SessionMetrics;
    console.log('Restored finished session from storage');
  }

  // Set up tab tracking
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);

  // Set up idle tracking
  chrome.idle.onStateChanged.addListener(handleIdleStateChange);
  
  // Set up random check alarms
  if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name.startsWith('randomCheck_')) {
        handleRandomCheck();
      }
    });
  } else {
    console.warn('chrome.alarms API not available - random checks will not work');
  }

  // Periodic idle state update (every 10 seconds)
  setInterval(() => {
    if (currentSessionState !== 'noSession') {
      updateIdleState();
      checkAndHandleStateTransition();
    }
  }, 10000);

  // Periodic state save (every 30 seconds)
  setInterval(async () => {
    if (currentSessionState !== 'noSession') {
      await saveSessionState();
    }
  }, 30000);

  // Periodic pending queue flush (every 5 minutes)
  setInterval(async () => {
    await flushPendingUploadQueue();
  }, 5 * 60 * 1000);

  // Initial tab update
  await updateCurrentTab();
}

// Initialize on service worker startup
initializeBackground();

