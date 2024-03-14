import express from "express";
import rateLimit from "express-rate-limit";
import z from "zod";

import { authorize, register } from "./tokens";
import { usernameExists } from "./verification";
import { ErrorHanlder, errorToString } from "../../utils";


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

.use(express.json({ limit : "100kb" }))

.post("/username-exists", softLimit, async (req, res) => {
    const request = await usernameCheckRequest.parseAsync(req.body);
    const exists  = await usernameExists(request.username);

    res.json({ exists });
})

.post("/login", hardLimit, async (req, res) => {
    const request = await authRequest.parseAsync(req.body);
    const token   = await authorize(
        request.username,
        request.password,
    );

    if (!token) {
        res.status(401).send("Wrong credentials");
        return;
    }

    res.cookie("jwt", token, { 
        expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        httpOnly : true, 
        secure   : false // TODO: make true
    });
    res.json({ success: true });
})

.post("/signup", hardLimit, async (req, res) => {
    const request = await authRequest.parseAsync(req.body);
    const token   = await register(
        request.username,
        request.password,
    );

    if (!token) {
        res.status(401).send("Wrong credentials");
        return;
    }

    res.cookie("jwt", token, { 
        expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        httpOnly : true, 
        secure   : false // TODO: make true
    });
    res.json({ success: true });
})

.post("/logout", hardLimit, (req, res) => {
    res.clearCookie("jwt");
    res.json({ success: true });
})

.use(ErrorHanlder((err, req, res, next) => {
    res.status(400).send(errorToString(err));
}))





