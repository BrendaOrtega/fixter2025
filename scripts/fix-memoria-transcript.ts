/**
 * Dos correcciones sobre el transcript ya importado de la entrega 4.
 *
 * 1. Whisper oyó "arnés" como si fuera una sigla y lo escribió `ARNES`, sin
 *    acento y en mayúsculas — dos veces en el texto y una en el título de un
 *    capítulo. Se ve mal en el buscador y en el JSON-LD.
 * 2. El `source` quedó como `ghosty-teams` y este video se transcribió con
 *    whisper. El campo dice de dónde salió y se usa para saber en qué confiar.
 *
 *   npx tsx --env-file=.env scripts/fix-memoria-transcript.ts
 */
import { db } from "../app/.server/db";

const arnes = (s: string) => s.replace(/\bARN[EÉ]S\b/g, "arnés");

async function main() {
  const t = await db.transcript.findFirst({
    where: { video: { slug: "memoria-sqlite" } },
    select: { id: true, text: true, segments: true, chapters: true },
  });
  if (!t) throw new Error("No hay transcript de memoria-sqlite");

  const segments = (t.segments as any[]).map((s) => ({ ...s, texto: arnes(s.texto) }));
  const chapters = ((t.chapters as any[]) ?? []).map((c) => ({ ...c, titulo: arnes(c.titulo) }));
  const text = arnes(t.text);

  const cambios =
    (t.text.match(/\bARN[EÉ]S\b/g) || []).length +
    ((t.chapters as any[]) ?? []).filter((c) => /\bARN[EÉ]S\b/.test(c.titulo)).length;

  await db.transcript.update({
    where: { id: t.id },
    data: { text, segments, chapters, source: "whisper" },
  });

  console.log(`✏️  ${cambios} correcciones de "ARNES" → "arnés"`);
  console.log(`✏️  source: ghosty-teams → whisper`);
  console.log(`\nCapítulo 1: ${chapters[0]?.titulo}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(0));
