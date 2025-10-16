import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract and validate x-user-id header
 * All endpoints require this header for user scoping
 */
export function extractUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    res.status(401).json({ error: 'Missing or invalid x-user-id header' });
    return;
  }

  // Attach userId to request object for downstream use
  req.userId = userId.trim();
  next();
}

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
