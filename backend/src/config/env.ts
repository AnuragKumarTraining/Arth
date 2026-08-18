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
    port: Number(getEnv("PORT")),
    dbUrl: getEnv("DATABASE_URL"),
    accessToken: getEnv("jwt_secret"),
    adminJwtSecret: getEnv("ADMIN_JWT_SECRET"),
    host: getEnv("SMTP_HOST"),
    smtp_port: getEnv("SMTP_PORT"),
    smtp_user: getEnv("SMTP_USER"),
    smtp_pass: getEnv("SMTP_PASS"),
    log_level: getEnv("LOG_LEVEL"),
    key: getEnv('jwt_secret'),
    key_expiry: getEnv('token_expiry'),
    adminCookieName: getEnv('ADMIN_COOKIE_NAME'),
    customerCookieName: getEnv('CUSTOMER_COOKIE_NAME'),
    expire_cookie: Number(getEnv('EIGHT_HOURS_MS')),
    admin: getEnv('ADMIN_EMAIL'),
    adminP: getEnv('ADMIN_PASSWORD')
} as const;