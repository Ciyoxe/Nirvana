import { conversations } from './../../database/collections';
import { ObjectId } from "mongodb";
import { profiles } from "../../database/collections";

export type Event = {
    id       : string,
    type     : "message",
    senderId : string | null,
    chatId   : string,
    created  : Date,
    text     : string,
} | {
    type     : "anon-chat-enter" | "anon-chat-finished",
    chatId   : string,
};

type ProfileEvents = {
    events   : Event[],
    lastRead : Date,
    updateCb : () => void,
};

export const SSE = {
    _handlers: new Map<string, ((event: Event) => void)[]>(),

    on(profileId: string, handler: (event: Event) => void) {
        if (!this._handlers.has(profileId))
            this._handlers.set(profileId, []);
        this._handlers.get(profileId)!.push(handler);
    },
    off(profileId: string, handler: (event: Event) => void) {
        const handlers = this._handlers.get(profileId);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1)
                handlers.splice(index, 1);
        }
    },
    emit(profileId: string, event: Event) {
        const handlers = this._handlers.get(profileId);
        if (handlers) {
            for (const handler of handlers) {
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

setInterval(()=> {
    const deteled = [] as string[];

    for (const [id, handlers] of SSE._handlers) {
        if (handlers.length === 0)
            deteled.push(id);
    }
    for (const id of deteled) {
        SSE._handlers.delete(id);
    }
}, 1000 * 60 * 5);
