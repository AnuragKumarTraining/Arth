import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/AppError';
import { env } from '../config/env';
import { CustomerSessionPayload } from '../types/customerSession';
import { customerAuthService } from '../services/customer.auth.services';

const CUSTOMER_COOKIE_NAME = 'customer_token';

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerSessionPayload;
    }
  }
}

export const requireCustomerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.[CUSTOMER_COOKIE_NAME];

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