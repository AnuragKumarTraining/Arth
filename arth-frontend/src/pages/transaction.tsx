import { useEffect, useState, useMemo } from 'react';
import { Navbar } from '../components/navbar';
import { env } from '../config/env';
export interface AdminTransaction {
  id: string;
  referenceNumber: string;
  idempotencyKey?: string | null;
  senderAccountId?: number | null;
  senderAccountNumber?: string;
  senderName?: string;
  receiverAccountId?: number | null;
  receiverAccountNumber?: string;
  receiverName?: string;
  externalAccountNumber?: string | null;
  externalRoutingCode?: string | null;
  externalBankName?: string | null;
  amount: number;
  feeAmount: number;
  currency: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE' | 'INTEREST';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  failureReason?: string | null;
  description?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export default function Transactions() {
  const [transactionsList, setTransactionsList] = useState<AdminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Filters & Pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Selected Transaction for Details Modal
  const [selectedTx, setSelectedTx] = useState<AdminTransaction | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${env.adminBase}/transactions`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
      setTransactionsList(data.transactions || []);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error connecting to server', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Reset to page 1 whenever filter parameters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, itemsPerPage]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();

      // Search match check
      const matchesSearch =
        !q ||
        tx.referenceNumber?.toLowerCase().includes(q) ||
        tx.senderName?.toLowerCase().includes(q) ||
        tx.senderAccountNumber?.toLowerCase().includes(q) ||
        tx.receiverName?.toLowerCase().includes(q) ||
        tx.receiverAccountNumber?.toLowerCase().includes(q) ||
        tx.externalBankName?.toLowerCase().includes(q) ||
        tx.description?.toLowerCase().includes(q) ||
        tx.type?.toLowerCase().includes(q) ||
        tx.status?.toLowerCase().includes(q) ||
        String(tx.amount).includes(q);

      // Status match check
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;

      // Type match check
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [transactionsList, searchQuery, statusFilter, typeFilter]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = transactionsList.length;
    const totalVolume = transactionsList.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    const completedCount = transactionsList.filter((t) => t.status === 'COMPLETED').length;
    const pendingOrFailedCount = transactionsList.filter(
      (t) => t.status === 'PENDING' || t.status === 'FAILED'
    ).length;

    return {
      totalCount,
      totalVolume,
      completedCount,
      pendingOrFailedCount,
    };
  }, [transactionsList]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Helper Badge Color getters
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'REVERSED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'TRANSFER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DEPOSIT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WITHDRAWAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FEE':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'INTEREST':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaction Ledger & Search</h1>
            <p className="text-sm text-slate-600">
              Real-time audit log of all customer deposits, withdrawals, and interbank transfers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchTransactions}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Metrics Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Volume</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(metrics.totalVolume)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.completedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending / Failed</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.pendingOrFailedCount}</p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search reference, customer, account, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="TRANSFER">Transfer</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="FEE">Fee</option>
                <option value="INTEREST">Interest</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline px-2"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 mb-4 rounded-md text-sm border ${
              feedback.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reference & Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sender (Source)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Receiver (Destination)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    Loading transaction records...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                      ? 'No transactions found matching the applied search and filters.'
                      : 'No transaction records exist in the system.'}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    {/* Reference & Date */}
                    <td className="px-4 py-4 text-sm">
                      <div className="font-mono font-medium text-slate-900 text-xs">{tx.referenceNumber}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{formatDate(tx.createdAt)}</div>
                    </td>

                    {/* Sender */}
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-slate-900">{tx.senderName}</div>
                      <div className="text-slate-500 text-xs font-mono">Acc: {tx.senderAccountNumber}</div>
                    </td>

                    {/* Receiver */}
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-slate-900">{tx.receiverName}</div>
                      <div className="text-slate-500 text-xs font-mono">
                        Acc: {tx.receiverAccountNumber}
                        {tx.externalBankName && <span className="ml-1 text-slate-400">({tx.externalBankName})</span>}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadge(
                          tx.type
                        )}`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-sm">
                      <div className="font-semibold text-slate-900">{formatCurrency(tx.amount)}</div>
                      {tx.feeAmount > 0 && (
                        <div className="text-xs text-slate-500">Fee: {formatCurrency(tx.feeAmount)}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right text-sm">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {!isLoading && filteredTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 bg-white sm:px-6 gap-3">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredTransactions.length}</span> transactions
                </p>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-300 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-300 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Transaction Details</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedTx.referenceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-700 text-sm">
              {/* Top Overview Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block uppercase">Type</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border mt-1 ${getTypeBadge(
                      selectedTx.type
                    )}`}
                  >
                    {selectedTx.type}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border mt-1 ${getStatusBadge(
                      selectedTx.status
                    )}`}
                  >
                    {selectedTx.status}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase">Amount</span>
                  <span className="font-bold text-slate-900 block mt-1">{formatCurrency(selectedTx.amount)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase">Fee</span>
                  <span className="font-semibold text-slate-700 block mt-1">{formatCurrency(selectedTx.feeAmount)}</span>
                </div>
              </div>

              {/* Sender & Receiver Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sender Information</h4>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{selectedTx.senderName}</p>
                    <p className="text-xs font-mono text-slate-600">Acc No: {selectedTx.senderAccountNumber}</p>
                    {selectedTx.senderAccountId && (
                      <p className="text-xs text-slate-500">Internal Account ID: #{selectedTx.senderAccountId}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Receiver Information</h4>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{selectedTx.receiverName}</p>
                    <p className="text-xs font-mono text-slate-600">Acc No: {selectedTx.receiverAccountNumber}</p>
                    {selectedTx.externalBankName && (
                      <p className="text-xs text-slate-500">Bank: {selectedTx.externalBankName}</p>
                    )}
                    {selectedTx.externalRoutingCode && (
                      <p className="text-xs text-slate-500 font-mono">IFSC / Code: {selectedTx.externalRoutingCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Transaction Metadata */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction Audit Metadata</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Transaction ID:</span>{' '}
                    <span className="font-mono text-slate-800">{selectedTx.id}</span>
                  </div>
                  {selectedTx.idempotencyKey && (
                    <div>
                      <span className="text-slate-500">Idempotency Key:</span>{' '}
                      <span className="font-mono text-slate-800 truncate block">{selectedTx.idempotencyKey}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Created At:</span>{' '}
                    <span className="text-slate-800">{formatDate(selectedTx.createdAt)}</span>
                  </div>
                  {selectedTx.completedAt && (
                    <div>
                      <span className="text-slate-500">Completed At:</span>{' '}
                      <span className="text-slate-800">{formatDate(selectedTx.completedAt)}</span>
                    </div>
                  )}
                  {selectedTx.description && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-slate-500">Description:</span>{' '}
                      <span className="text-slate-800 font-medium">{selectedTx.description}</span>
                    </div>
                  )}
                  {selectedTx.failureReason && (
                    <div className="col-span-1 sm:col-span-2 bg-rose-50 p-2.5 rounded border border-rose-200 text-rose-800">
                      <span className="font-semibold">Failure Reason:</span> {selectedTx.failureReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}