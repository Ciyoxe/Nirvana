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