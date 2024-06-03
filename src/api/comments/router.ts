import { ErrorHanlder } from './../../utils';
import { createFileLogger, errorToString } from "../../utils";

import express from "express";
import z from 'zod';
import { ObjectId } from 'mongodb';
import { deleteComment, loadComments, publish, rateComment } from './comments';

const publishRequest = z.object({
    text   : z.string().min(1).max(4096),
    replyTo: z.string().length(24).nullable(),
    postId : z.string().length(24),
});

const loadRequest = z.object({
    minRating: z.number().min(-10).max(10),
    maxRating: z.number().min(-10).max(10),
    count    : z.number().min(1).max(100),
    offset   : z.number().min(0),
    postId   : z.string().length(24),
});

const rateRequest = z.object({
    rating    : z.enum(["up", "down"]),
    commentId : z.string().length(24),
});

const logger  = createFileLogger("comments", 50);

export default express.Router()

.use(express.json({ limit: "10mb" }))

.post("/", async (req, res, next) => {
    try {
        const request    = await publishRequest.parseAsync(req.body);
        const commentId  = await publish(req.user as ObjectId, request);

        res.json({ commentId });

        logger.info(`Publish comment: ${(req.user as ObjectId).toHexString()}, ${commentId}`);
    }
    catch (err) { next(err) }
})

.delete("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;

        await deleteComment(req.user as ObjectId, id);

        res.json({ success: true });

        logger.info(`Delete comment: ${(req.user as ObjectId).toHexString()}, ${id}`);
    }
    catch (err) { next(err) }
})

.post("/load-list", async (req, res, next) => {
    try {
        const request = await loadRequest.parseAsync(req.body);
        const list    = await loadComments(req.user as ObjectId, request);

        res.json(list);

        logger.info(`Get comment list: ${(req.user as ObjectId).toHexString()}, ${request.offset} ${request.count} ${request.postId}`);
    }
    catch (err) { next(err) }
})

.post("/rate", async (req, res, next) => {
    try {
        const request = await rateRequest.parseAsync(req.body);
        await rateComment(req.user as ObjectId, request.commentId, request.rating);
        
        res.json({ success: true });

        logger.info(`Rate comment: ${(req.user as ObjectId).toHexString()}, ${request.commentId} ${request.rating}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next)=>{
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
