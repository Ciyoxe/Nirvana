import { ErrorHanlder } from './../../utils';
import { createFileLogger, errorToString } from "../../utils";

import express from "express";
import multer  from "multer";

import path from "path";
import crypto from "crypto";

import authMiddleware from '../auth/middleware';

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

.use(authMiddleware)

.post("/", uploader.single("file"), (req, res, next) => {
    if (req.file) {
        logger.info("Uploaded file: " + req.file.originalname.substring(0, 256));
        res.json({ success: true, filename: req.file.filename });
    }
    else {
        res.status(400).json({ error: "No file uploaded" });
    }
})

.get("/:filename", (req, res, next) => {
    if (!req.params.filename)
        res.status(400).json({ error: "No filename provided" });
    else 
        res.sendFile(req.params.filename, { root: "uploads/" });
})

.use(ErrorHanlder((err, req, res, next)=>{
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
