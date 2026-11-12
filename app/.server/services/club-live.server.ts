// A dónde transmite en vivo una comunidad (12-nov-2026). Hoy: YouTube por OAuth de Google.
//
// El dueño conecta su canal desde el panel («Transmisión»). Se guarda cifrado su refresh token
// (`StreamDestination.tokenEnc`). Al dar «Grabar» con «En vivo» encendido, aquí se crea el evento
// en YouTube (arranca y cierra solo) y su URL de ingesta viaja a la caja en un SOBRE FIRMADO de un
// solo uso: la caja nunca guarda llaves y nadie la reinicia para transmitir.
//
// El OAuth reutiliza el cliente y la URI de regreso del login (`/login?auth=google`): lo que
// distingue este flujo es el `state`, que empieza con `live.` y va firmado.
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_SECRET (los del login), STREAM_KEYS_MASTER (cifrado),
//      CLUB_CALL_TICKET_SECRET (firma del sobre; es el EVENT_TICKET_SECRET de la caja).
import crypto from "node:crypto";
import { db } from "~/.server/db";
import { decryptSecret, encryptSecret, signingKey, vaultIsConfigured } from "~/.server/live/secret-vault.server";
import { createBroadcast, ensureStream, myChannel, type Privacy } from "~/.server/live/youtube-live";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
const STATE_PREFIX = "live.";
const CONNECT_TTL_MS = 15 * 60_000;
const ENVELOPE_TTL_S = 120;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const site = () => (process.env.NODE_ENV === "production" ? "https://www.fixtergeek.com" : "http://localhost:3000");
/** La misma URI que usa el login: ya está dada de alta en la consola de Google. */
const redirectUri = () => `${site()}/login?auth=google`;
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export const youtubeConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_SECRET && vaultIsConfigured();

// ── `state` firmado ───────────────────────────────────────────────────────────
export type ConnectState = { communityId: string; slug: string; email: string; exp: number };

export function signConnectState(st: ConnectState, key = signingKey("live-state")): string {
  const body = b64url(JSON.stringify(st));
  return `${STATE_PREFIX}${body}.${b64url(crypto.createHmac("sha256", key).update(body).digest())}`;
}

export function verifyConnectState(raw: string | null, key = signingKey("live-state"), now = Date.now()): ConnectState | null {
  if (!raw?.startsWith(STATE_PREFIX)) return null;
  const [body, sig] = raw.slice(STATE_PREFIX.length).split(".");
  if (!body || !sig) return null;
  const want = b64url(crypto.createHmac("sha256", key).update(body).digest());
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const st = JSON.parse(Buffer.from(body, "base64url").toString()) as ConnectState;
    return st.exp > now && st.communityId && st.slug && st.email ? st : null;
  } catch {
    return null;
  }
}

export const isLiveState = (state: string | null) => !!state?.startsWith(STATE_PREFIX);

/** A dónde mandar al dueño para que dé permiso a su canal. */
export function youtubeAuthorizeUrl(c: { communityId: string; slug: string; email: string }): string {
  const state = signConnectState({ ...c, exp: Date.now() + CONNECT_TTL_MS });
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: redirectUri(),
    response_type: "code",
    // offline + consent: sin ellos Google no devuelve refresh token en una reconexión.
    access_type: "offline",
    prompt: "select_account consent",
    include_granted_scopes: "false",
    scope: `openid email ${YOUTUBE_SCOPE}`,
    hl: "es-419",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

const backTo = (slug: string, result: "ok" | "cancelled" | "error", detail?: string) => {
  const q = new URLSearchParams({ tab: "transmision", live: result });
  if (detail) q.set("detail", detail.slice(0, 160));
  return `/comunidad/${slug}/admin?${q}`;
};

/**
 * Cierra el OAuth de YouTube. `sessionEmail` es quien tiene la sesión abierta en este navegador:
 * tiene que ser la misma persona que pidió conectar. Devuelve a dónde regresar, o `null` si el
 * `state` no es nuestro o caducó.
 */
export async function finishYouTube(o: { code: string | null; state: string | null; error: string | null; sessionEmail: string | null }): Promise<string | null> {
  const st = verifyConnectState(o.state);
  if (!st) return null;
  if (o.sessionEmail?.toLowerCase() !== st.email.toLowerCase()) return backTo(st.slug, "error", "la sesión cambió: vuelve a intentarlo");
  if (o.error || !o.code) return backTo(st.slug, "cancelled");
  try {
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_SECRET as string,
        grant_type: "authorization_code",
        code: o.code,
        redirect_uri: redirectUri(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const t = (await r.json().catch(() => ({}))) as { refresh_token?: string; access_token?: string; scope?: string };
    // Google deja desmarcar el permiso en la pantalla de consentimiento y aun así da token.
    if (!t.scope?.split(" ").includes(YOUTUBE_SCOPE) || !t.refresh_token || !t.access_token) {
      return backTo(st.slug, "error", "no se dio permiso para YouTube");
    }
    const ch = await myChannel(fetch, t.access_token);
    if (!ch) return backTo(st.slug, "error", "esa cuenta de Google no tiene canal de YouTube");
    const fields = {
      tokenEnc: Uint8Array.from(encryptSecret(t.refresh_token)),
      accountId: ch.id,
      accountName: ch.title,
      connectedBy: st.email,
      streamId: null,
      lastWatchUrl: null,
      lastPreparedAt: null,
    };
    const existing = await db.streamDestination.findFirst({ where: { communityId: st.communityId, provider: "youtube" } });
    if (existing) await db.streamDestination.update({ where: { id: existing.id }, data: fields });
    else await db.streamDestination.create({ data: { communityId: st.communityId, provider: "youtube", ...fields } });
    return backTo(st.slug, "ok");
  } catch (e) {
    console.error("[club-live] callback de YouTube", st.communityId, e instanceof Error ? e.message : e);
    return backTo(st.slug, "error", e instanceof Error ? e.message : undefined);
  }
}

// ── Token de acceso (refresh con caché en memoria) ────────────────────────────
const accessCache = new Map<string, { token: string; exp: number }>();

async function googleAccessToken(destinationId: string, refreshToken: string): Promise<string> {
  const hit = accessCache.get(destinationId);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_SECRET as string,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const t = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!t.access_token) {
    throw new Error(t.error === "invalid_grant" ? "YouTube retiró el permiso: vuelve a conectar el canal en el panel" : `Google no dio acceso (${t.error ?? r.status})`);
  }
  accessCache.set(destinationId, { token: t.access_token, exp: Date.now() + (t.expires_in ?? 3600) * 1000 });
  return t.access_token;
}

// ── Estado, privacidad y desconectar (panel del anfitrión) ────────────────────
const isPrivacy = (p: unknown): p is "public" | "unlisted" => p === "public" || p === "unlisted";

export async function liveStatus(communityId: string) {
  const row = await db.streamDestination.findFirst({ where: { communityId, provider: "youtube" } }).catch(() => null);
  return {
    configured: youtubeConfigured(),
    youtube: row
      ? {
          account: row.accountName,
          channelUrl: `https://www.youtube.com/channel/${row.accountId}`,
          privacy: isPrivacy(row.privacy) ? row.privacy : "public",
          lastWatchUrl: row.lastWatchUrl,
          lastPreparedAt: row.lastPreparedAt?.toISOString() ?? null,
        }
      : null,
  };
}

/** Nombres de los destinos conectados («YouTube»): es lo único que conoce la sala. */
export async function liveTargetNames(communityId: string): Promise<string[]> {
  if (!youtubeConfigured()) return [];
  const n = await db.streamDestination.count({ where: { communityId, provider: "youtube" } }).catch(() => 0);
  return n ? ["YouTube"] : [];
}

export async function setYouTubePrivacy(communityId: string, privacy: unknown) {
  if (!isPrivacy(privacy)) return false;
  const r = await db.streamDestination.updateMany({ where: { communityId, provider: "youtube" }, data: { privacy } });
  return r.count > 0;
}

export async function disconnectYouTube(communityId: string) {
  const r = await db.streamDestination.deleteMany({ where: { communityId, provider: "youtube" } });
  return r.count > 0;
}

// ── Preparar la transmisión y firmar el sobre ─────────────────────────────────
export type Prepared = { targets: { name: string; url: string }[]; watchUrls: string[]; errors: string[] };

/** Crea el evento en cada destino conectado. Sin destinos conectados devuelve todo vacío. */
export async function prepareBroadcasts(communityId: string, title: string): Promise<Prepared> {
  const out: Prepared = { targets: [], watchUrls: [], errors: [] };
  if (!youtubeConfigured()) return out;
  const row = await db.streamDestination.findFirst({ where: { communityId, provider: "youtube" } });
  if (!row) return out;
  try {
    const access = await googleAccessToken(row.id, decryptSecret(row.tokenEnc));
    const s = await ensureStream(fetch, access, row.streamId);
    const privacy: Privacy = isPrivacy(row.privacy) ? row.privacy : "public";
    const b = await createBroadcast(fetch, access, { title, privacy, streamId: s.streamId });
    out.targets.push({ name: "YouTube", url: s.rtmpUrl });
    out.watchUrls.push(b.watchUrl);
    await db.streamDestination.update({ where: { id: row.id }, data: { streamId: s.streamId, lastWatchUrl: b.watchUrl, lastPreparedAt: new Date() } });
  } catch (e) {
    console.error("[club-live] no se pudo preparar YouTube", communityId, e instanceof Error ? e.message : e);
    out.errors.push(`YouTube: ${e instanceof Error ? e.message : "falló"}`);
  }
  return out;
}

/**
 * Sobre firmado con los destinos para `POST /admin/recording/start` de la caja. Mismo formato que
 * el ticket de entrada, pero la firma cubre `"live:" + cuerpo` para que uno no sirva de otro:
 * base64url(json) "." base64url(HMAC-SHA256(secreto, "live:" + base64url(json))).
 */
export function signLiveEnvelope(c: { room: string; urls: string[] }, secret: string, nowMs = Date.now()): string {
  const body = b64url(JSON.stringify({ room: c.room, urls: c.urls, exp: Math.floor(nowMs / 1000) + ENVELOPE_TTL_S, jti: crypto.randomUUID() }));
  return `${body}.${b64url(crypto.createHmac("sha256", secret).update(`live:${body}`).digest())}`;
}
