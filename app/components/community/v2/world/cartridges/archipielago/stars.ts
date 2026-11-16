// Archipiélago: las estrellas del modo de juego. Funciones puras (las importa el manifiesto, que
// también lee el servidor): nada de DOM aquí.
//
// Cada `STAR_EVERY` s sale una tanda nueva de estrellas. Su lugar depende sólo del número de tanda,
// así todos las ven en el mismo sitio sin pasar por el servidor. Quién se llevó cuál es local: cada
// quien junta las suyas y compite contra el récord del club (llaves `best` y `leader`).
import type { Place, Point } from "../../cartridge";

export const STAR_EVERY = 30;
export const STARS_PER_WAVE = 7;
/** Qué tan cerca hay que pasar para tomar una estrella (unidades del mapa). */
export const STAR_REACH = 34;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Las estrellas de una tanda: sobre el mar, nunca encima de una isla. */
export function starsOf(wave: number, size: { w: number; h: number }, places: Place[]): Point[] {
  const r = rng(wave * 7919 + 13), out: Point[] = [];
  for (let tries = 0; out.length < STARS_PER_WAVE && tries < 200; tries++) {
    const p = { x: 80 + r() * (size.w - 160), y: 80 + r() * (size.h - 160) };
    if (places.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r * 0.75 + 40)) continue;
    if (out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 140)) continue;
    out.push(p);
  }
  return out;
}

/** Estado local compartido entre el modo y la skin (mismo módulo en el navegador). */
export const starState = { now: 0, taken: new Set<string>() };
export const starKey = (wave: number, i: number) => `${wave}:${i}`;
