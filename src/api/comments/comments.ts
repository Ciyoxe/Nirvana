import { ObjectId } from "mongodb";
import { profiles, comments } from "../../database/collections";
import { Comment } from "../../database/types";

type PublishReq = {
    postId  : string,
    replyTo : string | null,
    text    : string,
}
type LoadCommentsReq = {
    offset    : number,
    count     : number,
    postId    : string,
    minRating : number,
    maxRating : number,
}

export async function publish(selfId: ObjectId, comment: PublishReq) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const newComment = await comments.insertOne({
        post    : new ObjectId(comment.postId),
        author  : profile._id,
        replyTo : comment.replyTo ? new ObjectId(comment.replyTo) : null,
        created : new Date(),
        text    : comment.text,
        rating  : 0,
    });
    return newComment.insertedId.toHexString();
}

export async function deleteComment(selfId: ObjectId, commentId: string) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");
    
    const deleted = await comments.deleteOne({ _id: new ObjectId(commentId), author: profile._id });
    if (deleted.deletedCount === 0)
        throw new Error("Comment not found");
}

export async function loadComments(selfId: ObjectId, req: LoadCommentsReq) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");
    
    const result = await comments.aggregate([
        {
            $match: {
                post: new ObjectId(req.postId),
                author: {
                    $nin: profile.blockedUsers
                },
                rating: {
                    $gte: req.minRating,
                    $lte: req.maxRating
                }
            }
        },
        {
            $facet: {
                count: [
                    {
                        $count: "count"
                    }
                ],
                comments : [
                    {
                        $sort: {
                            created: 1
                        }
                    },
                    {
                        $skip: req.offset
                    },
                    {
                        $limit: req.count
                    },
                ]
            }
        }
    ]).next();

    if (!result)
        return {
            count   : 0,
            comments: []
        };
    
    return {
        count   : (result.count[0]?.count ?? 0) as number,
        comments: result.comments as Comment[],
    };
}

export async function rateComment(selfId: ObjectId, commentId: string, rating: "up" | "down") {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    if (profile.rates <= 0)
        throw new Error("Cannot rate comment");

    const profileWeight = 0.3;
    const normRating    = (profile.rating + 10) / 20; // -10..10 -> 0..1
    const rateFactor    = Math.min(1, normRating * 2);
    const rateSign      = rating === "up" ? 1 : -1;
    const rateBias      = rateFactor * rateSign;

    const ratedComment = await comments.findOneAndUpdate({ _id: new ObjectId(commentId), author: { $ne: profile._id } }, [
        {
            $set: {
                rating: {
                    // clamp -10..10
                    $min: [10, { $max: [-10, { $add: [rateBias, "$rating"] }] }],
                }
            }
        }
    ]);

    // if comment not found or this is your own comment
    if (!ratedComment)
        throw new Error("You cant rate this comment");

    await Promise.all([
        profiles.updateOne({ _id: profile._id }, [
            {
                $set: {
                    rates: {
                        // clamp 0..10
                        $min: [10, { $max: [0, { $add: [-1, "$rates"] }] }],
                    }
                }
            }
        ]),
        profiles.updateOne({ _id: ratedComment.author }, [
            {
                $set: {
                    rating: {
                        // clamp -10..10
                        $min: [10, { $max: [-10, { $add: [rateBias * profileWeight, "$rating"] }] }],
                    }
                }
            }
        ])
    ]);
}
