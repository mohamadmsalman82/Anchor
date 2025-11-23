import React from 'react';
import { cn } from '@/lib/utils';

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
      className={cn(
        `group relative
        bg-slate-900/40 backdrop-blur-2xl
        border border-slate-700/20 shadow-lg shadow-slate-900/20
        rounded-2xl overflow-hidden
        hover:border-cyan-200/80 hover:shadow-[0_20px_55px_rgba(94,234,212,0.25)]
        transition-all duration-300 ease-out`,
        className
      )}
      {...props}
    >
      {/* Gentle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 to-slate-900/10 pointer-events-none" />
      
      {/* Bottom glow effect */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {(title || subtitle || action) && (
        <div className="relative px-6 py-5 border-b border-slate-700/30 flex justify-between items-center bg-slate-800/25">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-slate-100 tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-400 mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn("relative", noPadding ? '' : 'p-6')}>
        <div className="absolute inset-x-6 bottom-5 h-0.5 bg-gradient-to-r from-cyan-300 to-white/70 opacity-70 rounded-full" />
        {children}
      </div>
    </div>
  );
}
