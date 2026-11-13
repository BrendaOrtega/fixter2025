// Control de grabación directo contra la caja de llamadas de fixter (12-nov-2026).
//
// Hasta hoy fixter le pedía la grabación a gs (`POST /api/v2/partner/event-box/recording`) y gs se
// la pedía a la caja con su ADMIN_TOKEN. Con la caja propia (fork `fixter-call-svc` de sandbox-host)
// fixter habla con ella sin puente. Este archivo replica, llamada por llamada, lo que hace la ruta
// de gs (`ghosty-studio/app/routes/api.v2.partner.event-box.recording.ts`):
//
//   state → GET  /rec/state
//   start → GET  /rec/state, y si la sala no se graba: POST /admin/recording/start {room, live, title?}
//   stop  → GET  /rec/state, y
//           · si la sala se graba:  POST /admin/recording/stop {transcribe: true, hls: true, hlsPrefix}
//           · si ya paró y hay `file`: POST /admin/recording/hls {file, hlsPrefix}
//                                      + POST /admin/recording/transcript {file} (sin esperar)
//
// El segundo caso de `stop` cubre los dos paros que nadie pidió: los 3 min sin nadie publicando y
// el tope de minutos del plan (`lastStop` en `/rec/state`). En ambos el MP4 se queda en el disco
// de la caja y el HLS se pide después con el nombre del archivo.
//
// La caja convierte a HLS y lo sube ELLA al bucket de video con las llaves `HLS_*` de SU env
// (`HLS_ACCESS_KEY_ID`, `HLS_SECRET_ACCESS_KEY`, `HLS_ENDPOINT`, `HLS_BUCKET`, `HLS_REGION`); aquí
// sólo viaja el prefijo. Las llaves RTMP tampoco viajan: `live` es un booleano y la caja lee
// `RTMP_TARGETS` de su env.
//
// Env (las dos juntas activan este camino; sin ellas todo sigue por gs, sin cambio):
//   CLUB_CALL_BOX_URL          https://… de la caja de llamadas de fixter (la misma del ticket)
//   CLUB_CALL_BOX_ADMIN_TOKEN  el ADMIN_TOKEN de ESA caja (nunca sale del servidor ni se imprime)
import { partnerPost } from "~/.server/services/club-call.server";

const PARTNER_PATH = "/api/v2/partner/event-box/recording";
const DEFAULT_TIMEOUT_MS = 30_000;

export type RecordingPayload =
  | { action: "state"; room: string }
  | { action: "start"; room: string; title?: string; live?: boolean; liveEnvelope?: string }
  | { action: "stop"; room: string; hlsPrefix?: string; file?: string };

type Result<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null };

/** Lo que contesta `GET /rec/state` de la caja (sólo lo que aquí se usa). */
export type BoxRecState = {
  recording?: boolean;
  id?: string | null;
  room?: string | null;
  startedAt?: string | number | null;
  live?: string[];
  liveAllowed?: boolean;
  maxMinutes?: number | null;
  /** Último paro automático (hoy: tope de minutos del plan). Vive en la memoria de la caja. */
  lastStop?: { room: string; reason: string; minutes?: number | null; at: number } | null;
};

export function boxConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.CLUB_CALL_BOX_URL?.trim().replace(/\/$/, "");
  const token = process.env.CLUB_CALL_BOX_ADMIN_TOKEN?.trim();
  return baseUrl && token ? { baseUrl, token } : null;
}

/**
 * La grabación vista desde UNA sala (gemelo de `viewState` de gs): la caja tiene un solo grabador,
 * así que si graba otra sala, ésta sólo se entera de que está ocupada.
 */
export function viewState(room: string, state: BoxRecState | null) {
  if (!state?.recording) return { recording: false, busy: false, startedAt: null as string | null };
  if (state.room !== room) return { recording: false, busy: true, startedAt: null as string | null };
  const t = state.startedAt;
  return { recording: true, busy: false, startedAt: t == null ? null : new Date(t).toISOString() };
}

const fileOf = (j: { id?: unknown } | null) =>
  typeof j?.id === "string" && /^[\w.-]+$/.test(j.id) ? `${j.id}.mp4` : null;

/** Una llamada a la caja. `json: null` = no hubo respuesta (timeout o red). */
async function box(
  cfg: { baseUrl: string; token: string },
  path: string,
  payload: unknown | undefined,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: payload === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Cache-Control": "no-store",
        ...(payload === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    if (!res.ok) console.error(`[club-call-box] la caja ${path} contestó ${res.status}: ${String(json.error ?? "")}`);
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    console.error(`[club-call-box] no pude llamar a la caja ${path}:`, e instanceof Error ? e.message : e);
    return { ok: false, status: 502, json: null };
  }
}

/** GET de solo lectura a la caja (transcript, estado). `null` sin configuración o sin respuesta. */
export async function boxGet(path: string, timeoutMs = 30_000) {
  const cfg = boxConfig();
  if (!cfg) return null;
  return box(cfg, path, undefined, timeoutMs);
}

const fail = <T>(status: number, error: string, extra: Record<string, unknown> = {}): Result<T> => ({
  ok: false,
  status,
  data: { error, ...extra } as unknown as T & { error?: string },
});
const done = <T>(data: Record<string, unknown>): Result<T> => ({ ok: true, status: 200, data: data as unknown as T & { error?: string } });

/**
 * Lo mismo que contestaría gs, pero preguntándole directo a la caja. Mismo contrato que
 * `partnerPost`: `data: null` sólo cuando no hubo respuesta.
 */
export async function boxRecording<T = Record<string, unknown>>(
  cfg: { baseUrl: string; token: string },
  req: RecordingPayload,
  opts: { timeoutMs?: number } = {}
): Promise<Result<T>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // `/rec/state` y no `/health`: el proxy de sandbox-host le quita el campo `recording` a /health.
  const st = await box(cfg, "/rec/state", undefined, Math.min(timeoutMs, DEFAULT_TIMEOUT_MS));
  if (!st.ok) return fail(502, "la caja no contestó");
  const state = st.json as BoxRecState;
  const view = viewState(req.room, state);
  // Lo que el plan de la caja permite y el último paro automático, por si quien llama lo quiere.
  const plan = {
    liveAllowed: state.liveAllowed ?? true,
    maxMinutes: state.maxMinutes ?? null,
    lastStop: state.lastStop && state.lastStop.room === req.room ? state.lastStop : null,
  };

  if (req.action === "state") return done({ ...view, ...plan });

  if (req.action === "start") {
    if (view.busy) return fail(409, "la caja ya está grabando otra sala", view);
    if (view.recording) return done({ ...view, file: fileOf(state) });
    const r = await box(
      cfg,
      "/admin/recording/start",
      // `liveEnvelope`: destinos de la comunidad (YouTube por OAuth) en un sobre firmado de un solo uso.
      { room: req.room, live: !!req.live, ...(req.liveEnvelope ? { liveEnvelope: req.liveEnvelope } : {}), ...(req.title ? { title: req.title.trim().slice(0, 120) } : {}) },
      timeoutMs
    );
    if (!r.json) return { ok: false, status: 502, data: null };
    if (!r.ok) return fail(502, String(r.json.error ?? "no se pudo grabar"), r.json.code ? { code: r.json.code } : {});
    // Revisión después de arrancar: si otra sala ganó la carrera, la caja devuelve LA SUYA.
    const after = viewState(req.room, r.json as BoxRecState);
    if (!after.recording) return fail(409, "la caja ya está grabando otra sala", after);
    return done({ ...after, file: fileOf(r.json), live: Array.isArray(r.json.live) ? r.json.live : [] });
  }

  // stop
  const file = req.file && /^[\w-]+\.mp4$/.test(req.file) ? req.file : null;
  if (!req.hlsPrefix) return fail(400, "stop pide hlsPrefix");
  // La caja ya paró (3 min sin nadie, tope de minutos, o un reintento): HLS de ESE archivo.
  if (!view.recording && file) {
    const h = await box(cfg, "/admin/recording/hls", { file, hlsPrefix: req.hlsPrefix }, timeoutMs);
    if (!h.json) return { ok: false, status: 502, data: null };
    if (!h.ok) return fail(502, String(h.json.error ?? "la caja no tiene ese archivo"));
    // whisper mantiene la caja despierta mientras convierte (`/busy` no cuenta el HLS).
    void box(cfg, "/admin/recording/transcript", { file }, DEFAULT_TIMEOUT_MS).catch(() => null);
    return done({ file, bytes: null, uploading: true });
  }
  if (!view.recording) return fail(409, view.busy ? "la caja graba otra sala" : "no se está grabando", view);
  // La caja transcodifica (1080/720/480 + póster + miniaturas) y sube al bucket con sus `HLS_*`.
  const r = await box(cfg, "/admin/recording/stop", { transcribe: true, hls: true, hlsPrefix: req.hlsPrefix }, timeoutMs);
  // Sin respuesta la caja pudo haber parado igual: quien llama decide (hoy: `uploading` y el HEAD dirá).
  if (!r.json) return { ok: false, status: 502, data: null };
  const stopped = typeof r.json.file === "string" ? r.json.file : null;
  if (!r.ok || !stopped) return fail(502, String(r.json.error ?? "no se pudo parar"));
  return done({ file: stopped, bytes: r.json.bytes ?? null, uploading: true });
}

/** Grabación de una sala: directo a la caja si está configurada; si no, por gs como siempre. */
export function recordingCall<T = Record<string, unknown>>(
  req: RecordingPayload,
  opts: { timeoutMs?: number } = {}
): Promise<Result<T>> {
  const cfg = boxConfig();
  return cfg ? boxRecording<T>(cfg, req, opts) : partnerPost<T>(PARTNER_PATH, req, opts);
}
