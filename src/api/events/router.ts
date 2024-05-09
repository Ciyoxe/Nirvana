import express from "express";
import { consume, subscribe } from "./events";
import { ObjectId } from "mongodb";
import { ErrorHanlder, createFileLogger, errorToString } from "../../utils";


const logger = createFileLogger("events", 50);

export default express.Router()

.post("/subscribe", async (req, res, next) => {
    try {
        await subscribe(req.user as ObjectId);

        res.json({ success: true });

        logger.info(`Subscribed: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.get("/", async (req, res, next) => {
    try {
        const controller = new AbortController();

        req.once("close", controller.abort);
        res.once("close", controller.abort);

        res.json({
            events: await consume(req.user as ObjectId, controller.signal),
        });
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
