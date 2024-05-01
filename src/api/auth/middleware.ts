import passport from "passport";
import { Strategy } from "passport-jwt";
import { ObjectId } from "mongodb";

import { getEnv  } from "../../utils";
import { isUserExists } from "./auth";


passport.use(
    new Strategy(
        {
            algorithms     : ["HS384", "HS512"],
            secretOrKey    : getEnv("JWT_SECRET"),
            jwtFromRequest : req => req.cookies?.jwt ?? null,
        },
        async (payload, done) => {
            const id     = new ObjectId(payload.id as string);
            const exists = await isUserExists(id);
            done(null, exists ? id : false);
        }
    )
);

export default passport.authenticate("jwt", { session: false });

