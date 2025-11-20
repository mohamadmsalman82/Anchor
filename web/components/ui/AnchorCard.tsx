import React from 'react';

interface AnchorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function AnchorCard({ 
  children, 
  className = '', 
  title,
  subtitle,
  action,
  noPadding = false,
  ...props 
}: AnchorCardProps) {
  return (
    <div 
      className={`
        group relative
        bg-white/70 backdrop-blur-xl 
        border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
        rounded-2xl overflow-hidden
        hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:translate-y-[-2px]
        hover:border-teal-500/20
        transition-all duration-300 ease-out
        ${className}
      `}
      {...props}
    >
      {/* Gentle bottom glow effect on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {(title || subtitle || action) && (
        <div className="px-6 py-5 border-b border-slate-100/50 flex justify-between items-center bg-white/30">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
