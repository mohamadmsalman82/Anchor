'use client';

import Link from 'next/link';
import { DashboardResponse } from '@/lib/types';
import { formatDuration, formatFocusRate, formatRelativeTime } from '@/lib/utils';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface RecentSessionsProps {
  sessions: DashboardResponse['recentSessions'];
  userId?: string;
}

export function RecentSessions({ sessions, userId }: RecentSessionsProps) {
  const getEmotionalTag = (focusRate: number) => {
    if (focusRate >= 0.8) return { text: "Deep dive 🌊", color: "text-teal-400 bg-teal-950/30 border-teal-500/20" };
    if (focusRate >= 0.5) return { text: "Solid focus ⚓", color: "text-cyan-400 bg-cyan-950/30 border-cyan-500/20" };
    return { text: "You showed up. That matters. 🌱", color: "text-slate-400 bg-slate-800/50 border-slate-700/50" };
  };

  if (sessions.length === 0) {
    return (
      <AnchorCard title="Recent Sessions" subtitle="Your history">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4 shadow-inner border border-slate-700/50">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-200 font-semibold mb-1">No sessions yet</p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            The ocean is waiting. Start a session from the extension to drop your first anchor.
          </p>
        </div>
      </AnchorCard>
    );
  }

  const visibleSessions = sessions.slice(0, 2);
  const profileHref = userId ? `/profile/${userId}` : '/profile';

  return (
    <AnchorCard title="Recent Sessions" subtitle="Your journey so far">
      <div className="space-y-4">
        {visibleSessions.map((session) => {
          const tag = getEmotionalTag(session.focusRate);
          
          return (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="group block p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-500/30 hover:bg-slate-800/60 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-100 text-lg group-hover:text-cyan-400 transition-colors">
                    {session.title || 'Study Session'}
                  </div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                    {formatRelativeTime(session.startedAt)}
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${tag.color}`}>
                  {tag.text}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
                    <span className="font-medium text-slate-300">{formatDuration(session.lockedInSeconds)}</span>
                    <span className="text-slate-500 text-xs">anchored</span>
                  </div>
                  <div className="w-px h-3 bg-slate-700"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-400">{formatDuration(session.totalSessionSeconds)}</span>
                    <span className="text-slate-500 text-xs">total</span>
                  </div>
                </div>
                
                <div className="font-bold text-slate-200">
                  {formatFocusRate(session.focusRate)}
                </div>
              </div>

              <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 ease-out group-hover:shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  style={{ width: `${session.focusRate * 100}%` }}
                />
              </div>

              {/* AI Snippet if available (we don't have it in the list payload yet, but preparing for it) */}
              {/* 
              <div className="flex items-center gap-2 text-[10px] text-indigo-300/70 italic mt-2">
                <span className="not-italic">✨</span>
                AI Summary available
              </div> 
              */}
            </Link>
          );
        })}
      </div>
      {sessions.length > visibleSessions.length && (
        <div className="flex justify-end mt-4">
          <Link
            href={profileHref}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
          >
            View all sessions
          </Link>
        </div>
      )}
    </AnchorCard>
  );
}
