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

// Cliente S3 para t3.storage.dev (mismo Tigris, diferente endpoint)
const S3_T3 = new S3Client({
  region: "auto",
  endpoint: "https://t3.storage.dev",
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

// Genera presigned URL para cualquier bucket de Tigris
export const getReadURLForBucket = async (
  bucket: string,
  key: string,
  expiresIn = 3600
) =>
  await getSignedUrl(
    S3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn }
  );

// Genera presigned URL para buckets en t3.storage.dev
export const getReadURLForT3Bucket = async (
  bucket: string,
  key: string,
  expiresIn = 3600
) =>
  await getSignedUrl(
    S3_T3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn }
  );

// Genera signed URL para Firebase Storage
export const getFirebaseSignedUrl = async (
  firebaseUrl: string,
  expiresInMs = 3600000 // 1 hora
) => {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");

  // Inicializar Firebase Admin si no está inicializado
  if (getApps().length === 0) {
    // Usar credenciales de variable de entorno (base64) o archivo local
    const credentialsBase64 = process.env.FIREBASE_CREDENTIALS_BASE64;
    let credential;

    if (credentialsBase64) {
      const credentialsJson = JSON.parse(
        Buffer.from(credentialsBase64, "base64").toString("utf-8")
      );
      credential = cert(credentialsJson);
    } else {
      // Fallback para desarrollo local
      credential = cert("/tmp/firebase-creds.json");
    }

    initializeApp({
      credential,
      storageBucket: "fixter-67253.appspot.com",
    });
  }

  // Extraer el path del archivo de la URL de Firebase
  // URL formato: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media
  const match = firebaseUrl.match(/\/o\/([^?]+)/);
  if (!match) {
    throw new Error("Invalid Firebase Storage URL");
  }

  const filePath = decodeURIComponent(match[1]);
  const bucket = getStorage().bucket();
  const file = bucket.file(filePath);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMs,
  });

  return signedUrl;
};

// Genera presigned URL dinámicamente desde cualquier URL de Tigris
export const getPresignedFromUrl = async (
  originalUrl: string,
  expiresIn = 3600
) => {
  const url = new URL(originalUrl);
  const storageEndpoint = `${url.protocol}//${url.hostname}`;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const bucket = pathParts[0];
  const key = pathParts.slice(1).join('/');

  const client = new S3Client({
    region: "auto",
    endpoint: storageEndpoint,
  });

  return await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
};

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
