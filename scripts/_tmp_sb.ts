import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev", forcePathStyle: true });
for (const id of ["6aa8ca89e44efff001de95ab", "6aa385102fcb1ff28b7659ac"]) {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: "wild-bird-2039", Prefix: `fixtergeek/videos/6a78ff744a8e00e3b2eea500/${id}/storyboard/` }));
  console.log(id, (r.Contents ?? []).map(o => `${o.Key.split("/").pop()} ${o.Size}`).join(", "));
}
const g = await s3.send(new GetObjectCommand({ Bucket: "wild-bird-2039", Key: "fixtergeek/videos/6a78ff744a8e00e3b2eea500/6aa8ca89e44efff001de95ab/storyboard/storyboard.vtt" }));
console.log((await g.Body!.transformToString()).slice(0, 200));
