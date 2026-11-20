// A dónde transmite en vivo una comunidad (12-nov-2026): YouTube (OAuth de Google) y Facebook
// (OAuth de la app «Ghosty Live» de Meta, 16-nov-2026).
//
// El dueño conecta su canal o su página desde el panel («Transmisión»). Se guarda cifrado el token
// (`StreamDestination.tokenEnc`): refresh token en YouTube, token de página (no caduca) en Facebook.
// Al dar «Grabar» con «En vivo» encendido, aquí se crea el evento en cada destino y sus URLs de
// ingesta viajan a la caja en un SOBRE FIRMADO de un solo uso: la caja nunca guarda llaves y nadie
// la reinicia para transmitir.
//
// YouTube reutiliza el cliente y la URI de regreso del login (`/login?auth=google`): lo que
// distingue ese flujo es el `state`, que empieza con `live.` y va firmado. Facebook tiene su propio
// callback (`/comunidad/live/facebook/callback`), con el mismo `state` y `provider: "facebook"`.
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_SECRET (los del login), FB_LIVE_APP_ID, FB_LIVE_APP_SECRET (app
//      «Ghosty Live»; FB_LIVE_CONFIG_ID opcional para Login para empresas), STREAM_KEYS_MASTER
//      (cifrado), CLUB_CALL_TICKET_SECRET (firma del sobre; es el EVENT_TICKET_SECRET de la caja).
import crypto from "node:crypto";
import { db } from "~/.server/db";
import { decryptSecret, encryptSecret, signingKey, vaultIsConfigured } from "~/.server/live/secret-vault.server";
import { createBroadcast, ensureStream, myChannel, type Privacy } from "~/.server/live/youtube-live";
import { createLiveVideo, listPages } from "~/.server/live/facebook-live";
import { boxGet } from "~/.server/services/club-call-box.server";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
const STATE_PREFIX = "live.";
const CONNECT_TTL_MS = 15 * 60_000;
const ENVELOPE_TTL_S = 120;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GRAPH = "https://graph.facebook.com/v23.0";
export const FB_SCOPES = "pages_show_list,pages_read_engagement,pages_manage_posts,publish_video";
export type LiveProvider = "youtube" | "facebook";

const site = () => (process.env.NODE_ENV === "production" ? "https://www.fixtergeek.com" : "http://localhost:3000");
/** La misma URI que usa el login: ya está dada de alta en la consola de Google. */
const redirectUri = () => `${site()}/login?auth=google`;
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

const fbRedirectUri = () => `${site()}/comunidad/live/facebook/callback`;

export const youtubeConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_SECRET && vaultIsConfigured();
export const facebookConfigured = () => !!process.env.FB_LIVE_APP_ID && !!process.env.FB_LIVE_APP_SECRET && vaultIsConfigured();

// ── `state` firmado ───────────────────────────────────────────────────────────
export type ConnectState = { communityId: string; slug: string; email: string; exp: number; provider?: LiveProvider };

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
export function youtubeAuthorizeUrl(c: { communityId: string; slug: string; email: string }, lang?: string | null): string {
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
    // `?hl=en` en la liga de conectar: la pantalla de consentimiento sale en inglés (revisión de Google).
    hl: lang === "en" ? "en" : "es-419",
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
  if (!st || st.provider === "facebook") return null;
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

// ── Facebook: OAuth de la app «Ghosty Live» → token de página ─────────────────
/** A dónde mandar al dueño para que dé permiso a su página (Login para empresas si hay `config_id`). */
export function facebookAuthorizeUrl(c: { communityId: string; slug: string; email: string }): string {
  const u = new URL("https://www.facebook.com/v23.0/dialog/oauth");
  u.searchParams.set("client_id", process.env.FB_LIVE_APP_ID as string);
  u.searchParams.set("redirect_uri", fbRedirectUri());
  u.searchParams.set("state", signConnectState({ ...c, provider: "facebook", exp: Date.now() + CONNECT_TTL_MS }));
  u.searchParams.set("response_type", "code");
  if (process.env.FB_LIVE_CONFIG_ID) u.searchParams.set("config_id", process.env.FB_LIVE_CONFIG_ID);
  else u.searchParams.set("scope", FB_SCOPES);
  u.searchParams.set("auth_type", "rerequest");
  u.searchParams.set("locale", "es_LA");
  return u.toString();
}

/** El `state` de un regreso de Facebook, o `null` si no es nuestro, caducó o es de otro proveedor. */
export function facebookState(raw: string | null): ConnectState | null {
  const st = verifyConnectState(raw);
  return st?.provider === "facebook" ? st : null;
}

/** Ids de las páginas que la persona eligió en el diálogo de Meta (alcances granulares del token). */
async function grantedPageIds(userToken: string): Promise<string[]> {
  try {
    const q = new URLSearchParams({ input_token: userToken, access_token: `${process.env.FB_LIVE_APP_ID}|${process.env.FB_LIVE_APP_SECRET}` });
    const j = (await (await fetch(`${GRAPH}/debug_token?${q}`, { signal: AbortSignal.timeout(10_000) })).json()) as { data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] } };
    const ids = (j.data?.granular_scopes ?? []).filter((g) => /^pages_/.test(g.scope)).flatMap((g) => g.target_ids ?? []);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

/** `code` → token de usuario de larga duración → páginas que administra, con su token de página. */
export async function facebookPagesFor(code: string): Promise<{ id: string; name: string; token: string }[]> {
  const id = process.env.FB_LIVE_APP_ID as string;
  const secret = process.env.FB_LIVE_APP_SECRET as string;
  const q = new URLSearchParams({ client_id: id, client_secret: secret, redirect_uri: fbRedirectUri(), code });
  const r = (await (await fetch(`${GRAPH}/oauth/access_token?${q}`, { signal: AbortSignal.timeout(15_000) })).json()) as { access_token?: string; error?: { message?: string } };
  if (!r.access_token) throw new Error(r.error?.message ?? "Meta no devolvió token");
  // El token de página derivado de uno de usuario de LARGA duración no caduca.
  const q2 = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: r.access_token });
  const l = (await (await fetch(`${GRAPH}/oauth/access_token?${q2}`, { signal: AbortSignal.timeout(15_000) })).json().catch(() => ({}))) as { access_token?: string };
  const userToken = l.access_token ?? r.access_token;
  return listPages(fetch, userToken, await grantedPageIds(userToken));
}

/** Guarda la página elegida (token cifrado) y devuelve a dónde regresar en el panel. */
export async function saveFacebookPage(st: ConnectState, page: { id: string; name: string; token: string }): Promise<string> {
  const fields = {
    tokenEnc: Uint8Array.from(encryptSecret(page.token)),
    accountId: page.id,
    accountName: page.name,
    connectedBy: st.email,
    streamId: null,
    lastWatchUrl: null,
    lastPreparedAt: null,
  };
  const existing = await db.streamDestination.findFirst({ where: { communityId: st.communityId, provider: "facebook" } });
  if (existing) await db.streamDestination.update({ where: { id: existing.id }, data: fields });
  else await db.streamDestination.create({ data: { communityId: st.communityId, provider: "facebook", ...fields } });
  return backTo(st.slug, "ok", "Página de Facebook conectada.");
}

/** Regreso al panel cuando el flujo de Facebook termina sin guardar. */
export const facebookBack = backTo;

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

/**
 * Destinos FIJOS de la caja de llamadas (llaves manuales en su env): toda transmisión de la caja
 * sale también por ellos, sea de la comunidad que sea. Sólo nombres. Vacío si no hay o no contesta.
 */
export async function boxFixedTargets(): Promise<string[]> {
  const r = await boxGet("/admin/live/targets", 4_000).catch(() => null);
  const t = r?.ok ? (r.json as { targets?: unknown } | null)?.targets : null;
  return Array.isArray(t) ? t.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
}

export async function liveStatus(communityId: string) {
  const [rows, fixedTargets] = await Promise.all([
    db.streamDestination.findMany({ where: { communityId, provider: { in: ["youtube", "facebook"] } } }).catch(() => []),
    boxFixedTargets(),
  ]);
  const row = rows.find((r) => r.provider === "youtube");
  const fb = rows.find((r) => r.provider === "facebook");
  return {
    configured: youtubeConfigured(),
    facebookConfigured: facebookConfigured(),
    fixedTargets,
    facebook: fb
      ? {
          account: fb.accountName,
          pageUrl: `https://www.facebook.com/${fb.accountId}`,
          lastWatchUrl: fb.lastWatchUrl,
          lastPreparedAt: fb.lastPreparedAt?.toISOString() ?? null,
        }
      : null,
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

/** Nombres de los destinos conectados («YouTube», «Facebook»): es lo único que conoce la sala. */
export async function liveTargetNames(communityId: string): Promise<string[]> {
  const rows = await db.streamDestination.findMany({ where: { communityId, provider: { in: ["youtube", "facebook"] } }, select: { provider: true } }).catch(() => []);
  const out: string[] = [];
  if (youtubeConfigured() && rows.some((r) => r.provider === "youtube")) out.push("YouTube");
  if (facebookConfigured() && rows.some((r) => r.provider === "facebook")) out.push("Facebook");
  return out;
}

export async function setYouTubePrivacy(communityId: string, privacy: unknown) {
  if (!isPrivacy(privacy)) return false;
  const r = await db.streamDestination.updateMany({ where: { communityId, provider: "youtube" }, data: { privacy } });
  return r.count > 0;
}

/**
 * Le retira a nuestra app el permiso del canal en Google. Es lo que promete el aviso de privacidad:
 * «Desconectar» no sólo borra el token de aquí, también lo deja inservible. Nunca lanza.
 */
export async function revokeGoogleToken(refreshToken: string, f: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await f(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function disconnectDestination(communityId: string, provider: unknown) {
  if (provider !== "youtube" && provider !== "facebook") return false;
  if (provider === "youtube") {
    const rows = await db.streamDestination.findMany({ where: { communityId, provider }, select: { id: true, tokenEnc: true } });
    for (const row of rows) {
      accessCache.delete(row.id);
      // Si Google no contesta, el token se borra de todos modos: aquí ya no queda copia.
      let token: string | null = null;
      try {
        token = decryptSecret(row.tokenEnc);
      } catch {}
      if (token && !(await revokeGoogleToken(token))) console.error("[club-live] Google no confirmó la revocación", communityId);
    }
  }
  const r = await db.streamDestination.deleteMany({ where: { communityId, provider } });
  return r.count > 0;
}

// ── Preparar la transmisión y firmar el sobre ─────────────────────────────────
export type Prepared = { targets: { name: string; url: string }[]; watchUrls: string[]; errors: string[] };

/** Crea el evento en cada destino conectado. Sin destinos conectados devuelve todo vacío. */
export async function prepareBroadcasts(communityId: string, title: string): Promise<Prepared> {
  const out: Prepared = { targets: [], watchUrls: [], errors: [] };
  const [rows, community] = await Promise.all([
    db.streamDestination.findMany({ where: { communityId, provider: { in: ["youtube", "facebook"] } } }),
    db.community.findUnique({ where: { id: communityId }, select: { unlisted: true } }),
  ]);
  // Un destino que falla no tumba al otro: el error va por destino.
  await Promise.all(
    rows.map(async (row) => {
      if (row.provider === "youtube") {
        if (!youtubeConfigured()) return;
        try {
          const access = await googleAccessToken(row.id, decryptSecret(row.tokenEnc));
          const s = await ensureStream(fetch, access, row.streamId);
          // Siempre pública (bliss, 18-nov): el webinar salió «no listado» y la audiencia no lo encontró.
          // Excepción: una comunidad fuera del directorio (de prueba o privada) transmite como oculta.
          const privacy: Privacy = community?.unlisted ? "unlisted" : "public";
          const b = await createBroadcast(fetch, access, { title, privacy, streamId: s.streamId });
          out.targets.push({ name: "YouTube", url: s.rtmpUrl });
          out.watchUrls.push(b.watchUrl);
          await db.streamDestination.update({ where: { id: row.id }, data: { streamId: s.streamId, lastWatchUrl: b.watchUrl, lastPreparedAt: new Date() } });
        } catch (e) {
          console.error("[club-live] no se pudo preparar YouTube", communityId, e instanceof Error ? e.message : e);
          out.errors.push(`YouTube: ${e instanceof Error ? e.message : "falló"}`);
        }
      } else if (row.provider === "facebook") {
        if (!facebookConfigured()) return;
        try {
          // Facebook no reutiliza la llave: cada transmisión es un `live_video` nuevo en la página.
          const v = await createLiveVideo(fetch, decryptSecret(row.tokenEnc), { pageId: row.accountId, title });
          out.targets.push({ name: "Facebook", url: v.rtmpUrl });
          out.watchUrls.push(v.watchUrl);
          await db.streamDestination.update({ where: { id: row.id }, data: { lastWatchUrl: v.watchUrl, lastPreparedAt: new Date() } });
        } catch (e) {
          console.error("[club-live] no se pudo preparar Facebook", communityId, e instanceof Error ? e.message : e);
          out.errors.push(`Facebook: ${e instanceof Error ? e.message : "falló"}`);
        }
      }
    }),
  );
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
