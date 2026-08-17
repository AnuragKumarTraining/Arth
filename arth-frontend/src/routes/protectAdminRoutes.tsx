import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/adminAuthContext';

export default function ProtectedAdminRoute() {
  const { admin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-600">Verifying admin session...</p>
      </div>
    );
  }

  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
}