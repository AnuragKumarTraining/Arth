import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { customerAuthService } from '../services/customer.auth.services';

export class CustomerAuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, customerId, identifier, password } = req.body;
      const loginIdentifier = email || customerId || identifier;
      const { token, customer } = await customerAuthService.authenticateCustomer(loginIdentifier, password);

      res.cookie(env.adminCookieName, token, {
        httpOnly: true,
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

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.cookie(env.adminCookieName, '', {
        httpOnly: true,
        sameSite: 'lax',
        expires: new Date(0),
        path: '/',
      });
      res.clearCookie(env.adminCookieName,{
        httpOnly:true,
        sameSite:'lax',
        path:"/"
      })
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