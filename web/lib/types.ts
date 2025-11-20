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
  aiSummary?: string | null;
  aiTags?: string | null;
  activitySegments?: ActivitySegment[];
  files?: SessionFile[];
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
  };
  recentSessions: Array<{
    id: string;
    startedAt: string;
    focusRate: number;
    lockedInSeconds: number;
    totalSessionSeconds: number;
    title?: string | null;
    files?: SessionFile[];
  }>;
  hasActiveSession?: boolean;
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

