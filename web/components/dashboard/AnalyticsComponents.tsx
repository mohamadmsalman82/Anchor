'use client';

import { AnchorCard } from '@/components/ui/AnchorCard';
import { DashboardResponse } from '@/lib/types';
import { formatFocusRate, formatDuration } from '@/lib/utils';

interface AnchorScoreCardProps {
  data: DashboardResponse;
}

export function AnchorScoreCard({ data }: AnchorScoreCardProps) {
  const score = data.analytics?.anchorScore || 0;
  const prevScore = 75; // Mock previous week for now, or add to API
  const trend = score - prevScore;
  
  // Determine color based on score
  let scoreColor = 'text-teal-500';
  if (score < 50) scoreColor = 'text-amber-500';
  if (score < 30) scoreColor = 'text-rose-500';
  if (score >= 80) scoreColor = 'text-emerald-500';

  return (
    <AnchorCard className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Anchor Score</h3>
          <p className="text-slate-500 text-xs mt-0.5">Weekly Performance</p>
        </div>
        <div className="p-2 bg-white/10 rounded-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-2 relative z-10">
        <span className={`text-5xl font-bold tracking-tight ${score >= 80 ? 'text-teal-400' : 'text-white'}`}>
          {score}
        </span>
        <span className="text-slate-400 text-lg">/100</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-700/50 rounded-full mb-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            score >= 80 ? 'bg-teal-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
          }`} 
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
         {trend > 0 ? (
           <span className="text-emerald-400 flex items-center">
             <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
             </svg>
             +{trend} from last week
           </span>
         ) : (
           <span className="text-rose-400 flex items-center">
             <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
             </svg>
             {trend} from last week
           </span>
         )}
      </div>
    </AnchorCard>
  );
}

interface StreakCardProps {
  data: DashboardResponse;
}

export function StreakCard({ data }: StreakCardProps) {
  const streak = data.analytics?.streak || 0;

  return (
    <AnchorCard>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-sm font-medium">Focus Streak</h3>
        <div className="text-amber-500">🔥</div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-slate-100">{streak}</span>
        <span className="text-slate-400 text-sm font-medium">days</span>
      </div>
      <p className="text-xs text-slate-500">
        {streak > 0 ? "Keep the chain going!" : "Start a new streak today."}
      </p>
    </AnchorCard>
  );
}

interface DeepWorkPanelProps {
  data: DashboardResponse;
}

export function DeepWorkPanel({ data }: DeepWorkPanelProps) {
  const metrics = data.analytics;
  if (!metrics) return null;

  return (
    <AnchorCard title="Deep Work Metrics" subtitle="Quality of your focus">
      <div className="mt-2 overflow-x-auto">
        <div className="min-w-[0] md:min-w-full grid grid-cols-1 md:grid-cols-[repeat(3,minmax(240px,1fr))] gap-6">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-600/30">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Deep Work Ratio</div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-slate-100">
                {(metrics.weeklyDeepWorkRatio * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">of anchored time is contiguous (15m+)</div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-2">Max Deep Block</div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-slate-100">
                {Math.floor(metrics.maxDeepBlock / 60)}m
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">longest uninterrupted flow</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-600/30">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Context Switching</div>
            <div className="flex items-end gap-2">
              <div className={`text-2xl font-bold ${metrics.weeklyContextSwitching > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metrics.weeklyContextSwitching.toFixed(1)}
              </div>
              <span className="text-xs text-slate-500 mb-1">/hr</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">switches per focused hour</div>
          </div>
        </div>
      </div>
    </AnchorCard>
  );
}
