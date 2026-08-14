import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { videoAccessFor } from "~/.server/videoAccess";
import { toVTT, toChaptersVTT, type Capitulo, type Segmento } from "~/.server/transcript";

/**
 * Subtítulos y capítulos en WebVTT: `/api/transcript/:videoSlug?kind=captions|chapters`
 *
 * El acceso se resuelve con el MISMO helper que el viewer (`videoAccessFor`). Sin eso,
 * los subtítulos serían una puerta trasera al contenido de un curso de pago: el
 * transcript es el video en texto.
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { videoSlug } = params;
  if (!videoSlug) return new Response("Falta el video", { status: 400 });

  const kind = new URL(request.url).searchParams.get("kind") || "captions";
  if (kind !== "captions" && kind !== "chapters") {
    return new Response("kind debe ser 'captions' o 'chapters'", { status: 400 });
  }

  const acceso = await videoAccessFor(request, videoSlug);
  if (!acceso) return new Response("Video no encontrado", { status: 404 });
  if (!acceso.hasAccess) return new Response("Sin acceso a este video", { status: 403 });

  const transcript = await db.transcript.findUnique({
    where: { videoId: acceso.videoId },
    select: { segments: true, chapters: true },
  });
  if (!transcript) return new Response("Este video no tiene transcripción", { status: 404 });

  const cuerpo =
    kind === "chapters"
      ? toChaptersVTT((transcript.chapters as unknown as Capitulo[]) || [])
      : toVTT(transcript.segments as unknown as Segmento[]);

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      // Privado: depende de quién pregunta, así que no puede quedar en una caché compartida.
      "Cache-Control": "private, max-age=3600",
    },
  });
};
