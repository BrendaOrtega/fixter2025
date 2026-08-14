import type { LoaderFunctionArgs } from "react-router";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";
import { generateHlsToken, validateHlsToken } from "~/utils/tokens";

const CHUNKS_FOLDER = "animaciones/chunks";

// Sirve playlists de calidad (.m3u8) y segmentos (.ts) para videos de animaciones
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
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
      // Los segmentos se firman por carpeta; el token viaja en la línea y lo valida
      // la rama de abajo antes de redirigir a Tigris.
      const token = generateHlsToken(`${CHUNKS_FOLDER}/${storageKey}/`);
      const lines = content.split("\n");
      const rewritten = lines.map((line) => {
        if (line.endsWith(".ts")) {
          return `/playlist/${storageKey}/${line}?t=${token}`;
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

  // Si es un segmento .ts, redirigir a Tigris: los bytes no pasan por esta máquina.
  // hls.js sigue el redirect sin problema desde un XHR porque el bucket tiene CORS.
  if (segment.endsWith(".ts")) {
    const token = new URL(request.url).searchParams.get("t");
    const { isValid, error } = validateHlsToken(token, s3Path);
    if (!isValid) {
      throw new Response(error, { status: 403 });
    }

    try {
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(s3Path, 3600) // 1 hora para segmentos
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: presignedUrl,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error getting segment:", error);
      throw new Response("Segment not found", { status: 404 });
    }
  }

  throw new Response("Invalid segment type", { status: 400 });
};
