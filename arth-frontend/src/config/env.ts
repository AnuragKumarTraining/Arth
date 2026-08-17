function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`The required environment variable ${name} is not defined`);
  }
  return value;
}

export const env = {
  adminBase: requireEnv(import.meta.env.VITE_API_BASE, 'VITE_API_BASE'),
//   authBase: requireEnv(import.meta.env.VITE_API_BASE_AUTH, 'VITE_API_BASE_AUTH'),
//   adminAuth: requireEnv(import.meta.env.VITE_API_ADMIN, 'VITE_API_ADMIN')
} as const;