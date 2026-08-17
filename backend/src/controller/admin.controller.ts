import { Request, Response, NextFunction } from 'express';
import { updateAccountInput } from '../validator/admin.validator';
import { adminService } from '../services/admin.service';
import { adminAuthService } from '../services/admin.auth.services';

const COOKIE_NAME = 'admin_token';
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

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

      // Pass token as 2nd argument, options as 3rd argument
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: EIGHT_HOURS_MS,
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
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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