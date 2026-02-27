import { NextFunction, Request, Response } from 'express';
import { TokenPayload, verifyAccessToken } from '../utils/jwt';

export type AuthRequest = Request & {
  user?: TokenPayload;
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ message: 'Access token is required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
};
