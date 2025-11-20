'use client';

import { useDashboardData } from '@/hooks/useDashboardData';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { DailyFocusTrend } from '@/components/dashboard/DailyFocusTrend';
import { FocusComposition } from '@/components/dashboard/FocusComposition';
import { DomainBreakdown } from '@/components/dashboard/DomainBreakdown';
import { ActivityMetrics } from '@/components/dashboard/ActivityMetrics';
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
      <div className="animate-pulse space-y-8 max-w-7xl mx-auto">
        <div className="h-48 bg-slate-200 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl"></div>
          <div className="h-96 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl bg-red-50/50 backdrop-blur border border-red-200 p-12 text-center max-w-2xl mx-auto mt-12">
        <div className="inline-flex p-4 bg-red-100 rounded-full text-red-500 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Issue</h2>
        <p className="text-slate-600 mb-6">Failed to load your dashboard data. Please check your connection.</p>
        <button
          onClick={refetch}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 hover:scale-105 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const hasActiveSession = data?.hasActiveSession ?? false;

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header Actions - Floating Status */}
      <div className="flex items-center justify-end gap-4 mb-[-20px] z-10 relative pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  hasActiveSession ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              {hasActiveSession && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
              )}
            </div>
            <span className={`text-xs font-semibold tracking-wide ${
              hasActiveSession ? 'text-emerald-600' : 'text-slate-500'
            }`}>
              {hasActiveSession ? 'LIVE SESSION' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <button
            onClick={refetch}
            className="text-slate-400 hover:text-slate-900 transition-colors"
            title="Refresh Data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Welcome & Key Stats */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <WelcomeSection data={data} />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <div className="lg:col-span-2 h-full">
          <div className="h-full">
            <DailyFocusTrend data={data} loading={loading} />
          </div>
        </div>
        <div className="lg:col-span-1 h-full">
          <div className="h-full">
            <FocusComposition data={data} loading={loading} />
          </div>
        </div>
      </div>

      {/* Secondary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
        <div className="space-y-6">
          <RecentSessions sessions={data.recentSessions} />
        </div>
        <div className="space-y-6">
          <DomainBreakdown sessions={sessionsWithSegments} loading={loadingSessions} />
          <ActivityMetrics data={data} loading={loading} />
        </div>
      </div>
    </div>
  );
}
