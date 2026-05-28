import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { randomUUID } from "crypto";
import slugify from "slugify";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getUserOrRedirect } from "~/.server/dbGetters";
import { getPutFileUrl, getPresignedFromUrl } from "~/.server/tigrs";
import { db } from "~/.server/db";

const VIDEO_URL_PREFIX = `https://fly.storage.tigris.dev/${process.env.BUCKET_NAME}/fixtergeek/videos/`;

// GET: presigned src para PREVIEW. Por `slug` (Video existente) o por
// `storageLink` (video recién subido aún sin registro), restringido al prefijo.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserOrRedirect(request);
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const storageLink = url.searchParams.get("storageLink");

  let link = "";
  if (slug) {
    const v = await db.video.findUnique({
      where: { slug },
      select: { storageLink: true, youtubeUrl: true },
    });
    if (v?.youtubeUrl) return Response.json({ youtubeUrl: v.youtubeUrl });
    link = v?.storageLink || "";
  } else if (storageLink && storageLink.startsWith(VIDEO_URL_PREFIX)) {
    link = storageLink;
  }
  if (!link) {
    return Response.json({ error: "Video no encontrado" }, { status: 404 });
  }
  try {
    const src = await getPresignedFromUrl(link, 3600);
    return Response.json({ src });
  } catch {
    return Response.json({ error: "No se pudo preparar el video" }, { status: 500 });
  }
};

// POST: presigned PUT + metadata. NO crea el Video — se crea al GUARDAR el email
// (evita Videos huérfanos si se cancela el drawer). El archivo sí se sube; un
// archivo suelto en storage es barato vs un registro huérfano en DB.
export const action = async ({ request }: ActionFunctionArgs) => {
  await getUserOrRedirect(request);

  // DELETE: borra el objeto de S3 de un video subido pero NO guardado
  // (cancelar el drawer o reemplazar el video) → sin basura en storage.
  if (request.method === "DELETE") {
    const storageLink = new URL(request.url).searchParams.get("storageLink");
    if (storageLink && storageLink.startsWith(VIDEO_URL_PREFIX)) {
      try {
        const u = new URL(storageLink);
        const parts = u.pathname.split("/").filter(Boolean);
        const client = new S3Client({
          region: "auto",
          endpoint: `${u.protocol}//${u.hostname}`,
        });
        await client.send(
          new DeleteObjectCommand({
            Bucket: parts[0],
            Key: parts.slice(1).join("/"),
          })
        );
      } catch (e) {
        console.error("delete video object failed:", e);
      }
    }
    return Response.json({ ok: true });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { fileName, title } = await request.json();
  if (!fileName || typeof fileName !== "string") {
    return Response.json({ error: "fileName requerido" }, { status: 400 });
  }

  const safeName =
    fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "video.mp4";
  const cleanTitle =
    (title || fileName).replace(/\.[^.]+$/, "").slice(0, 120) || "Video";
  const videoId = randomUUID();
  const slug =
    (slugify(cleanTitle, { lower: true, strict: true }) || "video") +
    "-" +
    randomUUID().slice(0, 8);

  const key = `videos/sequence/${videoId}/original/${safeName}`;
  const putURL = await getPutFileUrl(key);
  const storageLink = `https://fly.storage.tigris.dev/${process.env.BUCKET_NAME}/fixtergeek/${key}`;

  return Response.json({ putURL, slug, title: cleanTitle, storageLink });
};
