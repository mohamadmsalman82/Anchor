'use client';

import { ActivitySegment } from '@/lib/types';

interface SessionTimelineProps {
  segments?: ActivitySegment[];
  totalSeconds: number;
  lockedInSeconds: number;
  className?: string;
}

export function SessionTimeline({ 
  segments, 
  totalSeconds, 
  lockedInSeconds,
  className = '' 
}: SessionTimelineProps) {
  if (totalSeconds === 0) {
    return (
      <div className={`h-2 w-full bg-slate-200 rounded-full ${className}`}></div>
    );
  }

  // If we have segments, use them for accurate representation
  if (segments && segments.length > 0) {
    const sortedSegments = [...segments].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return (
      <div className={`h-2 w-full flex rounded-full overflow-hidden ${className}`}>
        {sortedSegments.map((segment, index) => {
          const duration = (new Date(segment.end).getTime() - new Date(segment.start).getTime()) / 1000;
          const widthPercent = (duration / totalSeconds) * 100;
          
          return (
            <div
              key={index}
              className="h-full"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: segment.lockedIn ? '#10b981' : '#ef4444',
              }}
            />
          );
        })}
      </div>
    );
  }

  // Fallback: use focus rate to show proportional bar
  const lockedInPercent = (lockedInSeconds / totalSeconds) * 100;
  const nonLockPercent = 100 - lockedInPercent;

  return (
    <div className={`h-2 w-full flex rounded-full overflow-hidden ${className}`}>
      {lockedInPercent > 0 && (
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${lockedInPercent}%` }}
        />
      )}
      {nonLockPercent > 0 && (
        <div
          className="h-full bg-red-500"
          style={{ width: `${nonLockPercent}%` }}
        />
      )}
    </div>
  );
}

