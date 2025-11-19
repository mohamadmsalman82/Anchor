import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

/**
 * GET /leaderboard
 * Support range filters: weekly (last 7 days) or all_time
 */
export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const range = (req.query.range as string) || 'weekly';

    let startDate: Date | undefined;
    if (range === 'weekly') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    // Build where clause
    const whereClause: any = {
      endedAt: { not: null }, // Only completed sessions
    };

    if (startDate) {
      whereClause.startedAt = { gte: startDate };
    }

    // Get all sessions in range
    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Aggregate by user
    const userStats = new Map<string, {
      user: { id: string; email: string };
      totalLockedInSeconds: number;
      sessionCount: number;
      totalSessionSeconds: number;
      focusRateSum: number;
      totalWeight: number;
    }>();

    for (const session of sessions) {
      const userId = session.userId;
      const existing = userStats.get(userId);

      if (existing) {
        existing.totalLockedInSeconds += session.lockedInSeconds;
        existing.sessionCount += 1;
        existing.totalSessionSeconds += session.totalSessionSeconds;
        existing.focusRateSum += session.focusRate * session.totalSessionSeconds;
        existing.totalWeight += session.totalSessionSeconds;
      } else {
        userStats.set(userId, {
          user: session.user,
          totalLockedInSeconds: session.lockedInSeconds,
          sessionCount: 1,
          totalSessionSeconds: session.totalSessionSeconds,
          focusRateSum: session.focusRate * session.totalSessionSeconds,
          totalWeight: session.totalSessionSeconds,
        });
      }
    }

    // Convert to array and calculate average focus rate
    const entries = Array.from(userStats.values())
      .map(stat => ({
        user: stat.user,
        totalLockedInSeconds: stat.totalLockedInSeconds,
        sessionCount: stat.sessionCount,
        averageFocusRate: stat.totalWeight > 0 ? stat.focusRateSum / stat.totalWeight : 0,
      }))
      .sort((a, b) => b.totalLockedInSeconds - a.totalLockedInSeconds); // Sort by locked-in time descending

    res.json({
      range,
      entries,
    });
  } catch (error) {
    throw error;
  }
}

