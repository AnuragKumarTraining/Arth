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
    isProduction: checkRequiredEnv('NODE_ENV')

}as const;