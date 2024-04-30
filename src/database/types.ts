import { ObjectId } from "mongodb";

/** user auth credentials */
export type Account = {
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
        /** text size multplier, 1 is default, should be in [0.5 .. 10] */
        size  : number,
        /** color in hex form #RRGGBB */
        color : string,

        align : "left" | "center" | "right",
        style : "bold" | "italic" | "underline" | "strikethrough",
    } | {
        url  : string,
        desc : string,
    },
};

/** user vote for comment or post */
export type Vote = {
    /** profiles _id */
    author : ObjectId,
    vote   : "up" | "down",
}

/** comment for post */
export type Comment = {
    /** posts _id */
    post    : ObjectId
    /** profiles _id */
    author  : ObjectId,
    /** comment id, if it's a reply to another comment */
    parent? : ObjectId,

    created : Date,
    text    : string,
    votes   : Vote[],
}

export type Post = {
    /** profiles _id */
    author  : ObjectId,
    created : Date,
    content : ContentPart[],
    votes   : Vote[],
}

export type Profile = {
    /** accounts _id */
    account : ObjectId,

    /** displayed name */
    name: string,
    /** url to image file */
    avatar: string,
    /** url to image file */
    banner: string,

    /** when profile was created */
    created: Date,
    /** when profile was last online */
    online : Date,

    /** profiles _id */
    following: ObjectId[],
    /** profiles _id */
    blocked: ObjectId[],
}

export type PersonalFeed = {
    /** profiles _id */
    profile: ObjectId,
    /** posts _id */
    posts  : ObjectId[],
}

export type Conversation = {
    /** profiles _id */
    participants: ObjectId[],
    /** messages _id */
    messages    : ObjectId[],
}

export type Message = {
    /** profiles _id */
    sender      : ObjectId,
    /** conversations _id */
    conversation: ObjectId,

    created: Date,
    text   : string,
}

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