#!/usr/bin/env npx tsx
/**
 * Sube una imagen al bucket público de Tigris para usarla en correos.
 *
 * No usa `app/.server/tigrs.ts` a propósito: ese cliente apunta a otro bucket
 * (BUCKET_NAME en fly.storage.tigris.dev, con prefijo "fixtergeek/") y no pasa
 * ACL, así que el objeto quedaría privado y la URL directa daría 403.
 *
 * Las imágenes de correo necesitan una URL pública y estable: el proxy de Gmail
 * la cachea y no vuelve a pedirla, pero otros clientes revalidan, y una
 * presigned de una hora deja la imagen rota a mitad de campaña.
 *
 *   npx tsx --env-file=.env scripts/upload-email-asset.ts \
 *     --file /ruta/local.jpg --key videos/sesion-01-el-loop-card.jpg
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { extname } from "path";

const BUCKET = "wild-bird-2039";
const ENDPOINT = "https://t3.storage.dev";
const PUBLIC_BASE = `https://${BUCKET}.t3.storage.dev`;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("file");
  const key = arg("key");

  if (!file || !key) {
    console.error(
      "Uso: npx tsx --env-file=.env scripts/upload-email-asset.ts --file <ruta> --key <key>"
    );
    process.exit(1);
  }

  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) {
    console.error(`❌ Extensión no soportada: ${extname(file)}`);
    process.exit(1);
  }

  const body = readFileSync(file);
  const s3 = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Inmutable: la URL lleva versión en el nombre, así que nunca se
      // reemplaza el contenido de una key ya enviada en un correo.
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    })
  );

  const url = `${PUBLIC_BASE}/${key}`;
  console.log(`⬆️  ${(body.length / 1024).toFixed(0)} KB → ${url}`);

  // Verificación anónima: si esto no da 200, la imagen se verá rota en el correo.
  const res = await fetch(url, { method: "HEAD" });
  console.log(
    res.ok
      ? `✅ Pública (${res.status} ${res.headers.get("content-type")})`
      : `❌ No es pública: ${res.status} — revisa el ACL`
  );
}

main();
