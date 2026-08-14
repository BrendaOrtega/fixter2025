import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto", endpoint: process.env.AWS_ENDPOINT_URL_S3, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
});
const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME!;
// SÓLO las pruebas de hoy, una por una y nombradas a mano. Nada de barridos.
const CURSO = "6a78ff744a8e00e3b2eea500";
const INTOCABLE = "6a7e98bebf5a7abbd633c640";           // el webinar del 13-ago
const OBJETIVOS = ["6a7f4e14438f58fc2586c152", "6a7f5277403ece5a0bb36096", "6a7f5555f7884f1d2c8a9971"];

for (const vid of OBJETIVOS) {
  if (vid === INTOCABLE) { console.log("ABORTA: se intentó tocar el webinar publicado"); process.exit(1); }
  const v = await db.video.findUnique({ where: { id: vid }, select: { slug: true } }).catch(() => null);
  if (v) { console.log(`SALTO ${vid}: su vídeo EXISTE (${v.slug})`); continue; }
  const prefix = `fixtergeek/videos/${CURSO}/${vid}/`;
  let token: string | undefined, n = 0;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    const keys = (r.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key.startsWith(prefix));
    if (keys.length) { await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys, Quiet: true } })); n += keys.length; }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  console.log(`BORRADO ${vid}: ${n} objetos`);
}
const check = await db.video.findUnique({ where: { id: INTOCABLE }, select: { slug: true, m3u8: true } });
console.log("INTACTO", check?.slug, "· m3u8:", check?.m3u8 ? "sí" : "NO");
await db.$disconnect();
