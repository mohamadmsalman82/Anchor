'use client';

import { DashboardResponse } from '@/lib/types';
import { formatFocusRate } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface FocusCompositionProps {
  data: DashboardResponse;
  loading?: boolean;
}

export function FocusComposition({ data, loading }: FocusCompositionProps) {
  const lockedInSeconds = data.today.lockedInSeconds;
  const totalSeconds = data.today.totalSessionSeconds;
  const nonLockSeconds = totalSeconds - lockedInSeconds;
  const focusRate = data.today.averageFocusRate;

  const chartData = [
    { name: 'Anchored', value: lockedInSeconds, color: '#10b981' },
    { name: 'UnAnchored', value: Math.max(0, nonLockSeconds), color: '#6b7280' },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (totalSeconds === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Focus Composition</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No session data today</p>
            <p className="text-xs">Start a session to see your focus breakdown</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Focus Composition</h3>
        <p className="text-sm text-slate-600">Today's focus breakdown</p>
      </div>
      
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-slate-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-slate-900 mb-1 leading-none">
              {formatFocusRate(focusRate)}
            </div>
            <div className="text-sm text-slate-600">Focus Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

