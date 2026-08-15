/**
 * Crea el Video de la PRIMERA ENTREGA de la secuencia "Introducción a los
 * agentes de IA" y lo liga al curso `sistemas-agenticos`.
 *
 * El módulo lleva el nombre de la secuencia a propósito: cada secuencia entra
 * al curso como su propio capítulo, y así el índice cuenta de dónde vino cada
 * bloque (webinars, sesiones del taller, entregas por correo).
 *
 * Se corre ANTES de subir el HLS: el `videoId` forma parte de las keys de S3
 * (`fixtergeek/videos/<courseId>/<videoId>/hls/...`).
 *
 *   npx tsx --env-file=.env scripts/create-arnes-minimo-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "grok-arnes-minimo";
const VIDEO_TITLE = "Un agente que construye su propio arnés";
const MODULE_NAME = "Introducción a los agentes de IA";

const DESCRIPTION = `Escribimos un agente completo desde cero, sin SDK y sin framework: un \`fetch\` a la API, una herramienta y un \`while\`.

El ciclo es siempre el mismo: le describes al modelo qué herramientas existen, él pide ejecutar una, tú la ejecutas y le devuelves el resultado, y vuelves a llamarlo con el historial completo. Cuando responde con texto en lugar de pedir otra herramienta, terminó. Eso es todo el arnés — los frameworks de agentes son ese loop con adornos encima.

Lo que se construye, en orden:

- **La llamada cruda** a la Responses API, con \`fetch\` y nada más.
- **La primera herramienta** y el loop que la ejecuta: el arnés mínimo.
- **El chat**, cuando el historial deja de morir con la pregunta y se vuelve memoria.
- **La caché** del prompt, para dejar de pagar dos veces lo que el agente ya sabe.
- **Ojos en el navegador**: el agente levanta un servidor, abre una página y se mira a sí mismo.

**El código:** [github.com/blissito/taller-arnes-grok](https://github.com/blissito/taller-arnes-grok) — el repositorio crece con cada entrega.

Es la primera entrega de la secuencia [Introducción a los agentes de IA](https://www.fixtergeek.com/secuencias/introduccion-a-los-agentes-de-ia).`;

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 Curso: ${course.title} (${course.id})`);

  // El índice manda el orden en el viewer y el cálculo de "siguiente video":
  // se toma el que sigue al mayor que ya existe en el curso.
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
    // Se desbloquea con el avance de la secuencia, no con la compra ni con el
    // simple hecho de tener correo. Ver app/.server/videoAccess.ts.
    accessLevel: "sequence",
    isPublic: true,
    duration: "48",
    authorName: "Héctorbliss",
  };

  // `index` solo se pone al CREAR: al actualizar se respeta el que tenga, que
  // es el que decide el orden de los capítulos y se ajusta a mano. Pisarlo aquí
  // mandaba la pieza al final cada vez que se corregía un título.
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
  console.log(`   módulo: ${video.moduleName}`);
  console.log(`   índice: ${video.index}`);
  console.log(`   acceso: ${video.accessLevel}`);
  console.log(`\n👉 Para subir el HLS:`);
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
