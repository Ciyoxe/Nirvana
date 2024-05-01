import "dotenv/config";
import express      from "express";
import cookieParser from "cookie-parser";

import { createFileLogger } from "./utils";

import authRouter from "./api/auth/router";
import filesRouter from "./api/files/router";



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

.use("/api/files", filesRouter)


.listen(3000, () => 
    console.log("Listening on port 3000")
);
