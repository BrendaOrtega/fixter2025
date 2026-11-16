import { describe, expect, it } from "vitest";
import { setShared, setWorldCartridge, snapshot, upsertShip } from "../club-world.server";

describe("Archipiélago en el servidor", () => {
  it("acepta convocar carrera, escondidillas y golpes de tormenta", () => {
    const now = Date.now();
    setWorldCartridge("arch", "archipielago");
    upsertShip("arch", { id: "a", name: "A", photoURL: "" }, {}, now);
    const t = Math.floor(now / 1000);
    expect(setShared("arch", "a", { changes: { raceAt: t + 10 } }, now)).toEqual({ ok: true });
    expect(setShared("arch", "a", { changes: { seeker: "a", hideAt: t + 15 } }, now + 400)).toEqual({ ok: true });
    expect(setShared("arch", "a", { changes: { storm: Math.floor(t / 240) * 100 + 1 } }, now + 800)).toEqual({ ok: true });
    expect(snapshot("arch", now + 800).shared).toMatchObject({ raceAt: t + 10, seeker: "a" });
  });
});
