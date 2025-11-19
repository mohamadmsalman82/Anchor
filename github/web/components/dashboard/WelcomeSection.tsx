'use client';

import { DashboardResponse } from '@/lib/types';
import { formatDuration, formatFocusRate, getProfilePictureUrl, getAvatarColor, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface WelcomeSectionProps {
  data: DashboardResponse;
}

export function WelcomeSection({ data }: WelcomeSectionProps) {
  const { user: authUser } = useAuth();
  // Use user from auth context if available (more up-to-date), otherwise fall back to dashboard data
  const user = authUser || data.user;
  const firstName = user.firstName || user.email.split('@')[0];
  const profilePictureUrl = getProfilePictureUrl(user.profilePictureUrl);

  return (
    <div className="rounded-2xl bg-white shadow-sm p-8 border border-slate-100">
      <div className="flex items-center gap-4 mb-4">
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
          />
        ) : (
          <div className={`w-16 h-16 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center text-white text-xl font-semibold`}>
            {getInitials(user.email)}
          </div>
        )}
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-sm text-slate-600 mb-1">Today</div>
          <div className="text-2xl font-semibold text-slate-900">
            {formatDuration(data.today.lockedInSeconds || 0)} anchored
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">This Week</div>
          <div className="text-2xl font-semibold text-slate-900">
            {(() => {
              // Handle both array and object formats
              if (Array.isArray(data.last7Days)) {
                const totalLockedIn = data.last7Days.reduce((sum, day) => sum + (day.lockedInSeconds || 0), 0);
                return formatDuration(totalLockedIn);
              } else {
                return formatDuration(data.last7Days?.lockedInSeconds || 0);
              }
            })()} anchored
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">Average Focus Rate</div>
          <div className="text-2xl font-semibold text-slate-900">
            {(() => {
              // Handle both array and object formats
              if (Array.isArray(data.last7Days)) {
                const totalSeconds = data.last7Days.reduce((sum, day) => sum + (day.totalSessionSeconds || 0), 0);
                const totalWeighted = data.last7Days.reduce((sum, day) => {
                  const daySeconds = day.totalSessionSeconds || 0;
                  const dayRate = day.averageFocusRate || 0;
                  return sum + (dayRate * daySeconds);
                }, 0);
                const avgRate = totalSeconds > 0 ? totalWeighted / totalSeconds : 0;
                return formatFocusRate(avgRate);
              } else {
                return formatFocusRate(data.last7Days?.averageFocusRate || 0);
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

