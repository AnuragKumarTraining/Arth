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
    port: Number(process.env.PORT || 5011),
    dbUrl: process.env.DATABASE_URL || "",
    adminJwtSecret: process.env.ADMIN_JWT_SECRET || "default_jwt_secret",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    smtp_port: process.env.SMTP_PORT || "587",
    smtp_user: process.env.SMTP_USER || "",
    smtp_pass: process.env.SMTP_PASS || "",
    log_level: process.env.LOG_LEVEL || "info",
    key_expiry: process.env.token_expiry || "8h",
    adminCookieName: process.env.ADMIN_COOKIE_NAME || "admin_token",
    expire_cookie: Number(process.env.EIGHT_HOURS_MS || "28800000"),
    admin: process.env.ADMIN_EMAIL || "admin@arth.com",
    adminP: process.env.ADMIN_PASSWORD || "AdminPassword123!",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    isProduction: process.env.NODE_ENV === "production",
} as const;