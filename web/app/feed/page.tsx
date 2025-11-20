'use client';

import { AnchorCard } from '@/components/ui/AnchorCard';
import { formatDuration } from '@/lib/utils';

export default function FeedPage() {
  // Mock data for visual demonstration
  const mockSessions = [
    {
      id: '1',
      user: { name: 'Sarah Chen', initial: 'S', color: 'bg-indigo-500' },
      timeAgo: '2h ago',
      title: 'ECE244 Midterm Prep',
      duration: 3120, // 52 min
      focusRate: 0.84,
      image: null,
      vouched: true
    },
    {
      id: '2',
      user: { name: 'David Park', initial: 'D', color: 'bg-emerald-500' },
      timeAgo: '4h ago',
      title: 'Deep Work - Algorithm Design',
      duration: 5400, // 90 min
      focusRate: 0.92,
      image: true,
      vouched: false
    }
  ];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Coming Soon Banner */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-medium border border-teal-100 mb-4 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          Coming Soon
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Social River</h1>
        <p className="text-slate-500">Connect, compete, and stay anchored together.</p>
      </div>

      <div className="space-y-6 opacity-75 hover:opacity-100 transition-opacity duration-500">
        {mockSessions.map((session) => (
          <div key={session.id} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-100 to-indigo-100 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
            <AnchorCard className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${session.user.color} text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white`}>
                    {session.user.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{session.user.name}</div>
                    <div className="text-xs text-slate-500">{session.timeAgo}</div>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-1">
                  {session.vouched && <span className="text-teal-500">🔒</span>}
                  Anchored {(session.focusRate * 100).toFixed(0)}%
                </div>
              </div>

              <div className="pl-13 ml-13">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{session.title}</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Locked in for <span className="font-medium text-teal-600">{formatDuration(session.duration)}</span>.
                </p>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 rounded-full"
                    style={{ width: `${session.focusRate * 100}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-6 pt-2 border-t border-slate-50">
                  <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Vouch</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Comment</span>
                  </button>
                </div>
              </div>
            </AnchorCard>
          </div>
        ))}
      </div>
    </div>
  );
}
