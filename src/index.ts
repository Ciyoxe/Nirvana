import "dotenv/config";
import express from "express";

import auth_router from "./api/auth/router";
import auth_midw   from "./api/auth/middleware";
import { createFileLogger } from "./utils";


const logger = createFileLogger("requests", 100);

express()

.use(express.static("public"))

.use((req, res, next) => {
    const contLen = parseInt(req.headers["content-length"] ?? '0');
    logger.http({
        ip  : req.ip,
        ua  : req.headers["user-agent"],
        len : contLen,
        ref : req.headers["referer"],
        met : req.method,
        url : req.url,
        cnt : new String(req.body).slice(0, Math.min(contLen, 100)),
    });
    next();
})

.use("/api/auth", auth_router)

.listen(3000, () => 
    console.log("Listening on port 3000")
);
