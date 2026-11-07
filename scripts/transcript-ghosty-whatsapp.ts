/**
 * Transcripciones del curso «Crea tu agente de IA que vende por WhatsApp, sin programar».
 *
 * No salen de whisper: salen de la narración de cada lección (Ghosty con TTS), igual que
 * `transcript-acp-2-5.ts`. Por clip de voz:
 *   - texto: `voice/lines.json`, que es el texto literal de pantalla, ya con «Ghosty Ventas»,
 *     «tambo», etc.;
 *   - inicio: `score.gen.json` → `voice[].t`, el segundo en que el montaje mete ese clip;
 *   - fin: inicio + la duración del WAV medida (`lines.json` → `dur`).
 * El transcript es lo que leen los buscadores y los modelos (JSON-LD del visor, extracto),
 * así que tiene que decir exactamente lo que se oye.
 *
 * Las fuentes viven en `videos/udemy-ghosty-curso/lNN/` (fuera del repo, .gitignore).
 *
 *   npx tsx scripts/transcript-ghosty-whatsapp.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const COURSE = "agente-de-ia-que-vende-por-whatsapp";
const ROOT = "videos/udemy-ghosty-curso";

type Line = { scene: string; file: string; dur: number; words: { w: string }[] };
type Score = { duration: number; voice: { t: number; file: string }[] };

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: COURSE }, select: { id: true } });
  if (!course) throw new Error(`no existe ${COURSE}`);
  const videos = await prisma.video.findMany({
    where: { courseIds: { has: course.id } },
    select: { id: true, slug: true },
    orderBy: { index: "asc" },
  });
  if (videos.length !== 26) throw new Error(`esperaba 26 lecciones y hay ${videos.length}`);

  for (const v of videos) {
    const n = v.slug.match(/^ghosty-whatsapp-(\d{2})-/)?.[1];
    if (!n) throw new Error(`slug inesperado: ${v.slug}`);
    const dir = `${ROOT}/l${n}`;
    const score: Score = JSON.parse(readFileSync(`${dir}/score.gen.json`, "utf8"));
    const lines: Line[] = JSON.parse(readFileSync(`${dir}/voice/lines.json`, "utf8"));

    // Cada clip de voz del montaje tiene que tener su línea, en el mismo orden.
    const files = score.voice.map((x) => x.file);
    if (files.join() !== lines.map((l) => l.file).join())
      throw new Error(`L${n}: los clips del montaje y lines.json no cuadran`);

    const segments = lines.map((l, i) => {
      const s = Math.round(score.voice[i].t * 100) / 100;
      return {
        s,
        e: Math.round((score.voice[i].t + l.dur) * 100) / 100,
        quien: "Ghosty",
        texto: l.words.map((w) => w.w).join(" "),
      };
    });
    const last = segments[segments.length - 1];
    if (last.e > score.duration + 0.5)
      throw new Error(`L${n}: la voz termina en ${last.e}s y el video dura ${score.duration}s`);

    const data = {
      videoId: v.id,
      courseId: course.id,
      language: "es",
      source: "guion",
      text: segments.map((s) => s.texto).join(" "),
      segments,
    };
    await prisma.transcript.upsert({ where: { videoId: v.id }, update: data, create: data });
    console.log(`📝 L${n} · ${segments.length} segmentos · ${data.text.length} caracteres`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
