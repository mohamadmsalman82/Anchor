'use client';

import { AnchorCard } from '@/components/ui/AnchorCard';
import { DashboardResponse, FocusLeak } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface DistractionPanelProps {
  leaks: FocusLeak[];
  title?: string;
}

export function DistractionPanel({ leaks, title = "Biggest Focus Leaks" }: DistractionPanelProps) {
  if (!leaks || leaks.length === 0) {
    return (
      <AnchorCard title={title}>
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <div className="text-4xl mb-2">🛡️</div>
          <p className="text-sm font-medium">No major distractions detected.</p>
          <p className="text-xs opacity-80">Your focus shield is holding strong!</p>
        </div>
      </AnchorCard>
    );
  }

  return (
    <AnchorCard title={title} subtitle="Where your time drifts away">
      <div className="space-y-4 mt-2">
        {leaks.map((leak, index) => (
          <div key={leak.domain} className="relative">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-4">{index + 1}</span>
                <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
                  {leak.domain}
                </span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-rose-400 tabular-nums">
                  {formatDuration(Math.round(leak.totalTimeLost))}
                </span>
              </div>
            </div>
            
            {/* Bar */}
            <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-rose-500 h-1.5 rounded-full"
                style={{ 
                  width: `${Math.min((leak.totalTimeLost / (leaks[0].totalTimeLost * 1.1)) * 100, 100)}%` 
                }}
              />
            </div>
            
            <div className="text-xs text-slate-500 mt-1 text-right">
              {leak.count} {leak.count === 1 ? 'interruption' : 'interruptions'}
            </div>
          </div>
        ))}
      </div>
    </AnchorCard>
  );
}
