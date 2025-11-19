'use client';

import Link from 'next/link';
import { DashboardResponse } from '@/lib/types';
import { formatDuration, formatFocusRate, formatRelativeTime } from '@/lib/utils';
import { SessionTimeline } from '@/components/ui/SessionTimeline';

interface RecentSessionsProps {
  sessions: DashboardResponse['recentSessions'];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Sessions</h3>
        <div className="text-center py-8">
          <p className="text-slate-600 mb-2">No sessions yet</p>
          <p className="text-sm text-slate-500">Start one from the Chrome extension to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Sessions</h3>
      <div className="space-y-4">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="block p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-slate-900">
                  {session.title || 'Untitled Session'}
                </div>
                <div className="text-xs text-slate-500">{formatRelativeTime(session.startedAt)}</div>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {formatFocusRate(session.focusRate)}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
              <span>Anchored: {formatDuration(session.lockedInSeconds)}</span>
              <span>•</span>
              <span>Total: {formatDuration(session.totalSessionSeconds)}</span>
            </div>
            <SessionTimeline
              totalSeconds={session.totalSessionSeconds}
              lockedInSeconds={session.lockedInSeconds}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

