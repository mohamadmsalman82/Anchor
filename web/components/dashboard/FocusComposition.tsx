'use client';

import { DashboardResponse } from '@/lib/types';
import { formatFocusRate } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { AnchorCard } from '@/components/ui/AnchorCard';

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
    { name: 'Anchored', value: lockedInSeconds, color: '#2dd4bf' }, // Bright Aqua (Teal 400)
    { name: 'Drift', value: Math.max(0, nonLockSeconds), color: '#f43f5e' }, // Muted Rose (Rose 500)
  ];

  if (loading) {
    return (
      <AnchorCard className="h-[400px]">
        <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse"></div>
      </AnchorCard>
    );
  }

  if (totalSeconds === 0) {
    return (
      <AnchorCard>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Focus Composition</h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <p className="text-sm mb-1">No session data today</p>
            <p className="text-xs">Start a session to see your focus breakdown</p>
          </div>
        </div>
      </AnchorCard>
    );
  }

  return (
    <AnchorCard
      title="Focus Composition"
      subtitle="Today's lock-in vs drift"
    >
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={105}
              paddingAngle={4}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              animationBegin={0}
              animationDuration={1200}
              cornerRadius={10}
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="drop-shadow-md hover:opacity-90 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '12px',
                padding: '8px 12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
              itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
              formatter={(value) => `${formatFocusRate((value as number) / totalSeconds)}`}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm font-medium text-slate-400 ml-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
          <div className="text-center flex flex-col items-center justify-center animate-in zoom-in fade-in duration-700 delay-300">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Focus</div>
            <div className="text-4xl font-bold text-slate-100 leading-none tracking-tight">
              {formatFocusRate(focusRate)}
            </div>
          </div>
        </div>
      </div>
    </AnchorCard>
  );
}
