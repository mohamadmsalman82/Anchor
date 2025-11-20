'use client';

import { Session } from '@/lib/types';
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
import { AnchorCard } from '@/components/ui/AnchorCard';

interface DomainBreakdownProps {
  sessions: Session[];
  loading?: boolean;
}

// Ocean Theme Palette - Futuristic
const DOMAIN_COLORS = [
  '#2dd4bf', // Teal 400
  '#0ea5e9', // Sky 500
  '#6366f1', // Indigo 500
  '#a855f7', // Purple 500
  '#f43f5e', // Rose 500
  '#fbbf24', // Amber 400
  '#94a3b8', // Slate 400 (Other)
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
      <AnchorCard>
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </AnchorCard>
    );
  }

  if (domainStats.length === 0) {
    return (
      <AnchorCard title="Top Domains">
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-1">No domain data available</p>
            <p className="text-xs">Sessions with activity segments will appear here</p>
          </div>
        </div>
      </AnchorCard>
    );
  }

  return (
    <AnchorCard title="Top Domains" subtitle="Where you spend your time">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }) => 
              percent > 0.1 ? `${(percent * 100).toFixed(0)}%` : ''
            }
            outerRadius={100}
            innerRadius={40}
            dataKey="value"
            animationBegin={0}
            animationDuration={1000}
            paddingAngle={3}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                className="drop-shadow-sm hover:opacity-90 transition-all"
              />
            ))}
          </Pie>
          <Tooltip
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
              marginBottom: '4px',
            }}
            formatter={(value: number, name: string, props: any) => {
              const data = props.payload;
              return [
                <span key="val" className="font-bold text-slate-900">{formatDuration(data.totalSeconds)}</span>,
                <span key="label" className="text-slate-500 ml-2">({formatFocusRate(data.focusRate)} focus)</span>
              ];
            }}
            itemStyle={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-slate-600 font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </AnchorCard>
  );
}
