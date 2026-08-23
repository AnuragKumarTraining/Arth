import express from "express";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";

export function createApp(){
    const app = express();
    
    if (env.isProduction) {
        app.enable('trust proxy');
        app.use((req, res, next) => {
            if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
                return res.redirect(301, `https://${req.headers.host}${req.url}`);
            }
            next();
        });
    }

    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.urlencoded({
        extended: true
    }))
    app.use("/api", apiRouter);
    app.use(errorHandler);
    return app;
}