import {
  ActivitySegment,
  AuthState,
  BackgroundResponse,
  PendingUpload,
  PopupMessage,
  PopupState,
  SessionMetrics,
  StoredSessionState,
} from '../types';
import { classifyDomainWithOverrides } from '../config/domainClassifier';
import { extractDomain, isValidWebPage } from '../utils/domain';
import { getCurrentTimestamp, calculateIdleSeconds, calculateSegmentDuration } from '../utils/time';
import { startSession, uploadActivity, endSession } from '../api/client';
import {
  IDLE_POLL_INTERVAL_MS,
  IDLE_THRESHOLD_SECONDS,
  PENDING_FLUSH_INTERVAL_MS,
  RANDOM_CHECK_MAX_DELAY_SECONDS,
  RANDOM_CHECK_MIN_DELAY_SECONDS,
  RANDOM_CHECK_RESPONSE_SECONDS,
  STATE_SAVE_INTERVAL_MS,
  UPLOAD_INTERVAL_MS,
} from './constants';
import { RuntimeState, createInitialRuntimeState } from './runtimeState';

export class BackgroundController {
  private state: RuntimeState = createInitialRuntimeState();
  private idleIntervalId: number | null = null;
  private saveIntervalId: number | null = null;
  private flushIntervalId: number | null = null;

  constructor() {
    if (chrome?.notifications?.onButtonClicked) {
      chrome.notifications.onButtonClicked.addListener(this.handleNotificationButtonClicked);
    }
  }

  public async initialize(): Promise<void> {
    console.log('[BackgroundController] Initializing service worker');

    await this.restoreSessionState();
    await this.restoreFinishedSession();

    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated);
    chrome.idle.onStateChanged.addListener(this.handleIdleStateChange);

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      this.processPopupMessage(message as PopupMessage, message)
        .then(sendResponse)
        .catch((error) => {
          const messageText = error instanceof Error ? error.message : 'Unknown error';
          sendResponse({ type: 'ERROR', message: messageText } as BackgroundResponse);
        });
      return true;
    });

    if (chrome.runtime.onMessageExternal) {
      chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
        this.handleExternalMessage(message)
          .then(sendResponse)
          .catch((error) => {
            const messageText = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, message: messageText });
          });
        return true;
      });
    }

    if (chrome.alarms) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name.startsWith('randomCheck_')) {
          this.handleRandomCheck().catch((error) => {
            console.error('[BackgroundController] Random check failed', error);
          });
        }
      });
    }

    this.idleIntervalId = setInterval(() => {
      if (this.state.sessionState !== 'noSession') {
        this.updateIdleState();
        this.checkAndHandleStateTransition();
      }
    }, IDLE_POLL_INTERVAL_MS);

    this.saveIntervalId = setInterval(async () => {
      if (this.state.sessionState !== 'noSession') {
        await this.saveSessionState();
      }
    }, STATE_SAVE_INTERVAL_MS);

    this.flushIntervalId = setInterval(async () => {
      await this.flushPendingUploadQueue();
    }, PENDING_FLUSH_INTERVAL_MS);

    await this.updateCurrentTab();
  }

  // --------------------------------------------------------------------------
  // Popup messaging
  // --------------------------------------------------------------------------

  private async processPopupMessage(message: PopupMessage, rawMessage: any): Promise<BackgroundResponse> {
    switch (message.type) {
      case 'GET_STATE':
        return { type: 'STATE_UPDATE', state: await this.buildPopupState() };
      case 'START_SESSION':
        await this.startSession();
        return { type: 'STATE_UPDATE', state: await this.buildPopupState() };
      case 'FINISH_SESSION':
        await this.finishSession();
        if (this.state.finishedSessionMetrics) {
          return { type: 'FINISHED_SESSION', metrics: this.state.finishedSessionMetrics };
        }
        return { type: 'STATE_UPDATE', state: await this.buildPopupState() };
      case 'GET_FINISHED_SESSION':
        await this.restoreFinishedSession();
        if (this.state.finishedSessionMetrics) {
          return { type: 'FINISHED_SESSION', metrics: this.state.finishedSessionMetrics };
        }
        return { type: 'ERROR', message: 'No finished session found' };
      case 'UPLOAD_FINISHED_SESSION':
        await this.uploadFinishedSession(rawMessage?.fileIds ?? []);
        return { type: 'STATE_UPDATE', state: await this.buildPopupState() };
      case 'DISCARD_FINISHED_SESSION':
        await this.discardFinishedSession();
        return { type: 'STATE_UPDATE', state: await this.buildPopupState() };
      default:
        return { type: 'ERROR', message: 'Unknown message type' };
    }
  }

  private async handleExternalMessage(message: any): Promise<{ success: boolean; message: string }> {
    if (message?.type === 'ANCHOR_CONNECT' && message.authToken) {
      await chrome.storage.sync.set({
        authToken: message.authToken,
        userId: message.userId || null,
      });
      this.state.cachedAuthToken = message.authToken;

      if (this.state.currentDomain) {
        await this.reclassifyCurrentDomain();
      }

      return { success: true, message: 'Extension connected successfully' };
    }

    return { success: false, message: 'Unknown message type' };
  }

  // --------------------------------------------------------------------------
  // Session lifecycle
  // --------------------------------------------------------------------------

  private async startSession(): Promise<void> {
    if (this.state.sessionState !== 'noSession') {
      return;
    }

    const authToken = await this.getAuthToken();
    let newSessionId: string;

    if (authToken) {
      try {
        const response = await startSession(authToken);
        newSessionId = response.sessionId;
      } catch (error) {
        console.warn('[BackgroundController] startSession API failed, using local session ID', error);
        newSessionId = `local_${Date.now()}`;
      }
    } else {
      console.warn('[BackgroundController] No auth token. Using local session ID.');
      newSessionId = `local_${Date.now()}`;
    }

    this.state.sessionId = newSessionId;
    this.state.sessionStartTimestamp = getCurrentTimestamp();
    this.state.sessionState = 'sessionActive_lockedIn';
    this.state.lastActivityTimestamp = getCurrentTimestamp();
    this.state.currentIdleSeconds = 0;
    this.state.lastCheckStatus = 'none';
    this.state.activitySegments = [];
    this.state.currentSegment = null;
    this.state.lockedInSeconds = 0;
    this.state.nonLockSeconds = 0;
    this.state.idleBeyond2minSeconds = 0;
    this.state.tabSwitchCount = 0;
    this.state.lockBreakCount = 0;

    await this.updateCurrentTab();
    this.createActivitySegment();
    this.scheduleRandomCheck();
    this.startPeriodicUploads();
    await this.saveSessionState();
  }

  private async finishSession(): Promise<void> {
    if (this.state.sessionState === 'noSession' || !this.state.sessionId) {
      return;
    }

    this.closeCurrentSegment();

    if (this.state.randomCheckAlarmName && chrome.alarms) {
      chrome.alarms.clear(this.state.randomCheckAlarmName);
      this.state.randomCheckAlarmName = null;
    }

    if (this.state.uploadIntervalId !== null) {
      clearInterval(this.state.uploadIntervalId);
      this.state.uploadIntervalId = null;
    }

    this.recalculateMetrics();
    const sessionEndTimestamp = getCurrentTimestamp();
    const totalSeconds =
      this.state.sessionStartTimestamp > 0
        ? Math.floor((sessionEndTimestamp - this.state.sessionStartTimestamp) / 1000)
        : 0;
    const focusRate = totalSeconds > 0 ? this.state.lockedInSeconds / totalSeconds : 0;

    const metrics: SessionMetrics = {
      sessionId: this.state.sessionId,
      sessionStartTimestamp: this.state.sessionStartTimestamp,
      sessionEndTimestamp,
      totalSessionSeconds: totalSeconds,
      lockedInSeconds: this.state.lockedInSeconds,
      nonLockSeconds: this.state.nonLockSeconds,
      focusRate,
      idleBeyond2minSeconds: this.state.idleBeyond2minSeconds,
      tabSwitchCount: this.state.tabSwitchCount,
      lockBreakCount: this.state.lockBreakCount,
      segments: this.state.activitySegments,
    };

    this.state.finishedSessionMetrics = metrics;
    await chrome.storage.local.set({ finishedSession: metrics });

    this.state.sessionId = null;
    this.state.sessionStartTimestamp = 0;
    this.state.sessionState = 'noSession';
    this.state.activitySegments = [];
    this.state.currentSegment = null;
    this.state.lockedInSeconds = 0;
    this.state.nonLockSeconds = 0;
    this.state.idleBeyond2minSeconds = 0;
    this.state.tabSwitchCount = 0;
    this.state.lockBreakCount = 0;
    this.state.lastCheckStatus = 'none';

    await chrome.storage.local.remove(['sessionState']);
  }

  private async uploadFinishedSession(fileIds: string[]): Promise<void> {
    if (!this.state.finishedSessionMetrics) {
      throw new Error('No finished session to upload');
    }

    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error('No auth token. Please connect your account first.');
    }

    const metricsWithFiles = {
      ...this.state.finishedSessionMetrics,
      fileIds,
    };

    await endSession(metricsWithFiles.sessionId, metricsWithFiles, authToken);

    this.state.finishedSessionMetrics = null;
    await chrome.storage.local.remove(['finishedSession']);
  }

  private async discardFinishedSession(): Promise<void> {
    this.state.finishedSessionMetrics = null;
    await chrome.storage.local.remove(['finishedSession']);
  }

  // --------------------------------------------------------------------------
  // Domain + tab tracking
  // --------------------------------------------------------------------------

  private async updateCurrentTab(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0 || !tabs[0].id) {
        return;
      }

      const tab = tabs[0];
      this.state.currentTabId = tab.id;
      this.state.currentUrl = tab.url || null;

      if (this.state.currentUrl && isValidWebPage(this.state.currentUrl)) {
        const domain = extractDomain(this.state.currentUrl);
        const previousDomain = this.state.currentDomain;
        this.state.currentDomain = domain;

        await this.reclassifyCurrentDomain();

        if (previousDomain !== domain && previousDomain !== null && this.state.sessionState !== 'noSession') {
          this.state.tabSwitchCount++;
          this.closeCurrentSegment();
          this.checkAndHandleStateTransition();
          this.createActivitySegment();
        } else {
          this.checkAndHandleStateTransition();
        }
      } else {
        this.state.currentDomain = null;
        this.state.domainClassification = 'unproductive';
        this.checkAndHandleStateTransition();
      }
    } catch (error) {
      console.error('[BackgroundController] Failed to update current tab', error);
    }
  }

  private async reclassifyCurrentDomain(): Promise<void> {
    if (!this.state.currentDomain) {
      this.state.domainClassification = 'unproductive';
      return;
    }

    if (!this.state.cachedAuthToken) {
      const result = await chrome.storage.sync.get(['authToken']);
      this.state.cachedAuthToken = result.authToken || null;
    }

    const newClassification = await classifyDomainWithOverrides(this.state.currentDomain, this.state.cachedAuthToken);
    this.state.domainClassification = newClassification;
  }

  private handleTabActivated = (info: chrome.tabs.TabActiveInfo) => {
    this.state.currentTabId = info.tabId;
    this.updateCurrentTab();
  };

  private handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (tab.id === this.state.currentTabId && changeInfo.status === 'complete' && tab.url) {
      this.updateCurrentTab();
    }
  };

  // --------------------------------------------------------------------------
  // Idle tracking
  // --------------------------------------------------------------------------

  private updateIdleState(): void {
    this.state.currentIdleSeconds = calculateIdleSeconds(this.state.lastActivityTimestamp);
    const wasUnderThreshold = this.state.currentIdleSeconds < IDLE_THRESHOLD_SECONDS;
    this.checkAndHandleStateTransition();
    const isUnderThreshold = this.state.currentIdleSeconds < IDLE_THRESHOLD_SECONDS;

    if (wasUnderThreshold !== isUnderThreshold && this.state.sessionState !== 'noSession') {
      this.closeCurrentSegment();
      this.createActivitySegment();
    }
  }

  private handleIdleStateChange = (newState: chrome.idle.IdleState) => {
    if (newState === 'active') {
      this.state.lastActivityTimestamp = getCurrentTimestamp();
      this.state.currentIdleSeconds = 0;
      this.state.lastCheckStatus = 'none';
      if (this.state.sessionState !== 'noSession') {
        this.checkAndHandleStateTransition();
      }
    } else {
      this.updateIdleState();
    }
  };

  // --------------------------------------------------------------------------
  // Random checks
  // --------------------------------------------------------------------------

  private scheduleRandomCheck(): void {
    if (this.state.sessionState !== 'sessionActive_lockedIn') {
      return;
    }

    if (this.state.randomCheckAlarmName && chrome.alarms) {
      chrome.alarms.clear(this.state.randomCheckAlarmName);
    }

    const delaySeconds =
      Math.floor(Math.random() * (RANDOM_CHECK_MAX_DELAY_SECONDS - RANDOM_CHECK_MIN_DELAY_SECONDS + 1)) +
      RANDOM_CHECK_MIN_DELAY_SECONDS;

    this.state.randomCheckAlarmName = `randomCheck_${Date.now()}`;

    if (chrome.alarms) {
      chrome.alarms.create(this.state.randomCheckAlarmName, {
        delayInMinutes: delaySeconds / 60,
      });
    }
  }

  private async handleRandomCheck(): Promise<void> {
    if (this.state.sessionState !== 'sessionActive_lockedIn') {
      return;
    }

    const notificationId = await chrome.notifications.create({
      type: 'basic',
      title: 'Focus Check',
      message: 'Are you still focused? Click to confirm.',
      buttons: [
        { title: 'Yes, I\'m focused' },
        { title: 'No, I\'m distracted' },
      ],
      requireInteraction: true,
    });

    this.state.randomCheckNotificationId = notificationId;
    let countdown = RANDOM_CHECK_RESPONSE_SECONDS;

    const countdownInterval = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.handleCheckTimeout();
      }
    }, 1000);
  }

  private async handleCheckTimeout(): Promise<void> {
    if (this.state.randomCheckNotificationId) {
      chrome.notifications.clear(this.state.randomCheckNotificationId);
      this.state.randomCheckNotificationId = null;
    }

    this.state.lastCheckStatus = 'failed';
    this.closeCurrentSegment();
    this.checkAndHandleStateTransition();
    this.createActivitySegment();
  }

  private handleNotificationButtonClicked = (notificationId: string, buttonIndex: number) => {
    if (notificationId !== this.state.randomCheckNotificationId) {
      return;
    }

    chrome.notifications.clear(notificationId);
    this.state.randomCheckNotificationId = null;

    if (buttonIndex === 0) {
      this.state.lastCheckStatus = 'passed';
    } else {
      this.state.lastCheckStatus = 'failed';
      this.closeCurrentSegment();
      this.checkAndHandleStateTransition();
      this.createActivitySegment();
    }

    if (this.state.sessionState === 'sessionActive_lockedIn') {
      this.scheduleRandomCheck();
    }
  };

  // --------------------------------------------------------------------------
  // Activity segments + metrics
  // --------------------------------------------------------------------------

  private createActivitySegment(): void {
    if (this.state.sessionState === 'noSession') {
      return;
    }

    const lockedIn = this.state.sessionState === 'sessionActive_lockedIn';
    let reason: ActivitySegment['reason'];

    if (!lockedIn) {
      if (this.state.domainClassification === 'unproductive') {
        reason = 'unproductive_domain';
      } else if (this.state.currentIdleSeconds >= IDLE_THRESHOLD_SECONDS) {
        reason = 'idle_beyond_2m';
      } else if (this.state.lastCheckStatus === 'failed') {
        reason = 'failed_check';
      } else {
        reason = 'other';
      }
    }

    this.state.currentSegment = {
      start: getCurrentTimestamp(),
      domain: this.state.currentDomain,
      productive: this.state.domainClassification === 'productive',
      lockedIn,
      reason,
    };

    this.state.activitySegments.push(this.state.currentSegment);
  }

  private closeCurrentSegment(): void {
    if (!this.state.currentSegment) {
      return;
    }

    this.state.currentSegment.end = getCurrentTimestamp();
    this.state.currentSegment = null;
  }

  private recalculateMetrics(): void {
    this.state.lockedInSeconds = 0;
    this.state.nonLockSeconds = 0;
    this.state.idleBeyond2minSeconds = 0;

    const segments = [...this.state.activitySegments];
    if (this.state.currentSegment) {
      segments.push({
        ...this.state.currentSegment,
        end: getCurrentTimestamp(),
      });
    }

    segments.forEach((segment) => {
      if (!segment.end) return;
      const duration = calculateSegmentDuration(segment.start, segment.end);
      if (segment.lockedIn) {
        this.state.lockedInSeconds += duration;
      } else {
        this.state.nonLockSeconds += duration;
        if (segment.reason === 'idle_beyond_2m') {
          this.state.idleBeyond2minSeconds += duration;
        }
      }
    });
  }

  private computeNextSessionState(): SessionState {
    if (this.state.sessionState === 'noSession' || !this.state.sessionId) {
      return 'noSession';
    }

    const canLock =
      this.state.domainClassification === 'productive' &&
      this.state.currentIdleSeconds < IDLE_THRESHOLD_SECONDS &&
      this.state.lastCheckStatus !== 'failed';

    return canLock ? 'sessionActive_lockedIn' : 'sessionActive_notLockedIn';
  }

  private checkAndHandleStateTransition(): void {
    const newState = this.computeNextSessionState();
    if (newState === this.state.sessionState) {
      return;
    }

    const oldState = this.state.sessionState;
    this.state.sessionState = newState;

    if (oldState === 'sessionActive_lockedIn' && newState === 'sessionActive_notLockedIn') {
      this.state.lockBreakCount += 1;
    }

    this.closeCurrentSegment();
    this.createActivitySegment();
  }

  // --------------------------------------------------------------------------
  // Upload handling
  // --------------------------------------------------------------------------

  private async uploadActivitySegments(): Promise<void> {
    if (!this.state.sessionId || this.state.activitySegments.length === 0) {
      return;
    }

    const authToken = await this.getAuthToken();
    if (!authToken) {
      return;
    }

    const segmentsToUpload = this.state.activitySegments.filter((segment) => segment.end !== undefined);
    if (segmentsToUpload.length === 0) {
      return;
    }

    try {
      await uploadActivity(this.state.sessionId, segmentsToUpload, authToken);
      await this.removeFromPendingQueue(this.state.sessionId, segmentsToUpload);
    } catch (error) {
      console.error('[BackgroundController] Failed to upload activity', error);
      await this.addToPendingQueue(this.state.sessionId, segmentsToUpload);
    }
  }

  private startPeriodicUploads(): void {
    if (this.state.uploadIntervalId !== null) {
      clearInterval(this.state.uploadIntervalId);
    }

    this.state.uploadIntervalId = setInterval(() => {
      this.uploadActivitySegments();
    }, UPLOAD_INTERVAL_MS);
  }

  private async addToPendingQueue(sessionId: string, segments: ActivitySegment[]): Promise<void> {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    pendingUploads.push({
      sessionId,
      segments,
      timestamp: getCurrentTimestamp(),
    });
    await chrome.storage.local.set({ pendingUploads });
  }

  private async removeFromPendingQueue(sessionId: string, uploadedSegments: ActivitySegment[]): Promise<void> {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    const uploadedStartTimes = new Set(uploadedSegments.map((segment) => segment.start));
    const updatedQueue = pendingUploads.filter((item) => {
      if (item.sessionId !== sessionId) {
        return true;
      }
      const remainingSegments = item.segments.filter((segment) => !uploadedStartTimes.has(segment.start));
      return remainingSegments.length > 0;
    });
    await chrome.storage.local.set({ pendingUploads: updatedQueue });
  }

  private async flushPendingUploadQueue(): Promise<void> {
    const result = await chrome.storage.local.get(['pendingUploads']);
    const pendingUploads: PendingUpload[] = result.pendingUploads || [];
    if (pendingUploads.length === 0) {
      return;
    }

    const authToken = await this.getAuthToken();
    if (!authToken) {
      return;
    }

    const remainingUploads: PendingUpload[] = [];
    for (const pending of pendingUploads) {
      try {
        await uploadActivity(pending.sessionId, pending.segments, authToken);
      } catch (error) {
        console.error('[BackgroundController] Failed to flush pending upload', error);
        remainingUploads.push(pending);
      }
    }

    await chrome.storage.local.set({ pendingUploads: remainingUploads });
  }

  // --------------------------------------------------------------------------
  // Persistence + helpers
  // --------------------------------------------------------------------------

  private async saveSessionState(): Promise<void> {
    const storedState: StoredSessionState = {
      hasActiveSession: this.state.sessionState !== 'noSession',
      sessionId: this.state.sessionId ?? undefined,
      sessionStartTimestamp: this.state.sessionStartTimestamp ?? undefined,
      metrics: {
        totalSessionSeconds: 0,
        lockedInSeconds: this.state.lockedInSeconds,
        nonLockSeconds: this.state.nonLockSeconds,
        idleBeyond2minSeconds: this.state.idleBeyond2minSeconds,
        tabSwitchCount: this.state.tabSwitchCount,
        lockBreakCount: this.state.lockBreakCount,
      },
      sessionState: this.state.sessionState,
      currentSegment: this.state.currentSegment,
      activitySegments: this.state.activitySegments,
      lastActivityTimestamp: this.state.lastActivityTimestamp,
    };

    await chrome.storage.local.set({ sessionState: storedState });
  }

  private async restoreSessionState(): Promise<void> {
    const result = await chrome.storage.local.get(['sessionState']);
    const storedState = result.sessionState as StoredSessionState | undefined;
    if (!storedState || !storedState.hasActiveSession || !storedState.sessionId) {
      return;
    }

    this.state.sessionId = storedState.sessionId;
    this.state.sessionStartTimestamp = storedState.sessionStartTimestamp || getCurrentTimestamp();
    this.state.sessionState = storedState.sessionState || 'noSession';
    this.state.lastActivityTimestamp = storedState.lastActivityTimestamp || getCurrentTimestamp();
    this.state.activitySegments = storedState.activitySegments || [];
    this.state.currentSegment = storedState.currentSegment || null;

    if (storedState.metrics) {
      this.state.lockedInSeconds = storedState.metrics.lockedInSeconds || 0;
      this.state.nonLockSeconds = storedState.metrics.nonLockSeconds || 0;
      this.state.idleBeyond2minSeconds = storedState.metrics.idleBeyond2minSeconds || 0;
      this.state.tabSwitchCount = storedState.metrics.tabSwitchCount || 0;
      this.state.lockBreakCount = storedState.metrics.lockBreakCount || 0;
    }

    await this.updateCurrentTab();
    this.updateIdleState();

    if (this.state.sessionState !== 'noSession') {
      this.startPeriodicUploads();
    }

    await this.flushPendingUploadQueue();
  }

  private async restoreFinishedSession(): Promise<void> {
    if (this.state.finishedSessionMetrics) {
      return;
    }

    const stored = await chrome.storage.local.get(['finishedSession']);
    if (stored.finishedSession) {
      this.state.finishedSessionMetrics = stored.finishedSession as SessionMetrics;
    }
  }

  private async buildPopupState(): Promise<PopupState> {
    const now = getCurrentTimestamp();
    const elapsedSeconds =
      this.state.sessionStartTimestamp > 0 ? Math.floor((now - this.state.sessionStartTimestamp) / 1000) : 0;

    this.recalculateMetrics();
    const actualTotalSeconds = elapsedSeconds > 0 ? elapsedSeconds : 0;
    const focusRate = actualTotalSeconds > 0 ? this.state.lockedInSeconds / actualTotalSeconds : 0;

    const authResult = await chrome.storage.sync.get(['authToken']);
    const authState = authResult as AuthState;
    const isConnected = !!authState.authToken;
    if (authState.authToken) {
      this.state.cachedAuthToken = authState.authToken;
    }

    return {
      hasActiveSession: this.state.sessionState !== 'noSession',
      sessionState: this.state.sessionState,
      totalSessionSeconds: actualTotalSeconds,
      lockedInSeconds: this.state.lockedInSeconds,
      focusRate,
      currentDomain: this.state.currentDomain,
      isProductiveDomain: this.state.currentDomain ? this.state.domainClassification === 'productive' : null,
      tabSwitchCount: this.state.tabSwitchCount,
      idleBeyond2minSeconds: this.state.idleBeyond2minSeconds,
      lockBreakCount: this.state.lockBreakCount,
      isConnected,
    };
  }

  private async getAuthToken(): Promise<string | null> {
    if (this.state.cachedAuthToken) {
      return this.state.cachedAuthToken;
    }
    const result = await chrome.storage.sync.get(['authToken']);
    this.state.cachedAuthToken = result.authToken || null;
    return this.state.cachedAuthToken;
  }
}

