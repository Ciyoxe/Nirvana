import crypto from "crypto";
import { 
    MongoClient, 
    ObjectId 
} from "mongodb";


const usersDb = new MongoClient(process.env["MONGODB_URI"]!)
    .db("auth")
    .collection("users");

type DbRecord = {
    _id  : ObjectId,
    name : string,
    hash : string,
    salt : string,
};

const generateHash = (password: string, salt: string) =>
    new Promise<{ hash: string, salt: string }>((resolve, reject) => {
        crypto.pbkdf2(password, salt, 50_000, 64, "sha512", (err, hash) =>
            err ?
            reject(err) :
            resolve({ hash: hash.toString("hex"), salt })
        );
    });


export const createUser = (username: string, password: string) => 
    generateHash(password, crypto.randomBytes(32).toString("hex"))
    .then(({ hash, salt }) => usersDb.insertOne({
        name: username,
        hash,
        salt,
    }));

export const verifyUser = (username: string, password: string) =>
    usersDb.findOne<DbRecord>({ name: username })
    .then(async user => {
        if (
            user && 
            await generateHash(password, user.salt).then(({ hash }) =>
                crypto.timingSafeEqual(Buffer.from(user.hash, "hex"), Buffer.from(hash, "hex"))
            )
        ) {
            return user;
        } else {
            return null;
        }
    })
    .catch(_ => null);

export const usernameExists = (username: string) =>
    usersDb.findOne<DbRecord>({ name: username })
        .then(user => !!user)
        .catch(_ => false);

export const userIdExists = (userId: string) =>
    usersDb.findOne<DbRecord>({ _id: ObjectId.createFromHexString(userId) })
        .then(user => !!user)
        .catch(_ => false);


