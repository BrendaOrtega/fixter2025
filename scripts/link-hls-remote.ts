/**
 * Cierra la fila de un Video cuyo HLS **ya está en Tigris** — lo subió la caja del webinar,
 * no esta laptop.
 *
 *   npx tsx scripts/link-hls-remote.ts <courseId> <videoId> [--prefix=...] [--check]
 *
 * Es el gemelo de `upload-hls-local.ts` sin la parte de subir: mismo prefijo, mismo
 * `m3u8`, mismo `processingStatus`. Existe porque publicar un webinar costaba bajar 2.2 GB
 * a casa y volver a subir 3.6 GB; hoy la caja transcodifica y sube sola, y lo único que
 * falta del lado de fixtergeek es apuntar la fila.
 *
 * `--check` verifica que el master.m3u8 exista de verdad antes de escribir en la base: una
 * fila `ready` apuntando a un objeto que no está deja el reproductor en negro sin decir por
 * qué, y eso se descubre con público delante.
 */
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const [courseId, videoId] = args.filter((a) => !a.startsWith("--"));
const prefixArg = args.find((a) => a.startsWith("--prefix="))?.split("=")[1];
const check = args.includes("--check");
if (!courseId || !videoId) {
  console.error("uso: npx tsx scripts/link-hls-remote.ts <courseId> <videoId> [--prefix=...] [--check]");
  process.exit(1);
}

const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";
const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
// El mismo layout que produce upload-hls-local.ts. Es también el `hlsPrefix` que hay que
// pasarle a la caja al detener la grabación.
const prefix = prefixArg ?? `fixtergeek/videos/${courseId}/${videoId}/hls`;
const m3u8 = `${ENDPOINT}/${BUCKET}/${prefix}/master.m3u8`;

const prisma = new PrismaClient();

async function main() {
  console.log(`prefijo : ${prefix}`);
  console.log(`m3u8    : ${m3u8}`);

  if (check) {
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint: ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `${prefix}/master.m3u8` }));
    console.log("✓ master.m3u8 existe en el bucket");
  }

  await prisma.video.update({
    where: { id: videoId },
    data: {
      m3u8,
      processingStatus: "ready",
      processingCompletedAt: new Date(),
      processingMetadata: {
        qualities: ["1080p", "720p", "480p"],
        processedAt: new Date().toISOString(),
        note: "HLS generado y subido por la caja del evento (livekit-svc); esta corrida sólo apunta la fila",
      },
    },
  });
  console.log("\n🎬 fila del Video actualizada");
}

main()
  .catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
