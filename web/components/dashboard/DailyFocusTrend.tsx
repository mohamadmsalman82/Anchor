'use client';

import { DashboardResponse, DashboardDayStat } from '@/lib/types';
import { prepareDailyFocusData } from '@/lib/chartUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface DailyFocusTrendProps {
  data: DashboardResponse;
  loading?: boolean;
}

export function DailyFocusTrend({ data, loading }: DailyFocusTrendProps) {
  const days: DashboardDayStat[] = Array.isArray(data.last7Days)
    ? data.last7Days
    : [];

  const chartData = prepareDailyFocusData(days);

  if (loading) {
    return (
      <AnchorCard className="h-[400px]">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </AnchorCard>
    );
  }

  if (days.length === 0) {
    return (
      <AnchorCard>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Focus Trend</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No data yet</p>
            <p className="text-xs">Start sessions to see your focus trends</p>
          </div>
        </div>
      </AnchorCard>
    );
  }

  const maxMinutes = Math.max(...chartData.map(d => d.lockedInMinutes), 0);
  const yAxisDomain = [0, Math.max(maxMinutes * 1.1, 60)];

  return (
    <AnchorCard 
      title="Daily Focus Trend" 
      subtitle="Anchored time over the last 7 days"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorLockedIn" x1="0" y1="0" x2="0" y2="1">
              {/* Deep blue to Teal gradient */}
              <stop offset="5%" stopColor="#0f172a" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
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
            dy={10}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={yAxisDomain}
            tickFormatter={(value) => `${value}m`}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '16px',
              padding: '12px',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
            }}
            labelStyle={{
              color: '#64748b',
              fontWeight: 600,
              fontSize: '12px',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            formatter={(value: number) => [
              <span key="val" className="font-bold text-slate-900 text-lg">{value} min</span>,
              <span key="lbl" className="text-teal-600 font-medium">Anchored</span>
            ]}
            labelFormatter={(label) => {
              const dataPoint = chartData.find(d => d.dayLabel === label);
              return dataPoint ? dataPoint.dateLabel : label;
            }}
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="lockedInMinutes"
            stroke="#14b8a6"
            strokeWidth={3}
            fill="url(#colorLockedIn)"
            dot={{ fill: '#0f172a', r: 4, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 0, stroke: '#fff', fill: '#14b8a6' }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </AnchorCard>
  );
}
