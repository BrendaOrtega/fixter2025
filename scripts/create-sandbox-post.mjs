import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();

const body = readFileSync(process.argv[2], "utf8");

const slug = "sandbox-agentes-claude-code";
const cover =
  "https://images.pexels.com/photos/17483871/pexels-photo-17483871.png?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200";

const data = {
  title: "Cuánta computadora le estás prestando a tu agente",
  body,
  metaDescription:
    "Permisos y aislamiento resuelven problemas distintos. Las seis formas de aislar Claude Code, cuál elegir y las dos trampas del sandbox runtime.",
  contentFormat: "markdown",
  published: true,
  coverImage: cover,
  metaImage: cover,
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "ai",
  tags: ["ai", "claude", "agentes"],
};

const post = await db.post.upsert({
  where: { slug },
  update: data,
  create: { ...data, slug },
});

console.log("OK:", post.slug, "| published:", post.published, "| id:", post.id);
await db.$disconnect();
