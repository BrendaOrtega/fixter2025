/**
 * Materiales de la lección 2.5.
 *
 * ⚠️ `legacyPath` es único y Prisma escribe `null` explícito: dos recursos sin el
 * campo revientan con P2002 hablando de una ruta que nadie pidió. Se crea con un
 * valor único por recurso, como en las lecciones anteriores.
 *
 *   npx tsx --env-file=.env scripts/materiales-acp-2-5.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const RECURSOS = [
  { slug: "repo-acp-2-5", kind: "repo", title: "Repositorio: acp-desde-cero",
    externalUrl: "https://github.com/blissito/acp-desde-cero" },
  { slug: "tag-06-remoto", kind: "repo", title: "Capítulo de esta lección: git checkout 06-remoto",
    externalUrl: "https://github.com/blissito/acp-desde-cero/tree/06-remoto" },
  { slug: "transport-mjs", kind: "link", title: "transport.mjs — los dos cables",
    externalUrl: "https://github.com/blissito/acp-desde-cero/blob/06-remoto/transport.mjs" },
  { slug: "wire-remoto", kind: "link", title: "wire/remoto.jsonl — las 186 tramas del turno remoto",
    externalUrl: "https://github.com/blissito/acp-desde-cero/blob/06-remoto/wire/remoto.jsonl" },
];

async function main() {
  const v = await prisma.video.findUnique({ where: { slug: "acp-el-remoto" }, select: { id: true } });
  if (!v) throw new Error("no existe acp-el-remoto");
  for (const r of RECURSOS) {
    const ya = await prisma.resource.findFirst({ where: { videoId: v.id, slug: r.slug } });
    if (ya) { await prisma.resource.update({ where: { id: ya.id }, data: { title: r.title, externalUrl: r.externalUrl } }); console.log(`♻️  ${r.slug}`); }
    else { await prisma.resource.create({ data: { ...r, videoId: v.id, legacyPath: `tmp-${r.slug}-${v.id}` } }); console.log(`✅ ${r.slug}`); }
  }
  const n = await prisma.resource.count({ where: { videoId: v.id } });
  console.log(`\n📎 ${n} materiales colgados del video (contados con Prisma)`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
