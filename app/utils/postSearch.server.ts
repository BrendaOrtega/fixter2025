import { db } from "~/.server/db";

export const postSearch = async (search: string) => {
  return await db.post.findMany({
    where: {
      published: true,
      OR: [
        { tags: { has: search } },
        { mainTag: { equals: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { authorName: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};
