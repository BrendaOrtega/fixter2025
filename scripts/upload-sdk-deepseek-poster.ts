/**
 * Sube el póster de la entrega 3 y lo deja en el Video.
 *
 * Va PÚBLICO (`public-read`): un póster lo pide el `<video poster>` antes de
 * que exista sesión, y en un correo no hay quien firme una URL. Sin ACL da 403
 * y el correo sale con un hueco.
 *
 * Las keys se suben inmutables con caché de un año, así que **no se pisa una
 * key ya publicada**: si el titular cambia, se versiona el nombre (`-v2`) y se
 * vuelve a correr esto.
 *
 *   npx tsx --env-file=.env scripts/upload-sdk-deepseek-poster.ts
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";

const BUCKET = process.env.BUCKET_NAME || "wild-bird-2039";
const KEY = "videos/posters/sdk-deepseek.jpg";
const FILE = "videos/sdk-deepseek-thumb/renders/poster-email.jpg";
const VIDEO_SLUG = "sdk-deepseek";

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const prisma = new PrismaClient();

async function main() {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: await fs.readFile(FILE),
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000",
      ACL: "public-read",
    })
  );

  // Los dos campos apuntan al mismo archivo: esta entrega no tiene versión
  // vertical porque la grabación es cuadrada y no hay feed que la pida.
  // `renderSequenceEmail` prefiere `posterWide`, así que tiene que existir.
  const url = `https://${BUCKET}.t3.storage.dev/${KEY}`;
  await prisma.video.update({
    where: { slug: VIDEO_SLUG },
    data: { poster: url, posterWide: url },
  });
  console.log(`🖼️  ${url}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
