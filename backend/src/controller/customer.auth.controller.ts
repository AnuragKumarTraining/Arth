import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { customerAuthService } from '../services/customer.auth.services';

export class CustomerAuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { token, customer } = await customerAuthService.authenticateCustomer(email, password);

      res.cookie(env.customerCookieName, token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: env.expire_cookie,
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
      res.clearCookie(env.customerCookieName, {
        httpOnly: true,
        secure: env.isProduction,
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