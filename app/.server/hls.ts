import { generateHlsToken } from "~/utils/tokens";

/**
 * URLs de video en Tigris que sirve el proxy HLS.
 *
 * El proxy (`/api/hls-proxy`) exige un token firmado en TODAS sus ramas, así que la
 * URL se arma aquí: en el servidor, después de haber comprobado el acceso. El cliente
 * ya no construye rutas del proxy por su cuenta — sólo usa la que le llega.
 */

const BUCKET = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";

/** Los videos de cursos viven bajo este prefijo; lo demás (pong, sesiones) no pasa por aquí. */
const VIDEOS_PREFIX = "fixtergeek/videos/";

/**
 * Prefijos que se aceptan cuando en la DB quedó la LLAVE suelta y no la URL completa
 * (`fixtergeek/videos/…/hls/master.m3u8`, `animaciones/chunks/…/720p.m3u8`,
 * `animaciones/video-…`). Medido el 8-oct-2026: 35 m3u8 y 31 storageLink en esa forma.
 * Antes del token el cliente los mandaba al proxy tal cual; ahora el servidor los firma.
 */
const LOOSE_KEY_PREFIXES = [VIDEOS_PREFIX, "animaciones/"];

/**
 * Saca la llave del bucket de una URL de Tigris, en cualquiera de sus dos formas:
 * bucket en la ruta (`t3.storage.dev/wild-bird-2039/…`) o en el host
 * (`wild-bird-2039.t3.storage.dev/…`), o de una llave suelta. Devuelve null si no es un
 * video de curso; las URLs completas de otros lados (Firebase) siempre dan null.
 */
export const hlsKeyFromUrl = (url: string): string | null => {
  if (!url) return null;
  // Llave suelta: ni URL ni ruta interna (`/playlist/...`).
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    let key = url;
    if (key.startsWith(`${BUCKET}/`)) key = key.substring(BUCKET.length + 1);
    if (key.includes("..")) return null;
    return LOOSE_KEY_PREFIXES.some((p) => key.startsWith(p)) ? key : null;
  }
  try {
    const parsed = new URL(url);
    let key = parsed.pathname.substring(1); // sin la diagonal inicial
    if (key.startsWith(`${BUCKET}/`)) {
      key = key.substring(BUCKET.length + 1);
    }
    return key.startsWith(VIDEOS_PREFIX) ? key : null;
  } catch {
    return null;
  }
};

/**
 * Arma la URL del proxy ya firmada. Devuelve null si la URL no le corresponde al proxy,
 * para que quien llama conserve su comportamiento anterior (presignar, o dejarla igual).
 */
export const buildHlsProxyUrl = (url: string): string | null => {
  const key = hlsKeyFromUrl(url);
  if (!key) return null;
  const prefix = key.substring(0, key.lastIndexOf("/") + 1);
  return `/api/hls-proxy?path=${encodeURIComponent(key)}&t=${generateHlsToken(prefix)}`;
};
