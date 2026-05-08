import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const VIDEO_URL = "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/hpP";
const POSTER_URL = "https://easybits-public.fly.storage.tigris.dev/699f35cbc8ad86037eda62b1/w7o";

async function main() {
  const existing = await db.post.findUnique({
    where: { slug: "renderizar-video-animado-canvas-headless-ghosty" },
    select: { body: true },
  });
  if (!existing) throw new Error("Post not found");

  const videoBlock = `\n\n[![Ver video final renderizado](${POSTER_URL})](${VIDEO_URL})\n\n▶️ **[Ver / descargar video final (MP4, 585KB)](${VIDEO_URL})**\n\n`;

  const newBody = existing.body.replace(
    "## El resultado\n\nTres actos, 13 segundos:",
    `## El resultado${videoBlock}Tres actos, 13 segundos:`
  );

  if (newBody === existing.body) {
    throw new Error("Replacement did not match — body unchanged");
  }

  const post = await db.post.update({
    where: { slug: "renderizar-video-animado-canvas-headless-ghosty" },
    data: { body: newBody },
  });
  console.log(`Post updated: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
