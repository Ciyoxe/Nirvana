import { ObjectId } from "mongodb";
import { profiles } from "../../database/collections";


// every hour all users get one rate
setInterval(addRates, 1000 * 60 * 60);
async function addRates() {
    await profiles.updateMany({}, [
        { $inc: { rates: 1 } },
        { $min: { rates: 0 }, $max: { rates: 10 } },
    ]);
}

export async function getProfileInfo(selfId: ObjectId, profileId: ObjectId) {
    const selfProfile = await profiles.findOne({ account: selfId, active: true });
    if (!selfProfile)
        throw new Error("Profile not found");

    const profile = await profiles.findOne({ _id: profileId });
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

export async function createProfile(selfId: ObjectId, name: string, avatar: string | null) {
    const wasActive  = await profiles.findOne({ _id: selfId, active: true });
    const newProfile = await profiles.insertOne({
        name,
        avatar,
        rates        : 10,
        about        : null,
        account      : selfId,
        role         : "user",
        banner       : null,
        created      : new Date(),
        online       : new Date(),
        following    : [],
        followers    : [],
        blockedChats : [],
        blockedUsers : [],
        rating       : 0,
        active       : wasActive === null,
    });    
    return newProfile.insertedId;
}

export async function getProfileList(selfId: ObjectId) {
    const list = (
        await profiles.find({ account: selfId }, {
            projection: { _id: 1 }
        }
    ).toArray());
    return { profiles: list.map(profile => profile._id.toHexString()), active: list.find(p => p.active)?._id?.toHexString() ?? null };
}

export async function deleteProfile(selfId: ObjectId) {
    // TODO: delete all account related data
    await profiles.deleteOne({ account: selfId, active: true });
    // set new active account
    await profiles.updateOne({ account: selfId }, {
        $set: { active: true }
    })
}

export async function setActiveProfile(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { active: false }
    });
    await profiles.updateOne({ _id: profileId, account: selfId }, {
        $set: { active: true, online: new Date() }
    });
}

export async function setAvatar(selfId: ObjectId, avatar: string | null) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { avatar, online: new Date() }
    });
}

export async function setBanner(selfId: ObjectId, banner: string | null) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { banner, online: new Date() }
    });
}

export async function setName(selfId: ObjectId, name: string) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { name, online: new Date() }
    });
}

export async function subscribe(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $push: { following: profileId }
    });
}

export async function unsubscribe(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $pull: { following: profileId },
        $set : { online: new Date() }
    });
}

export async function unsubscribeAll(selfId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { following: [], online: new Date() }
    });
}

export async function block(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $push: { blockedUsers: profileId },
    });
    await unsubscribe(selfId, profileId);
}

export async function unblock(selfId: ObjectId, profileId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $pull: { blockedUsers: profileId },
        $set : { online: new Date() }
    });
}

export async function unblockAll(selfId: ObjectId) {
    await profiles.updateOne({ account: selfId, active: true }, {
        $set: { blockedUsers: [], online: new Date() }
    });
}
