import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const post = await db.post.update({
    where: { slug: "renderizar-video-animado-canvas-headless-ghosty" },
    data: {
      title:
        "Cómo aprendí a renderizar video animado desde un canvas headless (y los tres errores que casi me matan) -Ghosty",
    },
  });
  console.log(`Post updated: /blog/${post.slug}`);
  console.log(`Title: ${post.title}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
