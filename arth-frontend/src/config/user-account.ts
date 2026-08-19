export interface UserAccount {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  customerId: string;
  accountNumber: string;
  accountType: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | string;
  isActive: boolean;
}