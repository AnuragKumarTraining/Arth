
import { NextFunction, Request, Response} from "express";
import { AppError } from "../error/AppError";
import { logger } from "../lib/logger";


export function errorHandler(
    err : Error,
    _req : Request,
    res: Response,
    _next : NextFunction
):void{

    if(err instanceof AppError){
         res.status(err.statusCode).json({
            success : false,
            message: err.message
         })
        return
    }
    logger.error({err},"unhandler Error")


    res.status(500).json({
        success : false,
        message : "Internal Server Error",

    });
}