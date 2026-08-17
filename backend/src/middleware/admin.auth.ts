import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/AppError';
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
    const token = req.cookies?.admin_token;

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