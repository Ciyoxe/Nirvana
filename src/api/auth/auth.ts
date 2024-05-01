import jwt from "jsonwebtoken";
import util from "util";
import crypto from "crypto";
import { ObjectId } from "mongodb";

import { accounts } from "../../database/collections";
import { getEnv } from "../../utils";


const generateHash = util.promisify(crypto.pbkdf2);


export async function isNameExists(username: string) {
    try {
        return await accounts.countDocuments({ name: username }, { limit: 1 }) > 0;
    } catch (_) {
        return false;
    }
}

export async function isUserExists(userId: ObjectId) {
    try {
        return await accounts.countDocuments({ _id: userId }, { limit: 1 }) > 0;
    } catch (_) {
        return false;
    }
}

/** register new account */
export async function createUser(username: string, password: string) {
    const salt = crypto.randomBytes(32).toString("hex");
    const hash = (await generateHash(password, salt, 50_000, 64, "sha512")).toString("hex");

    return accounts.insertOne({ name: username, hash, salt, profiles: [], activeProfile: null });
}

/** verify account credentials */
export async function verifyUser(username: string, password: string) {
    const user = await accounts.findOne({ name: username });

    if (!user) {
        return null;
    }

    const hash  = await generateHash(password, user.salt, 50_000, 64, "sha512");
    const valid = crypto.timingSafeEqual(Buffer.from(user.hash, "hex"), hash);

    return valid ? user : null;
}

export function signJwt(userId: ObjectId) {
    return jwt.sign({ id: userId.toHexString() }, getEnv("JWT_SECRET"), { expiresIn: "7d", algorithm: "HS384" });
}
