import { ObjectId } from "mongodb";
import { conversations, messages, profiles } from "../../database/collections";

export async function createPersonalChat(selfId: ObjectId, profileId: ObjectId) {
    const [selfProfile, receiverProfile] = await Promise.all([
        profiles.findOne({ account: selfId, active: true }),
        profiles.findOne({ _id: profileId }, { projection: { name: 1 } })
    ]);
    if (!selfProfile)
        throw new Error("Profile not found");
    if (selfProfile._id.equals(profileId))
        throw new Error("You can't create conversation with yourself");
    if (!receiverProfile)
        throw new Error("Receiver profile not found");

    const newChat = await conversations.insertOne({
        name        : receiverProfile.name,
        type        : "personal",
        participants: [selfProfile._id,  receiverProfile._id],
        lastUpdate  : new Date(),
        preview     : null,
    });
    return newChat.insertedId;
}

export async function deletePersonalChat(selfId: ObjectId, conversation: ObjectId) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");
    const deleted = await conversations.findOneAndDelete({ _id: conversation, type: "personal", participants: { $in: [profile._id] } });
    if (!deleted)
        throw new Error("You can delete only personal chats");
    await messages.deleteMany({ chat: conversation });
}
