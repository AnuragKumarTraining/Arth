import { useEffect, useState } from 'react';
import { Navbar } from '../components/navbar';
import type { CustomerAccount } from '../config/admin-input';
import { env } from '../config/env';


const base = "http://localhost:5011/api/admin";

export default function AdminDashboard() {
  const [usersList, setUsersList] = useState<CustomerAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${base}/users`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
      setUsersList(data.users || []);
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusUpdate = async (userId: string, kycStatus: 'pending' | 'verified' | 'rejected', isActive: boolean) => {
    setUpdatingId(userId);
    setFeedback(null);

    try {
      const res = await fetch(`${base}/users/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: Number(userId), kycStatus, isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update user status');

      // Update state locally
      setUsersList((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, kycStatus, isActive } : item
        )
      );

      setFeedback({ message: 'User updated successfully and notification dispatched if activated.', isError: false });
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Account Review</h1>
            <p className="text-sm text-slate-600">Review KYC submissions, toggle account activation, and trigger notifications.</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 mb-4 rounded-md text-sm border ${feedback.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
              }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Account Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">KYC Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Active Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Loading accounts...</td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No customer accounts found.</td>
                </tr>
              ) : (
                usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                      <div className="text-slate-500 text-xs">{user.email}</div>
                      <div className="text-slate-500 text-xs">{user.phoneNumber}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div><span className="font-medium">Cust ID:</span> {user.customerId || 'Unassigned'}</div>
                      <div><span className="font-medium">Acc No:</span> {user.accountNumber || 'Unassigned'}</div>
                      <div className="text-xs text-slate-500 uppercase">{user.accountType || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <select
                        value={user.kycStatus}
                        disabled={updatingId === user.id}
                        onChange={(e) =>
                          handleStatusUpdate(
                            user.id,
                            e.target.value as 'pending' | 'verified' | 'rejected',
                            user.isActive
                          )
                        }
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      <button
                        disabled={updatingId === user.id}
                        onClick={() =>
                          handleStatusUpdate(
                            user.id,
                            user.kycStatus === 'verified' ? 'verified' : 'verified',
                            !user.isActive
                          )
                        }
                        className={`px-3 py-1 text-xs font-medium rounded border ${user.isActive
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                          } disabled:opacity-50`}
                      >
                        {updatingId === user.id ? 'Updating...' : user.isActive ? 'Deactivate' : 'Verify & Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}