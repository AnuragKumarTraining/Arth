import { Router } from 'express';
import { customerAuthController } from '../controller/customer.auth.controller';
import { requireCustomerAuth } from '../middleware/customer.middleware';

export const loginRouter = Router();

loginRouter.post('/login', customerAuthController.login);
loginRouter.get('/me', requireCustomerAuth, customerAuthController.getMe);
loginRouter.post('/logout', requireCustomerAuth, customerAuthController.logout);
