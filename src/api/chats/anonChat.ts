import { ObjectId } from "mongodb";
import { conversations, messages, profiles } from "../../database/collections";
import { pushEvent } from "../events/events";

type Filter = {
    gender    : "m" | "f" | null,
    minAge    : number | null,
    maxAge    : number | null,
    minRating : number | null,
    maxRating : number | null,
}
type AnonChatInfo = {
    gender : "m" | "f" | null,
    age    : number | null,

    rating : number,
    profile: ObjectId,
    blocked: Set<ObjectId>,

    filter : Filter,
}

function matches(self: AnonChatInfo, other: AnonChatInfo) {
    if (self.filter.gender !== null && self.filter.gender !== other.gender)
        return false;

    if (self.filter.minAge !== null && (other.age === null || self.filter.minAge > other.age))
        return false;
    if (self.filter.maxAge !== null && (other.age === null || self.filter.maxAge < other.age))
        return false;

    if (self.filter.minRating !== null && (other.rating === null || self.filter.minRating > other.rating))
        return false;
    if (self.filter.maxRating !== null && (other.rating === null || self.filter.maxRating < other.rating))
        return false;

    if (self.blocked.has(other.profile))
        return false;

    return true;
}



// users can report or rate its chat partners even after chat is closed, so we need to keep info
// key - string repr of chat id
const chatsCache = new Map<string, { chat: ObjectId, users:[ObjectId, ObjectId], finished: Date | null }>();
setInterval(() => {
    const deleted = [] as string[];
    const now     = new Date().getTime();

    for (const [chatId, cache] of chatsCache) {
        if (cache.finished === null)
            continue;
        if (now - cache.finished.getTime() > 1000 * 60 * 10)
            deleted.push(chatId);
    }
    for (const id of deleted) {
        chatsCache.delete(id);
    }
}, 1000 * 60);


const AnonChatQueue =  {
    _queue       : [] as AnonChatInfo[],

    enter(user: AnonChatInfo) {
        for (let i = 0; i < this._queue.length; i++) {
            const partner = this._queue[i];

            if (user.profile.equals(partner.profile))
                throw new Error("User already in queue");

            if (matches(user, partner) && matches(partner, user)) {
                this._queue.splice(i, 1);

                anonChatPairFound(user, partner);
                return;
            }
        }
        this._queue.push(user);
    },
    leave(userProfile: ObjectId) {
        for (let i = 0; i < this._queue.length; i++) {
            if (this._queue[i].profile.equals(userProfile)) {
                this._queue.splice(i, 1);
                return;
            }
        }
    },
}

async function anonChatPairFound(a: AnonChatInfo, b: AnonChatInfo) {
    const newChat = await conversations.insertOne({
        name        : "Anonymous",
        type        : "anonymous",
        participants: [a.profile, b.profile],
        lastUpdate  : new Date(),
        preview     : null,
    });

    chatsCache.set(newChat.insertedId.toHexString(), { chat: newChat.insertedId, users: [a.profile, b.profile], finished: null });

    pushEvent(a.profile, {
        type        : "anon-chat-enter",
        chatId: newChat.insertedId.toHexString()
    });
    pushEvent(b.profile, {
        type        : "anon-chat-enter",
        chatId: newChat.insertedId.toHexString()
    });
}

export type AnonChatRequest = {
    gender : "m" | "f" | null,
    age    : number | null,
    filter : Filter,
}
export async function enterQueue(selfId: ObjectId, info: AnonChatRequest) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    AnonChatQueue.enter({
        gender    : info.gender,
        age       : info.age,
        filter    : info.filter,
        profile   : profile._id,
        rating    : profile.rating,
        blocked   : new Set(profile.blockedChats),
    });
}
export async function leaveQueue(selfId: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    AnonChatQueue.leave(profile._id);
}


export async function leaveChat(selfId: ObjectId, conversation: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const deleted = await conversations.findOneAndDelete({ _id: conversation, type: "anonymous", participants: { $in: [profile._id] } });
    if (!deleted)
        throw new Error("You can leave only your chats");
    
    await messages.deleteMany({ chat: conversation });

    for (const user of deleted.participants) {
        if (user.equals(profile._id))
            continue;
        pushEvent(profile._id, {
            type  : "anon-chat-finished",
            chatId: conversation.toHexString()
        });
    }

    const cache = chatsCache.get(conversation.toHexString());
    if (cache) {
        cache.finished = new Date();
    }
}

export async function rateUser(selfId: ObjectId, conversation: ObjectId, rating: "up" | "down") {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const chat = chatsCache.get(conversation.toHexString());
    if (!chat)
        return;
    if (chat.users.find(u => u.equals(profile._id)) === undefined)
        throw new Error("Chat not found");

    const rateWeight = 0.1;
    const normRating = (profile.rating + 10) / 20; // -10..10 -> 0..1
    const rateFactor = Math.min(1, normRating * 2);
    const rateSign   = rating === "up" ? 1 : -1;
    const rateBias   = rateWeight * rateFactor * rateSign;

    await profiles.updateOne({ _id: profile._id }, [
        {
            $set: {
                rates: {
                    // clamp 0..10
                    $min: [10, { $max: [0, { $add: [-1, "$rates"] }] }],
                }
            }
        }
    ]);
    for (const user of chat.users) {
        if (user.equals(profile._id))
            continue;
        await profiles.updateOne({ _id: user }, [
            {
                $set: {
                    rating: {
                        // clamp -10..10
                        $min: [10, { $max: [-10, { $add: [rateBias, "$rating"] }] }],
                    }
                }
            }
        ]);
    }
}

export async function blockUser(selfId: ObjectId, conversation: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const chat = chatsCache.get(conversation.toHexString());
    if (!chat)
        return;
    if (chat.users.find(u => u.equals(profile._id)) === undefined)
        throw new Error("Chat not found");

    for (const user of chat.users) {
        if (user.equals(profile._id))
            continue;
        await profiles.updateOne({ _id: profile._id }, { $push: { blockedChats: user } });
    }
}
