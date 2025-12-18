import { Effect } from "effect";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Video Service - Specialized for video and HLS management
export interface S3VideoService {
  // Generate presigned URL for direct browser upload
  getUploadUrl: (
    courseId: string,
    videoId: string,
    filename: string
  ) => Effect.Effect<VideoUploadInfo, S3VideoError>;

  // Upload video from server (for processing)
  uploadVideo: (
    key: string,
    videoBuffer: ArrayBuffer | Buffer | Uint8Array,
    contentType?: string
  ) => Effect.Effect<S3VideoUploadResult, S3VideoError>;

  // Upload HLS files (m3u8 and ts segments)
  uploadHLSFiles: (
    courseId: string,
    videoId: string,
    files: HLSFile[]
  ) => Effect.Effect<HLSUploadResult, S3VideoError>;

  // Get public URL for video/HLS playback
  getVideoUrl: (key: string) => string;

  // Generate presigned URL for video preview (temporary access)
  getVideoPreviewUrl: (
    key: string, 
    expiresIn?: number
  ) => Effect.Effect<string, S3VideoError>;

  // Generate presigned URL dynamically based on original storage URL
  getVideoPreviewUrlDynamic: (
    originalUrl: string,
    expiresIn?: number
  ) => Effect.Effect<string, S3VideoError>;
  
  // Generate presigned URL for HLS content (master.m3u8 or .ts segments)
  getHLSPresignedUrl: (
    key: string,
    expiresIn?: number
  ) => Effect.Effect<string, S3VideoError>;

  // Download video for processing
  downloadVideo: (key: string) => Effect.Effect<ArrayBuffer, S3VideoError>;

  // Clean up video files (when deleting)
  deleteVideoFiles: (
    courseId: string,
    videoId: string
  ) => Effect.Effect<boolean, S3VideoError>;

  // List all files for a video
  listVideoFiles: (
    courseId: string,
    videoId: string
  ) => Effect.Effect<string[], S3VideoError>;
}

export interface VideoUploadInfo {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export interface S3VideoUploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
}

export interface HLSFile {
  key: string;
  content: Buffer | Uint8Array;
  contentType?: string;
}

export interface HLSUploadResult {
  masterPlaylistUrl: string;
  uploadedFiles: string[];
}

export class S3VideoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "S3VideoError";
  }
}

// S3 Configuration (Tigris-compatible)
const getS3VideoConfig = () => {
  const region = process.env.AWS_REGION || "auto"; // Tigris uses "auto" region
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";

  if (!accessKeyId || !secretAccessKey) {
    throw new S3VideoError(
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
    const config = getS3VideoConfig();

    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // Use custom endpoint - Tigris storage by default
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true;

    return new S3Client(clientConfig);
  });

// Video key generation helpers
export const generateVideoKey = (
  courseId: string,
  videoId: string,
  filename: string
): string => {
  return `fixtergeek/videos/${courseId}/${videoId}/original/${filename}`;
};

export const generateHLSKey = (
  courseId: string,
  videoId: string,
  quality: string,
  filename: string
): string => {
  return `fixtergeek/videos/${courseId}/${videoId}/hls/${quality}/${filename}`;
};

// S3 Video Service implementation
export const S3VideoServiceLive: S3VideoService = {
  getUploadUrl: (courseId: string, videoId: string, filename: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();
      const key = generateVideoKey(courseId, videoId, filename);

      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ContentType: "video/mp4",
        // Set metadata for tracking
        Metadata: {
          courseId,
          videoId,
          uploadedAt: new Date().toISOString(),
          service: "fixtergeek-video",
        },
        // Cache control for videos
        CacheControl: "public, max-age=31536000", // 1 year
      });

      const uploadUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn: 3600 }), // 1 hour
        catch: (error) =>
          new S3VideoError(
            `Failed to generate upload URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "UPLOAD_URL_ERROR",
            error
          ),
      });

      const publicUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;

      return {
        uploadUrl,
        key,
        publicUrl,
      };
    }),

  uploadVideo: (
    key: string,
    videoBuffer: ArrayBuffer | Buffer | Uint8Array,
    contentType = "video/mp4"
  ) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();

      const uploadParams = {
        Bucket: config.bucketName,
        Key: key,
        Body: videoBuffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000",
      };

      const result = yield* Effect.tryPromise({
        try: async () => {
          const command = new PutObjectCommand(uploadParams);
          return await s3Client.send(command);
        },
        catch: (error) =>
          new S3VideoError(
            `Failed to upload video: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "UPLOAD_ERROR",
            error
          ),
      });

      const publicUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;

      return {
        key,
        url: publicUrl,
        size:
          videoBuffer instanceof ArrayBuffer
            ? videoBuffer.byteLength
            : videoBuffer.length,
        etag: result.ETag,
      };
    }),

  uploadHLSFiles: (courseId: string, videoId: string, files: HLSFile[]) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();
      const uploadedFiles: string[] = [];

      // Upload all HLS files
      for (const file of files) {
        const fullKey = `fixtergeek/videos/${courseId}/${videoId}/hls/${file.key}`;
        const contentType =
          file.contentType ||
          (file.key.endsWith(".m3u8")
            ? "application/x-mpegURL"
            : file.key.endsWith(".ts")
            ? "video/MP2T"
            : "application/octet-stream");

        yield* Effect.tryPromise({
          try: async () => {
            const command = new PutObjectCommand({
              Bucket: config.bucketName,
              Key: fullKey,
              Body: file.content,
              ContentType: contentType,
              // Remove public cache headers - files are now private by default
              CacheControl: file.key.endsWith(".m3u8")
                ? "no-cache" // Playlists should not be cached
                : "private, max-age=1800", // Segments cached 30min via presigned URLs
            });
            await s3Client.send(command);
            uploadedFiles.push(fullKey);
          },
          catch: (error) =>
            new S3VideoError(
              `Failed to upload HLS file ${file.key}: ${
                error instanceof Error ? error.message : "Unknown"
              }`,
              "HLS_UPLOAD_ERROR",
              error
            ),
        });
      }

      const masterPlaylistKey = `fixtergeek/videos/${courseId}/${videoId}/hls/master.m3u8`;
      const masterPlaylistUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${masterPlaylistKey}`;

      return {
        masterPlaylistUrl,
        uploadedFiles,
      };
    }),

  getVideoUrl: (key: string) => {
    const config = getS3VideoConfig();
    // Use Tigris storage by default
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "https://fly.storage.tigris.dev";
    return `${endpoint}/${config.bucketName}/${key}`;
  },

  // Generate presigned URL for video preview (temporary access)
  getVideoPreviewUrl: (key: string, expiresIn: number = 3600) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      const previewUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn }),
        catch: (error) =>
          new S3VideoError(
            `Failed to generate preview URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "PREVIEW_URL_ERROR",
            error
          ),
      });

      return previewUrl;
    }),

  // Generate presigned URL dynamically based on original storage URL
  getVideoPreviewUrlDynamic: (originalUrl: string, expiresIn: number = 3600) =>
    Effect.gen(function* () {
      try {
        const url = new URL(originalUrl);
        
        // Extract storage endpoint and bucket from original URL
        const storageEndpoint = `${url.protocol}//${url.hostname}`;
        const pathParts = url.pathname.split('/').filter(Boolean);
        const bucketName = pathParts[0];
        const s3Key = pathParts.slice(1).join('/');

        console.log(`🔍 Dynamic presigned URL: endpoint=${storageEndpoint}, bucket=${bucketName}, key=${s3Key}`);

        // Create S3 client with the correct endpoint
        const s3Client = new S3Client({
          region: "auto",
          endpoint: storageEndpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        });

        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
        });

        const previewUrl = yield* Effect.tryPromise({
          try: () => getSignedUrl(s3Client, command, { expiresIn }),
          catch: (error) =>
            new S3VideoError(
              `Failed to generate dynamic preview URL: ${
                error instanceof Error ? error.message : "Unknown"
              }`,
              "DYNAMIC_PREVIEW_URL_ERROR",
              error
            ),
        });

        return previewUrl;
      } catch (error) {
        throw new S3VideoError(
          `Failed to parse storage URL: ${originalUrl}`,
          "URL_PARSE_ERROR",
          error
        );
      }
    }),

  // Generate presigned URL for HLS content (master.m3u8 or .ts segments)
  getHLSPresignedUrl: (key: string, expiresIn: number = 1800) => // 30 minutes default
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });
      const presignedUrl = yield* Effect.tryPromise({
        try: () => getSignedUrl(s3Client, command, { expiresIn }),
        catch: (error) =>
          new S3VideoError(
            `Failed to generate HLS presigned URL: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "HLS_PRESIGNED_URL_ERROR",
            error
          ),
      });

      return presignedUrl;
    }),

  downloadVideo: (key: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });

      const response = yield* Effect.tryPromise({
        try: async () => {
          const result = await s3Client.send(command);
          if (!result.Body) {
            throw new Error("No body in response");
          }
          const chunks: Uint8Array[] = [];
          const stream = result.Body as any;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          return buffer.buffer as ArrayBuffer;
        },
        catch: (error) =>
          new S3VideoError(
            `Failed to download video: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "DOWNLOAD_ERROR",
            error
          ),
      });

      return response;
    }),

  deleteVideoFiles: (courseId: string, videoId: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();
      const prefix = `fixtergeek/videos/${courseId}/${videoId}/`;

      // List all files with this prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
      });

      const listResult = yield* Effect.tryPromise({
        try: () => s3Client.send(listCommand),
        catch: (error) =>
          new S3VideoError(
            `Failed to list video files: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "LIST_ERROR",
            error
          ),
      });

      if (!listResult.Contents || listResult.Contents.length === 0) {
        return true; // Nothing to delete
      }

      // Delete all found objects
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: {
          Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })),
        },
      });

      yield* Effect.tryPromise({
        try: () => s3Client.send(deleteCommand),
        catch: (error) =>
          new S3VideoError(
            `Failed to delete video files: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "DELETE_ERROR",
            error
          ),
      });

      return true;
    }),

  listVideoFiles: (courseId: string, videoId: string) =>
    Effect.gen(function* () {
      const s3Client = yield* createS3Client();
      const config = getS3VideoConfig();
      const prefix = `fixtergeek/videos/${courseId}/${videoId}/`;

      const command = new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
      });

      const result = yield* Effect.tryPromise({
        try: () => s3Client.send(command),
        catch: (error) =>
          new S3VideoError(
            `Failed to list video files: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
            "LIST_ERROR",
            error
          ),
      });

      return (result.Contents || []).map((obj) => obj.Key!).filter(Boolean);
    }),
};

// Export service instance
export const s3VideoService = S3VideoServiceLive;