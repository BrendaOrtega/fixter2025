/**
 * Rellena `Video.duration` leyendo la duración REAL del propio HLS.
 *
 * Los 31 videos del curso de motion nacieron con `duration: "0"` —el dato nunca
 * se capturó— y por eso la lista lateral no dice cuánto dura ninguna clase. No
 * está escondido en otro campo: se comprobó con `$runCommandRaw` sobre el
 * documento crudo.
 *
 * La fuente de verdad es el `.m3u8`: la suma de sus `#EXTINF` es la duración
 * exacta del video, al centisegundo. No hace falta descargar un solo segmento.
 *
 * ⚠️ `duration` se guarda como MINUTOS DECIMALES en un String —así lo lee
 * `formatDuration` del sidebar (12.5 → "12m 30s")—, no como segundos.
 *
 * ⚠️ NO pisa una duración que ya exista, salvo con `--forzar`: varias fueron
 * puestas a mano y el HLS de una pieza recortada mentiría.
 *
 *   npx tsx --env-file=.env scripts/duraciones-desde-hls.ts <courseSlug> [--aplicar] [--forzar]
 *
 * Sin `--aplicar` sólo imprime lo que haría.
 */
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";
const s3 = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const slugCurso = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
const forzar = process.argv.includes("--forzar");

/** La llave del bucket, venga relativa o como URL completa. */
const keyDe = (m3u8: string) => {
  if (!m3u8.startsWith("http")) return m3u8.replace(/^\/+/, "");
  try {
    let k = new URL(m3u8).pathname.substring(1);
    if (k.startsWith(`${BUCKET}/`)) k = k.substring(BUCKET.length + 1);
    return k;
  } catch {
    return null;
  }
};

/**
 * Minutos de una playlist. Un master.m3u8 no trae `#EXTINF` —sólo apunta a las
 * variantes—, así que se sigue la primera y se mide ahí.
 */
async function minutosDe(key: string, saltos = 0): Promise<number | null> {
  if (saltos > 2) return null;
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const txt = await r.Body!.transformToString();
  const segs = [...txt.matchAll(/#EXTINF:([\d.]+)/g)].reduce((a, m) => a + +m[1], 0);
  if (segs > 0) return segs / 60;

  const variante = txt
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && l.endsWith(".m3u8"));
  if (!variante) return null;
  const base = key.substring(0, key.lastIndexOf("/") + 1);
  return minutosDe(variante.startsWith("http") ? keyDe(variante)! : base + variante, saltos + 1);
}

/**
 * La playlist que SÍ existe en la carpeta del video.
 *
 * `animaciones-16` apunta a `720p.m3u8` y en su carpeta sólo hay 1080p: la llave
 * de la base es incorrecta y esa lección **no reproduce**. Aquí se descubre y,
 * con `--aplicar`, se corrige el puntero de paso.
 */
async function playlistReal(dir: string) {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: dir }));
  const listas = (r.Contents ?? [])
    .map((o) => o.Key!)
    .filter((k) => k.endsWith(".m3u8"));
  // La mejor calidad primero; `master` gana si existe porque apunta a todas.
  const orden = ["master.m3u8", "1080p.m3u8", "720p.m3u8", "480p.m3u8"];
  for (const nombre of orden) {
    const hit = listas.find((k) => k.endsWith("/" + nombre));
    if (hit) return hit;
  }
  return listas[0] ?? null;
}

async function main() {
  if (!slugCurso) throw new Error("falta el slug del curso");
  const course = await prisma.course.findUnique({
    where: { slug: slugCurso },
    select: { id: true, title: true },
  });
  if (!course) throw new Error(`No existe el curso ${slugCurso}`);
  console.log(`📚 ${course.title}${aplicar ? "" : "   (SIMULACRO — falta --aplicar)"}\n`);

  const videos = await prisma.video.findMany({
    where: { courseIds: { has: course.id } },
    orderBy: { index: "asc" },
    select: { id: true, slug: true, duration: true, m3u8: true },
  });

  let tocados = 0, saltados = 0, fallidos = 0, totalMin = 0;
  const reparados: string[] = [];
  for (const v of videos) {
    const ya = +(v.duration || 0);
    if (ya > 0 && !forzar) {
      saltados++;
      totalMin += ya;
      console.log(`⏭️  ${v.slug.padEnd(18)} ya tiene ${ya}`);
      continue;
    }
    const key = v.m3u8 ? keyDe(v.m3u8) : null;
    if (!key) {
      fallidos++;
      console.log(`❌ ${v.slug.padEnd(18)} sin m3u8`);
      continue;
    }
    let min: number | null = null;
    let keyBuena = key;
    try {
      min = await minutosDe(key);
    } catch (e: any) {
      if (e.name !== "NoSuchKey") {
        console.log(`❌ ${v.slug.padEnd(18)} ${e.name}: ${e.message}`);
        fallidos++;
        continue;
      }
      // La llave de la base no existe. Se busca la que sí, y se avisa: mientras
      // no se corrija, esa lección no reproduce para nadie.
      const alt = await playlistReal(key.substring(0, key.lastIndexOf("/") + 1));
      if (!alt) {
        console.log(`❌ ${v.slug.padEnd(18)} no hay ninguna playlist en su carpeta`);
        fallidos++;
        continue;
      }
      keyBuena = alt;
      reparados.push(v.slug);
      console.log(`🔧 ${v.slug.padEnd(18)} su m3u8 NO EXISTE → ${alt.split("/").pop()}`);
      try {
        min = await minutosDe(alt);
      } catch (e2: any) {
        console.log(`❌ ${v.slug.padEnd(18)} ${e2.name}: ${e2.message}`);
        fallidos++;
        continue;
      }
      if (aplicar) await prisma.video.update({ where: { id: v.id }, data: { m3u8: alt } });
    }
    if (min === null || min <= 0) {
      fallidos++;
      console.log(`❌ ${v.slug.padEnd(18)} la playlist no trae duración`);
      continue;
    }
    // Dos decimales: el sidebar redondea a segundos y más precisión es ruido.
    const valor = min.toFixed(2);
    totalMin += +valor;
    tocados++;
    console.log(`✅ ${v.slug.padEnd(18)} ${ya || "0"} → ${valor}  (${Math.floor(min)}m ${Math.round((min % 1) * 60)}s)`);
    if (aplicar) await prisma.video.update({ where: { id: v.id }, data: { duration: valor } });
  }

  const h = Math.floor(totalMin / 60);
  console.log(
    `\n${tocados} actualizados · ${saltados} ya tenían · ${fallidos} sin resolver` +
      `\ncurso completo: ${h}h ${Math.round(totalMin % 60)}m`,
  );
  if (reparados.length)
    console.log(
      `\n⚠️  ${reparados.length} con el m3u8 roto en la base (no reproducían): ${reparados.join(", ")}`,
    );
  if (!aplicar && tocados) console.log("\n↻ vuelve a correrlo con --aplicar");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
