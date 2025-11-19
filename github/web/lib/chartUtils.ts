import { DashboardDayStat, DomainStats, ActivitySegment, Session } from './types';

/**
 * Format date for chart display (short format like "Mon", "Tue")
 */
export function formatChartDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Format date for chart display (short date like "Jan 17")
 */
export function formatChartDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Convert seconds to minutes for chart display
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Convert seconds to hours for chart display
 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10; // Round to 1 decimal
}

/**
 * Aggregate domain stats from sessions with activity segments
 */
export function aggregateDomainStats(sessions: Session[]): DomainStats[] {
  const domainMap = new Map<string, {
    totalSeconds: number;
    lockedInSeconds: number;
    nonLockSeconds: number;
    productive: boolean;
    sessionCount: number;
  }>();

  for (const session of sessions) {
    if (!session.activitySegments || session.activitySegments.length === 0) {
      continue;
    }

    for (const segment of session.activitySegments) {
      if (!segment.domain) continue;

      const duration = (new Date(segment.end).getTime() - new Date(segment.start).getTime()) / 1000;
      
      if (!domainMap.has(segment.domain)) {
        domainMap.set(segment.domain, {
          totalSeconds: 0,
          lockedInSeconds: 0,
          nonLockSeconds: 0,
          productive: segment.productive,
          sessionCount: 0,
        });
      }

      const stats = domainMap.get(segment.domain)!;
      stats.totalSeconds += duration;
      
      if (segment.lockedIn) {
        stats.lockedInSeconds += duration;
      } else {
        stats.nonLockSeconds += duration;
      }
    }

    // Count unique sessions per domain
    const sessionDomains = new Set(
      session.activitySegments
        .filter(s => s.domain)
        .map(s => s.domain!)
    );
    for (const domain of sessionDomains) {
      if (domainMap.has(domain)) {
        domainMap.get(domain)!.sessionCount += 1;
      }
    }
  }

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      ...stats,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

/**
 * Get top N domains and group the rest as "Other"
 */
export function getTopDomainsWithOther(
  domainStats: DomainStats[],
  topN: number = 5
): DomainStats[] {
  if (domainStats.length <= topN) {
    return domainStats;
  }

  const top = domainStats.slice(0, topN);
  const others = domainStats.slice(topN);

  const otherStats: DomainStats = {
    domain: 'Other',
    totalSeconds: others.reduce((sum, d) => sum + d.totalSeconds, 0),
    lockedInSeconds: others.reduce((sum, d) => sum + d.lockedInSeconds, 0),
    nonLockSeconds: others.reduce((sum, d) => sum + d.nonLockSeconds, 0),
    productive: false, // Mixed
    sessionCount: others.reduce((sum, d) => sum + (d.sessionCount || 0), 0),
  };

  return [...top, otherStats];
}

/**
 * Prepare daily focus trend data for chart
 */
export function prepareDailyFocusData(days: DashboardDayStat[]) {
  return days.map(day => ({
    date: day.date,
    dayLabel: formatChartDate(day.date),
    dateLabel: formatChartDateShort(day.date),
    lockedInMinutes: secondsToMinutes(day.lockedInSeconds),
    lockedInHours: secondsToHours(day.lockedInSeconds),
    totalMinutes: secondsToMinutes(day.totalSessionSeconds),
    focusRate: day.averageFocusRate || 0,
  }));
}

