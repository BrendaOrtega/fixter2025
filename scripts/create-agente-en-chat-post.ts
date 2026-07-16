import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const body = readFileSync("scripts/agente-en-chat-body.md", "utf-8");

const slug = "agente-que-vive-en-un-chat-de-equipo";
const ogImage =
  "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop";

const data = {
  title: "Cómo le enseñamos a un agente a vivir en un chat de equipo",
  slug,
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "agentes",
  tags: ["agentes", "ai", "claude", "typescript"],
  category: ["ai"],
  metaImage: ogImage,
  coverImage: ogImage,
  published: true,
};

async function main() {
  const post = await db.post.upsert({
    where: { slug },
    update: data,
    create: data,
  });
  console.log(`Post listo: https://www.fixtergeek.com/blog/${post.slug}`);
  console.log(`ID: ${post.id}  published: ${post.published}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
