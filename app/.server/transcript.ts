/**
 * Transcripciones de video: leer whisper, escribir WebVTT.
 *
 * Hay DOS formatos de entrada y los dos tienen que leerse, porque son los dos que
 * Ghosty Teams produce hoy:
 *
 *   1. La salida cruda de whisper, con marcas de inicio Y fin:
 *        `[00:01:02.500 --> 00:01:07.000] blissmo: texto`
 *   2. El `.md` que descarga la vista de transcripción, que ya viene agrupado por
 *      hablante y sólo conserva el inicio, al minuto:
 *        `**01:02 · blissmo**\n\ntexto`
 *
 * El segundo pierde el fin del segmento y los milisegundos. Para los subtítulos hace
 * falta un fin, así que se infiere del inicio del segmento siguiente. No es exacto,
 * pero un subtítulo que dura hasta que empieza el siguiente se lee bien; uno sin fin
 * no se puede renderizar.
 *
 * La lógica de partido viene de la vista de Ghosty Teams
 * (`src/routes/room.$slug_.transcripcion.$id.tsx`), que ya está probada contra
 * grabaciones reales. Aquí se conserva el fin, que allá se descartaba.
 */

export type Segmento = {
  /** Segundo en que empieza. */
  s: number;
  /** Segundo en que termina. Inferido cuando la fuente no lo trae. */
  e: number;
  quien: string | null;
  texto: string;
};

export type Capitulo = { s: number; titulo: string };

/** Duración por defecto del último segmento cuando no hay uno siguiente del cual inferir. */
const COLA_SEGUNDOS = 4;

const aSegundos = (h: string, m: string, sec: string) => +h * 3600 + +m * 60 + +sec;

/**
 * ⚠️ El nombre del hablante se acepta sin espacios a propósito (`blissmo:`): así una
 * frase que empiece por "bueno: mira" no se confunde con un hablante.
 */
const HABLANTE = /^(\S[^:\s]{0,58}):\s+(.*)$/;

const partirHablante = (resto: string): { quien: string | null; texto: string } => {
  const m = HABLANTE.exec(resto);
  return m ? { quien: m[1], texto: m[2] } : { quien: null, texto: resto };
};

/** Formato 1: salida cruda de whisper. Trae inicio y fin. */
const leerWhisper = (texto: string): Segmento[] =>
  [
    ...texto.matchAll(
      /\[(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.\d+\]\s*(.*)/g
    ),
  ]
    .map((m) => ({
      s: aSegundos(m[1], m[2], m[3]),
      e: aSegundos(m[4], m[5], m[6]),
      ...partirHablante(m[7].trim()),
    }))
    // whisper emite segmentos vacíos en los silencios.
    .filter((seg) => seg.texto);

/** Formato 2: el `.md` de la vista de transcripción. Sólo trae inicio, al minuto. */
const leerMarkdown = (texto: string): Segmento[] => {
  const bloques = [
    ...texto.matchAll(/^\*\*(?:(\d{2}):)?(\d{2}):(\d{2})(?:\s*·\s*([^*]+?))?\*\*\s*\n+([\s\S]*?)(?=\n\*\*|\n*$)/gm),
  ];
  return bloques
    .map((m) => ({
      // Con tres grupos es hh:mm:ss; con dos, mm:ss.
      s: m[1] ? aSegundos(m[1], m[2], m[3]) : aSegundos("0", m[2], m[3]),
      e: 0, // se rellena abajo
      quien: m[4]?.trim() || null,
      texto: m[5].replace(/\s+/g, " ").trim(),
    }))
    .filter((seg) => seg.texto);
};

/** Rellena los fines faltantes con el inicio del siguiente. */
const inferirFines = (segs: Segmento[]): Segmento[] =>
  segs.map((seg, i) => {
    if (seg.e > seg.s) return seg;
    const siguiente = segs[i + 1];
    return { ...seg, e: siguiente ? siguiente.s : seg.s + COLA_SEGUNDOS };
  });

/**
 * Lee cualquiera de los dos formatos. Se prueba primero el crudo de whisper porque es
 * el que trae más información; sólo si no hay ni una marca se intenta el markdown.
 */
export const parseTranscript = (texto: string): Segmento[] => {
  const whisper = leerWhisper(texto);
  if (whisper.length) return inferirFines(whisper);
  return inferirFines(leerMarkdown(texto));
};

/**
 * ¿Es un `.md` de Ghosty Teams al que le faltan las marcas de tiempo?
 *
 * Cuando la transcripción se genera sin marcas ni hablantes, el exportador escribe los
 * separadores igual pero vacíos: `**` + nada + `**` = `****`. El archivo parece correcto
 * —tiene encabezado, párrafos y todo el texto— pero sin marcas no hay subtítulos, ni
 * capítulos, ni clic para saltar. Detectarlo aquí evita el diagnóstico a mano.
 */
export const pareceSinMarcas = (texto: string): boolean =>
  /^\*{4}\s*$/m.test(texto) && !/^\*\*(\d{2}:)?\d{2}:\d{2}/m.test(texto);

/**
 * Junta segmentos consecutivos del mismo hablante. Repetir el nombre en cada línea de
 * una frase partida en cinco trozos es ruido, no información.
 *
 * ⚠️ Los segmentos SIN hablante no se juntan CUANDO los hay identificados: agrupar por
 * `null` fundiría en un bloque cosas dichas por personas distintas.
 *
 * Pero si NINGUNO trae hablante —whisper sin diarización, que es lo normal— no hay nada
 * que preservar y sí mucho que perder: quedan cuatrocientos bloques de siete segundos,
 * de tres o cuatro palabras cada uno. En el panel del visor eso no se lee, se deletrea.
 * En ese caso se juntan por tiempo, como párrafos.
 *
 * `maxSegundos` evita el bloque interminable cuando alguien habla veinte minutos
 * seguido — un párrafo así no se puede seguir mientras corre el video.
 */
export const agruparPorHablante = (segs: Segmento[], maxSegundos = 45): Segmento[] => {
  const hayHablantes = segs.some((seg) => seg.quien !== null);
  const out: Segmento[] = [];
  for (const seg of segs) {
    const ultimo = out[out.length - 1];
    const cabe = ultimo && seg.e - ultimo.s <= maxSegundos;
    const mismoOrigen = ultimo
      ? hayHablantes
        ? ultimo.quien === seg.quien && seg.quien !== null
        : true
      : false;
    if (ultimo && mismoOrigen && cabe) {
      ultimo.texto += " " + seg.texto;
      ultimo.e = seg.e;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
};

/** `3723.5` → `01:02:03.500`, que es lo que WebVTT espera. */
const marcaVtt = (segundos: number): string => {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const ms = Math.round((segundos % 1) * 1000);
  const dd = (n: number, ancho = 2) => String(n).padStart(ancho, "0");
  return `${dd(h)}:${dd(m)}:${dd(s)}.${dd(ms, 3)}`;
};

/** Subtítulos. El nombre del hablante va dentro del cue, no como metadato. */
export const toVTT = (segs: Segmento[]): string => {
  const cues = segs
    // Un cue con fin <= inicio no lo pinta ningún navegador.
    .filter((seg) => seg.e > seg.s)
    .map((seg) => {
      const linea = seg.quien ? `<v ${seg.quien}>${seg.texto}` : seg.texto;
      return `${marcaVtt(seg.s)} --> ${marcaVtt(seg.e)}\n${linea}`;
    });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
};

/**
 * Capítulos. Cada uno dura hasta que empieza el siguiente; el último, hasta
 * `duracion` (o hasta su propio inicio + un minuto si no la sabemos).
 */
export const toChaptersVTT = (caps: Capitulo[], duracion?: number): string => {
  const cues = caps.map((cap, i) => {
    const fin = caps[i + 1]?.s ?? duracion ?? cap.s + 60;
    return `${marcaVtt(cap.s)} --> ${marcaVtt(fin)}\n${cap.titulo}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
};

/** El texto corrido: es lo que se busca y lo que va en el JSON-LD. */
export const textoPlano = (segs: Segmento[]): string =>
  segs.map((seg) => seg.texto).join(" ").replace(/\s+/g, " ").trim();
