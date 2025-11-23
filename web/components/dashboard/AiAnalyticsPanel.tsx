import React, { useState, useEffect } from 'react';
import { getHomeAnalytics } from '@/lib/apiClient';
import { HomeAnalytics } from '@/lib/types';

interface AiAnalyticsPanelProps {
  className?: string;
}

export const AiAnalyticsPanel: React.FC<AiAnalyticsPanelProps> = ({ className }) => {
  const [data, setData] = useState<HomeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await getHomeAnalytics(force);
      setData(result);
    } catch (err) {
      console.error("Failed to load AI analytics:", err);
      setError("Could not load insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always force fresh analytics on initial load so prompt changes show up immediately.
    fetchData(true);
  }, []);

  if (loading) {
    return (
      <div className={`rounded-3xl border border-white/40 bg-transparent h-full flex items-center justify-center px-6 py-8 backdrop-blur-sm ${className}`}>
        <div className="flex flex-col items-center gap-3 text-slate-200/80 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-white/10"></div>
          <div className="text-sm font-medium">Consulting AI Coach...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`rounded-3xl border border-white/40 bg-transparent h-full flex flex-col items-center justify-center text-center gap-4 px-6 py-8 backdrop-blur-sm ${className}`}>
        <div className="text-slate-200 mb-2">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">AI insights currently unavailable.</p>
        </div>
        <button 
          onClick={() => fetchData(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white border border-white/40 hover:bg-white/10 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-white/40 bg-transparent h-full flex flex-col overflow-hidden px-6 py-6 backdrop-blur-sm ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white">AI Coach</h3>
            <p className="text-xs text-slate-200/80">Personalized Habit Analysis</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium border border-white/40">
          {data.study_archetype}
        </div>
        <button
          onClick={() => fetchData(true)}
          className="ml-3 px-3 py-1 rounded-full bg-white/5 text-xs text-slate-100 hover:bg-white/10 border border-white/30 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        
        {/* Summary */}
        <div className="rounded-2xl p-4 border border-white/25 bg-white/5">
          <p className="text-slate-50 text-sm leading-relaxed">
            {data.overall_summary}
          </p>
        </div>

        {/* Focus Tip */}
        <div className="flex gap-3 items-start bg-gradient-to-r from-emerald-400/20 to-teal-400/20 p-4 rounded-2xl border border-emerald-300/40">
          <div className="mt-0.5 min-w-5 text-emerald-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Today's Focus Tip</h4>
            <p className="text-sm text-emerald-50 font-medium">{data.today_focus_tip}</p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 gap-4">
          {/* Strengths */}
          <div>
            <h4 className="text-xs font-bold text-slate-200/80 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Strengths
            </h4>
            <div className="space-y-2">
              {data.strengths.map((str, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-50 bg-white/5 p-2.5 rounded-xl border border-white/15">
                  <span className="text-emerald-300 mt-0.5">✓</span>
                  <span className="text-slate-50">{str}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations (combining weaknesses conceptually or listing separate) */}
          <div>
            <h4 className="text-xs font-bold text-slate-200/80 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Recommendations
            </h4>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-50 bg-white/5 p-2.5 rounded-xl border border-white/15">
                  <span className="text-amber-300 mt-0.5">→</span>
                  <span className="text-slate-50">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

