import { AnchorCard } from './AnchorCard';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, subtext, icon, trend }: StatCardProps) {
  return (
    <AnchorCard className="group hover:border-teal-400/40 transition-all duration-500">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </div>
        {icon && (
          <div className="text-teal-300 p-2 bg-slate-900/60 rounded-xl border border-teal-500/30 group-hover:bg-slate-900/80 group-hover:border-teal-300/60 transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-3xl font-bold text-slate-50 tracking-tight group-hover:text-teal-300 transition-colors">
          {value}
        </div>
      </div>
      
      {subtext && (
        <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
          {trend === 'up' && <span className="text-emerald-400">↑</span>}
          {trend === 'down' && <span className="text-rose-400">↓</span>}
          <span>{subtext}</span>
        </div>
      )}
    </AnchorCard>
  );
}
