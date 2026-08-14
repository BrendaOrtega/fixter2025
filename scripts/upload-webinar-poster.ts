/**
 * Sube el póster del primer webinar y lo deja en el Video.
 *
 * Va PÚBLICO (`public-read`) y por el endpoint t3.storage.dev, igual que los
 * videos cortos de `app/components/sistemas/VideoGaleria.tsx`: un póster lo pide
 * el `<video poster>` antes de que exista sesión, así que no puede ir firmado.
 *
 *   npx tsx scripts/upload-webinar-poster.ts <archivo.jpg>
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";

const file = process.argv[2];
if (!file) {
  console.error("uso: npx tsx scripts/upload-webinar-poster.ts <archivo.jpg>");
  process.exit(1);
}

const BUCKET = process.env.BUCKET_NAME || "wild-bird-2039";
const KEY = "videos/webinar-01-anatomia-poster.jpg";
const VIDEO_SLUG = "primer-webinar-anatomia-de-un-sistema-agentico";

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
      Body: await fs.readFile(file),
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000",
      ACL: "public-read",
    })
  );

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
