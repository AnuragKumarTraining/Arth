import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from '../components/navbar';
import { env } from '../config/env';

interface CustomerRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string | Date;
  nationalId?: string;
  address?: string;
  kycStatus: string;
  isActive: boolean;
  customerId?: number | null;
  accountNumber?: string | null;
  accountType?: string | null;
}

export default function AccountSettings() {
  const { id: paramId } = useParams<{ id?: string }>();
  const [customersList, setCustomersList] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Form edit states
  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');

  // Lock & OTP states
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState<boolean>(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const handleSelectCustomer = useCallback((cust: CustomerRecord) => {
    setSelectedCustomerId(cust.id);
    setEmail(cust.email || '');
    setFirstName(cust.firstName || '');
    setLastName(cust.lastName || '');
    setPhoneNumber(cust.phoneNumber || '');
    setAddress(cust.address || '');
    
    if (cust.dateOfBirth) {
      const d = new Date(cust.dateOfBirth);
      if (!isNaN(d.getTime())) {
        setDateOfBirth(d.toISOString().split('T')[0]);
      } else {
        setDateOfBirth(String(cust.dateOfBirth));
      }
    } else {
      setDateOfBirth('');
    }

    setIsUnlocked(false);
    setOtp('');
    setOtpSent(false);
    setFeedback(null);
  }, []);

  // Fetch users
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${env.adminBase}/users`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch customers');
      
      const list: CustomerRecord[] = data.users || [];
      setCustomersList(list);

      // Auto select matching customer by URL paramId or default to first
      if (list.length > 0) {
        if (paramId) {
          const targetId = parseInt(paramId, 10);
          const match = list.find((c) => c.id === targetId || c.customerId === targetId);
          if (match) {
            handleSelectCustomer(match);
          } else {
            handleSelectCustomer(list[0]);
          }
        } else if (selectedCustomerId === null) {
          handleSelectCustomer(list[0]);
        }
      }
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to connect to server', isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [paramId, selectedCustomerId, handleSelectCustomer]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);


  const selectedCustomer = useMemo(() => {
    return customersList.find((c) => c.id === selectedCustomerId) || null;
  }, [customersList, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customersList;
    return customersList.filter(
      (c) =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phoneNumber?.toLowerCase().includes(q) ||
        c.accountNumber?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
  }, [customersList, searchQuery]);

  // Step 1: Send OTP to registered customer email
  const handleRequestOtp = async () => {
    if (!selectedCustomerId || !selectedCustomer) return;
    setIsSendingOtp(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${selectedCustomerId}/send-edit-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send verification OTP');

      setOtpSent(true);
      setOtpCooldown(30);
      setFeedback({
        message: data.message || `OTP sent to customer registered email (${selectedCustomer.email})`,
        isError: false,
      });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error requesting OTP', isError: true });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP sent to registered email to unlock form
  const handleVerifyOtpToUnlock = async () => {
    if (!selectedCustomerId) return;
    if (!otp || otp.trim().length !== 6) {
      setFeedback({ message: 'Please enter the 6-digit OTP', isError: true });
      return;
    }

    setIsVerifyingOtp(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${selectedCustomerId}/verify-edit-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid or expired OTP');

      setIsUnlocked(true);
      setFeedback({
        message: '🔓 OTP Verified! Customer details form is now unlocked for editing.',
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
    if (!selectedCustomerId || !isUnlocked) {
      setFeedback({ message: 'Please verify OTP on registered email first to unlock editing.', isError: true });
      return;
    }

    setIsSubmittingUpdate(true);
    setFeedback(null);

    try {
      const res = await fetch(`${env.adminBase}/customers/${selectedCustomerId}/details`, {
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
      if (!res.ok) throw new Error(data.message || 'Failed to update customer details');

      setFeedback({
        message: 'Customer profile updated successfully!',
        isError: false,
      });

      // Update local state list
      setCustomersList((prev) =>
        prev.map((c) => (c.id === selectedCustomerId ? { ...c, ...data.customer } : c))
      );

      setIsUnlocked(false);
      setOtp('');
      setOtpSent(false);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to update details', isError: true });
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Account Settings</h1>
            <p className="text-sm text-slate-600">
              Staff portal for updating customer profile details upon verified customer OTP authorization.
            </p>
          </div>

          <button
            onClick={fetchCustomers}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </button>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 mb-6 rounded-lg text-sm border flex justify-between items-center ${
              feedback.isError ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{feedback.isError ? 'Error:' : 'Success:'}</span>
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline ml-4">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer Selection List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col h-[680px]">
            <h2 className="text-base font-semibold text-slate-800 mb-3">Select Customer Account</h2>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search by name, email, phone, acc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Customer Cards List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {isLoading ? (
                <div className="text-center py-8 text-xs text-slate-500">Loading customer accounts...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No customers found.</div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = cust.id === selectedCustomerId;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-slate-900">
                            {cust.firstName} {cust.lastName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{cust.email}</p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                            cust.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {cust.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                        <span>Acc: {cust.accountNumber || 'N/A'}</span>
                        <span>Phone: {cust.phoneNumber}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Edit Customer Details Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            {!selectedCustomer ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Please select a customer from the left list to edit details.
              </div>
            ) : (
              <div>
                {/* Header Summary */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-200 mb-6 gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Edit Details: {selectedCustomer.firstName} {selectedCustomer.lastName}
                      {isUnlocked ? (
                        <span className="text-xs bg-emerald-500 text-white px-2.5 py-0.5 rounded font-medium">Unlocked</span>
                      ) : (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded font-medium">Locked</span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Internal ID: #{selectedCustomer.id} | Email: {selectedCustomer.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">KYC Status:</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                      {selectedCustomer.kycStatus}
                    </span>
                  </div>
                </div>

                {/* Locked Banner / OTP Unlock Control */}
                {!isUnlocked ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        🔒 Form Locked: Verify OTP on Registered Email First
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={isSendingOtp || otpCooldown > 0}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50 self-start sm:self-auto"
                      >
                        {isSendingOtp
                          ? 'Sending OTP...'
                          : otpCooldown > 0
                          ? `Resend OTP (${otpCooldown}s)`
                          : 'Send OTP to Customer Email'}
                      </button>
                    </div>

                    <p className="text-xs text-amber-800">
                      All fields below are locked. Send a 6-digit OTP to the customer's registered email{' '}
                      <strong className="text-amber-950 font-mono">{selectedCustomer.email}</strong> and verify it to enable edit mode.
                    </p>

                    {otpSent && (
                      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-48 text-center text-base tracking-[0.3em] font-mono px-3 py-1.5 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                          placeholder="------"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtpToUnlock}
                          disabled={isVerifyingOtp || otp.length !== 6}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors"
                        >
                          {isVerifyingOtp ? 'Verifying...' : 'Verify OTP & Unlock Form'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 mb-6 flex items-center justify-between">
                    <span>🔓 Edit mode unlocked via OTP verification. You can modify any fields below and click Save.</span>
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleSaveDetails} className="space-y-5">
                  <div className={`space-y-5 transition-opacity ${!isUnlocked ? 'opacity-50 pointer-events-none select-none' : 'opacity-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                        <input
                          type="text"
                          disabled={!isUnlocked}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          placeholder="Enter first name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          disabled={!isUnlocked}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          placeholder="Enter last name"
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          placeholder="customer@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          disabled={!isUnlocked}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                        <input
                          type="text"
                          disabled={!isUnlocked}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          placeholder="Enter full address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Changes Button */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="submit"
                      disabled={!isUnlocked || isSubmittingUpdate}
                      className="px-6 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isSubmittingUpdate ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
