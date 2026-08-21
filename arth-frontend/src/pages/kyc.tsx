import { useEffect, useState } from 'react';

import type { CustomerAccount } from '../config/admin-input';
import { env } from '../config/env';
import { Navbar } from '../components/navbar';

const base = env.adminBase;
const ITEMS_PER_PAGE = 5;

export default function KYC() {
  const [usersList, setUsersList] = useState<CustomerAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setFeedback(null);

      const res = await fetch(`${base}/users`, {
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || 'Failed to fetch users',
        );
      }

      setUsersList(data.users || []);
      setCurrentPage(1);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch users';

      setFeedback({
        message,
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusUpdate = async (
    userId: string,
    kycStatus: 'pending' | 'verified' | 'rejected',
    isActive: boolean,
  ) => {
    setUpdatingId(userId);
    setFeedback(null);

    try {
      const res = await fetch(`${base}/users/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: Number(userId),
          kycStatus,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Failed to update user status',
        );
      }

      setUsersList((prev) =>
        prev.map((item) =>
          item.id === userId
            ? {
                ...item,
                kycStatus,
                isActive,
              }
            : item,
        ),
      );

      setFeedback({
        message:
          'User updated successfully and notification dispatched if activated.',
        isError: false,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update user status';

      setFeedback({
        message,
        isError: true,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(
    usersList.length / ITEMS_PER_PAGE,
  );

  const startIndex =
    (currentPage - 1) * ITEMS_PER_PAGE;

  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedUsers = usersList.slice(
    startIndex,
    endIndex,
  );

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(page - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) =>
      Math.min(page + 1, totalPages),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Customers KYC Review
            </h1>

            <p className="text-sm text-slate-600">
              Review customer KYC submissions, manage account
              verification status, and toggle account activation.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 mb-4 rounded-md text-sm border ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Customer
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Account Info
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  KYC Status
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                  Active Status
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Loading accounts...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                      </div>

                      <div className="text-slate-500 text-xs">
                        {user.email}
                      </div>

                      <div className="text-slate-500 text-xs">
                        {user.phoneNumber}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">
                          Cust ID:
                        </span>{' '}
                        {user.customerId || 'Unassigned'}
                      </div>

                      <div>
                        <span className="font-medium">
                          Acc No:
                        </span>{' '}
                        {user.accountNumber || 'Unassigned'}
                      </div>

                      <div className="text-xs text-slate-500 uppercase">
                        {user.accountType || 'N/A'}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <select
                        value={user.kycStatus}
                        disabled={
                          updatingId === user.id
                        }
                        onChange={(event) =>
                          handleStatusUpdate(
                            user.id,
                            event.target.value as
                              | 'pending'
                              | 'verified'
                              | 'rejected',
                            user.isActive,
                          )
                        }
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="pending">
                          Pending
                        </option>

                        <option value="verified">
                          Verified
                        </option>

                        <option value="rejected">
                          Rejected
                        </option>
                      </select>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      <button
                        type="button"
                        disabled={
                          updatingId === user.id
                        }
                        onClick={() =>
                          handleStatusUpdate(
                            user.id,
                            'verified',
                            !user.isActive,
                          )
                        }
                        className={`px-3 py-1 text-xs font-medium rounded border ${
                          user.isActive
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        } disabled:opacity-50`}
                      >
                        {updatingId === user.id
                          ? 'Updating...'
                          : user.isActive
                            ? 'Deactivate'
                            : 'Verify & Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && usersList.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-medium text-slate-700">
                {startIndex + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-slate-700">
                {Math.min(
                  endIndex,
                  usersList.length,
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-700">
                {usersList.length}
              </span>{' '}
              customers
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: totalPages },
                  (_, index) => {
                    const page = index + 1;

                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          setCurrentPage(page)
                        }
                        className={`min-w-8 px-2 py-1.5 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  },
                )}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={
                  currentPage === totalPages
                }
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}