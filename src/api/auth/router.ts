import express from "express";
import rateLimit from "express-rate-limit";
import z from "zod";

import { authorize, register } from "./tokens";
import { usernameExists } from "./verification";
import { createFileLogger, errorToString, getEnv, ErrorHanlder } from "../../utils";


const logger = createFileLogger("auth");

const hardLimit = rateLimit({
    windowMs : 5000 * 60, // 5 min,
    limit    : 5,
});
const softLimit = rateLimit({
    windowMs : 1000 * 20, // 20 sec,
    limit    : 5,
});


const usernameCheckRequest = z.object({ 
    username: z.string().min(1).max(256),
});
const authRequest = z.object({
    username: z.string().min(1).max(256),
    password: z.string().min(1).max(2048),
});


 export default express.Router()

// max request size: 2048 + 256 symbols, max 4 bytes per symbol + json structure ~ 10kb
.use(express.json({ limit: "10kb" }))

.post("/username-exists", softLimit, async (req, res, next) => {
    try {
        const request = await usernameCheckRequest.parseAsync(req.body);
        const exists  = await usernameExists(request.username);
        
        res.json({ exists });
        
        logger.info("Checked username: " + request.username);
    }
    catch (err) { next(err) }
})

.post("/login", hardLimit, async (req, res, next) => {
    try {
        const request = await authRequest.parseAsync(req.body);
        const token   = await authorize(
            request.username,
            request.password,
        );
        
        if (!token) {
            logger.warn("Wrong credentials (login): " + request.username);
            res.status(401).json({ error: "Wrong credentials" });
            return;
        }
        
        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true, 
            sameSite : "strict",
            secure   : getEnv("NODE_ENV") === "production",
        });
        res.json({ success: true });
        
        logger.info("logging in: " + request.username);
    }
    catch (err) { next(err) }
})

.post("/signup", hardLimit, async (req, res, next) => {
    try {
        const request = await authRequest.parseAsync(req.body);
        const token   = await register(
            request.username,
            request.password,
        );
        
        if (!token) {
            logger.warn("Wrong credentials (signup): " + request.username);
            res.status(401).json({ error: "Wrong credentials" });
            return;
        }
            
        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true, 
            sameSite : "strict",
            secure   : getEnv("NODE_ENV") === "production",
        });
        res.json({ success: true });

        logger.info("signing up: " + request.username);
    }
    catch (err) { next(err) }
})

.post("/logout", hardLimit, (req, res, next) => {
    try {
        res.clearCookie("jwt");
        res.json({ success: true });
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).send(errorToString(err));
}));





