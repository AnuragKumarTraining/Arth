import React, { useState, useEffect, useMemo } from 'react';
import { env } from '../../config/env';
import type { TakeLoanModalProps } from '../../config/types/loanModal';

const API_BASE = env.adminBase;

export const TakeLoanModal = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
}: TakeLoanModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const [formData, setFormData] = useState({
    loanType: 'PERSONAL',
    principalAmount: '',
    interestRate: '',
    tenureMonths: '',
  });

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setFormData({
        loanType: 'PERSONAL',
        principalAmount: '',
        interestRate: '',
        tenureMonths: '',
      });
      setMessage({ text: '', isError: false });
    }
  }, [isOpen]);

  // Real-time EMI Calculation
  const estimatedEmi = useMemo(() => {
    const P = parseFloat(formData.principalAmount);
    const annualRate = parseFloat(formData.interestRate);
    const N = parseInt(formData.tenureMonths, 10);

    if (isNaN(P) || isNaN(annualRate) || isNaN(N) || P <= 0 || annualRate <= 0 || N <= 0) {
      return 0;
    }

    const R = annualRate / 12 / 100; // Monthly interest rate
    // EMI = P * R * (1+R)^N / ((1+R)^N - 1)
    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    
    return emi;
  }, [formData.principalAmount, formData.interestRate, formData.tenureMonths]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    
    setIsSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const res = await fetch(`${API_BASE}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          type: formData.loanType,
          principalAmount: parseFloat(formData.principalAmount),
          interestRate: parseFloat(formData.interestRate),
          tenureMonths: parseInt(formData.tenureMonths, 10),
          emiAmount: estimatedEmi,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create loan account');

      setMessage({ text: 'Loan account successfully created!', isError: false });
      onSuccess();
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Initiate Loan Account</h2>

        {message.text && (
          <div className={`p-3 mb-4 text-sm rounded border ${message.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loan Type</label>
            <select
              value={formData.loanType}
              onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PERSONAL">Personal Loan</option>
              <option value="HOME">Home Loan</option>
              <option value="AUTO">Auto Loan</option>
              <option value="EDUCATION">Education Loan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Principal Amount (₹)</label>
            <input
              type="number"
              required
              min="1000"
              step="100"
              value={formData.principalAmount}
              onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 500000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                required
                min="1"
                max="40"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 10.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tenure (Months)</label>
              <input
                type="number"
                required
                min="1"
                max="360"
                step="1"
                value={formData.tenureMonths}
                onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 60"
              />
            </div>
          </div>

          {/* EMI Preview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">
              Estimated Monthly EMI
            </span>
            <div className="text-2xl font-bold text-indigo-700">
              ₹{estimatedEmi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || estimatedEmi === 0}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};