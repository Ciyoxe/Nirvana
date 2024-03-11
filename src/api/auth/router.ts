import express   from "express";
import rateLimit from "express-rate-limit";
import {
    authorize,
    register,
} from "./tokens";
import {
    usernameExists
} from "./verification";


const strict_limit = rateLimit({
    windowMs : 5000 * 60, // 5 min,
    limit    : 5,
});
const medium_limit = rateLimit({
    windowMs : 1000 * 20, // 20 sec,
    limit    : 5,
});

export default express.Router()

.get("/username-exists", medium_limit, async (req, res) => {
    try {
        res.json({
            exists : await usernameExists(req.body.username.toString()),
        });
    }
    catch (err) {
        res.status(400).send(err);
    }
})

.post("/login", strict_limit, async (req, res) => {
    try {
        const token = await authorize(
            req.body.username.toString(),
            req.body.password.toString(),
        );
        if (token === null) {
            res.status(401).send("Wrong credentials");
        }

        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true, 
            secure   : false // TODO: make true
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).send(err);
    }
})

.post("/signup", strict_limit, async (req, res) => {
    try {
        const token = await register(
            req.body.username.toString(),
            req.body.password.toString(),
        );
        res.cookie("jwt", token, { 
            expires  : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly : true, 
            secure   : false // TODO: make true
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).send(err);
    }
})

.post("/logout", strict_limit, (req, res) => {
    res.clearCookie("jwt");
    res.json({ success: true });
});






