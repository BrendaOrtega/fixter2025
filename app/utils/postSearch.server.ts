import type { Post } from "~/types/models";
import { db } from "~/.server/db";

export const postSearch = async (search: string) => {
  return (await db.post.aggregateRaw({
    pipeline: [
      {
        $search: {
          index: "default",
          compound: {
            must: [
              {
                text: {
                  query: search,
                  path: [
                    "title",
                    "tags",
                    "authorName",
                    "category",
                    "mainTag",
                    // "body",
                  ],
                  // wildcard: "*",
                },
              },
            ],
            filter: [
              {
                equals: {
                  value: true,
                  path: "published",
                },
              },
            ],
          },
        },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          slug: 1,
          metaImage: 1,
          coverImage: 1,
          authorName: 1,
          mainTag: 1,
          body: 1,
          photoUrl: 1,
        },
      },
    ],
  })) as unknown as Post[];
};
