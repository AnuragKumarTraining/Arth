export interface Transaction {
  id: string;
  description: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  status: 'COMPLETED' | 'PENDING';
}