import "dotenv/config";
import express      from "express";
import cookieParser from "cookie-parser";

import { createFileLogger } from "./utils";

import rateLimit from "express-rate-limit";
import authMiddleware from "./api/auth/middleware";

import authRouter from "./api/auth/router";
import filesRouter from "./api/files/router";
import profileRouter from "./api/profiles/router";
import chatsRouter from "./api/chats/router";
import eventsRouter from "./api/events/router";
import postsRouter from "./api/posts/router";
import commentsRouter from "./api/comments/router";

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

.use("/api/file", authMiddleware, filesRouter)

.use("/api/profile", authMiddleware, apiRateLimit, profileRouter)
.use("/api/chat", authMiddleware, apiRateLimit, chatsRouter)
.use("/api/event", authMiddleware, apiRateLimit, eventsRouter)
.use("/api/post", authMiddleware, apiRateLimit, postsRouter)
.use("/api/comment", authMiddleware, apiRateLimit, commentsRouter)

.use((req, res) => res.sendFile("index.html", { root: "public" }))

.listen(3000, () => 
    console.log("Listening on port 3000")
);
