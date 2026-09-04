/**
 * Crea el Video de la SESIÓN 2 del taller de sistemas agénticos y lo liga al
 * curso `sistemas-agenticos`, igual que la sesión 1.
 *
 * Se corre ANTES de subir el HLS: el `videoId` es parte de las keys de S3.
 *
 *   npx tsx --env-file=.env scripts/create-sesion-2-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "sesion-2-la-ui-y-su-caja";
const VIDEO_TITLE = "Sesión 2 · La UI del agente y su propia caja";
const MODULE_NAME = "Diseño de sistemas agénticos";
const DESCRIPTION =
  "Grabación de la sesión 2 del taller (3 de septiembre de 2026): las cinco piezas de la UI, la tarjeta de tool en vivo, mandarle una imagen al agente y la app corriendo en su propia caja.";

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);

  const last = await prisma.video.findFirst({
    where: { courseIds: { has: course.id } },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const index = (last?.index ?? -1) + 1;

  const shared = {
    title: VIDEO_TITLE,
    description: DESCRIPTION,
    moduleName: MODULE_NAME,
    kind: "leccion",
    accessLevel: "paid",
    isPublic: true,
    duration: "119",
    authorName: "Héctorbliss",
  };

  const video = await prisma.video.upsert({
    where: { slug: VIDEO_SLUG },
    update: shared,
    create: {
      ...shared,
      index,
      slug: VIDEO_SLUG,
      processingStatus: "pending",
      courseIds: [course.id],
    },
  });

  if (!video.courseIds.includes(course.id)) {
    await prisma.video.update({
      where: { id: video.id },
      data: { courseIds: { push: course.id } },
    });
  }
  if (!course.videoIds.includes(video.id)) {
    await prisma.course.update({
      where: { id: course.id },
      data: { videoIds: { push: video.id } },
    });
  }

  console.log(`courseId=${course.id}`);
  console.log(`videoId=${video.id}`);
  console.log(`index=${video.index}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
