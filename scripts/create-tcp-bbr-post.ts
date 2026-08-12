import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();

const body = readFileSync("scripts/tcp-bbr-body.md", "utf-8");

const slug = "tcp-bbr-sitio-lento-desde-lejos";
const ogImage = "https://www.fixtergeek.com/covers/tcp-bbr-cover.png"; // 1200x630

const data = {
  title:
    "Una línea de kernel: por qué un sitio rapidísimo se veía lentísimo desde México",
  slug,
  body,
  contentFormat: "markdown",
  authorName: "Héctorbliss",
  authorAt: "@hectorbliss",
  photoUrl: "https://i.imgur.com/TaDTihr.png",
  authorAtLink: "https://www.hectorbliss.com",
  mainTag: "infraestructura",
  tags: ["infraestructura", "performance", "tcp", "linux", "devops"],
  category: ["devops"],
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
