import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const post = await db.post.update({
    where: { slug: "renderizar-video-animado-canvas-headless-ghosty" },
    data: {
      photoUrl: "https://formmy.app/logo.png",
    },
  });
  console.log(`Post updated: /blog/${post.slug}`);
  console.log(`Author: ${post.authorName} / ${post.authorAt}`);
  console.log(`Photo: ${post.photoUrl}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
