import { ObjectId, WithId } from "mongodb";
import { posts, profiles } from "../../database/collections";
import { ContentPart } from "../../database/types";

type Post = {
    content : ContentPart[],
    public  : boolean,
    header  : string,
    about   : string | null,
}
type LoadPostsReq = {
    count     : number,
    offset    : number,
    feed      : "public" | "personal",
    minRating : number,
    maxRating : number,
} | {
    count     : number,
    offset    : number,
    feed      : "author",
    profileId : string,
}

export async function publish(selfId: ObjectId, post: Post) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const newPost = await posts.insertOne({
        author : profile._id,
        rating : profile.rating,
        created: new Date(),
        ...post
    });
    return newPost.insertedId.toHexString();
}

export async function loadPosts(selfId: ObjectId, req: LoadPostsReq) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const result = await posts.aggregate([
        {
            $match: req.feed === "public" ? 
            {
                public: true,
                author: {
                    $nin: profile.blockedUsers
                },
                rating: {
                    $gte: req.minRating,
                    $lte: req.maxRating
                }
            } :     req.feed === "personal" ?
            {
                author: {
                    $in : profile.following,
                    $nin: profile.blockedUsers
                },
                rating: {
                    $gte: req.minRating,
                    $lte: req.maxRating
                }
            } :     req.feed === "author" ?
            {
                author: new ObjectId(req.profileId),
            } : 
            {},
        },
        {
            $facet: {
                count: [
                    {
                        $count: "count"
                    }
                ],
                posts: [
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
                    {
                        $project: {
                            _id    : 1,
                            header : 1,
                            about  : 1,
                            author : 1,
                            rating : 1,
                            created: 1,
                        }
                    },
                    {
                        $lookup: {
                            from         : "profiles",
                            localField   : "author",
                            foreignField : "_id",
                            as           : "authorProfile"
                        }
                    },
                    {
                        $unwind: "$authorProfile"
                    },
                    {
                        $addFields: {
                            authorName: "$authorProfile.name"
                        }
                    },
                ]
            }
        }
    ]).next();

    if (!result)
        return {
            count: 0,
            posts: []
        };

    return {
        count: (result.count[0]?.count ?? 0) as number,
        posts: (result.posts as any[]).map((post: any) => ({
            id         : post._id.toHexString()     as string,
            author     : post.author.toHexString()  as string,
            header     : post.header                as string,
            about      : post.about                 as string | null,
            created    : post.created               as Date,
            rating     : post.rating                as number,
            authorName : post.authorProfile.name as string
        })),
    };
}

export async function getPost(selfId: ObjectId, postId: string) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const post = await posts.findOne([
        {
            $match: {
                _id: new ObjectId(postId),
            }
        },
        {
            $lookup: {
                from         : "profiles",
                localField   : "author",
                foreignField : "_id",
                as           : "authorProfile"
            }
        },
        {
            $unwind: "$authorProfile"
        },
        {
            $addFields: {
                authorName: "$authorProfile.name"
            }
        },
    ]);
    if (!post)
        throw new Error("Post not found");

    return post as WithId<Post & { authorName: string }>;
}

export async function deletePost(selfId: ObjectId, postId: string) {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    const deleted = await posts.deleteOne({ _id: new ObjectId(postId), author: profile._id });
    if (deleted.deletedCount === 0)
        throw new Error("Post not found");
}

export async function ratePost(selfId: ObjectId, postId: string, rating: "up" | "down") {
    const profile = await profiles.findOne({ account: selfId, active: true });
    if (!profile)
        throw new Error("Profile not found");

    if (profile.rates <= 0)
        throw new Error("Cannot rate post");


    const profileWeight = 0.5;
    const normRating = (profile.rating + 10) / 20; // -10..10 -> 0..1
    const rateFactor = Math.min(1, normRating * 2);
    const rateSign   = rating === "up" ? 1 : -1;
    const rateBias   = rateFactor * rateSign;

    const ratedPost = await posts.findOneAndUpdate({ _id: new ObjectId(postId), author: { $ne: profile._id } }, [
        {
            $set: {
                rating: {
                    // clamp -10..10
                    $min: [10, { $max: [-10, { $add: [rateBias, "$rating"] }] }],
                }
            }
        }
    ]);

    // if post not found or this is your own post
    if (!ratedPost)
        throw new Error("You cant rate this post");

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
        profiles.updateOne({ _id: ratedPost.author }, [
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
