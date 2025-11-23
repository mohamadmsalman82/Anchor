import { AnchorCard } from './AnchorCard';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <AnchorCard className="text-center py-12 border border-white/40">
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full transform scale-150 animate-pulse"></div>
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-slate-900/60 shadow-lg border border-slate-700 mb-4 transform -rotate-3 transition-transform hover:rotate-0 duration-500">
            <svg
              className="w-12 h-12 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-slate-50 mb-3 tracking-tight">{title}</h2>
        
        {description && (
          <p className="text-lg text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        )}
        
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500/15 text-teal-200 rounded-full text-sm font-bold tracking-wide uppercase border border-teal-400/40 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          Coming Soon
        </div>
        
        <p className="text-sm text-slate-400 mt-8 font-medium">
          We're anchoring down to build this for you. Stay tuned!
        </p>
      </AnchorCard>
    </div>
  );
}
