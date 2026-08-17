import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar';
import CommonForm from '../components/common-form/common-form';
import { loginFormElements } from '../config';

const API_BASE = 'http://localhost:5011/api/auth';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const handleLoginSubmit = async (event:any) => {
    event.preventDefault();
    setGlobalError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials or endpoint not implemented yet.');
      }

      // TODO: Handle JWT storage here once Phase 4 is done
      navigate('/dashboard');
      
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4">
        
        {/* Card Wrapper for Title, Error, and Form */}
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-slate-600 mb-6">Enter your credentials to access your dashboard.</p>

          {globalError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {globalError}
            </div>
          )}

          <CommonForm
            formControls={loginFormElements}
            formData={formData}
            setFormData={setFormData}
            buttonText={isLoading ? "Authenticating..." : "Sign In"}
            onHandleSubmit={handleLoginSubmit}
          />
        </div>

      </div>
    </div>
  );
}