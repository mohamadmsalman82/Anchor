import { DashboardResponse } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { formatDuration, formatFocusRate } from '@/lib/utils';

interface StatsGridProps {
  data: DashboardResponse;
}

export function StatsGrid({ data }: StatsGridProps) {
  // Handle both array and object format for last7Days (backward compatibility)
  const last7DaysTotal = Array.isArray(data.last7Days)
    ? data.last7Days.reduce((sum, day) => sum + day.lockedInSeconds, 0)
    : data.last7Days.lockedInSeconds;
  const last7DaysAvgFocus = Array.isArray(data.last7Days)
    ? (data.last7Days.reduce((sum, day) => sum + (day.averageFocusRate || 0) * day.totalSessionSeconds, 0) /
       data.last7Days.reduce((sum, day) => sum + day.totalSessionSeconds, 0) || 0)
    : data.last7Days.averageFocusRate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Today's Focus Rate"
        value={formatFocusRate(data.today.averageFocusRate)}
        subtext={`${data.today.sessionCount} session${data.today.sessionCount !== 1 ? 's' : ''}`}
      />
      <StatCard
        label="Sessions Today"
        value={data.today.sessionCount}
        subtext={formatDuration(data.today.totalSessionSeconds)}
      />
      <StatCard
        label="Last 7 Days Anchored"
        value={formatDuration(last7DaysTotal)}
        subtext={formatFocusRate(last7DaysAvgFocus) + ' avg focus'}
      />
      <StatCard
        label="Best Focus Rate This Week"
        value={formatFocusRate(
          Math.max(...data.recentSessions.map(s => s.focusRate), 0)
        )}
        subtext="From recent sessions"
      />
    </div>
  );
}

