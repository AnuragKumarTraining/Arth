import { Request, Response, NextFunction } from 'express';
import { updateAccountInput } from '../validator/admin.validator';
import { adminService } from '../services/admin.service';
import { adminAuthService } from '../services/admin.auth.services';
import { env } from '../config/env';

class AdminController {
  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listUsers();
      res.status(200).json({ users: data });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: updateAccountInput = req.body;
      const result = await adminService.updateAccountStatus(input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { token, admin } = await adminAuthService.authenticateAdmin(email, password);

      res.cookie(env.adminCookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: env.expire_cookie,
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Admin authentication successful',
        admin,
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
        admin: req.admin,
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
      res.clearCookie(env.adminCookieName, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Admin logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();