import passport from "passport";
import { ObjectId } from "mongodb";
import { Strategy } from "passport-jwt";

import { userExists } from "./verification";
import { getEnv } from "../../utils";


passport.use(
    new Strategy(
        {
            algorithms     : ["HS384", "HS512"],
            secretOrKey    : getEnv("JWT_SECRET"),
            jwtFromRequest : req => req.cookies?.jwt ?? null,
        },
        async (payload, done) => {
            if (await userExists(payload._id))
                done(null, ObjectId.createFromHexString(payload._id));
            else 
                done(null, false);
        }
    )
);

export default passport.authenticate("jwt", { session: false });

