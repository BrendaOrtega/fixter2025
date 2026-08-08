import { db } from "~/.server/db";

export const postSearch = async (search: string) => {
  // El contains de título/cuerpo sólo entra con términos de 4+ letras: con un tag
  // corto como "ai" matchearía cualquier post que diga "email" o "said", y el chip
  // de IA devolvería medio blog. Los tags y el mainTag siguen matcheando exacto.
  const fuzzy =
    search.length >= 4
      ? [
          { title: { contains: search, mode: "insensitive" as const } },
          { authorName: { contains: search, mode: "insensitive" as const } },
          { body: { contains: search, mode: "insensitive" as const } },
        ]
      : [];
  return await db.post.findMany({
    where: {
      published: true,
      OR: [
        { tags: { has: search } },
        { tags: { has: search.toLowerCase() } },
        { mainTag: { equals: search, mode: "insensitive" } },
        ...fuzzy,
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};
