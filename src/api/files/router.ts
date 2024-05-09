import { rateLimit } from 'express-rate-limit';
import { ErrorHanlder } from './../../utils';
import { createFileLogger, errorToString } from "../../utils";

import express from "express";
import multer  from "multer";

import path from "path";
import crypto from "crypto";

const uploadLimit = rateLimit({
    windowMs : 20000,
    limit    : 10,
});
const downloadLimit = rateLimit({
    windowMs : 1000,
    limit    : 20,
});

const logger  = createFileLogger("files", 50);
const storage = multer.diskStorage({
    destination : (req, file, cb) => cb(null, "uploads/"),
    filename    : (req, file, cb) => {
        cb(null, crypto.randomBytes(32).toString("hex") + path.extname(file.originalname));
    },
});


const uploader = multer({
    storage,
    limits: {
        parts    : 1,
        fileSize : 10 * 1024 * 1024, // 10mb
    }
})

export default express.Router()

.post("/", uploadLimit, uploader.single("file"), (req, res, next) => {
    try {
        if (!req.file)
            throw new Error("No file uploaded");

        logger.info("Uploaded file: " + req.file.originalname.substring(0, 256));
        res.json({ success: true, url: "/api/files/" + req.file.filename });
    }
    catch (err) { next(err) }
})

.get("/:filename", downloadLimit, (req, res, next) => {
    try {
        if (!req.params.filename)
            throw new Error("No filename provided");

        logger.info("Downloaded file: " + req.params.filename.substring(0, 256));
        res.sendFile(req.params.filename, { root: "uploads/" });
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next)=>{
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
