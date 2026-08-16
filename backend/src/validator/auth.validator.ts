import { z } from 'zod';

export const createAccountSchema = z.object({
  email: z.email('Invalid email address').trim().toLowerCase(),

  password: z.string().min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  firstName: z.string().trim().min(1, 'First name cannot be empty').max(50, 'First name too long'),

  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50, 'Last name too long'),

  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format for date of birth',
    }),

  phoneNumber: z
    .string('Phone is Required')
    .trim()
    .regex(/^[1-9][0-9]{9}$/, 'Phone number must be of 10 digits'),

  nationalId: z
    .string('National ID / PAN is required' )
    .trim()
    .toUpperCase()
    .min(5, 'Invalid National ID length')
    .max(20, 'Invalid National ID length'),

  address: z
    .string( 'Address is required' )
    .trim(),

  accountType: z.enum(['savings', 'checking', 'salary'], 
    { message: 'Account type must be savings, checking, or salary' }),
})

export const verifyAccountSchema = z.object({
  email: z
    .email('Invalid email address')
    .trim()
    .toLowerCase(),

  otp: z
    .string('OTP is required' )
    .trim()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'OTP must contain numbers only'),
});

export const resendOtpSchema = z.object({
  email: z
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type VerifyAccountInput = z.infer<typeof verifyAccountSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;