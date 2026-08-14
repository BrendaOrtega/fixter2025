/**
 * Sube a Tigris un árbol HLS ya transcodificado localmente
 * (`scripts/transcode-hls-local.sh`) y cierra la fila del Video.
 *
 * Replica exactamente lo que haría `s3VideoService.uploadHLSFiles`:
 * mismas keys, mismos content-types, objetos privados (los presigna
 * `/api/hls-proxy` al reproducir).
 *
 *   npx tsx scripts/upload-hls-local.ts <courseId> <videoId> <dirHLS> [--only=1080p] [--skip-db]
 *
 * `--only` sube una sola calidad (sirve para solapar la subida con el
 * transcode de las demás) y `--skip-db` deja la fila del Video sin tocar
 * hasta que esté TODO arriba.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

const args = process.argv.slice(2);
const [courseId, videoId, hlsDir] = args.filter((a) => !a.startsWith("--"));
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const skipDb = args.includes("--skip-db");
if (!courseId || !videoId || !hlsDir) {
  console.error("uso: npx tsx scripts/upload-hls-local.ts <courseId> <videoId> <dirHLS>");
  process.exit(1);
}

const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";
const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
// Ocho a la vez: son ~1,400 segmentos y de uno en uno tarda una eternidad, pero
// abrirlos todos satura la subida de casa.
const CONCURRENCY = 8;

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const prisma = new PrismaClient();

/** Los mismos headers que pone uploadHLSFiles: el proxy y hls.js dependen de ellos. */
const headersFor = (key: string) =>
  key.endsWith(".m3u8")
    ? { ContentType: "application/x-mpegURL", CacheControl: "no-cache" }
    : { ContentType: "video/MP2T", CacheControl: "private, max-age=1800" };

/** Lista recursiva de archivos, con la ruta RELATIVA al directorio raíz. */
async function walk(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full));
  }
  return out;
}

async function uploadOne(relative: string) {
  const key = `fixtergeek/videos/${courseId}/${videoId}/hls/${relative}`;
  const body = await fs.readFile(path.join(hlsDir, relative));
  // Un fallo suelto de red no debe tirar una subida de media hora.
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await s3.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ...headersFor(relative) })
      );
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
}

async function main() {
  const files = (await walk(hlsDir))
    .filter((f) => f.endsWith(".ts") || f.endsWith(".m3u8"))
    // `--only=720p` filtra por carpeta; `--only=master.m3u8`, por archivo exacto.
    .filter((f) => (only ? f === only || f.startsWith(`${only}/`) : true));
  const segments = files.filter((f) => f.endsWith(".ts"));
  const playlists = files.filter((f) => f.endsWith(".m3u8"));
  console.log(`📦 ${segments.length} segmentos + ${playlists.length} playlists → ${BUCKET}`);

  // Los segmentos PRIMERO: una playlist que apunta a segmentos que aún no
  // existen es una playlist rota si alguien entra a medio camino.
  let done = 0;
  const queue = [...segments];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) break;
        await uploadOne(next);
        done++;
        if (done % 50 === 0) console.log(`   ${done}/${segments.length}`);
      }
    })
  );
  for (const playlist of playlists) await uploadOne(playlist);
  console.log(`✅ Subidos ${files.length} archivos`);

  if (skipDb) {
    console.log("↩️  --skip-db: la fila del Video se cierra en la corrida final");
    return;
  }

  const m3u8 = `${ENDPOINT}/${BUCKET}/fixtergeek/videos/${courseId}/${videoId}/hls/master.m3u8`;
  await prisma.video.update({
    where: { id: videoId },
    data: {
      m3u8,
      processingStatus: "ready",
      processingCompletedAt: new Date(),
      processingMetadata: {
        qualities: ["1080p", "720p", "480p"],
        processedAt: new Date().toISOString(),
        note: "transcodificado local con h264_videotoolbox y subido con scripts/upload-hls-local.ts",
      },
    },
  });
  console.log(`\n🎬 Video.m3u8 = ${m3u8}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
