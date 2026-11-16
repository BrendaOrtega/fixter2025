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

/** El mapa creció ×1.6 (16-nov): las coordenadas se escriben en la escala vieja y se multiplican. */
export const MAP_K = 1.6;
export const at = (x: number, y: number): Point => ({ x: Math.round(x * MAP_K), y: Math.round(y * MAP_K) });

/**
 * Carrera: el aro 0 es salida y meta y es el único visible cuando no hay carrera. Quien entra en él la
 * convoca (`raceAt` compartido = cuándo arranca); corren los que estén en la salida al llegar a cero.
 * Los demás aros sólo existen mientras dura la carrera.
 */
export const RINGS: Point[] = [
  at(1150, 640), at(640, 560), at(300, 580), at(620, 160),
  at(1180, 120), at(1700, 520), at(1650, 1030),
];
export const RING_R = 80, START_R = 130;
export const RACE_COUNTDOWN = 10, RACE_WINDOW = 150;
/** Estrella de dos: sólo se abre si otra persona está a esta distancia de ti dentro de ella. */
export const BIG_SPOTS: Point[] = [at(640, 720), at(1230, 520), at(520, 430), at(1300, 440), at(760, 700)];
export const BIG_R = 70, BIG_PAIR = 90;
/** «Las traes»: la estrella dorada aparece aquí cuando nadie la trae; se pasa tocando a alguien. */
export const GOLDEN: Point = at(700, 760);
export const TAG_REACH = 60, TAG_COOLDOWN = 3;
/** Vuelo en formación: alguien a esta distancia, rumbo parecido y los dos volando rápido. */
export const FORMATION_REACH = 150, FORMATION_ANGLE = 0.6, FORMATION_SPEED = 110, FORMATION_HOLD = 2, FORMATION_EVERY = 4;
/** Choca esas cinco: un saludo entre dos que están a menos de esto suelta una lluvia de estrellas. */
export const HIGH_FIVE = 180;

/** Estado del cartucho por montaje (`createState`): lo comparten el modo y la skin y muere con el montaje. */
export type StarState = {
  now: number;
  taken: Set<string>;
  /** Tu vuelta: siguiente aro (0 = meta, -1 = no corres o ya llegaste) y cuándo arrancó. */
  race: { next: number; startedAt: number | null };
  /** Cuándo arranca (o arrancó) la carrera convocada; 0 si no hay. */
  raceAt: number;
  /** Quién trae la estrella dorada (id de miembro) o nadie. */
  it: string | null;
  /** Estrella de dos de la tanda. */
  big: { x: number; y: number; taken: boolean } | null;
  /** Lluvias de estrellas pendientes de pintar (choca esas cinco). */
  showers: Point[];
  /** Quiénes vuelan en formación contigo (ids, incluyéndote); vacío si no.*/
  formation: string[];
};
export const createStarState = (): StarState => ({ now: 0, taken: new Set(), race: { next: -1, startedAt: null }, raceAt: 0, it: null, big: null, showers: [], formation: [] });
export const starKey = (wave: number, i: number) => `${wave}:${i}`;
