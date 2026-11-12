// «Mundo» del club: presencia en memoria. Cada miembro conectado es una nave; el cliente sondea
// cada ~2.5 s y manda su posición y destino. Nada de esto toca la base: si el proceso se
// reinicia, las naves reaparecen con el siguiente latido.
//
// ⚠️ Vale mientras la app corra en UNA sola caja. Con dos réplicas cada una vería sólo a los suyos.

export const WORLD_W = 1600;
export const WORLD_H = 1000;
export const TABLE_COUNT = 3;
export const SEATS_PER_TABLE = 4;
/** Sin latido en este tiempo, la nave desaparece. */
export const SHIP_TTL_MS = 15_000;
/** Un saludo se entrega durante este tiempo (cabe en dos o tres lecturas del sondeo). */
export const WAVE_TTL_MS = 8_000;
/** Entre un saludo y otro de la misma persona. */
export const WAVE_EVERY_MS = 1_500;
export const MAX_SHIPS = 80;
/** Tope del cuerpo de un POST, en bytes. */
export const MAX_BODY = 600;

export const SHIP_MODELS = ["rocket", "saucer", "pod", "dart"] as const;
export const SHIP_COLORS = ["mint", "green", "amber", "lilac", "blue", "pink"] as const;
/** `avatar`: la foto del miembro va en la cabina (la foto sale del servidor, el cliente sólo manda la palabra). */
export const SHIP_PILOTS = ["avatar", "ghosty", "astro", "alien"] as const;

type Who = { id: string; name: string; photoURL: string };
type Ship = Who & {
  x: number;
  y: number;
  tx: number;
  ty: number;
  ship: (typeof SHIP_MODELS)[number];
  color: (typeof SHIP_COLORS)[number];
  pilot: (typeof SHIP_PILOTS)[number];
  table: number | null;
  seat: number | null;
  seenAt: number;
  lastWaveAt: number;
};
type Wave = { id: string; from: string; to: string; at: number };
type World = { ships: Map<string, Ship>; waves: Wave[]; seq: number };

const worlds = new Map<string, World>();

function worldOf(communityId: string) {
  let w = worlds.get(communityId);
  if (!w) worlds.set(communityId, (w = { ships: new Map(), waves: [], seq: 0 }));
  return w;
}

function prune(w: World, now: number) {
  for (const [id, s] of w.ships) if (now - s.seenAt > SHIP_TTL_MS) w.ships.delete(id);
  if (w.waves.length) w.waves = w.waves.filter((v) => now - v.at <= WAVE_TTL_MS);
}

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(min, Math.min(max, v))) : fallback;
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T) =>
  list.includes(v as T) ? (v as T) : fallback;

/** Lo que el cliente puede decir de su nave, ya acotado al mapa y a las listas permitidas. */
export function cleanShipInput(input: unknown) {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const x = num(o.x, 0, WORLD_W, WORLD_W / 2);
  const y = num(o.y, 0, WORLD_H, WORLD_H / 2);
  const table = typeof o.table === "number" && Number.isInteger(o.table) && o.table >= 0 && o.table < TABLE_COUNT ? o.table : null;
  return {
    x,
    y,
    tx: num(o.tx, 0, WORLD_W, x),
    ty: num(o.ty, 0, WORLD_H, y),
    ship: oneOf(o.ship, SHIP_MODELS, "rocket"),
    color: oneOf(o.color, SHIP_COLORS, "mint"),
    pilot: oneOf(o.pilot, SHIP_PILOTS, "astro"),
    table,
  };
}

/**
 * Guarda (o refresca) la nave de quien manda. Nombre y foto vienen del servidor, nunca del
 * cliente. Devuelve `false` si el mundo ya está lleno y esa persona todavía no tenía nave.
 */
export function upsertShip(communityId: string, who: Who, input: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  const prev = w.ships.get(who.id);
  if (!prev && w.ships.size >= MAX_SHIPS) return false;
  const clean = cleanShipInput(input);
  // Asiento: se conserva si sigue en la misma mesa; si llega a otra, toma el primero libre.
  let table = clean.table;
  let seat: number | null = null;
  if (table !== null) {
    if (prev && prev.table === table && prev.seat !== null) seat = prev.seat;
    else {
      const taken = new Set<number>();
      for (const s of w.ships.values()) if (s.id !== who.id && s.table === table && s.seat !== null) taken.add(s.seat);
      for (let k = 0; k < SEATS_PER_TABLE; k++) if (!taken.has(k)) { seat = k; break; }
      if (seat === null) table = null; // mesa llena: se queda de pie
    }
  }
  w.ships.set(who.id, { ...who, ...clean, table, seat, seenAt: now, lastWaveAt: prev?.lastWaveAt ?? 0 });
  return true;
}

/** Saludo efímero: sólo entre dos naves presentes y sin ráfagas. */
export function sendWave(communityId: string, fromId: string, toId: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  const from = w.ships.get(fromId);
  if (!from || typeof toId !== "string" || toId === fromId || !w.ships.has(toId)) return null;
  if (now - from.lastWaveAt < WAVE_EVERY_MS) return null;
  from.lastWaveAt = now;
  const wave: Wave = { id: `${now.toString(36)}-${(w.seq++).toString(36)}`, from: fromId, to: toId, at: now };
  w.waves.push(wave);
  return wave.id;
}

/** Sale del mundo de inmediato (al cerrar la sección), sin esperar el vencimiento. */
export function removeShip(communityId: string, userId: string) {
  worlds.get(communityId)?.ships.delete(userId);
}

/** Lo que ve el cliente: naves presentes (sin correos ni marcas internas) y saludos recientes. */
export function snapshot(communityId: string, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  return {
    count: w.ships.size,
    ships: [...w.ships.values()].map(({ seenAt: _s, lastWaveAt: _l, ...ship }) => ship),
    waves: w.waves.map(({ id, from, to }) => ({ id, from, to })),
  };
}

export type WorldSnapshot = ReturnType<typeof snapshot>;
export type WorldShip = WorldSnapshot["ships"][number];

/** Sólo para pruebas. */
export function resetWorlds() {
  worlds.clear();
}
