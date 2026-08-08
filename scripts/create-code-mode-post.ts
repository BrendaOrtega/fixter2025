import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const body = readFileSync("scripts/code-mode-body.md", "utf-8");

const slug = "code-mode-historia-de-una-idea";
const ogImage = "https://www.ghosty.studio/blog-covers/jeronimo-og.jpg"; // 1200x630 real

const data = {
  title: "Code-mode: deja de darle tools a tu agente y dale permiso de escribir código",
  slug,
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "agentes",
  tags: ["agentes", "ai", "claude", "opinion"],
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
