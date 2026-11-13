import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { videoAccessFor } from "~/.server/videoAccess";
import { signedStoryboardVtt, storyboardResponse } from "~/.server/storyboard";

/**
 * El storyboard de miniaturas: `/api/storyboard/:videoSlug`
 *
 * La caja de `livekit-svc` sube, junto al HLS, un sprite con un fotograma cada 10 s y un
 * WebVTT donde cada cue apunta a un recorte con `#xywh`. El sprite existe justamente para
 * que el hover de la barra cueste UNA petición y no cuatrocientas.
 *
 * Aquí sólo se reescribe el nombre relativo de la imagen a una URL firmada del proxy —el
 * mismo patrón que con las playlists—, porque el bucket es privado y el navegador no puede
 * pedirle nada directo.
 */

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { videoSlug } = params;
  if (!videoSlug) return new Response("Falta el video", { status: 400 });

  const acceso = await videoAccessFor(request, videoSlug);
  if (!acceso) return new Response("Video no encontrado", { status: 404 });
  if (!acceso.hasAccess) return new Response("Sin acceso a este video", { status: 403 });

  const video = await db.video.findUnique({
    where: { slug: videoSlug },
    select: { m3u8: true },
  });
  // El storyboard cuelga del mismo prefijo que el HLS; sin HLS no hay storyboard.
  if (!video?.m3u8) return new Response("Este video no tiene storyboard", { status: 404 });

  // …/hls/master.m3u8 → …/storyboard/storyboard.vtt
  const base = video.m3u8.replace(/\/hls\/[^/]*$/, "/");
  const vtt = await signedStoryboardVtt(base);
  return vtt ? storyboardResponse(vtt) : new Response("Este video no tiene storyboard", { status: 404 });
};
