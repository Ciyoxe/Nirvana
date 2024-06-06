import { ObjectId } from "mongodb";
import { profiles } from "../../database/collections";
import { Profile } from "../../database/types";


// every hour all users get one rate
setInterval(addRates, 1000 * 60 * 60);
async function addRates() {
    await profiles.updateMany({}, [
        {
            $set: {
                rates: {
                    // clamp 0..10
                    $min: [10, { $max: [0, { $add: [1, "$rates"] }] }],
                }
            }
        }
    ]);
}
addRates();

export async function rateUser(selfId: ObjectId, profileId: ObjectId, rating: "up" | "down") {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    if (profileId.equals(profileId))
        throw new Error("You can't rate yourself");

    const rateWeight = 0.2;
    const normRating = (profile.rating + 10) / 20; // -10..10 -> 0..1
    const rateFactor = Math.min(1, normRating * 2);
    const rateSign   = rating === "up" ? 1 : -1;
    const rateBias   = rateWeight * rateFactor * rateSign;

    if (profile.rates <= 0)
        return;

    await profiles.updateOne({ _id: profile._id }, [
        {
            $set: {
                rates: {
                    // clamp 0..10
                    $min: [10, { $max: [0, { $add: [-1, "$rates"] }] }],
                }
            }
        }
    ]);
    await profiles.updateOne({ _id: profileId }, [
        {
            $set: {
                rating: {
                    // clamp -10..10
                    $min: [10, { $max: [-10, { $add: [rateBias, "$rating"] }] }],
                }
            }
        }
    ]);
}

export async function getProfileInfo(selfId: ObjectId, profileId: ObjectId) {
    const selfProfile = await profiles.findOne({ account: selfId, active: true });
    if (!selfProfile)
        throw new Error("Profile not found");

    const profile = profileId.equals(selfId) ? selfProfile : await profiles.findOne({ _id: profileId });
    if (!profile)
        throw new Error("Profile not found");

    return {
        self       : selfProfile._id.equals(profileId),
        name       : profile.name,
        about      : profile.about,
        avatar     : profile.avatar,
        banner     : profile.banner,

        created    : profile.created,
        online     : profile.online,
        
        role       : profile.role,
        rating     : profile.rating,
        following  : profile.following.length,
        followers  : profile.followers.length,
        isFollowing: selfProfile.following.find(id => id.equals(profileId)) !== undefined,
        isBlocked  : selfProfile.blockedUsers.find(id => id.equals(profileId)) !== undefined,
    }
}

export async function createProfile(
    selfId : ObjectId, 
    name   : string, 
    avatar : string | null, 
    about  : string | null,
    banner : string | null
) {
    const currentProfile = await profiles.findOne({ account: selfId, active: true }, { projection: { _id: 1 } });
    const newProfile     = await profiles.insertOne({
        name,
        avatar,
        about,
        banner,
        rates        : 1,
        account      : selfId,
        role         : "user",
        created      : new Date(),
        online       : new Date(),
        following    : [],
        followers    : [],
        blockedChats : [],
        blockedUsers : [],
        rating       : 0,
        active       : currentProfile === null,
    });    
    return newProfile.insertedId;
}

export async function getProfileList(selfId: ObjectId) {
    return await profiles.find({ account: selfId }, {
        projection: { _id: 1, active: 1, name: 1, avatar: 1, about: 1, rating: 1 },
    })
    .toArray() as { _id: ObjectId, active: boolean, name: string, avatar: string | null, about: string | null, rating: number }[];
}

export async function deleteProfile(selfId: ObjectId, profileId: ObjectId) {
    // TODO: delete all account related data
    await unsubscribeAll(selfId);

    const deleted = await profiles.deleteOne({ account: selfId, _id: profileId });
    if (deleted.deletedCount === 0)
        throw new Error("Profile not found");

    const activeAccount = 
        await profiles.findOne({ account: selfId, active: true }, { projection: { _id: 1 } }) ??
        await profiles.findOneAndUpdate({ account: selfId }, { $set: { active: true } }, { projection: { _id: 1 } });
    
    return activeAccount?._id ?? null;
}

export async function setActiveProfile(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { active: false }
    });
    const updated = await profiles.updateOne({ _id: profileId, account: selfId }, {
        $set: { active: true }
    });
    if (updated.modifiedCount === 0)
        throw new Error("Profile not found");
}

export async function updateProfile(selfId: ObjectId, profileId: ObjectId, fields: Partial<Profile>) {
    const updated = await profiles.updateOne({ _id: profileId, account: selfId }, {
        $set: fields
    });
    if (updated.modifiedCount === 0)
        throw new Error("Profile not found");
}

export async function setName(selfId: ObjectId, name: string) {
    const updated = await profiles.updateOne({ account: selfId, active: true }, {
        $set: { name }
    });
    if (updated.modifiedCount === 0)
        throw new Error("Profile not found")
}

export async function subscribe(selfId: ObjectId, profileId: ObjectId) {
    const profile = await profiles.findOneAndUpdate({ account: selfId, active: true }, {
        $addToSet: { following: profileId }
    }, {
        projection: { _id: 1 }
    });
    if (!profile)
        throw new Error("Profile not found");

    const updated = await profiles.updateOne({ _id: profileId }, {
        $addToSet: { followers: profile._id }
    });
    if (updated.modifiedCount === 0) {
        // rollback
        await profiles.updateOne({ _id: profile._id }, {
            $pull: { following: profileId }
        })
        throw new Error("Subscription profile not found");
    }
}

export async function unsubscribe(selfId: ObjectId, profileId: ObjectId) {
    const profile = await profiles.findOneAndUpdate({ account: selfId, active: true}, {
        $pull: { following: profileId }
    }, {
        projection: { _id: 1 }
    });
    if (!profile)
        throw new Error("Profile not found");

    await profiles.updateOne({ _id: profileId }, {
        $pull: { followers: profile._id }
    });
}

export async function unsubscribeAll(selfId: ObjectId) {
    const profile = await profiles.findOneAndUpdate({ account: selfId, active: true }, {
        $set: { following: [] }
    }, {
        projection: { _id: 1, followers: 1 }
    });
    if (!profile)
        throw new Error("Profile not found");

    await profiles.updateMany({ _id: { $in: profile.followers } }, {
        $pull: { followers: profile._id }
    });
}

export async function block(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $addToSet: { blockedUsers: profileId },
    });
    await unsubscribe(selfId, profileId);
}

export async function unblock(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $pull: { blockedUsers: profileId },
    });
}

export async function unblockAll(selfId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { blockedUsers: [] }
    });
}
