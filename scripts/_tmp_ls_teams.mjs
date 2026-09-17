import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const s3 = new S3Client({ region: "auto", endpoint: "https://t3.storage.dev", forcePathStyle: true,
  credentials: { accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID, secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY } });
const r = await s3.send(new ListObjectsV2Command({ Bucket: "ghosty-teams", Prefix: "t3/", MaxKeys: 400 }));
const mp4s = (r.Contents ?? []).filter(o => o.Key.endsWith(".mp4")).sort((a, b) => b.LastModified - a.LastModified).slice(0, 8);
for (const o of mp4s) console.log(o.LastModified.toISOString().slice(0, 16), (o.Size / 1e9).toFixed(2) + "GB", o.Key);
const ref = mp4s[1];
if (ref) console.log("REF", await getSignedUrl(s3, new GetObjectCommand({ Bucket: "ghosty-teams", Key: ref.Key }), { expiresIn: 3600 }));
