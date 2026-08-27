/**
 * Lección 2.4 «El inspector». Ocupa el índice 10; `acp-en-vivo` baja al 11.
 *   npx tsx --env-file=.env scripts/publicar-acp-2-4.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const L = {
  slug: "acp-el-inspector", index: 10, title: "El inspector", duration: "2.75",
  description: `Cincuenta y ocho líneas para leer el cable 🔍

Un turno completo son 25 tramas y 58 mil caracteres, y ninguna cabe en una
línea. El inspector del repo hace **dos cosas** y con eso el turno entero cabe
en una pantalla: colapsa las rachas de notificaciones iguales, y correlaciona
cada petición con su respuesta buscándola **por la dirección contraria** — con
lo que funciona en los dos sentidos sin escribir el caso dos veces.

Y de regalo, lo que casi nadie espera encontrar ahí: el gasto del turno viaja
por el mismo cable. En el turno de la lección anterior, **34,847 tokens de un
millón y 18 centavos**, reportados mientras el turno seguía vivo.

Todo se corre desde el repo: \`git checkout 05-inspector\` y
\`node inspector.mjs wire/permiso.jsonl\`. Sin instalar nada.
`,
};
async function main() {
  const c = await prisma.course.findUnique({ where: { slug: "sistemas-agenticos" }, select: { id: true, videoIds: true } });
  const ev = await prisma.video.findUnique({ where: { slug: "acp-en-vivo" } });
  if (ev && ev.index !== 11) { await prisma.video.update({ where: { id: ev.id }, data: { index: 11 } }); console.log("↪️  acp-en-vivo → 11"); }
  const ya = await prisma.video.findUnique({ where: { slug: L.slug } });
  const data = { title: L.title, description: L.description, duration: L.duration, index: L.index,
    moduleName: "ACP desde cero", kind: "leccion", accessLevel: "sequence", isPublic: false };
  let id: string;
  if (ya) { await prisma.video.update({ where: { id: ya.id }, data }); id = ya.id; console.log(`♻️  ${L.slug}`); }
  else {
    const v = await prisma.video.create({ data: { ...data, slug: L.slug, authorName: "blissmo", processingStatus: "pending", courseIds: [c!.id] } });
    id = v.id; console.log(`✅ [${v.index}] ${v.slug}`);
  }
  if (!c!.videoIds.includes(id)) await prisma.course.update({ where: { id: c!.id }, data: { videoIds: { push: id } } });
  console.log(`\ncourseId=${c!.id}\nvideoId=${id}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
