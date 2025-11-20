import { ActivitySegment, SessionMetrics, SessionState } from '../types';
import { getCurrentTimestamp } from '../utils/time';

export type DomainClassification = 'productive' | 'unproductive';

export interface RuntimeState {
  sessionState: SessionState;
  currentTabId: number | null;
  currentUrl: string | null;
  currentDomain: string | null;
  domainClassification: DomainClassification;
  lastActivityTimestamp: number;
  currentIdleSeconds: number;
  lastCheckStatus: 'passed' | 'failed' | 'none';
  sessionId: string | null;
  sessionStartTimestamp: number;
  activitySegments: ActivitySegment[];
  currentSegment: ActivitySegment | null;
  lockedInSeconds: number;
  nonLockSeconds: number;
  idleBeyond2minSeconds: number;
  tabSwitchCount: number;
  lockBreakCount: number;
  cachedAuthToken: string | null;
  finishedSessionMetrics: SessionMetrics | null;
  randomCheckAlarmName: string | null;
  randomCheckNotificationId: string | null;
  uploadIntervalId: number | null;
}

export const createInitialRuntimeState = (): RuntimeState => ({
  sessionState: 'noSession',
  currentTabId: null,
  currentUrl: null,
  currentDomain: null,
  domainClassification: 'unproductive',
  lastActivityTimestamp: getCurrentTimestamp(),
  currentIdleSeconds: 0,
  lastCheckStatus: 'none',
  sessionId: null,
  sessionStartTimestamp: 0,
  activitySegments: [],
  currentSegment: null,
  lockedInSeconds: 0,
  nonLockSeconds: 0,
  idleBeyond2minSeconds: 0,
  tabSwitchCount: 0,
  lockBreakCount: 0,
  cachedAuthToken: null,
  finishedSessionMetrics: null,
  randomCheckAlarmName: null,
  randomCheckNotificationId: null,
  uploadIntervalId: null,
});

