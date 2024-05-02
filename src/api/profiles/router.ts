import z         from "zod";
import express   from "express";
import rateLimit from "express-rate-limit";

import authMiddleware from "../auth/middleware";
import { errorToString, createFileLogger, ErrorHanlder } from "../../utils";
import { ObjectId } from "mongodb";
import { block, createProfile, deleteProfile, getProfile, getProfileList, setActiveProfile, setAvatar, setBanner, subscribe, unblock, unblockAll, unsubscribe, unsubscribeAll } from "./profiles";


const logger = createFileLogger("profiles");
const limit  = rateLimit({
    windowMs : 1000,
    limit    : 5,
})


const createProfileRequest = z.object({
    name   : z.string().min(1).max(64),
    avatar : z.string().min(1).max(512).nullable().optional(),
});
const setAvatarRequest = z.object({
    avatar : z.string().min(1).max(512).nullable(),
});
const setBannerRequest = z.object({
    banner : z.string().min(1).max(512).nullable(),
});
const profileActionRequest = z.object({
    profileId : z.string().min(1).max(32),
});


export default express.Router()

// max request size: 512 + 256 symbols, max 4 bytes per symbol + json structure

.use(limit)
.use(authMiddleware)
.use(express.json({ limit: "5kb" }))


.get("/", async (req, res, next) => {
    try {
        const profile = await getProfile(req.user as ObjectId);

        res.json(profile);

        logger.info(`Get profile: ${profile.name} ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})
.post("/", async (req, res, next) => {
    try {
        const request = await createProfileRequest.parseAsync(req.body);
        const profile = await createProfile(req.user as ObjectId, request.name, request.avatar ?? null);

        res.json({ profileId: profile });

        logger.info(`Create profile: ${request.name} ${(req.user as ObjectId).toHexString()}`);
    } 
    catch (err) { next(err) }
})
.delete("/", async (req, res, next) => {
    try {
        await deleteProfile(req.user as ObjectId);
        
        res.json({ success: true });

        logger.info(`Delete profile: ${(req.user as ObjectId).toHexString()}`);
    } 
    catch (err) { next(err) }
})
.get("/list", async (req, res, next) => {
    try {
        const profiles = await getProfileList(req.user as ObjectId);

        res.json(profiles);

        logger.info(`Get profile list: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.patch("/active", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await setActiveProfile(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Set active profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.patch("/avatar", async (req, res, next) => {
    try {
        const request = await setAvatarRequest.parseAsync(req.body);
        await setAvatar(req.user as ObjectId, request.avatar);

        res.json({ success: true });

        logger.info(`Set avatar: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})
.patch("/banner", async (req, res, next) => {
    try {
        const request = await setBannerRequest.parseAsync(req.body);
        await setBanner(req.user as ObjectId, request.banner);

        res.json({ success: true });

        logger.info(`Set banner: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/subscribe", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await subscribe(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Subscribe profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.post("/unsubscribe", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await unsubscribe(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Unsubscribe profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.post("/unsubscribe-all", async (req, res, next) => {
    try {
        await unsubscribeAll(req.user as ObjectId);
        
        res.json({ success: true });

        logger.info(`Unsubscribe all profiles: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/block", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await block(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Block profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.post("/unblock", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await unblock(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Unblock profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.post("/unblock-all", async (req, res, next) => {
    try {
        await unblockAll(req.user as ObjectId);
        
        res.json({ success: true });

        logger.info(`Unblock all profiles: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));

