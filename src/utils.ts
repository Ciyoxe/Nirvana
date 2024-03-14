import { ErrorRequestHandler } from "express";
import z from "zod";

/** helper for type infer */
export const ErrorHanlder = (f: ErrorRequestHandler)=> f;


/** Converts any error object to a string message */
export const errorToString = (error: any) => {
    if (error instanceof z.ZodError) 
        return error.issues[0].message;
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