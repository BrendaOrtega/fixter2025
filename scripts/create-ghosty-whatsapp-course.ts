// Publica en fixtergeek.com el curso 1 de Ghosty Studio (el de Udemy), mientras Udemy
// sigue en revisión. Los datos salen de la academia de ghosty.studio (copia en
// `_academia-whatsapp.data.ts`); los MP4 ya son públicos en img.ghosty.studio.
// Idempotente: se puede correr de nuevo.
import { PrismaClient } from "@prisma/client";
import { COURSES, allLessons, courseStats } from "./_academia-whatsapp.data.ts";

const prisma = new PrismaClient();
const SLUG = "agente-de-ia-que-vende-por-whatsapp";
const AUTHOR = { authorName: "Héctorbliss", photoUrl: "https://i.imgur.com/TaDTihr.png" };

async function main() {
  const c = COURSES[0];
  const lessons = allLessons(c);
  const stats = courseStats(c);

  // Texto de venta. El temario y los conteos ya los pinta la página (cabecera y
  // «¿Qué vas a aprender?»), así que aquí no se repiten.
  const description = [
    "Vas a armar un agente de ventas en Ghosty Studio y conectarlo a tu WhatsApp, a tu sitio web y a Messenger. El curso es para dueños de negocio: todo se hace desde el navegador, sin escribir código.",
    "",
    "## Cómo es el curso",
    "",
    "Cada lección dura alrededor de un minuto. Ghosty la narra sobre la pantalla real de Ghosty Studio, con un cursor que señala cada clic. El ejemplo de principio a fin es Químicos Valdora, una distribuidora de químicos para productos de limpieza inventada para el curso: le enseñas el negocio al agente, lo conectas a tus canales y sigues cada cotización en el tablero de Ghosty Ventas.",
    "",
    "## Con qué terminas",
    "",
    "Un agente que contesta a tus clientes al momento, manda cotizaciones en PDF, les da seguimiento y le pasa la conversación a tu equipo cuando hace falta una persona.",
    "",
    "## Kit del curso",
    "",
    `[${c.kit!.label}](${c.kit!.url}): ${c.kit!.contents.map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join(", ")}.`,
    "",
    "Crea tu propio Agente de IA en [ghosty.studio](https://ghosty.studio).",
  ].join("\n");

  const videoIds: string[] = [];
  for (const [i, l] of lessons.entries()) {
    const slug = `ghosty-whatsapp-${String(l.n).padStart(2, "0")}-${l.slug}`;
    const data = {
      title: `${l.n}. ${l.title}`,
      index: i,
      moduleName: l.section,
      kind: "leccion",
      // La primera abierta; el resto gratis a cambio del correo.
      isPublic: l.n === 1,
      accessLevel: l.n === 1 ? "public" : "subscriber",
      // El video va en HLS (`m3u8`, lo pone upload-hls-local.ts); storageLink vacío, como el resto del sitio.
      storageLink: "",
      poster: l.video!.poster,
      duration: String(Math.max(1, Math.round(l.video!.seconds / 60))),
      description: `${l.summary}\n\nMúsica: «${l.music!.title}» de ${l.music!.author} (${l.music!.url}), CC BY 3.0.`,
      ...AUTHOR,
    };
    const v = await prisma.video.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    videoIds.push(v.id);
  }

  const data = {
    title: c.title,
    summary: c.tagline,
    description,
    // Ilustración transparente para la tarjeta del catálogo (videos/udemy-ghosty-curso/thumbnail/build.py --card).
    // La portada 16:9 se sale de la tarjeta, y el logo solo de Ghosty ya es el del taller de WhatsApp + Docker.
    icon: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/courses/ghosty-whatsapp/card-9d51132a9c.png",
    poster: c.image,
    banner: c.image,
    meta: c.image,
    // Corto: la tarjeta lo pone en una línea junto a los rayos.
    level: "Principiante",
    // La tarjeta ya cuenta las lecciones; aquí sólo va el tiempo.
    duration: `${stats.minutes} min`,
    isFree: true,
    basePrice: 0,
    published: true,
    stage: "on-demand",
    // courseDetail sólo pone la foto del instructor con este nombre exacto.
    authorName: "Héctor Bliss",
    authorAt: "@hectorbliss",
    videoIds,
  };
  const course = await prisma.course.upsert({ where: { slug: SLUG }, update: data, create: { slug: SLUG, ...data } });
  for (const id of videoIds) {
    const v = await prisma.video.findUnique({ where: { id }, select: { courseIds: true } });
    if (!v!.courseIds.includes(course.id))
      await prisma.video.update({ where: { id }, data: { courseIds: [...v!.courseIds, course.id] } });
  }
  console.log(`✅ ${course.slug} (${course.id}) con ${videoIds.length} lecciones`);
}

main().finally(() => prisma.$disconnect());
