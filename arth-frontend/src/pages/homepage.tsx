import { Link } from 'react-router-dom';
import { Navbar } from '../components/navbar';

export default function Homepage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
        
        {/* Left Column: Hero Message */}
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Banking built <br className="hidden md:block"/> around you.
          </h1>
          <p className="text-lg text-slate-600 max-w-md">
            Experience secure, reliable, and straightforward financial management without the unnecessary complexity.
          </p>
          <div className="pt-4 space-y-2 text-slate-700 font-medium">
            <p>Secure Architecture</p>
            <p>Streamlined Account Creation</p>
            <p>Reliable Infrastructure</p>
          </div>
        </div>

        {/* Right Column: CTA Card */}
        <div className="flex-1 w-full max-w-md p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Ready to get started?</h2>
          <p className="mt-2 text-slate-600 mb-6">
            Create your account today and start managing your banking experience securely.
          </p>
          
          <Link to="/register" className="block w-full text-center px-4 py-3 text-white transition-colors bg-blue-700 rounded-md hover:bg-blue-800 font-medium">
            Create Account
          </Link>
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link to="/login" className="text-blue-700 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}