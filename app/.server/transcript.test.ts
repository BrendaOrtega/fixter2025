import { describe, it, expect } from "vitest";
import {
  parseTranscript,
  agruparPorHablante,
  toVTT,
  toChaptersVTT,
  textoPlano,
} from "./transcript";

describe("parseTranscript — salida cruda de whisper", () => {
  it("lee inicio, fin y texto", () => {
    const s = parseTranscript(
      "[00:00:01.000 --> 00:00:04.500]   hola qué tal\n" +
        "[00:01:12.000 --> 00:01:15.000]   seguimos aquí\n"
    );
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ s: 1, e: 4, texto: "hola qué tal", quien: null });
    expect(s[1]).toMatchObject({ s: 72, e: 75 });
  });

  it("aguanta que la grabación cruce la hora", () => {
    const [seg] = parseTranscript("[01:02:03.000 --> 01:02:05.000]  larga\n");
    expect(seg.s).toBe(3723);
  });

  it("lee el nombre de quien habla", () => {
    const s = parseTranscript(
      "[00:00:01.000 --> 00:00:04.000] blissmo: hola\n" +
        "[00:00:05.000 --> 00:00:08.000] brendi: aquí andamos\n"
    );
    expect(s.map((x) => [x.quien, x.texto])).toEqual([
      ["blissmo", "hola"],
      ["brendi", "aquí andamos"],
    ]);
  });

  // ⚠️ Sin esto, "bueno" acabaría siendo un hablante.
  it("no confunde una frase con dos puntos con un hablante", () => {
    const [seg] = parseTranscript("[00:00:01.000 --> 00:00:04.000]  o sea mira: esto es así\n");
    expect(seg.quien).toBeNull();
    expect(seg.texto).toBe("o sea mira: esto es así");
  });

  it("descarta los segmentos vacíos que whisper emite en los silencios", () => {
    const s = parseTranscript(
      "[00:00:00.000 --> 00:00:02.000]   \n[00:00:02.000 --> 00:00:04.000]  algo\n"
    );
    expect(s).toHaveLength(1);
  });

  it("no revienta con texto vacío", () => {
    expect(parseTranscript("")).toEqual([]);
  });
});

describe("parseTranscript — el .md que descarga Ghosty Teams", () => {
  const md = [
    "# Primer webinar",
    "",
    "_Transcripción · 13 de agosto, 19:00. Generada automáticamente: puede tener errores._",
    "",
    "**00:10 · blissmo**",
    "",
    "vamos a empezar por el contexto",
    "",
    "**01:05 · brendi**",
    "",
    "yo tengo una duda de eso",
    "",
    "**01:02:03**",
    "",
    "y aquí cerramos",
    "",
  ].join("\n");

  it("lee los bloques con hablante y marca", () => {
    const s = parseTranscript(md);
    expect(s.map((x) => [x.s, x.quien, x.texto])).toEqual([
      [10, "blissmo", "vamos a empezar por el contexto"],
      [65, "brendi", "yo tengo una duda de eso"],
      [3723, null, "y aquí cerramos"],
    ]);
  });

  // El .md no trae fin: sin inferirlo no hay subtítulos posibles.
  it("infiere el fin de cada bloque con el inicio del siguiente", () => {
    const s = parseTranscript(md);
    expect(s[0].e).toBe(65);
    expect(s[1].e).toBe(3723);
    // El último no tiene siguiente, así que se le da una cola.
    expect(s[2].e).toBeGreaterThan(s[2].s);
  });

  it("no se traga el encabezado como si fuera diálogo", () => {
    expect(textoPlano(parseTranscript(md))).not.toContain("Generada automáticamente");
  });
});

describe("agruparPorHablante", () => {
  const seg = (quien: string | null, texto: string, s = 0, e = 2) => ({ quien, texto, s, e });

  it("junta lo consecutivo del mismo hablante y estira el fin", () => {
    const g = agruparPorHablante([
      seg("ana", "una frase", 0, 2),
      seg("ana", "y otra", 2, 5),
      seg("luis", "yo", 5, 7),
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ quien: "ana", texto: "una frase y otra", s: 0, e: 5 });
    expect(g[1]).toMatchObject({ quien: "luis", texto: "yo" });
  });

  // Agrupar por `null` fundiría en un bloque cosas dichas por gente distinta.
  it("no junta los segmentos sin hablante", () => {
    expect(agruparPorHablante([seg(null, "a"), seg(null, "b")])).toHaveLength(2);
  });

  // Un bloque de veinte minutos no se puede seguir mientras corre el video.
  it("corta el bloque cuando se pasa del máximo", () => {
    const g = agruparPorHablante(
      [seg("ana", "a", 0, 30), seg("ana", "b", 30, 60), seg("ana", "c", 60, 90)],
      45
    );
    expect(g.length).toBeGreaterThan(1);
  });
});

describe("toVTT", () => {
  it("escribe cues con marca de WebVTT y el hablante dentro", () => {
    const vtt = toVTT([{ s: 3723.5, e: 3725, quien: "blissmo", texto: "hola" }]);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("01:02:03.500 --> 01:02:05.000");
    expect(vtt).toContain("<v blissmo>hola");
  });

  // Un cue con fin <= inicio no lo pinta ningún navegador: mejor omitirlo que romper el archivo.
  it("descarta los cues de duración cero", () => {
    expect(toVTT([{ s: 5, e: 5, quien: null, texto: "x" }])).toBe("WEBVTT\n\n\n");
  });
});

describe("toChaptersVTT", () => {
  it("cada capítulo dura hasta que empieza el siguiente", () => {
    const vtt = toChaptersVTT([
      { s: 0, titulo: "Intro" },
      { s: 600, titulo: "Arquitectura" },
    ], 1800);
    expect(vtt).toContain("00:00:00.000 --> 00:10:00.000\nIntro");
    expect(vtt).toContain("00:10:00.000 --> 00:30:00.000\nArquitectura");
  });
});
