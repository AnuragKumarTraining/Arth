export interface TakeLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number | undefined;
  onSuccess: () => void;
}
