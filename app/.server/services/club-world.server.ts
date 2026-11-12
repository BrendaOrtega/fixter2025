// «Mundo» del club: presencia en memoria. Cada miembro conectado es una nave; el cliente sondea
// cada ~2.5 s y manda su posición y destino. Nada de esto toca la base: si el proceso se
// reinicia, las naves reaparecen con el siguiente latido.
//
// ⚠️ Vale mientras la app corra en UNA sola caja. Con dos réplicas cada una vería sólo a los suyos.
//
// El mundo de cada comunidad es un cartucho (docs/club-rediseno/MUNDO-CARTUCHOS.md). Aquí no hay
// tamaños, mesas ni robots propios: todo se valida contra la ESTRUCTURA del cartucho activo.

import { SHARED_MAX_KEYS, SHARED_MAX_TEXT, type SharedValue, type WorldStructure } from "~/components/community/v2/world/cartridge";
import { DEFAULT_CARTRIDGE_ID, getCartridge, hasCartridge } from "~/components/community/v2/world/cartridges";

/** Sin latido en este tiempo, la nave desaparece. */
export const SHIP_TTL_MS = 15_000;
/** Un saludo se entrega durante este tiempo (cabe en dos o tres lecturas del sondeo). */
export const WAVE_TTL_MS = 8_000;
/** Entre un saludo y otro de la misma persona. */
export const WAVE_EVERY_MS = 1_500;
/** Cosquilla: el disparo de alguien tocó tu nave y tiembla un instante. Sin daño, sin puntos y sin autor. */
export const NUDGE_TTL_MS = 6_000;
export const NUDGE_EVERY_MS = 1_000;
/** Margen para el reloj de cada quien al validar la visita de la nave enemiga. */
export const THREAT_SKEW_MS = 10_000;
/** Estado compartido del modo de juego: a lo más un cambio cada tanto por persona. */
export const SHARE_EVERY_MS = 300;
export const MAX_SHIPS = 80;
/** Tope del cuerpo de un POST, en bytes. */
export const MAX_BODY = 1_000;
/** Chat efímero del Mundo: últimos mensajes en memoria, nada en la base. */
export const SAY_MAX = 30;
export const SAY_TTL_MS = 10 * 60_000;
export const SAY_EVERY_MS = 2_000;
export const SAY_MAX_CHARS = 140;

const DEFAULT_STRUCTURE = getCartridge(DEFAULT_CARTRIDGE_ID).structure;

type Who = { id: string; name: string; photoURL: string };
type Ship = Who & {
  x: number;
  y: number;
  tx: number;
  ty: number;
  ship: string;
  color: string;
  pilot: string;
  table: number | null;
  seat: number | null;
  /** La amenaza del cartucho destruyó su nave: los demás la ocultan hasta que reaparezca. */
  down: boolean;
  /** La amenaza le bajó más de la mitad de la vida: con un arma recogida, los demás ya pueden pegarle. */
  weak: boolean;
  seenAt: number;
  lastWaveAt: number;
  lastSayAt: number;
  lastNudgeAt: number;
};
type Wave = { id: string; from: string; to: string; at: number };
/** `name` se copia de la nave al enviar: el historial sigue legible cuando esa persona ya se fue. */
type Say = { id: string; from: string; name: string; text: string; at: number };
/** Sin `from`: quien recibe la cosquilla no sabe de quién vino, para que no se preste a molestar. */
/** `kind: "bonk"`: no fue cosquilla sino golpe con un objeto del mundo (un almohadazo); la skin decide cómo se ve. */
/** `kind: "zap"`: tiro con arma recogida a alguien debilitado (sólo se acepta si su nave dice `weak`); le quita un golpe. */
type Nudge = { id: string; to: string; at: number; kind?: "bonk" | "zap" };
/**
 * `down`: robot tumbado → momento en que vuelve. `cartridge`: el mundo activo de esta comunidad;
 * `hydrated`: ya se leyó de la base (o se cambió aquí) en este proceso. `shared`: estado compartido
 * del modo de juego del cartucho activo; `shareAt`: último cambio de cada persona (freno).
 */
/** Daño a la nave enemiga de una visita, por persona: así todos ven bajar la misma vida y cooperan para derribarla. */
type Hurt = { until: number; by: Map<string, number> };
type World = { ships: Map<string, Ship>; waves: Wave[]; says: Say[]; nudges: Nudge[]; down: Map<string, number>; hurt: Map<string, Hurt>; seq: number; cartridge: string; hydrated: boolean; shared: Map<string, SharedValue>; shareAt: Map<string, number> };

const worlds = new Map<string, World>();

function worldOf(communityId: string) {
  let w = worlds.get(communityId);
  if (!w) worlds.set(communityId, (w = { ships: new Map(), waves: [], says: [], nudges: [], down: new Map(), hurt: new Map(), seq: 0, cartridge: DEFAULT_CARTRIDGE_ID, hydrated: false, shared: new Map(), shareAt: new Map() }));
  return w;
}
const structureOf = (w: World) => getCartridge(w.cartridge).structure;

// ── Cartucho activo ──
// Se guarda en la base (`Community.worldCartridge`) para que sobreviva a reinicios y despliegues, y
// se recuerda aquí porque el sondeo llega cada ~2.5 s por persona y no debe leer la base.

/** El id del mundo activo de la comunidad (el de la casa si no ha elegido otro). */
export function activeCartridge(communityId: string) {
  return worldOf(communityId).cartridge;
}

/**
 * Lo que dice la base, la primera vez que se pregunta en este proceso. Después manda la memoria:
 * una lectura vieja de la base (hasta un minuto de caché) no debe deshacer un cambio recién hecho.
 */
export function hydrateCartridge(communityId: string, saved: string | null | undefined) {
  const w = worldOf(communityId);
  if (w.hydrated) return;
  w.hydrated = true;
  if (hasCartridge(saved)) w.cartridge = saved;
}

/**
 * Cambia el mundo en memoria: quien tenga el Mundo abierto lo recibe en su siguiente sondeo
 * (`snapshot().cartridge`). Las naves y el chat se quedan; lo que era del mundo anterior (mesas,
 * asientos, robots tumbados) se suelta y las posiciones se acotan al mapa nuevo. `false` si el id
 * no está en el registro.
 */
export function setWorldCartridge(communityId: string, cartridgeId: unknown) {
  if (!hasCartridge(cartridgeId)) return false;
  const w = worldOf(communityId);
  w.hydrated = true;
  if (w.cartridge === cartridgeId) return true;
  w.cartridge = cartridgeId;
  const { w: maxX, h: maxY } = structureOf(w).size;
  for (const s of w.ships.values()) {
    s.table = s.seat = null;
    s.down = false;
    s.x = Math.min(s.x, maxX); s.y = Math.min(s.y, maxY); s.tx = Math.min(s.tx, maxX); s.ty = Math.min(s.ty, maxY);
  }
  w.down.clear();
  // El estado compartido era del modo de juego del mundo anterior.
  w.shared.clear(); w.shareAt.clear();
  return true;
}

/**
 * Cambio de mundo pedido por una persona: sólo quien administra el club (`canModerate`, lo decide
 * quien llama) y sólo a un cartucho del registro. `save` lo escribe en la base; si falla, no cambia nada.
 */
export async function changeCartridge(opts: { communityId: string; canManage: boolean; cartridgeId: unknown; save: (cartridgeId: string) => Promise<unknown> }) {
  if (!opts.canManage) return { ok: false as const, status: 403, error: "Sólo el anfitrión cambia el mundo del club." };
  if (!hasCartridge(opts.cartridgeId)) return { ok: false as const, status: 400, error: "Ese mundo no existe." };
  await opts.save(opts.cartridgeId);
  setWorldCartridge(opts.communityId, opts.cartridgeId);
  return { ok: true as const, cartridge: opts.cartridgeId };
}

function prune(w: World, now: number) {
  for (const [id, s] of w.ships) if (now - s.seenAt > SHIP_TTL_MS) w.ships.delete(id);
  if (w.waves.length) w.waves = w.waves.filter((v) => now - v.at <= WAVE_TTL_MS);
  if (w.nudges.length) w.nudges = w.nudges.filter((n) => now - n.at <= NUDGE_TTL_MS);
  if (w.says.length) w.says = w.says.filter((m) => now - m.at <= SAY_TTL_MS);
  for (const [bot, until] of w.down) if (now >= until) w.down.delete(bot);
  for (const [id, h] of w.hurt) if (now >= h.until) w.hurt.delete(id);
  for (const id of w.shareAt.keys()) if (!w.ships.has(id)) w.shareAt.delete(id);
  if (w.shared.size) {
    // Una llave `member` sólo vale mientras esa persona siga en el Mundo.
    const keys = sharedKeys(structureOf(w));
    for (const [key, value] of w.shared) if (keys[key]?.type === "member" && !w.ships.has(value as string)) w.shared.delete(key);
  }
}

/** Llaves que el cartucho declara para su modo de juego (a lo más `SHARED_MAX_KEYS`). */
function sharedKeys(structure: WorldStructure) {
  const all = Object.entries(structure.shared ?? {});
  return Object.fromEntries(all.slice(0, SHARED_MAX_KEYS));
}

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(min, Math.min(max, v))) : fallback;
const oneOf = (v: unknown, list: ReadonlyArray<{ id: string }>, fallback: string) =>
  typeof v === "string" && list.some((o) => o.id === v) ? v : fallback;

/** Lo que el cliente puede decir de su nave, ya acotado al mapa y a las listas del cartucho. */
export function cleanShipInput(input: unknown, structure: WorldStructure = DEFAULT_STRUCTURE) {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const { w: maxX, h: maxY } = structure.size, looks = structure.looks;
  const x = num(o.x, 0, maxX, maxX / 2);
  const y = num(o.y, 0, maxY, maxY / 2);
  const table = typeof o.table === "number" && Number.isInteger(o.table) && o.table >= 0 && o.table < structure.tables.length ? o.table : null;
  return {
    x,
    y,
    tx: num(o.tx, 0, maxX, x),
    ty: num(o.ty, 0, maxY, y),
    ship: oneOf(o.ship, looks.models, looks.fallback.model),
    color: oneOf(o.color, looks.colors, looks.fallback.color),
    pilot: oneOf(o.pilot, looks.pilots, looks.fallback.pilot),
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
  const structure = structureOf(w);
  const clean = cleanShipInput(input, structure);
  // Asiento: se conserva si sigue en la misma mesa; si llega a otra, toma el primero libre.
  let table = clean.table;
  let seat: number | null = null;
  if (table !== null) {
    if (prev && prev.table === table && prev.seat !== null) seat = prev.seat;
    else {
      const taken = new Set<number>();
      for (const s of w.ships.values()) if (s.id !== who.id && s.table === table && s.seat !== null) taken.add(s.seat);
      const seats = structure.tables[table].seats.length;
      for (let k = 0; k < seats; k++) if (!taken.has(k)) { seat = k; break; }
      if (seat === null) table = null; // mesa llena: se queda de pie
    }
  }
  // Destruida por la amenaza: sólo si el cartucho trae una, y nunca sentado (en una mesa nadie te daña).
  const down = !!structure.threat && table === null && !!input && typeof input === "object" && (input as { down?: unknown }).down === true;
  const weak = !!structure.threat && table === null && !down && (input as { weak?: unknown }).weak === true;
  w.ships.set(who.id, { ...who, ...clean, table, seat, down, weak, seenAt: now, lastWaveAt: prev?.lastWaveAt ?? 0, lastSayAt: prev?.lastSayAt ?? 0, lastNudgeAt: prev?.lastNudgeAt ?? 0 });
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

/** Cosquilla efímera: sólo entre dos naves presentes y a lo más una por segundo por emisor. */
export function sendNudge(communityId: string, fromId: string, toId: unknown, now = Date.now(), kind?: unknown) {
  const w = worldOf(communityId);
  prune(w, now);
  const from = w.ships.get(fromId);
  if (!from || typeof toId !== "string" || toId === fromId || !w.ships.has(toId)) return null;
  if (kind === "zap" && !w.ships.get(toId)!.weak) kind = undefined; // sano: sólo una cosquilla
  if (now - from.lastNudgeAt < NUDGE_EVERY_MS) return null;
  from.lastNudgeAt = now;
  const nudge: Nudge = { id: `n${now.toString(36)}-${(w.seq++).toString(36)}`, to: toId, at: now, ...(kind === "bonk" || kind === "zap" ? { kind } : {}) };
  w.nudges.push(nudge);
  return nudge.id;
}

/**
 * Alguien tumbó la nave de un robot de la casa: queda fuera `combat.bot.back` segundos para todos.
 * Sólo de quien tiene nave presente, sólo robots del cartucho activo y sólo si el robot está en el
 * mapa (por eso no hace falta más freno: a lo más tres en veinte segundos). El daño lo lleva cada
 * cliente; aquí sólo se guarda quién está tumbado.
 */
export function sendBoom(communityId: string, fromId: string, botId: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  const { bots, combat, threat } = structureOf(w);
  if (!combat || !w.ships.has(fromId) || typeof botId !== "string" || w.down.has(botId)) return false;
  if (threat && botId.startsWith(`${threat.id}:`)) {
    // La nave enemiga: el id trae su ciclo. Sólo se acepta el de la visita en curso (con un margen por
    // relojes desfasados) y queda derribada hasta que esa visita termine.
    const cycle = Number(botId.slice(threat.id.length + 1));
    const starts = cycle * threat.every * 1000, ends = starts + (threat.warn + threat.stay) * 1000;
    if (!Number.isInteger(cycle) || now < starts - THREAT_SKEW_MS || now >= ends + THREAT_SKEW_MS) return false;
    w.down.set(botId, ends + THREAT_SKEW_MS);
    return true;
  }
  if (!bots.some((b) => b.id === botId)) return false;
  w.down.set(botId, now + combat.bot.back * 1000);
  return true;
}

/** Fin de la visita de la nave enemiga con ese id (`<amenaza>:<ciclo>`), o `null` si no es la visita en curso. */
function threatVisitEnd(w: World, id: string, now: number) {
  const { threat } = structureOf(w);
  if (!threat || !id.startsWith(`${threat.id}:`)) return null;
  const cycle = Number(id.slice(threat.id.length + 1));
  const starts = cycle * threat.every * 1000, ends = starts + (threat.warn + threat.stay) * 1000;
  if (!Number.isInteger(cycle) || now < starts - THREAT_SKEW_MS || now >= ends + THREAT_SKEW_MS) return null;
  return ends + THREAT_SKEW_MS;
}
/** Le pegaste a la nave enemiga (`n` golpes, 1–5): se suma a lo que le han hecho los demás en esta visita. */
export function sendHurt(communityId: string, fromId: string, threatId: unknown, n: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  if (!w.ships.has(fromId) || typeof threatId !== "string" || w.down.has(threatId)) return false;
  const hits = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  if (hits < 1 || hits > 5) return false;
  const until = threatVisitEnd(w, threatId, now);
  if (until === null) return false;
  let h = w.hurt.get(threatId);
  if (!h) w.hurt.set(threatId, (h = { until, by: new Map() }));
  h.by.set(fromId, (h.by.get(fromId) ?? 0) + hits);
  return true;
}

/**
 * Estado compartido del modo de juego: `{ key, value }` (`value: null` borra la llave). Sólo de quien
 * tiene nave presente, sólo llaves que declara el cartucho activo (`structure.shared`) y con su tipo:
 * número entero dentro de `min`–`max`, texto limpio recortado a `max`, o el id de un miembro
 * presente. A lo más un cambio cada `SHARE_EVERY_MS` por persona. Regresa por qué no, si no se aceptó.
 */
export function setShared(communityId: string, fromId: string, input: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  const fail = (error: "absent" | "undeclared" | "invalid" | "rate") => ({ ok: false as const, error });
  if (!w.ships.has(fromId)) return fail("absent");
  const o = (input && typeof input === "object" ? input : {}) as { key?: unknown; value?: unknown };
  const keys = sharedKeys(structureOf(w));
  const decl = typeof o.key === "string" && Object.hasOwn(keys, o.key) ? keys[o.key] : null;
  if (!decl) return fail("undeclared");
  const key = o.key as string;
  let value: SharedValue | null;
  if (o.value === null) value = null;
  else if (decl.type === "number") {
    if (typeof o.value !== "number" || !Number.isInteger(o.value) || o.value < decl.min || o.value > decl.max) return fail("invalid");
    value = o.value;
  } else if (decl.type === "text") {
    const text = [...cleanSayText(o.value)].slice(0, Math.max(0, Math.min(decl.max, SHARED_MAX_TEXT))).join("").trim();
    if (!text) return fail("invalid");
    value = text;
  } else {
    if (typeof o.value !== "string" || !w.ships.has(o.value)) return fail("invalid");
    value = o.value;
  }
  if (now - (w.shareAt.get(fromId) ?? -Infinity) < SHARE_EVERY_MS) return fail("rate");
  w.shareAt.set(fromId, now);
  if (value === null) w.shared.delete(key); else w.shared.set(key, value);
  return { ok: true as const };
}

/** Texto de un mensaje: una sola línea, sin caracteres de control, recortado. Se pinta como texto, nunca como HTML. */
export function cleanSayText(input: unknown) {
  if (typeof input !== "string") return "";
  const flat = input.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
  return [...flat].slice(0, SAY_MAX_CHARS).join("").trim();
}

/**
 * Mensaje efímero al Mundo: sólo de quien tiene nave presente, uno cada `SAY_EVERY_MS`. El nombre
 * sale de la nave (servidor). Devuelve el id, o `null` si no se aceptó.
 */
export function sendSay(communityId: string, fromId: string, text: unknown, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  const from = w.ships.get(fromId);
  const clean = cleanSayText(text);
  if (!from || !clean || now - from.lastSayAt < SAY_EVERY_MS) return null;
  from.lastSayAt = now;
  const say: Say = { id: `m${now.toString(36)}-${(w.seq++).toString(36)}`, from: fromId, name: from.name, text: clean, at: now };
  w.says.push(say);
  if (w.says.length > SAY_MAX) w.says.splice(0, w.says.length - SAY_MAX);
  return say.id;
}

/** Sale del mundo de inmediato (al cerrar la sección), sin esperar el vencimiento. */
export function removeShip(communityId: string, userId: string) {
  worlds.get(communityId)?.ships.delete(userId);
}

/** Lo que ve el cliente: naves presentes (sin correos ni marcas internas), saludos recientes y los últimos mensajes. */
export function snapshot(communityId: string, now = Date.now()) {
  const w = worldOf(communityId);
  prune(w, now);
  return {
    // Mundo activo: si cambia, el cliente desmonta un cartucho y monta el otro sin recargar.
    cartridge: w.cartridge,
    count: w.ships.size,
    // `down` sólo viaja cuando es cierto: los clientes de antes no lo conocen y no les estorba.
    ships: [...w.ships.values()].map(({ seenAt: _s, lastWaveAt: _l, lastSayAt: _m, lastNudgeAt: _n, down, weak, ...ship }) => ({ ...ship, ...(down ? { down } : {}), ...(weak ? { weak } : {}) })),
    waves: w.waves.map(({ id, from, to }) => ({ id, from, to })),
    nudges: w.nudges.map(({ id, to, kind }) => (kind ? { id, to, kind } : { id, to })),
    // En milisegundos que faltan y no en hora: los relojes de cada quien no tienen por qué coincidir.
    down: [...w.down].map(([bot, until]) => ({ bot, back: until - now })),
    // Golpes a la nave enemiga de la visita en curso, por persona (sólo si hay).
    ...(w.hurt.size ? { hurt: [...w.hurt].map(([bot, h]) => ({ bot, by: Object.fromEntries(h.by) })) } : {}),
    says: w.says.map(({ id, from, name, text, at }) => ({ id, from, name, text, at })),
    // Estado compartido del modo de juego: sólo viaja si el cartucho activo declara llaves.
    ...(structureOf(w).shared ? { shared: Object.fromEntries(w.shared) as Record<string, SharedValue> } : {}),
  };
}

export type WorldSnapshot = ReturnType<typeof snapshot>;
export type WorldShip = WorldSnapshot["ships"][number];

/** Sólo para pruebas. */
export function resetWorlds() {
  worlds.clear();
}
