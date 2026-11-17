// Auditoría de residuos de grabaciones del club: carpetas en Tigris sin fila en la base.
// Uso: node --env-file=.env scripts/audit-club-recordings.mjs          (sólo lista)
//      node --env-file=.env scripts/audit-club-recordings.mjs --delete (borra las huérfanas)
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const doDelete = process.argv.includes("--delete");
const bucket = process.env.BUCKET_NAME;
const s3 = new S3Client({ region: "auto", endpoint: "https://fly.storage.tigris.dev" });
const db = new PrismaClient();
const ROOT = "fixtergeek/videos/club/";
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Todas las llaves bajo la raíz del club, agrupadas por <communityId>/<recordingId>.
const folders = new Map();
let token;
do {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: ROOT, ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of list.Contents ?? []) {
    const [communityId, recordingId] = o.Key.slice(ROOT.length).split("/");
    const k = `${communityId}/${recordingId}`;
    const f = folders.get(k) ?? { communityId, recordingId, keys: [], bytes: 0 };
    f.keys.push(o.Key); f.bytes += o.Size ?? 0;
    folders.set(k, f);
  }
  token = list.IsTruncated ? list.NextContinuationToken : undefined;
} while (token);

const rows = await db.communityRecording.findMany({ select: { id: true, communityId: true, title: true, status: true } });
const alive = new Set(rows.map((r) => `${r.communityId}/${r.id}`));
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;

let orphanBytes = 0, orphans = 0;
for (const [k, f] of folders) {
  const ok = alive.has(k);
  if (ok) { console.log(`ok       ${k}  ${f.keys.length} archivos  ${mb(f.bytes)}`); continue; }
  orphans++; orphanBytes += f.bytes;
  console.log(`HUÉRFANA ${k}  ${f.keys.length} archivos  ${mb(f.bytes)}`);
  if (doDelete && OBJECT_ID.test(f.communityId) && OBJECT_ID.test(f.recordingId)) {
    for (let i = 0; i < f.keys.length; i += 1000) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: f.keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
    }
    console.log("         borrada");
  }
}
for (const r of rows) if (!folders.has(`${r.communityId}/${r.id}`)) console.log(`sin archivos: fila ${r.id} «${r.title}» (${r.status})`);
console.log(`\n${folders.size} carpetas, ${rows.length} filas, ${orphans} huérfanas (${mb(orphanBytes)})${doDelete ? " — borradas" : ""}`);
await db.$disconnect();
