export interface CustomerProfile {
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  isActive: boolean;
}

export interface AccountDetails {
  accountNumber: string;
  accountType: string;
  balance: number;
  branchCode: string;
  ifscCode: string;
}