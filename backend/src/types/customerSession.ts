export interface CustomerSessionPayload {
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer';
  kycStatus: string;
  isActive: boolean;
}