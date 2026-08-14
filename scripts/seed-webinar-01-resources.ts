/**
 * Mete a datos los materiales del primer webinar (13-ago-2026), que hasta hoy
 * vivían hardcodeados: el PDF como una constante en `routes/seis-piezas.tsx` y
 * las slides como un archivo suelto en `public/webinar-1/`.
 *
 * También marca qué es cada pieza (`Video.kind`) y en qué fase va el programa
 * (`Course.stage`), que es lo que permite que el admin arme la línea de tiempo
 * sola en vez de que cada webinar nuevo pida código.
 *
 *   npx tsx scripts/seed-webinar-01-resources.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "primer-webinar-anatomia-de-un-sistema-agentico";

const MATERIALES = [
  {
    slug: "slides",
    kind: "slides",
    title: "Slides del webinar (19)",
    externalUrl: "/webinar-1/slides.html",
    legacyPath: "/webinar-1/slides",
  },
  {
    slug: "seis-piezas",
    kind: "pdf",
    title: "PDF: las seis piezas de un sistema agéntico",
    externalUrl:
      "https://easybits-public.t3.storage.dev/699f35cbc8ad86037eda62b1/XlxD89MrMQSp",
    legacyPath: "/seis-piezas",
  },
];

async function main() {
  const course = await prisma.course.update({
    where: { slug: COURSE_SLUG },
    // Se promociona con webinars abiertos; el taller empieza el 1 de septiembre.
    data: { stage: "promocion" },
    select: { id: true, title: true },
  });

  const video = await prisma.video.update({
    where: { slug: VIDEO_SLUG },
    data: {
      kind: "webinar",
      eventDate: new Date("2026-08-14T01:00:00.000Z"), // 13 ago, 8 PM CDMX
    },
    select: { id: true, title: true },
  });

  for (const material of MATERIALES) {
    // upsert por (videoId, slug): el script se puede correr dos veces.
    const resource = await prisma.resource.upsert({
      where: { videoId_slug: { videoId: video.id, slug: material.slug } },
      update: { ...material, courseId: course.id },
      create: { ...material, videoId: video.id, courseId: course.id },
    });
    console.log(
      `📎 ${resource.title}\n   /cursos/${COURSE_SLUG}/${VIDEO_SLUG}/${resource.slug}`,
    );
  }

  console.log(`\n📚 ${course.title} → stage: promocion`);
  console.log(`🎬 ${video.title} → kind: webinar`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
