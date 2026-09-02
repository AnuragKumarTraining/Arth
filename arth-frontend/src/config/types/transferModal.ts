export interface Beneficiary {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
}

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | undefined;
  onSuccess: () => void;
}
