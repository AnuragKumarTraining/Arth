import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { customerAuthService } from '../services/customer.auth.services';

export class CustomerAuthController {
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, customerId, identifier, password } = req.body;
      const loginIdentifier = email || customerId || identifier;
      const { token, customer } = await customerAuthService.authenticateCustomer(loginIdentifier, password);

      res.cookie(env.customerCookieName, token, {
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

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await customerAuthService.getCustomerProfileAndAccount(req.customer!.customerId);
      res.status(200).json({
        success: true,
        authenticated: true,
        customer: data.customer,
        account: data.account,
        transactions: data.transactions,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.cookie(env.customerCookieName, '', {
        httpOnly: true,
        sameSite: 'lax',
        expires: new Date(0),
        path: '/',
      });
      res.clearCookie(env.customerCookieName, {
        httpOnly: true,
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