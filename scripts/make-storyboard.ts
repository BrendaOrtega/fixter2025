/**
 * Genera y sube el storyboard de miniaturas de un video subido a mano.
 *
 * `livekit-svc` lo produce solo para las grabaciones que pasan por él, pero un
 * video transcodificado en local y subido con `upload-hls-local.ts` se queda sin
 * miniaturas: al pasar el mouse por la barra sale el capítulo y la hora, y
 * ningún cuadro.
 *
 * Formato que espera `/api/storyboard/:videoSlug`: un sprite con un fotograma
 * cada 10 s y un WebVTT cuyos cues apuntan al recorte con `#xywh`. La ruta
 * reescribe el nombre relativo a una URL firmada, así que los objetos van
 * PRIVADOS, igual que el HLS.
 *
 *   npx tsx --env-file=.env scripts/make-storyboard.ts <videoSlug> <archivoFuente>
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { execFileSync } from "child_process";
import { readFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { db } from "../app/.server/db";

const [videoSlug, fuente] = process.argv.slice(2);
if (!videoSlug || !fuente) {
  console.error("uso: npx tsx scripts/make-storyboard.ts <videoSlug> <archivoFuente>");
  process.exit(1);
}

const CADA = 10; // segundos entre fotogramas
const W = 160;   // ancho del tile
const H = 90;    // alto del tile (16:9)
const COLS = 10;

const BUCKET = "wild-bird-2039";
const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const hhmmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.000`;
};

async function main() {
  const video = await db.video.findUnique({
    where: { slug: videoSlug },
    select: { m3u8: true, title: true },
  });
  if (!video?.m3u8) throw new Error(`${videoSlug} no tiene HLS; el storyboard cuelga del mismo prefijo`);

  const dur = Math.floor(
    Number(
      execFileSync("ffprobe", [
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", fuente,
      ]).toString().trim()
    )
  );
  const tiles = Math.ceil(dur / CADA);
  const filas = Math.ceil(tiles / COLS);
  console.log(`🎬 ${video.title} · ${dur}s → ${tiles} miniaturas (${COLS}×${filas})`);

  const dir = mkdtempSync(join(tmpdir(), "sb-"));
  const sprite = join(dir, "storyboard.jpg");

  // Un solo paso: muestrea, escala y arma la rejilla. `-frames:v 1` porque
  // `tile` emite una imagen por rejilla completa y solo queremos la primera.
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", fuente,
    "-vf", `fps=1/${CADA},scale=${W}:${H},tile=${COLS}x${filas}`,
    "-frames:v", "1", "-q:v", "6", sprite,
  ], { stdio: "inherit" });

  // El VTT: un cue por tile, con el recorte en el fragmento.
  const cues: string[] = ["WEBVTT", ""];
  for (let i = 0; i < tiles; i++) {
    const desde = i * CADA;
    const hasta = Math.min((i + 1) * CADA, dur);
    const x = (i % COLS) * W;
    const y = Math.floor(i / COLS) * H;
    cues.push(`${hhmmss(desde)} --> ${hhmmss(hasta)}`);
    cues.push(`storyboard.jpg#xywh=${x},${y},${W},${H}`);
    cues.push("");
  }
  const vtt = cues.join("\n");

  // …/hls/master.m3u8 → …/storyboard/
  const base = video.m3u8.replace(/\/hls\/[^/]*$/, "/");
  const prefijo = new URL(base).pathname.replace(/^\/[^/]+\//, "") + "storyboard/";

  for (const [key, body, type] of [
    [`${prefijo}storyboard.jpg`, readFileSync(sprite), "image/jpeg"],
    [`${prefijo}storyboard.vtt`, Buffer.from(vtt, "utf8"), "text/vtt"],
  ] as const) {
    // Privados a propósito: los firma /api/hls-proxy, como las playlists.
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: body, ContentType: type,
    }));
    console.log(`↑ ${key}`);
  }

  console.log(`\n✅ storyboard listo (sprite ${COLS * W}×${filas * H})`);
}

main()
  .catch((e) => {
    console.error("Error:", e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(0));
