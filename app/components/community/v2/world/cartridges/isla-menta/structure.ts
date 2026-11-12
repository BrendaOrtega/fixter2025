// Cartucho «Isla Menta» — ESTRUCTURA: datos puros y reglas del terreno. Aquí no se importa three ni
// se toca el DOM, así el registro de cartuchos puede leer este archivo sin cargar el renderizador.
//
// Coordenadas: el mismo plano de 1600×1000 que usa el motor (x a la derecha, y hacia abajo). El
// renderizador lo convierte a 3D con `UNIT` (x → X, y → Z).

export const WORLD_ID = "isla-menta";
export const WORLD_NAME = "Isla Menta";
/** Otros nombres propuestos, por si bliss prefiere alguno. */
export const WORLD_NAME_IDEAS = ["Isla Menta", "Cayo Geek", "Puerto Bit"] as const;
export const WORLD_W = 1600;
export const WORLD_H = 1000;
/** Unidades de three por pixel del mapa. */
export const UNIT = 1 / 40;

import type { BotDef, Place, Point, TableDef, WorldStructure } from "../../cartridge";
import { BOT_STOPS, FIRE, FIRE_ANGLES, MOOR, SPOTS, TENT_SPOTS, THINGS, fireRing } from "./things";

type Vec = Point;

/** Tonos de muñequito: los seis de la casa (mismos ids que `SHIP_COLORS` de GeekSector) y cuatro más de la isla. */
export const TONES = [
  { id: "mint", name: "Menta", fill: "#85DDCB", dark: "#357265" },
  { id: "green", name: "Verde", fill: "#8DCF6E", dark: "#4C7A39" },
  { id: "amber", name: "Ámbar", fill: "#F2C98A", dark: "#8A6A34" },
  { id: "lilac", name: "Lila", fill: "#BDB5F7", dark: "#5E57A0" },
  { id: "blue", name: "Azul", fill: "#9CC8F2", dark: "#4A719A" },
  { id: "pink", name: "Rosa", fill: "#F4AFAF", dark: "#9A5656" },
  { id: "aqua", name: "Turquesa", fill: "#7FD3E0", dark: "#3A7C87" },
  { id: "peach", name: "Durazno", fill: "#F6B58E", dark: "#9A6240" },
  { id: "lemon", name: "Limón", fill: "#E6E07E", dark: "#807C36" },
  { id: "cloud", name: "Nube", fill: "#D5DCDE", dark: "#66737A" },
] as const;
export type ToneId = (typeof TONES)[number]["id"];
export const toneOf = (id: string) => TONES.find((c) => c.id === id) ?? TONES[0];

/** Formas de muñequito: hacen el papel de los modelos de nave de GeekSector (mismo orden). */
export const SHAPES = [
  { id: "gorro", name: "Gorro", ship: "rocket" },
  { id: "sombrero", name: "Sombrero", ship: "saucer" },
  { id: "orejas", name: "Orejitas", ship: "pod" },
  { id: "explorador", name: "Explorador", ship: "dart" },
] as const;
export type ShapeId = (typeof SHAPES)[number]["id"] | "robot";
/** Traduce el modelo de nave que guarda el servidor a una forma de muñequito. */
export function shapeFor(ship: string): ShapeId {
  if (ship === "robot") return "robot";
  return (SHAPES.find((s) => s.ship === ship || s.id === ship) ?? SHAPES[0]).id;
}

// ───────── Lugares ─────────
/** Lo que la isla agrega a cada lugar del contrato: dónde va su edificio y cuánto estorba. */
export type Building = {
  /** Cómo se llama el edificio en la isla. */
  landmark: string;
  /** Dónde va el edificio (las mesas van en el mismo punto de la placita). */
  bx: number; by: number;
  /** Radio que ocupa: no se camina por ahí. */
  solid: number;
};

const SEAT_R = 50;
/** Lugar del asiento `k` (0–3) de una mesa. */
export function seatPos(table: Point, k: number): Point {
  const a = -Math.PI * 0.75 + (k * Math.PI) / 2;
  return { x: table.x + Math.cos(a) * SEAT_R, y: table.y + Math.sin(a) * SEAT_R };
}
const TABLE_SPOTS = [
  { x: 290, y: 790, topic: "Busco equipo", tone: "mint" },
  { x: 470, y: 655, topic: "Estoy atorado", tone: "amber" },
  { x: 650, y: 790, topic: "Muestra y cuenta", tone: "pink" },
] as const;
/** Tono del banderín de cada mesa. */
export const TABLE_TONES: ToneId[] = TABLE_SPOTS.map((t) => t.tone);
export const TABLES: TableDef[] = TABLE_SPOTS.map((t) => ({ x: t.x, y: t.y, topic: t.topic, seats: [0, 1, 2, 3].map((k) => seatPos(t, k)) }));
export const CAMPFIRE: Point = FIRE;
/** Casitas de campaña del Campamento (no se atraviesan; en su puerta se descansa). */
export const TENTS: Array<Point & { tone: ToneId; rot: number }> = TENT_SPOTS.map((t) => ({ ...t }));

// El centro de cada lugar es su placita: ahí llega el muñequito y desde ahí se mide la cercanía.
export const PLACES: Place[] = [
  { id: "live", target: "call", kind: "forum", x: 800, y: 520, r: 120, name: "Sala en vivo", short: "Sala en vivo", table: null },
  { id: "wall", target: "wall", kind: "mural", x: 310, y: 345, r: 105, name: "Muro", short: "Muro", table: null },
  { id: "recs", target: "recs", kind: "cinema", x: 1290, y: 335, r: 105, name: "Grabaciones", short: "Grabaciones", table: null },
  { id: "courses", target: "courses", kind: "school", x: 1270, y: 775, r: 105, name: "Cursos", short: "Cursos", table: null },
  ...TABLES.map((t, i): Place => ({ id: `t${i}`, target: "table", kind: "camp-table", x: t.x, y: t.y, r: 92, name: `Mesa «${t.topic}»`, short: t.topic, table: i })),
];
export const BUILDINGS: Record<string, Building> = {
  // El Foro es un auditorio al aire libre: aquí va el escenario; las gradas son una cosa (`STANDS`).
  live: { landmark: "El Foro", bx: 800, by: 330, solid: 46 },
  wall: { landmark: "El Mural", bx: 310, by: 258, solid: 62 },
  recs: { landmark: "El Cine", bx: 1290, by: 240, solid: 62 },
  courses: { landmark: "La Escuelita", bx: 1270, by: 680, solid: 62 },
  ...Object.fromEntries(TABLES.map((t, i) => [`t${i}`, { landmark: "El Campamento", bx: t.x, by: t.y, solid: 30 }])),
};
/** Donde aparece quien llega: abajo del Foro. */
export const SPAWN: Point = { x: 800, y: 610 };

// ───────── Caminos ─────────
/** Cada camino es una línea quebrada; el renderizador la suaviza y la pinta sobre el terreno. */
export const PATHS: Vec[][] = [
  [{ x: 800, y: 520 }, { x: 660, y: 470 }, { x: 520, y: 420 }, { x: 400, y: 380 }, { x: 310, y: 345 }],
  [{ x: 800, y: 520 }, { x: 940, y: 470 }, { x: 1080, y: 400 }, { x: 1200, y: 360 }, { x: 1290, y: 335 }],
  [{ x: 800, y: 520 }, { x: 930, y: 590 }, { x: 1060, y: 680 }, { x: 1170, y: 745 }, { x: 1270, y: 775 }],
  [{ x: 800, y: 520 }, { x: 720, y: 620 }, { x: 610, y: 700 }, { x: 530, y: 760 }, { x: 470, y: 800 }],
  [{ x: 1290, y: 335 }, { x: 1345, y: 440 }, { x: 1356, y: 560 }, { x: 1352, y: 690 }, { x: 1270, y: 775 }],
  [{ x: 470, y: 800 }, { x: 380, y: 800 }, { x: 290, y: 790 }],
  [{ x: 470, y: 800 }, { x: 470, y: 655 }],
  [{ x: 470, y: 800 }, { x: 560, y: 800 }, { x: 650, y: 790 }],
  [{ x: 800, y: 520 }, { x: 800, y: 700 }, { x: 800, y: 800 }],
];
/** Muelle al sur del Foro (adorno; el último camino llega a él). */
export const DOCK: Vec = { x: 800, y: 842 };

function smoothPath(points: Vec[], step = 10): Vec[] {
  // Catmull-Rom centrípeta simplificada: suficiente para caminos suaves sin dependencias.
  const out: Vec[] = [];
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
/** Caminos ya suavizados (un punto cada ~10 px). */
export const PATH_SAMPLES: Vec[][] = PATHS.map((p) => smoothPath(p));
const ALL_PATH_POINTS: Vec[] = PATH_SAMPLES.flat();
/** Distancia (px) al camino más cercano. */
export function pathDistance(x: number, y: number) {
  let best = Infinity;
  for (const p of ALL_PATH_POINTS) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// ───────── Forma de la isla ─────────
// Suma de manchas gaussianas: una por lugar y otras que las unen. Donde la suma pasa de `SHORE` hay
// tierra; la misma función da la altura, así costa, playa y pasto salen de un solo dato.
const BLOBS: Array<[number, number, number, number, number]> = [
  [800, 470, 300, 235, 1.1],
  [310, 300, 215, 175, 1],
  [1290, 285, 215, 175, 1],
  [1275, 725, 215, 175, 1],
  [470, 765, 315, 180, 1.05],
  [550, 410, 170, 130, 0.9],
  [1050, 385, 170, 130, 0.9],
  [1050, 650, 170, 130, 0.9],
  [640, 650, 170, 130, 0.9],
  [1335, 505, 140, 150, 0.85],
  [800, 760, 95, 110, 0.75],
];
export function landField(x: number, y: number) {
  let f = 0;
  for (const [bx, by, rx, ry, w] of BLOBS) {
    const dx = (x - bx) / rx, dy = (y - by) / ry;
    f += w * Math.exp(-(dx * dx + dy * dy));
  }
  return f;
}
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Nivel del campo a partir del cual se puede caminar (playa alta en adelante). */
export const WALK_LEVEL = 0.58;
/** Altura del terreno en unidades de three (el agua está en 0). */
export function heightAt(x: number, y: number) {
  const f = landField(x, y);
  // Bajo el agua el fondo sigue cayendo, así la orilla del agua bajita sale curva y no en escalones.
  let h = -0.55 + smooth(0.36, 0.62, f) * 0.85 - Math.max(0, 0.36 - f) * 1.6;
  // Lomas suaves tierra adentro; se aplanan cerca de caminos y placitas para que no se vean chuecos.
  const inner = smooth(0.75, 1.15, f);
  if (inner > 0) {
    const hill = 0.5 + 0.5 * Math.sin(x * 0.0125 + 1.3) * Math.cos(y * 0.0145 - 0.4);
    let flat = smooth(30, 110, pathDistance(x, y));
    // Las placitas quedan planas completas (ahí se pinta el aro de «estás aquí»).
    for (const p of PLACES) flat = Math.min(flat, smooth(0, 70, Math.hypot(p.x - x, p.y - y) - p.r));
    // Y el piso de las cosas (pista de baile, puesto de café…) también.
    for (const q of THINGS) if (q.clear) flat = Math.min(flat, smooth(0, 50, Math.hypot(q.x - x, q.y - y) - q.clear * 0.7));
    h += inner * hill * 0.42 * flat;
  }
  return h;
}

// ───────── Rutas viejas de los robots ─────────
// Ya no se usan para pasear (ver «Robots de la casa» abajo); sólo marcan por dónde no se siembran
// árboles, para que la isla quede idéntica a la de antes.
function along(points: Vec[], u: number): Vec {
  // u en 0..1 sobre la línea ya suavizada
  const f = Math.max(0, Math.min(0.9999, u)) * (points.length - 1), i = Math.floor(f), t = f - i;
  return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
}
const EAST_WALK = [...PATH_SAMPLES[1], ...PATH_SAMPLES[4].slice(1)];
const botLook = (color: ToneId) => ({ model: "robot", color, pilot: "robot" });
const mod = (v: number, m: number) => ((v % m) + m) % m;
// Cada robot se detiene un rato, cada vuelta, sobre un punto de `things.ts` (echa porras, toma café, se
// calienta): quieto sobre el punto, se dibuja con esa pose igual que cualquier persona.
const UNO = { rate: 0.16, pause: 14 }, TRES = { rate: 0.3, pause: 12, laps: 2 }, DOS = { leg: 1 / 0.017, pause: 15 };
const DOS_STOP = Math.max(0, EAST_WALK.findIndex((p) => Math.hypot(p.x - BOT_STOPS.dos.x, p.y - BOT_STOPS.dos.y) < 0.5)) / (EAST_WALK.length - 1);
const OLD_TRACKS: Array<{ at: (t: number) => Vec }> = [
  { at: (t) => {
      const p = mod(t, (Math.PI * 2) / UNO.rate + UNO.pause), a = Math.PI / 2 + Math.max(0, p - UNO.pause) * UNO.rate;
      return { x: 800 + Math.cos(a) * 172, y: 425 + Math.sin(a) * 128 };
    } },
  { at: (t) => {
      const p = mod(t, DOS.leg * 2 + DOS.pause), t0 = DOS_STOP * DOS.leg;
      const u = p < t0 ? p / DOS.leg : p < t0 + DOS.pause ? DOS_STOP : p < DOS.leg + DOS.pause ? (p - DOS.pause) / DOS.leg : 1 - (p - DOS.pause - DOS.leg) / DOS.leg;
      return along(EAST_WALK, u);
    } },
  { at: (t) => {
      const p = mod(t, ((Math.PI * 2) / TRES.rate) * TRES.laps + TRES.pause);
      return fireRing(FIRE_ANGLES[0] - Math.max(0, p - TRES.pause) * TRES.rate);
    } },
];

// ───────── Adornos (árboles, arbustos, piedras) ─────────
export function seeded(seed: number) {
  // mulberry32: la isla sale igual en cada carga y para todas las personas
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Prop = { kind: "tree" | "pine" | "bush" | "rock" | "flower"; x: number; y: number; s: number; rot: number; tone: number };
/** Por dónde pasan los robots: ahí no se siembra nada. */
const BOT_TRACKS: Vec[] = OLD_TRACKS.flatMap((b) => Array.from({ length: 400 }, (_, i) => b.at(i * 0.45)));
function scatter(): Prop[] {
  const rnd = seeded(20261112);
  const props: Prop[] = [];
  const clear = (x: number, y: number, gap: number) => {
    if (pathDistance(x, y) < gap) return false;
    for (const p of PLACES) {
      const b = BUILDINGS[p.id];
      if (Math.hypot(b.bx - x, b.by - y) < b.solid + gap + 16) return false;
      if (Math.hypot(p.x - x, p.y - y) < (p.table !== null ? 92 : 78)) return false;
    }
    if (Math.hypot(CAMPFIRE.x - x, CAMPFIRE.y - y) < 80) return false;
    for (const q of THINGS) if (q.clear && Math.hypot(q.x - x, q.y - y) < q.clear) return false;
    for (const q of SPOTS) if (Math.hypot(q.x - x, q.y - y) < 30) return false;
    for (const q of BOT_TRACKS) if (Math.hypot(q.x - x, q.y - y) < gap) return false;
    for (const q of props) if (Math.hypot(q.x - x, q.y - y) < (q.kind === "flower" ? 14 : 36)) return false;
    return true;
  };
  let guard = 0;
  while (props.length < 210 && guard++ < 12000) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H, f = landField(x, y);
    // Bosquecitos: los árboles prefieren ciertas zonas (ruido barato) para no quedar parejos.
    const grove = Math.sin(x * 0.011 + 0.6) * Math.sin(y * 0.014 + 1.9);
    const roll = rnd();
    if (f > 0.72 && grove > -0.3 && roll < 0.62 && clear(x, y, 54)) {
      props.push({ kind: rnd() < 0.42 ? "pine" : "tree", x, y, s: 0.8 + rnd() * 0.55, rot: rnd() * 6.28, tone: Math.floor(rnd() * 3) });
    } else if (f > 0.66 && roll < 0.7 && clear(x, y, 34)) {
      props.push({ kind: "bush", x, y, s: 0.7 + rnd() * 0.6, rot: rnd() * 6.28, tone: Math.floor(rnd() * 3) });
    } else if (f > 0.47 && f < 0.64 && roll < 0.82 && clear(x, y, 30)) {
      props.push({ kind: "rock", x, y, s: 0.6 + rnd() * 0.9, rot: rnd() * 6.28, tone: Math.floor(rnd() * 2) });
    } else if (f > 0.7 && clear(x, y, 22)) {
      props.push({ kind: "flower", x, y, s: 0.8 + rnd() * 0.5, rot: rnd() * 6.28, tone: Math.floor(rnd() * 4) });
    }
  }
  return props;
}
export const PROPS: Prop[] = scatter();

// ───────── Por dónde se camina ─────────
let grid: Uint8Array | null = null;
type Solid = { x: number; y: number; r: number; place?: string };
const ALL_SOLIDS: Solid[] = [
  ...Object.entries(BUILDINGS).map(([place, b]) => ({ x: b.bx, y: b.by, r: b.solid, place })),
  ...THINGS.filter((t) => t.solid > 0).map((t) => ({ x: t.x, y: t.y, r: t.solid })),
  ...PROPS.filter((p) => p.kind === "tree" || p.kind === "pine").map((p) => ({ x: p.x, y: p.y, r: 13 })),
  ...PROPS.filter((p) => p.kind === "rock").map((p) => ({ x: p.x, y: p.y, r: 10 * p.s })),
];
// Un lugar que hoy no existe (sin grabaciones no hay Cine) tampoco estorba: su hueco se puede pisar.
// El motor avisa cuáles están ocultos al llamar a `constrain` y `route`; aquí se recuerda el último aviso.
let SOLIDS = ALL_SOLIDS, hiddenKey = "";
function useHidden(hidden?: ReadonlySet<string>) {
  const key = hidden ? [...hidden].sort().join(",") : "";
  if (key === hiddenKey) return;
  hiddenKey = key;
  SOLIDS = ALL_SOLIDS.filter((s) => !s.place || !hidden?.has(s.place));
  grid = null; // la rejilla de rutas se vuelve a calcular con lo que quedó
}
/** Se camina sobre tierra firme y fuera de edificios, mesas, árboles y piedras. */
export function walkable(x: number, y: number) {
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) return false;
  if (landField(x, y) < WALK_LEVEL) return false;
  for (const s of SOLIDS) {
    const dx = s.x - x, dy = s.y - y;
    if (dx * dx + dy * dy < s.r * s.r) return false;
  }
  return true;
}
/** El muelle también se pisa aunque esté sobre el agua. */
function onDock(x: number, y: number) { return Math.abs(x - DOCK.x) < 24 && y > DOCK.y - 60 && y < DOCK.y + 44; }
export const canStand = (x: number, y: number) => walkable(x, y) || onDock(x, y);
/** Altura a la que se para alguien en (x, y): el terreno, o las tablas del muelle. */
export const standHeight = (x: number, y: number) => (onDock(x, y) ? Math.max(0.2, heightAt(x, y)) : heightAt(x, y));

// ───────── El barquito ─────────
// Un solo barquito, compartido. Quien está en el agua va a bordo: la regla sale de la posición, así
// que todos los clientes lo ven igual sin campos nuevos en el protocolo. Se sube sólo desde el
// muelle y mientras el barquito está amarrado; maneja uno y los demás van sentados con él.
/** Piedras del farito: el barquito las rodea. */
const SEA_SOLIDS = [{ x: 1010, y: 905, r: 34 }];
const BOARD_REACH = 46;
/** Punto del muelle desde el que se da el paso al barquito. */
const BOARD_FROM: Vec = { x: MOOR.x, y: 880 };
export const nearMoor = (x: number, y: number) => Math.hypot(x - MOOR.x, y - MOOR.y) < BOARD_REACH;
/** Hasta aquí llega el casco: el agua bajita de la playa no se navega (el barquito no se sube a la arena). */
const SEA_LEVEL = 0.42;
/** Agua navegable: dentro del mapa, con fondo, fuera del muelle y de las piedras del faro. Junto al amarre siempre hay paso. */
export function isSea(x: number, y: number) {
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H || onDock(x, y)) return false;
  const f = landField(x, y);
  if (f >= WALK_LEVEL || (f >= SEA_LEVEL && !nearMoor(x, y))) return false;
  for (const s of SEA_SOLIDS) if ((s.x - x) * (s.x - x) + (s.y - y) * (s.y - y) < s.r * s.r) return false;
  return true;
}
/** Personas y robots de pie en este cuadro (lo escribe el renderizador): tu personaje no los atraviesa. */
export const crowd: Vec[] = [];
const BODY = 24;
/** Quien estorba el paso de `from` a (x, y): alguien a menos de un cuerpo y al que te estarías acercando. */
function inTheWay(from: Vec, x: number, y: number): Vec | null {
  for (const o of crowd) {
    const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
    if (d < BODY * BODY && d < (o.x - from.x) * (o.x - from.x) + (o.y - from.y) * (o.y - from.y)) return o;
  }
  return null;
}
/**
 * Lo que el renderizador sabe del barquito en este cuadro (lo escribe él, lo leen `constrain` y
 * `route`): tu papel, dónde va quien maneja y si todavía se puede subir alguien.
 */
export const sea = { role: "ashore" as "ashore" | "captain" | "passenger", x: MOOR.x, y: MOOR.y, boardable: true };

/** Tierra firme cercana en la dirección en que se mueve quien va a bordo (para bajarse). */
function hop(from: Vec, to: Vec, reach: number): Vec | null {
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy);
  if (d < 0.3) return null;
  for (let r = 8; r <= reach; r += 8) {
    const x = from.x + (dx / d) * r, y = from.y + (dy / d) * r;
    if (canStand(x, y)) return { x, y };
  }
  return null;
}
/**
 * Avanza de `from` hacia `to` sin atravesar cosas: si choca, resbala por un eje. En tierra no se
 * pisa el agua; al agua se entra por el barquito amarrado y de ahí se navega libre hasta cualquier orilla.
 */
export function slide(from: Vec, to: Vec, self = false): Vec {
  const afloat = isSea(from.x, from.y);
  if (self && afloat && sea.role === "passenger") {
    // De pasajero vas con el barquito. Para bajarte, camina hacia una orilla que esté cerca.
    return hop(from, to, 110) ?? { x: sea.x, y: sea.y };
  }
  const ground = (x: number, y: number) =>
    canStand(x, y) || (isSea(x, y) && (afloat || (nearMoor(x, y) && (!self || sea.boardable))));
  // Los cuerpos chocan: tu personaje no atraviesa a nadie. Si alguien estorba, lo rodea por el lado que más avanza.
  const open = (x: number, y: number) => ground(x, y) && !(self && !afloat && inTheWay(from, x, y));
  if (open(to.x, to.y)) return to;
  const body = self && !afloat && ground(to.x, to.y) ? inTheWay(from, to.x, to.y) : null;
  if (body) {
    const step = Math.hypot(to.x - from.x, to.y - from.y), ox = from.x - body.x, oy = from.y - body.y, d = Math.hypot(ox, oy) || 1;
    for (const s of (to.x - from.x) * (-oy) + (to.y - from.y) * ox >= 0 ? [1, -1] : [-1, 1]) {
      const x = from.x + ((-oy * s) / d) * step, y = from.y + ((ox * s) / d) * step;
      if (open(x, y)) return { x, y };
    }
    return from;
  }
  // Quien maneja y topa con la playa se baja de un brinco a la arena.
  if (afloat) { const land = hop(from, to, 80); if (land) return land; }
  // Quien llega parado donde no se puede (p. ej. venía de otro mundo) sale a la orilla más cercana.
  if (!afloat && !canStand(from.x, from.y)) return nearestWalkable(from.x, from.y, 900) ?? to;
  if (open(to.x, from.y)) return { x: to.x, y: from.y };
  if (open(from.x, to.y)) return { x: from.x, y: to.y };
  return from;
}
/** Ruta de tu personaje: caminando, navegando, o caminando al muelle para subirse al barquito. */
function plan(from: Vec, to: Vec): Vec[] {
  if (isSea(from.x, from.y)) {
    if (sea.role === "passenger") { const off = nearestWalkable(to.x, to.y, 40); return off ? [off] : []; }
    if (isSea(to.x, to.y)) return [to];
    const goal = nearestWalkable(to.x, to.y);
    if (!goal) return [];
    // Navega derecho hasta la playa, brinca a la arena y de ahí camina.
    const n = Math.ceil(Math.hypot(goal.x - from.x, goal.y - from.y) / 8);
    for (let i = 1; i <= n; i++) {
      const p = { x: from.x + ((goal.x - from.x) * i) / n, y: from.y + ((goal.y - from.y) * i) / n };
      if (canStand(p.x, p.y)) return [p, ...findPath(p, goal).filter((w) => w.x !== p.x || w.y !== p.y)];
      if (!isSea(p.x, p.y) && !canStand(p.x, p.y) && landField(p.x, p.y) >= WALK_LEVEL) break; // un árbol o una piedra en la orilla
    }
    return [goal];
  }
  const toBoat = nearMoor(to.x, to.y) && isSea(to.x, to.y);
  if (sea.boardable && (toBoat || (isSea(to.x, to.y) && !nearestWalkable(to.x, to.y, 50)))) {
    const walk = findPath(from, BOARD_FROM);
    if (walk.length) return toBoat ? [...walk, to] : [...walk, MOOR, to];
  }
  return findPath(from, to);
}
function lineClear(a: Vec, b: Vec, stand = canStand) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!stand(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

// Rejilla para buscar ruta (celdas de 20 px). Se calcula una vez, la primera vez que hace falta.
const CELL = 20, GW = Math.ceil(WORLD_W / CELL), GH = Math.ceil(WORLD_H / CELL);
function buildGrid(stand: (x: number, y: number) => boolean) {
  const g = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) g[j * GW + i] = stand((i + 0.5) * CELL, (j + 0.5) * CELL) ? 1 : 0;
  return g;
}
function getGrid() { return (grid ??= buildGrid(canStand)); }
/** Dónde se camina y su rejilla. Tu personaje usa lo de hoy (sin los lugares ocultos); los robots, lo fijo. */
type Surface = { stand: (x: number, y: number) => boolean; grid: () => Uint8Array };
const LIVE: Surface = { stand: (x, y) => canStand(x, y), grid: getGrid };
// Los robots siempre cuentan todos los sólidos: así su ruta sale igual en todas las pantallas.
function standFixed(x: number, y: number) {
  if (onDock(x, y)) return true;
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H || landField(x, y) < WALK_LEVEL) return false;
  for (const s of ALL_SOLIDS) { const dx = s.x - x, dy = s.y - y; if (dx * dx + dy * dy < s.r * s.r) return false; }
  return true;
}
let fixedGrid: Uint8Array | null = null;
const FIXED: Surface = { stand: standFixed, grid: () => (fixedGrid ??= buildGrid(standFixed)) };
/** El punto pisable más cercano a (x, y), o `null` si no hay ninguno a menos de `reach` px. */
export function nearestWalkable(x: number, y: number, reach = 160, stand = canStand): Vec | null {
  if (stand(x, y)) return { x, y };
  for (let r = 8; r <= reach; r += 8) {
    const n = Math.max(8, Math.round(r / 4));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (stand(px, py)) return { x: px, y: py };
    }
  }
  return null;
}
/**
 * Ruta caminable de `from` a `to` (lista de puntos, sin incluir `from`). Búsqueda en anchura sobre la
 * rejilla y luego se quitan los puntos que sobran. Si no hay ruta regresa `[]`.
 */
export function findPath(from: Vec, to: Vec, surf: Surface = LIVE): Vec[] {
  const stand = surf.stand;
  const goal = nearestWalkable(to.x, to.y, 160, stand);
  if (!goal) return [];
  if (!stand(from.x, from.y)) { const shore = nearestWalkable(from.x, from.y, 900, stand); return shore ? [shore, ...findPath(shore, goal, surf)] : []; }
  if (lineClear(from, goal, stand)) return [goal];
  const g = surf.grid();
  const cellOf = (p: Vec) => {
    const i = Math.max(0, Math.min(GW - 1, Math.floor(p.x / CELL))), j = Math.max(0, Math.min(GH - 1, Math.floor(p.y / CELL)));
    if (g[j * GW + i]) return j * GW + i;
    for (let r = 1; r < 5; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < GW && jj < GH && g[jj * GW + ii]) return jj * GW + ii;
    }
    return -1;
  };
  const start = cellOf(from), end = cellOf(goal);
  if (start < 0 || end < 0) return [];
  const prev = new Int32Array(GW * GH).fill(-1);
  const queue = new Int32Array(GW * GH);
  let head = 0, tail = 0;
  queue[tail++] = start; prev[start] = start;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (head < tail && prev[end] < 0) {
    const c = queue[head++], ci = c % GW, cj = (c - ci) / GW;
    for (const [di, dj] of DIRS) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const n = nj * GW + ni;
      if (prev[n] >= 0 || !g[n]) continue;
      // En diagonal no se corta la esquina de una celda cerrada.
      if (di && dj && (!g[cj * GW + ni] || !g[nj * GW + ci])) continue;
      prev[n] = c; queue[tail++] = n;
    }
  }
  if (prev[end] < 0) return [];
  const cells: Vec[] = [];
  for (let c = end; c !== start; c = prev[c]) cells.push({ x: ((c % GW) + 0.5) * CELL, y: (Math.floor(c / GW) + 0.5) * CELL });
  cells.reverse();
  cells.push(goal);
  // Quita puntos intermedios mientras haya línea libre.
  const out: Vec[] = [];
  let anchor = from, i = 0;
  while (i < cells.length) {
    let far = i;
    for (let k = cells.length - 1; k > i; k--) if (lineClear(anchor, cells[k], stand)) { far = k; break; }
    out.push(cells[far]); anchor = cells[far]; i = far + 1;
  }
  return out;
}

// ───────── Robots de la casa (y Ghosty) ─────────
// Hacen de todo, despacio y al azar: cada SLOT segundos cada uno elige una cosa de la isla (banca, fogata,
// café, telescopio…), camina hasta su punto y se queda ahí con su pose. El «azar» sale del reloj, así
// que todas las pantallas los ven en el mismo lugar sin pasar por el servidor. No son miembros y no
// cuentan en «N en el club». Salen con LEAVE s de diferencia para no moverse todos a la vez.
const SLOT = 75, LEAVE = 8, SPEED = 22, REST = 14;
const BOT_THINGS = THINGS.filter((t) => t.id !== "boat" && t.id !== "pillows");
const mix = (n: number) => {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
};
/** Qué punto le toca al robot `i` en el turno `n`. En un mismo turno cada robot va a una cosa distinta. */
function botSpot(n: number, i: number): Vec {
  const thing = BOT_THINGS[(mix(n) + i) % BOT_THINGS.length];
  const action = thing.actions[mix(n * 31 + i) % thing.actions.length];
  const s = action.spots[mix(n * 17 + i * 3) % action.spots.length];
  return { x: s.x, y: s.y };
}
type Leg = { pts: Vec[]; cum: number[]; len: number };
const legs = new Map<string, Leg>();
function legBetween(a: Vec, b: Vec): Leg {
  const key = `${a.x},${a.y}>${b.x},${b.y}`;
  let leg = legs.get(key);
  if (leg) return leg;
  const pts = [a, ...findPath(a, b, FIXED)];
  const end = pts[pts.length - 1];
  if (end.x !== b.x || end.y !== b.y) pts.push(b); // termina exacto sobre el punto, para tomar la pose
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  leg = { pts, cum, len: cum[cum.length - 1] };
  if (legs.size > 400) legs.clear();
  legs.set(key, leg);
  return leg;
}
function botAt(i: number, t: number): Vec {
  const n = Math.floor(t / SLOT), p = t - n * SLOT, start = i * LEAVE;
  const leg = legBetween(botSpot(n - 1, i), botSpot(n, i));
  // Despacio; sólo un viaje muy largo apura el paso para llegar con tiempo de quedarse un rato.
  const speed = Math.max(SPEED, leg.len / (SLOT - REST - start));
  const d = Math.min(leg.len, Math.max(0, p - start) * speed);
  let k = 1;
  while (k < leg.cum.length - 1 && leg.cum[k] < d) k++;
  const a = leg.pts[k - 1], b = leg.pts[k] ?? a, seg = leg.cum[k] - leg.cum[k - 1] || 1, u = Math.min(1, (d - leg.cum[k - 1]) / seg);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
export const GHOSTY_ID = "bot:ghosty";
export const BOTS: BotDef[] = [
  { id: "bot:uno", name: "Robot Uno", look: botLook("blue"), note: "Robot de la casa · pasea por la isla y hace de todo", at: (t) => botAt(0, t) },
  { id: "bot:dos", name: "Robot Dos", look: botLook("lilac"), note: "Robot de la casa · pasea por la isla y hace de todo", at: (t) => botAt(1, t) },
  { id: "bot:tres", name: "Robot Tres", look: botLook("amber"), note: "Robot de la casa · pasea por la isla y hace de todo", at: (t) => botAt(2, t) },
  { id: GHOSTY_ID, name: "Ghosty", look: botLook("mint"), note: "Ghosty · pasea por la isla con todos", at: (t) => botAt(3, t) },
];

// ───────── La estructura que lee el motor (y el servidor) ─────────
export const structure: WorldStructure = {
  size: { w: WORLD_W, h: WORLD_H },
  spawn: SPAWN,
  places: PLACES,
  tables: TABLES,
  tableZone: { name: "Campamento del hackatón", entry: { x: 530, y: 760 }, x: 190, y: 580, w: 560, h: 300 },
  bots: BOTS,
  looks: {
    models: SHAPES.map((s) => ({ id: s.id, name: s.name })),
    colors: TONES.map((c) => ({ id: c.id, name: c.name })),
    pilots: [{ id: "avatar", name: "Mi foto" }, { id: "carita", name: "Carita" }],
    initial: { model: "gorro", color: "mint", pilot: "avatar" },
    fallback: { model: "gorro", color: "mint", pilot: "carita" },
  },
  // Caminar: arranca y frena pronto (nada de inercia de nave), sólo sobre tierra y rodeando lo que estorba.
  movement: {
    maxSpeed: 200, accel: 1600, drag: 4, idleDrag: 12, seatSpeed: 160, margin: 20, targetMargin: 20,
    constrain: (next, prev, hidden, self) => { useHidden(hidden); return slide(prev, next, self); },
    route: (from, to, hidden) => { useHidden(hidden); return plan(from, to); },
  },
  // El renderizador es 3D y trae su propia cámara; estos valores sólo sirven a la cámara lógica del motor.
  camera: { minScale: 0.5, minScaleNarrow: 0.4, maxScale: 1.1 },
  combat: null,
};
