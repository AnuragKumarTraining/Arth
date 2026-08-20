export interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  onSuccess: () => void;
}

export interface WithdrawFormData {
  amount: string;
  description: string;
}
