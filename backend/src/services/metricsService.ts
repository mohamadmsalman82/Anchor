import { Session, ActivitySegment } from '@prisma/client';

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

export interface SessionAnalytics extends DeepWorkMetrics, DistractionMetrics {
  anchorScore: number; // 0-100
}

export interface FocusLeak {
  domain: string;
  totalTimeLost: number; // seconds
  count: number; // how many times this domain started a distraction chain
}

/**
 * Calculates the "Anchor Score" (0-100) for a session or a period.
 * Weighted combination of:
 * - Focus Rate (40%)
 * - Duration (30%) - saturated at 2 hours
 * - Consistency/Deep Work Ratio (30%)
 */
export function calculateAnchorScore(
  focusRate: number,
  totalSeconds: number,
  deepWorkRatio: number
): number {
  // 1. Focus Rate Score (0-40)
  const rateScore = focusRate * 40;

  // 2. Duration Score (0-30)
  // Logarithmic scaling: 2 hours (7200s) gives max score.
  // 30 mins (1800s) gives ~15 points.
  const durationCap = 7200;
  const durationScore = Math.min(totalSeconds / durationCap, 1) * 30;

  // 3. Deep Work Ratio Score (0-30)
  const deepScore = deepWorkRatio * 30;

  return Math.round(rateScore + durationScore + deepScore);
}

/**
 * Calculates Deep Work metrics based on activity segments.
 * A "Deep Block" is a continuous period of productive time > 15 minutes (900s).
 */
export function calculateDeepWorkMetrics(
  session: Session & { activitySegments: ActivitySegment[] }
): DeepWorkMetrics {
  const segments = session.activitySegments || [];
  if (segments.length === 0) {
    return { longestDeepBlock: 0, deepWorkRatio: 0, contextSwitchingIndex: 0 };
  }

  // Sort segments by start time just in case
  const sortedSegments = [...segments].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  let currentDeepBlockDuration = 0;
  let longestDeepBlock = 0;
  let totalDeepWorkTime = 0;
  
  // Combine adjacent productive segments
  // We assume segments are contiguous or close enough. 
  // If there's a gap or a non-productive segment, the block breaks.
  
  for (let i = 0; i < sortedSegments.length; i++) {
    const seg = sortedSegments[i];
    const duration = (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000;

    if (seg.productive && seg.lockedIn) {
      // Check if it's continuous with previous segment
      // (For simplicity, if the previous one was also productive/lockedIn, we add up)
      // Realistically, segments are created on tab switch or minute tick. 
      // We'll treat any sequence of productive segments as one block.
      currentDeepBlockDuration += duration;
    } else {
      // Block broken
      if (currentDeepBlockDuration >= 900) { // 15 mins threshold
        totalDeepWorkTime += currentDeepBlockDuration;
      }
      if (currentDeepBlockDuration > longestDeepBlock) {
        longestDeepBlock = currentDeepBlockDuration;
      }
      currentDeepBlockDuration = 0;
    }
  }

  // Check last block
  if (currentDeepBlockDuration >= 900) {
    totalDeepWorkTime += currentDeepBlockDuration;
  }
  if (currentDeepBlockDuration > longestDeepBlock) {
    longestDeepBlock = currentDeepBlockDuration;
  }

  const deepWorkRatio = session.lockedInSeconds > 0 
    ? totalDeepWorkTime / session.lockedInSeconds 
    : 0;

  // Context Switching Index: Switches per hour of anchored time
  // We use session.tabSwitchCount
  const anchoredHours = session.lockedInSeconds / 3600;
  const contextSwitchingIndex = anchoredHours > 0.1 
    ? session.tabSwitchCount / anchoredHours 
    : 0; // Avoid division by zero or tiny sessions skewed data

  return {
    longestDeepBlock,
    deepWorkRatio: Math.min(deepWorkRatio, 1), // Cap at 1
    contextSwitchingIndex,
  };
}

/**
 * Calculates Distraction metrics.
 */
export function calculateDistractionMetrics(
  session: Session & { activitySegments: ActivitySegment[] }
): DistractionMetrics {
  const segments = session.activitySegments || [];
  const sortedSegments = [...segments].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  let timeToFirstDistraction: number | null = null;
  let distractionChains: number[] = [];
  let currentDistractionDuration = 0;
  let isInDistraction = false;
  
  const sessionStart = new Date(session.startedAt).getTime();

  for (const seg of sortedSegments) {
    const duration = (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000;
    
    // Distraction defined as not locked in (productive=false or unlocked)
    // In our model, lockedIn=true implies productive=true usually, but let's be safe.
    const isDistracted = !seg.lockedIn; // Simple definition: if not anchored, it's a distraction or idle

    if (isDistracted) {
      if (!isInDistraction) {
        // Started a distraction chain
        isInDistraction = true;
        currentDistractionDuration = 0;
        
        // Check if this is the first distraction
        if (timeToFirstDistraction === null) {
          timeToFirstDistraction = (new Date(seg.start).getTime() - sessionStart) / 1000;
        }
      }
      currentDistractionDuration += duration;
    } else {
      // Productive segment
      if (isInDistraction) {
        // Ended a distraction chain
        distractionChains.push(currentDistractionDuration);
        currentDistractionDuration = 0;
        isInDistraction = false;
      }
    }
  }

  // If session ended in distraction
  if (isInDistraction && currentDistractionDuration > 0) {
    distractionChains.push(currentDistractionDuration);
  }

  const totalDistractionTime = distractionChains.reduce((a, b) => a + b, 0);
  const averageDistractionChain = distractionChains.length > 0
    ? totalDistractionTime / distractionChains.length
    : 0;

  return {
    timeToFirstDistraction: timeToFirstDistraction, // can be null if perfect session
    averageDistractionChain,
    totalDistractionTime
  };
}

/**
 * Calculates Focus Leaks (domains causing distractions).
 */
export function calculateFocusLeaks(
  session: Session & { activitySegments: ActivitySegment[] }
): FocusLeak[] {
  const segments = session.activitySegments || [];
  const sortedSegments = [...segments].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Map domain -> { totalTimeLost, count }
  const leaks = new Map<string, { totalTimeLost: number, count: number }>();
  
  let currentDistractionDuration = 0;
  let currentDistractionStartDomain: string | null = null;
  let isInDistraction = false;

  for (const seg of sortedSegments) {
    const duration = (new Date(seg.end).getTime() - new Date(seg.start).getTime()) / 1000;
    
    // Distraction defined as not locked in
    const isDistracted = !seg.lockedIn;

    if (isDistracted) {
      if (!isInDistraction) {
        // Started a distraction chain
        isInDistraction = true;
        currentDistractionDuration = 0;
        // Identify the culprit: if it's an unproductive domain, use it. 
        // If it's idle, use "Idle".
        if (seg.reason === 'unproductive_domain' && seg.domain) {
          currentDistractionStartDomain = seg.domain;
        } else if (seg.reason === 'idle_beyond_2m') {
          currentDistractionStartDomain = 'Idle';
        } else {
          currentDistractionStartDomain = 'Unknown';
        }
      } else {
        // Continuing distraction chain
        // If we haven't identified a domain yet (e.g. started with unknown), update if possible
        if (currentDistractionStartDomain === 'Unknown' && seg.reason === 'unproductive_domain' && seg.domain) {
          currentDistractionStartDomain = seg.domain;
        }
      }
      currentDistractionDuration += duration;
    } else {
      // Productive segment - End distraction chain
      if (isInDistraction && currentDistractionStartDomain) {
        const leak = leaks.get(currentDistractionStartDomain) || { totalTimeLost: 0, count: 0 };
        leak.totalTimeLost += currentDistractionDuration;
        leak.count += 1;
        leaks.set(currentDistractionStartDomain, leak);
        
        currentDistractionDuration = 0;
        currentDistractionStartDomain = null;
        isInDistraction = false;
      }
    }
  }

  // If session ended in distraction
  if (isInDistraction && currentDistractionStartDomain && currentDistractionDuration > 0) {
    const leak = leaks.get(currentDistractionStartDomain) || { totalTimeLost: 0, count: 0 };
    leak.totalTimeLost += currentDistractionDuration;
    leak.count += 1;
    leaks.set(currentDistractionStartDomain, leak);
  }

  // Convert map to sorted array
  return Array.from(leaks.entries())
    .map(([domain, stats]) => ({
      domain,
      totalTimeLost: stats.totalTimeLost,
      count: stats.count
    }))
    .sort((a, b) => b.totalTimeLost - a.totalTimeLost);
}

/**
 * Helper to get formatted streak data
 */
export function calculateStreak(sessions: { startedAt: Date, lockedInSeconds: number }[]): number {
  if (sessions.length === 0) return 0;

  // Group by date (YYYY-MM-DD)
  const daysWithFocus = new Set<string>();
  
  sessions.forEach(s => {
    if (s.lockedInSeconds > 15 * 60) { // Threshold: 15 mins to count as a "focused day"
      const date = new Date(s.startedAt).toISOString().split('T')[0];
      daysWithFocus.add(date);
    }
  });

  const sortedDays = Array.from(daysWithFocus).sort((a, b) => b.localeCompare(a)); // Descending
  
  if (sortedDays.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // If the most recent day is neither today nor yesterday, streak is broken (unless we want to be lenient)
  // But typically streak includes today or ended yesterday.
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let currentDate = new Date(sortedDays[0]);
  
  for (let i = 0; i < sortedDays.length; i++) {
    const dateStr = sortedDays[i];
    
    // Check continuity
    // We expect dateStr to be currentDate (or we iterate current date backwards until we match)
    // Actually simpler: check if dateStr is exactly 1 day before the previous one checked.
    // But we have a list of present days.
    // Let's just walk back from today/yesterday.
    
    // Logic:
    // 1. Start from today. If today present, streak++. Move to yesterday.
    // 2. If today not present, check yesterday. If yesterday present, streak++. Move to day before yesterday.
    // 3. If neither, streak is 0 (handled above).
    
    // Let's re-verify the date difference.
  }
  
  // Simpler robust approach:
  let current = new Date();
  current.setHours(0,0,0,0);
  
  // Check if today has data
  const todayStr = current.toISOString().split('T')[0];
  let hasToday = daysWithFocus.has(todayStr);
  
  // If no data today, check yesterday. If no data yesterday, streak is 0.
  // If data today, streak starts at 1.
  // If no data today but data yesterday, streak starts at 1 (for yesterday).
  
  let streakCount = 0;
  
  // If today counts
  if (hasToday) {
    streakCount++;
    current.setDate(current.getDate() - 1);
  } else {
    // Check yesterday
    current.setDate(current.getDate() - 1);
    const yesterdayStr = current.toISOString().split('T')[0];
    if (daysWithFocus.has(yesterdayStr)) {
      streakCount++;
      current.setDate(current.getDate() - 1);
    } else {
      return 0;
    }
  }
  
  // Now keep going back
  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (daysWithFocus.has(dateStr)) {
      streakCount++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streakCount;
}
