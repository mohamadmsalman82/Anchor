interface FocusBarProps {
  focusRate: number;
  className?: string;
}

export function FocusBar({ focusRate, className = '' }: FocusBarProps) {
  const percentage = Math.round(focusRate * 100);
  
  return (
    <div className={`h-2 w-full rounded-full bg-slate-200 overflow-hidden ${className}`}>
      <div
        className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

