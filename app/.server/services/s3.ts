import { Effect } from "effect";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Service using Effect
export interface S3Service {
  uploadAudio: (
    key: string,
    audioBuffer: ArrayBuffer,
    metadata?: Record<string, string>
  ) => Effect.Effect<S3UploadResult, S3Error>;

  getPresignedUrl: (
    key: string,
    expiresIn?: number
  ) => Effect.Effect<string, S3Error>;

  checkFileExists: (key: string) => Effect.Effect<boolean, S3Error>;

  getFileMetadata: (
    key: string
  ) => Effect.Effect<S3FileMetadata | null, S3Error>;
}

export interface S3UploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
}

export interface S3FileMetadata {
  size: number;
  lastModified: Date;
  contentType: string;
  metadata: Record<string, string>;
}

export class S3Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "S3Error";
  }
}

// S3 Configuration
const getS3Config = () => {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET || "wild-bird-2039";

  if (!accessKeyId || !secretAccessKey) {
    throw new S3Error("AWS credentials not configured", "MISSING_CREDENTIALS");
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

    // Use custom endpoint if provided
    if (process.env.AWS_ENDPOINT_URL_S3) {
      clientConfig.endpoint = process.env.AWS_ENDPOINT_URL_S3;
      clientConfig.forcePathStyle = true; // Required for custom endpoints
    }

    return new S3Client(clientConfig);
  });

// S3 Service implementation
export const S3ServiceLive: S3Service = {
  uploadAudio: (key: string, audioBuffer: ArrayBuffer, metadata = {}) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();

      const uploadParams = {
        Bucket: config.bucketName,
        Key: key,
        Body: new Uint8Array(audioBuffer),
        ContentType: "audio/mpeg",
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          service: "fixtergeek-tts",
        },
        // Set cache control for better performance
        CacheControl: "public, max-age=31536000", // 1 year
      };

      const result = yield* Effect.tryPromise({
        try: async () => {
          const command = new PutObjectCommand(uploadParams);
          return await s3Client.send(command);
        },
        catch: (error) =>
          new S3Error(
            `Failed to upload to S3: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "UPLOAD_ERROR",
            error
          ),
      });

      // Generate public URL
      const publicUrl = process.env.AWS_ENDPOINT_URL_S3
        ? `${process.env.AWS_ENDPOINT_URL_S3}/${config.bucketName}/${key}`
        : `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;

      return {
        key,
        url: publicUrl,
        size: audioBuffer.byteLength,
        etag: result.ETag,
      };
    }),

  getPresignedUrl: (key: string, expiresIn = 3600) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      const signedUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn }),
        catch: (error) =>
          new S3Error(
            `Failed to generate presigned URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "PRESIGNED_URL_ERROR",
            error
          ),
      });

      return signedUrl;
    }),

  checkFileExists: (key: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();

      const exists = yield* Effect.tryPromise({
        try: async () => {
          try {
            const command = new HeadObjectCommand({
              Bucket: config.bucketName,
              Key: key,
            });
            await s3Client.send(command);
            return true;
          } catch (error: any) {
            if (
              error.name === "NotFound" ||
              error.$metadata?.httpStatusCode === 404
            ) {
              return false;
            }
            throw error;
          }
        },
        catch: (error) =>
          new S3Error(
            `Failed to check file existence: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "CHECK_EXISTS_ERROR",
            error
          ),
      });

      return exists;
    }),

  getFileMetadata: (key: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3Config();

      const metadata = yield* Effect.tryPromise({
        try: async () => {
          try {
            const command = new HeadObjectCommand({
              Bucket: config.bucketName,
              Key: key,
            });
            const result = await s3Client.send(command);

            return {
              size: result.ContentLength || 0,
              lastModified: result.LastModified || new Date(),
              contentType: result.ContentType || "audio/mpeg",
              metadata: result.Metadata || {},
            };
          } catch (error: any) {
            if (
              error.name === "NotFound" ||
              error.$metadata?.httpStatusCode === 404
            ) {
              return null;
            }
            throw error;
          }
        },
        catch: (error) =>
          new S3Error(
            `Failed to get file metadata: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "GET_METADATA_ERROR",
            error
          ),
      });

      return metadata;
    }),
};

// Utility functions
export const generateAudioKey = (postId: string, version = 1): string => {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `audio/posts/${postId}/v${version}/${timestamp}.mp3`;
};

export const generateAudioKeyFromPost = (
  postSlug: string,
  _postUpdatedAt: Date
): string => {
  // Generate a clean URL-friendly path with the post slug
  return `audio/posts/${postSlug}.mp3`;
};

// Export service instance
export const s3Service = S3ServiceLive;
