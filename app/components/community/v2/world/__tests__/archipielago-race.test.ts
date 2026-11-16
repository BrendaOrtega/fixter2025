import { describe, expect, it } from "vitest";
import type { Area, ModeContext, SharedValue } from "../cartridge";
import { archipielago } from "../cartridges/archipielago";
import { RINGS, RACE_COUNTDOWN } from "../cartridges/archipielago/stars";

// Carrera convocada, simulada de punta a punta con un contexto falso.
function setup() {
  const st = archipielago.createState!() as never;
  const mode = archipielago.mode!(st);
  const shared: Record<string, SharedValue> = {};
  const areas = new Map<string, Area>();
  const sent: Record<string, SharedValue | null>[] = [];
  const player = { id: "me", x: RINGS[0].x, y: RINGS[0].y, vx: 0, vy: 0, ang: 0 } as never;
  const ctx = {
    now: 1000, meId: "me", player, others: [], places: archipielago.structure.places, nearPlace: null, shared,
    sound: () => {}, bubble: () => {}, hud: () => {},
    propose: () => {},
    commit: (c: Record<string, SharedValue | null>) => { sent.push(c); for (const [k, v] of Object.entries(c)) if (v !== null) shared[k] = v; },
    area: (id: string, shape: Area["shape"] | null, tags?: string[]) => { if (shape) areas.set(id, { id, shape, tags }); else areas.delete(id); },
    objective: () => {}, progress: null, save: () => {}, npc: () => null, dialog: () => {},
  } as unknown as ModeContext;
  const tick = (secs: number) => { const steps = Math.round(secs * 10); for (let i = 0; i < steps; i++) { ctx.now += 0.1; mode.update(ctx, 0.1); } };
  const enter = (a: Area) => mode.on!({ type: "area-entered", area: a }, ctx);
  return { ctx, mode, shared, areas, sent, tick, enter };
}

describe("Archipiélago: carrera", () => {
  const start = () => archipielago.structure.areas!.find((a) => a.id === "start")!;
  const ring = (i: number) => archipielago.structure.areas!.find((a) => a.id === `ring:${i}`)!;

  it("sin nadie más, entrar al aro arranca la contrarreloj y la meta guarda el tiempo", () => {
    const { shared, tick, enter } = setup();
    tick(0.1);
    enter(start());
    for (let i = 1; i < RINGS.length; i++) { tick(1); enter(ring(i)); }
    tick(1);
    enter(start());
    tick(0.2);
    expect(typeof shared.raceBest).toBe("number");
    expect(shared.raceLeader).toBe("me");
  });

  it("con más gente, entrar convoca; quien está en la salida arranca a los 5 s", () => {
    const { ctx, shared, tick, enter } = setup();
    (ctx.others as unknown[]).push({ id: "b", kind: "human", x: 0, y: 0, vx: 0, vy: 0, ang: 0, first: "B" });
    enter(start());
    tick(0.2);
    expect(typeof shared.raceAt).toBe("number");
    // Los aros no cuentan antes de arrancar.
    enter(ring(1));
    tick(RACE_COUNTDOWN + 0.5);
    for (let i = 1; i < RINGS.length; i++) { enter(ring(i)); tick(0.5); }
    enter(start());
    tick(0.2);
    expect(typeof shared.raceBest).toBe("number");
  });

  it("si el primer envío se pierde, se reintenta", () => {
    const { ctx, shared, tick, enter } = setup();
    (ctx.others as unknown[]).push({ id: "b", kind: "human", x: 0, y: 0, vx: 0, vy: 0, ang: 0, first: "B" });
    const real = ctx.commit; let drop = 3;
    ctx.commit = (c) => { if (drop-- > 0) return; real(c); };
    enter(start());
    tick(1);
    expect(typeof shared.raceAt).toBe("number");
  });
});

describe("Archipiélago: escondidillas y tormenta", () => {
  it("entrar al círculo te hace quien busca; la tormenta no cae sin compañía", () => {
    const { ctx, shared, tick, enter, mode } = setup();
    enter(archipielago.structure.areas!.find((a) => a.id === "hide")!);
    tick(0.2);
    expect(shared.seeker).toBe("me");
    expect(typeof shared.hideAt).toBe("number");
    // Tormenta viva al inicio de su tanda; sin nadie más, el golpe no cuenta.
    ctx.now = Math.ceil(ctx.now / 240) * 240 + 5;
    tick(0.1);
    mode.on!({ type: "action", at: null }, ctx);
    expect(shared.storm).toBeUndefined();
  });
});
