import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto", endpoint: process.env.AWS_ENDPOINT_URL_S3, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
});
const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME!;
const SECO = process.argv.includes("--seco");
const RAIZ = "fixtergeek/videos/";

// Todo lo que hay en el bucket, agrupado por <courseId>/<videoId>
let token: string | undefined; const grupos = new Map<string, string[]>();
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: RAIZ, ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents ?? []) {
    const resto = o.Key!.slice(RAIZ.length).split("/");
    if (resto.length < 3) continue;
    const g = `${resto[0]}/${resto[1]}`;
    (grupos.get(g) ?? grupos.set(g, []).get(g)!).push(o.Key!);
  }
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);

for (const [g, keys] of grupos) {
  const [courseId, videoId] = g.split("/");
  const v = await db.video.findUnique({ where: { id: videoId }, select: { slug: true, isPublic: true } }).catch(() => null);
  if (v) { console.log(`CONSERVAR ${g} · ${keys.length} objetos · vídeo VIVO: ${v.slug}`); continue; }
  console.log(`HUERFANO  ${g} · ${keys.length} objetos${SECO ? " (no se toca: modo seco)" : " → BORRANDO"}`);
  if (SECO) continue;
  for (let i = 0; i < keys.length; i += 1000) {
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
  }
}
await db.$disconnect();
