import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar';

interface CustomerProfile {
  customerId: number;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  isActive: boolean;
}

interface AccountDetails {
  accountNumber: string;
  accountType: string;
  balance: number;
  branchCode: string;
  ifscCode: string;
}

interface Transaction {
  id: string;
  description: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  status: 'COMPLETED' | 'PENDING';
}

const API_BASE = 'http://localhost:5011/api';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sample data fallback until backend account endpoints are wired
  const [account] = useState<AccountDetails>({
    accountNumber: 'ARTH-1029384756',
    accountType: 'Savings Account',
    balance: 145250.75,
    branchCode: 'ARTH001',
    ifscCode: 'ARTH0000001',
  });

  const [transactions] = useState<Transaction[]>([])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Unauthorized session');
        }

        const data = await res.json();
        setCustomer(data.customer);
      } catch (err: any) {
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore error
    } finally {
      navigate('/login');
    }
  };

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
    <div className="min-h-screen bg-slate-50">
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

          <button
            onClick={handleLogout}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* KYC Notification Banner if pending */}
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
          {/* Main Account Balance Card */}
          <div className="lg:col-span-2 p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  {account.accountType}
                </span>
                <p className="text-sm font-mono font-medium text-slate-800 mt-0.5">
                  {account.accountNumber}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium">Available Balance</span>
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">IFSC Code</span>
                <span className="font-semibold text-slate-700 font-mono">{account.ifscCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Branch Code</span>
                <span className="font-semibold text-slate-700 font-mono">{account.branchCode}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>

            <div className="space-y-3">
              <button className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
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

        {/* Recent Transactions Section */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
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
                {transactions.map((tx) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}