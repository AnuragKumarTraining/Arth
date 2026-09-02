export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  onSuccess: () => void;
}

export interface DepositFormData {
  amount: string;
  description: string;
}
