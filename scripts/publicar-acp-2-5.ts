/**
 * Lección 2.5 «El agente remoto». Ocupa el índice 11; `acp-en-vivo` baja al 12.
 *   npx tsx --env-file=.env scripts/publicar-acp-2-5.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const L = {
  slug: "acp-el-remoto", index: 11, title: "El agente remoto", duration: "3.95",
  description: `El mismo cliente, contra un agente que no está en tu máquina 🛰️

ACP no dice nada sobre el cable: dice que los mensajes son JSON-RPC y que van
uno por línea. Quién los lleva es problema aparte — y por eso pasar de un
proceso hijo a una caja remota **cabe en un ternario**. Ni la sesión, ni el
turno, ni la respuesta a lo que el agente pide se enteran.

Las **dos piedras** del camino, las dos verdaderas:

- Un \`new WebSocket()\` no puede poner cabeceras. La autorización viaja como
  ticket firmado con HMAC en el query, y el inquilino va **dentro** de la firma:
  uno que sólo dijera quién eres serviría igual contra la caja de otro.
- Sobre WebSocket el \`\\n\` **no llega**, porque la trama ya es la frontera. Un
  lector de líneas se queda con el mensaje en el buffer y el cliente cuelga
  **sin un solo error**.

Y lo que no se mueve: el archivo aparece en \`/data\`, dentro de la caja, y el
agente sigue deteniéndose para pedirte permiso desde el otro lado del mundo.

Todo se corre desde el repo: \`git checkout 06-remoto\`.
`,
};
async function main() {
  const c = await prisma.course.findUnique({ where: { slug: "sistemas-agenticos" }, select: { id: true, videoIds: true } });
  const ev = await prisma.video.findUnique({ where: { slug: "acp-en-vivo" } });
  if (ev && ev.index !== 12) { await prisma.video.update({ where: { id: ev.id }, data: { index: 12 } }); console.log("↪️  acp-en-vivo → 12"); }
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
