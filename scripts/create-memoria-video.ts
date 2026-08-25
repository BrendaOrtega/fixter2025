/**
 * Crea el Video de la CUARTA y última entrega de la secuencia "Introducción a
 * los agentes de IA" y lo liga al curso `sistemas-agenticos`.
 *
 * Mismo molde que `create-sdk-deepseek-video.ts`: se corre ANTES de subir el
 * HLS, porque el `videoId` forma parte de las keys de S3
 * (`fixtergeek/videos/<courseId>/<videoId>/hls/...`).
 *
 *   npx tsx --env-file=.env scripts/create-memoria-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "memoria-sqlite";
const VIDEO_TITLE = "Dónde vive lo que el agente recuerda";
const MODULE_NAME = "Introducción a los agentes de IA";
// 2700.47 s medidos con ffprobe sobre el export final.
const DURATION = "45";

// Corta a propósito: el panel de notas es angosto y va al lado del video.
const DESCRIPTION = `Reinicias el servidor y el agente te saluda como si no te conociera 🧠

En esta última entrega le damos memoria de verdad, y sin infraestructura: **archivos de markdown en disco** como fuente de verdad, y un índice de SQLite encima.

**El índice es desechable.** Lo borras, se reconstruye desde los \`.md\` y vuelve idéntico — es el \`dist/\` de tu memoria. Lo irreemplazable son los archivos, que abres con tu editor y revisas con \`git diff\`.

**Indexar es un solo bucle**: de cada trozo pregunta si ya tiene su \`SHA-256\`; si no, guarda la fila. Reconstruir desde cero es el caso en que nada coincide.

**Búsqueda híbrida.** FTS5 —que viene compilado dentro de Node 22, sin \`npm install\`— encuentra la palabra exacta; los vectores encuentran el significado. Las dos viven en el mismo archivo.

**Y no todos los recuerdos pesan lo mismo**: lo viejo decae, lo que se vuelve a escribir se renueva, y los hechos estables no envejecen.

Además, la pregunta que casi nadie contesta: si el sandbox muere, ¿no se van los \`.md\` también? Sí — y por eso solo ellos viajan.

[El código de la entrega](https://github.com/blissito/taller-arnes-grok/tree/main/entregas/04-memoria) 🧰
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

  // `index` solo al CREAR: al actualizar se respeta el que tenga.
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

  // La relación M-N de Mongo se guarda en los DOS lados.
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
