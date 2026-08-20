export type TransactionEmailType ='DEPOSIT'|'WITHDRAWAL'|'TRANSFER';
export interface TransactionEmailPayload {
  to: string;
  firstName: string;
  transactionId: string;
  referenceNumber: string;
  type: TransactionEmailType;
  amount: string;
  currency: string;
  accountNumber: string;
  description?: string | null;
  balance: string;
  createdAt: Date;
}