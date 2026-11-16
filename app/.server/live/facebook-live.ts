// Facebook en vivo por la Live Video API (núcleo sin imports de la app: recibe el token de PÁGINA y
// un `fetch`). Copia de ghosty-studio/app/lib/live/facebook-live.ts (16-nov-2026).
//
// Sólo páginas: Meta ya no deja transmitir a perfiles personales por API. Cada transmisión es un
// `live_video` nuevo con su propia llave (a diferencia de YouTube, no se reutiliza): por eso se crea
// en «Preparar transmisión», justo antes del evento. Con `status=LIVE_NOW` sale al aire en cuanto
// llega el video y termina al cortarse.
export const GRAPH = "https://graph.facebook.com/v23.0";

export type Fetch = typeof fetch;

export class FacebookLiveError extends Error {}

/** Crea la transmisión en la página. Devuelve la URL RTMPS con llave y la liga pública. */
export async function createLiveVideo(
  f: Fetch,
  pageToken: string,
  o: { pageId: string; title: string; description?: string }
): Promise<{ liveVideoId: string; rtmpUrl: string; watchUrl: string }> {
  const q = new URLSearchParams({
    status: "LIVE_NOW",
    title: o.title.slice(0, 250) || "Evento en vivo",
    description: (o.description ?? "").slice(0, 5000),
    access_token: pageToken,
  });
  const r = await f(`${GRAPH}/${encodeURIComponent(o.pageId)}/live_videos`, { method: "POST", body: q, signal: AbortSignal.timeout(20_000) });
  const j = (await r.json().catch(() => ({}))) as { id?: string; secure_stream_url?: string; stream_url?: string; error?: { message?: string } };
  if (!r.ok || j.error || !j.id) throw new FacebookLiveError(j.error?.message ?? `Facebook respondió ${r.status}`);
  const rtmpUrl = j.secure_stream_url ?? j.stream_url;
  if (!rtmpUrl) throw new FacebookLiveError("Facebook no devolvió la dirección de transmisión");
  // La liga pública sale del propio video; si Meta no la da, la del video en la página.
  let watchUrl = `https://www.facebook.com/${o.pageId}/videos/${j.id}`;
  try {
    const p = (await (await f(`${GRAPH}/${encodeURIComponent(j.id)}?fields=permalink_url&access_token=${encodeURIComponent(pageToken)}`, { signal: AbortSignal.timeout(10_000) })).json()) as { permalink_url?: string };
    if (p.permalink_url) watchUrl = p.permalink_url.startsWith("http") ? p.permalink_url : `https://www.facebook.com${p.permalink_url}`;
  } catch {
    /* la liga armada a mano basta */
  }
  return { liveVideoId: j.id, rtmpUrl, watchUrl };
}

/**
 * Las páginas a las que el usuario dio acceso, con su token de página. `/me/accounts` sólo trae
 * las de rol directo; las que se conceden por un portafolio de negocio (Login para empresas) no
 * salen ahí, así que también se piden una por una las de `granted` (ids de `debug_token`).
 */
export async function listPages(f: Fetch, userToken: string, granted: string[] = []): Promise<{ id: string; name: string; token: string }[]> {
  const r = await f(`${GRAPH}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(userToken)}`, { signal: AbortSignal.timeout(15_000) });
  const j = (await r.json().catch(() => ({}))) as { data?: { id: string; name: string; access_token: string }[]; error?: { message?: string } };
  if (j.error && !granted.length) throw new FacebookLiveError(j.error.message ?? "no pude listar tus páginas");
  const out = new Map((j.data ?? []).map((p) => [p.id, { id: p.id, name: p.name, token: p.access_token }]));
  for (const id of granted.filter((id) => !out.has(id))) {
    try {
      const p = (await (await f(`${GRAPH}/${encodeURIComponent(id)}?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`, { signal: AbortSignal.timeout(10_000) })).json()) as { id?: string; name?: string; access_token?: string };
      if (p.id && p.access_token) out.set(p.id, { id: p.id, name: p.name ?? p.id, token: p.access_token });
    } catch {
      /* una página que no responde no tumba la lista */
    }
  }
  return [...out.values()];
}
