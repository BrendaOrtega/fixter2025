// Voz en las mesas del «Mundo» (12-nov-2026): al sentarte en una mesa te conectas por audio y
// cámara con quienes están en ESA mesa. Es una llamada aparte de la sala principal, en la misma
// caja de llamadas (LiveKit), y NUNCA se graba ni se transmite: aquí no se llama a ningún
// endpoint de grabación.
//
// Reglas:
//  · Apagado por defecto. El interruptor vive en memoria del proceso (como la presencia): un
//    reinicio o un despliegue lo regresa a apagado.
//  · El cliente no elige la sala. Se deriva aquí: comunidad + día (CDMX) + mesa, con el prefijo
//    `fx-` que exige la caja (`BOX_ROOM_PREFIX`).
//  · Sólo hay token para la mesa donde la presencia (`club-world.server`) dice que esa persona
//    está sentada.
//  · El ticket se canjea AQUÍ (`POST /join` de la caja no tiene CORS y la caja no se toca): al
//    navegador sólo le llegan el token de LiveKit y la URL wss.
//  · La caja tiene tope de salas (`BOX_MAX_ROOMS`) y abrir una sala nueva por encima del tope no
//    se le permite ni al anfitrión. Para que las mesas nunca le quiten su lugar a la sala
//    principal, aquí se limita cuántas mesas pueden tener voz a la vez (`CLUB_VOICE_MAX_ROOMS`).
//
// Env:
//   CLUB_CALL_BOX_URL / CLUB_CALL_TICKET_SECRET   los mismos de la sala principal
//   CLUB_CALL_WS_URL       opcional: wss://… del SFU. Sin ella se lee de la página `/room` de la
//                          caja y, si no, se deduce de su URL (-8088. → -7880.)
//   CLUB_VOICE_MAX_ROOMS   opcional: mesas con voz a la vez en todo el proceso (default 2)
import { signCallTicket } from "./club-call.server";
import { snapshot } from "./club-world.server";

const ROOM_PREFIX = "fx-mesa";
const DEFAULT_MAX_ROOMS = 2;
const JOIN_TIMEOUT_MS = 8_000;
/**
 * Tokens por persona por minuto. Cada `/join` aparta un lugar 30 s en la caja, y quien entra y sale
 * rápido lo deja apartado hasta que vence: sin freno, sentarse y pararse sin parar se comería el
 * cupo de la caja (y de la sala principal). 4 alcanzan para entrar y tres reintentos.
 */
export const TOKENS_PER_MINUTE = 4;

export type VoiceWho = { id: string; name: string };
export type VoiceError = { ok: false; status: number; code: VoiceErrorCode; error: string };
export type VoiceErrorCode = "voice_off" | "not_seated" | "not_configured" | "full" | "too_many" | "box_error";
export type VoiceGrant = { ok: true; token: string; wsUrl: string; identity: string; table: number };

type Env = Record<string, string | undefined>;
type Deps = { fetch?: typeof fetch; now?: number; env?: Env };

// ── Interruptor por comunidad (en memoria) ──
// Encendido de entrada (decisión de bliss, 12-nov-2026): aquí se guardan las comunidades que lo
// apagaron. Un reinicio del servidor lo deja encendido otra vez.
const disabled = new Set<string>();

export function voiceEnabled(communityId: string) {
  return !disabled.has(communityId);
}

/** Enciende o apaga la voz en mesas. Sólo quien administra la comunidad. */
export function setVoiceEnabled(opts: { communityId: string; canManage: boolean; on: unknown }) {
  if (!opts.canManage) return { ok: false as const, status: 403, error: "Sólo quien administra la comunidad cambia la voz en mesas." };
  if (typeof opts.on !== "boolean") return { ok: false as const, status: 400, error: "Falta `on` (true o false)." };
  if (opts.on) disabled.delete(opts.communityId);
  else {
    disabled.add(opts.communityId);
    for (const key of grants.keys()) if (key.startsWith(`${opts.communityId}:`)) grants.delete(key);
  }
  return { ok: true as const, enabled: opts.on };
}

// ── Sala ──
/** `YYYYMMDD` del día en CDMX (misma regla que la sala principal). */
function cdmxDay(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}${p.month}${p.day}`;
}

/** Sala de una mesa: `fx-mesa-<comunidad>-<YYYYMMDD>-<n>` (n desde 1). Nunca coincide con la sala principal. */
export function voiceRoom(slug: string, table: number, d = new Date()): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "club";
  return `${ROOM_PREFIX}-${safe}-${cdmxDay(d)}-${table + 1}`;
}

// ── Presencia ──
/** Mesa donde la presencia dice que está sentada esa persona, o `null`. */
export function seatedTable(communityId: string, userId: string, now = Date.now()): number | null {
  const ship = snapshot(communityId, now).ships.find((s) => s.id === userId);
  return ship && ship.table !== null && ship.seat !== null ? ship.table : null;
}

/** Nombre y foto de quienes están sentados en una mesa (para pintar la foto junto a cada cámara). */
export function tableRoster(communityId: string, table: number, now = Date.now()) {
  return snapshot(communityId, now)
    .ships.filter((s) => s.table === table && s.seat !== null)
    .map((s) => ({ name: s.name, photoURL: s.photoURL }));
}

// ── Tope de mesas con voz ──
// Mesa (`comunidad:mesa`) → personas a las que se les dio token y siguen sentadas ahí.
const grants = new Map<string, Set<string>>();

function pruneGrants(now: number) {
  for (const [key, users] of grants) {
    const cut = key.lastIndexOf(":");
    const communityId = key.slice(0, cut), table = Number(key.slice(cut + 1));
    const seated = new Set(snapshot(communityId, now).ships.filter((s) => s.table === table && s.seat !== null).map((s) => s.id));
    for (const u of users) if (!seated.has(u)) users.delete(u);
    if (!users.size) grants.delete(key);
  }
}

function maxRooms(env: Env) {
  // Vacía o ilegible = el default (una variable vacía no debe leerse como «cero mesas»).
  const raw = (env.CLUB_VOICE_MAX_ROOMS ?? "").trim();
  const n = Number(raw);
  return raw !== "" && Number.isInteger(n) && n >= 0 ? n : DEFAULT_MAX_ROOMS;
}

// ── Freno por persona ──
const recent = new Map<string, number[]>();
function throttled(userId: string, now: number) {
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= TOKENS_PER_MINUTE) { recent.set(userId, list); return true; }
  list.push(now);
  recent.set(userId, list);
  if (recent.size > 5000) recent.clear();
  return false;
}

// ── URL del SFU ──
let wsCache: { boxUrl: string; ws: string } | null = null;

/** wss del SFU: variable explícita, lo que la propia caja inyecta en `/room`, o deducido de su URL. */
export async function resolveWsUrl(boxUrl: string, deps: Deps = {}): Promise<string | null> {
  const env = deps.env ?? process.env;
  if (env.CLUB_CALL_WS_URL) return env.CLUB_CALL_WS_URL;
  const base = boxUrl.replace(/\/$/, "");
  if (wsCache?.boxUrl === base) return wsCache.ws;
  let ws: string | null = null;
  try {
    const res = await (deps.fetch ?? fetch)(`${base}/room`, { signal: AbortSignal.timeout(JOIN_TIMEOUT_MS) });
    const m = res.ok ? /const WS_URL = "(wss?:\/\/[^"]+)"/.exec(await res.text()) : null;
    if (m) ws = m[1];
  } catch { /* se deduce abajo */ }
  if (!ws) {
    // Misma deducción que hace `room.html` cuando la caja no declara PUBLIC_WS_URL.
    const u = new URL(base);
    if (u.protocol === "https:" && /-8088\./.test(u.host)) ws = `wss://${u.host.replace(/-8088\./, "-7880.")}`;
  }
  if (ws) wsCache = { boxUrl: base, ws };
  return ws;
}

const fail = (status: number, code: VoiceErrorCode, error: string): VoiceError => ({ ok: false, status, code, error });

/**
 * Token de LiveKit para la mesa donde la persona está sentada. `zone` es la mesa que el cliente
 * cree tener: si no coincide con la presencia, no hay token (el cliente reintenta con la buena).
 */
export async function issueVoiceToken(
  opts: { communityId: string; slug: string; who: VoiceWho; zone: unknown },
  deps: Deps = {}
): Promise<VoiceGrant | VoiceError> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now();
  const { communityId, slug, who } = opts;

  if (!voiceEnabled(communityId)) return fail(403, "voice_off", "La voz en mesas está apagada.");
  const table = seatedTable(communityId, who.id, now);
  if (table === null || String(table) !== String(opts.zone)) return fail(409, "not_seated", "Siéntate en una mesa para conectarte.");
  const boxUrl = env.CLUB_CALL_BOX_URL, secret = env.CLUB_CALL_TICKET_SECRET;
  if (!boxUrl || !secret) return fail(503, "not_configured", "La voz en mesas no está configurada.");

  pruneGrants(now);
  const key = `${communityId}:${table}`;
  if (!grants.has(key) && grants.size >= maxRooms(env)) {
    return fail(409, "full", "Ya hay otras mesas con voz. Siéntate en una de ellas o intenta en unos minutos.");
  }
  if (throttled(who.id, now)) return fail(429, "too_many", "Demasiados intentos. Espera un minuto.");

  const wsUrl = await resolveWsUrl(boxUrl, deps);
  if (!wsUrl) return fail(503, "not_configured", "La voz en mesas no está configurada.");

  // speaker: publica micrófono y cámara, sin poderes de moderación ni de grabación.
  const link = signCallTicket(
    { room: voiceRoom(slug, table, new Date(now)), name: who.name.trim().slice(0, 40) || "Miembro", role: "speaker", mode: "taller" },
    { secret, baseUrl: boxUrl, nowMs: now }
  );
  const ticket = new URL(link).searchParams.get("ticket");

  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(`${boxUrl.replace(/\/$/, "")}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket }),
      signal: AbortSignal.timeout(JOIN_TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[club-voice] la caja no contestó /join:", e instanceof Error ? e.message : e);
    return fail(502, "box_error", "No pudimos conectar con la caja de llamadas.");
  }
  const body = (await res.json().catch(() => null)) as { token?: string; identity?: string; code?: string; error?: string } | null;
  if (!res.ok || !body?.token) {
    const code = body?.code ?? "";
    console.error(`[club-voice] /join contestó ${res.status} ${code}`);
    if (code === "room_full" || code === "box_full" || code === "rooms_limit") {
      return fail(409, "full", code === "room_full" ? "La mesa está llena." : "La caja de llamadas está llena. Intenta en unos minutos.");
    }
    return fail(502, "box_error", "No pudimos conectar con la caja de llamadas.");
  }

  let users = grants.get(key);
  if (!users) grants.set(key, (users = new Set()));
  users.add(who.id);
  return { ok: true, token: body.token, wsUrl, identity: body.identity ?? "", table };
}

/** Sólo para pruebas. */
export function resetVoice() {
  disabled.clear();
  grants.clear();
  recent.clear();
  wsCache = null;
}
