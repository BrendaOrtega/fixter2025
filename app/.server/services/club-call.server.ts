// Llamada en vivo del Club de Agentes de IA (10-nov-2026).
//
// La llamada vive en la CAJA de eventos (LiveKit en sandbox-host), no en Ghosty Teams. Quien
// firma el ticket de entrada es gs (`POST /api/v2/partner/event-box/ticket`), porque el secreto
// de la caja (EVENT_TICKET_SECRET) no sale de gs. Aquí sólo firmamos la PETICIÓN con la
// credencial de partner del espacio `business` (gpk_/gps_), y gs devuelve la URL de la sala con
// un ticket de UN SOLO USO que dura 120 s: se pide al dar clic y se redirige en el acto.
//
// Quien llama ya revisó que el usuario es miembro activo del club. Aquí se decide el rol:
// host para el dueño (CLUB_CALL_HOST_EMAILS o `opts.host`), viewer para los demás (webinar).
//
// Env:
//   GHOSTY_PARTNER_KEY         gpk_… (keyId de la credencial)
//   GHOSTY_PARTNER_KEY_SECRET  gps_… (secreto; nunca sale del servidor)
//   GHOSTY_API_URL             opcional, default https://www.ghosty.studio
//   CLUB_CALL_HOST_EMAILS      opcional, correos separados por coma (default fixtergeek@gmail.com)
//   CLUB_CALL_MODE             opcional, webinar | taller (default webinar)
//
// Caja propia de fixter (12-nov-2026, fork `fixter-call-svc` de sandbox-host): con estas dos
// variables el ticket se firma AQUÍ y gs ya no participa. Sin ellas, todo sigue por gs como antes.
//   CLUB_CALL_BOX_URL          https://… de la caja de llamadas de fixter
//   CLUB_CALL_TICKET_SECRET    el EVENT_TICKET_SECRET de ESA caja (nunca sale del servidor)
import crypto from "node:crypto";

const DEFAULT_API = "https://www.ghosty.studio";
const DEFAULT_HOSTS = "fixtergeek@gmail.com";
const ROOM_PREFIX = "fx-club-de-agentes";
const TITLE = "Club de Agentes de IA · Llamada en vivo";

/**
 * Aspecto de la sala: un JSON chico de tokens, nunca CSS. La caja lo valida con lista blanca
 * (hex de 6 dígitos, tipografía de una lista, logo sólo de dominios de casa) y descarta lo demás.
 */
export type CallSkin = {
  preset?: "default" | "fixter";
  colors?: Partial<Record<"bg" | "surface" | "surface2" | "line" | "ink" | "muted" | "accent" | "accentInk" | "danger" | "panel" | "panelInk" | "panelLine", string>>;
  radius?: number;
  font?: "system" | "serif" | "mono" | "rounded";
  logoUrl?: string;
};
export const FIXTER_SKIN: CallSkin = { preset: "fixter" };
const TICKET_TTL_S = 120;

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

/**
 * Ticket de UN SOLO USO para `POST /join` de la caja, y la URL de la sala. Mismo formato que
 * verifica `server.mjs`: base64url(json) "." base64url(HMAC-SHA256(secreto, base64url(json))).
 */
export function signCallTicket(
  c: { room: string; name: string; role: "viewer" | "speaker" | "host"; mode: "webinar" | "taller"; title?: string; skin?: CallSkin | null },
  o: { secret: string; baseUrl: string; nowMs?: number }
): string {
  const exp = Math.floor((o.nowMs ?? Date.now()) / 1000) + TICKET_TTL_S;
  const { skin, title, ...rest } = c;
  const json = b64url(JSON.stringify({ ...rest, ...(title ? { title } : {}), ...(skin ? { skin } : {}), exp, jti: crypto.randomUUID() }));
  const ticket = `${json}.${b64url(crypto.createHmac("sha256", o.secret).update(json).digest())}`;
  return `${o.baseUrl.replace(/\/$/, "")}/room?room=${encodeURIComponent(c.room)}&ticket=${encodeURIComponent(ticket)}`;
}

type CallUser = { email: string; displayName?: string | null; username: string };

/** `YYYYMMDD` del día en CDMX: una sala por día de llamada. */
function cdmxDay(d = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}${p.month}${p.day}`;
}

export function clubCallRoom(d = new Date()): string {
  return `${ROOM_PREFIX}-${cdmxDay(d)}`;
}

export function isHostEmail(email: string): boolean {
  const list = (process.env.CLUB_CALL_HOST_EMAILS || DEFAULT_HOSTS)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** POST firmado con la credencial de partner del espacio `business` de gs. */
export async function partnerPost<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>,
  opts: { timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data: (T & { error?: string }) | null }> {
  const keyId = process.env.GHOSTY_PARTNER_KEY;
  const secret = process.env.GHOSTY_PARTNER_KEY_SECRET;
  if (!keyId || !secret) {
    console.error("[club-call] faltan GHOSTY_PARTNER_KEY / GHOSTY_PARTNER_KEY_SECRET");
    return { ok: false, status: 503, data: null };
  }
  const base = (process.env.GHOSTY_API_URL || DEFAULT_API).replace(/\/$/, "");
  const raw = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac("sha256", secret).update(`${ts}.${keyId}.${raw}`).digest("hex");
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ghosty-key": keyId, "x-ghosty-ts": ts, "x-ghosty-sig": sig },
      body: raw,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) console.error(`[club-call] gs ${path} contestó ${res.status}: ${data?.error ?? ""}`);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error(`[club-call] no pude llamar a gs ${path}:`, e instanceof Error ? e.message : e);
    return { ok: false, status: 502, data: null };
  }
}

/**
 * URL de la sala de la caja con ticket de un solo uso, o `null` si algo falla (queda en el log).
 * Se pide justo antes de redirigir: el ticket vence a los 120 s y no sirve dos veces.
 */
export async function getCallLink(
  user: CallUser,
  opts: { host?: boolean; speaker?: boolean; skin?: CallSkin | null } = {}
): Promise<string | null> {
  const name = (user.displayName || user.username || user.email.split("@")[0]).trim().slice(0, 40);
  const host = opts.host ?? isHostEmail(user.email);
  // speaker publica mic, cámara y pantalla; viewer sólo ve, escribe en el chat y levanta la mano.
  const role = host ? "host" : opts.speaker ? "speaker" : "viewer";
  const mode = process.env.CLUB_CALL_MODE === "taller" ? "taller" : "webinar";
  // Caja propia: fixter firma el ticket y manda el skin (el de la comunidad o el de la casa).
  const boxUrl = process.env.CLUB_CALL_BOX_URL, secret = process.env.CLUB_CALL_TICKET_SECRET;
  if (boxUrl && secret) {
    return signCallTicket({ room: clubCallRoom(), name, role, mode, title: TITLE, skin: opts.skin ?? FIXTER_SKIN }, { secret, baseUrl: boxUrl });
  }
  const r = await partnerPost<{ url?: string }>("/api/v2/partner/event-box/ticket", {
    room: clubCallRoom(),
    name,
    role,
    mode,
    title: TITLE,
  });
  return r.ok && r.data?.url ? r.data.url : null;
}
