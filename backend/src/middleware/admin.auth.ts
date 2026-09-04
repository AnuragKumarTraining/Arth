import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/AppError';
import { env } from '../config/env';
import { AdminSessionPayload } from '../types/adminSessionPayload';
import { adminAuthService } from '../services/admin.auth.services';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminSessionPayload;
    }
  }
}

export const requireAdminAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = req.cookies?.[env.adminCookieName] || bearerToken;

    if (!token) {
      throw new AppError(401, 'No active administrative session found');
    }

    const decoded = adminAuthService.verifyToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    next(error);
  }
};