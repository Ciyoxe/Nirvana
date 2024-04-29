import rateLimit from "express-rate-limit";
import express from "express";
import z from "zod";

import {
    isNameExists,
    isUserExists,
    createUser,
    verifyUser,
    signJwt,
} from "../api/auth/auth";
import { getEnv, ErrorHanlder, errorToString } from "../utils";


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
        const exists  = await isNameExists(request.username);
        res.json({ exists });
    }
    catch (err) { next(err) }
})

.post("/login", hardLimit, async (req, res, next) => {
    try {
        const request  = await authRequest.parseAsync(req.body);
        const verified = await verifyUser(request.username, request.password);

        if (!verified) {
            throw new Error("Wrong credentials");
        }

        const token = signJwt(verified._id);
        
        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true,
            secure   : getEnv("NODE_ENV") === "production"
        });
        res.json({ success: true });
    }
    catch (err) { next(err) }
})

.post("/signup", hardLimit, async (req, res, next) => {
    try {
        const request = await authRequest.parseAsync(req.body);
        const exists  = await isNameExists(request.username);
        
        if (exists) {
            throw new Error("Username already exists");
        }
        
        const user = await createUser(request.username, request.password);

        const token = signJwt(user.insertedId);
        
        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true,
            secure   : getEnv("NODE_ENV") === "production"
        });
        res.json({ success: true });
    }
    catch (err) { next(err) }
})

.post("/logout", async (req, res, next) => {
    try {
        res.clearCookie("jwt");
        res.json({ success: true });
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    if (err)
        res.status(400).json({ error: errorToString(err) });
    else
        next();
}));
