import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

/**
 * GET /me/dashboard
 * Returns current user's dashboard snapshot
 */
export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.user.id;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate last 7 days date range
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    // Get today's sessions
    const todaySessions = await prisma.session.findMany({
      where: {
        userId,
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get last 7 days sessions
    const last7DaysSessions = await prisma.session.findMany({
      where: {
        userId,
        startedAt: {
          gte: last7Days,
        },
      },
    });

    // Calculate today's stats
    const todayStats = {
      lockedInSeconds: todaySessions.reduce((sum, s) => sum + s.lockedInSeconds, 0),
      totalSessionSeconds: todaySessions.reduce((sum, s) => sum + s.totalSessionSeconds, 0),
      sessionCount: todaySessions.length,
    };
    const todayAverageFocusRate = todayStats.totalSessionSeconds > 0
      ? todaySessions.reduce((sum, s) => sum + (s.focusRate * s.totalSessionSeconds), 0) / todayStats.totalSessionSeconds
      : 0;

    // Calculate last 7 days stats (aggregated)
    const last7DaysStats = {
      lockedInSeconds: last7DaysSessions.reduce((sum, s) => sum + s.lockedInSeconds, 0),
      totalSessionSeconds: last7DaysSessions.reduce((sum, s) => sum + s.totalSessionSeconds, 0),
    };
    const last7DaysAverageFocusRate = last7DaysStats.totalSessionSeconds > 0
      ? last7DaysSessions.reduce((sum, s) => sum + (s.focusRate * s.totalSessionSeconds), 0) / last7DaysStats.totalSessionSeconds
      : 0;

    // Calculate daily breakdown for last 7 days
    const dailyStatsMap = new Map<string, {
      lockedInSeconds: number;
      totalSessionSeconds: number;
      idleBeyond2minSeconds: number;
      tabSwitchCount: number;
      sessionCount: number;
      totalFocusWeighted: number;
    }>();

    // Initialize all 7 days with zeros
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyStatsMap.set(dateKey, {
        lockedInSeconds: 0,
        totalSessionSeconds: 0,
        idleBeyond2minSeconds: 0,
        tabSwitchCount: 0,
        sessionCount: 0,
        totalFocusWeighted: 0,
      });
    }

    // Aggregate sessions by day
    for (const session of last7DaysSessions) {
      const sessionDate = new Date(session.startedAt);
      sessionDate.setHours(0, 0, 0, 0);
      const dateKey = sessionDate.toISOString().split('T')[0];

      if (dailyStatsMap.has(dateKey)) {
        const dayStats = dailyStatsMap.get(dateKey)!;
        dayStats.lockedInSeconds += session.lockedInSeconds;
        dayStats.totalSessionSeconds += session.totalSessionSeconds;
        dayStats.idleBeyond2minSeconds += session.idleBeyond2minSeconds;
        dayStats.tabSwitchCount += session.tabSwitchCount;
        dayStats.sessionCount += 1;
        dayStats.totalFocusWeighted += session.focusRate * session.totalSessionSeconds;
      }
    }

    // Convert map to array of daily stats
    const last7DaysDaily: Array<{
      date: string;
      lockedInSeconds: number;
      totalSessionSeconds: number;
      idleBeyond2minSeconds: number;
      tabSwitchCount: number;
      averageFocusRate: number;
    }> = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        lockedInSeconds: stats.lockedInSeconds,
        totalSessionSeconds: stats.totalSessionSeconds,
        idleBeyond2minSeconds: stats.idleBeyond2minSeconds,
        tabSwitchCount: stats.tabSwitchCount,
        averageFocusRate: stats.totalSessionSeconds > 0
          ? stats.totalFocusWeighted / stats.totalSessionSeconds
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get recent sessions (last 10)
    const recentSessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        focusRate: true,
        lockedInSeconds: true,
        totalSessionSeconds: true,
        title: true,
        files: {
          select: {
            id: true,
            filename: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
          },
        },
      },
    });

    // Check if user has an active session (endedAt is null)
    const activeSession = await prisma.session.findFirst({
      where: {
        userId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
      },
    });

    res.json({
      user,
      today: {
        ...todayStats,
        averageFocusRate: todayAverageFocusRate,
      },
      last7Days: last7DaysDaily,
      recentSessions,
      hasActiveSession: !!activeSession,
    });
  } catch (error) {
    throw error;
  }
}

