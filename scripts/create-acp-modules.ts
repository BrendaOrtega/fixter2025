/**
 * Reserva el lugar de los dos capítulos de ACP dentro del curso
 * `sistemas-agenticos`.
 *
 * Un módulo no es una fila propia: es el `moduleName` de sus videos. Así que
 * "crear el capítulo vacío" es crear su primer video en placeholder — sin HLS
 * y sin publicar — para que el orden quede apartado antes de que llegue la
 * grabación. El `index` sólo se escribe al crear; actualizarlo después manda
 * la pieza al final del viewer.
 *
 *   npx tsx --env-file=.env scripts/create-acp-modules.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COURSE_SLUG = "sistemas-agenticos";

const PLACEHOLDERS = [
  {
    slug: "acp-desde-cero",
    title: "ACP desde cero",
    moduleName: "ACP desde cero",
    description: `El protocolo que conecta un editor con cualquier agente 🔌

Construyes el cliente completo: el cable JSON-RPC, el inspector que
correlaciona request y response, y al final lo conectas a una sandbox remota
por \`wss://\`.

_Próximamente._
`,
  },
  {
    slug: "acp-en-vivo",
    title: "ACP en vivo: demostración",
    moduleName: "ACP · en vivo",
    description: `La sesión demostrativa del protocolo, de principio a fin 🎬

_Próximamente._
`,
  },
];

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 Curso: ${course.title} (${course.id})`);

  const last = await prisma.video.findFirst({
    where: { courseIds: { has: course.id } },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  let index = (last?.index ?? -1) + 1;

  for (const p of PLACEHOLDERS) {
    const existing = await prisma.video.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`⏭️  Ya existe ${p.slug} (index ${existing.index})`);
      continue;
    }
    const video = await prisma.video.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        moduleName: p.moduleName,
        kind: "leccion",
        accessLevel: "sequence",
        isPublic: false,
        index: index++,
        authorName: "blissmo",
        processingStatus: "pending",
        courseIds: [course.id],
      },
    });
    await prisma.course.update({
      where: { id: course.id },
      data: { videoIds: { push: video.id } },
    });
    console.log(`✅ ${video.index} · ${video.moduleName} · ${video.slug} (${video.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
