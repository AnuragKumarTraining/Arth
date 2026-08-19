import express from "express";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import cookieParser from "cookie-parser";

export function createApp(){
    const app = express();
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