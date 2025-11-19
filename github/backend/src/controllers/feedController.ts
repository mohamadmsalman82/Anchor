import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

/**
 * GET /feed
 * Simple feed of recent posted sessions
 */
export async function getFeed(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await prisma.session.findMany({
      where: {
        isPosted: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
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

    res.json({
      sessions: sessions.map(session => ({
        id: session.id,
        user: session.user,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lockedInSeconds: session.lockedInSeconds,
        totalSessionSeconds: session.totalSessionSeconds,
        focusRate: session.focusRate,
        title: session.title,
        aiSummary: session.aiSummary,
        files: session.files,
      })),
    });
  } catch (error) {
    throw error;
  }
}

