export interface CustomerProfile {
  id?: number;
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date;
  nationalId?: string;
  address?: string;
  kycStatus: string;
  isActive: boolean;
}

export interface AccountDetails {
  accountNumber: string;
  accountType: string;
  balance: number;
  branchCode: string;
  ifscCode: string;
  isActive?: boolean;
}