'use client';

import { useProfile } from '@/hooks/useProfile';
import { SessionCard } from '@/components/ui/SessionCard';
import { StatCard } from '@/components/ui/StatCard';
import { formatDuration, formatFocusRate, getAvatarColor, getInitials, getProfilePictureUrl } from '@/lib/utils';
import { use } from 'react';
import { AnchorCard } from '@/components/ui/AnchorCard';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, loading, error } = useProfile(id);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-2xl w-full mb-8"></div>
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
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700">Failed to load profile: {error || 'Profile not found'}</p>
        </div>
      </div>
    );
  }

  const profilePictureUrl = getProfilePictureUrl(profile.user.profilePictureUrl);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* User Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
        {/* Cover Background */}
        <div className="h-40 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-900 to-transparent"></div>
        </div>
        
        <div className="px-8 pb-8 relative z-10">
          <div className="flex flex-col md:flex-row items-end md:items-end gap-6 -mt-12 mb-6">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-teal-400 to-indigo-500 rounded-full blur opacity-75"></div>
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="relative w-32 h-32 rounded-full object-cover border-4 border-slate-900 shadow-xl"
                />
              ) : (
                <div className={`relative w-32 h-32 rounded-full ${getAvatarColor(profile.user.email)} flex items-center justify-center text-white text-4xl font-bold border-4 border-slate-900 shadow-xl`}>
                  {getInitials(profile.user.email)}
                </div>
              )}
            </div>
            
            <div className="flex-1 mb-2 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{profile.user.firstName} {profile.user.lastName}</h1>
              <p className="text-teal-400 font-medium text-lg">Anchored at UofT Eng.</p>
              <p className="text-slate-400 text-sm mt-2">This is your harbor — a record of every time you chose focus over drift.</p>
            </div>

            <div className="mb-2 text-center md:text-right hidden md:block">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Member Since</div>
              <div className="text-white font-semibold">{new Date(profile.user.createdAt || '').toLocaleDateString()}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
             <span className="px-4 py-1.5 rounded-full bg-slate-800/50 text-slate-300 text-xs font-semibold border border-slate-700 backdrop-blur-sm">
               🎓 Student
             </span>
             <span className="px-4 py-1.5 rounded-full bg-teal-900/30 text-teal-400 text-xs font-semibold border border-teal-800/50 backdrop-blur-sm shadow-[0_0_10px_rgba(45,212,191,0.1)]">
               ⚓ Deep Worker
             </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Anchored"
          value={formatDuration(profile.stats.totalLockedInSeconds)}
          subtext="Time spent in deep waters"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Avg Focus Rate"
          value={formatFocusRate(profile.stats.averageFocusRate)}
          subtext="Consistency score"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Best Focus Rate"
          value={formatFocusRate(profile.stats.bestFocusRate)}
          subtext="Personal record"
          icon={
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          }
        />
        <StatCard
          label="Best Streak"
          value={formatDuration(profile.stats.bestLockedInStreakSeconds)}
          subtext="Longest flow state"
          icon={
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
             </svg>
          }
        />
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Voyages</h2>
        </div>
        
        {profile.recentSessions.length === 0 ? (
          <AnchorCard>
            <div className="text-center py-12 text-slate-500">
              <p className="mb-1 font-medium text-slate-900">No sessions yet</p>
              <p className="text-sm">Start tracking to see your progress here.</p>
            </div>
          </AnchorCard>
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
