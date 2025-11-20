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
    // Locked in segments
    if (segment.lockedIn) {
      return 'bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.6)] z-10'; 
    }

    // Specific reasons
    if (segment.reason === 'unproductive_domain') {
      return 'bg-rose-400/80';
    }
    
    if (segment.reason === 'idle_beyond_2m') {
      return 'bg-amber-400/80';
    }
    
    return 'bg-slate-700/30';
  };

  const getSegmentWidth = (segment: ActivitySegment): number => {
    const start = new Date(segment.start).getTime();
    const end = new Date(segment.end).getTime();
    const duration = (end - start) / 1000;
    return (duration / totalDuration) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Timeline Bar */}
      <div className="relative h-12 w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner border border-slate-800 flex items-center p-1">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-20">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="border-r border-white h-full"></div>
          ))}
        </div>

        <div className="flex w-full h-full relative rounded-xl overflow-hidden">
          {segments.map((segment, index) => {
            const width = getSegmentWidth(segment);
            const color = getSegmentColor(segment);
            
            return (
              <div
                key={segment.id || index}
                className={`${color} relative h-full transition-all duration-300 hover:opacity-100 hover:brightness-110 hover:z-20`}
                style={{ width: `${width}%` }}
                title={`${segment.domain || 'Unknown'} • ${formatDuration(
                  Math.floor((new Date(segment.end).getTime() - new Date(segment.start).getTime()) / 1000)
                )} • ${segment.lockedIn ? 'Anchored' : 'Drifted'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Anchored</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-400"></div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drift</span>
        </div>
      </div>
    </div>
  );
}
