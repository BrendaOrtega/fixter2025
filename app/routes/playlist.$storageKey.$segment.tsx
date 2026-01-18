import type { LoaderFunctionArgs } from "react-router";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";

const CHUNKS_FOLDER = "animaciones/chunks";

// Sirve playlists de calidad (.m3u8) y segmentos (.ts) para videos de animaciones
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { storageKey, segment } = params;

  if (!storageKey || !segment) {
    throw new Response("Not found", { status: 404 });
  }

  const s3Path = `${CHUNKS_FOLDER}/${storageKey}/${segment}`;

  // Si es un playlist de calidad (.m3u8), descargarlo y reemplazar links
  if (segment.endsWith(".m3u8")) {
    try {
      // Obtener presigned URL y descargar contenido
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(s3Path, 300)
      );

      const response = await fetch(presignedUrl);
      if (!response.ok) {
        throw new Response("Playlist not found", { status: 404 });
      }

      const content = await response.text();

      // Reemplazar nombres de .ts por rutas del servidor
      const lines = content.split("\n");
      const rewritten = lines.map((line) => {
        if (line.endsWith(".ts")) {
          return `/playlist/${storageKey}/${line}`;
        }
        return line;
      });

      return new Response(rewritten.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegURL",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      console.error("Error loading playlist:", error);
      throw new Response("Playlist not found", { status: 404 });
    }
  }

  // Si es un segmento .ts, hacer streaming del contenido
  if (segment.endsWith(".ts")) {
    try {
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(s3Path, 3600) // 1 hora para segmentos
      );

      // Fetch y stream del contenido (HLS.js no maneja bien redirects 302)
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        throw new Response("Segment not found", { status: 404 });
      }

      return new Response(response.body, {
        headers: {
          "Content-Type": "video/MP2T",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "private, max-age=1800",
        },
      });
    } catch (error) {
      console.error("Error getting segment:", error);
      throw new Response("Segment not found", { status: 404 });
    }
  }

  throw new Response("Invalid segment type", { status: 400 });
};
