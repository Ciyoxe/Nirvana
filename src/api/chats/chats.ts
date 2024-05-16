import { conversations, profiles, messages } from './../../database/collections';
import { ObjectId, WithId } from "mongodb";
import { Conversation, Message } from '../../database/types';
import { pushEvent } from '../events/events';


export async function loadChats(selfId: ObjectId, count: number, offset: number) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const allChats = await conversations.countDocuments({ participants: { $in: [profile._id] } });
    const chats    = await conversations.aggregate([
        {
            $match: { participants: { $in: [profile._id] } },
        },
        {
            $sort: {lastUpdate: -1}
        },
        { $skip: offset },
        { $limit: count },
    ]).toArray() as WithId<Conversation>[];

    return {
        count: allChats,
        chats: chats.map(chat => ({
            id      : chat._id,
            type    : chat.type,
            name    : chat.name,
            preview : chat.preview,
            lastDate: chat.lastUpdate,
        }))
    };
}

export async function loadMessages(selfId: ObjectId, conversation: ObjectId, count: number, offset: number) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");
    const chat = await conversations.findOne({ _id: conversation, participants: { $in: [profile._id] } });
    if (!chat)
        throw new Error("Chat not found");
    
    const allMessages = await messages.countDocuments({ chat: chat._id });
    const messageDocs = await messages.aggregate([
        {
            $match: { chat: chat._id }
        },
        {
            $sort: { created: -1 }
        },
        { $skip: offset },
        { $limit: count },
    ]).toArray() as WithId<Message>[];

    return {
        count   : allMessages,
        messages: messageDocs.map(m => ({
            id     : m._id,
            text   : m.text,
            sender : m.sender,
            created: m.created,
        }))
    }
}

export async function sendMessage(selfId: ObjectId, conversation: ObjectId, text: string) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const updated = await conversations.findOneAndUpdate({ _id: conversation, participants: { $in: [profile._id] } }, {
        $set:  { 
            lastUpdate: new Date(),
            preview   : text.substring(0, 256),
        },
    });
    if (!updated)
        throw new Error("Wrong chat id");

    const created = new Date();
    const newMessage = await messages.insertOne({
        chat   : conversation,
        sender : profile._id,
        created,
        text,
    });

    for (const participant of updated.participants) {
        if (participant.equals(profile._id))
            continue;
        pushEvent(participant, {
            type    : 'message',
            senderId: profile._id.toHexString(),
            chatId  : conversation.toHexString(),
            created,
            text,
        });
    }

    return newMessage.insertedId;
}