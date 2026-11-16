import { describe, expect, it } from "vitest";
import type { Movement } from "../cartridge";
import { direct, steer, type Body } from "../controllers";
import { readActions } from "../input";

const M: Movement = { maxSpeed: 300, accel: 600, drag: 1.7, idleDrag: 2.6, seatSpeed: 200, margin: 20, targetMargin: 30, boost: 1.8, steer: { turn: 2 } };
const body = (ang = 0): Body => ({ vx: 0, vy: 0, ang });
const run = (b: Body, f: typeof direct, a: ReturnType<typeof readActions>, secs: number, yaw = 0) => { for (let t = 0; t < secs; t += 1 / 60) f(b, a, 1 / 60, M, { yaw }); return b; };

describe("mapa de acciones", () => {
  it("flechas y WASD dan el mismo vector, en diagonal se normaliza, Shift es turbo", () => {
    expect(readActions(new Set(["ArrowUp"]), { x: 0, y: 0 })).toEqual({ x: 0, y: -1, boost: false });
    expect(readActions(new Set(["KeyW"]), { x: 0, y: 0 })).toEqual({ x: 0, y: -1, boost: false });
    const d = readActions(new Set(["KeyW", "KeyD", "ShiftLeft"]), { x: 0, y: 0 });
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1); expect(d.boost).toBe(true);
    expect(readActions(new Set(), { x: 0.5, y: 0 }).x).toBe(0.5);
  });
});

describe("controlador directo", () => {
  it("con yaw 0 arriba va al norte y respeta la velocidad tope", () => {
    const b = run(body(), direct, readActions(new Set(["ArrowUp"]), { x: 0, y: 0 }), 3);
    expect(b.vy).toBeLessThan(0); expect(Math.abs(b.vx)).toBeLessThan(1e-6);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThanOrEqual(M.maxSpeed + 1e-6);
  });
  it("con yaw la entrada gira con la cámara", () => {
    const b = run(body(), direct, readActions(new Set(["ArrowUp"]), { x: 0, y: 0 }), 1, Math.PI / 2);
    expect(b.vx).toBeGreaterThan(0); expect(Math.abs(b.vy)).toBeLessThan(1e-6);
  });
  it("el turbo sube el tope", () => {
    const b = run(body(), direct, readActions(new Set(["ArrowUp", "ShiftLeft"]), { x: 0, y: 0 }), 5);
    expect(Math.hypot(b.vx, b.vy)).toBeGreaterThan(M.maxSpeed);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThanOrEqual(M.maxSpeed * 1.8 + 1e-6);
  });
});

describe("controlador de dirección (tanque)", () => {
  it("arriba avanza hacia el rumbo, no hacia el norte", () => {
    const b = run(body(0), steer, readActions(new Set(["ArrowUp"]), { x: 0, y: 0 }), 2);
    expect(b.vx).toBeGreaterThan(100); expect(Math.abs(b.vy)).toBeLessThan(1e-6);
  });
  it("izquierda/derecha giran el rumbo aunque esté quieto", () => {
    const b = run(body(0), steer, readActions(new Set(["ArrowRight"]), { x: 0, y: 0 }), 0.5);
    expect(b.ang).toBeCloseTo(1, 1); expect(Math.hypot(b.vx, b.vy)).toBe(0);
  });
  it("abajo frena hasta parar y nunca va en reversa", () => {
    const b = run(body(0), steer, readActions(new Set(["ArrowUp"]), { x: 0, y: 0 }), 2);
    run(b, steer, readActions(new Set(["ArrowDown"]), { x: 0, y: 0 }), 2);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThan(1);
    expect(b.vx).toBeGreaterThanOrEqual(0);
  });
});
