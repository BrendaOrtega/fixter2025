// beat-snap.js — ajusta (snap) los inicios de tweens al beat de la música o a la palabra de la voz.
// Sin dependencias; funciona como <script> (window.BeatSnap) y como módulo CommonJS (node).
// Regla de la casa: la palabra decide QUÉ entra y el beat decide CUÁNDO exacto (±maxShift).
(function (global) {
  "use strict";

  // Rejilla de beats a partir de BPM + offset (segundo del primer beat). subdiv 2 = corcheas, 4 = semicorcheas.
  function grid({ bpm, offset = 0, subdiv = 1, duration = 600 }) {
    const step = 60 / bpm / subdiv;
    const out = [];
    // también hacia atrás desde el offset, por si la música arranca antes del cuadro 0
    const first = offset - Math.floor(offset / step) * step;
    for (let t = first; t <= duration + 1e-9; t += step) out.push(+t.toFixed(4));
    return out;
  }

  // Normaliza beats detectados: number[] o [{time}] / [{t}] → number[] ordenado.
  function beats(list) {
    return (list || []).map((b) => (typeof b === "number" ? b : b.time ?? b.t ?? b.start)).filter(Number.isFinite).sort((a, b) => a - b);
  }

  // Normaliza tiempos por palabra (`npx hyperframes transcribe --json`: [{text,start,end}], o whisper {words|segments}).
  function words(json) {
    const arr = Array.isArray(json) ? json : json.words || (json.segments || []).flatMap((s) => s.words || []);
    return arr.map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: +w.start, end: +w.end })).filter((w) => Number.isFinite(w.start));
  }

  // Inicio de la n-ésima aparición de una palabra (sin acentos ni puntuación, insensible a mayúsculas).
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  function wordAt(ws, text, nth = 0) {
    const hits = ws.filter((w) => norm(w.text) === norm(text));
    if (!hits[nth]) throw new Error(`beat-snap: no está la palabra «${text}» (#${nth})`);
    return hits[nth].start;
  }

  function nearest(sorted, t) {
    let best = null;
    for (const c of sorted) if (best === null || Math.abs(c - t) < Math.abs(best - t)) best = c;
    return best;
  }

  /**
   * Devuelve el inicio ajustado de un tween.
   * opts.beats     number[]  tiempos de beat (grid() o detectados)
   * opts.words     [{start}] palabras (words())
   * opts.to        "beat" | "word" | "both"  a qué se pega (default "beat")
   * opts.maxShift  s         si nada cae a esta distancia, el tiempo queda igual (default 0.12)
   * opts.impact    0–1       fracción del tween donde está el golpe visible; se alinea ESE punto, no el inicio.
   *                          back.out(s) → 1/(s+1). Requiere opts.duration.
   * opts.lead      s         adelanto fijo tras el snap (p. ej. -1/30 para que el golpe caiga un cuadro antes)
   * opts.fps       redondea al cuadro (default 30; 0 = sin redondeo)
   */
  function snap(t, opts = {}) {
    const { to = "beat", maxShift = 0.12, impact = 0, duration = 0, lead = 0, fps = 30 } = opts;
    const hit = t + impact * duration;
    let cands = [];
    if (to !== "word") cands = cands.concat(opts.beats || []);
    if (to !== "beat") cands = cands.concat((opts.words || []).map((w) => w.start));
    const c = nearest(cands, hit);
    let out = c !== null && Math.abs(c - hit) <= maxShift ? c - impact * duration : t;
    out += lead;
    if (fps) out = Math.round(out * fps) / fps;
    return Math.max(0, +out.toFixed(4));
  }

  const snapAll = (times, opts) => times.map((t) => snap(t, opts));

  // Corre los hijos directos de una timeline GSAP ya armada. filter(child) decide cuáles (default: todos los tweens).
  // impactOf(child) da la fracción del golpe por tween (default: lee back.out(s) del ease → 1/(s+1); si no, 0).
  function snapTimeline(tl, opts = {}, filter = (c) => !!c.vars) {
    const impactOf = opts.impactOf || ((c) => {
      const m = String(c.vars.ease || "").match(/back\.out\(([\d.]+)\)/);
      return m ? 1 / (+m[1] + 1) : 0;
    });
    tl.getChildren(false, true, true).forEach((c) => {
      if (!filter(c)) return;
      c.startTime(snap(c.startTime(), { ...opts, impact: impactOf(c), duration: c.duration() }));
    });
    return tl;
  }

  const api = { grid, beats, words, wordAt, snap, snapAll, snapTimeline };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.BeatSnap = api;
})(typeof window !== "undefined" ? window : globalThis);
