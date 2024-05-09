import "dotenv/config";
import express      from "express";
import cookieParser from "cookie-parser";

import { createFileLogger } from "./utils";

import rateLimit from "express-rate-limit";
import authMiddleware from "./api/auth/middleware";

import authRouter from "./api/auth/router";
import filesRouter from "./api/files/router";
import profileRouter from "./api/profiles/router";

const apiRateLimit = rateLimit({
    limit    : 10,
    windowMs : 1000,
});
const logger = createFileLogger("requests", 100);

express()


.use(express.static("public"))
.use(cookieParser())

.use((req, res, next) => {
    const contLen = parseInt(req.headers["content-length"] ?? '0');
    logger.http({
        ip  : req.ip,
        ua  : req.headers["user-agent"],
        len : contLen,
        ref : req.headers["referer"],
        met : req.method,
        url : req.url,
    });
    next();
})

.use("/api/auth", authRouter)

.use(authMiddleware)
// fils api uses auth, but has own limits
.use("/api/file", filesRouter)

.use(apiRateLimit)
.use("/api/profile", profileRouter)


.listen(3000, () => 
    console.log("Listening on port 3000")
);
