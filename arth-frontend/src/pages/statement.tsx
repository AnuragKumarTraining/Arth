import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Navbar } from '../components/navbar';
import { env } from '../config/env';

const API_BASE = env.adminBase;

interface StatementTransaction {
  id: string;
  referenceNumber: string;
  createdAt: string;
  description: string;
  type: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementData {
  account: {
    accountNumber: string;
    accountType: string;
    currency: string;
    firstName: string;
    lastName: string;
  };
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
}

export default function Statement() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [statement, setStatement] = useState<StatementData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [error, setError] = useState('');

  const handlePreview = async () => {
    setError('');

    if (!id) {
      setError('Customer ID is missing.');
      return;
    }

    if (!fromDate || !toDate) {
      setError('Please select both dates.');
      return;
    }

    if (fromDate > toDate) {
      setError('From date cannot be after To date.');
      return;
    }

    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      const response = await fetch(
        `${API_BASE}/accounts/${id}/statement/preview?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        let message = 'Failed to load statement.';

        try {
          const data = await response.json();

          if (data.message) {
            message = data.message;
          }
        } catch {
          // Response is not JSON
        }

        throw new Error(message);
      }

      const data = await response.json();

      setStatement(data.statement);
    } catch (error) {
      console.error('Statement preview failed:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Failed to load statement.',
      );

      setStatement(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setError('');

    if (!id || !fromDate || !toDate) {
      setError('Please select a valid statement period.');
      return;
    }

    try {
      setIsDownloading(true);

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        format: 'pdf',
      });

      const response = await fetch(
        `${API_BASE}/accounts/${id}/statement?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        let message = 'Failed to download statement.';

        try {
          const data = await response.json();

          if (data.message) {
            message = data.message;
          }
        } catch {
          // Response is not JSON
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = `statement-${fromDate}-to-${toDate}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Statement download failed:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Failed to download statement.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <button
          type="button"
          onClick={() => navigate(`/admin/accounts/${id}`)}
          className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Account
        </button>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900">
              Account Statement
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Select a date range to preview your account statement.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Statement Period
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                <div>
                  <label
                    htmlFor="fromDate"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    From Date
                  </label>

                  <input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(event) => {
                      setFromDate(event.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="toDate"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    To Date
                  </label>

                  <input
                    id="toDate"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => {
                      setToDate(event.target.value);
                      setError('');
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading Statement...' : 'View Statement'}
              </button>
            </div>

            {statement && (
              <div className="border-t border-slate-200 pt-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Account Statement
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      {statement.account.firstName}{' '}
                      {statement.account.lastName}
                    </p>

                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {statement.account.accountNumber}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {statement.from} to {statement.to}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading
                      ? 'Generating PDF...'
                      : 'Download PDF'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Opening Balance
                    </p>

                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {formatMoney(statement.openingBalance)}
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Closing Balance
                    </p>

                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {formatMoney(statement.closingBalance)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                          Date
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                          Reference
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                          Description
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">
                          Debit
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">
                          Credit
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">
                          Balance
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {statement.transactions.length > 0 ? (
                        statement.transactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {formatDate(transaction.createdAt)}
                            </td>

                            <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                              {transaction.referenceNumber}
                            </td>

                            <td className="px-4 py-3 font-medium text-slate-900">
                              {transaction.description}
                            </td>

                            <td className="px-4 py-3 text-right text-slate-900 whitespace-nowrap">
                              {transaction.debit > 0
                                ? formatMoney(transaction.debit)
                                : '-'}
                            </td>

                            <td className="px-4 py-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                              {transaction.credit > 0
                                ? formatMoney(transaction.credit)
                                : '-'}
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                              {formatMoney(transaction.balance)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-400"
                          >
                            No transactions found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading
                      ? 'Generating PDF...'
                      : 'Download Statement PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}