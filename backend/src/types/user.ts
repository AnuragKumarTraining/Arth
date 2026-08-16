export type CreateAccountRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nationalId: string;
  address: string;
  accountType: 'savings' | 'current' | 'salary';
};

