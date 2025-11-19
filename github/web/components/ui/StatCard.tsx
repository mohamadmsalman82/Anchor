interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100 transition-all duration-200 hover:shadow-md">
      <div className="text-sm font-medium text-slate-600 mb-2">{label}</div>
      <div className="text-3xl font-semibold text-slate-900 mb-1">{value}</div>
      {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}

