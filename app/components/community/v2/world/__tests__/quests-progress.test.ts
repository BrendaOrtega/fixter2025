import { describe, expect, it } from "vitest";
import type { ModeContext, WorldStructure } from "../cartridge";
import { createQuests } from "../quests";
import { mergeProgress, emptyProgress } from "../progress";
import { archipielago } from "../cartridges/archipielago";

const ctx = {} as ModeContext;

describe("misiones", () => {
  it("avanzan con eventos, terminan una vez y se saltan las ya hechas", () => {
    const q = createQuests([
      { id: "a", title: "A", reward: "", steps: [{ text: "uno", done: (e) => e.type === "x" }, { text: "dos", done: (e) => e.type === "y" }] },
      { id: "b", title: "B", reward: "", steps: [{ text: "tres", done: (e) => e.type === "z" }] },
    ]);
    expect(q.line()).toBe("🧭 1/2 · uno");
    expect(q.on({ type: "y" }, ctx)).toBeNull();
    expect(q.on({ type: "x" }, ctx)).toBeNull();
    expect(q.on({ type: "y" }, ctx)?.id).toBe("a");
    expect(q.current?.id).toBe("b");
    q.load(["a", "b"]);
    expect(q.current).toBeNull();
    expect(q.line()).toBeNull();
  });
});

describe("progreso guardado", () => {
  const S = archipielago.structure as WorldStructure;
  it("sólo contadores declarados, sum con tope, max/min con su regla y misiones válidas", () => {
    let p = mergeProgress(S, emptyProgress(), { stats: { stars: 9999, otra: 5, bestLap: 300, races: -2 }, quests: ["bienvenida", "MAL id", 7] });
    expect(p.stats).toEqual({ stars: 500, bestLap: 300 });
    expect(p.quests).toEqual(["bienvenida"]);
    p = mergeProgress(S, p, { stats: { stars: 3, bestLap: 450 }, quests: ["bienvenida"] });
    expect(p.stats).toEqual({ stars: 503, bestLap: 300 });
    expect(p.quests).toEqual(["bienvenida"]);
    p = mergeProgress(S, p, { stats: { bestLap: 250, stars: NaN } });
    expect(p.stats.bestLap).toBe(250);
    expect(mergeProgress(S, p, "basura")).toEqual(p);
  });
});
