import dotenv from "dotenv";
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`The required env variable ${key} is not defined`);
    }
    return value;
}

export const env = {
    port: Number(getEnv("PORT", "5011")),
    dbUrl: getEnv("DATABASE_URL"),
    accessToken: getEnv("jwt_secret", "super_secret_jwt"),
    adminJwtSecret: getEnv("ADMIN_JWT_SECRET", "super_secret_admin_jwt"),
    host: getEnv("SMTP_HOST", "smtp.gmail.com"),
    smtp_port: getEnv("SMTP_PORT", "587"),
    smtp_user: getEnv("SMTP_USER", ""),
    smtp_pass: getEnv("SMTP_PASS", ""),
    log_level: getEnv("LOG_LEVEL", "info"),
    isProduction: process.env.NODE_ENV === 'production',
    key: getEnv('jwt_secret', 'super_secret_jwt'),
    key_expiry: getEnv('token_expiry', '8h'),
    adminCookieName: getEnv('ADMIN_COOKIE_NAME', 'admin_token'),
    customerCookieName: getEnv('CUSTOMER_COOKIE_NAME', 'customer_token'),
    expire_cookie: Number(getEnv('EIGHT_HOURS_MS', '28800000')),
    admin: getEnv('ADMIN_EMAIL', 'admin@arth.com'),
    adminP: getEnv('ADMIN_PASSWORD', 'admin123')
} as const;