import { ErrorRequestHandler } from "express";
import winston from "winston";
import z from "zod";

/** helper for type infer */
export const ErrorHanlder = (f: ErrorRequestHandler)=> f;


/** Converts any error object to a string message */
export const errorToString = (error: any) => {
    if (error instanceof z.ZodError) 
        return error.issues[0].message + " -> " + error.issues[0].path.join(".");
    if (error instanceof Error)
        return error.message;
   
    return "Unknown server error";
}


const envCache = new Map<string, string>();
setInterval(
    () => envCache.clear(), 
    10 * 60 * 1000
);

/** Cached access to environment variables, updates every 10 minutes */
export const getEnv = (key: string)=> {
    let env = envCache.get(key);
    if (env === undefined) {
        env = process.env[key] ?? "";
        envCache.set(key, env);
    }
    return env;
};


/** 
 * Creates file logger,  
 * label is also used as filename 
 */
export const createFileLogger = (label: string, sizeMb = 10) => winston.createLogger({
    transports: getEnv("NODE_ENV") === "production" ? [
        new winston.transports.File({ filename: `logs/${label}.log`, maxsize: sizeMb * 1024 * 1024, level: "http" }),
    ] : [
        new winston.transports.File({ filename: `logs/${label}.log`, maxsize: sizeMb * 1024 * 1024, level: "silly" }),
        new winston.transports.Console({ level: "debug" }),
    ],
    format: winston.format.combine(
        winston.format.label({ label }),
        winston.format.timestamp(),
        winston.format.json(),
    ),
});