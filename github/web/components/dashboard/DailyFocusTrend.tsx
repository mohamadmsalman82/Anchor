'use client';

import { DashboardResponse, DashboardDayStat } from '@/lib/types';
import { prepareDailyFocusData } from '@/lib/chartUtils';
import { formatDuration } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailyFocusTrendProps {
  data: DashboardResponse;
  loading?: boolean;
}

export function DailyFocusTrend({ data, loading }: DailyFocusTrendProps) {
  // Handle both array and object format for backward compatibility
  const days: DashboardDayStat[] = Array.isArray(data.last7Days)
    ? data.last7Days
    : [];

  const chartData = prepareDailyFocusData(days);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Focus Trend</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No data yet</p>
            <p className="text-xs">Start sessions to see your focus trends</p>
          </div>
        </div>
      </div>
    );
  }

  const maxMinutes = Math.max(...chartData.map(d => d.lockedInMinutes), 0);
  const yAxisDomain = [0, Math.max(maxMinutes * 1.1, 60)];

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Daily Focus Trend</h3>
        <p className="text-sm text-slate-600">Anchored time over the last 7 days</p>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLockedIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            vertical={false}
            opacity={0.5}
          />
          <XAxis
            dataKey="dayLabel"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={yAxisDomain}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{
              color: '#1e293b',
              fontWeight: 600,
              fontSize: '12px',
              marginBottom: '4px',
            }}
            formatter={(value: number) => [
              `${value} min`,
              'Anchored'
            ]}
            labelFormatter={(label) => {
              const dataPoint = chartData.find(d => d.dayLabel === label);
              return dataPoint ? dataPoint.dateLabel : label;
            }}
          />
          <Area
            type="monotone"
            dataKey="lockedInMinutes"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#colorLockedIn)"
            dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

