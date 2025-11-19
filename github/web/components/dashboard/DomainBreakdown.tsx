'use client';

import { Session, DomainStats } from '@/lib/types';
import { aggregateDomainStats, getTopDomainsWithOther } from '@/lib/chartUtils';
import { formatDuration, formatFocusRate } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface DomainBreakdownProps {
  sessions: Session[];
  loading?: boolean;
}

// Modern color palette (not rainbow)
const DOMAIN_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6b7280', // gray (for "Other")
];

export function DomainBreakdown({ sessions, loading }: DomainBreakdownProps) {
  const domainStats = aggregateDomainStats(sessions);
  const topDomains = getTopDomainsWithOther(domainStats, 5);

  const chartData = topDomains.map((domain, index) => ({
    name: domain.domain,
    value: Math.round(domain.totalSeconds / 60), // Convert to minutes
    totalSeconds: domain.totalSeconds,
    lockedInSeconds: domain.lockedInSeconds,
    focusRate: domain.totalSeconds > 0 ? domain.lockedInSeconds / domain.totalSeconds : 0,
    color: DOMAIN_COLORS[index % DOMAIN_COLORS.length],
  }));

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (domainStats.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Time by Domain</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No domain data available</p>
            <p className="text-xs">Sessions with activity segments will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Time by Domain</h3>
        <p className="text-sm text-slate-600">Breakdown of time spent across domains</p>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => 
              percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{
              color: '#1e293b',
              fontWeight: 600,
              fontSize: '14px',
              marginBottom: '8px',
            }}
            formatter={(value: number, name: string, props: any) => {
              const data = props.payload;
              return `${formatDuration(data.totalSeconds)} (${formatFocusRate(data.focusRate)} focus)`;
            }}
            labelFormatter={(label) => {
              const data = chartData.find(d => d.name === label);
              return data ? data.name : label;
            }}
          />
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
    </div>
  );
}

