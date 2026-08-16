import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { CreateAccountInput, ResendOtpInput, VerifyAccountInput } from '../validator/auth.validator';

class AuthController {
  // Phase 1: Initiate Signup
  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[DEBUG] Incoming req.body:', req.body);
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
        nationalId,
        address,
        accountType,
      }: CreateAccountInput = req.body || {};

      // Payload validation
      if (
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !dateOfBirth ||
        !phoneNumber ||
        !nationalId ||
        !address ||
        !accountType
      ) {
        res.status(400).json({ error: 'All KYC and authentication fields are required.' });
        return;
      }

      await authService.initiateSignup(req.body);

      // Uniform response prevents account enumeration
      res.status(200).json({
        message: 'If the provided email is eligible, a verification code has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  // Phase 2: Verify OTP & Migrate to Cu  stomer
  verifyAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('[DEBUG] Incoming req.body:', req.body);
      const { email, otp }: VerifyAccountInput = req.body || {};

      if (!email || !otp) {
        res.status(400).json({ error: 'Email and OTP are required fields.' });
        return;
      }

      await authService.verifyAccount({ email, otp });

      res.status(200).json({
        message: 'Account verified successfully. Pending admin activation.',
      });
    } catch (error) {
      next(error);
    }
  };

  // Phase 3: Resend OTP (Cooldown Throttled)
  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[DEBUG] Incoming req.body:', req.body);
    try {
      const { email }: ResendOtpInput = req.body || {};

      if (!email) {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      await authService.resendOtp({email});

      res.status(200).json({
        message: 'If the provided email has a pending registration, a new verification code has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();