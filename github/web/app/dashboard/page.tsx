'use client';

import { useDashboardData } from '@/hooks/useDashboardData';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { DailyFocusTrend } from '@/components/dashboard/DailyFocusTrend';
import { FocusComposition } from '@/components/dashboard/FocusComposition';
import { DomainBreakdown } from '@/components/dashboard/DomainBreakdown';
import { ActivityMetrics } from '@/components/dashboard/ActivityMetrics';
import { PageHeader } from '@/components/ui/PageHeader';
import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { getSession } from '@/lib/apiClient';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const [sessionsWithSegments, setSessionsWithSegments] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Fetch full session data with activity segments for domain breakdown
  useEffect(() => {
    if (!data?.recentSessions || data.recentSessions.length === 0) {
      return;
    }

    async function fetchSessionsWithSegments() {
      setLoadingSessions(true);
      try {
        const fullSessions = await Promise.all(
          data.recentSessions.slice(0, 10).map(session => getSession(session.id))
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-700">Failed to load dashboard: {error || 'Unknown error'}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasActiveSession = data?.hasActiveSession ?? false;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Dashboard" subtitle="Your focus tracking overview" />
        <div className="flex items-center gap-3">
          {/* Session Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                hasActiveSession
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-300'
              }`}
              title={hasActiveSession ? 'Session active' : 'No active session'}
            />
            <span className="text-xs text-slate-600 font-medium">
              {hasActiveSession ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <WelcomeSection data={data} />
        
        <StatsGrid data={data} />

        {/* Main charts row - Daily trend full width */}
        <DailyFocusTrend data={data} loading={loading} />

        {/* Two column charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FocusComposition data={data} loading={loading} />
          <ActivityMetrics data={data} loading={loading} />
        </div>

        {/* Domain breakdown and recent sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DomainBreakdown sessions={sessionsWithSegments} loading={loadingSessions} />
          <RecentSessions sessions={data.recentSessions} />
        </div>
      </div>
    </div>
  );
}

