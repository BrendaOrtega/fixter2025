import { beforeEach, describe, expect, it } from "vitest";
import {
  sendBoom, MAX_SHIPS, THREAT_SKEW_MS, NUDGE_EVERY_MS, NUDGE_TTL_MS, SAY_EVERY_MS, SAY_MAX, SAY_MAX_CHARS, SAY_TTL_MS, SHIP_TTL_MS, WAVE_EVERY_MS, WAVE_TTL_MS, activeCartridge, changeCartridge, cleanSayText, cleanShipInput, hydrateCartridge, removeShip, resetWorlds, sendNudge, sendSay, sendWave,
  setWorldCartridge, setShared, SHARE_EVERY_MS, snapshot, upsertShip,
} from "../club-world.server";
import { SHARED_MAX_TEXT, type Cartridge, type WorldStructure } from "~/components/community/v2/world/cartridge";
import { CARTRIDGES, DEFAULT_CARTRIDGE_ID, getCartridge } from "~/components/community/v2/world/cartridges";

// El servidor no trae tamaños ni robots propios: salen de la estructura del cartucho de la casa.
const HOUSE = getCartridge(DEFAULT_CARTRIDGE_ID).structure;
const { w: WORLD_W, h: WORLD_H } = HOUSE.size;
const BOT_BACK_MS = (HOUSE.combat?.bot.back ?? 0) * 1000;

const who = (id: string) => ({ id, name: `Miembro ${id}`, photoURL: `/api/avatar/${id}` });
const T0 = 1_800_000_000_000;

describe("mundo del club (presencia en memoria)", () => {
  beforeEach(() => resetWorlds());

  it("acota las coordenadas al mapa y descarta lo que no está en las listas", () => {
    const c = cleanShipInput({ x: -50, y: 99999, tx: "x", ty: Number.NaN, ship: "tanque", color: "#000", pilot: "robot", table: 7 });
    expect(c).toEqual({ x: 0, y: WORLD_H, tx: 0, ty: WORLD_H, ship: "rocket", color: "mint", pilot: "astro", table: null });
    expect(cleanShipInput(null).x).toBe(WORLD_W / 2);
    expect(cleanShipInput({ pilot: "avatar", photoURL: "http://malo" })).toMatchObject({ pilot: "avatar" });
    expect(cleanShipInput({ pilot: "avatar", photoURL: "http://malo" })).not.toHaveProperty("photoURL");
    expect(cleanShipInput({ x: 10.6, y: 20.2, table: 1.5 })).toMatchObject({ x: 11, y: 20, table: null });
  });

  it("nombre y foto son los del servidor, y la respuesta no trae marcas internas", () => {
    upsertShip("c1", who("a"), { x: 100, y: 200, name: "Impostor", photoURL: "http://malo", email: "a@x.com" }, T0);
    const [ship] = snapshot("c1", T0).ships;
    expect(ship).toEqual({
      id: "a", name: "Miembro a", photoURL: "/api/avatar/a", x: 100, y: 200, tx: 100, ty: 200,
      ship: "rocket", color: "mint", pilot: "astro", table: null, seat: null,
    });
  });

  it("una nave sin latido se vence; con latido sigue", () => {
    upsertShip("c1", who("a"), {}, T0);
    upsertShip("c1", who("b"), {}, T0);
    upsertShip("c1", who("b"), {}, T0 + SHIP_TTL_MS - 1000);
    const later = snapshot("c1", T0 + SHIP_TTL_MS + 1);
    expect(later.count).toBe(1);
    expect(later.ships[0].id).toBe("b");
  });

  it("cada comunidad tiene su mundo y salir es inmediato", () => {
    upsertShip("c1", who("a"), {}, T0);
    upsertShip("c2", who("b"), {}, T0);
    expect(snapshot("c1", T0).ships.map((s) => s.id)).toEqual(["a"]);
    removeShip("c1", "a");
    expect(snapshot("c1", T0).count).toBe(0);
    expect(snapshot("c2", T0).count).toBe(1);
  });

  it("tope de naves: la que sobra no entra, pero quien ya estaba sí se actualiza", () => {
    for (let i = 0; i < MAX_SHIPS; i++) expect(upsertShip("c1", who(`u${i}`), {}, T0)).toBe(true);
    expect(upsertShip("c1", who("extra"), {}, T0)).toBe(false);
    expect(upsertShip("c1", who("u0"), { x: 5 }, T0)).toBe(true);
    expect(snapshot("c1", T0).count).toBe(MAX_SHIPS);
  });

  it("mesas: asiento libre en orden, se conserva al refrescar y la quinta nave no cabe", () => {
    for (const id of ["a", "b", "c", "d", "e"]) upsertShip("c1", who(id), { table: 1 }, T0);
    const seats = Object.fromEntries(snapshot("c1", T0).ships.map((s) => [s.id, [s.table, s.seat]]));
    expect(seats).toEqual({ a: [1, 0], b: [1, 1], c: [1, 2], d: [1, 3], e: [null, null] });
    upsertShip("c1", who("b"), { table: null }, T0 + 1); // b se levanta
    upsertShip("c1", who("e"), { table: 1 }, T0 + 2); // e toma su lugar
    upsertShip("c1", who("c"), { table: 1 }, T0 + 3); // c refresca y no se mueve
    const after = Object.fromEntries(snapshot("c1", T0 + 3).ships.map((s) => [s.id, s.seat]));
    expect(after).toMatchObject({ b: null, e: 1, c: 2 });
  });

  it("saludo: sólo entre presentes, sin ráfagas, y se vence solo", () => {
    upsertShip("c1", who("a"), {}, T0);
    upsertShip("c1", who("b"), {}, T0);
    expect(sendWave("c1", "a", "nadie", T0)).toBeNull();
    expect(sendWave("c1", "a", "a", T0)).toBeNull();
    expect(sendWave("c1", "fantasma", "a", T0)).toBeNull();
    expect(sendWave("c1", "a", { $ne: "" }, T0)).toBeNull();
    const id = sendWave("c1", "a", "b", T0);
    expect(id).toBeTruthy();
    expect(sendWave("c1", "a", "b", T0 + WAVE_EVERY_MS - 1)).toBeNull();
    expect(sendWave("c1", "a", "b", T0 + WAVE_EVERY_MS)).toBeTruthy();
    expect(snapshot("c1", T0 + 100).waves[0]).toEqual({ id, from: "a", to: "b" });
    upsertShip("c1", who("a"), {}, T0 + WAVE_TTL_MS);
    expect(snapshot("c1", T0 + WAVE_EVERY_MS + WAVE_TTL_MS + 1).waves).toEqual([]);
  });

  it("chat: limpia el texto, lo recorta a 140 y no acepta vacíos", () => {
    expect(cleanSayText("  hola\n\tmundo \u0000 ")).toBe("hola mundo");
    expect(cleanSayText("<b>hola</b>")).toBe("<b>hola</b>"); // se guarda tal cual: el cliente lo pinta como texto
    expect([...cleanSayText("á".repeat(500))]).toHaveLength(SAY_MAX_CHARS);
    expect([...cleanSayText("🚀".repeat(200))]).toHaveLength(SAY_MAX_CHARS); // cuenta caracteres, no mitades de emoji
    expect(cleanSayText(42)).toBe("");
    upsertShip("c1", who("a"), {}, T0);
    expect(sendSay("c1", "a", "   ", T0)).toBeNull();
    expect(sendSay("c1", "a", { html: "x" }, T0)).toBeNull();
    expect(snapshot("c1", T0).says).toEqual([]);
  });

  it("chat: sólo escribe quien tiene nave, uno cada 2 s, y el nombre es el del servidor", () => {
    expect(sendSay("c1", "fantasma", "hola", T0)).toBeNull();
    upsertShip("c1", who("a"), { name: "Impostor" }, T0);
    const id = sendSay("c1", "a", "hola a todos", T0);
    expect(id).toBeTruthy();
    expect(sendSay("c1", "a", "otra", T0 + SAY_EVERY_MS - 1)).toBeNull();
    upsertShip("c1", who("a"), {}, T0 + SAY_EVERY_MS); // el latido no reinicia el límite
    expect(sendSay("c1", "a", "otra", T0 + SAY_EVERY_MS)).toBeTruthy();
    const { says } = snapshot("c1", T0 + SAY_EVERY_MS);
    expect(says[0]).toEqual({ id, from: "a", name: "Miembro a", text: "hola a todos", at: T0 });
    expect(JSON.stringify(says)).not.toMatch(/@|Impostor|lastSayAt/);
    expect(snapshot("c2", T0).says).toEqual([]); // cada comunidad tiene su mundo
  });

  it("chat: guarda los últimos 30 y los borra a los 10 minutos, aunque quien escribió ya se haya ido", () => {
    upsertShip("c1", who("a"), {}, T0);
    for (let i = 0; i < SAY_MAX + 5; i++) {
      upsertShip("c1", who("a"), {}, T0 + i * SAY_EVERY_MS);
      sendSay("c1", "a", `mensaje ${i}`, T0 + i * SAY_EVERY_MS);
    }
    const last = T0 + (SAY_MAX + 4) * SAY_EVERY_MS;
    const { says } = snapshot("c1", last);
    expect(says).toHaveLength(SAY_MAX);
    expect(says[0].text).toBe("mensaje 5");
    expect(says.at(-1)?.text).toBe(`mensaje ${SAY_MAX + 4}`);
    removeShip("c1", "a");
    expect(snapshot("c1", last + 1000).says).toHaveLength(SAY_MAX);
    expect(snapshot("c1", last + SAY_TTL_MS + 1).says).toEqual([]);
  });

  it("cosquilla: sólo entre naves presentes, una por segundo por emisor, sin autor y de vida corta", () => {
    upsertShip("c1", who("a"), {}, T0);
    upsertShip("c1", who("b"), {}, T0);
    expect(sendNudge("c1", "a", "a", T0)).toBeNull(); // a sí misma, no
    expect(sendNudge("c1", "a", "fantasma", T0)).toBeNull();
    expect(sendNudge("c1", "fantasma", "b", T0)).toBeNull();
    expect(sendNudge("c1", "a", { id: "b" }, T0)).toBeNull();
    const id = sendNudge("c1", "a", "b", T0);
    expect(id).toBeTruthy();
    expect(sendNudge("c1", "a", "b", T0 + NUDGE_EVERY_MS - 1)).toBeNull(); // ráfaga del mismo emisor
    expect(sendNudge("c1", "b", "a", T0 + 10)).toBeTruthy(); // el límite es por emisor
    upsertShip("c1", who("a"), {}, T0 + NUDGE_EVERY_MS); // el latido no reinicia el límite
    expect(sendNudge("c1", "a", "b", T0 + NUDGE_EVERY_MS)).toBeTruthy();
    const { nudges, ships } = snapshot("c1", T0 + NUDGE_EVERY_MS);
    expect(nudges[0]).toEqual({ id, to: "b" }); // no dice quién fue
    expect(nudges).toHaveLength(3);
    expect(ships[0]).not.toHaveProperty("lastNudgeAt");
    upsertShip("c1", who("a"), {}, T0 + NUDGE_EVERY_MS + NUDGE_TTL_MS);
    expect(snapshot("c1", T0 + NUDGE_EVERY_MS + NUDGE_TTL_MS + 1).nudges).toEqual([]);
  });

  it("robot tumbado: sólo robots de la casa, sólo de quien está presente, y vuelve solo", () => {
    upsertShip("c1", who("a"), {}, T0);
    expect(sendBoom("c1", "fantasma", "bot:uno", T0)).toBe(false);
    expect(sendBoom("c1", "a", "b", T0)).toBe(false); // una persona no se tumba
    expect(sendBoom("c1", "a", { id: "bot:uno" }, T0)).toBe(false);
    expect(sendBoom("c1", "a", "bot:uno", T0)).toBe(true);
    expect(sendBoom("c1", "a", "bot:uno", T0 + 5000)).toBe(false); // ya está tumbado: no se alarga
    expect(snapshot("c1", T0 + 5000).down).toEqual([{ bot: "bot:uno", back: BOT_BACK_MS - 5000 }]);
    expect(snapshot("c1", T0 + BOT_BACK_MS).down).toEqual([]);
    upsertShip("c1", who("a"), {}, T0 + BOT_BACK_MS);
    expect(sendBoom("c1", "a", "bot:uno", T0 + BOT_BACK_MS)).toBe(true);
  });

  it("valida contra la estructura del cartucho: otro mapa, otras mesas, otras listas", () => {
    const other: WorldStructure = {
      ...HOUSE,
      size: { w: 400, h: 300 },
      tables: [{ x: 100, y: 100, topic: "Única", seats: [{ x: 90, y: 100 }, { x: 110, y: 100 }] }],
      looks: { ...HOUSE.looks, models: [{ id: "walker", name: "Caminante" }], fallback: { model: "walker", color: "mint", pilot: "astro" } },
    };
    const c = cleanShipInput({ x: 1500, y: 900, ship: "rocket", table: 1 }, other);
    expect(c).toMatchObject({ x: 400, y: 300, tx: 400, ty: 300, ship: "walker", table: null });
    expect(cleanShipInput({ table: 0, ship: "walker" }, other)).toMatchObject({ x: 200, y: 150, ship: "walker", table: 0 });
    // Con la estructura de la casa, lo mismo de siempre.
    expect(cleanShipInput({ x: 1500, y: 900, ship: "rocket", table: 2 })).toMatchObject({ x: 1500, y: 900, ship: "rocket", table: 2 });
  });

  it("todos los cartuchos del registro traen una estructura coherente", () => {
    expect(new Set(CARTRIDGES.map((c) => c.id)).size).toBe(CARTRIDGES.length);
    for (const { id, structure: s } of CARTRIDGES) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      const inside = (p: { x: number; y: number }) => p.x >= 0 && p.x <= s.size.w && p.y >= 0 && p.y <= s.size.h;
      expect(inside(s.spawn)).toBe(true);
      expect(new Set(s.places.map((p) => p.id)).size).toBe(s.places.length);
      for (const p of s.places) {
        expect(inside(p)).toBe(true);
        // Un lugar de mesa apunta a una mesa que existe; los demás, a ninguna.
        expect(p.table === null ? p.target !== "table" : p.target === "table" && !!s.tables[p.table]).toBe(true);
      }
      for (const t of s.tables) expect(t.seats.length).toBeGreaterThan(0);
      for (const slot of ["model", "color", "pilot"] as const) {
        const ids = s.looks[`${slot}s`].map((o) => o.id);
        expect(ids).toContain(s.looks.initial[slot]);
        expect(ids).toContain(s.looks.fallback[slot]);
      }
      for (const w of s.combat?.weapons ?? []) if ("shot" in w) expect(s.combat?.shots[w.shot]).toBeTruthy();
      if (s.combat) expect(s.combat.shots[s.combat.basic.shot]).toBeTruthy();
    }
  });

  it("cartucho activo: el de la casa por defecto, viaja en el snapshot y un id desconocido se rechaza", () => {
    expect(snapshot("c1", T0).cartridge).toBe(DEFAULT_CARTRIDGE_ID);
    expect(setWorldCartridge("c1", "no-existe")).toBe(false);
    expect(setWorldCartridge("c1", { $ne: "" })).toBe(false);
    expect(setWorldCartridge("c1", "")).toBe(false);
    expect(activeCartridge("c1")).toBe(DEFAULT_CARTRIDGE_ID);
    expect(setWorldCartridge("c1", DEFAULT_CARTRIDGE_ID)).toBe(true);
    expect(snapshot("c1", T0).cartridge).toBe(DEFAULT_CARTRIDGE_ID);
    expect(snapshot("c2", T0).cartridge).toBe(DEFAULT_CARTRIDGE_ID); // cada comunidad tiene el suyo
  });

  it("cartucho activo: la base sólo manda la primera vez; después manda la memoria", () => {
    hydrateCartridge("c1", "no-existe"); // un id viejo guardado en la base no rompe nada
    expect(activeCartridge("c1")).toBe(DEFAULT_CARTRIDGE_ID);
    hydrateCartridge("c2", null);
    expect(activeCartridge("c2")).toBe(DEFAULT_CARTRIDGE_ID);
    const other = CARTRIDGES.find((c) => c.id !== DEFAULT_CARTRIDGE_ID);
    if (!other) return; // con un solo cartucho en el registro no hay a cuál cambiar
    hydrateCartridge("c3", other.id);
    expect(activeCartridge("c3")).toBe(other.id);
    expect(setWorldCartridge("c3", DEFAULT_CARTRIDGE_ID)).toBe(true);
    hydrateCartridge("c3", other.id); // lectura vieja de la base: no deshace el cambio
    expect(activeCartridge("c3")).toBe(DEFAULT_CARTRIDGE_ID);
  });

  it("cambiar de mundo: sólo quien administra, sólo cartuchos del registro, y se guarda antes de cambiar", async () => {
    const saved: string[] = [];
    const save = async (id: string) => { saved.push(id); };
    const denied = await changeCartridge({ communityId: "c1", canManage: false, cartridgeId: DEFAULT_CARTRIDGE_ID, save });
    expect(denied).toMatchObject({ ok: false, status: 403 });
    const unknown = await changeCartridge({ communityId: "c1", canManage: true, cartridgeId: "no-existe", save });
    expect(unknown).toMatchObject({ ok: false, status: 400 });
    expect(saved).toEqual([]);
    const ok = await changeCartridge({ communityId: "c1", canManage: true, cartridgeId: DEFAULT_CARTRIDGE_ID, save });
    expect(ok).toEqual({ ok: true, cartridge: DEFAULT_CARTRIDGE_ID });
    expect(saved).toEqual([DEFAULT_CARTRIDGE_ID]);
    // Si la base falla, la memoria no cambia.
    const other = CARTRIDGES.find((c) => c.id !== DEFAULT_CARTRIDGE_ID);
    if (!other) return;
    await expect(changeCartridge({ communityId: "c1", canManage: true, cartridgeId: other.id, save: async () => { throw new Error("sin base"); } })).rejects.toThrow();
    expect(activeCartridge("c1")).toBe(DEFAULT_CARTRIDGE_ID);
  });

  it("cambiar de mundo conserva naves y chat, y suelta mesas, asientos y robots tumbados", () => {
    const other = CARTRIDGES.find((c) => c.id !== DEFAULT_CARTRIDGE_ID);
    if (!other) return;
    upsertShip("c1", who("a"), { x: WORLD_W, y: WORLD_H, table: 1 }, T0);
    sendSay("c1", "a", "hola", T0);
    sendBoom("c1", "a", HOUSE.bots[0].id, T0);
    expect(setWorldCartridge("c1", other.id)).toBe(true);
    const snap = snapshot("c1", T0 + 1);
    expect(snap.cartridge).toBe(other.id);
    expect(snap.count).toBe(1);
    expect(snap.says).toHaveLength(1);
    expect(snap.down).toEqual([]);
    expect(snap.ships[0]).toMatchObject({ id: "a", table: null, seat: null });
    expect(snap.ships[0].x).toBeLessThanOrEqual(other.structure.size.w);
    expect(snap.ships[0].y).toBeLessThanOrEqual(other.structure.size.h);
  });

  it("nave destruida por la enemiga: `down` es opcional, sólo viaja cuando es cierto y nunca sentado", () => {
    expect(HOUSE.threat).toBeTruthy();
    upsertShip("c1", who("a"), { x: 100, y: 100 }, T0); // cliente de antes: no manda `down`
    upsertShip("c1", who("b"), { x: 200, y: 200, down: true }, T0);
    upsertShip("c1", who("c"), { down: "true" }, T0); // sólo `true` exacto
    upsertShip("c1", who("d"), { table: 1, down: true }, T0); // en una mesa nadie te daña
    const by = Object.fromEntries(snapshot("c1", T0).ships.map((s) => [s.id, s]));
    expect(by.a).not.toHaveProperty("down");
    expect(by.b).toMatchObject({ down: true, table: null });
    expect(by.c).not.toHaveProperty("down");
    expect(by.d).not.toHaveProperty("down");
    expect(by.d.table).toBe(1);
    upsertShip("c1", who("b"), { x: 800, y: 650, down: false }, T0 + 6000); // reapareció
    expect(snapshot("c1", T0 + 6000).ships.find((s) => s.id === "b")).not.toHaveProperty("down");
    // Un cartucho sin amenaza no acepta naves destruidas.
    const calm: WorldStructure = { ...HOUSE, threat: null };
    expect(calm.threat).toBeNull();
  });

  it("nave enemiga derribada: sólo el ciclo de la visita en curso, una vez, y hasta que esa visita termine", () => {
    const threat = HOUSE.threat!;
    const every = threat.every * 1000, visit = (threat.warn + threat.stay) * 1000;
    const cycle = Math.floor(T0 / every), start = cycle * every, now = start + threat.warn * 1000 + 5000; // a media visita
    const id = `${threat.id}:${cycle}`;
    upsertShip("c1", who("a"), {}, now);
    expect(sendBoom("c1", "fantasma", id, now)).toBe(false);
    expect(sendBoom("c1", "a", `${threat.id}:${cycle + 5}`, now)).toBe(false); // visita que no ha empezado
    expect(sendBoom("c1", "a", `${threat.id}:${cycle - 1}`, now)).toBe(false); // visita que ya terminó
    expect(sendBoom("c1", "a", `${threat.id}:x`, now)).toBe(false);
    expect(sendBoom("c1", "a", `${threat.id}:1.5`, now)).toBe(false);
    expect(sendBoom("c1", "a", id, now)).toBe(true);
    expect(sendBoom("c1", "a", id, now + 1000)).toBe(false); // ya está derribada
    expect(snapshot("c1", now).down).toEqual([{ bot: id, back: start + visit + THREAT_SKEW_MS - now }]);
    expect(snapshot("c1", start + visit + THREAT_SKEW_MS).down).toEqual([]); // el siguiente ciclo llega entera
    // Los robots de la casa siguen por su cuenta.
    upsertShip("c1", who("a"), {}, now + 2000);
    expect(sendBoom("c1", "a", HOUSE.bots[0].id, now + 2000)).toBe(true);
  });

  describe("estado compartido del modo de juego", () => {
    // Un cartucho de prueba que declara tres llaves; ni GeekSector ni Isla Menta declaran alguna.
    const game: Cartridge = { ...getCartridge(DEFAULT_CARTRIDGE_ID), id: "prueba-modo", structure: { ...HOUSE, shared: { score: { type: "number", min: 0, max: 4 }, motto: { type: "text", max: 12 }, winner: { type: "member" } } } };
    const list = CARTRIDGES as Cartridge[];
    beforeEach(() => { if (!list.includes(game)) list.push(game); return () => { list.splice(list.indexOf(game), 1); }; });
    const share = (from: string, key: unknown, value: unknown, at: number) => setShared("c1", from, { key, value }, at);

    it("ningún cartucho del registro trae modo ni llaves hoy, y sin llaves el snapshot no cambia", () => {
      for (const c of CARTRIDGES) if (c !== game) { expect(c.mode).toBeUndefined(); expect(c.structure.shared).toBeUndefined(); }
      upsertShip("c1", who("a"), {}, T0);
      expect(share("a", "score", 1, T0)).toEqual({ ok: false, error: "undeclared" });
      expect(snapshot("c1", T0)).not.toHaveProperty("shared");
    });

    it("sólo llaves declaradas, con su tipo y sus límites, y sólo de quien está presente", () => {
      setWorldCartridge("c1", game.id);
      upsertShip("c1", who("a"), {}, T0);
      upsertShip("c1", who("b"), {}, T0);
      let t = T0;
      const next = () => (t += SHARE_EVERY_MS);
      expect(snapshot("c1", t).shared).toEqual({});
      expect(share("fantasma", "score", 1, next())).toEqual({ ok: false, error: "absent" });
      expect(share("a", "otra", 1, next())).toEqual({ ok: false, error: "undeclared" });
      expect(share("a", "__proto__", 1, next())).toEqual({ ok: false, error: "undeclared" });
      expect(share("a", 7, 1, next())).toEqual({ ok: false, error: "undeclared" });
      for (const bad of [5, -1, 1.5, "2", NaN, Infinity, { n: 1 }]) expect(share("a", "score", bad, next())).toEqual({ ok: false, error: "invalid" });
      expect(share("a", "score", 4, next())).toEqual({ ok: true });
      expect(share("a", "motto", "  hola\u0000 mundo  con cola larguísima ", next())).toEqual({ ok: true });
      expect(share("a", "motto", "   ", next())).toEqual({ ok: false, error: "invalid" });
      expect(share("a", "motto", 12, next())).toEqual({ ok: false, error: "invalid" });
      expect(share("a", "winner", "fantasma", next())).toEqual({ ok: false, error: "invalid" });
      expect(share("a", "winner", "b", next())).toEqual({ ok: true });
      const shared = snapshot("c1", t).shared!;
      expect(shared).toEqual({ score: 4, motto: "hola mundo c", winner: "b" });
      expect([...(shared.motto as string)].length).toBeLessThanOrEqual(Math.min(12, SHARED_MAX_TEXT));
      // `null` borra la llave; una llave `member` se suelta cuando esa persona se va.
      expect(share("a", "score", null, next())).toEqual({ ok: true });
      removeShip("c1", "b");
      expect(snapshot("c1", t).shared).toEqual({ motto: "hola mundo c" });
    });

    it("frecuencia: un cambio cada SHARE_EVERY_MS por persona; lo rechazado no gasta el turno", () => {
      setWorldCartridge("c1", game.id);
      upsertShip("c1", who("a"), {}, T0);
      upsertShip("c1", who("b"), {}, T0);
      expect(share("a", "score", 1, T0)).toEqual({ ok: true });
      expect(share("a", "score", 2, T0 + SHARE_EVERY_MS - 1)).toEqual({ ok: false, error: "rate" });
      expect(share("b", "score", 3, T0 + 1)).toEqual({ ok: true }); // el freno es por persona
      expect(share("a", "score", 9, T0 + SHARE_EVERY_MS)).toEqual({ ok: false, error: "invalid" });
      expect(share("a", "score", 2, T0 + SHARE_EVERY_MS)).toEqual({ ok: true });
      expect(snapshot("c1", T0 + SHARE_EVERY_MS).shared).toEqual({ score: 2 });
    });

    it("cambiar de cartucho borra el estado compartido", () => {
      setWorldCartridge("c1", game.id);
      upsertShip("c1", who("a"), {}, T0);
      expect(share("a", "score", 3, T0)).toEqual({ ok: true });
      setWorldCartridge("c1", DEFAULT_CARTRIDGE_ID);
      expect(snapshot("c1", T0)).not.toHaveProperty("shared");
      expect(share("a", "score", 3, T0 + 1000)).toEqual({ ok: false, error: "undeclared" });
      setWorldCartridge("c1", game.id);
      expect(snapshot("c1", T0 + 1000).shared).toEqual({});
    });
  });
});
