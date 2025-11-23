'use client';

import { useDashboardData } from '@/hooks/useDashboardData';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { DailyFocusTrend } from '@/components/dashboard/DailyFocusTrend';
import { FocusComposition } from '@/components/dashboard/FocusComposition';
import { DomainBreakdown } from '@/components/dashboard/DomainBreakdown';
import { ActivityMetrics } from '@/components/dashboard/ActivityMetrics';
import { AnchorScoreCard, StreakCard, DeepWorkPanel } from '@/components/dashboard/AnalyticsComponents';
import { DistractionPanel } from '@/components/dashboard/DistractionPanel';
import { AiAnalyticsPanel } from '@/components/dashboard/AiAnalyticsPanel';
import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { getSession } from '@/lib/apiClient';
import { AnimatedWaveBackground } from '@/components/ui/AnimatedWaveBackground';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [sessionsWithSegments, setSessionsWithSegments] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Fetch full session data with activity segments for domain breakdown
  useEffect(() => {
    if (!data || data.recentSessions.length === 0) {
      return;
    }

    async function fetchSessionsWithSegments() {
      setLoadingSessions(true);
      try {
        const fullSessions = await Promise.all(
          data!.recentSessions.slice(0, 10).map(session => getSession(session.id))
        );
        setSessionsWithSegments(fullSessions);
      } catch (err) {
        console.error('Failed to fetch session details:', err);
      } finally {
        setLoadingSessions(false);
      }
    }

    fetchSessionsWithSegments();
  }, [data?.recentSessions]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-transparent text-slate-100 overflow-hidden">
        <AnimatedWaveBackground intensity="medium" />
        <DashboardLayout>
          <div className="animate-pulse space-y-8 max-w-7xl mx-auto">
            <div className="h-48 bg-slate-800/50 rounded-3xl w-full"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-slate-800/50 rounded-3xl"></div>
              <div className="h-96 bg-slate-800/50 rounded-3xl"></div>
            </div>
          </div>
        </DashboardLayout>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="relative min-h-screen w-full bg-transparent text-slate-100 overflow-hidden">
        <AnimatedWaveBackground intensity="low" />
        <div className="flex items-center justify-center h-screen">
          <div className="rounded-3xl bg-rose-950/30 backdrop-blur border border-rose-900/50 p-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex p-4 bg-rose-900/20 rounded-full text-rose-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Connection Issue</h2>
            <p className="text-slate-400 mb-6">Failed to load your dashboard data. Please check your connection.</p>
            <button
              onClick={refetch}
              className="px-8 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-all shadow-lg shadow-teal-900/20 hover:scale-105 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-transparent text-slate-100 overflow-hidden">
      <AnimatedWaveBackground intensity="medium" />
      
      <DashboardLayout title="Overview">
        <div className="space-y-8 pb-12">
          
          {/* Welcome & Stats */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <WelcomeSection data={data} />
          </div>

          {/* AI Coach - Full Width Row */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-50">
            <AiAnalyticsPanel />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            
            {/* Left Column: Charts, Recent Sessions & Domains */}
            <div className="xl:col-span-2 space-y-6">
              <DailyFocusTrend data={data} loading={loading} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnchorScoreCard data={data} />
                <StreakCard data={data} />
              </div>

              <RecentSessions sessions={data.recentSessions} userId={data.user?.id} />

              {/* Top Domains tucked under recent sessions for balanced layout */}
              <DomainBreakdown sessions={sessionsWithSegments} loading={loadingSessions} />
            </div>

            {/* Right Column: Deeper Insights */}
            <div className="space-y-6">
              <DeepWorkPanel data={data} />
              <FocusComposition data={data} loading={loading} />
              <DistractionPanel leaks={data.analytics?.focusLeaks || []} />
              <ActivityMetrics data={data} loading={loading} />
            </div>
          </div>

        </div>
      </DashboardLayout>
    </div>
  );
}
