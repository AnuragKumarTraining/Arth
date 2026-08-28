const isProduction = import.meta.env.PROD;

const defaultApiBase = isProduction
  ? 'https://arth-backend-xyz-uc.a.run.app/api'
  : 'http://localhost:5011/api';

const apiBase = import.meta.env.VITE_API_BASE || defaultApiBase;

export const env = {
  apiBase,
  authBase: import.meta.env.VITE_API_BASE_AUTH || `${apiBase}/auth`,
  adminBase: import.meta.env.VITE_API_ADMIN || `${apiBase}/admin`,
} as const;