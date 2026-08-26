/**
 * El tráiler del módulo ACP entra al viewer como la pieza 0 del módulo.
 *
 * Es la única pieza PÚBLICA del módulo: un tráiler que pide secuencia para
 * verse no es un tráiler. Por eso `accessLevel: "public"` + `isPublic: true`,
 * al revés que las lecciones.
 *
 * ⚠️ Ocupa el índice 6, así que todo lo de abajo se corre uno. `index` se
 * mueve a propósito aquí; no es un descuido de un script de actualización.
 *
 *   npx tsx --env-file=.env scripts/publicar-acp-trailer.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COURSE_SLUG = "sistemas-agenticos";
const MODULO = "ACP desde cero";

const CORRIMIENTO: Array<[string, number]> = [
  ["acp-desde-cero", 7],
  ["acp-el-cable", 8],
  ["acp-en-vivo", 9],
];

const TRAILER = {
  slug: "acp-trailer",
  index: 6,
  title: "El módulo en un minuto",
  duration: "1",
  description: `De qué va este módulo, en un minuto 🎬

El curso no va de qué modelo es más listo: va de lo que hay **alrededor** del
modelo. Quién le da las herramientas, quién decide si puede borrar un archivo,
dónde corre cuando el trabajo es de verdad. Ese alrededor tiene nombre —el
**arnés**— y a diferencia del modelo, ése sí lo construyes tú.

Aquí se ve el arco completo: qué es ACP, cómo se lee el cable, y el momento en
que el mismo cliente —sin cambiar una línea— habla con un agente que **no está
en tu máquina**.

Cama musical: *Learning to Drive* (CC BY 3.0).
`,
};

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 ${course.title} (${course.id})`);

  // Primero se abre el hueco, o el tráiler choca con `acp-desde-cero`.
  for (const [slug, index] of CORRIMIENTO) {
    const v = await prisma.video.findUnique({ where: { slug } });
    if (!v) { console.log(`⏭️  no existe ${slug}`); continue; }
    if (v.index === index) { console.log(`✔️  ${slug} ya en ${index}`); continue; }
    await prisma.video.update({ where: { id: v.id }, data: { index } });
    console.log(`↪️  ${slug}: index ${v.index} → ${index}`);
  }

  const existe = await prisma.video.findUnique({ where: { slug: TRAILER.slug } });
  let id: string;
  if (existe) {
    await prisma.video.update({
      where: { id: existe.id },
      data: {
        title: TRAILER.title,
        description: TRAILER.description,
        duration: TRAILER.duration,
        index: TRAILER.index,
        moduleName: MODULO,
        kind: "leccion",
        accessLevel: "public",
        isPublic: true,
      },
    });
    id = existe.id;
    console.log(`♻️  [${TRAILER.index}] ${TRAILER.slug} (${id})`);
  } else {
    const v = await prisma.video.create({
      data: {
        slug: TRAILER.slug,
        title: TRAILER.title,
        description: TRAILER.description,
        duration: TRAILER.duration,
        moduleName: MODULO,
        kind: "leccion",
        accessLevel: "public",
        isPublic: true,
        index: TRAILER.index,
        authorName: "blissmo",
        processingStatus: "pending",
        courseIds: [course.id],
      },
    });
    id = v.id;
    console.log(`✅ [${v.index}] ${v.slug} «${v.title}» (${v.id})`);
  }

  // La relación va en LOS DOS lados o la pieza queda invisible en un sitio.
  if (!course.videoIds.includes(id)) {
    await prisma.course.update({ where: { id: course.id }, data: { videoIds: { push: id } } });
    console.log(`🔗 Course.videoIds += ${id}`);
  }

  console.log(`\ncourseId=${course.id}\nvideoId=${id}`);

  const todos = await prisma.video.findMany({
    where: { courseIds: { has: course.id } },
    select: { index: true, slug: true, title: true, moduleName: true, accessLevel: true, processingStatus: true },
    orderBy: { index: "asc" },
  });
  console.log("\n— orden final —");
  for (const v of todos)
    console.log(`  [${v.index}] ${v.moduleName} · ${v.slug} «${v.title}» ${v.accessLevel} ${v.processingStatus}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
