export interface LoanPaymentConfig {
  isOpen: boolean;
  loanId: string;
  loanNumber: string;
  type: 'EMI' | 'FULL';
  amount: number;
}

export interface LoanPaymentModalProps {
  config: LoanPaymentConfig;
  onClose: () => void;
  accountId: string | undefined;
  onSuccess: () => void;
}
