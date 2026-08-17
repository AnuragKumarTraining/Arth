import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { customerAuthService } from '../services/customer.auth.services';

const COOKIE_NAME = 'customer_token';
const DEFAULT_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours in ms

export class CustomerAuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { token, customer } = await customerAuthService.authenticateCustomer(email, password);

      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: Number(env.expire_cookie) || DEFAULT_MAX_AGE,
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Customer login successful',
        customer,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        authenticated: true,
        customer: req.customer,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Customer logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const customerAuthController = new CustomerAuthController();