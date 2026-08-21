import { z } from 'zod';

export const adminDashboard = z.object({
    userId: z.coerce.number({ message: 'Invalid User Id' }),
    kycStatus: z.enum(['pending', 'verified', 'rejected'], {
        message: 'invalid Kyc Status'
    }),
    isActive: z.boolean()
});

export type updateAccountInput = z.infer<typeof adminDashboard>;

export const verifyEditOtpValidator = z.object({
  otp: z.string().length(6, { message: 'OTP must be exactly 6 digits' }),
});

export const updateCustomerDetailsValidator = z.object({
  email: z.string().email({ message: 'Invalid email address' }).optional(),
  firstName: z.string().min(1, { message: 'First name is required' }).optional(),
  lastName: z.string().min(1, { message: 'Last name is required' }).optional(),
  phoneNumber: z.string().min(5, { message: 'Valid phone number is required' }).optional(),
  address: z.string().min(1, { message: 'Address is required' }).optional(),
  dateOfBirth: z.string().optional(),
});

export type VerifyEditOtpInput = z.infer<typeof verifyEditOtpValidator>;
export type UpdateCustomerDetailsInput = z.infer<typeof updateCustomerDetailsValidator>;