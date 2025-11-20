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
import { AnchorCard } from '@/components/ui/AnchorCard';

interface ActivityMetricsProps {
  data: DashboardResponse;
  loading?: boolean;
}

export function ActivityMetrics({ data, loading }: ActivityMetricsProps) {
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
      <AnchorCard>
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </AnchorCard>
    );
  }

  if (days.length === 0) {
    return (
      <AnchorCard title="Activity Metrics">
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No data yet</p>
            <p className="text-xs">Start sessions to see your activity metrics</p>
          </div>
        </div>
      </AnchorCard>
    );
  }

  const maxIdle = Math.max(...chartData.map(d => d.idleMinutes), 0);
  const maxSwitches = Math.max(...chartData.map(d => d.tabSwitches), 0);
  const yAxisDomain = [0, Math.max(maxIdle, maxSwitches) * 1.2];

  return (
    <AnchorCard title="Activity Metrics" subtitle="Idle time and tab switches">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={4}
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
            dy={10}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={yAxisDomain}
            dx={-10}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(4px)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{
              color: '#64748b',
              fontWeight: 600,
              fontSize: '12px',
              marginBottom: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Idle Time') {
                return [<span key="idle" className="text-amber-400 font-bold">{value} min</span>, 'Idle Time'];
              }
              return [<span key="switches" className="text-indigo-400 font-bold">{value}</span>, 'Tab Switches'];
            }}
          />
          <Legend
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm font-medium text-slate-600">{value}</span>
            )}
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          <Bar
            dataKey="idleMinutes"
            name="Idle Time"
            fill="#fbbf24" // Amber 400
            radius={[6, 6, 0, 0]}
            animationBegin={0}
            animationDuration={1000}
            barSize={16}
            className="opacity-90 hover:opacity-100 transition-opacity"
          />
          <Bar
            dataKey="tabSwitches"
            name="Tab Switches"
            fill="#818cf8" // Indigo 400
            radius={[6, 6, 0, 0]}
            animationBegin={200}
            animationDuration={1000}
            barSize={16}
            className="opacity-90 hover:opacity-100 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </AnchorCard>
  );
}
