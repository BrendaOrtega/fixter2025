import { type LoaderFunctionArgs, redirect } from "react-router";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BACKUP_BUCKET = process.env.BUCKET_NAME || "fixtergeek";

function getBackupS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: "https://fly.storage.tigris.dev",
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getAdminOrRedirect(request);

  const url = new URL(request.url);
  const s3Key = url.searchParams.get("key");

  if (!s3Key) {
    throw new Response("Missing key parameter", { status: 400 });
  }

  // Validate the key is a backup file
  if (!s3Key.startsWith("backups/fixtergeek/")) {
    throw new Response("Invalid backup key", { status: 403 });
  }

  // Generate presigned URL (valid for 1 hour)
  const s3Client = getBackupS3Client();
  const presignedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: s3Key,
    }),
    { expiresIn: 3600 }
  );

  // Redirect to presigned URL
  return redirect(presignedUrl);
};
