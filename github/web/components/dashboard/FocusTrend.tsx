'use client';

import { DashboardResponse } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface FocusTrendProps {
  data: DashboardResponse;
}

export function FocusTrend({ data }: FocusTrendProps) {
  // Simple visualization - in production, you'd use a charting library
  // For now, we'll show a simple bar representation
  const maxValue = Math.max(
    data.last7Days.lockedInSeconds,
    data.today.lockedInSeconds
  );

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Focus Trend</h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Today</span>
            <span className="text-sm text-slate-600">{formatDuration(data.today.lockedInSeconds)}</span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-4 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(data.today.lockedInSeconds / maxValue) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Last 7 Days</span>
            <span className="text-sm text-slate-600">{formatDuration(data.last7Days.lockedInSeconds)}</span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-4 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(data.last7Days.lockedInSeconds / maxValue) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Track your daily focus time to build better habits
      </p>
    </div>
  );
}

