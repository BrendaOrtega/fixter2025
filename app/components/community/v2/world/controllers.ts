// Controladores del Mundo: la regla que convierte acciones en movimiento, intercambiable (patrón
// Strategy, como el CharacterController de Unity o el CharacterBody2D de Godot). La skin dice cuál
// usar cada cuadro con `renderer.camera()`; el motor sólo delega. Puro: sin DOM, se prueba solo.
//
//   direct  acelera hacia donde apunta la entrada, relativa a la cámara (`yaw`). Con yaw 0, arriba es
//           el norte del mapa: el control de siempre.
//   steer   de tanque, como un avión: izquierda/derecha giran el rumbo, arriba acelera hacia adelante y
//           abajo frena. El rumbo manda (no sale de la velocidad).
import type { Movement } from "./cartridge";
import type { Actions } from "./input";

export type ControlScheme = "direct" | "steer";
/** Lo que la skin le cuenta al motor de su cámara: qué controlador va y hacia dónde ve (rad, 0 = norte). */
export type CameraInfo = { controls: ControlScheme; yaw: number };
export const DEFAULT_CAMERA: CameraInfo = { controls: "direct", yaw: 0 };

/** El cuerpo que se mueve (una `Entity` sirve tal cual): la posición la integra el motor; aquí cambian velocidad y rumbo. */
export type Body = { vx: number; vy: number; ang: number };
/** `nudge`: fuerzas del motor que van entre la aceleración y el frenado (la gravedad de los lugares). */
export type StepCtx = { yaw: number; nudge?: () => void };

/** Velocidad tope con o sin turbo. */
export const topSpeed = (m: Movement, a: Actions) => m.maxSpeed * (a.boost && m.boost ? m.boost : 1);

export type Controller = (body: Body, a: Actions, dt: number, m: Movement, ctx: StepCtx) => void;

export const direct: Controller = (b, a, dt, m, ctx) => {
  // Girar la entrada según la cámara: con yaw 0 queda igual.
  const c = Math.cos(ctx.yaw), s = Math.sin(ctx.yaw), x = a.x * c - a.y * s, y = a.x * s + a.y * c;
  b.vx += x * m.accel * dt; b.vy += y * m.accel * dt;
  ctx.nudge?.();
  const k = Math.exp(-m.drag * dt); b.vx *= k; b.vy *= k;
  const max = topSpeed(m, a), sp = Math.hypot(b.vx, b.vy);
  if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
  // El rumbo lo suaviza el motor a partir de la velocidad.
};

export const steer: Controller = (b, a, dt, m, ctx) => {
  const turn = m.steer?.turn ?? 2.6;
  b.ang += a.x * turn * dt;
  const fx = Math.cos(b.ang), fy = Math.sin(b.ang);
  // Rapidez hacia adelante (nunca en reversa): arriba acelera, abajo frena el doble de fuerte.
  let sp = Math.max(0, b.vx * fx + b.vy * fy);
  const fwd = -a.y;
  if (fwd > 0) sp += fwd * m.accel * dt;
  else if (fwd < 0) sp += fwd * m.accel * 2 * dt;
  sp *= Math.exp(-(fwd > 0 ? m.drag : m.idleDrag) * dt);
  sp = Math.min(Math.max(0, sp), topSpeed(m, a));
  b.vx = fx * sp; b.vy = fy * sp;
  ctx.nudge?.();
};

export const CONTROLLERS: Record<ControlScheme, Controller> = { direct, steer };
