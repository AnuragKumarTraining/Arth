import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { validate } from '../middleware/validate';
import { adminDashboard, verifyEditOtpValidator, updateCustomerDetailsValidator } from '../validator/admin.validator';
import { requireAdminAuth } from '../middleware/admin.auth';
import { customerAuthController } from '../controller/customer.auth.controller';

export const adminRouter = Router();

adminRouter.post('/login', adminController.login);
adminRouter.get('/me', requireAdminAuth, adminController.getMe);
adminRouter.get('/users', requireAdminAuth, adminController.getUsers);
adminRouter.patch('/users/status', requireAdminAuth, validate(adminDashboard), adminController.updateStatus);
adminRouter.post('/customers/:id/send-edit-otp', requireAdminAuth, adminController.sendCustomerEditOtp);
adminRouter.post('/customers/:id/verify-edit-otp', requireAdminAuth, validate(verifyEditOtpValidator), adminController.verifyCustomerEditOtp);
adminRouter.patch('/customers/:id/details', requireAdminAuth, validate(updateCustomerDetailsValidator), adminController.updateCustomerDetails);
adminRouter.post('/logout', requireAdminAuth, adminController.logout);
// adminRouter.get('/me', requireAdminAuth, customerAuthController.getMe);

adminRouter.get('/accounts/:id', requireAdminAuth, adminController.getAccountById);
adminRouter.get('/accounts/:id/beneficiaries', requireAdminAuth, adminController.getBeneficiaries);
adminRouter.post('/accounts/:id/transfer', requireAdminAuth, adminController.transferToBeneficiary);
adminRouter.get('/transactions', requireAdminAuth, adminController.getAllTransactions);
adminRouter.post('/accounts/:id/beneficiaries', requireAdminAuth, adminController.addBeneficiary);
adminRouter.post('/accounts/:id/deposit', requireAdminAuth, adminController.createDeposit);
adminRouter.post('/accounts/:id/withdraw', requireAdminAuth, adminController.createWithdraw);
adminRouter.get('/accounts/:id/statement', requireAdminAuth, adminController.downloadStatement);
adminRouter.get('/accounts/:id/statement/preview', requireAdminAuth, adminController.getStatementPreview);