export type CustomerAccount  = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  customerId: string | null;
  accountNumber: string | null;
  accountType: string | null;
}
