import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const PREFIX = "fixtergeek/";

const isDev = process.env.NODE_ENV === "development";

const S3 = new S3Client({
  region: "auto",
  endpoint: "https://fly.storage.tigris.dev",
});

// es mejor configurarlo desde acá en vez dle control panel. (tiene prioridad el panel)
const setCors = async () => {
  const input = {
    Bucket: process.env.BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedHeaders: ["*"],
          AllowedMethods: ["PUT", "DELETE", "GET"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };
  const command = new PutBucketCorsCommand(input);
  return await S3.send(command);
};

export const fileExist = async (
  key: string,
  expiresIn = 3600,
  isAnimations: boolean = true
) => {
  return await S3.send(
    new HeadObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: isAnimations ? PREFIX + key : key,
    })
  )
    .then(() => true)
    .catch((err) => {
      console.error("FILE_MAY_NOT_EXIST", key, err.message);
      return false;
    });
};

export const getReadURL = async (
  key: string,
  expiresIn = 3600,
  isAnimations: boolean = true
) =>
  await getSignedUrl(
    S3,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: isAnimations ? PREFIX + key : key,
    }),
    { expiresIn }
  );

export const getImageURL = async (key: string, expiresIn = 900) =>
  await getSignedUrl(
    S3,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: PREFIX + key, // @TODO: update when prod beta
    }),
    { expiresIn }
  );

// borrame

export const getPutVideoExperiment = async () => {
  const key = "videos_experiment/" + uuidv4();
  await setCors();
  return await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
};

export const getPutFileUrl = async (key: string) => {
  await setCors();
  return await getSignedUrl(
    S3,
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: PREFIX + key,
    }),
    { expiresIn: 3600 }
  );
};

export const getRemoveFileUrl = async (key: string) => {
  await setCors();
  return await getSignedUrl(
    S3,
    new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: PREFIX + key, // @TODO: update when prod beta
    }),
    { expiresIn: 3600 }
  );
};

export const getComboURLs = async (key: string) => ({
  putURL: await getPutFileUrl(key),
  readURL: await getReadURL(key),
  deleteURL: await getRemoveFileUrl(key),
});

// @todo: now is using prefix keys, we can improve
export const removeFilesFor = async (id: string) => {
  const posterDelete = await getRemoveFileUrl("poster-" + id);
  const videoDelete = await getRemoveFileUrl("video-" + id);
  await fetch(posterDelete, { method: "DELETE" });
  await fetch(videoDelete, { method: "DELETE" });
  return true;
};
