import { Router } from 'express';
import { adminController } from '../controller/admin.controller';
import { validate } from '../middleware/validate';
import { adminDashboard } from '../validator/admin.validator';
import { requireAdminAuth } from '../middleware/admin.auth';

export const adminRouter = Router();

adminRouter.post('/login', adminController.login);
adminRouter.get('/me', requireAdminAuth, adminController.getMe);
adminRouter.get('/users', requireAdminAuth, adminController.getUsers);
adminRouter.patch('/users/status', requireAdminAuth, validate(adminDashboard), adminController.updateStatus);
adminRouter.post('/logout', requireAdminAuth, adminController.logout);

