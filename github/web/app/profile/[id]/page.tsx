'use client';

import { useProfile } from '@/hooks/useProfile';
import { PageHeader } from '@/components/ui/PageHeader';
import { SessionCard } from '@/components/ui/SessionCard';
import { StatCard } from '@/components/ui/StatCard';
import { formatDuration, formatFocusRate, getAvatarColor, getInitials } from '@/lib/utils';
import { use } from 'react';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, loading, error } = useProfile(id);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-700">Failed to load profile: {error || 'Profile not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* User Header */}
      <div className="rounded-2xl bg-white shadow-sm p-8 border border-slate-100 mb-8">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full ${getAvatarColor(profile.user.email)} flex items-center justify-center text-white text-2xl font-semibold`}>
            {getInitials(profile.user.email)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">{profile.user.email}</h1>
            <p className="text-slate-600">Member since {new Date(profile.user.createdAt || '').toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Anchored"
          value={formatDuration(profile.stats.totalLockedInSeconds)}
          subtext="All time"
        />
        <StatCard
          label="Average Focus Rate"
          value={formatFocusRate(profile.stats.averageFocusRate)}
          subtext="Across all sessions"
        />
        <StatCard
          label="Best Focus Rate"
          value={formatFocusRate(profile.stats.bestFocusRate)}
          subtext="Single session"
        />
        <StatCard
          label="Best Streak"
          value={formatDuration(profile.stats.bestLockedInStreakSeconds)}
          subtext="Longest anchored period"
        />
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Recent Sessions</h2>
        {profile.recentSessions.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm p-12 border border-slate-100 text-center">
            <p className="text-slate-600 mb-2">No sessions yet</p>
            <p className="text-sm text-slate-500">Start tracking to see your progress here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

