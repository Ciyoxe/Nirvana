import { conversations } from './../../database/collections';
import { ObjectId } from "mongodb";
import { profiles } from "../../database/collections";

export type Event = {
    id         : string,
    type       : "message",
    senderId   : string | null,
    senderName : string,
    chatId     : string,
    created    : Date,
    text       : string,
} | {
    type       : "anon-chat-enter" | "anon-chat-finished",
    chatId     : string,
};

export const SSE = {
    _handlers   : new Map<string, { handlers: ((event: Event) => void)[], updater: NodeJS.Timeout }>(),

    on(profileId: string, handler: (event: Event) => void) {
        if (!this._handlers.has(profileId))
            this._handlers.set(profileId, {
                handlers: [],
                updater : setInterval(()=> profiles.updateOne({ _id: new ObjectId(profileId) }, {
                    $set: { online: new Date() }
                }), 1000 * 60 * 10)
            });
        this._handlers.get(profileId)!.handlers.push(handler);
    },
    off(profileId: string, handler: (event: Event) => void) {
        const eventData = this._handlers.get(profileId);
        if (eventData) {
            const index = eventData.handlers.indexOf(handler);
            if (index !== -1)
                eventData.handlers.splice(index, 1);
            if (eventData.handlers.length === 0) {
                clearInterval(eventData.updater);
                this._handlers.delete(profileId);
            }
        }
    },
    emit(profileId: string, event: Event) {
        const eventData = this._handlers.get(profileId);
        if (eventData) {
            for (const handler of eventData.handlers) {
                handler(event);
            }
        }
    }
};

export async function getProfileId(selfId: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true }, { projection: { _id: 1 } });
    if (!profile)
        throw new Error("Profile not found");
    return profile._id.toHexString();
}

export function pushEvent(profileId: ObjectId, event: Event) {
    SSE.emit(profileId.toString(), event);
}
