/**
 * Crea el Video de la SEGUNDA ENTREGA de la secuencia "Introducción a los
 * agentes de IA" y lo liga al curso `sistemas-agenticos`.
 *
 * Mismo molde que `create-arnes-minimo-video.ts`: se corre ANTES de subir el
 * HLS, porque el `videoId` forma parte de las keys de S3
 * (`fixtergeek/videos/<courseId>/<videoId>/hls/...`).
 *
 *   npx tsx --env-file=.env scripts/create-interfaz-web-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "grok-interfaz-web";
const VIDEO_TITLE = "El agente construye su propia interfaz";
const MODULE_NAME = "Introducción a los agentes de IA";
const DURATION = "40"; // 2406s medidos con ffprobe

// Corta a propósito: el panel de notas es angosto y va al lado del video. Lo
// que no cabe sin scroll no se lee — el detalle está en el video y en el repo.
const DESCRIPTION = `El agente sale de la terminal y se muda al navegador 🪟

Le pides desde la consola que construya su propia interfaz. Cuando termina, cierras la terminal y le sigues hablando desde el navegador.

**El cajón del chat va hermano de la app, nunca hijo.** El agente reescribe la aplicación todo el tiempo y el HMR recarga ese módulo en cada cambio: si el chat colgara de ahí adentro, cada edición lo tiraría con ella.

Tres redes, porque escribe en las dos mitades:

1. Un chat de rescate por si truena el cajón
2. El REPL de la terminal por si rompe el montaje
3. La conversación en el servidor, para repintar al recargar

[El código de la entrega](https://github.com/blissito/taller-arnes-grok/tree/main/entregas/02-interfaz-web) 🧰
`;

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 Curso: ${course.title} (${course.id})`);

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
    // Se desbloquea con el avance de la secuencia. Ver app/.server/videoAccess.ts.
    accessLevel: "sequence",
    isPublic: true,
    duration: DURATION,
    authorName: "Héctorbliss",
  };

  // `index` solo al CREAR: al actualizar se respeta el que tenga, que decide el
  // orden de los capítulos y se ajusta a mano.
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

  // La relación M-N de Mongo se guarda en los DOS lados: si falta cualquiera,
  // la pieza queda invisible en el viewer o en el admin del programa.
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

  console.log(`\n🎬 Video listo: ${video.title}`);
  console.log(`   id:     ${video.id}`);
  console.log(`   slug:   ${video.slug}`);
  console.log(`   índice: ${video.index}`);
  console.log(`\n👉 HLS:`);
  console.log(
    `   npx tsx --env-file=.env scripts/upload-hls-local.ts ${course.id} ${video.id} <dirHLS>`
  );
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
