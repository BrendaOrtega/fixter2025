import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();

const body = readFileSync(
  "/private/tmp/claude-501/-Users-bliss-fixter2025/60574fb5-78d0-4543-9a3d-2695530f291e/scratchpad/post-computer-use.md",
  "utf8"
);

const slug = "agentes-que-operan-computadoras";
const title = "Le dimos a un agente una computadora entera y lo dejamos usarla";
const data = {
  title,
  body,
  contentFormat: "markdown",
  published: true,
  coverImage: "https://img.youtube.com/vi/OFOyExWMlcI/maxresdefault.jpg",
  metaImage: "https://img.youtube.com/vi/OFOyExWMlcI/maxresdefault.jpg",
  youtubeLink: "https://youtu.be/OFOyExWMlcI",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "ai",
  tags: ["ai", "agentes", "claude"],
};

const post = await db.post.upsert({
  where: { slug },
  update: data,
  create: { ...data, slug },
});

console.log("OK:", post.slug, "| published:", post.published, "| id:", post.id);
await db.$disconnect();
