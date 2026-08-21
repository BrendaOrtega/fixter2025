/**
 * Genera los capítulos de un vídeo a partir del transcript que ya está en la base.
 *
 * El pipeline de ingesta ya los intenta al recibir la transcripción, pero se traga el
 * fallo a propósito —sin capítulos el vídeo se puede ver, buscar y subtitular; sin
 * transcripción, nada de eso—, así que un vídeo puede acabar publicado con
 * `chapters: null` y nadie se entera. Esto los rehace sin volver a transcribir nada.
 *
 *   npx tsx scripts/generate-chapters.ts <videoSlug>
 *   npx tsx scripts/generate-chapters.ts <videoSlug> --apply
 */
import { PrismaClient } from "@prisma/client";
import { generarCapitulos } from "../app/.server/chapters";

const prisma = new PrismaClient();
const slug = process.argv[2];
const apply = process.argv.includes("--apply");

async function main() {
  if (!slug) throw new Error("uso: generate-chapters.ts <videoSlug> [--apply]");
  const video = await prisma.video.findUnique({ where: { slug }, select: { id: true, title: true } });
  if (!video) throw new Error(`no existe el vídeo ${slug}`);

  const t: any = await prisma.transcript.findFirst({ where: { videoId: video.id } });
  const segmentos = (t?.segments as any[]) ?? [];
  if (!segmentos.length) throw new Error("ese vídeo no tiene transcripción");
  console.log(`${segmentos.length} segmentos · ${Math.round((segmentos.at(-1)?.e ?? 0) / 60)} min`);

  const chapters = await generarCapitulos(segmentos, { titulo: video.title });
  const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  chapters.forEach((c: any) => console.log(`  ${reloj(c.s).padStart(6)}  ${c.titulo}`));
  if (!apply) return console.log("\n(sin --apply no se guardó nada)");

  await prisma.transcript.update({ where: { id: t.id }, data: { chapters: chapters as unknown as object } });
  console.log(`\n✅ ${chapters.length} capítulos guardados`);
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
