import React, { useState, useEffect } from 'react';
import { env } from '../../config/env';
import type { CustomerProfile } from '../../config/types/customer-input';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  onCustomerUpdated?: (updated: Partial<CustomerProfile>) => void;
}

export const AccountSettingsModal = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: AccountSettingsModalProps) => {
  const customerId = customer.id || customer.customerId;

  const [email, setEmail] = useState(customer.email || '');
  const [firstName, setFirstName] = useState(customer.firstName || '');
  const [lastName, setLastName] = useState(customer.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(customer.phoneNumber || '');
  const [address, setAddress] = useState(customer.address || '');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Lock & OTP states
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Reset states on modal open
  useEffect(() => {
    if (isOpen && customer) {
      setEmail(customer.email || '');
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      setPhoneNumber(customer.phoneNumber || '');
      setAddress(customer.address || '');

      if (customer.dateOfBirth) {
        const d = new Date(customer.dateOfBirth);
        if (!isNaN(d.getTime())) {
          setDateOfBirth(d.toISOString().split('T')[0]);
        } else {
          setDateOfBirth(String(customer.dateOfBirth));
        }
      } else {
        setDateOfBirth('');
      }

      setIsUnlocked(false);
      setOtp('');
      setOtpSent(false);
      setFeedback(null);
    }
  }, [isOpen, customer]);

  // Resend cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  if (!isOpen) return null;

  // Step 1: Send OTP to customer's currently registered email
  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${customerId}/send-edit-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP to registered email');

      setOtpSent(true);
      setOtpCooldown(30);
      setFeedback({
        message: data.message || `Verification OTP sent to registered email (${customer.email})`,
        isError: false,
      });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error sending OTP', isError: true });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP on registered email to unlock fields
  const handleVerifyOtpToUnlock = async () => {
    if (!otp || otp.trim().length !== 6) {
      setFeedback({ message: 'Please enter the 6-digit OTP sent to registered email', isError: true });
      return;
    }

    setIsVerifyingOtp(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${customerId}/verify-edit-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: otp.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid or expired OTP');

      setIsUnlocked(true);
      setFeedback({
        message: '🔓 OTP Verified! Customer details form is now unlocked and editable.',
        isError: false,
      });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Verification failed', isError: true });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 3: Save updated customer details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUnlocked) {
      setFeedback({ message: 'Please verify OTP on registered email first to unlock editing.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${customerId}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          address: address.trim(),
          dateOfBirth: dateOfBirth || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update details');

      setFeedback({ message: 'Customer details updated successfully!', isError: false });

      if (onCustomerUpdated && data.customer) {
        onCustomerUpdated(data.customer);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to save changes', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              Account Settings
              {isUnlocked ? (
                <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded font-medium">Unlocked</span>
              ) : (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">Locked</span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Customer ID: #{customer.customerId} &bull; {customer.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveDetails} className="p-6 space-y-5 text-slate-700 text-sm">
          {/* Global Feedback Alert */}
          {feedback && (
            <div
              className={`p-3.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${feedback.isError
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
            >
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Locked Status Security Banner */}
          {!isUnlocked ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  Unlock Form via Registered Email OTP
                </span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isSendingOtp || otpCooldown > 0}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {isSendingOtp
                    ? 'Sending...'
                    : otpCooldown > 0
                      ? `Resend (${otpCooldown}s)`
                      : 'Send OTP'}
                </button>
              </div>

              <p className="text-xs text-amber-800">
                To edit any fields, dispatch a 6-digit OTP to the registered email address{' '}
                <strong className="text-amber-950 font-mono">{customer.email}</strong>.
              </p>

              {otpSent && (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-44 text-center text-base tracking-[0.3em] font-mono px-3 py-1.5 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    placeholder="------"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtpToUnlock}
                    disabled={isVerifyingOtp || otp.length !== 6}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Unlock Form'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <span>🔓 Edit access authorized via customer OTP. Modify fields below and click Save.</span>
            </div>
          )}

          {/* Form Fields (Disabled when locked) */}
          <div className={`space-y-4 transition-opacity ${!isUnlocked ? 'opacity-60 pointer-events-none select-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  disabled={!isUnlocked}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="First name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  disabled={!isUnlocked}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled={!isUnlocked}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="customer@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  disabled={!isUnlocked}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  disabled={!isUnlocked}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  disabled={!isUnlocked}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="Full address"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 -mx-6 -mb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isUnlocked || isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
