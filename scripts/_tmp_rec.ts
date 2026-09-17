import { S3Client, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev", forcePathStyle: true });
async function main() {
  try { const h = await s3.send(new HeadObjectCommand({ Bucket: "ghosty-teams", Key: "t3/37fc6902-99cb-4e29-a77b-4286c8515090-mu21ai80-0574c6.mp4" })); console.log("HEAD", h.ContentLength, h.LastModified); } catch (e: any) { console.log("HEAD err", e.name, e.$metadata?.httpStatusCode); }
  try { const r = await s3.send(new ListObjectsV2Command({ Bucket: "ghosty-teams", Prefix: "t3/37fc6902", MaxKeys: 10 })); for (const o of r.Contents ?? []) console.log(o.Key, o.Size, o.LastModified); console.log("n", r.KeyCount); } catch (e: any) { console.log("LIST err", e.name, e.$metadata?.httpStatusCode); }
}
main();
