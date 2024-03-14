import jwt from "jsonwebtoken";

import { verifyUser, createUser,usernameExists } from "./verification";
import { getEnv } from "../../utils";


const generateToken = (userId: string) =>
    jwt.sign({ _id: userId }, getEnv("JWT_SECRET"), { expiresIn: "7d", algorithm: "HS384" });


export const register = async (username: string, password: string) => {
    if (username.length === 0 || password.length === 0) {
        throw new Error("Username and password required");
    }
    if (await usernameExists(username)) {
        throw new Error("Username already exists");
    }

    const user  = await createUser(username, password);
    const token = generateToken(user.insertedId.toHexString());
    
    return token;
};

export const authorize = async (username: string, password: string) => {
    if (username.length === 0 || password.length === 0) {
        throw new Error("Username and password required");
    }
    
    const user = await verifyUser(username, password);
    
    return user ? generateToken(user._id.toHexString()) : null;
}