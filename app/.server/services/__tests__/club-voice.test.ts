import { beforeEach, describe, expect, it, vi } from "vitest";
import { clubCallRoom } from "../club-call.server";
import { issueVoiceToken, resetVoice, resolveWsUrl, seatedTable, setVoiceEnabled, tableRoster, TOKENS_PER_MINUTE, voiceEnabled, voiceRoom } from "../club-voice.server";
import { removeShip, resetWorlds, upsertShip } from "../club-world.server";

const C = "c1";
const T0 = Date.UTC(2026, 10, 13, 1, 0, 0); // 12-nov-2026 19:00 en CDMX
const who = (id: string) => ({ id, name: `Miembro ${id}`, photoURL: `/api/avatar/${id}` });
const ENV = { CLUB_CALL_BOX_URL: "https://sb-abc-8088.sandboxes.example", CLUB_CALL_TICKET_SECRET: "secreto-de-prueba" };

/** Caja falsa: `/room` trae la URL del SFU y `/join` contesta lo que se le diga. */
function fakeBox(join: (ticket: Record<string, unknown>) => { status: number; body: unknown } = () => ({ status: 200, body: { token: "lk-token", identity: "Miembro a#abc123" } })) {
  const calls: { url: string; claims?: Record<string, unknown> }[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/room")) { calls.push({ url }); return new Response('<script>const WS_URL = "wss://sfu.example";</script>'); }
    const { ticket } = JSON.parse(String(init?.body));
    const claims = JSON.parse(Buffer.from(ticket.split(".")[0], "base64url").toString());
    calls.push({ url, claims });
    const r = join(claims);
    return Response.json(r.body, { status: r.status });
  }) as unknown as typeof fetch;
  return { fetchFn, calls, joins: () => calls.filter((c) => c.url.endsWith("/join")) };
}
const sit = (id: string, table: number, community = C) => upsertShip(community, who(id), { x: 100, y: 100, table }, T0);
const ask = (id: string, zone: unknown, box = fakeBox(), env: Record<string, string | undefined> = ENV, community = C) =>
  issueVoiceToken({ communityId: community, slug: "club-de-agentes", who: who(id), zone }, { fetch: box.fetchFn, now: T0, env });

describe("voz en las mesas del Mundo", () => {
  beforeEach(() => { resetWorlds(); resetVoice(); });

  it("la sala se deriva de comunidad + día en CDMX + mesa, con el prefijo de la caja, y nunca es la sala principal", () => {
    const d = new Date(T0);
    expect(voiceRoom("club-de-agentes", 0, d)).toBe("fx-mesa-club-de-agentes-20261112-1");
    expect(voiceRoom("club-de-agentes", 2, d)).toBe("fx-mesa-club-de-agentes-20261112-3");
    expect(voiceRoom("Otro Club/../x", 1, d)).toBe("fx-mesa-otroclubx-20261112-2");
    for (const t of [0, 1, 2]) {
      expect(voiceRoom("club-de-agentes", t, d).startsWith("fx-")).toBe(true);
      expect(voiceRoom("club-de-agentes", t, d)).not.toBe(clubCallRoom(d));
      expect(voiceRoom("club-de-agentes", t, d).startsWith(clubCallRoom(d))).toBe(false);
    }
  });

  it("el interruptor arranca apagado y sólo lo cambia quien administra", () => {
    expect(voiceEnabled(C)).toBe(false);
    expect(setVoiceEnabled({ communityId: C, canManage: false, on: true })).toMatchObject({ ok: false, status: 403 });
    expect(voiceEnabled(C)).toBe(false);
    expect(setVoiceEnabled({ communityId: C, canManage: true, on: "sí" })).toMatchObject({ ok: false, status: 400 });
    expect(setVoiceEnabled({ communityId: C, canManage: true, on: true })).toEqual({ ok: true, enabled: true });
    expect(voiceEnabled(C)).toBe(true);
    expect(voiceEnabled("otra")).toBe(false);
    expect(setVoiceEnabled({ communityId: C, canManage: true, on: false })).toEqual({ ok: true, enabled: false });
    expect(voiceEnabled(C)).toBe(false);
  });

  it("apagado no da token ni toca la caja, aunque la persona esté sentada", async () => {
    sit("a", 0);
    const box = fakeBox();
    expect(await ask("a", "0", box)).toMatchObject({ ok: false, status: 403, code: "voice_off" });
    expect(box.fetchFn).not.toHaveBeenCalled();
  });

  it("no da token a quien no está sentado, ni para una mesa que no es la suya", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    const box = fakeBox();
    expect(await ask("a", "0", box)).toMatchObject({ ok: false, code: "not_seated" }); // ni siquiera está en el mundo
    upsertShip(C, who("a"), { x: 100, y: 100 }, T0);
    expect(await ask("a", "0", box)).toMatchObject({ ok: false, code: "not_seated" }); // de pie
    sit("a", 1);
    expect(seatedTable(C, "a", T0)).toBe(1);
    expect(await ask("a", "0", box)).toMatchObject({ ok: false, code: "not_seated" }); // pide otra mesa
    expect(await ask("a", null, box)).toMatchObject({ ok: false, code: "not_seated" });
    expect(box.fetchFn).not.toHaveBeenCalled();
    removeShip(C, "a");
    expect(await ask("a", "1", box)).toMatchObject({ ok: false, code: "not_seated" });
  });

  it("sentado y encendido: canjea en la caja un ticket de speaker para la sala de SU mesa y regresa sólo token y wss", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    sit("a", 2);
    const box = fakeBox();
    const r = await ask("a", "2", box);
    expect(r).toEqual({ ok: true, token: "lk-token", wsUrl: "wss://sfu.example", identity: "Miembro a#abc123", table: 2 });
    const [join] = box.joins();
    expect(join.url).toBe("https://sb-abc-8088.sandboxes.example/join");
    expect(join.claims).toMatchObject({ room: "fx-mesa-club-de-agentes-20261112-3", role: "speaker", name: "Miembro a" });
    expect(join.claims).not.toHaveProperty("title");
    // Nunca se toca nada de grabación.
    expect(box.calls.every((c) => !/rec|admin|host/.test(new URL(c.url).pathname))).toBe(true);
    expect(JSON.stringify(r)).not.toContain(ENV.CLUB_CALL_TICKET_SECRET);
  });

  it("sin variables de la caja contesta «no configurada» y no truena", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    sit("a", 0);
    expect(await ask("a", "0", fakeBox(), {})).toMatchObject({ ok: false, status: 503, code: "not_configured" });
  });

  it("los topes de la caja llegan como «llena»; otros errores, como error de caja", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    // Una persona distinta por intento: el freno por persona se prueba aparte.
    for (const id of ["a", "b", "c", "d"]) sit(id, 0);
    upsertShip(C, who("e"), { x: 100, y: 100, table: 1 }, T0);
    for (const [id, code] of [["a", "room_full"], ["b", "box_full"], ["c", "rooms_limit"]]) {
      const r = await ask(id, "0", fakeBox(() => ({ status: 409, body: { error: "x", code } })));
      expect(r).toMatchObject({ ok: false, status: 409, code: "full" });
    }
    expect(await ask("d", "0", fakeBox(() => ({ status: 403, body: { error: "firma inválida", code: "ticket_rejected" } })))).toMatchObject({ ok: false, code: "box_error" });
    const down = { fetchFn: (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch } as ReturnType<typeof fakeBox>;
    expect(await ask("e", "1", down, { ...ENV, CLUB_CALL_WS_URL: "wss://x" })).toMatchObject({ ok: false, status: 502, code: "box_error" });
  });

  it("deja libre la sala principal: sólo CLUB_VOICE_MAX_ROOMS mesas con voz a la vez, y se liberan al levantarse", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    sit("a", 0); sit("b", 1); sit("c", 2); sit("d", 0);
    const box = fakeBox();
    expect(await ask("a", "0", box)).toMatchObject({ ok: true });
    expect(await ask("b", "1", box)).toMatchObject({ ok: true });
    expect(await ask("c", "2", box)).toMatchObject({ ok: false, status: 409, code: "full" }); // tercera mesa: no
    expect(await ask("d", "0", box)).toMatchObject({ ok: true }); // mesa que ya tiene voz: sí
    expect(box.joins()).toHaveLength(3);
    // b se levanta: su mesa deja de contar y la tercera ya cabe.
    upsertShip(C, who("b"), { x: 100, y: 100 }, T0);
    expect(await ask("c", "2", box)).toMatchObject({ ok: true });
    // Una variable vacía es el default (2), no «cero mesas»; en 0 no hay voz en ninguna.
    resetVoice(); setVoiceEnabled({ communityId: C, canManage: true, on: true });
    expect(await ask("a", "0", box, { ...ENV, CLUB_VOICE_MAX_ROOMS: "" })).toMatchObject({ ok: true });
    resetVoice(); setVoiceEnabled({ communityId: C, canManage: true, on: true });
    expect(await ask("a", "0", box, { ...ENV, CLUB_VOICE_MAX_ROOMS: "0" })).toMatchObject({ ok: false, code: "full" });
    // Con el tope en 3 caben las tres.
    resetVoice(); setVoiceEnabled({ communityId: C, canManage: true, on: true });
    sit("b", 1);
    const env3 = { ...ENV, CLUB_VOICE_MAX_ROOMS: "3" };
    for (const [id, z] of [["a", "0"], ["b", "1"], ["c", "2"]]) expect(await ask(id, z, box, env3)).toMatchObject({ ok: true });
  });

  it("frena a quien pide tokens sin parar", async () => {
    setVoiceEnabled({ communityId: C, canManage: true, on: true });
    sit("a", 0);
    const box = fakeBox();
    for (let i = 0; i < TOKENS_PER_MINUTE; i++) expect(await ask("a", "0", box)).toMatchObject({ ok: true });
    expect(await ask("a", "0", box)).toMatchObject({ ok: false, status: 429, code: "too_many" });
  });

  it("la lista de la mesa trae sólo nombre y foto de quienes están sentados ahí", () => {
    sit("a", 0); sit("b", 0); sit("c", 1);
    expect(tableRoster(C, 0, T0)).toEqual([{ name: "Miembro a", photoURL: "/api/avatar/a" }, { name: "Miembro b", photoURL: "/api/avatar/b" }]);
  });

  it("la URL del SFU: variable explícita, lo que inyecta la caja en /room, o deducida de su URL", async () => {
    expect(await resolveWsUrl(ENV.CLUB_CALL_BOX_URL, { env: { CLUB_CALL_WS_URL: "wss://fijo" } })).toBe("wss://fijo");
    expect(await resolveWsUrl(ENV.CLUB_CALL_BOX_URL, { env: {}, fetch: fakeBox().fetchFn })).toBe("wss://sfu.example");
    resetVoice();
    const sinWs = (async () => new Response('const WS_URL = "";')) as unknown as typeof fetch;
    expect(await resolveWsUrl(ENV.CLUB_CALL_BOX_URL, { env: {}, fetch: sinWs })).toBe("wss://sb-abc-7880.sandboxes.example");
    resetVoice();
    expect(await resolveWsUrl("https://llamadas.example", { env: {}, fetch: sinWs })).toBeNull();
  });
});
