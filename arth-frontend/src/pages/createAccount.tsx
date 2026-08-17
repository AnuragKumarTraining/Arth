import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar';
import CommonForm from '../components/common-form/common-form';
import { registerFormElements } from '../config/register-input-values';
// import { env } from '../config/env';

const API_BASE =  "http://localhost:5011/api/auth"

export default function Register() {
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [timeLeft, setTimeLeft] = useState(59);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');


  useEffect(() => {
    if (step !== 'otp' || timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [step, timeLeft]);

  const handleRegisterSubmit = async (event:any) => {
    event.preventDefault();
    setGlobalError('');
    if (formData.password !== formData.confirmPassword) {
      setGlobalError('Passwords do not match.');
      return;
    } 
    setIsLoading(true);

     
    try {
      const payload = {
        ...formData,
        branchId: Number(formData.branchId),
      };

      const res = await fetch(`${API_BASE}/createAccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed. Please check your inputs.');
      }
      setTimeLeft(59);
      setStep('otp');
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event:any) => {
    event.preventDefault();
    setGlobalError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/verify-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      setStep('success');
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
const handleResendOtp = async (event:any) => {
  if (event) event.preventDefault();
  if (timeLeft > 0) return;

  setGlobalError('');
  setIsResending(true);

  try {
    const res = await fetch(`${API_BASE}/resendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to resend OTP. Please try again.');
    }

    // Reset countdown timer on success
    setTimeLeft(59);
  } catch (err: any) {
    setGlobalError(err.message || 'An unexpected error occurred.');
  } finally {
    setIsResending(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4">
        
        {step === 'form' && (
          <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm text-slate-600 mb-6">Enter your details to register securely.</p>

            {globalError && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {globalError}
              </div>
            )}

            <CommonForm
              formControls={registerFormElements}
              formData={formData}
              setFormData={setFormData}
              buttonText={isLoading ? "Processing..." : "Create Account"}
              onHandleSubmit={handleRegisterSubmit}
            />
          </div>
        )}

        {step === 'otp' && (
          <div className="w-full max-w-md p-8 bg-white border rounded-xl shadow-sm border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">Verify your email</h2>
            <p className="mt-2 text-sm text-slate-600 mb-6">We've sent a 6-digit code to {formData.email}.</p>
            
            {globalError && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                {globalError}
              </div>
            )}

            <form onSubmit={handleOtpSubmit}>
              <div className="flex flex-col w-full mb-4">
                <label htmlFor="otp" className="mb-1 text-sm font-medium text-slate-700">Verification Code</label>
                <input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white disabled:bg-slate-100 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 mt-2 text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:bg-blue-400 font-medium transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify Account'}
              </button>
            </form>
             <div className="mt-4 text-center">
    {timeLeft > 0 ? (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Resend OTP in <span className="font-medium text-slate-700 dark:text-slate-300">0:{timeLeft.toString().padStart(2, '0')}</span>
      </p>
    ) : (
      <button
        type="button"
        onClick={handleResendOtp}
        disabled={isResending || isLoading}
        className="text-sm font-medium text-blue-600 hover:underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isResending ? 'Sending...' : 'Resend OTP'}
      </button>
    )}
  </div>
          </div>
          
        )}
       

        {step === 'success' && (
          <div className="w-full max-w-md p-8 bg-white border rounded-xl shadow-sm border-slate-200 text-center">
            <div>Welcome Onboard!</div>
            <h2 className="text-2xl font-semibold text-slate-900">Registration Complete</h2>
            <p className="mt-2 text-sm text-slate-600 mb-6">
              Your account has been verified. It is currently pending admin activation.
            </p>
            <button onClick={() => navigate('/login')} className="text-blue-700 font-semibold hover:underline">
              Go to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}