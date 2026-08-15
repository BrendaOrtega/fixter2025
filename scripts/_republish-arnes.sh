#!/usr/bin/env bash
# Republica el HLS del video del arnés desde el master original, ya sin
# deformación. Temporal: se borra al terminar.
set -euo pipefail

SRC="/Volumes/blissmo/WEBINARS/grok_arnés_mínimo.mov"
# Al disco externo: en el interno quedan 5 GB y la salida pesa varios.
WORK="/Volumes/blissmo/_hls_arnes_$$"
COURSE="6a78ff744a8e00e3b2eea500"
VIDEO="6a809b70f13d797a474a6916"
PREFIX="fixtergeek/videos/$COURSE/$VIDEO/hls/"

echo "▶︎ 1/4 transcodificando desde el original"
bash scripts/transcode-hls-local.sh "$SRC" "$WORK"

echo "▶︎ 2/4 borrando el HLS anterior (sin residuos ni duplicados)"
node --env-file=.env -e '
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.AWS_S3_BUCKET;
const Prefix = process.argv[1];
(async () => {
  let token, total = 0;
  do {
    const list = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: token }));
    const objs = (list.Contents || []).map((o) => ({ Key: o.Key }));
    if (objs.length) {
      await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: objs } }));
      total += objs.length;
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  console.log("   borrados:", total, "objetos");
})();
' "$PREFIX"

echo "▶︎ 3/4 subiendo"
node --env-file=.env node_modules/.bin/tsx scripts/upload-hls-local.ts "$COURSE" "$VIDEO" "$WORK"

echo "▶︎ 4/4 limpiando temporales"
rm -rf "$WORK"
echo "✅ listo, sin residuos"
