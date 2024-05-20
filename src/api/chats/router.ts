import z from "zod";
import express from "express";
import { ObjectId } from "mongodb";

import { ErrorHanlder, createFileLogger, errorToString } from "../../utils";

import { loadChats, loadMessages, sendMessage } from "./chats";
import { getPersonalChat, deletePersonalChat } from "./personalChat";
import { blockUser, enterQueue, leaveChat, leaveQueue, rateUser } from "./anonChat";

const logger = createFileLogger("chats", 50);

const sendMessageRequest = z.object({
    chatId : z.string().length(24),
    text   : z.string().min(1).max(4096),
});
const loadChatsRequest = z.object({
    count  : z.number().min(1).max(100),
    offset : z.number().min(0),
});
const loadMessagesRequest = z.object({
    chatId : z.string().length(24),
    count  : z.number().min(1).max(100),
    offset : z.number().min(0),
});
const createChatRequest = z.object({
    profileId: z.string().length(24),
});
const chatActionRequest = z.object({
    chatId: z.string().length(24),
});
const enterAnonChatRequest = z.object({
    gender: z.enum(["m", "f"]).nullable(),
    age   : z.number().min(0).max(100).nullable(),
    filter: z.object({
        gender    : z.enum(["m", "f"]).nullable(),
        minAge    : z.number().min(0).max(100).nullable(),
        maxAge    : z.number().min(0).max(100).nullable(),
        minRating : z.number().min(-10).max(10).nullable(),
        maxRating : z.number().min(-10).max(10).nullable(),
    })
});
const rateAnonChatRequest = z.object({
    chatId: z.string().length(24),
    rate  : z.enum(["up", "down"]),
});

export default express.Router()

.use(express.json({ limit: "20kb" }))

.post("/send-message", async (req, res, next) => {
    try {
        const request = await sendMessageRequest.parseAsync(req.body);
        const message = await sendMessage(req.user as ObjectId, ObjectId.createFromHexString(request.chatId), request.text);

        res.json({ message });
    }
    catch (err) { next(err) }
})
.post("/load-chats", async (req, res, next) => {
    try {
        const request = await loadChatsRequest.parseAsync(req.body);
        const chats   = await loadChats(req.user as ObjectId, request.count, request.offset);

        res.json(chats);
        
        logger.info(`Load chats: ${(req.user as ObjectId).toHexString()} ${request.count} ${request.offset}`);
    }
    catch (err) { next(err) }
})
.post("/load-messages", async (req, res, next) => {
    try {
        const request  = await loadMessagesRequest.parseAsync(req.body);
        const messages = await loadMessages(req.user as ObjectId, ObjectId.createFromHexString(request.chatId), request.count, request.offset);

        res.json(messages);
        
        logger.info(`Load messages: ${(req.user as ObjectId).toHexString()} ${request.count} ${request.offset}`);
    }
    catch (err) { next(err) }
})

.post("/personal", async (req, res, next) => {
    try {
        const request = await createChatRequest.parseAsync(req.body);
        const chatId  = await getPersonalChat(req.user as ObjectId, ObjectId.createFromHexString(request.profileId));

        res.json({ chatId: chatId.toHexString() });

        logger.info(`Create personal chat: ${(req.user as ObjectId).toHexString()} ${request.profileId}`);
    }
    catch (err) { next(err) }
})
.delete("/personal", async (req, res, next) => {
    try {
        const request = await chatActionRequest.parseAsync(req.body);
        await deletePersonalChat(req.user as ObjectId, ObjectId.createFromHexString(request.chatId));

        res.json({ success: true });

        logger.info(`Delete personal chat: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/anonymous/enter-queue", async (req, res, next) => {
    try {
        const request = await enterAnonChatRequest.parseAsync(req.body);
        await enterQueue(req.user as ObjectId, request);

        res.json({ success: true });

        logger.info(`Enter anon chat queue: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/anonymous/leave-queue", async (req, res, next) => {
    try {
        await leaveQueue(req.user as ObjectId);

        res.json({ success: true });

        logger.info(`Leave anon chat queue: ${(req.user as ObjectId).toHexString()}`);
    }    
    catch (err) { next(err) }
})

.post("/anonymous/leave-chat", async (req, res, next) => {
    try {
        const request = await chatActionRequest.parseAsync(req.body);
        await leaveChat(req.user as ObjectId, ObjectId.createFromHexString(request.chatId));

        res.json({ success: true });

        logger.info(`Leave anon chat: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/anonymous/rate", async (req, res, next) => {
    try {
        const request = await rateAnonChatRequest.parseAsync(req.body);
        await rateUser(req.user as ObjectId, ObjectId.createFromHexString(request.chatId), request.rate);

        res.json({ success: true });

        logger.info(`Rate user: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.post("/anonymous/block", async (req, res, next) => {
    try {
        const request = await chatActionRequest.parseAsync(req.body);
        await blockUser(req.user as ObjectId, ObjectId.createFromHexString(request.chatId));

        res.json({ success: true });

        logger.info(`Block user: ${(req.user as ObjectId).toHexString()}`);
    }
    catch (err) { next(err) }
})

.use(ErrorHanlder((err, req, res, next) => {
    logger.info("Error: " + errorToString(err));
    res.status(400).json({ error: errorToString(err) });
}));
