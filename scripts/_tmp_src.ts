import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev", forcePathStyle: true });
const B = "wild-bird-2039", P = "fixtergeek/videos/6a78ff744a8e00e3b2eea500/6aa0e9e72418e7f3a4061099/hls/1080p/";
const sign = (k: string) => getSignedUrl(s3, new GetObjectCommand({ Bucket: B, Key: k }), { expiresIn: 3600 });
async function main() {
  const idx = await (await fetch(await sign(P + "index.m3u8"))).text();
  const lines = idx.split("\n");
  // Recorta la ventana [start,end] en segundos, firmando cada segmento
  const start = +process.argv[2], end = +process.argv[3];
  let t = 0; const out: string[] = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-TARGETDURATION:10", "#EXT-X-MEDIA-SEQUENCE:0"];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXTINF")) {
      const d = parseFloat(lines[i].slice(8)); const seg = lines[i + 1];
      if (t + d > start && t < end) { out.push(lines[i]); out.push(await sign(P + seg)); }
      t += d;
    }
  }
  out.push("#EXT-X-ENDLIST");
  fs.writeFileSync(process.argv[4], out.join("\n"));
  console.log("segments", (out.length - 5) / 2, "total", t);
}
main();
