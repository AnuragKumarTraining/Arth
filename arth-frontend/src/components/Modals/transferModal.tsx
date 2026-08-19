import React, { useState, useEffect } from 'react';
import { env } from '../../config/env'; // Adjust path if needed

const API_BASE = env.adminBase;

interface Beneficiary {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | undefined;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ 
  isOpen, 
  onClose, 
  accountId, 
  onSuccess 
}) => {
  const [view, setView] = useState<'TRANSFER' | 'ADD_BENEFICIARY'>('TRANSFER');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  
  // Transfer State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({ beneficiaryId: '', amount: '', description: '' });
  
  // Add Beneficiary State
  const [isAdding, setIsAdding] = useState(false);
  const [newBenData, setNewBenData] = useState({ name: '', accountNumber: '', ifscCode: '', bankName: '' });
  
  // Shared Messaging
  const [message, setMessage] = useState({ text: '', isError: false });

  // Fetch beneficiaries when modal opens
  const fetchBeneficiaries = async () => {
    if (!accountId) return;
    try {
      const res = await fetch(`${API_BASE}/accounts/${accountId}/beneficiaries`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      console.error('Failed to fetch beneficiaries');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setView('TRANSFER');
      setTransferData({ beneficiaryId: '', amount: '', description: '' });
      setNewBenData({ name: '', accountNumber: '', ifscCode: '', bankName: '' });
      setMessage({ text: '', isError: false });
      fetchBeneficiaries();
    }
  }, [isOpen, accountId]);

  if (!isOpen) return null;

  const handleTransferSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsTransferring(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch(`${API_BASE}/accounts/${accountId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          beneficiaryId: transferData.beneficiaryId,
          amount: parseFloat(transferData.amount),
          description: transferData.description
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      setMessage({ text: 'Transfer successful!', isError: false });
      onSuccess(); 
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAddBeneficiary = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsAdding(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch(`${API_BASE}/accounts/${accountId}/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newBenData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add beneficiary');

      setMessage({ text: 'Beneficiary added successfully!', isError: false });
      await fetchBeneficiaries(); // Refresh list
      
      // Auto-select the new beneficiary and switch back to transfer view
      setTransferData((prev) => ({ ...prev, beneficiaryId: data.beneficiary.id }));
      setTimeout(() => {
        setView('TRANSFER');
        setMessage({ text: '', isError: false });
      }, 1000);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        
        {/* Header with Back Button if in Add View */}
        <div className="flex items-center mb-4">
          {view === 'ADD_BENEFICIARY' && (
            <button 
              onClick={() => { setView('TRANSFER'); setMessage({ text: '', isError: false }); }}
              className="mr-3 text-slate-400 hover:text-slate-700 transition-colors"
            >
              &larr; Back
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-900">
            {view === 'TRANSFER' ? 'Transfer Money' : 'Add New Beneficiary'}
          </h2>
        </div>
        
        {message.text && (
          <div className={`p-3 mb-4 text-sm rounded border ${message.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.text}
          </div>
        )}

        {/* --- TRANSFER VIEW --- */}
        {view === 'TRANSFER' && (
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Beneficiary</label>
                <button
                  type="button"
                  onClick={() => { setView('ADD_BENEFICIARY'); setMessage({ text: '', isError: false }); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Add New
                </button>
              </div>
              <select
                required
                value={transferData.beneficiaryId}
                onChange={(e) => setTransferData({ ...transferData, beneficiaryId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a beneficiary...</option>
                {beneficiaries.map((ben) => (
                  <option key={ben.id} value={ben.id}>
                    {ben.name} - {ben.bankName} (..{ben.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={transferData.amount}
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={transferData.description}
                onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment for..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTransferring || !transferData.beneficiaryId}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isTransferring ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        )}

        {/* --- ADD BENEFICIARY VIEW --- */}
        {view === 'ADD_BENEFICIARY' && (
          <form onSubmit={handleAddBeneficiary} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                required
                value={newBenData.name}
                onChange={(e) => setNewBenData({ ...newBenData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                required
                value={newBenData.accountNumber}
                onChange={(e) => setNewBenData({ ...newBenData, accountNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={newBenData.ifscCode}
                  onChange={(e) => setNewBenData({ ...newBenData, ifscCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. HDFC0001234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={newBenData.bankName}
                  onChange={(e) => setNewBenData({ ...newBenData, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={isAdding}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Saving...' : 'Save Beneficiary'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};