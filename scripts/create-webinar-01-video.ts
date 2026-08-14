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

const DESCRIPTION = `Grabación completa del primer webinar del taller **Diseño de sistemas agénticos**, en vivo el 13 de agosto de 2026. Hora y cuarto, sin editar.

**La tesis:** consumir el API de un LLM no es un sistema agéntico. Un agente se vuelve potente cuando le das una computadora — y ahí empieza el problema, porque no quieres que sea la tuya. De ahí salen las cajas: máquinas virtuales con su propio kernel, disco y RAM, que se levantan como palomitas y se apagan solas.

Lo que se ve, casi todo en vivo y sobre sistemas que están corriendo:

- **Qué es un sistema agéntico.** Del agente que corre en tu computadora al agente aislado en su propia microVM, y por qué el sandboxing es la pieza que decide todo lo demás.
- **El arnés, y la confusión que trae el término.** SDK, agente de código, framework — y arneces dentro de arneces. Lo que hace bueno a un agente no es el modelo: son las herramientas alrededor y su calidad. Caso medido: 500 millones de tokens que se facturaron como 20, por aprovechar la caché.
- **Agent native.** Injertarle el agente a un software que ya existe, sin reescribirlo. Demo sobre Deník: cambiarle el nombre a un servicio hablando con el agente, en vez de cinco clics.
- **Las seis primitivas.** Prompt (sobrevalorado), tools, skills, subagentes, hooks —los guardrails de verdad, porque son código y no se pueden ignorar— y memoria.
- **Contexto: herramientas en lugar de historial.** El agente arranca vacío y va a buscar lo que necesita. Incluye el hack del file system falso, donde lo que el agente cree que son archivos son filas de una base de datos.
- **Permisos por token de ejecución.** Quién invocó la herramienta y desde qué room, con un mini IAM al estilo de AWS: cómo se bloquea por código lo que un prompt no puede bloquear.
- **La interfaz.** Ver qué herramienta está corriendo el agente no se le pide al modelo, se enganchan los hooks.
- **Preguntas al final.** Evals como postmortem con ojo humano (con un caso real: un pin de WhatsApp que salió en otra ciudad porque la tool exigía latitud y longitud que no existían, y el modelo las inventó), y la estrategia universal de trocear lo grande con un subagente barato.

Sale también, sin recortar, el sistema de llamadas donde se transmitió — estrenándose ese día, con sus bugs a la vista.

**Materiales de la sesión:**

- [Las slides completas](https://www.fixtergeek.com/webinar-1/slides) — las 19, navegables con las flechas.
- [El PDF de las seis piezas](https://www.fixtergeek.com/seis-piezas) — 23 páginas, el regalo que se repartió en el chat.

Es la sesión 0 del taller, que empieza el 1 de septiembre.`;

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
