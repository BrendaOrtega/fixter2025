// Cartucho «Isla Menta» — menú de acciones (tipo «toca una cosa y elige qué hacer»), marcas sobre las
// cosas cercanas, globitos de ánimo y anuncios para lector de pantalla. Todo es HTML encima del lienzo.
//
// Cómo camina tu muñequito sin gancho nuevo en el contrato: el motor escucha `pointerdown` en el
// escenario y le pregunta a la skin `toWorld(sx, sy)`. Cuando el toque cae en una acción del menú, la
// skin contesta con el punto de esa acción; cuando cae en una cosa o en una marca, contesta `null`
// (no camines, se abrió el menú). Con teclado no hay toque: se marca el punto en el piso con un aro y
// se camina con las flechas (o, si el motor pasa `motor.walkTo`, va solo).

import type { Point } from "../../cartridge";
import { SPOT_REACH, THINGS, type Action, type Mood, type PlacedSpot, type Thing } from "./things";

/** Ganchos opcionales del motor. Hoy el contrato no los trae; si llegan, se usan. */
export type MotorHooks = {
  walkTo?: (p: Point) => void;
  greet?: (entityId: string) => void;
  nudge?: (entityId: string, kind?: "bonk") => void;
  sound?: (name: string) => void;
};
export type Person = { id: string; name: string; x: number; y: number; me: boolean; human: boolean };
export type ActionsFrame = {
  mini: boolean; vw: number; vh: number; dt: number;
  people: Person[];
  /** Punto del mapa (más altura en unidades de la escena) a pixeles del escenario. */
  project: (x: number, y: number, h: number) => { x: number; y: number; front: boolean };
  /** Cuántos pixeles mide una unidad de la escena alrededor de ese punto. */
  unitPx: (x: number, y: number) => number;
  /** Punto pisable más cercano (para pararse junto a alguien). */
  standNear: (x: number, y: number) => Point | null;
};

const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';
const DOTS = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="2.5" cy="7" r="1.6" fill="currentColor"/><circle cx="7" cy="7" r="1.6" fill="currentColor"/><circle cx="11.5" cy="7" r="1.6" fill="currentColor"/></svg>';
const MOODS: Record<Mood, { color: string; svg: string }> = {
  note: { color: "#5E57A0", svg: '<circle cx="5.5" cy="12" r="2.6"/><rect x="6.6" y="3" width="1.6" height="9"/><path d="M6.6 3l6.4-1.6v3.2L8.2 6z"/>' },
  cup: { color: "#8A6A34", svg: '<path d="M2.5 5h8.5v4.6A3.4 3.4 0 0 1 7.6 13H5.9a3.4 3.4 0 0 1-3.4-3.4z"/><path d="M11 6.2h1a1.9 1.9 0 0 1 0 3.8h-1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="1.5" width="1.4" height="2.4" rx=".7"/><rect x="7.6" y="1.5" width="1.4" height="2.4" rx=".7"/>' },
  star: { color: "#B8862E", svg: '<path d="M8 1.6l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.4l-3.9 2.1.8-4.3-3.2-3 4.4-.6z"/>' },
  flame: { color: "#C7772E", svg: '<path d="M8.2 1.5c.5 2.6 3.4 3.9 3.4 7.2A3.6 3.6 0 0 1 8 14.5a3.6 3.6 0 0 1-3.6-3.8c0-1.6.8-2.6 1.6-3.4.2 1 .7 1.6 1.2 1.9-.1-2.2.1-5.2 1-7.7z"/>' },
  zzz: { color: "#4A719A", svg: '<path d="M12.6 10.2A5.6 5.6 0 0 1 5.8 3.4a5.6 5.6 0 1 0 6.8 6.8z"/>' },
  wave: { color: "#357265", svg: '<path d="M1.5 6.2c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 2.2-1.4 3.4-.6M1.5 10.6c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 2.2-1.4 3.4-.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
};
export const moodHtml = (mood: Mood) => `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="display:block;color:${MOODS[mood].color}" aria-hidden="true">${MOODS[mood].svg}</svg>`;

type Open = { kind: "thing"; thing: Thing } | { kind: "person"; id: string; name: string };
/** Hasta dónde alcanza la mano para hacer cosquillas (px del mapa). */
const TICKLE_REACH = 80;
/** Desde dónde se avienta la almohada (px del mapa) y cuánto se persigue a alguien antes de rendirse (s). */
const BONK_REACH = 64, CHASE_MAX = 12;
type Item = { label: string; disabled: boolean; run: (via: "pointer" | "key") => void };

export function createActions(o: { stage: HTMLElement; canvases: HTMLElement[]; after: HTMLElement; hooks: MotorHooks; onThrow?: (id: string) => void }) {
  const { stage, hooks } = o;
  const ui = document.createElement("div");
  ui.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;font-family:${FONT}`;
  o.after.insertAdjacentElement("afterend", ui);
  // Anuncios: qué pasó, para quien no ve el mapa.
  const live = document.createElement("div");
  live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
  live.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  ui.appendChild(live);
  const announce = (text: string) => { live.textContent = ""; live.textContent = text; };

  const CHIP = "position:absolute;left:0;top:0;width:30px;height:30px;padding:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;pointer-events:auto;" +
    "color:#85DDCB;background:rgba(14,19,23,.88);border:1.5px solid #85DDCB;box-shadow:0 3px 10px rgba(14,19,23,.25);will-change:transform";
  const chips = new Map<string, HTMLButtonElement>();
  for (const t of THINGS) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.chip = t.id; b.style.cssText = CHIP; b.style.display = "none";
    b.setAttribute("aria-label", `${t.name}: ver acciones`); b.setAttribute("aria-haspopup", "menu");
    b.innerHTML = DOTS;
    ui.appendChild(b); chips.set(t.id, b);
  }
  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  menu.style.cssText = "position:absolute;left:0;top:0;display:none;min-width:150px;max-width:240px;padding:6px;border-radius:14px;pointer-events:auto;" +
    "background:#141B20;border:1px solid #2B373E;box-shadow:0 8px 24px rgba(14,19,23,.35);will-change:transform";
  ui.appendChild(menu);

  let open: Open | null = null, items: Item[] = [];
  /** Lo que contesta `toWorld` al toque en curso: `undefined` no es nuestro, `null` no camines, punto = ve ahí. */
  let reply: Point | null | undefined;
  let guide: PlacedSpot | null = null, guideT = 0;
  let last: ActionsFrame | null = null;
  /** Almohadas que traes (de la canasta). Sólo las ves tú; el golpe sí lo ven todos. */
  let pillows = 0;
  /** Con almohadas, tocar a alguien es ir tras él: `lx/ly` es donde estaba cuando se trazó la ruta. */
  let chase: { id: string; name: string; t: number; lx: number; ly: number } | null = null;
  /** Corre hacia esa persona o robot; si ya está al alcance, le avienta la almohada. */
  function chaseTo(id: string, name: string, via: "pointer" | "key") {
    const who = last?.people.find((p) => p.id === id), from = me();
    if (!who || !from || !last) return;
    if (!chase || chase.id !== id) { chase = { id, name, t: 0, lx: who.x, ly: who.y }; announce(`Vas por ${name} con una almohada.`); }
    if (Math.hypot(from.x - who.x, from.y - who.y) < BONK_REACH) { reply = null; return; } // el próximo cuadro avienta
    const d = Math.hypot(from.x - who.x, from.y - who.y) || 1;
    const p = last.standNear(who.x + ((from.x - who.x) / d) * 40, who.y + ((from.y - who.y) / d) * 40);
    chase.lx = who.x; chase.ly = who.y;
    if (p) go(p, via, `Camina con las flechas hacia ${name}.`);
  }
  const me = () => last?.people.find((p) => p.me) ?? null;
  const taken = (s: PlacedSpot) => !!last?.people.some((p) => !p.me && Math.hypot(p.x - s.x, p.y - s.y) < SPOT_REACH * 1.6);
  /** El punto libre de esa acción más cercano a ti. */
  function freeSpot(thing: Thing, action: Action): PlacedSpot | null {
    const from = me();
    let best: PlacedSpot | null = null, bd = Infinity;
    action.spots.forEach((s, index) => {
      const spot: PlacedSpot = { ...s, thing, action, index };
      if (taken(spot)) return;
      const d = from ? Math.hypot(from.x - s.x, from.y - s.y) : index;
      if (d < bd) { best = spot; bd = d; }
    });
    return best;
  }
  function go(p: Point, via: "pointer" | "key", keyHint: string) {
    if (hooks.walkTo) { hooks.walkTo(p); reply = null; }
    else if (via === "pointer") reply = p; // el motor recibe este punto en su propio `pointerdown`
    else announce(keyHint);
  }
  function itemsFor(target: Open): Item[] {
    if (target.kind === "thing") {
      return target.thing.actions.map((action) => {
        const spot = freeSpot(target.thing, action);
        return {
          label: spot ? action.label : `${action.label} · lleno`, disabled: !spot,
          run: (via) => {
            const s = freeSpot(target.thing, action);
            if (!s) { announce(`${target.thing.name}: no hay lugar libre.`); return; }
            guide = s; guideT = 0;
            announce(`Vas a ${target.thing.name}: ${action.label.toLowerCase()}.`);
            go({ x: s.x, y: s.y }, via, `${action.label}: camina con las flechas hasta el aro marcado en ${target.thing.name}.`);
          },
        };
      });
    }
    const list: Item[] = [{
      label: "Acercarse", disabled: false,
      run: (via) => {
        const who = last?.people.find((p) => p.id === target.id), from = me();
        if (!who || !from || !last) return;
        const d = Math.hypot(from.x - who.x, from.y - who.y) || 1;
        const p = last.standNear(who.x + ((from.x - who.x) / d) * 38, who.y + ((from.y - who.y) / d) * 38);
        if (!p) return;
        announce(`Vas con ${target.name}.`);
        go(p, via, `Camina con las flechas hacia ${target.name}.`);
      },
    }];
    // Saludar sólo se ofrece si el motor presta su saludo compartido; un saludo que sólo ves tú no sirve.
    if (hooks.greet) list.unshift({ label: "Saludar", disabled: false, run: () => { hooks.greet?.(target.id); announce(`Saludaste a ${target.name}.`); reply = null; } });
    // Cosquillas: de cerca, como en persona. Viajan por el motor y todos ven a quien se ríe.
    if (hooks.nudge) {
      const who = last?.people.find((p) => p.id === target.id), from = me();
      const close = !!who && !!from && Math.hypot(from.x - who.x, from.y - who.y) < TICKLE_REACH;
      list.push({ label: close ? "Hacer cosquillas" : "Hacer cosquillas · acércate", disabled: !close, run: () => { hooks.nudge?.(target.id); announce(`Le hiciste cosquillas a ${target.name}.`); reply = null; } });
    }
    return list;
  }
  function openMenu(target: Open, focus: boolean) {
    open = target; items = itemsFor(target);
    const title = target.kind === "thing" ? target.thing.name : target.name;
    menu.textContent = ""; menu.setAttribute("aria-label", title);
    const head = document.createElement("div");
    head.style.cssText = "padding:2px 8px 5px;font-size:11px;font-weight:600;line-height:14px;color:#9AA9A6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    head.textContent = title; menu.appendChild(head);
    items.forEach((it, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.item = String(i); b.setAttribute("role", "menuitem");
      if (it.disabled) b.setAttribute("aria-disabled", "true");
      b.style.cssText = "display:block;width:100%;min-height:36px;padding:7px 10px;border:0;border-radius:9px;text-align:left;font:600 13px/18px inherit;font-family:inherit;cursor:pointer;" +
        `background:${i === 0 && !it.disabled ? "#1C2A2B" : "transparent"};color:${it.disabled ? "#7C8A8E" : "#F2F5F4"}`;
      b.textContent = it.label;
      b.onfocus = () => { b.style.outline = "2px solid #85DDCB"; b.style.outlineOffset = "-2px"; };
      b.onblur = () => { b.style.outline = "none"; };
      menu.appendChild(b);
    });
    menu.style.display = "block";
    if (focus) (menu.querySelector("[data-item]") as HTMLElement | null)?.focus();
  }
  function closeMenu(refocus = false) {
    if (!open) return;
    const chip = open.kind === "thing" ? chips.get(open.thing.id) : null;
    open = null; items = []; menu.style.display = "none";
    if (refocus && chip && chip.style.display !== "none") chip.focus();
  }
  const runItem = (el: Element | null, via: "pointer" | "key") => {
    const it = el ? items[Number((el as HTMLElement).dataset.item)] : null;
    if (!it || it.disabled) return;
    it.run(via); closeMenu();
  };

  /** Qué cosa o persona hay bajo ese pixel (la más cercana a su centro). */
  function pick(sx: number, sy: number): Open | null {
    if (!last) return null;
    let best: Open | null = null, bd = 1;
    for (const t of THINGS) {
      const c = last.project(t.x, t.y, t.h * 0.35);
      if (!c.front) continue;
      const d = Math.hypot(c.x - sx, c.y - sy) / Math.max(18, t.hit * 0.025 * last.unitPx(t.x, t.y));
      if (d < bd) { best = { kind: "thing", thing: t }; bd = d; }
    }
    for (const p of last.people) {
      // Los robots sólo se tocan para un almohadazo.
      if (p.me || (!p.human && pillows <= 0)) continue;
      const c = last.project(p.x, p.y, 0.75);
      if (!c.front) continue;
      const d = Math.hypot(c.x - sx, c.y - sy) / Math.max(16, 0.55 * last.unitPx(p.x, p.y));
      if (d < bd) { best = { kind: "person", id: p.id, name: p.name }; bd = d; }
    }
    return best;
  }

  // Va en captura: corre antes que el `pointerdown` del motor, que enseguida pregunta `toWorld`.
  const onDown = (e: PointerEvent) => {
    reply = undefined;
    if (e.button !== 0 || !last || last.mini) return;
    const target = e.target as Element;
    if (ui.contains(target)) {
      reply = null;
      const chip = target.closest("[data-chip]") as HTMLElement | null;
      if (chip) { const t = THINGS.find((x) => x.id === chip.dataset.chip); if (t) openMenu({ kind: "thing", thing: t }, false); }
      else runItem(target.closest("[data-item]"), "pointer");
      return;
    }
    if (!o.canvases.includes(target as HTMLElement)) return; // un panel de la interfaz: no es nuestro
    const r = stage.getBoundingClientRect(), hit = pick(e.clientX - r.left, e.clientY - r.top);
    if (hit?.kind === "person" && pillows > 0 && hooks.nudge) { closeMenu(); chaseTo(hit.id, hit.name, "pointer"); if (reply === undefined) reply = null; }
    else if (hit) { chase = null; openMenu(hit, false); reply = null; }
    else { chase = null; closeMenu(); }
  };
  // Teclado: Enter/Espacio en un botón llega como `click` sin puntero.
  const onClick = (e: MouseEvent) => {
    if (e.detail !== 0) return;
    const target = e.target as Element, chip = target.closest("[data-chip]") as HTMLElement | null;
    if (chip) { const t = THINGS.find((x) => x.id === chip.dataset.chip); if (t) openMenu({ kind: "thing", thing: t }, true); }
    else runItem(target.closest("[data-item]"), "key");
  };
  const onKey = (e: KeyboardEvent) => {
    const inMenu = !!(e.target as Element).closest("[data-item]");
    if (e.key === "Escape" && open) { closeMenu(true); e.stopPropagation(); return; }
    if (!inMenu) return;
    const list = [...menu.querySelectorAll<HTMLElement>("[data-item]")], i = list.indexOf(e.target as HTMLElement);
    const move = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : e.key === "Home" ? -i : e.key === "End" ? list.length - 1 - i : null;
    if (move === null) return;
    // Las flechas dentro del menú recorren acciones; no deben mover al muñequito.
    list[(i + move + list.length) % list.length]?.focus();
    e.preventDefault(); e.stopPropagation();
  };
  stage.addEventListener("pointerdown", onDown, true);
  ui.addEventListener("click", onClick);
  ui.addEventListener("keydown", onKey);

  const put = (el: HTMLElement, x: number, y: number, anchor: string) => { el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(${anchor})`; };
  function frame(f: ActionsFrame) {
    last = f;
    reply = undefined; // el toque que lo pidió ya se atendió (el motor pregunta en el mismo evento)
    const player = me();
    if (f.mini && open) closeMenu();
    // Marcas: sólo sobre las cosas que tienes cerca (y de paso son la entrada por teclado).
    for (const t of THINGS) {
      const chip = chips.get(t.id)!;
      // No se muestra sobre la cosa que ya estás usando (te taparía la cara) ni sobre la que tiene el menú abierto.
      const using = !!player && t.actions.some((a) => a.spots.some((sp) => Math.hypot(player.x - sp.x, player.y - sp.y) < SPOT_REACH));
      const near = !f.mini && !!player && !using && Math.hypot(player.x - t.x, player.y - t.y) < 230 && !(open?.kind === "thing" && open.thing === t);
      const c = near ? f.project(t.x, t.y, t.h) : null;
      const show = !!c && c.front && c.x > 20 && c.x < f.vw - 20 && c.y > 20 && c.y < f.vh - 10;
      if (!show && document.activeElement === chip) chip.blur();
      chip.style.display = show ? "grid" : "none";
      if (show && c) put(chip, c.x, c.y, "-50%,-50%");
    }
    if (open) {
      const who = open.kind === "person" ? f.people.find((p) => p.id === (open as { id: string }).id) : null;
      const at = open.kind === "thing" ? { x: open.thing.x, y: open.thing.y, h: open.thing.h } : who ? { x: who.x, y: who.y, h: 2.2 } : null;
      const c = at ? f.project(at.x, at.y, at.h) : null;
      const far = !player || !at || Math.hypot(player.x - at.x, player.y - at.y) > 520;
      if (!c || !c.front || far || c.x < -40 || c.x > f.vw + 40 || c.y < -40 || c.y > f.vh + 80) closeMenu();
      else put(menu, Math.max(86, Math.min(f.vw - 86, c.x)), Math.max(menu.offsetHeight + 8, c.y + 8), "-50%,-100%");
    }
    if (chase) {
      chase.t += f.dt;
      const who = f.people.find((p) => p.id === chase!.id);
      if (!who || !player || pillows <= 0 || chase.t > CHASE_MAX) chase = null;
      else if (Math.hypot(player.x - who.x, player.y - who.y) < BONK_REACH) {
        pillows--;
        if (o.onThrow) o.onThrow(who.id); else hooks.nudge?.(who.id, "bonk");
        announce(pillows ? `Le diste un almohadazo a ${chase.name}. Te quedan ${pillows}.` : `Le diste un almohadazo a ${chase.name}. Ya no traes almohadas: hay más en la canasta del campamento.`);
        chase = null;
      } else if (hooks.walkTo && Math.hypot(who.x - chase.lx, who.y - chase.ly) > 30) chaseTo(who.id, chase.name, "key"); // se movió: nueva ruta
    }
    if (guide) {
      guideT += f.dt;
      const s = guide;
      if (guideT > 20 || (player && Math.hypot(player.x - s.x, player.y - s.y) < SPOT_REACH * 0.8)) guide = null;
    }
  }

  return {
    frame, announce,
    setPillows: (n: number) => { pillows = n; },
    pillows: () => pillows,
    /** Para `toWorld`: lo que hay que contestarle al motor por el toque en curso. */
    reply: () => reply,
    /** El punto al que vas (para pintarle un aro en el piso). */
    guide: () => guide,
    isTaken: taken,
    destroy() {
      stage.removeEventListener("pointerdown", onDown, true);
      ui.removeEventListener("click", onClick); ui.removeEventListener("keydown", onKey);
      ui.remove();
    },
  };
}
