import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { videoAccessFor } from "~/.server/videoAccess";
import type { Segmento } from "~/.server/transcript";

/**
 * Buscar una palabra en TODO el curso: `/api/course-search?courseId=…&q=…`
 *
 * Es la razón principal por la que existen las transcripciones. Un alumno que recuerda
 * "aquello del caché de contexto" no sabe en qué módulo estaba; hoy tiene que adivinar o
 * preguntar. Buscar por video no sirve: el valor está en cruzar el curso entero.
 */

const MAX_RESULTADOS = 40;
/** Caracteres de contexto a cada lado del término, para que el resultado se entienda. */
const CONTEXTO = 90;

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const courseId = url.searchParams.get("courseId");
  // El slug de cualquier video del curso: sirve para comprobar el acceso una sola vez.
  const videoSlug = url.searchParams.get("videoSlug");

  if (!courseId || !videoSlug) {
    return Response.json({ error: "Faltan courseId y videoSlug" }, { status: 400 });
  }
  // Con una letra el resultado es todo el curso: ruido, no búsqueda.
  if (q.length < 3) return Response.json({ resultados: [] });

  const acceso = await videoAccessFor(request, videoSlug);
  if (!acceso?.hasAccess) {
    return Response.json({ error: "Sin acceso a este curso" }, { status: 403 });
  }

  const transcripts = await db.transcript.findMany({
    where: { courseId },
    select: {
      segments: true,
      video: { select: { slug: true, title: true, index: true } },
    },
  });

  const re = new RegExp(escapar(q), "i");
  const resultados: {
    videoSlug: string;
    videoTitle: string;
    s: number;
    fragmento: string;
  }[] = [];

  for (const t of transcripts) {
    for (const seg of (t.segments as unknown as Segmento[]) || []) {
      const i = seg.texto.search(re);
      if (i === -1) continue;
      const desde = Math.max(0, i - CONTEXTO);
      const hasta = Math.min(seg.texto.length, i + q.length + CONTEXTO);
      resultados.push({
        videoSlug: t.video.slug,
        videoTitle: t.video.title,
        s: Math.floor(seg.s),
        fragmento:
          (desde > 0 ? "…" : "") +
          seg.texto.slice(desde, hasta) +
          (hasta < seg.texto.length ? "…" : ""),
      });
      if (resultados.length >= MAX_RESULTADOS) break;
    }
    if (resultados.length >= MAX_RESULTADOS) break;
  }

  return Response.json({ resultados, truncado: resultados.length >= MAX_RESULTADOS });
};
