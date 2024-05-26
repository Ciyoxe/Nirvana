import { ObjectId } from "mongodb";

export type Account = {
    /** user auth credentials */
    name : string,
    hash : string,
    salt : string,
}

/** part of formatted text in post */
export type ContentPart = {
    type: "text" | "image",

    /** text or image according to type */
    data: {
        /** text content */
        text  : string,
        /** text size multplier, 1 is default, should be in [0.1 .. 10] */
        size  : number,
        /** color in hex form #RRGGBB */
        color : string,

        align : "left" | "center" | "right",
        style : "bold" | "italic" | "underline" | "strikethrough",
    } | {
        /** image file url */
        file : string,
        desc : string,
    },
};

/** comment for post */
export type Comment = {
    /** posts _id */
    post    : ObjectId
    /** profiles _id */
    author  : ObjectId,
    /** comment id, if it's a reply to another comment */
    parent  : ObjectId | null,

    created : Date,
    text    : string,
    rating  : number,
}

export type Post = {
    /** profiles _id */
    author  : ObjectId,
    created : Date,
    content : ContentPart[],
    rating  : number,
    /** is post visible in public feed */
    public  : boolean,
}

export type Profile = {
    /** accounts _id */
    account: ObjectId,
    active : boolean,
    /** remaining rates, one rate for one hour, 0..10 */
    rates  : number,

    role: "admin" | "user",
    /** displayed name */
    name: string,

    about: string | null,
    /** image file url */
    avatar: string | null,
    /** image file url */
    banner: string | null,

    /** when profile was created */
    created: Date,
    /** when profile was last online */
    online : Date,

    /** profiles _id */
    following: ObjectId[],
    followers: ObjectId[],
    
    /** profiles _id, users, blocked in posts and comments sections */
    blockedUsers: ObjectId[],
    /** profiles _id, users, blocked in anon chats */
    blockedChats: ObjectId[],

    /** profile rating, from posts, comments and chats */
    rating: number,
}

export type PersonalFeed = {
    /** profiles _id */
    profile: ObjectId,
    /** posts _id */
    posts  : ObjectId[],
}

export type Conversation = {
    name        : string,
    type        : "personal" | "group" | "anonymous",
    lastUpdate  : Date,
    preview     : string | null,
    /** profiles _id */
    participants: ObjectId[],
}

export type Message = {
    /** conversations _id */
    chat   : ObjectId,
    /** profiles _id */
    sender : ObjectId,
    created: Date,
    text   : string,
}


/** currently not used */
export type Notification = {
    /** profiles _id */
    profile: ObjectId,

    created: Date,
    type   : "message" | "follow" | "reply",
    data   : {
        /** messages _id */
        message: ObjectId,
    } | {
        /** profiles _id */
        profile: ObjectId,
    } | {
        /** comments _id */
        comment: ObjectId,
    }
}
