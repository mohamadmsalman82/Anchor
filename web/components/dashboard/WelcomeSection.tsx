'use client';

import { DashboardResponse } from '@/lib/types';
import { formatDuration, formatFocusRate, getProfilePictureUrl, getAvatarColor, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AnchorCard } from '@/components/ui/AnchorCard';

interface WelcomeSectionProps {
  data: DashboardResponse;
}

export function WelcomeSection({ data }: WelcomeSectionProps) {
  const { user: authUser } = useAuth();
  const user = authUser || data.user;
  const firstName = user.firstName || user.email.split('@')[0];
  const profilePictureUrl = getProfilePictureUrl(user.profilePictureUrl);

  const todayLockedIn = data.today.lockedInSeconds || 0;

  // Helper for calculating weekly stats
  const getWeeklyStats = () => {
    if (Array.isArray(data.last7Days)) {
      const totalLockedIn = data.last7Days.reduce((sum, day) => sum + (day.lockedInSeconds || 0), 0);
      const totalSeconds = data.last7Days.reduce((sum, day) => sum + (day.totalSessionSeconds || 0), 0);
      const totalWeighted = data.last7Days.reduce((sum, day) => {
        const daySeconds = day.totalSessionSeconds || 0;
        const dayRate = day.averageFocusRate || 0;
        return sum + (dayRate * daySeconds);
      }, 0);
      const avgRate = totalSeconds > 0 ? totalWeighted / totalSeconds : 0;

      return { totalLockedIn, avgRate };
    }
    return { 
      totalLockedIn: data.last7Days?.lockedInSeconds || 0, 
      avgRate: data.last7Days?.averageFocusRate || 0 
    };
  };

  const { totalLockedIn, avgRate } = getWeeklyStats();

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div className="flex items-center gap-5">
          <div className="relative">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-4 border-slate-800 shadow-lg shadow-slate-900/50"
              />
            ) : (
              <div className={`w-20 h-20 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center text-white text-3xl font-bold border-4 border-slate-800 shadow-lg shadow-slate-900/50`}>
                {getInitials(user.email)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white p-1.5 rounded-full border-2 border-slate-800 shadow-sm" title="You're active">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight mb-1">
              Welcome back, {firstName}.
            </h1>
            <p className="text-slate-400 text-lg font-medium flex items-center gap-2">
              <span className="text-teal-400 font-semibold">
                {todayLockedIn > 0 
                  ? `You’ve been anchored for ${formatDuration(todayLockedIn)} today.`
                  : "Ready to drop anchor?"
                }
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-sm">Even 10 minutes of deep work matters.</span>
            </p>
          </div>
        </div>
        
        {/* Motivation Tag - Mobile hidden */}
        <div className="hidden lg:block text-right">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-full shadow-sm text-sm text-slate-300">
             <span className="animate-pulse w-2 h-2 rounded-full bg-teal-400"></span>
             <span>System Status: <span className="font-semibold text-slate-100">Ready to Focus</span></span>
          </div>
        </div>
      </div>

      {/* Key Stats Row - Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(3,minmax(280px,1fr))] gap-4">
        {/* Card 1: Today's Focus */}
        <AnchorCard className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 border-blue-500/20 overflow-hidden group">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all duration-700 group-hover:bg-blue-500/20"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Today's Lock-in</span>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-white">{formatDuration(todayLockedIn)}</span>
              </div>
              <p className="text-blue-200/80 text-sm font-medium mt-1">
                {todayLockedIn > 0 ? "Keep the momentum going." : "Start your first session."}
              </p>
            </div>
          </div>
        </AnchorCard>

        {/* Card 2: Weekly Total */}
        <AnchorCard>
           <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Weekly Total</span>
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-100">{formatDuration(totalLockedIn)}</span>
              </div>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Across last 7 days
              </p>
            </div>
          </div>
        </AnchorCard>

        {/* Card 3: Average Focus */}
        <AnchorCard>
           <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Focus Quality</span>
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-100">{formatFocusRate(avgRate)}</span>
                <span className="text-sm font-medium text-slate-500">avg</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-teal-400 to-teal-600 h-1.5 rounded-full transition-all duration-1000" 
                  style={{ width: `${avgRate * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </AnchorCard>
      </div>
    </div>
  );
}
