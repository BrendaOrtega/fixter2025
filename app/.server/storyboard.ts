import { Effect } from "effect";
import { buildHlsProxyUrl, hlsKeyFromUrl } from "~/.server/hls";
import { s3VideoService } from "~/.server/services/s3-video";

/**
 * Baja el `storyboard.vtt` que cuelga de `base` (…/<video>/) y reescribe cada imagen relativa
 * (`storyboard.webp#xywh=…`) a una URL firmada del proxy; el bucket es privado. `null` si no hay.
 * Lo usan el visor de cursos (`/api/storyboard/:slug`) y las grabaciones del club.
 */
export async function signedStoryboardVtt(base: string): Promise<string | null> {
  const key = hlsKeyFromUrl(base + "storyboard/storyboard.vtt");
  if (!key) return null;
  let contenido: string;
  try {
    const firmada = await Effect.runPromise(s3VideoService.getHLSPresignedUrl(key, 300));
    const r = await fetch(firmada);
    if (!r.ok) return null;
    contenido = await r.text();
  } catch {
    return null;
  }
  // El fragmento `#xywh` se conserva tal cual: es lo que recorta el tile.
  return contenido.replace(
    /^([^\s#][^\s]*\.(?:jpg|jpeg|png|webp))(#[^\s]*)?$/gim,
    (_todo, archivo: string, fragmento = "") => {
      const url = buildHlsProxyUrl(base + "storyboard/" + archivo);
      return url ? `${url}${fragmento}` : `${archivo}${fragmento}`;
    }
  );
}

export const storyboardResponse = (vtt: string) =>
  new Response(vtt, { headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, max-age=1800" } });
