// Archipiélago: las estrellas del modo de juego. Funciones puras (las importa el manifiesto, que
// también lee el servidor): nada de DOM aquí.
//
// Cada `STAR_EVERY` s sale una tanda nueva de estrellas. Su lugar depende sólo del número de tanda,
// así todos las ven en el mismo sitio sin pasar por el servidor. Quién se llevó cuál es local: cada
// quien junta las suyas y compite contra el récord del club (llaves `best` y `leader`).
import type { Place, Point } from "../../cartridge";

export const STAR_EVERY = 30;
export const STARS_PER_WAVE = 12;
/** Qué tan cerca hay que pasar para tomar una estrella (unidades del mapa). */
export const STAR_REACH = 52;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Las estrellas de una tanda, como en el juego original: arcos de 6 estrellas separadas 68 unidades
 * que arrancan en una isla y se curvan un poco. Dos arcos por tanda, cada uno en un lugar distinto.
 */
export function starsOf(wave: number, size: { w: number; h: number }, places: Place[]): Point[] {
  const r = rng(wave * 7919 + 13), out: Point[] = [];
  const pool = places.filter((p) => p.target !== "table");
  if (!pool.length) return out;
  const first = Math.floor(r() * pool.length);
  for (let k = 0; k < 2; k++) {
    const p = pool[(first + k * Math.max(1, Math.floor(pool.length / 2))) % pool.length];
    let a = r() * Math.PI * 2; const curve = (r() - 0.5) * 0.3;
    let x = p.x + Math.cos(a + Math.PI) * p.r * 0.45, y = p.y + Math.sin(a + Math.PI) * p.r * 0.45;
    for (let i = 0; i < STARS_PER_WAVE / 2; i++) {
      out.push({ x: Math.min(size.w - 30, Math.max(30, x)), y: Math.min(size.h - 30, Math.max(30, y)) });
      x += Math.cos(a) * 68; y += Math.sin(a) * 68; a += curve;
    }
  }
  return out;
}

// ── Interacciones entre personas ──

/** Carrera: aros en orden; el 0 es salida y meta. Contra reloj, con récord del club. */
export const RINGS: Point[] = [
  { x: 1150, y: 640 }, { x: 640, y: 560 }, { x: 300, y: 580 }, { x: 620, y: 160 },
  { x: 1180, y: 120 }, { x: 1700, y: 520 }, { x: 1180, y: 1000 },
];
export const RING_R = 70;
/** Una vuelta que tarda más que esto se cancela sola. */
export const RACE_MAX = 180;
/** Estrella de dos: sólo se abre si otra persona está a esta distancia de ti dentro de ella. */
export const BIG_SPOTS: Point[] = [{ x: 640, y: 720 }, { x: 1230, y: 520 }, { x: 520, y: 430 }, { x: 1300, y: 440 }, { x: 1050, y: 1020 }];
export const BIG_R = 70, BIG_PAIR = 90;
/** «Las traes»: la estrella dorada aparece aquí cuando nadie la trae; se pasa tocando a alguien. */
export const GOLDEN: Point = { x: 700, y: 760 };
export const TAG_REACH = 60, TAG_COOLDOWN = 3;
/** Choca esas cinco: un saludo entre dos que están a menos de esto suelta una lluvia de estrellas. */
export const HIGH_FIVE = 180;

/** Estado del cartucho por montaje (`createState`): lo comparten el modo y la skin y muere con el montaje. */
export type StarState = {
  now: number;
  taken: Set<string>;
  /** Tu vuelta: siguiente aro (0 = meta) y cuándo arrancó (null = sin vuelta). */
  race: { next: number; startedAt: number | null };
  /** Quién trae la estrella dorada (id de miembro) o nadie. */
  it: string | null;
  /** Estrella de dos de la tanda. */
  big: { x: number; y: number; taken: boolean } | null;
  /** Lluvias de estrellas pendientes de pintar (choca esas cinco). */
  showers: Point[];
};
export const createStarState = (): StarState => ({ now: 0, taken: new Set(), race: { next: 0, startedAt: null }, it: null, big: null, showers: [] });
export const starKey = (wave: number, i: number) => `${wave}:${i}`;
