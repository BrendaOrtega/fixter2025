/**
 * Sube el short "Las 4 memorias de un agente" y su póster al CDN.
 *
 * Van PÚBLICOS (`public-read`): la galería de la landing los pide con una URL
 * directa, sin sesión y sin firmar. Sin ACL devuelven 403 y la tarjeta sale con
 * un hueco.
 *
 * Las keys se suben inmutables con caché de un año, así que NO se pisa una key
 * ya publicada: si el video cambia, se versiona el nombre (`-v2`).
 *
 *   npx tsx --env-file=.env scripts/upload-4-memorias.ts
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";

const BUCKET = process.env.BUCKET_NAME || "wild-bird-2039";

const SUBIDAS = [
  {
    key: "videos/sesion-03-las-4-memorias.mp4",
    file: "videos/4-memorias/renders/4-memorias.mp4",
    type: "video/mp4",
  },
  {
    key: "videos/posters/sesion-03-las-4-memorias.jpg",
    file: "videos/4-memorias/renders/poster.jpg",
    type: "image/jpeg",
  },
  // El póster del correo va horizontal. El vertical de 9:16 ahí ocupa una
  // columna entera casi vacía: en la galería encaja porque la tarjeta es 9:16,
  // en un correo de 600 px de ancho se come toda la pantalla.
  {
    key: "videos/posters/sesion-03-las-4-memorias-email.jpg",
    file: "videos/4-memorias/renders/poster-email.jpg",
    type: "image/jpeg",
  },
];

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  for (const { key, file, type } of SUBIDAS) {
    const body = await fs.readFile(file);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
        CacheControl: "public, max-age=31536000",
        ACL: "public-read",
      })
    );
    const url = `https://${BUCKET}.t3.storage.dev/${key}`;
    console.log(`✓ ${(body.length / 1024 / 1024).toFixed(1)} MB → ${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
