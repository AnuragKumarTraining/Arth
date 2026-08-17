export const env = {
  apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:5011/api',
  authBase: import.meta.env.VITE_API_BASE_AUTH || 'http://localhost:5011/api/auth',
  adminBase: import.meta.env.VITE_API_ADMIN || 'http://localhost:5011/api/admin',
} as const;