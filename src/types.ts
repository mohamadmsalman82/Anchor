/**
 * Session state types
 */
export type SessionState = 
  | 'noSession'
  | 'sessionActive_lockedIn'
  | 'sessionActive_notLockedIn';

/**
 * Reasons why a segment might be non-lock
 * Must match backend enum: unproductive_domain, idle_beyond_2m, failed_check, other
 */
export type NonLockReason = 
  | 'unproductive_domain'
  | 'idle_beyond_2m'
  | 'failed_check'
  | 'other';

/**
 * Legacy type alias for backward compatibility
 */
export type SegmentReason = NonLockReason | 'productive';

/**
 * Activity segment - represents a period of time with consistent state
 */
export interface ActivitySegment {
  start: number;         // timestamp in ms
  end?: number;          // timestamp in ms (filled on close)
  domain: string | null;
  productive: boolean;  // true if productive, false otherwise
  lockedIn: boolean;    // true for lock time, false for non-lock
  reason?: NonLockReason;
}

/**
 * Complete session metrics
 */
export interface SessionMetrics {
  sessionId: string;
  sessionStartTimestamp: number;
  sessionEndTimestamp?: number;
  totalSessionSeconds: number;
  lockedInSeconds: number;
  nonLockSeconds: number;
  focusRate: number;              // 0..1, calculated as lockedInSeconds / totalSessionSeconds
  idleBeyond2minSeconds: number;
  tabSwitchCount: number;
  lockBreakCount: number;          // Number of times we transitioned from locked-in → not-locked-in
  segments: ActivitySegment[];
  fileIds?: string[];             // Optional array of file IDs
}

/**
 * State sent to popup UI
 */
export interface PopupState {
  hasActiveSession: boolean;
  sessionState: SessionState;
  totalSessionSeconds: number;
  lockedInSeconds: number;
  focusRate: number;              // 0..1
  currentDomain: string | null;
  isProductiveDomain: boolean | null;  // true = productive, false = unproductive, null = unknown/no domain
  tabSwitchCount: number;
  idleBeyond2minSeconds: number;
  lockBreakCount: number;
  isConnected: boolean;           // authToken present?
}

/**
 * Messages from popup to background
 */
export type PopupMessage = 
  | { type: 'GET_STATE' }
  | { type: 'START_SESSION' }
  | { type: 'FINISH_SESSION' }
  | { type: 'GET_FINISHED_SESSION' }
  | { type: 'UPLOAD_FINISHED_SESSION' }
  | { type: 'DISCARD_FINISHED_SESSION' };

/**
 * Response messages from background to popup
 */
export type BackgroundResponse = 
  | { type: 'STATE_UPDATE'; state: PopupState }
  | { type: 'FINISHED_SESSION'; metrics: SessionMetrics }
  | { type: 'ERROR'; message: string }
  | { type: 'SUCCESS'; message: string };

/**
 * Internal session context for state machine
 */
export interface SessionContext {
  currentDomain: string | null;
  isProductiveDomain: boolean;
  currentIdleSeconds: number;
  lastCheckPopupStatus: 'passed' | 'failed' | 'none';
  currentSessionState: SessionState;
}


/**
 * Authentication state stored in chrome.storage.sync
 */
export interface AuthState {
  authToken?: string;
  userId?: string;
}

/**
 * Session state stored in chrome.storage.local for persistence
 */
export interface StoredSessionState {
  hasActiveSession: boolean;
  sessionId?: string;
  sessionStartTimestamp?: number;
  metrics?: {
    totalSessionSeconds: number;
    lockedInSeconds: number;
    nonLockSeconds: number;
    idleBeyond2minSeconds: number;
    tabSwitchCount: number;
    lockBreakCount: number;
  };
  sessionState?: SessionState;
  currentSegment?: ActivitySegment | null;
  activitySegments?: ActivitySegment[];
  lastActivityTimestamp?: number;
}

/**
 * Pending upload queue item for offline/network error handling
 */
export interface PendingUpload {
  sessionId: string;
  segments: ActivitySegment[];
  timestamp: number;  // When this was queued
}

/**
 * End session payload sent to backend API
 */
export interface EndSessionPayload {
  sessionId: string;
  sessionStartTimestamp: string;  // ISO format
  sessionEndTimestamp: string;    // ISO format
  totalSessionSeconds: number;
  lockedInSeconds: number;
  nonLockSeconds: number;
  focusRate: number;
  idleBeyond2minSeconds: number;
  tabSwitchCount: number;
  lockBreakCount: number;
  segments: ActivitySegment[];
  fileIds?: string[]; // Array of file IDs uploaded separately
}

/**
 * Uploaded file response from API
 */
export interface UploadedFile {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

