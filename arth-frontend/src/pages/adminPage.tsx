import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar';
import type { UserAccount } from '../config/user-account';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // --- NEW: Search & Pagination State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [totalUsers, setTotalUsers] = useState(0);

  const base = "http://localhost:5011/api/admin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);

      const res = await fetch(`${base}/users?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
      setUsersList(data.users || []);
      setTotalUsers(data.pagination?.total ?? 0);
    } catch (err: any) {
      setFeedback({ message: err.message, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, debouncedSearchQuery]);

  // --- NEW: Reset to page 1 on search ---
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE) || 1;

  // Helper to color-code KYC badges
  const getKycBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const logout = async () => {
    try {
      await fetch(`${base}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {} 
    finally {
      navigate('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Branch Account Directory</h1>
            <p className="text-sm text-slate-600">Access customer profiles, verify KYC status, and perform core banking operations.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={logout}
              disabled={isLoading}
              className="px-4 py-2 bg-red-800 text-white text-sm font-medium rounded hover:bg-red-900 disabled:opacity-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* --- NEW: Search Bar --- */}
        <div className="mb-6 relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by name, email, or account no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>

        {feedback && (
          <div
            className={`p-3 mb-4 rounded-md text-sm border ${
              feedback.isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">KYC Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                    {searchQuery ? `No accounts found matching "${searchQuery}"` : "No customer accounts found in the branch registry."}
                  </td>
                </tr>
              ) : (
                // --- CHANGED: mapping over paginatedUsers instead of usersList ---
                usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                      <div className="text-slate-500 text-xs">{user.email}</div>
                      <div className="text-slate-500 text-xs">{user.phoneNumber}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div><span className="font-medium text-slate-700">Cust ID:</span> {user.customerId || 'Unassigned'}</div>
                      <div><span className="font-medium text-slate-700">Acc No:</span> <span className="font-mono">{user.accountNumber || 'Unassigned'}</span></div>
                      <div className="text-xs text-slate-500 uppercase mt-0.5">{user.accountType || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border capitalize ${getKycBadgeColor(
                          user.kycStatus
                        )}`}
                      >
                        {user.kycStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          user.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Frozen'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      <button
                        onClick={() => navigate(`/admin/accounts/${user.id}`)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        View Account
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* --- NEW: Pagination Controls --- */}
          {!isLoading && totalUsers > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white sm:px-6">
              <div className="hidden sm:block">
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)}</span> of <span className="font-medium">{totalUsers}</span> accounts
                </p>
              </div>
              <div className="flex flex-1 justify-between sm:justify-end gap-2 text-sm">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="inline-flex items-center px-4 font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}