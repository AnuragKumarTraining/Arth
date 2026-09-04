import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/AppError';
import { env } from '../config/env';
import { CustomerSessionPayload } from '../types/customerSession';
import { customerAuthService } from '../services/customer.auth.services';

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerSessionPayload;
    }
  }
}

export const requireCustomerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = req.cookies?.[env.adminCookieName] || bearerToken;

    if (!token) {
      throw new AppError(401, 'Authentication required. No active customer session.');
    }

    const decoded = customerAuthService.verifyToken(token);
    req.customer = decoded;
    next();
  } catch (error) {
    next(error);
  }
};