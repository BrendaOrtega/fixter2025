// Partitura del short «Club + hackatón» (vertical 1080×1920). La voz manda: cada animación se ancla a la
// palabra que la nombra (voice/lines.json, Parakeet por clip). Salida: score.gen.json (montaje) y score.gen.js (composición).
import { readFileSync, writeFileSync } from "node:fs";

const LINES = JSON.parse(readFileSync(new URL("./voice/lines.json", import.meta.url)));
const L = Object.fromEntries(LINES.map((l) => [l.scene, l]));
const R = (x) => +x.toFixed(3);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// gap = aire antes de la frase. b1 y b2 comparten escena (las laptops se encienden); el resto entra con cortinilla.
const DEF = [
  { id: "b1", gap: 0.3, scene: "s1" },
  { id: "b2", gap: 0.45, scene: "s1" },
  { id: "b3", gap: 0.8, scene: "s2" },
  { id: "b4", gap: 0.8, scene: "s3" },
  { id: "b5", gap: 0.8, scene: "s4" },
  { id: "b6", gap: 0.8, scene: "s5" },
];
const TAIL = 2.4;
const VOICE = {};
let t = 0;
const SCENES = [];
for (const d of DEF) {
  const prevEnd = t;
  VOICE[d.id] = R(t + d.gap);
  if (!SCENES.length || SCENES.at(-1).id !== d.scene) SCENES.push({ id: d.scene, t0: SCENES.length ? R(prevEnd + d.gap / 2) : 0 });
  t = VOICE[d.id] + L[d.id].dur;
}
const DURATION = R(t + TAIL);
SCENES.forEach((s, i) => (s.t1 = SCENES[i + 1] ? SCENES[i + 1].t0 : DURATION));

// n-ésima palabra que empieza con `which`
const W = (line, which, edge = "s", n = 1) => {
  const w = L[line].words.filter((x) => norm(x.w).startsWith(norm(which)))[n - 1];
  if (!w) throw new Error(`«${which}» no está en ${line}`);
  return R(VOICE[line] + (edge === "s" ? w.s : w.e));
};
const V = (id) => VOICE[id];
const SC = Object.fromEntries(SCENES.map((s) => [s.id, s]));

const T = {
  // s1 — reloj de arena lleno y cinco laptops apagadas; se encienden una por una
  "b1.cinco": W("b1", "cinco"), "b1.agente": W("b1", "agente"), "b1.tres": W("b1", "tres"), "b1.vivo": W("b1", "vivo", "s", 1),
  "b2.hack": W("b2", "micro"), "b2.ghosty": W("b2", "ghosty"), "b2.jueves": W("b2", "jueves"), "b2.siete": W("b2", "7"), "b2.noche": W("b2", "noche"),
  // s2 — micrófono VIVO y la sala del club
  "b3.sala": W("b3", "sala"), "b3.club": W("b3", "club"), "b3.semana": W("b3", "semana"), "b3.vivo": W("b3", "vivo"),
  // s3 — el muro: tarjetas que caen
  "b4.muro": W("b4", "muro"), "b4.cursos": W("b4", "cursos"), "b4.llamadas": W("b4", "llamadas"),
  // s4 — etiqueta de precio
  "b5.precio": W("b5", "99"), "b5.mes": W("b5", "mes"), "b5.estud": W("b5", "estudiante"), "b5.gratis": W("b5", "tres"),
  // s5 — cierre: reloj vacío, laptops encendidas, CTA
  "b6.club": W("b6", "club"), "b6.url": W("b6", "fixtergeek"), "b6.jueves": W("b6", "jueves"), "b6.siete": W("b6", "7"),
};
// las cinco laptops se encienden entre «micro-hackatón» y «noche»
const on0 = T["b2.hack"], on1 = T["b2.noche"];
T.laptops = [0, 1, 2, 3, 4].map((i) => R(on0 + (i * (on1 - on0)) / 4.4));
for (const k in T) if (typeof T[k] === "number") T[k] = R(T[k]);
T.words = LINES.map((l) => ({ line: l.scene, words: l.words.map((w) => ({ w: w.w, s: R(VOICE[l.scene] + w.s), e: R(VOICE[l.scene] + w.e) })) }));

// ---- efectos: uno por animación, al 0.7 o menos; nunca el mismo dos veces seguidas ----
const sfx = [];
const fx = (at, file, gain = 0.7, dur) => sfx.push({ t: R(Math.max(0, at)), file, gain, ...(dur ? { dur } : {}) });
const K = (k) => T[k];
// s1: arena que corre (tick suave al voltear la atención), las laptops (blip al encender), banner y fecha
fx(0.15, "8bit-blip", 0.4);
fx(K("b1.cinco"), "pop", 0.5); // las cinco laptops saltan en fila
fx(K("b1.tres") - 0.05, "tick", 0.45); // el reloj da un saltito
fx(K("b1.vivo"), "8bit-pickup", 0.35); // punto rojo «en vivo»
fx(K("b2.hack") - 0.1, "stamp", 0.6); // banner MICRO-HACKATÓN (back.out(1.8) en 0.36 s → golpe a 0.13)
T.laptops.forEach((at, i) => fx(at, i % 2 ? "8bit-coin" : "ding", 0.35));
fx(K("b2.jueves"), "card", 0.55); // tarjeta de fecha
fx(K("b2.siete"), "paper", 0.4);
// s2
fx(K("b3.sala") - 0.15, "whoosh-short", 0.35); fx(K("b3.sala") + 0.2, "land", 0.45); // las cámaras caen
fx(K("b3.club"), "pop", 0.5); // pastilla del club
fx(K("b3.semana"), "turn", 0.4); // el calendario pasa hoja
fx(K("b3.vivo"), "8bit-pickup", 0.4);
// s3: tres tarjetas que caen y se apilan
fx(K("b4.muro") - 0.05, "card", 0.55); fx(K("b4.cursos") - 0.05, "land", 0.5); fx(K("b4.llamadas") - 0.05, "block", 0.5);
fx(K("b4.llamadas") + 0.5, "tick", 0.35);
// s4: la etiqueta entra girando, se voltea a «gratis»
fx(K("b5.precio") - 0.2, "whoosh-fly", 0.4); fx(K("b5.precio") + 0.12, "8bit-coin", 0.45);
fx(K("b5.estud"), "bean", 0.45); // birrete
fx(K("b5.gratis") - 0.2, "turn", 0.4); fx(K("b5.gratis") + 0.15, "ding", 0.5);
// s5: CTA
fx(K("b6.club"), "card", 0.55); fx(K("b6.url"), "8bit-blip", 0.4); fx(K("b6.jueves"), "stamp", 0.55); fx(K("b6.siete") + 0.2, "pop", 0.45);
// cortinillas: barrido mientras cierran; el glifo entra en cuanto las rebanadas tapan (nunca un cuadro de puro color); golpe al sellar (back.out(1.8), 0.3 s → impacto a 1/2.8)
const CUTS = { s2: ["whoosh-fly", "hit-sub"], s3: ["riser", "hit-low"], s4: ["whoosh-fly", "hit-sub"], s5: ["riser", "hit-low"] };
T.seal = {};
for (const [id, [sw, hit]] of Object.entries(CUTS)) {
  const c = SC[id].t0, sealAt = R(c - 0.45);
  T.seal[id] = sealAt;
  const prevLine = DEF[DEF.findIndex((d) => d.scene === id) - 1].id;
  const prevEnd = Math.max(...T.words.find((l) => l.line === prevLine).words.map((w) => w.e));
  fx(Math.max(c - 0.52, prevEnd + 0.04), sw, 0.4, sw === "riser" ? 0.42 : undefined); fx(sealAt + 0.3 / 2.8, hit, 0.55);
}
sfx.sort((a, b) => a.t - b.t);
const ALT = { "whoosh-short": ["turn", "whoosh-fly"], "whoosh-fly": ["whoosh-short", "turn"], turn: ["whoosh-short", "whoosh-fly"], tick: ["8bit-blip", "pin"],
  pin: ["tick", "8bit-blip"], "8bit-blip": ["tick", "pin"], pop: ["bean", "8bit-pickup"], bean: ["pop", "8bit-pickup"], card: ["paper", "land"], paper: ["card", "land"],
  land: ["block", "card"], block: ["land", "card"], ding: ["8bit-coin", "8bit-pickup"], "8bit-coin": ["ding", "8bit-pickup"], "8bit-pickup": ["8bit-coin", "pop"],
  stamp: ["block", "land"], "hit-sub": ["hit-low"], "hit-low": ["hit-sub"], riser: ["whoosh-fly"] };
for (let i = 1; i < sfx.length; i++)
  if (sfx[i].file === sfx[i - 1].file) sfx[i].file = ALT[sfx[i].file].find((f) => f !== sfx[i - 1].file && f !== sfx[i + 1]?.file);
for (let i = 1; i < sfx.length; i++)
  if (sfx[i].file === sfx[i - 1].file) throw new Error(`efecto repetido seguido: ${sfx[i].file} en ${sfx[i].t}`);

const voice = LINES.map((l) => ({ t: VOICE[l.scene], file: l.file }));
const out = { duration: DURATION, scenes: SCENES, T, sfx, voice };
writeFileSync(new URL("./score.gen.json", import.meta.url), JSON.stringify(out, null, 1));
writeFileSync(new URL("./score.gen.js", import.meta.url), "window.SCORE = " + JSON.stringify(out) + ";\n");
console.log("duración", DURATION, SCENES.map((s) => `${s.id} ${s.t0}–${s.t1}`).join(" · "), `· ${sfx.length} efectos`);
