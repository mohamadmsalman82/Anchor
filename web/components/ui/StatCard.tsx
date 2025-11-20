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
    <AnchorCard className="group hover:border-teal-500/30 transition-all duration-500">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        {icon && (
          <div className="text-teal-500/70 p-2 bg-teal-50 rounded-xl group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-3xl font-bold text-slate-900 tracking-tight group-hover:text-teal-900 transition-colors">
          {value}
        </div>
      </div>
      
      {subtext && (
        <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
          {trend === 'up' && <span className="text-emerald-500">↑</span>}
          {trend === 'down' && <span className="text-rose-500">↓</span>}
          {subtext}
        </div>
      )}
    </AnchorCard>
  );
}
