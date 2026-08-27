/**
 * Lección 2.3 «Quién manda» entra al viewer.
 *
 * ⚠️ Ocupa el índice 9, así que `acp-en-vivo` baja al 10.
 *   npx tsx --env-file=.env scripts/publicar-acp-2-3.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const L = {
  slug: "acp-quien-manda",
  index: 9,
  title: "Quién manda",
  duration: "3.5",
  description: `Sesión, turno, y el momento en que el agente te pide permiso 🛑

Una sesión se abre con una carpeta y te devuelve un identificador. El turno es
**una sola petición** que no se resuelve hasta que el agente termina, y mientras
tanto te va contando lo que hace.

Y entonces se da la vuelta: **el agente te llama a ti**. Te pide leer un archivo,
te pide escribirlo — y antes de tocar nada que importe, se detiene y pide
permiso. Él propone las opciones; tú eliges una.

Con el caso incómodo incluido: un agente puede arrancar aprobándose todo a sí
mismo. Se ve en el cable grabado, \`currentModeId: bypassPermissions\`, y el turno
se ve igual que cualquier otro. Se corrige con \`session/set_mode\`.
`,
};

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: "sistemas-agenticos" },
    select: { id: true, videoIds: true },
  });
  if (!course) throw new Error("no existe el curso");

  const enVivo = await prisma.video.findUnique({ where: { slug: "acp-en-vivo" } });
  if (enVivo && enVivo.index !== 10) {
    await prisma.video.update({ where: { id: enVivo.id }, data: { index: 10 } });
    console.log(`↪️  acp-en-vivo → index 10`);
  }

  const ya = await prisma.video.findUnique({ where: { slug: L.slug } });
  const data = {
    title: L.title, description: L.description, duration: L.duration,
    index: L.index, moduleName: "ACP desde cero", kind: "leccion",
    accessLevel: "sequence", isPublic: false,
  };
  let id: string;
  if (ya) {
    await prisma.video.update({ where: { id: ya.id }, data });
    id = ya.id;
    console.log(`♻️  ${L.slug} (${id})`);
  } else {
    const v = await prisma.video.create({
      data: { ...data, slug: L.slug, authorName: "blissmo", processingStatus: "pending", courseIds: [course.id] },
    });
    id = v.id;
    console.log(`✅ [${v.index}] ${v.slug} (${id})`);
  }
  if (!course.videoIds.includes(id))
    await prisma.course.update({ where: { id: course.id }, data: { videoIds: { push: id } } });

  console.log(`\ncourseId=${course.id}\nvideoId=${id}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
