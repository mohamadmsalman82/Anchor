'use client';

import { DashboardResponse, DashboardDayStat } from '@/lib/types';
import { formatChartDateShort } from '@/lib/chartUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ActivityMetricsProps {
  data: DashboardResponse;
  loading?: boolean;
}

export function ActivityMetrics({ data, loading }: ActivityMetricsProps) {
  // Handle both array and object format for backward compatibility
  const days: DashboardDayStat[] = Array.isArray(data.last7Days)
    ? data.last7Days
    : [];

  const chartData = days.map(day => ({
    date: day.date,
    dateLabel: formatChartDateShort(day.date),
    idleMinutes: Math.round((day.idleBeyond2minSeconds || 0) / 60),
    tabSwitches: day.tabSwitchCount || 0,
  }));

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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Metrics</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No data yet</p>
            <p className="text-xs">Start sessions to see your activity metrics</p>
          </div>
        </div>
      </div>
    );
  }

  const maxIdle = Math.max(...chartData.map(d => d.idleMinutes), 0);
  const maxSwitches = Math.max(...chartData.map(d => d.tabSwitches), 0);
  const yAxisDomain = [0, Math.max(maxIdle, maxSwitches) * 1.2];

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Activity Metrics</h3>
        <p className="text-sm text-slate-600">Idle time and tab switches per day</p>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            vertical={false}
            opacity={0.5}
          />
          <XAxis
            dataKey="dateLabel"
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
            formatter={(value: number, name: string) => {
              if (name === 'idleMinutes') {
                return [`${value} min`, 'Idle Time'];
              }
              return [value, 'Tab Switches'];
            }}
          />
          <Legend
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-slate-700">{value}</span>
            )}
          />
          <Bar
            dataKey="idleMinutes"
            name="Idle Time"
            fill="#f59e0b"
            radius={[8, 8, 0, 0]}
            animationBegin={0}
            animationDuration={800}
          />
          <Bar
            dataKey="tabSwitches"
            name="Tab Switches"
            fill="#8b5cf6"
            radius={[8, 8, 0, 0]}
            animationBegin={100}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

