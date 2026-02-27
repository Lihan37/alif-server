import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../utils/jwt';

export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role' });
      return;
    }

    next();
  };
