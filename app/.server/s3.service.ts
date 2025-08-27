import { Effect, Context, Layer } from "effect";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Service Interface
export interface S3Service {
  uploadFile: (
    buffer: Buffer,
    key: string,
    contentType: string
  ) => Effect.Effect<string, Error>;
  generatePresignedUrl: (
    key: string,
    expiresIn?: number
  ) => Effect.Effect<string, Error>;
  deleteFile: (key: string) => Effect.Effect<void, Error>;
  fileExists: (key: string) => Effect.Effect<boolean, Error>;
}

// S3 Service Tag
export const S3Service = Context.GenericTag<S3Service>("S3Service");

// S3 Configuration
interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
  bucket: string;
}

// S3 Config Tag
export const S3Config = Context.GenericTag<S3Config>("S3Config");

// S3 Service Implementation
const makeS3Service = Effect.gen(function* () {
  const config = yield* S3Config;

  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Required for some S3-compatible services
  });

  const uploadFile = (buffer: Buffer, key: string, contentType: string) =>
    Effect.tryPromise({
      try: async () => {
        // Add the folder structure prefix
        const fullKey = `fixtergeek/blog/audios/${key}`;

        const command = new PutObjectCommand({
          Bucket: config.bucket,
          Key: fullKey,
          Body: buffer,
          ContentType: contentType,
        });

        await s3Client.send(command);
        return `${config.endpoint}/${config.bucket}/${fullKey}`;
      },
      catch: (error) => new Error(`Failed to upload file to S3: ${error}`),
    });

  const generatePresignedUrl = (key: string, expiresIn: number = 3600) =>
    Effect.tryPromise({
      try: async () => {
        // Add the folder structure prefix
        const fullKey = `fixtergeek/blog/audios/${key}`;

        const command = new GetObjectCommand({
          Bucket: config.bucket,
          Key: fullKey,
        });

        return await getSignedUrl(s3Client, command, { expiresIn });
      },
      catch: (error) => new Error(`Failed to generate presigned URL: ${error}`),
    });

  const deleteFile = (key: string) =>
    Effect.tryPromise({
      try: async () => {
        // Add the folder structure prefix
        const fullKey = `fixtergeek/blog/audios/${key}`;

        const command = new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: fullKey,
        });

        await s3Client.send(command);
      },
      catch: (error) => new Error(`Failed to delete file from S3: ${error}`),
    });

  const fileExists = (key: string) =>
    Effect.tryPromise({
      try: async () => {
        try {
          // Add the folder structure prefix
          const fullKey = `fixtergeek/blog/audios/${key}`;

          const command = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: fullKey,
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
      catch: (error) => new Error(`Failed to check file existence: ${error}`),
    });

  return S3Service.of({
    uploadFile,
    generatePresignedUrl,
    deleteFile,
    fileExists,
  });
});

// S3 Service Layer
export const S3ServiceLive = Layer.effect(S3Service, makeS3Service).pipe(
  Layer.provide(
    Layer.succeed(S3Config, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION!,
      endpoint: process.env.AWS_ENDPOINT_URL_S3!,
      bucket: process.env.AWS_S3_BUCKET!, // Audio files bucket
    })
  )
);
