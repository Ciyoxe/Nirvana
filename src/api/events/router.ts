import express from "express";
import { SSE, getProfileId } from "./events";
import { ObjectId } from "mongodb";
import { ErrorHanlder, createFileLogger, errorToString } from "../../utils";


const logger = createFileLogger("events", 50);

export default express.Router()

.get("/", async (req, res, next) => {
    try {
        res.writeHead(200, {
            'Content-Type'  : 'text/event-stream',
            'Connection'    : 'keep-alive',
            'Cache-Control' : 'no-cache'
        });
        const profileId = await getProfileId(req.user as ObjectId);

        const hanlder = (event: any)=> {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        SSE.on(profileId, hanlder);

        req.on("close", ()=> SSE.off(profileId, hanlder));

        logger.info(`Get events: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
