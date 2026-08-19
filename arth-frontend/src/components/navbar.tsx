import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

 return (
    <nav className="w-full px-6 py-4 bg-slate-900 border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/admin" className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
          Ar<span className="text-blue-500">th</span>
          <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold tracking-wider">
            Staff Portal
          </span>
        </Link>

        {/* Staff Navigation Links */}
        <div className="flex space-x-6 items-center">
          <Link
            to="/admin"
            className={`text-sm font-medium transition-colors ${
              isActive('/admin')
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All Accounts
          </Link>

          <Link
            to="/admin/transactions"
            className={`text-sm font-medium transition-colors ${
              isActive('/admin/transactions')
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Transactions
          </Link>

          <Link
            to="/admin/kyc"
            className={`text-sm font-medium transition-colors ${
              isActive('/admin/kyc')
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            KYC
          </Link>
          <Link
            to="/admin/kyc"
            className={`text-sm font-medium transition-colors ${
              isActive('/admin/collectors')
                ? 'text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Dispatch Collectors
          </Link>

          <Link
            to="/admin/open-account"
            className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
          >
            Open Account
          </Link>
        </div>
      </div>
    </nav>
  );
}