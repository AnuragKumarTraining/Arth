import dotenv from "dotenv";
dotenv.config();

function checkRequiredEnv(key : string) : string{
    const value = process.env[key];
    if(!value){
        throw new Error(`the required env variable ${key} is not defined`)
    }
    return value;
}

export const env = {
    port : Number(checkRequiredEnv("PORT")),
    dbUrl: checkRequiredEnv("DATABASE_URL"),
    accessToken : checkRequiredEnv("jwt_secret"),
    host : checkRequiredEnv("SMTP_HOST"),
    smtp_port : checkRequiredEnv("SMTP_PORT"),
    smtp_user : checkRequiredEnv("SMTP_USER"),
    smtp_pass : checkRequiredEnv("SMTP_PASS"),
    log_level : checkRequiredEnv("LOG_LEVEL"),
    isProduction: checkRequiredEnv('NODE_ENV'),
    key : checkRequiredEnv('jwt_secret'),
    key_expiry : checkRequiredEnv('token_expiry'),
    cookies : checkRequiredEnv('COOKIE_NAME'),
    expire_cookie : checkRequiredEnv('EIGHT_HOURS_MS'),
    admin: checkRequiredEnv('ADMIN_EMAIL'),
    adminP : checkRequiredEnv('ADMIN_PASSWORD')


}as const;