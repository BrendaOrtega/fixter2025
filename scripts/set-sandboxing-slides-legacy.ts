/**
 * Le da ruta corta a las slides del webinar 2: /sandboxing/slides.
 *
 * La fila del material ya existe (la creó el flujo de programas); esto solo le
 * escribe el `legacyPath` para que `canonicalUrlForLegacyPath` la resuelva sin
 * que la ruta corta tenga el destino hardcodeado.
 *
 *   npx tsx scripts/set-sandboxing-slides-legacy.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VIDEO_SLUG = "sandboxing";
const RESOURCE_SLUG = "slides";
const LEGACY = "/sandboxing/slides";

async function main() {
  const video = await prisma.video.findUnique({
    where: { slug: VIDEO_SLUG },
    select: { id: true, title: true },
  });
  if (!video) throw new Error(`No existe el video ${VIDEO_SLUG}`);

  const resource = await prisma.resource.update({
    where: { videoId_slug: { videoId: video.id, slug: RESOURCE_SLUG } },
    data: { legacyPath: LEGACY, title: "Slides del webinar (17)" },
    select: { title: true, externalUrl: true, legacyPath: true },
  });

  console.log(`📎 ${resource.title}`);
  console.log(`   corta:    ${resource.legacyPath}`);
  console.log(`   canónica: /cursos/sistemas-agenticos/${VIDEO_SLUG}/${RESOURCE_SLUG}`);
  console.log(`   archivo:  ${resource.externalUrl}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
