/**
 * Materiales de la entrega "El mínimo arnés": el repositorio del taller.
 *
 * El código es el material principal de esta pieza —el video se ve una vez, el
 * repo se clona y se corre— así que va como `Resource` del video y no perdido
 * dentro de la descripción, donde no se puede medir ni reutilizar.
 *
 *   npx tsx --env-file=.env scripts/seed-arnes-minimo-resources.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "grok-arnes-minimo";

const MATERIALES = [
  {
    slug: "repo",
    kind: "repo",
    title: "Repositorio del taller (crece con cada entrega)",
    externalUrl: "https://github.com/blissito/taller-arnes-grok",
    // `legacyPath` es único y en Mongo un índice único no acepta dos ausencias:
    // en vez de dejarlo vacío se le da su propia ruta corta, que además sirve
    // para compartir el repo sin arrastrar la URL larga del viewer.
    legacyPath: "/arnes-minimo/repo",
  },
];

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);

  const video = await prisma.video.findUnique({
    where: { slug: VIDEO_SLUG },
    select: { id: true, title: true },
  });
  if (!video) throw new Error(`No existe el video ${VIDEO_SLUG}`);

  for (const material of MATERIALES) {
    const resource = await prisma.resource.upsert({
      where: { videoId_slug: { videoId: video.id, slug: material.slug } },
      update: { ...material, courseId: course.id },
      create: { ...material, videoId: video.id, courseId: course.id },
    });
    console.log(
      `📎 ${resource.title}\n   /cursos/${COURSE_SLUG}/${VIDEO_SLUG}/${resource.slug}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
