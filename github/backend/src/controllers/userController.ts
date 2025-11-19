import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * GET /sessions/:id
 * Return full detail for one session, including segments
 * Auth is optional - if provided, user can see their own private sessions
 */
export async function getSessionById(req: Request | AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        activitySegments: {
          orderBy: {
            start: 'asc',
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

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user owns the session or if it's posted (for public viewing)
    const authReq = req as AuthRequest;
    if (authReq.user && session.userId === authReq.user.id) {
      // User owns the session, return full details
      res.json(session);
    } else if (session.isPosted) {
      // Public session, return without sensitive data
      res.json({
        id: session.id,
        user: session.user,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lockedInSeconds: session.lockedInSeconds,
        totalSessionSeconds: session.totalSessionSeconds,
        focusRate: session.focusRate,
        idleBeyond2minSeconds: session.idleBeyond2minSeconds,
        tabSwitchCount: session.tabSwitchCount,
        lockBreakCount: session.lockBreakCount,
        title: session.title,
        description: session.description,
        aiSummary: session.aiSummary,
        activitySegments: session.activitySegments,
        files: session.files,
      });
    } else {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * GET /users/:id/profile
 * Return profile info and key stats
 * Public endpoint - no auth required
 */
export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get all sessions for this user
    const allSessions = await prisma.session.findMany({
      where: {
        userId: id,
        endedAt: { not: null }, // Only completed sessions
      },
    });

    // Calculate stats
    const totalLockedInSeconds = allSessions.reduce((sum, s) => sum + s.lockedInSeconds, 0);
    const totalSessionSeconds = allSessions.reduce((sum, s) => sum + s.totalSessionSeconds, 0);
    const averageFocusRate = totalSessionSeconds > 0
      ? allSessions.reduce((sum, s) => sum + (s.focusRate * s.totalSessionSeconds), 0) / totalSessionSeconds
      : 0;
    
    const focusRates = allSessions.map(s => s.focusRate).filter(r => r > 0);
    const bestFocusRate = focusRates.length > 0 ? Math.max(...focusRates) : 0;

    // Calculate best locked-in streak (consecutive locked-in segments)
    let bestStreak = 0;
    let currentStreak = 0;
    for (const session of allSessions) {
      const segments = await prisma.activitySegment.findMany({
        where: { sessionId: session.id },
        orderBy: { start: 'asc' },
      });
      
      for (const segment of segments) {
        if (segment.lockedIn) {
          const duration = Math.floor((segment.end.getTime() - segment.start.getTime()) / 1000);
          currentStreak += duration;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
    }

    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      where: {
        userId: id,
        isPosted: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        lockedInSeconds: true,
        totalSessionSeconds: true,
        focusRate: true,
        title: true,
        aiSummary: true,
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
      user,
      stats: {
        totalLockedInSeconds,
        totalSessionSeconds,
        averageFocusRate,
        bestFocusRate,
        bestLockedInStreakSeconds: bestStreak,
      },
      recentSessions,
    });
  } catch (error) {
    throw error;
  }
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

/**
 * PUT /me/profile
 * Update user profile (firstName, lastName)
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    throw error;
  }
}

/**
 * POST /me/profile/picture
 * Upload profile picture
 */
export async function uploadProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Validate it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'File must be an image' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Get current user to check if they have an old profile picture
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePictureUrl: true },
    });

    // Update user with new profile picture URL
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePictureUrl: fileUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });

    // Delete old profile picture if it exists and is different
    if (currentUser?.profilePictureUrl && currentUser.profilePictureUrl !== fileUrl) {
      const oldFilePath = path.join(__dirname, '../../', currentUser.profilePictureUrl);
      try {
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (err) {
        console.warn('Failed to delete old profile picture:', err);
      }
    }

    res.json({ user: updatedUser });
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /me/profile/picture
 * Remove profile picture
 */
export async function deleteProfilePicture(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get current user to find the file path
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePictureUrl: true },
    });

    // Delete the file if it exists
    if (currentUser?.profilePictureUrl) {
      const filePath = path.join(__dirname, '../../', currentUser.profilePictureUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn('Failed to delete profile picture file:', err);
      }
    }

    // Update user to remove profile picture URL
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePictureUrl: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    throw error;
  }
}

