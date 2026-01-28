import { Effect } from "effect";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Lead Magnet Service - For PDF/EPUB downloads
export interface S3LeadMagnetService {
  // Generate presigned URL for download (temporary access)
  getDownloadUrl: (
    s3Key: string,
    expiresIn?: number
  ) => Effect.Effect<string, S3LeadMagnetError>;

  // Generate presigned URL for admin upload
  getUploadUrl: (
    slug: string,
    fileName: string,
    contentType?: string
  ) => Effect.Effect<LeadMagnetUploadInfo, S3LeadMagnetError>;
}

export interface LeadMagnetUploadInfo {
  uploadUrl: string;
  s3Key: string;
}

export class S3LeadMagnetError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "S3LeadMagnetError";
  }
}

// S3 Configuration (Tigris-compatible)
const getS3Config = () => {
  const region = process.env.AWS_REGION || "auto";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName =
    process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";

  if (!accessKeyId || !secretAccessKey) {
    throw new S3LeadMagnetError(
      "AWS credentials not configured",
      "MISSING_CREDENTIALS"
    );
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
};

// Create S3 client
const createS3Client = () =>
  Effect.gen(function* () {
    const config = getS3Config();

    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // Use Tigris storage
    const endpoint =
      process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true;

    return new S3Client(clientConfig);
  });

// Generate S3 key for lead magnet files
export const generateLeadMagnetKey = (
  slug: string,
  fileName: string
): string => {
  return `fixtergeek/leadmagnets/${slug}/${fileName}`;
};

// Get content type from file extension
const getContentType = (fileName: string): string => {
  const ext = fileName.toLowerCase().split(".").pop();
  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
};

// S3 Lead Magnet Service implementation
export const S3LeadMagnetServiceLive: S3LeadMagnetService = {
  getDownloadUrl: (s3Key: string, expiresIn: number = 86400) => // 24 hours default
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: s3Key,
      });

      const downloadUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn }),
        catch: (error) =>
          new S3LeadMagnetError(
            `Failed to generate download URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "DOWNLOAD_URL_ERROR",
            error
          ),
      });

      return downloadUrl;
    }),

  getUploadUrl: (slug: string, fileName: string, contentType?: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();
      const s3Key = generateLeadMagnetKey(slug, fileName);
      const fileContentType = contentType || getContentType(fileName);

      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: s3Key,
        ContentType: fileContentType,
        Metadata: {
          slug,
          uploadedAt: new Date().toISOString(),
          service: "fixtergeek-leadmagnet",
        },
        CacheControl: "public, max-age=31536000", // 1 year
      });

      const uploadUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn: 3600 }), // 1 hour
        catch: (error) =>
          new S3LeadMagnetError(
            `Failed to generate upload URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "UPLOAD_URL_ERROR",
            error
          ),
      });

      return {
        uploadUrl,
        s3Key,
      };
    }),
};

// Export service instance
export const s3LeadMagnetService = S3LeadMagnetServiceLive;

// Helper functions for simple usage without Effect
export async function getLeadMagnetDownloadUrl(
  s3Key: string,
  expiresInHours: number = 24
): Promise<string> {
  const expiresIn = expiresInHours * 3600;
  const result = await Effect.runPromise(
    s3LeadMagnetService.getDownloadUrl(s3Key, expiresIn)
  );
  return result;
}

export async function getLeadMagnetUploadUrl(
  slug: string,
  fileName: string,
  contentType?: string
): Promise<LeadMagnetUploadInfo> {
  const result = await Effect.runPromise(
    s3LeadMagnetService.getUploadUrl(slug, fileName, contentType)
  );
  return result;
}
