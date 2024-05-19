import { conversations } from './../../database/collections';
import { ObjectId } from "mongodb";
import { profiles } from "../../database/collections";

export type Event = {
    type     : "message",
    senderId : string,
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

// key - string repr of profile id
const EventQueue = new Map<string, ProfileEvents>();

setInterval(clearEvents, 1000 * 30);
function clearEvents() {
    const dateNow    = new Date().getTime();
    const deleteKeys = [];

    for (const [profileId, queue] of EventQueue) {
        if (dateNow - queue.lastRead.getTime() > 5 * 60 * 1000) {
            deleteKeys.push(profileId);
        }
        else
        if (queue.events.length > 1000) {
            queue.events.splice(0, queue.events.length - 1000);
        }
    }
    for (const profileId of deleteKeys) {
        EventQueue.delete(profileId);
    }
}

export async function subscribe(selfId: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    EventQueue.set(selfId.toHexString(), {
        events   : [],
        lastRead : new Date(),
        updateCb : ()=> { }
    });
}
export function pushEvent(profileId: ObjectId, event: Event) {
    const queue = EventQueue.get(profileId.toHexString());
    if (queue) {
        queue.events.push(event);
        queue.updateCb();
    }
}
export async function consume(selfId: ObjectId, signal: AbortSignal) {
    // delay to prevent too many requests, if we have a lot of events, they will be sent all in one request
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (signal.aborted)
        return [];

    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const queue = EventQueue.get(selfId.toHexString());
    if (!queue)
        throw new Error("You must to subscribe first");

    queue.lastRead = new Date();

    // if we have no events now - wait for next event
    if (queue.events.length === 0) {
        const { promise, resolve } = Promise.withResolvers<void>();

        // there is no point to wait if we have aborted
        signal.onabort = ()=> resolve();
        queue.updateCb = resolve;
        await promise;
    }
    if (signal.aborted) {
        return [];
    }
    return queue.events.splice(0, queue.events.length);
}

