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
import crypto from "node:crypto";

const DEFAULT_API = "https://www.ghosty.studio";
const DEFAULT_HOSTS = "fixtergeek@gmail.com";
const ROOM_PREFIX = "fx-club-de-agentes";
const TITLE = "Club de Agentes de IA · Llamada en vivo";

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

function isHostEmail(email: string): boolean {
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
export async function getCallLink(user: CallUser, opts: { host?: boolean } = {}): Promise<string | null> {
  const name = (user.displayName || user.username || user.email.split("@")[0]).trim().slice(0, 40);
  const host = opts.host ?? isHostEmail(user.email);
  const r = await partnerPost<{ url?: string }>("/api/v2/partner/event-box/ticket", {
    room: clubCallRoom(),
    name,
    role: host ? "host" : "viewer",
    mode: process.env.CLUB_CALL_MODE === "taller" ? "taller" : "webinar",
    title: TITLE,
  });
  return r.ok && r.data?.url ? r.data.url : null;
}
