
import { Router } from "express";
import { authController } from "../controller/auth.controller";
import { validate } from "../middleware/validate";
import { createAccountSchema, resendOtpSchema, verifyAccountSchema } from "../validator/auth.validator";
import { customerAuthController } from '../controller/customer.auth.controller';
import { requireCustomerAuth } from '../middleware/customer.middleware';

export const authRouter = Router();

authRouter.post('/createAccount',validate(createAccountSchema),authController.createAccount)
authRouter.post('/verify-account',validate(verifyAccountSchema),authController.verifyAccount)
authRouter.post("/resendOtp",validate(resendOtpSchema),authController.resendOtp)

authRouter.post('/login', customerAuthController.login);
authRouter.get('/me', requireCustomerAuth, customerAuthController.getMe);
authRouter.post('/logout', requireCustomerAuth, customerAuthController.logout);
