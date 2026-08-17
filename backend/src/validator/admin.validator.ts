import {z} from 'zod';

export const adminDashboard = z.object({
    userId : z.number('Invalid User Id'),
    kycStatus:z.enum(['pending', 'verified', 'rejected'],{
        message : 'invalid Kyc Status'
    }),
    isActive:z.boolean()

})
export type updateAccountInput = z.infer<typeof adminDashboard>;