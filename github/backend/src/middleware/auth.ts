import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

/**
 * Extended Express Request with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * Authentication middleware
 * Extracts Bearer token from Authorization header, verifies it, and attaches userId to req.user
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = verifyToken(token);
      req.user = { id: payload.userId };
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';
      res.status(401).json({ error: message });
      return;
    }
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
}

