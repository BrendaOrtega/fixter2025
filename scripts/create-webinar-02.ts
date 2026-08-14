/**
 * Deja lista la pieza del SEGUNDO webinar (20-ago-2026, sandboxing) dentro del
 * programa, antes de que ocurra: así el jueves solo hay que subir la grabación.
 *
 * Nace en `isPublic: false` a propósito — un Video sin fuente se vería como una
 * lección rota en el viewer. El admin sí lo lista, que es de lo que se trata.
 *
 *   npx tsx scripts/create-webinar-02.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "segundo-webinar-sandboxing";

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);

  const video = await prisma.video.upsert({
    where: { slug: VIDEO_SLUG },
    update: {},
    create: {
      slug: VIDEO_SLUG,
      title: "Segundo webinar: Sandboxing, la caja donde vive tu agente",
      description:
        "En qué computadora corre el código que tu agente escribió: la escalera de aislamiento, qué cobra cada proveedor y por qué el sandbox es lo que habilita Code Mode.",
      kind: "webinar",
      // 20 de agosto, 8:00 PM CDMX
      eventDate: new Date("2026-08-21T02:00:00.000Z"),
      index: 1,
      moduleName: "Webinars",
      accessLevel: "subscriber",
      isPublic: false, // se abre cuando exista la grabación
      duration: "45",
      authorName: "Héctorbliss",
      courseIds: [course.id],
    },
    select: { id: true, title: true },
  });

  // La relación M-N de Mongo se guarda en los dos lados.
  if (!course.videoIds.includes(video.id)) {
    await prisma.course.update({
      where: { id: course.id },
      data: { videoIds: { push: video.id } },
    });
  }

  const resource = await prisma.resource.upsert({
    where: { videoId_slug: { videoId: video.id, slug: "slides" } },
    update: {
      title: "Slides del webinar (20)",
      externalUrl: "/webinar-2/slides.html",
      courseId: course.id,
    },
    create: {
      slug: "slides",
      kind: "slides",
      title: "Slides del webinar (20)",
      externalUrl: "/webinar-2/slides.html",
      legacyPath: "/webinar-2/slides",
      videoId: video.id,
      courseId: course.id,
    },
  });

  console.log(`🎬 ${video.title}`);
  console.log(`   /cursos/${COURSE_SLUG}/${VIDEO_SLUG}`);
  console.log(`📎 ${resource.title}`);
  console.log(`   /cursos/${COURSE_SLUG}/${VIDEO_SLUG}/slides`);
  console.log(`\n⚠️  isPublic: false — se abre cuando se suba la grabación.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
