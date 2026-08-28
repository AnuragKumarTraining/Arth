import { createContext, useContext, useEffect, useState } from 'react';
import type { AdminUser, AuthContextType } from '../config/admin-context';
import { env } from '../config/env';



const AdminAuthContext = createContext<AuthContextType>({
  admin: null,
  isLoading: true,
  logout: async () => {},
});

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${env.adminBase}/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          setAdmin(null);
        }
      } catch {
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    await fetch(`${env.adminBase}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setAdmin(null);
    window.location.href = '/admin/login';
  };

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);