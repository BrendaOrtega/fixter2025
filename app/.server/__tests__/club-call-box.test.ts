import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Filas en memoria para probar `listRecordings` (reconcile) sin base.
const rows: Array<Record<string, any>> = [];
vi.mock("~/.server/db", () => ({
  db: {
    communityRecording: {
      findMany: async ({ where }: any) => rows.filter((r) => !where.status || r.status === where.status),
      findFirst: async () => null,
      update: async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id)!, data),
    },
  },
}));
vi.mock("~/.server/tigrs", () => ({ fileExist: async () => false }));
vi.mock("~/.server/hls", () => ({ buildHlsProxyUrl: (k: string) => `/hls/${k}` }));

import { recordingCall, viewState } from "../services/club-call-box.server";
import { listRecordings, recordingState, startRecording } from "../services/club-recording.server";

const BOX = "https://llamadas.example.com";
const TOKEN = "admin-token-de-prueba";
const ROOM = "fx-club-de-agentes-20261112";
const PREFIX = "fixtergeek/videos/club/c1/r1/hls";

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];

/** `fetch` simulado: contesta según `METHOD ruta` y anota cada llamada. */
function mockFetch(routes: Record<string, { status?: number; json: unknown } | (() => never)>) {
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({ url, method, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const hit = routes[`${method} ${new URL(url).pathname}`];
    if (!hit) throw new Error(`ruta sin simular: ${method} ${url}`);
    if (typeof hit === "function") return hit();
    return new Response(JSON.stringify(hit.json), { status: hit.status ?? 200, headers: { "content-type": "application/json" } });
  });
}
const idle = { recording: false, id: null, room: null, startedAt: null, live: [], liveAllowed: true, maxMinutes: 120, lastStop: null };
const active = { ...idle, recording: true, id: "abc123-ff00aa", room: ROOM, startedAt: "2026-11-12T20:00:00.000Z" };
const paths = () => calls.map((c) => `${c.method} ${new URL(c.url).pathname}`);

beforeEach(() => {
  rows.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("grabación directa a la caja (CLUB_CALL_BOX_URL + CLUB_CALL_BOX_ADMIN_TOKEN)", () => {
  beforeEach(() => {
    vi.stubEnv("CLUB_CALL_BOX_URL", `${BOX}/`);
    vi.stubEnv("CLUB_CALL_BOX_ADMIN_TOKEN", TOKEN);
  });

  it("state: GET /rec/state con Bearer, y sólo los tres campos de RecState hacia afuera", async () => {
    mockFetch({ "GET /rec/state": { json: active } });
    expect(await recordingState(ROOM)).toEqual({ recording: true, busy: false, startedAt: "2026-11-12T20:00:00.000Z" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BOX}/rec/state`);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[0].body).toBeUndefined();
  });

  it("state: otra sala grabando se ve como ocupada, y trae el plan y el lastStop de ESTA sala", async () => {
    mockFetch({ "GET /rec/state": { json: { ...active, room: "fx-otra-sala", liveAllowed: false, lastStop: { room: ROOM, reason: "max_minutes", minutes: 120, at: 1 } } } });
    const r = await recordingCall<Record<string, unknown>>({ action: "state", room: ROOM });
    expect(r.data).toMatchObject({ recording: false, busy: true, startedAt: null, liveAllowed: false, lastStop: { reason: "max_minutes" } });
  });

  it("start: revisa el estado y pide POST /admin/recording/start {room, live, title}", async () => {
    mockFetch({ "GET /rec/state": { json: idle }, "POST /admin/recording/start": { json: { ...active, live: ["YouTube"] } } });
    const r = await recordingCall<Record<string, unknown>>({ action: "start", room: ROOM, title: "Llamada", live: true });
    expect(paths()).toEqual(["GET /rec/state", "POST /admin/recording/start"]);
    expect(calls[1].headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" });
    expect(calls[1].body).toEqual({ room: ROOM, live: true, title: "Llamada" });
    expect(r).toMatchObject({ ok: true, data: { recording: true, busy: false, file: "abc123-ff00aa.mp4", live: ["YouTube"] } });
  });

  it("start: si la sala ya se graba no vuelve a arrancar y regresa el mismo archivo", async () => {
    mockFetch({ "GET /rec/state": { json: active } });
    const r = await recordingCall<Record<string, unknown>>({ action: "start", room: ROOM, title: "Llamada" });
    expect(paths()).toEqual(["GET /rec/state"]);
    expect(r.data).toMatchObject({ recording: true, file: "abc123-ff00aa.mp4" });
  });

  it("start: la caja grabando otra sala es 409 sin tocarla", async () => {
    mockFetch({ "GET /rec/state": { json: { ...active, room: "fx-otra-sala" } } });
    const r = await recordingCall({ action: "start", room: ROOM });
    expect(paths()).toEqual(["GET /rec/state"]);
    expect(r).toMatchObject({ ok: false, status: 409, data: { error: "la caja ya está grabando otra sala" } });
  });

  it("startRecording con live: si la caja lo niega, reintenta sin transmitir", async () => {
    let n = 0;
    calls = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, headers: init.headers as Record<string, string>, body });
      if (method === "GET") return Response.json(idle);
      // Primer intento (live) → el plan no transmite; el segundo falla distinto para cortar antes de la base.
      return Response.json(n++ === 0 ? { error: "Tu plan no incluye transmitir en vivo", code: "live_not_allowed" } : { error: "sin disco" }, { status: n === 1 ? 403 : 400 });
    });
    const r = await startRecording({ id: "c1" }, "Llamada", ROOM, { live: true });
    const starts = calls.filter((c) => c.method === "POST");
    expect(starts.map((c) => c.body)).toEqual([
      { room: ROOM, live: true, title: "Llamada" },
      { room: ROOM, live: false, title: "Llamada" },
    ]);
    expect(r).toEqual({ ok: false, error: "sin disco" });
  });

  it("stop: POST /admin/recording/stop {transcribe, hls, hlsPrefix} y regresa archivo y bytes", async () => {
    mockFetch({ "GET /rec/state": { json: active }, "POST /admin/recording/stop": { json: { recording: false, id: "abc123-ff00aa", file: "abc123-ff00aa.mp4", bytes: 5_000_000 } } });
    const r = await recordingCall<Record<string, unknown>>({ action: "stop", room: ROOM, hlsPrefix: PREFIX, file: "abc123-ff00aa.mp4" });
    expect(paths()).toEqual(["GET /rec/state", "POST /admin/recording/stop"]);
    expect(calls[1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[1].body).toEqual({ transcribe: true, hls: true, hlsPrefix: PREFIX });
    expect(r).toEqual({ ok: true, status: 200, data: { file: "abc123-ff00aa.mp4", bytes: 5_000_000, uploading: true } });
  });

  it("stop con la caja ya parada: rehace el HLS de ESE archivo y lanza el transcript", async () => {
    mockFetch({ "GET /rec/state": { json: idle }, "POST /admin/recording/hls": { json: { status: "running" } }, "POST /admin/recording/transcript": { json: {} } });
    const r = await recordingCall<Record<string, unknown>>({ action: "stop", room: ROOM, hlsPrefix: PREFIX, file: "abc123-ff00aa.mp4" });
    await Promise.resolve();
    expect(paths()).toEqual(["GET /rec/state", "POST /admin/recording/hls", "POST /admin/recording/transcript"]);
    expect(calls[1].body).toEqual({ file: "abc123-ff00aa.mp4", hlsPrefix: PREFIX });
    expect(calls[2].body).toEqual({ file: "abc123-ff00aa.mp4" });
    expect(r.data).toEqual({ file: "abc123-ff00aa.mp4", bytes: null, uploading: true });
  });

  it("stop sin grabación ni archivo es 409; un nombre de archivo raro no llega a la caja", async () => {
    mockFetch({ "GET /rec/state": { json: idle } });
    const r = await recordingCall({ action: "stop", room: ROOM, hlsPrefix: PREFIX, file: "../etc/passwd.mp4" });
    expect(paths()).toEqual(["GET /rec/state"]);
    expect(r).toMatchObject({ ok: false, status: 409, data: { error: "no se está grabando" } });
  });

  it("la caja no contesta el estado: 502 con error; el stop que se cuelga regresa data null", async () => {
    mockFetch({ "GET /rec/state": { status: 503, json: {} } });
    expect(await recordingCall({ action: "state", room: ROOM })).toMatchObject({ ok: false, status: 502, data: { error: "la caja no contestó" } });
    expect(await recordingState(ROOM)).toBeNull();

    mockFetch({ "GET /rec/state": { json: active }, "POST /admin/recording/stop": () => { throw new Error("timeout"); } });
    expect(await recordingCall({ action: "stop", room: ROOM, hlsPrefix: PREFIX })).toEqual({ ok: false, status: 502, data: null });
  });

  it("el token nunca sale en los logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ "GET /rec/state": { status: 401, json: { error: "unauthorized" } } });
    await recordingCall({ action: "state", room: ROOM });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
  });

  it("corte por tope de minutos: la fila `recording` pasa a `uploading` y se pide el HLS de su archivo", async () => {
    rows.push({ id: "r1", communityId: "c1", room: ROOM, title: "Llamada", status: "recording", boxFile: "abc123-ff00aa.mp4", storageKey: `${PREFIX}/master.m3u8`, createdAt: new Date(Date.now() - 3 * 3600_000), startedAt: new Date(Date.now() - 3 * 3600_000), endedAt: new Date(), hiddenAt: null });
    mockFetch({
      "GET /rec/state": { json: { ...idle, lastStop: { room: ROOM, reason: "max_minutes", minutes: 120, at: Date.now() } } },
      "POST /admin/recording/hls": { json: { status: "running" } },
      "POST /admin/recording/transcript": { json: {} },
    });
    const list = await listRecordings("c1", true);
    expect(paths().slice(0, 3)).toEqual(["GET /rec/state", "GET /rec/state", "POST /admin/recording/hls"]);
    expect(calls[2].body).toEqual({ file: "abc123-ff00aa.mp4", hlsPrefix: PREFIX });
    expect(rows[0].status).toBe("uploading");
    expect(list[0].status).toBe("uploading");
  });
});

describe("sin las variables de la caja: todo sigue por gs", () => {
  beforeEach(() => {
    vi.stubEnv("CLUB_CALL_BOX_URL", "");
    vi.stubEnv("CLUB_CALL_BOX_ADMIN_TOKEN", "");
    vi.stubEnv("GHOSTY_PARTNER_KEY", "gpk_test");
    vi.stubEnv("GHOSTY_PARTNER_KEY_SECRET", "gps_test");
    vi.stubEnv("GHOSTY_API_URL", "https://gs.example.com");
  });

  it.each([
    [{ action: "state", room: ROOM }],
    [{ action: "start", room: ROOM, title: "Llamada", live: true }],
    [{ action: "stop", room: ROOM, hlsPrefix: PREFIX, file: "abc123-ff00aa.mp4" }],
  ] as const)("%o va firmado a /api/v2/partner/event-box/recording, sin Bearer", async (payload) => {
    mockFetch({ "POST /api/v2/partner/event-box/recording": { json: { recording: false, busy: false, startedAt: null } } });
    const r = await recordingCall(payload);
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://gs.example.com/api/v2/partner/event-box/recording");
    expect(calls[0].body).toEqual(payload);
    expect(calls[0].headers["x-ghosty-key"]).toBe("gpk_test");
    expect(calls[0].headers["x-ghosty-sig"]).toMatch(/^[0-9a-f]{64}$/);
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("con sólo una de las dos variables tampoco se usa la caja", async () => {
    vi.stubEnv("CLUB_CALL_BOX_URL", BOX);
    mockFetch({ "POST /api/v2/partner/event-box/recording": { json: { recording: false, busy: false, startedAt: null } } });
    await recordingState(ROOM);
    expect(new URL(calls[0].url).host).toBe("gs.example.com");
  });
});

describe("viewState", () => {
  it("acepta startedAt en milisegundos o ISO", () => {
    expect(viewState(ROOM, { recording: true, room: ROOM, startedAt: 1_800_000_000_000 }).startedAt).toBe(new Date(1_800_000_000_000).toISOString());
    expect(viewState(ROOM, null)).toEqual({ recording: false, busy: false, startedAt: null });
  });
});
