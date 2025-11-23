'use client';

import React, { useState, useEffect } from 'react';
import { getSessionInsight, generateSessionInsight } from '@/lib/apiClient';
import { AiInsight } from '@/lib/types';

interface AiSessionSummaryProps {
  sessionId: string;
  className?: string;
}

export const AiSessionSummary: React.FC<AiSessionSummaryProps> = ({ sessionId, className }) => {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (force) {
        data = await generateSessionInsight(sessionId, true);
      } else {
        try {
          data = await getSessionInsight(sessionId);
        } catch (err) {
          // Not found is fine, we show generate button
          data = null;
        }
      }
      
      setInsight(data);
    } catch (err) {
      console.error('Failed to load session insight:', err);
      setError('Could not load AI summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [sessionId]);

  if (loading) {
    return (
      <div className={`rounded-3xl border border-white/30 bg-transparent px-6 py-6 backdrop-blur-sm animate-pulse ${className}`}>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-3xl border border-white/30 bg-transparent px-6 py-6 backdrop-blur-sm flex flex-col items-center text-center ${className}`}>
        <p className="text-slate-300 text-sm mb-3">{error}</p>
        <button 
          onClick={() => fetchInsight(true)}
          className="text-teal-300 text-sm font-bold hover:text-teal-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className={`rounded-3xl border border-white/40 bg-transparent px-6 py-6 backdrop-blur-sm flex items-center justify-between ${className}`}>
        <div>
          <h3 className="font-bold text-slate-50">AI Session Analysis</h3>
          <p className="text-sm text-slate-300">Get insights on your focus patterns.</p>
        </div>
        <button
          onClick={() => fetchInsight(true)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl shadow-lg shadow-teal-500/30 transition-all text-sm font-medium flex items-center gap-2"
        >
          <span>✨</span>
          Generate
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-white/40 bg-transparent px-6 py-6 backdrop-blur-sm relative overflow-hidden ${className}`}>
      {/* Badge */}
      <div className="absolute top-0 right-0 bg-indigo-500/90 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
        AI Analysis
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Summary */}
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-50 text-lg mb-1">Session Summary</h3>
              <p className="text-slate-200 leading-relaxed">{insight.session_summary}</p>
            </div>
          </div>

          {/* Archetype & Next Goal */}
          <div className="flex flex-wrap gap-3 mt-4 pl-14">
            <div className="px-3 py-1.5 bg-indigo-500/20 text-indigo-100 rounded-lg text-xs font-semibold border border-indigo-400/60 flex items-center gap-2">
              <span>👤</span> {insight.focus_archetype}
            </div>
            {insight.next_session_goal && (
              <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-100 rounded-lg text-xs font-semibold border border-emerald-400/60 flex items-center gap-2">
                <span>🎯</span> Next: {insight.next_session_goal}
              </div>
            )}
          </div>
        </div>

        {/* Right: Strengths/Weaknesses */}
        <div className="md:w-1/3 space-y-4 border-t md:border-t-0 md:border-l border-slate-700/70 pt-4 md:pt-0 md:pl-6">
          
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Strengths
            </h4>
            <ul className="space-y-1">
              {insight.strengths.slice(0, 2).map((s, i) => (
                <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Improvements
            </h4>
            <ul className="space-y-1">
              {insight.recommendations.slice(0, 2).map((r, i) => (
                <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span> {r}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

