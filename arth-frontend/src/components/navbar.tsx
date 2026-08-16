import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
//   const { theme, toggleTheme } = useTheme();

  return (
    <nav className="w-full px-6 py-4 bg-slate-900 border-b border-slate-800 dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">
          Ar<span className="text-blue-500">th</span>
        </Link>
        <div className="flex space-x-6 items-center">

          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700">
            Create Account
          </Link>

        </div>
      </div>
    </nav>
  );
};


















{/* <button 
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button> */}