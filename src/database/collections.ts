import { MongoClient } from "mongodb";

import { getEnv } from "../utils";
import { 
    Account,
    Comment,
    Conversation,
    Message,
    Notification,
    PersonalFeed,
    Post,
    Profile
} from "./types";


const db = new MongoClient(getEnv("MONGODB_URI")).db(getEnv("DB_NAME"));

export const accounts      = db.collection< Account      >("accounts"     );
export const comments      = db.collection< Comment      >("comments"     );
export const conversations = db.collection< Conversation >("conversations");
export const messages      = db.collection< Message      >("messages"     );
export const notifications = db.collection< Notification >("notifications");
export const personalFeeds = db.collection< PersonalFeed >("personalFeeds");
export const posts         = db.collection< Post         >("posts"        );
export const profiles      = db.collection< Profile      >("profiles"     );