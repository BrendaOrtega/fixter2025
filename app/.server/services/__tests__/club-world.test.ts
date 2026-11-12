import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_SHIPS, NUDGE_EVERY_MS, NUDGE_TTL_MS, SAY_EVERY_MS, SAY_MAX, SAY_MAX_CHARS, SAY_TTL_MS, SHIP_TTL_MS, WAVE_EVERY_MS, WAVE_TTL_MS, WORLD_H, WORLD_W, cleanSayText, cleanShipInput, removeShip, resetWorlds, sendNudge, sendSay, sendWave,
  snapshot, upsertShip,
} from "../club-world.server";

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
});
