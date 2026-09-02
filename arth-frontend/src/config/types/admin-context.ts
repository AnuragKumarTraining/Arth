export interface AdminUser {
  adminId: number;
  email: string;
  role: 'admin';
}

export interface AuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}