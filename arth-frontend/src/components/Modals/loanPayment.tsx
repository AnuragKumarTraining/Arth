import { useState } from 'react';
import { env } from '../../config/env';
import type { LoanPaymentModalProps } from '../../config/types/loanPayment';

const API_BASE = env.adminBase;

export const LoanPaymentModal = ({ config, onClose, accountId, onSuccess }: LoanPaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  if (!config.isOpen) return null;

  const handlePayment = async () => {
    if (!accountId) return;
    setIsProcessing(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch(`${API_BASE}/accounts/${accountId}/loans/${config.loanId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentType: config.type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment failed');

      setMessage({ text: 'Payment successful!', isError: false });
      onSuccess();
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Confirm Loan Payment</h2>

        {message.text && (
          <div className={`p-3 mb-4 text-sm rounded border ${message.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6 text-center space-y-1">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">
            {config.type === 'EMI' ? 'Monthly EMI Deduction' : 'Full Settlement Deduction'}
          </p>
          <div className="text-3xl font-bold text-indigo-700">
            ₹{config.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-sm text-slate-600 mt-2">
            For Loan Account: <span className="font-mono font-semibold">{config.loanNumber}</span>
          </p>
          <p className="text-xs text-rose-600 mt-2">
            This amount will be debited directly from the active primary account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};