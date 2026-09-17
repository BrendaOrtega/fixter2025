import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev", forcePathStyle: true });
const P = "fixtergeek/videos/6a78ff744a8e00e3b2eea500/6aa8ca89e44efff001de95ab/hls/";
for (const q of ["master.m3u8", "480p/480p.m3u8", "720p/720p.m3u8", "1080p/1080p.m3u8", "1080p/seg_725.ts", "480p/seg_725.ts", "720p/seg_725.ts"]) {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: "wild-bird-2039", Prefix: P + q, MaxKeys: 1 }));
  console.log(r.KeyCount ? "ok" : "FALTA", q, r.Contents?.[0]?.Size ?? "");
}
