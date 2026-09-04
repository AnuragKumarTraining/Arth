import { Request, Response, NextFunction } from 'express';
import { updateAccountInput } from '../validator/admin.validator';
import { adminService } from '../services/admin.service';
import { adminAuthService } from '../services/admin.auth.services';
import { env } from '../config/env';
import { AppError } from '../error/AppError';
import { emailService } from '../services/email.services';

class AdminController {
  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listUsers({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        kycStatus: typeof req.query.kycStatus === 'string' ? req.query.kycStatus : undefined,
      });
      res.status(200).json(data);
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
        secure: env.isProduction,
        sameSite: env.isProduction ? 'none' : 'lax',
        maxAge: env.expire_cookie,
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Admin authentication successful',
        admin,
        token,
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
        secure: env.isProduction,
        sameSite: env.isProduction ? 'none' : 'lax',
        expires: new Date(0),
        path: '/',
      });
      res.clearCookie(env.adminCookieName, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.isProduction ? 'none' : 'lax',
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
      loans: data.loans,
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
  getAllTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.getAllTransactions({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
        toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
      });
      res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  };

  sendCustomerEditOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = parseInt(String(req.params.id), 10);
      if (isNaN(customerId)) throw new AppError(400, 'Invalid customer ID');

      const result = await adminService.sendCustomerEditOtp(customerId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  verifyCustomerEditOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = parseInt(String(req.params.id), 10);
      if (isNaN(customerId)) throw new AppError(400, 'Invalid customer ID');

      const { otp } = req.body;
      if (!otp) throw new AppError(400, 'OTP is required');

      const result = await adminService.verifyCustomerEditOtp(customerId, otp);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateCustomerDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = parseInt(String(req.params.id), 10);
      if (isNaN(customerId)) throw new AppError(400, 'Invalid customer ID');

      const updatedCustomer = await adminService.updateCustomerDetails(customerId, req.body);
      res.status(200).json({
        success: true,
        message: 'Customer details updated successfully.',
        customer: updatedCustomer,
      });
    } catch (error) {
      next(error);
    }
  };

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

createDeposit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawAccountId = req.params.id;

    if (typeof rawAccountId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
      return;
    }

    const accountId = Number.parseInt(rawAccountId, 10);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
      return;
    }

    const { amount, description } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
      return;
    }

    const result = await adminService.createDeposit({
      accountId,
      amount,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Deposit completed successfully',
      transaction: result.transaction,
      account: result.account,
    });
  } catch (error) {
    next(error);
  }
};
createWithdraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawAccountId = req.params.id;

    if (typeof rawAccountId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
      return;
    }

    const accountId = Number.parseInt(rawAccountId, 10);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
      return;
    }

    const { amount, description } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
      return;
    }

    if (
      description !== undefined &&
      typeof description !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Description must be a string',
      });
      return;
    }

    const result = await adminService.createWithdraw({
      accountId,
      amount,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal completed successfully',
      transaction: result.transaction,
      account: result.account,
    });
  } catch (error) {
    next(error);
  }
};

downloadStatement = async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id || req.params.customerId;

    if (typeof customerId !== 'string' || !/^\d+$/.test(customerId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid account/customer ID',
      });
      return;
    }

    const { from, to, format = 'pdf' } = req.query;

    if (typeof from !== 'string' || typeof to !== 'string') {
      res.status(400).json({
        success: false,
        message: 'From and to dates are required',
      });
      return;
    }

    if (format !== 'pdf') {
      res.status(400).json({
        success: false,
        message: 'Only PDF format is currently supported',
      });
      return;
    }

    const statement = await adminService.generateStatement({
      customerId,
      from,
      to,
      format: 'pdf',
    });

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="statement-${customerId}-${from}-to-${to}.pdf"`,
    );

    res.send(statement);
  } catch (error) {
    console.error('Statement download error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to generate statement',
    });
  }
};

getStatementPreview = async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id || req.params.customerId;

    if (
      typeof customerId !== 'string' ||
      !/^\d+$/.test(customerId)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      });
      return;
    }

    const { from, to } = req.query;

    if (
      typeof from !== 'string' ||
      typeof to !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'From and to dates are required',
      });
      return;
    }

    const statement = await adminService.getStatementData({
      customerId,
      from,
      to,
    });

    res.status(200).json({
      success: true,
      statement,
    });
  } catch (error) {
    console.error('Statement preview error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load statement';

    res.status(400).json({
      success: false,
      message,
    });
  }
}
  createLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId, type, principalAmount, interestRate, tenureMonths } = req.body;

      if (!customerId || !type || !principalAmount || !interestRate || !tenureMonths) {
        throw new AppError(400, 'Missing required loan parameters');
      }

      // Ensure the type matches the allowed Enums in the database
      const validTypes = ['PERSONAL', 'HOME', 'AUTO', 'EDUCATION'];
      if (!validTypes.includes(type)) {
        throw new AppError(400, `Invalid loan type. Must be one of: ${validTypes.join(', ')}`);
      }

      const loan = await adminService.createLoanAccount({
        customerId: Number(customerId),
        type,
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate),
        tenureMonths: Number(tenureMonths),
      });

      res.status(201).json({
        success: true,
        message: 'Loan account successfully created and disbursed',
        loan,
      });
    } catch (error) {
      next(error);
    }
  };
processLoanPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id as string, 10);
      const loanId = req.params.loanId as string;
      const { paymentType } = req.body; // 'EMI' or 'FULL'

      if (isNaN(accountId)) throw new AppError(400, 'Invalid account ID');
      if (!loanId) throw new AppError(400, 'Loan ID is required');
      if (paymentType !== 'EMI' && paymentType !== 'FULL') {
        throw new AppError(400, 'Invalid payment type. Must be EMI or FULL');
      }

      const result = await adminService.processLoanRepayment(accountId, loanId, paymentType);

      res.status(200).json({
        success: true,
        message: 'Loan payment processed successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();