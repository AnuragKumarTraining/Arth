const defaultApiBase = 'http://localhost:5011/api';

const apiBase = import.meta.env.VITE_API_BASE || defaultApiBase;

export const env = {
  apiBase,
  authBase: import.meta.env.VITE_API_BASE_AUTH || `${apiBase}/auth`,
  adminBase: import.meta.env.VITE_API_ADMIN || `${apiBase}/admin`,
} as const;