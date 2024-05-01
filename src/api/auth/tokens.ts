import { verifyUser, createUser, isNameExists, signJwt } from "./auth";

export const register = async (username: string, password: string) => {
    if (username.length === 0 || password.length === 0) {
        throw new Error("Username and password required");
    }
    if (await isNameExists(username)) {
        throw new Error("Username already exists");
    }

    const user  = await createUser(username, password);
    const token = signJwt(user.insertedId);
    
    return token;
};

export const authorize = async (username: string, password: string) => {
    if (username.length === 0 || password.length === 0) {
        throw new Error("Username and password required");
    }
    
    const user = await verifyUser(username, password);
    
    return user ? signJwt(user._id) : null;
}
