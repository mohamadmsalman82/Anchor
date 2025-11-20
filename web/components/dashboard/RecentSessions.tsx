'use client';

import Link from 'next/link';
import { DashboardResponse } from '@/lib/types';
import { formatDuration, formatFocusRate, formatRelativeTime } from '@/lib/utils';
import { SessionTimeline } from '@/components/ui/SessionTimeline';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface RecentSessionsProps {
  sessions: DashboardResponse['recentSessions'];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const getEmotionalTag = (focusRate: number) => {
    if (focusRate >= 0.8) return { text: "Deep dive 🌊", color: "text-teal-600 bg-teal-50 border-teal-100" };
    if (focusRate >= 0.5) return { text: "Solid focus ⚓", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    return { text: "You showed up. That matters. 🌱", color: "text-slate-600 bg-slate-50 border-slate-200" };
  };

  if (sessions.length === 0) {
    return (
      <AnchorCard title="Recent Sessions" subtitle="Your history">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 shadow-inner">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-900 font-semibold mb-1">No sessions yet</p>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            The ocean is waiting. Start a session from the extension to drop your first anchor.
          </p>
        </div>
      </AnchorCard>
    );
  }

  return (
    <AnchorCard title="Recent Sessions" subtitle="Your journey so far">
      <div className="space-y-4">
        {sessions.map((session) => {
          const tag = getEmotionalTag(session.focusRate);
          
          return (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="group block p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200/60 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 text-lg group-hover:text-teal-700 transition-colors">
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
              
              <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
                    <span className="font-medium text-slate-700">{formatDuration(session.lockedInSeconds)}</span>
                    <span className="text-slate-400 text-xs">anchored</span>
                  </div>
                  <div className="w-px h-3 bg-slate-200"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-600">{formatDuration(session.totalSessionSeconds)}</span>
                    <span className="text-slate-400 text-xs">total</span>
                  </div>
                </div>
                
                <div className="font-bold text-slate-900">
                  {formatFocusRate(session.focusRate)}
                </div>
              </div>

              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out group-hover:shadow-[0_0_10px_rgba(45,212,191,0.4)]"
                  style={{ width: `${session.focusRate * 100}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </AnchorCard>
  );
}
