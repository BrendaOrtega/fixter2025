/**
 * Deja lista la pieza del TERCER webinar (27-ago-2026, agentes en producción)
 * dentro del programa, con sus slides ya colgadas como material.
 *
 * Nace en `isPublic: false` a propósito — un Video sin fuente se vería como una
 * lección rota en el viewer. El admin sí lo lista, que es de lo que se trata.
 *
 *   npx tsx scripts/create-webinar-03.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "agentes-en-produccion";

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
      title: "¿Para qué me sirve un agente de IA hoy?",
      description:
        "Cuatro agentes trabajando en negocios mexicanos: un vendedor en WhatsApp, un asistente que agenda y cobra, un programador que entrega pull requests y un prospectador. Y las piezas con las que armas el tuyo.",
      kind: "webinar",
      // 27 de agosto, 8:00 PM CDMX
      eventDate: new Date("2026-08-28T02:00:00.000Z"),
      index: 2,
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

  const material = {
    title: "Slides del webinar (15)",
    externalUrl: "/slides/agentes-en-produccion.html",
    courseId: course.id,
    // El índice único de `legacyPath` en Mongo choca entre varios nulos, así que
    // cada material estrena su ruta corta aunque todavía no se haya repartido.
    legacyPath: "/webinar-3/slides",
  };

  const resource = await prisma.resource.upsert({
    where: { videoId_slug: { videoId: video.id, slug: "slides" } },
    update: material,
    create: { slug: "slides", kind: "slides", videoId: video.id, ...material },
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
