'use client';

import { ActivitySegment } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface TimelineChartProps {
  segments: ActivitySegment[];
  totalDuration: number;
}

export function TimelineChart({ segments, totalDuration }: TimelineChartProps) {
  if (segments.length === 0) {
    return <div className="text-sm text-slate-500">No activity data</div>;
  }

  const getSegmentColor = (segment: ActivitySegment): string => {
    if (segment.lockedIn) {
      return segment.productive ? 'bg-emerald-500' : 'bg-blue-500';
    }
    
    switch (segment.reason) {
      case 'idle_beyond_2m':
        return 'bg-amber-500';
      case 'unproductive_domain':
        return 'bg-red-500';
      case 'failed_check':
        return 'bg-orange-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getSegmentWidth = (segment: ActivitySegment): number => {
    const start = new Date(segment.start).getTime();
    const end = new Date(segment.end).getTime();
    const duration = (end - start) / 1000;
    return (duration / totalDuration) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="h-8 w-full rounded-lg overflow-hidden flex">
        {segments.map((segment, index) => {
          const width = getSegmentWidth(segment);
          const color = getSegmentColor(segment);
          
          return (
            <div
              key={segment.id || index}
              className={`${color} transition-all duration-200 hover:opacity-80`}
              style={{ width: `${width}%` }}
              title={`${segment.domain || 'Unknown'} - ${formatDuration(
                Math.floor((new Date(segment.end).getTime() - new Date(segment.start).getTime()) / 1000)
              )} - ${segment.lockedIn ? 'Anchored' : 'UnAnchored'}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span>Focus site 🧠</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div>
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span>Distraction 🚨</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500"></div>
          <span>Failed check</span>
        </div>
      </div>
    </div>
  );
}

