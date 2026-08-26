/**
 * Convierte el placeholder del módulo ACP en sus DOS lecciones reales.
 *
 *   2.1  acp-desde-cero  · «Preparando el agente»   (reusa el placeholder)
 *   2.2  acp-el-cable    · «El cable»               (fila nueva)
 *
 * ⚠️ El slug `acp-desde-cero` NO se toca aunque ahora sea la lección 2.1 y no
 * el módulo entero: el README de `blissito/acp-desde-cero` —ya publicado en
 * GitHub— enlaza a `/cursos/sistemas-agenticos/acp-desde-cero`. Cambiarlo
 * rompería ese enlace sin que nadie se entere. Que el slug no coincida con el
 * título es barato; un 404 en el material del curso, no.
 *
 * ⚠️ `index` normalmente sólo se escribe al CREAR. Aquí se mueve a propósito:
 * la lección nueva ocupa el 7 y `acp-en-vivo` baja al 8. Es un movimiento
 * deliberado, no el descuido de un script de actualización.
 *
 *   npx tsx --env-file=.env scripts/publicar-acp-lecciones.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COURSE_SLUG = "sistemas-agenticos";
const MODULO = "ACP desde cero";

const LECCIONES = [
  {
    slug: "acp-desde-cero",
    index: 6,
    title: "Preparando el agente",
    duration: "2",
    description: `Antes del cliente: de dónde sale el agente, y por qué no viene en el repo 🔌

El agente **no es una librería que importas**: es un programa aparte que
instalas tú y que corre por su cuenta. Por eso este cliente puede presumir de
cero dependencias mientras el agente trae ciento cinco.

Tres agentes hablan ACP, y el mismo cliente funciona con los tres sin cambiar
una línea: **Claude**, **Codex** y **DeepSeek**. En el video se prueban de
verdad, y sus respuestas al saludo son distintas — ahí se ve, en vivo, por qué
el protocolo negocia en vez de suponer.

Y al final, por qué \`spawn\`: ACP no viaja por la red, viaja por la entrada y
salida estándar de un proceso.
`,
  },
  {
    slug: "acp-el-cable",
    index: 7,
    title: "El cable",
    duration: "5",
    description: `Qué viaja entre tu editor y un agente, y cómo se lee 🧵

JSON-RPC 2.0, **una línea por mensaje**, delimitado por saltos de línea y sin
el encabezado \`Content-Length\` de LSP. Trece métodos del lado del agente y
once del lado del cliente — pero el núcleo son cinco.

Se recorre el capítulo \`02-initialize\` del repo línea por línea: arrancar al
agente, escribir en el cable, leer los trozos que **no respetan los mensajes**,
casar cada respuesta con su petición, y el apretón de manos completo contra un
agente real.

Y la asimetría que casi nadie cuenta: el agente también te llama a ti.
`,
  },
];

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, title: true, videoIds: true },
  });
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`);
  console.log(`📚 ${course.title} (${course.id})`);

  // Primero se aparta `acp-en-vivo`, o la lección nueva chocaría con su índice.
  const enVivo = await prisma.video.findUnique({ where: { slug: "acp-en-vivo" } });
  if (enVivo && enVivo.index !== 8) {
    await prisma.video.update({ where: { id: enVivo.id }, data: { index: 8 } });
    console.log(`↪️  acp-en-vivo: index ${enVivo.index} → 8`);
  }

  for (const l of LECCIONES) {
    const existe = await prisma.video.findUnique({ where: { slug: l.slug } });
    if (existe) {
      await prisma.video.update({
        where: { id: existe.id },
        data: {
          title: l.title,
          description: l.description,
          duration: l.duration,
          index: l.index,
          moduleName: MODULO,
          kind: "leccion",
          accessLevel: "sequence",
        },
      });
      console.log(`♻️  [${l.index}] ${l.slug} → «${l.title}» (${existe.id})`);
      continue;
    }
    const v = await prisma.video.create({
      data: {
        slug: l.slug,
        title: l.title,
        description: l.description,
        duration: l.duration,
        moduleName: MODULO,
        kind: "leccion",
        accessLevel: "sequence",
        isPublic: false,
        index: l.index,
        authorName: "blissmo",
        processingStatus: "pending",
        courseIds: [course.id],
      },
    });
    // La relación va en LOS DOS lados o la pieza queda invisible en un sitio.
    if (!course.videoIds.includes(v.id))
      await prisma.course.update({
        where: { id: course.id },
        data: { videoIds: { push: v.id } },
      });
    console.log(`✅ [${v.index}] ${v.slug} «${v.title}» (${v.id})`);
  }

  const todos = await prisma.video.findMany({
    where: { courseIds: { has: course.id } },
    select: { index: true, slug: true, title: true, moduleName: true, processingStatus: true },
    orderBy: { index: "asc" },
  });
  console.log("\n— orden final —");
  for (const v of todos)
    console.log(`  [${v.index}] ${v.moduleName} · ${v.slug} «${v.title}» ${v.processingStatus}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
