// Mapa de acciones del Mundo: el hardware (teclado, joystick en pantalla) se traduce a acciones con
// nombre y el resto del motor sólo lee acciones. Mismo patrón que el InputMap de Godot o las action
// maps de Unity: cambiar una tecla o sumar un control no toca la física. Puro: sin DOM.

/** Lo que la persona quiere hacer en este cuadro. `x`/`y` en −1..1 (arriba = y negativa). */
export type Actions = { x: number; y: number; boost: boolean };

/** Teclas que el motor escucha para moverse (las de turbo no frenan el comportamiento del navegador). */
export const MOVE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"] as const;
export const BOOST_KEYS = ["ShiftLeft", "ShiftRight"] as const;

export function readActions(keys: ReadonlySet<string>, joy: { x: number; y: number }): Actions {
  let x = joy.x, y = joy.y;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  return { x, y, boost: keys.has("ShiftLeft") || keys.has("ShiftRight") };
}
