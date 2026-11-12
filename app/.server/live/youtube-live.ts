// YouTube en vivo por la Data API v3 (núcleo sin imports de la app: recibe el token de acceso y un
// `fetch`). Copia de ghosty-studio/app/lib/live/youtube-live.ts (12-nov-2026).
//
// El modelo de YouTube: un `liveStream` es la ENTRADA (URL de ingesta + llave, reutilizable) y un
// `liveBroadcast` es el EVENTO que ve la gente (título, privacidad). Se crea el stream una vez por
// canal y cada evento crea un broadcast nuevo y lo amarra (`bind`) al mismo stream. Con
// `enableAutoStart/Stop` el broadcast se pone en vivo solo cuando llega video y termina cuando se
// corta: nadie tiene que apretar «Go live» en YouTube Studio.
const API = "https://www.googleapis.com/youtube/v3";

export type Fetch = typeof fetch;
export type Privacy = "public" | "unlisted" | "private";

export class YouTubeLiveError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly reason = ""
  ) {
    super(message);
  }
}

async function call<T>(f: Fetch, token: string, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const r = await f(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string; errors?: { reason?: string }[] } };
  if (!r.ok || j.error) {
    const reason = j.error?.errors?.[0]?.reason ?? "";
    // El caso que más se ve: el canal nunca ha transmitido y YouTube tarda 24 h en habilitarlo.
    const msg = reason === "liveStreamingNotEnabled" ? "el canal de YouTube no tiene habilitada la transmisión en vivo (se activa en YouTube Studio y tarda hasta 24 h)" : j.error?.message ?? `YouTube respondió ${r.status}`;
    throw new YouTubeLiveError(msg, r.status, reason);
  }
  return j;
}

/** El canal de la cuenta conectada (para enseñar a dónde va a salir). */
export async function myChannel(f: Fetch, token: string): Promise<{ id: string; title: string } | null> {
  const j = await call<{ items?: { id: string; snippet?: { title?: string } }[] }>(f, token, "GET", "/channels?part=snippet&mine=true");
  const c = j.items?.[0];
  return c ? { id: c.id, title: c.snippet?.title ?? c.id } : null;
}

type StreamRes = { id: string; cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } } };

const ingestUrl = (s: StreamRes): string | null => {
  const addr = s.cdn?.ingestionInfo?.ingestionAddress;
  const key = s.cdn?.ingestionInfo?.streamName;
  return addr && key ? `${addr.replace(/\/+$/, "")}/${key}` : null;
};

/** El stream reutilizable: el guardado si sigue existiendo, o uno nuevo. Devuelve su id y la URL RTMP con llave. */
export async function ensureStream(f: Fetch, token: string, knownId: string | null): Promise<{ streamId: string; rtmpUrl: string }> {
  if (knownId) {
    const j = await call<{ items?: StreamRes[] }>(f, token, "GET", `/liveStreams?part=id,cdn&id=${encodeURIComponent(knownId)}`);
    const s = j.items?.[0];
    const url = s && ingestUrl(s);
    if (s && url) return { streamId: s.id, rtmpUrl: url };
  }
  const s = await call<StreamRes>(f, token, "POST", "/liveStreams?part=snippet,cdn,contentDetails", {
    snippet: { title: "FixterGeek" },
    cdn: { frameRate: "variable", ingestionType: "rtmp", resolution: "variable" },
    contentDetails: { isReusable: true },
  });
  const url = ingestUrl(s);
  if (!url) throw new YouTubeLiveError("YouTube no devolvió la dirección de ingesta del stream");
  return { streamId: s.id, rtmpUrl: url };
}

/** Crea el evento (broadcast) con arranque y cierre automáticos y lo amarra al stream. */
export async function createBroadcast(
  f: Fetch,
  token: string,
  o: { title: string; description?: string; privacy: Privacy; startsAt?: Date; streamId: string }
): Promise<{ broadcastId: string; watchUrl: string }> {
  const b = await call<{ id: string }>(f, token, "POST", "/liveBroadcasts?part=snippet,status,contentDetails", {
    snippet: {
      // YouTube corta el título a 100 caracteres y lo rechaza con < o >.
      title: o.title.replace(/[<>]/g, "").slice(0, 100) || "Evento en vivo",
      description: (o.description ?? "").replace(/[<>]/g, "").slice(0, 4900),
      scheduledStartTime: (o.startsAt && o.startsAt.getTime() > Date.now() ? o.startsAt : new Date()).toISOString(),
    },
    status: { privacyStatus: o.privacy, selfDeclaredMadeForKids: false },
    contentDetails: { enableAutoStart: true, enableAutoStop: true, latencyPreference: "low" },
  });
  await call(f, token, "POST", `/liveBroadcasts/bind?part=id,contentDetails&id=${encodeURIComponent(b.id)}&streamId=${encodeURIComponent(o.streamId)}`);
  return { broadcastId: b.id, watchUrl: `https://www.youtube.com/watch?v=${b.id}` };
}
