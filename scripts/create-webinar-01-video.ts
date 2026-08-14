/**
 * Crea el Video del PRIMER WEBINAR de sistemas agénticos (grabado el 13-ago-2026)
 * y lo liga al curso `sistemas-agenticos` que ya existe.
 *
 * Se corre ANTES de transcodificar: el `videoId` forma parte de las keys de S3
 * (`fixtergeek/videos/<courseId>/<videoId>/hls/...`), así que hace falta primero.
 *
 * El HLS se sube aparte con `scripts/upload-hls-local.ts` — el job de Agenda
 * `process_video_hls` tiene lockLifetime de 10 min y no alcanza para 75 minutos
 * de video en tres calidades.
 *
 *   npx tsx scripts/create-webinar-01-video.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";
const VIDEO_SLUG = "primer-webinar-anatomia-de-un-sistema-agentico";
const VIDEO_TITLE = "Primer webinar: Anatomía de un sistema agéntico";

const DESCRIPTION = `Grabación completa del primer webinar del taller **Diseño de sistemas agénticos**, en vivo el 13 de agosto de 2026.

Un agente es un modelo más todo lo que construyes alrededor de él. Claude Code lleva alrededor de medio millón de líneas de código y ninguna de ellas es el modelo: todas son harness. Este webinar abre esa caja.

Lo que se ve:

- **Agente = modelo + harness.** Las primitivas por dentro: system prompts, tools, skills, MCP, subagentes, middleware.
- **Context engineering.** El contexto como recurso finito: el filesystem como cuaderno, resumir, planear, y subagentes que aíslan contexto.
- **Lo que rompe a los agentes en producción.** Ejecución durable (fallar en el paso 67 de 123 sin repetir los 67), memoria de corto y largo plazo, auth en tres capas, y human-in-the-loop.
- **La pieza que casi nadie enseña: la interfaz.** Un agente que trabaja durante minutos necesita progreso, estados y aprobaciones.

Es la sesión 0 del taller. Va sin editar, tal como salió en vivo.`;

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 Curso: ${course.title} (${course.id})`);

  // upsert: el script tiene que poder correrse dos veces sin duplicar nada.
  const video = await prisma.video.upsert({
    where: { slug: VIDEO_SLUG },
    update: {
      title: VIDEO_TITLE,
      description: DESCRIPTION,
      index: 0,
      moduleName: "Webinars",
      // `accessLevel` es el campo que de verdad decide en courseViewer.
      // "subscriber" = correo + código OTP, sin cuenta ni contraseña.
      accessLevel: "subscriber",
      isPublic: true,
      duration: "75",
      authorName: "Héctorbliss",
    },
    create: {
      slug: VIDEO_SLUG,
      title: VIDEO_TITLE,
      description: DESCRIPTION,
      index: 0,
      moduleName: "Webinars",
      accessLevel: "subscriber",
      isPublic: true,
      duration: "75",
      authorName: "Héctorbliss",
      processingStatus: "pending",
      courseIds: [course.id],
    },
  });

  // La relación M-N de Mongo se guarda en los DOS lados: si falta cualquiera,
  // el viewer no lista el video.
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
  console.log(`   acceso: ${video.accessLevel}`);
  console.log(`\n👉 VIDEO_ID para la subida del HLS: ${video.id}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
