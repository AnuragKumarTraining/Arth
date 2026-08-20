import { useState } from 'react';
import { env } from '../../config/env';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  onSuccess: () => void;
}

interface DepositFormData {
  amount: string;
  description: string;
}

export function DepositModal({
  isOpen,
  onClose,
  accountId,
  onSuccess,
}: DepositModalProps) {
  const [depositData, setDepositData] = useState<DepositFormData>({
    amount: '',
    description: '',
  });

  const [isDepositing, setIsDepositing] = useState(false);
  const [message, setMessage] = useState({
    text: '',
    isError: false,
  });

  if (!isOpen) {
    return null;
  }

  const handleDepositSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!accountId) {
      setMessage({
        text: 'Invalid account ID',
        isError: true,
      });
      return;
    }

    const amount = Number(depositData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({
        text: 'Please enter a valid deposit amount',
        isError: true,
      });
      return;
    }

    if (!depositData.description.trim()) {
      setMessage({
        text: 'Please enter a description',
        isError: true,
      });
      return;
    }

    setIsDepositing(true);
    setMessage({
      text: '',
      isError: false,
    });

    try {
      const res = await fetch(
        `${env.adminBase}/accounts/${accountId}/deposit`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            description: depositData.description.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to process deposit');
      }

      setMessage({
        text: 'Deposit completed successfully',
        isError: false,
      });

      setDepositData({
        amount: '',
        description: '',
      });

      onSuccess();

      setTimeout(() => {
        onClose();
        setMessage({
          text: '',
          isError: false,
        });
      }, 700);
    } catch (err) {
      setMessage({
        text:
          err instanceof Error
            ? err.message
            : 'Failed to process deposit',
        isError: true,
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleClose = () => {
    if (isDepositing) return;

    setDepositData({
      amount: '',
      description: '',
    });

    setMessage({
      text: '',
      isError: false,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Deposit Money
          </h2>
        </div>

        {/* Feedback Message */}
        {message.text && (
          <div
            className={`p-3 mb-4 text-sm rounded border ${
              message.isError
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Deposit Form */}
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (₹)
            </label>

            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={depositData.amount}
              onChange={(e) =>
                setDepositData({
                  ...depositData,
                  amount: e.target.value,
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              disabled={isDepositing}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>

            <input
              type="text"
              required
              value={depositData.description}
              onChange={(e) =>
                setDepositData({
                  ...depositData,
                  description: e.target.value,
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cash deposit..."
              disabled={isDepositing}
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Transaction Type
            </label>

            <input
              type="text"
              value="Deposit"
              disabled
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDepositing}
              className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isDepositing ||
                !depositData.amount ||
                !depositData.description.trim()
              }
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isDepositing ? 'Processing...' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}