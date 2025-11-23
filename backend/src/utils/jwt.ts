import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export interface JWTPayload {
  userId: string;
}

/**
 * Generate a JWT token for a user
 * @param userId - User ID to encode in token
 * @returns JWT token string
 */
export function generateToken(userId: string): string {
  const payload: JWTPayload = { userId };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, {
    expiresIn: '30d', // Tokens expire after 30 days
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload with userId
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret);
    
    // Ensure decoded is an object and has userId
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as JWTPayload;
    }
    
    throw new Error('Invalid token payload');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
}
