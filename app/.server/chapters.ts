import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Capitulo, Segmento } from "./transcript";

/**
 * Capítulos a partir de la transcripción.
 *
 * El modelo elige los TEMAS; los segundos no los inventa. Se le pasa cada bloque
 * numerado y se le pide el índice del bloque donde arranca cada capítulo, no una marca
 * de tiempo. Un modelo que escribe "empieza en el minuto 23" se equivoca a menudo y el
 * capítulo cae en medio de otra cosa; un índice o existe o no, y si no existe se
 * descarta aquí mismo.
 */

const Esquema = z.object({
  capitulos: z
    .array(
      z.object({
        bloque: z
          .number()
          .int()
          .describe("Número del bloque donde EMPIEZA este capítulo, tal como viene en la lista"),
        titulo: z
          .string()
          .describe("Título en español, 3 a 7 palabras, sin numerar y sin comillas"),
      })
    ),
  // Sin `.min()`/`.max()` en el arreglo: la API de structured output no admite
  // `minItems` mayor que 1 y rechaza el esquema entero. El rango va en el prompt y
  // el resultado se valida abajo.
});

const SYSTEM = `Divides transcripciones de clases y webinars técnicos en capítulos.

Reglas:
- Entre 8 y 14 capítulos para una hora de video; menos si dura menos.
- El primero SIEMPRE empieza en el bloque 0.
- **Los capítulos cubren el video COMPLETO.** El último tiene que empezar dentro del
  tramo final: dejar la última media hora sin capitular es el error más común y hace
  inservible la barra justo donde suelen estar las preguntas y el cierre.
- Un capítulo es un cambio de tema real, no un cambio de quien habla.
- Los títulos describen lo que se explica ahí, en español, sin numerar y sin
  fórmulas de relleno ("Parte 1", "Continuación", "Más sobre X").
- Español mexicano, directo. Nada de mayúsculas en cada palabra.`;

/** Cuánto texto cabe en el prompt. Una hora de charla son ~9.000 palabras. */
const MAX_CARACTERES = 90_000;

export const generarCapitulos = async (
  segmentos: Segmento[],
  { titulo }: { titulo?: string } = {}
): Promise<Capitulo[]> => {
  if (segmentos.length < 3) return [];

  // Numerar los bloques es lo que ancla la respuesta a segundos que existen de verdad.
  let usados = 0;
  const lineas: string[] = [];
  for (const [i, seg] of segmentos.entries()) {
    const linea = `[${i}] ${seg.quien ? `${seg.quien}: ` : ""}${seg.texto}`;
    if (usados + linea.length > MAX_CARACTERES) break;
    usados += linea.length;
    lineas.push(linea);
  }

  const duracion = segmentos[segmentos.length - 1].e;
  const mins = Math.round(duracion / 60);

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: Esquema,
    system: SYSTEM,
    temperature: 0.3,
    prompt:
      (titulo ? `Video: "${titulo}".\n` : "") +
      // Decirle la duración y cuántos bloques hay es lo que evita que capitule sólo la
      // primera mitad: sin esa referencia no sabe dónde está el final.
      `Duración: ${mins} minutos, en ${lineas.length} bloques (del 0 al ${lineas.length - 1}).\n` +
      `El último capítulo debe empezar después del bloque ${Math.floor(lineas.length * 0.8)}.\n\n` +
      `Transcripción por bloques:\n\n${lineas.join("\n")}`,
  });

  const caps = (
    object.capitulos
      // Un bloque fuera de rango es una alucinación: se tira, no se aproxima.
      .filter((c) => Number.isInteger(c.bloque) && c.bloque >= 0 && c.bloque < segmentos.length)
      .map((c) => ({ s: Math.floor(segmentos[c.bloque].s), titulo: c.titulo.trim() }))
      .sort((a, b) => a.s - b.s)
      // Dos capítulos en el mismo segundo dejan uno inalcanzable en la barra.
      .filter((c, i, todos) => i === 0 || c.s > todos[i - 1].s)
      // El video siempre empieza en algún capítulo: si no, el primer tramo no tiene nombre.
      .map((c, i) => (i === 0 ? { ...c, s: 0 } : c))
  );

  const ultimo = caps[caps.length - 1];
  if (ultimo && ultimo.s < duracion * 0.8) {
    console.warn(
      `⚠️  El último capítulo empieza en el minuto ${Math.round(ultimo.s / 60)} de ${mins}: ` +
        `quedan ${Math.round((duracion - ultimo.s) / 60)} min sin capitular.\n` +
        `   Vale la pena volver a correrlo o añadir el capítulo del cierre a mano.`
    );
  }

  return caps;
};
