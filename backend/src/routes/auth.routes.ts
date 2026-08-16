
import { Router } from "express";
import { authController } from "../controller/auth.controller";
import { validate } from "../middleware/validate";
import { createAccountSchema, resendOtpSchema, verifyAccountSchema } from "../validator/auth.validator";

export const authRouter = Router();

authRouter.post('/createAccount',validate(createAccountSchema),authController.createAccount)
authRouter.post('/verify-account',validate(verifyAccountSchema),authController.verifyAccount)
authRouter.post("/resendOtp",validate(resendOtpSchema),authController.resendOtp)