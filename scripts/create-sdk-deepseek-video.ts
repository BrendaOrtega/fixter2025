/**
 * Crea el Video de la TERCERA ENTREGA de la secuencia "Introducción a los
 * agentes de IA" y lo liga al curso `sistemas-agenticos`.
 *
 * Mismo molde que `create-interfaz-web-video.ts`: se corre ANTES de subir el
 * HLS, porque el `videoId` forma parte de las keys de S3
 * (`fixtergeek/videos/<courseId>/<videoId>/hls/...`).
 *
 *   npx tsx --env-file=.env scripts/create-sdk-deepseek-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "sdk-deepseek";
const VIDEO_TITLE = "Un arnés más sólido: Vercel AI SDK";
const MODULE_NAME = "Introducción a los agentes de IA";
// Se ajusta con lo que mida ffprobe sobre el export final, en minutos.
const DURATION = "7"; // 440.97s medidos con ffprobe

// Corta a propósito: el panel de notas es angosto y va al lado del video. Lo
// que no cabe sin scroll no se lee — el detalle está en el video y en el repo.
const DESCRIPTION = `Tiramos el arnés que escribimos a mano y ponemos el AI SDK de Vercel debajo 🪢

No es desdecirse. Escribir el loop a mano fue lo que te dejó entender qué hace un agente por dentro; mantenerlo ya no enseña nada y sí cuesta. Y de paso cambia el modelo: DeepSeek en lugar de Grok, porque **no nos casamos con ningún proveedor**.

**Unas 500 líneas menos**, y hace más que antes: se van el buffer NDJSON, el vocabulario de eventos inventado, el parseo del stream a mano y el armado de schemas para el proveedor.

![Tres streams por un mismo canal](/ilustraciones/canal-tres-streams.svg)

**Un schema en Zod, tres consumidores**: de la misma línea salen el schema que ve el modelo, la validación en runtime y el tipo de TypeScript. Dejan de poder contradecirse.

**Tres streams por un solo canal**, y uno es tuyo: el texto del agente, tus propios datos para la interfaz y un segundo modelo escribiendo en paralelo. Eso es lo que hace posibles los artefactos.

**El caché sale 30× más barato** y es automático, por prefijo. A cambio, cuidar ese prefijo pasa a ser trabajo tuyo: una fecha dentro del prompt de sistema y nada avisa que dejaste de pagar una décima parte.

[El código de la entrega](https://github.com/blissito/taller-arnes-grok/tree/main/entregas/03-sdk-deepseek) 🧰
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
