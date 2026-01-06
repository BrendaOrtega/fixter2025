import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';

config(); // Load .env

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  forcePathStyle: true,
});

const command = new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET || 'wild-bird-2039',
  Key: 'fixtergeek/books/ai-sdk.epub',
  ResponseContentDisposition: 'attachment; filename="ai-sdk-react-router.epub"',
});

const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
console.log('\n🔗 Demo presigned URL (válida 1 hora):\n');
console.log(url);
console.log('\n');
