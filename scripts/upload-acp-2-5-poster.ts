/**
 * Póster de la lección 2.5. Público (`public-read`): el `<video poster>` lo pide
 * antes de que exista sesión y en un correo no hay quien firme una URL.
 *   npx tsx --env-file=.env scripts/upload-acp-2-5-poster.ts
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";

const BUCKET = process.env.BUCKET_NAME || "wild-bird-2039";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev",
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } });
const prisma = new PrismaClient();

const SUBIR = [
  { key: "fixtergeek/posters/acp-el-remoto.png", file: "videos/acp-2-5-el-remoto/renders/portada.png", type: "image/png" },
  { key: "fixtergeek/posters/acp-el-remoto-email.jpg", file: "videos/acp-2-5-el-remoto/renders/portada-email.jpg", type: "image/jpeg" },
];

async function main() {
  for (const s of SUBIR) {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s.key, Body: await fs.readFile(s.file),
      ContentType: s.type, CacheControl: "public, max-age=31536000", ACL: "public-read" }));
    console.log(`⬆️  ${s.key}`);
  }
  const url = `https://t3.storage.dev/${BUCKET}/${SUBIR[0].key}`;
  await prisma.video.update({ where: { slug: "acp-el-remoto" }, data: { poster: url, posterWide: url } });
  console.log(`🖼️  ${url}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
