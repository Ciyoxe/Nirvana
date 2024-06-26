import z         from "zod";
import express   from "express";

import { errorToString, createFileLogger, ErrorHanlder } from "../../utils";
import { ObjectId } from "mongodb";
import { block, rateUser, createProfile, deleteProfile, getProfileList, setActiveProfile, subscribe, unblock, unblockAll, unsubscribe, unsubscribeAll, getProfileInfo, updateProfile } from "./profiles";


const logger = createFileLogger("profiles");

const createProfileRequest = z.object({
    name   : z.string().min(1).max(64),
    about  : z.string().max(4096).nullable().optional(),
    avatar : z.string().max(4096).nullable().optional(),
    banner : z.string().max(4096).nullable().optional(),
});
const profileActionRequest = z.object({
    profileId : z.string().min(1).max(32),
});
const rateRequest = z.object({
    rating   : z.enum(["up", "down"]),
    profileId: z.string().length(24),
});
const updateRequest = z.object({
    name   : z.string().min(1).max(64).optional(),
    about  : z.string().max(4096).nullable().optional(),
    avatar : z.string().max(4096).nullable().optional(),
    banner : z.string().max(4096).nullable().optional(),
})

export default express.Router()

// max request size: 512 + 256 symbols, max 4 bytes per symbol + json structure
.use(express.json({ limit: "5kb" }))

.get("/:id", async (req, res, next) => {
    try {
        const profile = await getProfileInfo(req.user as ObjectId, new ObjectId(req.params.id));

        res.json(profile);

        logger.info(`Get profile info: ${(req.user as ObjectId).toHexString()} ${req.params.id}`);
    }
    catch (err) { next(err) }
})
.post("/", async (req, res, next) => {
    try {
        const request = await createProfileRequest.parseAsync(req.body);
        const profile = await createProfile(
            req.user as ObjectId, 
            request.name, 
            request.avatar ?? null,
            request.about  ?? null,
            request.banner ?? null
        );

        res.json({ profileId: profile });

        logger.info(`Create profile: ${request.name} ${(req.user as ObjectId).toHexString()}`);
    } 
    catch (err) { next(err) }
})
.delete("/:id", async (req, res, next) => {
    try {
        const activeId = await deleteProfile(req.user as ObjectId, new ObjectId(req.params.id));
        
        res.json({ activeId });

        logger.info(`Delete profile: ${(req.user as ObjectId).toHexString()}`);
    } 
    catch (err) { next(err) }
})
.patch("/:id", async (req, res, next) => {
    try {
        const request = await updateRequest.parseAsync(req.body);
        await updateProfile(req.user as ObjectId, new ObjectId(req.params.id), request);

        res.json({ success: true });

        logger.info(`Update profile: ${(req.user as ObjectId).toHexString()} ${req.params.id}`);
    }
    catch (err) { next(err) }
})
.post("/get-list", async (req, res, next) => {
    try {
        const profiles = await getProfileList(req.user as ObjectId);

        res.json({ profiles });

        logger.info(`Get profile list: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})
.post("/set-active", async (req, res, next) => {
    try {
        const request = await profileActionRequest.parseAsync(req.body);
        await setActiveProfile(req.user as ObjectId, new ObjectId(request.profileId));
        
        res.json({ success: true });

        logger.info(`Set active profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
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
.post("/rate", async (req, res, next) => {
    try {
        const request = await rateRequest.parseAsync(req.body);
        await rateUser(req.user as ObjectId, new ObjectId(request.profileId), request.rating);
        
        res.json({ success: true });

        logger.info(`Rate profile: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));

