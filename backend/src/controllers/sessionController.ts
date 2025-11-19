import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { NonLockReason } from '@prisma/client';

const activitySegmentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  domain: z.string().nullable(),
  productive: z.boolean(),
  lockedIn: z.boolean(),
  reason: z.enum(['unproductive_domain', 'neutral_domain', 'idle_beyond_2m', 'failed_check', 'other']).nullable().optional(),
});

const activityRequestSchema = z.object({
  sessionId: z.string(),
  segments: z.array(activitySegmentSchema),
});

const endSessionRequestSchema = z.object({
  sessionId: z.string(),
  sessionStartTimestamp: z.string().datetime(),
  sessionEndTimestamp: z.string().datetime(),
  totalSessionSeconds: z.number().int().min(0),
  lockedInSeconds: z.number().int().min(0),
  nonLockSeconds: z.number().int().min(0),
  focusRate: z.number().min(0).max(1),
  idleBeyond2minSeconds: z.number().int().min(0),
  tabSwitchCount: z.number().int().min(0),
  lockBreakCount: z.number().int().min(0),
  segments: z.array(activitySegmentSchema),
  fileIds: z.array(z.string()).optional(), // Array of file IDs uploaded separately
});

/**
 * POST /sessions/start
 * Create a new session for the authenticated user
 */
export async function startSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await prisma.session.create({
      data: {
        userId: req.user.id,
        startedAt: new Date(),
        // All metrics default to 0
        isPosted: true,
      },
    });

    res.json({
      sessionId: session.id,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /sessions/activity
 * Accept activity segments and update session metrics incrementally
 */
export async function uploadActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sessionId, segments } = activityRequestSchema.parse(req.body);

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id,
        endedAt: null, // Session must still be active
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found or already ended' });
      return;
    }

    // Validate and prepare segments
    const segmentData = segments.map(seg => {
      const start = new Date(seg.start);
      const end = seg.end ? new Date(seg.end) : new Date();

      if (start >= end) {
        throw new Error('Segment start must be before end');
      }

      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      return {
        sessionId,
        start,
        end,
        domain: seg.domain,
        productive: seg.productive,
        lockedIn: seg.lockedIn,
        reason: seg.reason as NonLockReason | null,
        duration, // For metric calculation
      };
    });

    // Calculate metric updates
    let lockedInDelta = 0;
    let nonLockDelta = 0;
    let idleDelta = 0;

    for (const seg of segmentData) {
      if (seg.lockedIn) {
        lockedInDelta += seg.duration;
      } else {
        nonLockDelta += seg.duration;
        
        if (seg.reason === 'idle_beyond_2m') {
          idleDelta += seg.duration;
        }
      }
    }

    // Insert segments and update metrics in a transaction
    await prisma.$transaction(async (tx) => {
      // Insert segments
      for (const seg of segmentData) {
        await tx.activitySegment.create({
          data: {
            sessionId: seg.sessionId,
            start: seg.start,
            end: seg.end,
            domain: seg.domain,
            productive: seg.productive,
            lockedIn: seg.lockedIn,
            reason: seg.reason,
          },
        });
      }

      // Update session metrics
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          lockedInSeconds: { increment: lockedInDelta },
          nonLockSeconds: { increment: nonLockDelta },
          idleBeyond2minSeconds: { increment: idleDelta },
          totalSessionSeconds: { increment: lockedInDelta + nonLockDelta },
        },
      });

      // Recalculate focus rate
      if (updatedSession.totalSessionSeconds > 0) {
        const focusRate = updatedSession.lockedInSeconds / updatedSession.totalSessionSeconds;
        await tx.session.update({
          where: { id: sessionId },
          data: { focusRate },
        });
      }
    });

    res.json({ status: 'ok' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    throw error;
  }
}

/**
 * POST /sessions/end
 * Finalize a session with final metrics
 */
export async function endSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = endSessionRequestSchema.parse(req.body);

    // Verify session belongs to user and is not already ended
    const session = await prisma.session.findFirst({
      where: {
        id: data.sessionId,
        userId: req.user.id,
        endedAt: null,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found or already ended' });
      return;
    }

    // Insert any remaining segments
    if (data.segments.length > 0) {
      await prisma.activitySegment.createMany({
        data: data.segments.map(seg => ({
          sessionId: data.sessionId,
          start: new Date(seg.start),
          end: seg.end ? new Date(seg.end) : new Date(),
          domain: seg.domain,
          productive: seg.productive,
          lockedIn: seg.lockedIn,
          reason: seg.reason as NonLockReason | null,
        })),
      });
    }

    // Calculate focus rate (use provided value or recalculate)
    const focusRate = data.totalSessionSeconds > 0
      ? data.lockedInSeconds / data.totalSessionSeconds
      : 0;

    // Update session with final metrics and mark as posted for feed visibility
    const updatedSession = await prisma.session.update({
      where: { id: data.sessionId },
      data: {
        endedAt: new Date(data.sessionEndTimestamp),
        totalSessionSeconds: data.totalSessionSeconds,
        lockedInSeconds: data.lockedInSeconds,
        nonLockSeconds: data.nonLockSeconds,
        idleBeyond2minSeconds: data.idleBeyond2minSeconds,
        tabSwitchCount: data.tabSwitchCount,
        lockBreakCount: data.lockBreakCount,
        focusRate,
        isPosted: true, // Mark as posted so it appears in feed
      },
    });

    // Link uploaded files to session if provided
    if (data.fileIds && data.fileIds.length > 0) {
      // Update files that have null sessionId (temporary uploads)
      await prisma.sessionFile.updateMany({
        where: {
          id: { in: data.fileIds },
          sessionId: null, // Only update files that aren't already linked
        },
        data: {
          sessionId: data.sessionId,
        },
      });
    }

    res.json({
      sessionId: updatedSession.id,
      focusRate: updatedSession.focusRate,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    throw error;
  }
}

/**
 * PATCH /sessions/:id
 * Update session metadata (title, description, visibility)
 */
export async function updateSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Validate and prepare update data
    const allowedFields: Record<string, any> = {};
    
    if (updateData.title !== undefined) {
      allowedFields.title = updateData.title === '' ? null : updateData.title;
    }
    
    if (updateData.description !== undefined) {
      allowedFields.description = updateData.description === '' ? null : updateData.description;
    }
    
    if (updateData.isPosted !== undefined) {
      allowedFields.isPosted = Boolean(updateData.isPosted);
    }

    // Update session
    const updatedSession = await prisma.session.update({
      where: { id },
      data: allowedFields,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        activitySegments: {
          orderBy: { start: 'asc' },
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

    res.json(updatedSession);
  } catch (error) {
    throw error;
  }
}

