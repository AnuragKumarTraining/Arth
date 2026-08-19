import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../components/navbar';
import { env } from '../config/env';
import type { AccountDetails, CustomerProfile } from '../config/customer-input';
import type { Transaction } from '../config/transaction';
import { TransferModal } from '../components/Modals/transferModal';

const API_BASE = env.adminBase;

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  // --- RESTORED: Search & Pagination State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Extracted fetch function so it can be reused after a transfer
  const fetchAccountData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/accounts/${id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Unauthorized session');
      }

      const data = await res.json();
      setCustomer(data.customer);
      if (data.account) setAccount(data.account);
      if (data.transactions) setTransactions(data.transactions);
    } catch (err: any) {
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  // --- RESTORED: Reset to page 1 when search query changes ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Open Modal & Fetch Beneficiaries
  const handleOpenTransfer = async () => {
    setIsTransferModalOpen(true);
    
    try {
      const res = await fetch(`${API_BASE}/accounts/${id}/beneficiaries`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      console.error('Failed to fetch beneficiaries');
    }
  };

  // --- RESTORED: Filter and slice transactions for the current page ---
  const filteredTransactions = transactions.filter((tx) =>
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex h-[70vh] items-center justify-center">
          <p className="text-sm font-medium text-slate-600">Loading your banking overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Top Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back, {customer?.firstName || 'User'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Customer ID: #{customer?.customerId} &bull; {customer?.email}
            </p>
          </div>
        </div>

        {/* KYC Notification Banner */}
        {customer?.kycStatus === 'PENDING_ADMIN_APPROVAL' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <div className="text-amber-800 font-semibold text-sm">
              KYC Verification Pending
            </div>
            <div className="text-amber-700 text-sm">
              Your documents are under review by the branch admin. Some outbound transfer limits may apply.
            </div>
          </div>
        )}

        {/* Account Summary & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  {account?.accountType || 'PRIMARY ACCOUNT'}
                </span>
                <p className="text-sm font-mono font-medium text-slate-800 mt-0.5">
                  {account?.accountNumber || 'Processing Account Number...'}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                {account?.isActive || 'Active'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium">Available Balance</span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                ₹{(account?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">IFSC Code</span>
                <span className="font-semibold text-slate-700 font-mono">{account?.ifscCode || 'ARTH0000001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Branch Code</span>
                <span className="font-semibold text-slate-700 font-mono">{account?.branchCode || 'ARTH001'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleOpenTransfer}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Transfer Money
              </button>
              <button className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Download Statement
              </button>
              <button className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Account Settings
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              24x7 Virtual Banking Protected
            </p>
          </div>
        </div>

        {/* --- RESTORED: Recent Transactions Section --- */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
          
          {/* Search Bar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
            
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by ID or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-700">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {tx.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        <span
                          className={
                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'
                          }
                        >
                          {tx.type === 'CREDIT' ? '+' : '-'} ₹
                          {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No transactions found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} entries
            </span>
            
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-2 text-slate-600 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Transfer Modal Comp */}
      <TransferModal
  isOpen={isTransferModalOpen}
  onClose={() => setIsTransferModalOpen(false)}
  accountId={id}
  onSuccess={fetchAccountData}
/>

    </div>
  );
}