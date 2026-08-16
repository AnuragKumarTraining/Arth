
import express from "express";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";

export function createApp(){
    const app = express();
    app.use(express.json());
    app.use(cors())
    app.use(express.urlencoded({
        extended: true
    }))
    app.use("/api", apiRouter);
    app.use(errorHandler);
    return app;
}