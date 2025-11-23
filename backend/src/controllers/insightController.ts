import { Request, Response } from 'express';
import { InsightEngine } from '../services/insightEngine.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// --- Session Insights ---

export const generateSessionInsight = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.params.id;
    const { forceRegenerate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if exists first
    if (!forceRegenerate) {
      const existing = await InsightEngine.getSessionInsight(userId, sessionId);
      if (existing) {
        return res.json(existing);
      }
    }

    const insight = await InsightEngine.generateSessionInsight(userId, sessionId);
    res.json(insight);
  } catch (error: any) {
    console.error('Error generating session insight:', error);
    if (error.message === 'Session not found') {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (error.message === 'Unauthorized access to session') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessionInsight = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insight = await InsightEngine.getSessionInsight(userId, sessionId);
    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json(insight);
  } catch (error) {
    console.error('Error fetching session insight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Home / Weekly Analytics ---

export const getHomeAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const force = req.query.force === 'true';

    if (!force) {
      // Check for cached insight for *today* (InsightEngine handles same-day logic)
      const existing = await InsightEngine.getHomeAnalytics(userId);
      if (existing) {
        return res.json(existing);
      }
    }

    // Generate a new daily/home analytics insight for the user
    const analytics = await InsightEngine.generateHomeAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Error generating home analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
