// Type definitions matching backend API responses

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  createdAt?: string;
}

export interface ActivitySegment {
  id: string;
  start: string;
  end: string;
  domain: string | null;
  productive: boolean;
  lockedIn: boolean;
  reason?: 'unproductive_domain' | 'idle_beyond_2m' | 'failed_check' | 'other' | null;
}

export interface SessionFile {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface DeepWorkMetrics {
  longestDeepBlock: number; // in seconds
  deepWorkRatio: number; // 0-1
  contextSwitchingIndex: number; // switches per hour
}

export interface DistractionMetrics {
  timeToFirstDistraction: number | null; // seconds from start, or null if none
  averageDistractionChain: number; // average seconds lost per distraction chain
  totalDistractionTime: number; // total seconds lost
}

export interface FocusLeak {
  domain: string;
  totalTimeLost: number;
  count: number;
}

export interface SessionAnalytics extends DeepWorkMetrics, DistractionMetrics {
  anchorScore: number; // 0-100
  focusLeaks?: FocusLeak[];
}

export interface Session {
  id: string;
  userId?: string;
  user?: User;
  startedAt: string;
  endedAt: string | null;
  totalSessionSeconds: number;
  lockedInSeconds: number;
  nonLockSeconds: number;
  idleBeyond2minSeconds: number;
  tabSwitchCount: number;
  lockBreakCount: number;
  focusRate: number;
  title?: string | null;
  description?: string | null;
  goal?: string | null;
  goalCompleted?: boolean;
  aiSummary?: string | null;
  aiTags?: string | null;
  activitySegments?: ActivitySegment[];
  files?: SessionFile[];
  analytics?: SessionAnalytics;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DashboardDayStat {
  date: string; // ISO date string (YYYY-MM-DD)
  lockedInSeconds: number;
  totalSessionSeconds: number;
  idleBeyond2minSeconds?: number;
  tabSwitchCount?: number;
  averageFocusRate?: number;
}

export interface DomainStats {
  domain: string;
  totalSeconds: number;
  lockedInSeconds: number;
  nonLockSeconds: number;
  productive: boolean;
  sessionCount?: number;
}

export interface DashboardAnalytics {
  streak: number;
  anchorScore: number;
  weeklyDeepWorkRatio: number;
  weeklyContextSwitching: number;
  peakFocusHour: number;
  maxDeepBlock: number;
  totalDistractionTime: number;
  focusLeaks: FocusLeak[]; // Global top leaks
}

export interface DashboardResponse {
  user: User;
  today: {
    lockedInSeconds: number;
    totalSessionSeconds: number;
    averageFocusRate: number;
    sessionCount: number;
  };
  last7Days: DashboardDayStat[] | {
    lockedInSeconds: number;
    totalSessionSeconds: number;
    averageFocusRate: number;
    sessionCount: number;
  };
  recentSessions: Array<{
    id: string;
    startedAt: string;
    focusRate: number;
    lockedInSeconds: number;
    totalSessionSeconds: number;
    title?: string | null;
    files?: SessionFile[];
    goal?: string | null;
    goalCompleted?: boolean;
  }>;
  hasActiveSession?: boolean;
  analytics?: DashboardAnalytics;
}

export interface FeedResponse {
  sessions: Session[];
}

export interface ProfileResponse {
  user: User;
  stats: {
    totalLockedInSeconds: number;
    totalSessionSeconds: number;
    averageFocusRate: number;
    bestFocusRate: number;
    bestLockedInStreakSeconds: number;
  };
  recentSessions: Session[];
}

export interface LeaderboardEntry {
  user: User;
  totalLockedInSeconds: number;
  sessionCount: number;
  averageFocusRate: number;
  score: number;
}

export interface LeaderboardResponse {
  range: 'weekly' | 'all_time';
  entries: LeaderboardEntry[];
}

export interface DomainOverride {
  id: string;
  domain: string;
  classification: 'productive' | 'unproductive';
  createdAt: string;
  updatedAt: string;
}

export interface DomainInfo {
  domain: string;
  classification: 'productive' | 'unproductive';
  isOverride?: boolean;
  overrideClassification?: 'productive' | 'unproductive' | null;
}

export interface DomainsResponse {
  masterLists: {
    productive: string[];
    unproductive: string[];
  };
  overrides: Array<{
    domain: string;
    classification: 'productive' | 'unproductive';
  }>;
  domains: {
    productive: DomainInfo[];
    unproductive: DomainInfo[];
    custom: DomainInfo[];
  };
}

export interface DomainClassificationResponse {
  domain: string;
  classification: 'productive' | 'unproductive';
  source: 'user_override' | 'master_list' | 'default';
}

// AI Insight Types
export interface AiInsight {
  session_summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  focus_archetype: string;
  distraction_signature: string;
  next_session_goal: string;
  motivation_snippet: string;
  generated_at: string;
}

export interface HomeAnalytics {
  overall_summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  study_archetype: string;
  today_focus_tip: string;
  generated_at: string;
}
