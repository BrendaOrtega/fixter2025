/**
 * Transcripción y capítulos de la lección 2.5.
 *
 * No sale de whisper: sale del `guion.mjs`, que es la fuente de la narración, con
 * los tiempos reales del montaje (inicio de cada escena + los 0.55s de respiro y
 * la duración del WAV medida con ffprobe). Así no hay errores de oído que
 * corregir — ni el clásico «la gente» por «el agente».
 *
 * Lo único que se cambia respecto a lo que entró al TTS es la fonética: en el
 * texto que se LEE van «JSON-RPC» y «WebSocket», no «yeison erre pe ce».
 *
 *   npx tsx --env-file=.env scripts/transcript-acp-2-5.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const SLUG = "acp-el-remoto";

const FONETICA: [RegExp, string][] = [
  [/yeison erre pe ce/gi, "JSON-RPC"],
  [/yeison/gi, "JSON"],
  [/uebsóket/gi, "WebSocket"],
  [/eich mac/gi, "HMAC"],
  [/báits/gi, "bytes"],
  [/\bnoud\b/gi, "Node"],
  [/goose, versión uno punto cuarenta y seis/gi, "goose 1.46"],
];

const TITULOS = [
  "Qué trae esta lección",
  "Para seguirlo tú: dónde vive y cómo se corre",
  "El protocolo no dice nada del cable",
  "Los dos transportes, la misma forma",
  "El cambio entero cabe en un ternario",
  "Piedra 1: un WebSocket no pone cabeceras",
  "El ticket firmado, con el inquilino dentro",
  "Piedra 2: cuelga sin un error",
  "Por qué el salto de línea no llega",
  "El arreglo: nada se guarda",
  "Su disco, no el tuyo",
  "Una corrida real contra la caja",
  "El permiso sigue siendo tuyo",
  "El cable remoto, con el inspector",
  "El trato: cada quien en su disco",
  "Lo que sigue: el cliente web",
];

async function main() {
  const crudos = JSON.parse(readFileSync("/tmp/segs.json", "utf8")) as
    { s: number; e: number; texto: string }[];
  if (crudos.length !== TITULOS.length)
    throw new Error(`${crudos.length} segmentos y ${TITULOS.length} títulos — no cuadran`);

  const segments = crudos.map(({ s, e, texto }) => ({
    s, e, quien: null,
    texto: FONETICA.reduce((t, [de, a]) => t.replace(de, a), texto),
  }));
  const chapters = segments.map((seg, i) => ({
    s: i === 0 ? 0 : segments[i - 1].e,
    titulo: TITULOS[i],
  }));

  const video = await prisma.video.findUnique({
    where: { slug: SLUG }, select: { id: true, courseIds: true },
  });
  if (!video) throw new Error(`no existe ${SLUG}`);

  const data = {
    videoId: video.id, courseId: video.courseIds[0], language: "es",
    source: "guion", text: segments.map((s) => s.texto).join(" "),
    segments, chapters,
  };
  const ya = await prisma.transcript.findFirst({ where: { videoId: video.id } });
  if (ya) await prisma.transcript.update({ where: { id: ya.id }, data });
  else await prisma.transcript.create({ data });
  console.log(`📝 ${segments.length} segmentos · ${chapters.length} capítulos · ${data.text.length} caracteres`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
