import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "~/.server/db";
import { boxGet } from "~/.server/services/club-call-box.server";
import type { Segmento } from "./transcript";

/**
 * Momentos de una grabación del club: los mejores tramos para revivir la llamada.
 *
 * Mismo principio que `chapters.ts`: el modelo elige QUÉ momentos y regresa índices de
 * bloque (`desde`/`hasta`), nunca segundos. Un índice o existe o se tira; un «minuto 47»
 * inventado caería en medio de otra cosa.
 */

export type Moment = { s: number; e: number; title: string; summary: string };

const MIN_SEG = 20;
const MAX_SEG = 180;
/** ~3 h de charla caben enteras; arriba de esto se recorta cada bloque. */
const MAX_CARACTERES = 150_000;

const Esquema = z.object({
  momentos: z.array(
    z.object({
      desde: z.number().int().describe("Bloque donde EMPIEZA el momento, tal como viene en la lista"),
      hasta: z.number().int().describe("Bloque donde TERMINA el momento (puede ser el mismo que `desde`)"),
      title: z.string().describe("Título en español, 3 a 8 palabras, concreto, sin comillas"),
      summary: z.string().describe("Una frase: qué pasa en ese tramo y por qué vale la pena verlo"),
    })
  ),
  // Sin `.min()`/`.max()`: structured output rechaza `minItems` > 1. El rango va en el prompt.
});

const SYSTEM = `Eliges los mejores momentos de la grabación de una llamada en vivo de una comunidad
de programadores que construyen agentes de IA (hackatones, demos, sesiones de preguntas).

Reglas:
- Entre 6 y 10 momentos, repartidos por toda la llamada (no sólo el principio).
- Un momento es algo que alguien querría volver a ver: una demo que funciona, un error que se
  resuelve en vivo, una explicación clara, una presentación de proyecto, una reacción, un anuncio.
- Nada de logística: probar audio, esperar a que entre la gente, «¿me escuchan?», despedidas.
- Cada momento dura entre 30 segundos y 3 minutos.
- Los títulos dicen qué pasa con nombre propio cuando lo hay («Mariana publica su app de boletos»),
  en español mexicano, sin mayúsculas en cada palabra y sin fórmulas («Momento épico», «Parte 2»).`;

/** El transcript de la fila; si aún no está copiado, lo baja de la caja y lo guarda. */
export async function loadSegments(row: { id: string; boxFile: string | null; segments: unknown }): Promise<Segmento[]> {
  if (Array.isArray(row.segments) && row.segments.length) return row.segments as Segmento[];
  if (!row.boxFile) throw new Error("Esta grabación no tiene archivo en la caja: no hay de dónde sacar el transcript.");
  const r = await boxGet(`/admin/recording/transcript-json?file=${encodeURIComponent(row.boxFile)}`);
  if (!r) throw new Error("La caja de llamadas no contestó. Intenta en un momento.");
  const t = (r.json?.transcript ?? null) as { segments?: Segmento[] } | null;
  if (r.json?.status !== "ready" || !t?.segments?.length) {
    throw new Error("El transcript todavía no está listo en la caja (whisper sigue trabajando).");
  }
  await db.communityRecording.update({ where: { id: row.id }, data: { segments: t.segments as object[] } });
  return t.segments;
}

export async function proposeMoments(segmentos: Segmento[], { titulo }: { titulo?: string } = {}): Promise<Moment[]> {
  if (segmentos.length < 3) return [];
  const total = segmentos.reduce((n, s) => n + s.texto.length, 0);
  // Si la llamada no cabe, se recorta cada bloque parejo en vez de cortar el final.
  const tope = total > MAX_CARACTERES ? Math.max(60, Math.floor(MAX_CARACTERES / segmentos.length)) : Infinity;
  const lineas = segmentos.map(
    (seg, i) => `[${i}] ${seg.quien ? `${seg.quien}: ` : ""}${seg.texto.length > tope ? seg.texto.slice(0, tope) + "…" : seg.texto}`
  );
  const duracion = segmentos[segmentos.length - 1].e;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5-5"),
    schema: Esquema,
    system: SYSTEM,
    // Sonnet 5.5 no acepta `tool_choice` forzado (lo que usa `generateObject` por defecto): salida JSON nativa.
    providerOptions: { anthropic: { structuredOutputMode: "outputFormat" } },
    prompt:
      (titulo ? `Llamada: "${titulo}".\n` : "") +
      `Duración: ${Math.round(duracion / 60)} minutos, en ${lineas.length} bloques (del 0 al ${lineas.length - 1}).\n\n` +
      `Transcripción por bloques:\n\n${lineas.join("\n")}`,
  });

  const ok = (i: number) => Number.isInteger(i) && i >= 0 && i < segmentos.length;
  const momentos = object.momentos
    // Un bloque fuera de rango es una alucinación: se tira, no se aproxima.
    .filter((m) => ok(m.desde) && ok(m.hasta))
    .map((m) => {
      const [a, b] = m.desde <= m.hasta ? [m.desde, m.hasta] : [m.hasta, m.desde];
      const s = Math.floor(segmentos[a].s);
      let e = Math.ceil(segmentos[b].e);
      // Ni un destello ni media hora: se ajusta al rango que se puede ver de corrido.
      if (e - s < MIN_SEG) e = Math.min(Math.ceil(duracion), s + MIN_SEG);
      if (e - s > MAX_SEG) e = s + MAX_SEG;
      return { s, e, title: m.title.trim(), summary: m.summary.trim() };
    })
    .sort((x, y) => x.s - y.s);
  // Dos momentos encimados se ven como el mismo: gana el primero.
  return momentos.filter((m, i) => i === 0 || m.s >= momentos[i - 1].e);
}

/** Propone y guarda como borrador (quita la aprobación anterior). */
export async function generateRecordingMoments(communityId: string, id: string): Promise<Moment[]> {
  const row = await db.communityRecording.findFirst({ where: { id, communityId } });
  if (!row) throw new Error("No encontré la grabación.");
  const segments = await loadSegments(row);
  const moments = await proposeMoments(segments, { titulo: row.title });
  if (!moments.length) throw new Error("La IA no propuso momentos; vuelve a intentarlo.");
  await db.communityRecording.update({ where: { id }, data: { moments, momentsApprovedAt: null } });
  return moments;
}

/** Valida la lista editada a mano. `null` si viene mal. */
export function parseMoments(raw: string, duracion: number): Moment[] | null {
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const out: Moment[] = [];
  for (const m of list as Record<string, unknown>[]) {
    const s = Number(m.s), e = Number(m.e);
    const title = String(m.title ?? "").trim().slice(0, 120);
    const summary = String(m.summary ?? "").trim().slice(0, 300);
    if (!title || !Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e <= s) return null;
    if (duracion > 0 && s >= duracion) return null;
    out.push({ s: Math.floor(s), e: Math.ceil(duracion > 0 ? Math.min(e, duracion) : e), title, summary });
  }
  return out.sort((a, b) => a.s - b.s);
}
