import { ErrorHanlder } from './../../utils';
import { createFileLogger, errorToString } from "../../utils";

import express from "express";
import z from 'zod';
import { deletePost, getPost, loadPosts, publish, ratePost } from './posts';
import { ObjectId } from 'mongodb';

const contentImage = z.object({
    type: z.literal("image"),
    file: z.string().max(4096),
    desc: z.string().max(1024),
});
const contentText = z.object({
    type  : z.literal("text"),
    text  : z.string(),
    size  : z.number().min(0.1).max(10),
    color : z.string().regex(/^\#[0-9a-fA-F]{6}$/).nullable(),
    align : z.enum(["left", "center", "right"]),
    style : z.enum(["normal", "bold", "italic", "underline", "strikethrough"]),
});
const publishRequest = z.object({
    header  : z.string().min(1).max(256),
    about   : z.string().max(16384).nullable(),
    public  : z.boolean(),
    content : z.array(z.union([contentImage, contentText])).min(1),
});

const loadFeedRequest = z.object({
    minRating: z.number().min(-10).max(10),
    maxRating: z.number().min(-10).max(10),
    count    : z.number().min(1).max(100),
    offset   : z.number().min(0),
    feed     : z.enum(["public", "personal"]),
});
const loadUserRequst = z.object({
    count    : z.number().min(1).max(100),
    offset   : z.number().min(0),
    feed     : z.literal("author"),
    profileId: z.string().length(24),
});
const loadRequest = z.union([loadFeedRequest, loadUserRequst]);


const rateRequest = z.object({
    rating : z.enum(["up", "down"]),
    postId : z.string().length(24),
});

const logger  = createFileLogger("posts", 50);

export default express.Router()

.use(express.json({ limit: "10mb" }))

.post("/", async (req, res, next) => {
    try {
        const request = await publishRequest.parseAsync(req.body);
        const postId  = await publish(req.user as ObjectId, request);

        res.json({ postId });

        logger.info(`Publish post: ${(req.user as ObjectId).toHexString()}, ${postId}`);
    }
    catch (err) { next(err) }
})

.get("/:id", async (req, res, next) => {
    try {
        const id   = req.params.id;
        const post = await getPost(req.user as ObjectId, id);

        res.set({
            "Cache-Control": "public, max-age=1000, s-maxage=1000",
            "Expires"      : new Date(Date.now() + 1000 * 1000).toUTCString(),
        });
        res.json(post);

        logger.info(`Get post: ${(req.user as ObjectId).toHexString()}, ${id}`);
    }
    catch (err) { next(err) }
})

.delete("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        await deletePost(req.user as ObjectId, id);

        res.json({ success: true });

        logger.info(`Delete post: ${(req.user as ObjectId).toHexString()}, ${id}`);
    }
    catch (err) { next(err) }
})

.post("/load-list", async (req, res, next) => {
    try {
        const request = await loadRequest.parseAsync(req.body);
        const list    = await loadPosts(req.user as ObjectId, request);

        res.json(list);

        logger.info(`Get post list: ${(req.user as ObjectId).toHexString()}, ${request.offset} ${request.count} ${request.feed}`);
    }
    catch (err) { next(err) }
})

.post("/rate", async (req, res, next) => {
    try {
        const request = await rateRequest.parseAsync(req.body);
        await ratePost(req.user as ObjectId, request.postId, request.rating);
        
        res.json({ success: true });

        logger.info(`Rate post: ${(req.user as ObjectId).toHexString()}, ${request.postId} ${request.rating}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next)=>{
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
