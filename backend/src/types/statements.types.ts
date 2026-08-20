export interface GenerateStatementParams {
  customerId: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  format: 'pdf';
}

export interface GetStatementDataParams {
  customerId: string;
  from: string;
  to: string;
}

export interface StatementAccount {
  accountNumber: string;
  accountType: string;
  currency: string;
  firstName: string;
  lastName: string;
}
export interface StatementTransaction {
  id: string;
  referenceNumber: string;
  createdAt: Date;
  description: string;
  type: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementData {
  account: {
    accountNumber: string;
    accountType: string;
    currency: string;
    firstName: string;
    lastName: string;
  };
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
}