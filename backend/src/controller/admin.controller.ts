import { Request, Response, NextFunction } from 'express';
import { updateAccountInput } from '../validator/admin.validator';
import { adminService } from '../services/admin.service';
import { adminAuthService } from '../services/admin.auth.services';
import { env } from '../config/env';
import { customerAuthService } from '../services/customer.auth.services';
import { authService } from '../services/auth.service';
import { AppError } from '../error/AppError';

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

    getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawaccountId = req.params.id;

    if(typeof rawaccountId !== 'string'){
        res.status(400).json({
            success : false,
            message : "Invalid account ID",
        });
        return;
    }

    const accountId = parseInt(rawaccountId,10);

    if (isNaN(accountId)) {
      res.status(400).json({ success: false, message: 'Invalid account ID' });
      return;
    }

    const data = await adminService.getCustomerProfileAndAccount(accountId);
    
    res.status(200).json({
      success: true,
      customer: data.customer,
      account: data.account,
      transactions: data.transactions,
    });
  } catch (error) {
    next(error);
  }
    };
    getBeneficiaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
       const rawaccountId = req.params.id;

    if(typeof rawaccountId !== 'string'){
        res.status(400).json({
            success : false,
            message : "Invalid account ID",
        });
        return;
    }

    const accountId = parseInt(rawaccountId,10);
      if (isNaN(accountId)) throw new AppError(400, 'Invalid account ID');

      const data = await adminService.getAccountBeneficiaries(accountId);
      res.status(200).json({ success: true, beneficiaries: data });
    } catch (error) {
      next(error);
    }
  };

  transferToBeneficiary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawaccountId = req.params.id;
    if(typeof rawaccountId !== 'string'){
        res.status(400).json({
            success : false,
            message : "Invalid account ID",
        });
        return;
    }

    const accountId = parseInt(rawaccountId,10);
      
      const { beneficiaryId, amount, description } = req.body;

      if (isNaN(accountId)) throw new AppError(400, 'Invalid account ID');
      if (!beneficiaryId || !amount) throw new AppError(400, 'Beneficiary ID and amount are required');

      const result = await adminService.transferToBeneficiary(
        accountId, 
        beneficiaryId, 
        Number(amount), 
        description
      );

      res.status(200).json({ 
        success: true, 
        message: 'Transfer completed successfully', 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  };
  getAllTransactions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.getAllTransactions();
      res.status(200).json({
        success: true,
        transactions: data,
      });
    } catch (error) {
      next(error);
    }
  };

  // Add this method inside BankingController class
addBeneficiary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
     const rawaccountId = req.params.id;
    if(typeof rawaccountId !== 'string'){
        res.status(400).json({
            success : false,
            message : "Invalid account ID",
        });
        return;
    }

    const accountId = parseInt(rawaccountId,10);
    const { name, accountNumber, ifscCode, bankName } = req.body;

    if (isNaN(accountId)) throw new AppError(400, 'Invalid account ID');
    if (!name || !accountNumber || !ifscCode || !bankName) {
      throw new AppError(400, 'All beneficiary fields are required');
    }

    const beneficiary = await adminService.addBeneficiary(accountId, {
      name,
      accountNumber,
      ifscCode,
      bankName,
    });

    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    next(error);
  }
};
}

export const adminController = new AdminController();