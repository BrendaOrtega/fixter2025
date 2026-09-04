/**
 * Corrige los BANDWIDTH del master.m3u8 de un video ya subido, sin recodificar.
 *
 * El pipeline de HLS declaraba el bitrate PROMEDIO de cada calidad, pero la
 * especificación pide el PICO. Con el promedio, el reproductor cree que 1080p
 * "cabe" en la conexión del alumno, se queda ahí, y cuando llega un segmento
 * pesado el búfer se vacía y el video se congela hasta que alguien adelanta.
 *
 * Uso:
 *   npx tsx scripts/fix-hls-bandwidth.ts <slug-del-video>            # sólo muestra el diff
 *   npx tsx scripts/fix-hls-bandwidth.ts <slug-del-video> --apply    # respalda y sube
 */
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";

// Cargar .env sin dependencias: este script corre suelto, fuera del server.
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const [slug, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");
if (!slug) {
  console.error("Falta el slug del video.");
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: "https://t3.storage.dev",
});

const db = new PrismaClient();
const video = await db.video.findFirst({
  where: { OR: [{ slug }, { previousSlugs: { has: slug } }] },
  select: { slug: true, title: true, m3u8: true },
});
await db.$disconnect();

if (!video?.m3u8) {
  console.error(`No hay video con slug "${slug}" o no tiene m3u8.`);
  process.exit(1);
}

// https://t3.storage.dev/<bucket>/<key> → bucket + key
const url = new URL(video.m3u8);
const [, Bucket, ...keyParts] = url.pathname.split("/");
const masterKey = keyParts.join("/");
const base = masterKey.slice(0, masterKey.lastIndexOf("/") + 1);

const getText = async (Key: string) =>
  new Response(
    (await s3.send(new GetObjectCommand({ Bucket, Key }))).Body as any
  ).text();

// Listado paginado: sin el ContinuationToken sólo llegan las primeras 1000
// llaves y los tamaños salen incompletos.
const sizes = new Map<string, number>();
let token: string | undefined;
do {
  const page = await s3.send(
    new ListObjectsV2Command({ Bucket, Prefix: base, MaxKeys: 1000, ContinuationToken: token })
  );
  for (const o of page.Contents ?? []) sizes.set(o.Key!, o.Size!);
  token = page.NextContinuationToken;
} while (token);

console.log(`🎬 ${video.title}`);
console.log(`   ${sizes.size} objetos bajo ${base}\n`);

const master = await getText(masterKey);

/** Pico y promedio reales de una calidad, medidos sobre sus segmentos. */
async function measure(playlistPath: string) {
  const playlistKey = base + playlistPath;
  const playlist = await getText(playlistKey);
  const prefix = playlistKey.slice(0, playlistKey.lastIndexOf("/") + 1);

  const lines = playlist.split("\n");
  let peak = 0;
  let bytes = 0;
  let seconds = 0;
  let pendingDuration: number | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    const ext = line.match(/^#EXTINF:([\d.]+)/);
    if (ext) {
      pendingDuration = Number(ext[1]);
      continue;
    }
    if (!line || line.startsWith("#") || pendingDuration === null) continue;

    const size = sizes.get(prefix + line);
    if (size !== undefined && pendingDuration > 0) {
      peak = Math.max(peak, (size * 8) / pendingDuration);
      bytes += size;
      seconds += pendingDuration;
    }
    pendingDuration = null;
  }

  return { peak: Math.ceil(peak), average: Math.ceil((bytes * 8) / seconds), seconds };
}

// Recorrer el master: cada #EXT-X-STREAM-INF y la línea de ruta que le sigue.
const lines = master.split("\n");
type Variant = { attrs: string; path: string; height: number; peak: number; average: number };
const variants: Variant[] = [];
const header: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith("#EXT-X-STREAM-INF")) {
    const path = lines[i + 1]?.trim();
    if (!path) continue;
    const { peak, average, seconds } = await measure(path);
    const height = Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1] ?? 0);
    console.log(
      `   ${path.split("/")[0].padEnd(6)} ${(seconds / 60).toFixed(1)} min | ` +
        `medio ${(average / 1e6).toFixed(1)} Mbps | pico ${(peak / 1e6).toFixed(1)} Mbps`
    );
    variants.push({ attrs: line.trim(), path, height, peak, average });
    i++; // saltar la línea de ruta, ya la consumimos
  } else if (line.trim() && !variants.length) {
    header.push(line.trimEnd()); // #EXTM3U, #EXT-X-VERSION, #EXT-X-MEDIA de subtítulos…
  }
}

// De menor a mayor: el arranque va por la calidad ligera.
variants.sort((a, b) => a.height - b.height);

const rebuilt =
  [
    ...header,
    ...variants.flatMap((v) => [
      v.attrs
        .replace(/BANDWIDTH=\d+/, `BANDWIDTH=${v.peak}`)
        .replace(/,AVERAGE-BANDWIDTH=\d+/, "")
        .replace(/BANDWIDTH=\d+/, (m) => `${m},AVERAGE-BANDWIDTH=${v.average}`),
      v.path,
    ]),
  ].join("\n") + "\n";

console.log("\n--- master.m3u8 actual ---\n" + master.trim());
console.log("\n+++ master.m3u8 propuesto +++\n" + rebuilt.trim() + "\n");

if (!apply) {
  console.log("Nada se subió. Repite con --apply para respaldar y escribir.");
  process.exit(0);
}

// Respaldo local y en el bucket antes de tocar nada.
const localBackup = `/tmp/master.m3u8.${video.slug}.bak`;
writeFileSync(localBackup, master);
await s3.send(
  new PutObjectCommand({
    Bucket,
    Key: masterKey + ".bak",
    Body: master,
    ContentType: "application/x-mpegURL",
  })
);
console.log(`💾 Respaldo en ${localBackup} y en ${masterKey}.bak`);

await s3.send(
  new PutObjectCommand({
    Bucket,
    Key: masterKey,
    Body: rebuilt,
    ContentType: "application/x-mpegURL",
  })
);

const verification = await getText(masterKey);
console.log(
  verification === rebuilt
    ? "✅ Subido y verificado."
    : "⚠️ Subido, pero lo que se lee de vuelta no coincide. Revisa."
);
