import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`The required env variable ${key} is not defined`);
    }
    return value;
}

export const env = {
    port: Number(process.env.PORT || (isProduction ? 8080 : 5011)),
    dbUrl: getEnv("DATABASE_URL"),
    adminJwtSecret: getEnv("ADMIN_JWT_SECRET"),
    host: getEnv("SMTP_HOST"),
    smtp_port: getEnv("SMTP_PORT"),
    smtp_user: getEnv("SMTP_USER"),
    smtp_pass: getEnv("SMTP_PASS"),
    log_level: getEnv("LOG_LEVEL", "info"),
    key_expiry: getEnv('token_expiry', '8h'),
    adminCookieName: getEnv('ADMIN_COOKIE_NAME', 'admin_token'),
    expire_cookie: Number(getEnv('EIGHT_HOURS_MS', '28800000')),
    admin: getEnv('ADMIN_EMAIL'),
    adminP: getEnv('ADMIN_PASSWORD'),
    corsOrigin: process.env.CORS_ORIGIN || (isProduction ? 'https://arth-frontend-xyz-uc.a.run.app' : 'http://localhost:5173'),
    isProduction,
} as const;