// Archipiélago: renderizador en canvas 2D, portado de la vista aérea de «Ghosty sobre las islas».
//
// Todo el mundo se pinta en un búfer chico (un pixel = `WP` unidades del mapa) alineado a la rejilla
// y se amplía sin suavizado: terreno con tramado, olas que destellan, estelas blancas dobles, sombras
// de nubes, estrellas que giran, chispas, fantasmas que se inclinan al girar y nubes por encima.
// Encima, ya en resolución real, van los nombres con contorno, las burbujas y las pistas de orilla.

import type { Entity, View, WorldEvent, WorldFrame, WorldRenderer, WorldStructure } from "../../cartridge";
import { TAU, buildStar, ghostSprite, loadGhosts, makeCloud, type Cloud } from "./ghost";
import { DECOR, bake } from "./landmarks";
import { RACE_WINDOW, START_R, BIG_R, GOLDEN, RINGS, RING_R, STAR_EVERY, createStarState, starKey, starsOf, type StarState } from "./stars";
import { ALT, createChase } from "./chase";
import { WATER, WP, buildTerrain, hsh, mulberry } from "./terrain";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const angd = (a: number, b: number) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const OUTLINE = "#0b2f66", FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Lo que la skin recuerda de cada fantasma para animarlo (inclinación, giro, estela). */
type Fly = { rot: number; bank: number; roll: number; trail: { x: number; y: number; ang: number; t: number }[]; lastT: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number };

export function createRenderer({ canvas: cv, stage, structure, state }: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure; state?: unknown }): WorldRenderer {
  // Estado por montaje que comparte con el modo (las estrellas tomadas).
  const starState = (state as StarState | undefined) ?? createStarState();
  const ctx = cv.getContext("2d") as Ctx;
  const buf = document.createElement("canvas"), b = buf.getContext("2d") as Ctx;
  const terrain = buildTerrain(structure), star = buildStar();
  const sprites = new Map<string, HTMLCanvasElement>();
  const spr = (key: string, make: () => HTMLCanvasElement) => { let c = sprites.get(key); if (!c) { c = make(); sprites.set(key, c); } return c; };
  const seats = structure.tables[0]?.seats.length ?? 0;
  // Nubes: siete formas, catorce nubes que van a la deriva sobre todo el mapa.
  const clouds = (() => {
    const rng = mulberry(777), kinds = [[2, 5], [3, 6], [3, 8], [4, 8], [5, 9], [2, 7], [4, 6]];
    const shapes = kinds.map(([n, rb]) => makeCloud(rng, n, rb));
    return Array.from({ length: 34 }, () => ({ x: rng() * terrain.w, y: rng() * terrain.h, alt: 52 + rng() * 40, v: 1.5 + rng() * 2.5, s: shapes[(rng() * shapes.length) | 0] as Cloud }));
  })();
  const flies = new Map<string, Fly>();
  /** Fase de la carrera convocada (la misma cuenta que hace el modo). */
  const racePhase = () => { const now = starState.now || Date.now() / 1000, at = starState.raceAt; return !at || now >= at + RACE_WINDOW ? "off" : now < at ? "countdown" : "on"; };
  /** Qué aros se pintan: sólo la salida, salvo durante la carrera. */
  const ringOn = (i: number) => i === 0 || racePhase() === "on";
  const ringHot = (i: number) => { const r = starState.race; return r.next >= 0 && r.startedAt !== null ? i === r.next : i === 0 && racePhase() !== "on"; };
  let parts: Particle[] = [];
  const seenStars = new Set<string>();
  let view: View = { vw: 1, vh: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 }, dpr = 1;
  let frame: WorldFrame;
  let X0 = 0, Y0 = 0; // esquina del búfer, en pixeles del arte
  const topScreen = (x: number, y: number) => ({ x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy });
  // En persecución, el mapa se proyecta a la altura de vuelo; lo que queda detrás de la cámara, fuera de pantalla.
  const toScreen = (x: number, y: number) => {
    if (!chaseOn()) return topScreen(x, y);
    const p = chase.project(x, y, ALT);
    return p ? { x: p.x * chase.PS, y: p.y * chase.PS } : { x: -9999, y: -9999 };
  };
  /** Del mapa (unidades) al pixel del búfer. */
  const bx = (x: number) => Math.round(x / WP - X0), by = (y: number) => Math.round(y / WP - Y0);

  function ell(cx: number, cy: number, rx: number, ry: number) {
    for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01)))); b.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
  }
  /** Aro de pixeles (vista de arriba): círculo achatado con borde y brillo. */
  function ringTop(x: number, y: number, r: number, c: string, t: number, hot: boolean) {
    const cx = bx(x), cy = by(y), rx = Math.round(r / WP), ry = Math.round((r / WP) * 0.55), n = Math.max(24, rx * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, px = Math.round(cx + Math.cos(a) * rx), py = Math.round(cy + Math.sin(a) * ry);
      b.fillStyle = "#0b2f66"; b.fillRect(px - 1, py, 3, 2);
      b.fillStyle = hot && ((i + Math.floor(t * 12)) % 6 < 3) ? "#fff6b0" : c; b.fillRect(px, py - 1, 2, 2);
    }
  }
  /** Coronita de pixeles sobre quien trae la estrella dorada. */
  function crownTop(x: number, y: number) {
    b.fillStyle = "#7a4e10"; b.fillRect(x - 5, y - 1, 11, 4);
    b.fillStyle = "#ffd93d"; b.fillRect(x - 4, y, 9, 2); b.fillRect(x - 4, y - 3, 1, 3); b.fillRect(x, y - 4, 1, 4); b.fillRect(x + 4, y - 3, 1, 3);
    b.fillStyle = "#fff6b0"; b.fillRect(x - 3, y, 2, 1);
  }
  /** Lluvia de estrellas (choca esas cinco): chispas doradas que salen del punto. */
  function showers() {
    for (const q of starState.showers.splice(0)) for (let j = 0; j < 26; j++) {
      const a = (j / 26) * TAU, v = 40 + (j % 3) * 22;
      emit({ x: q.x / WP, y: q.y / WP, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.9, max: 0.9, c: ["#ffd93d", "#fff6b0", "#ff9b2e"][j % 3], s: j % 4 ? 2 : 3 });
    }
  }
  function line(c: Ctx, x0: number, y0: number, x1: number, y1: number) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
    for (let k = 0; k < 300; k++) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
  }
  const emit = (p: Particle) => { if (parts.length < 260) parts.push(p); };

  function flyOf(e: Entity, t: number) {
    let f = flies.get(e.id);
    if (!f) { f = { rot: 0, bank: 0, roll: 0, trail: [], lastT: 0 }; flies.set(e.id, f); }
    const dt = frame.dt, moving = e.thrust > 0.15 && e.table == null;
    // Vuela de cabeza hacia su rumbo; quieto (o sentado) se endereza.
    const want = moving ? e.ang + PI / 2 : 0, step = angd(want, f.rot) * Math.min(1, 7 * dt);
    f.rot += step; f.bank += (clamp(step / Math.max(dt, 1e-3) / 2.2, -1, 1) - f.bank) * Math.min(1, 9 * dt);
    if (f.roll > 0) { f.roll += dt / 0.8; if (f.roll >= 1) f.roll = 0; }
    // Estela: un punto cada 20 ms mientras se mueve; cada punto dura 1.7 s.
    if (moving && t - f.lastT > 0.02) { f.lastT = t; f.trail.push({ x: e.x, y: e.y, ang: e.ang, t }); if (f.trail.length > 85) f.trail.shift(); }
    while (f.trail.length && t - f.trail[0].t > 1.7) f.trail.shift();
    return f;
  }

  function drawTrail(f: Fly, gold = false) {
    const n = f.trail.length; if (n < 3) return;
    b.fillStyle = gold ? "#ffd93d" : "#fff";
    for (const side of [-1, 1]) {
      let px = 0, py = 0;
      f.trail.forEach((p, i) => {
        const x = bx(p.x - Math.sin(p.ang) * 18 * side), y = by(p.y + Math.cos(p.ang) * 18 * side) + 6;
        if (i > 1) { b.globalAlpha = (Math.ceil((i / n) * 4) / 4) * 0.9; line(b, px, py, x, y); }
        px = x; py = y;
      });
    }
    b.globalAlpha = 1;
  }

  function drawPlace(p: (typeof frame.places)[number], t: number) {
    const cx = bx(p.x), cy = by(p.y);
    const put = (img: HTMLCanvasElement, x: number, y: number) => b.drawImage(img, x - (img.width >> 1), y - (img.height >> 1));
    if (p.kind === "lighthouse") {
      const on = !!frame.placeStatus[p.id]?.on;
      if (on && !frame.quiet) {
        // Sala abierta: el faro gira su haz.
        const a = t * 1.4; b.fillStyle = "rgba(255, 246, 176, .45)";
        for (let s = 3; s < 38; s++) for (const da of [-0.07, 0, 0.07]) b.fillRect(cx + Math.round(Math.cos(a + da) * s), cy - 13 + Math.round(Math.sin(a + da) * s * 0.6), 1, 1);
      }
      b.fillStyle = "rgba(8,40,100,.32)"; ell(cx + 3, cy + 2, 7, 2);
      put(spr(`lh:${on}`, () => bake(DECOR.lighthouse, { L: on ? "#fff6b0" : "#8f877f" })), cx, cy - 6);
    } else if (p.kind === "islet") {
      const busy = (frame.tableCounts[p.table as number] ?? 0) > 0, flick = busy && !frame.quiet && Math.sin(t * 9) > 0;
      for (const s of structure.tables[p.table as number]?.seats ?? []) put(spr("stump", () => bake(DECOR.stump)), bx(s.x), by(s.y));
      put(spr(`fire:${busy}:${flick}`, () => bake(busy ? DECOR.fire : DECOR.fireOff, flick ? { o: "#fff6b0", Y: "#ff9b2e" } : {})), cx, cy);
    } else if (DECOR[p.kind]) {
      const img = spr(`d:${p.kind}`, () => bake(DECOR[p.kind]));
      b.fillStyle = "rgba(8,40,100,.32)"; ell(cx + 3, cy + (img.height >> 1) - 1, img.width >> 1, 2);
      put(img, cx, cy - 2);
    }
  }

  function render(f: WorldFrame) {
    frame = f; view = f.view;
    camBtn.style.display = f.mini ? "none" : "grid";
    if (chaseOn()) { renderChase(f); return; }
    const { vw, vh, scale } = view, t = f.t, dt = f.dt, unit = WP * scale;
    X0 = Math.floor((view.camx - view.ox / scale) / WP); Y0 = Math.floor((view.camy - view.oy / scale) / WP);
    const bw = Math.ceil(vw / unit) + 2, bh = Math.ceil(vh / unit) + 2;
    if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
    b.imageSmoothingEnabled = false;

    // ── Agua y terreno ──
    b.fillStyle = WATER[5]; b.fillRect(0, 0, bw, bh);
    b.drawImage(terrain.cv, -X0, -Y0);
    if (!f.quiet) {
      // Destellos de ola que aparecen y se apagan, sólo en agua honda.
      b.fillStyle = "#e4f4ff";
      const G = 21, gx0 = Math.floor(X0 / G) - 1, gy0 = Math.floor(Y0 / G) - 1;
      for (let gy = gy0; gy <= gy0 + Math.ceil(bh / G) + 2; gy++) for (let gx = gx0; gx <= gx0 + Math.ceil(bw / G) + 2; gx++) {
        const r1 = hsh(gx, gy, 41); if (r1 > 0.55) continue;
        const wx = gx * G + ((hsh(gx, gy, 42) * G) | 0), wy = gy * G + ((hsh(gx, gy, 43) * G) | 0);
        if (!terrain.deep(wx * WP, wy * WP) && wx >= 0 && wy >= 0 && wx < terrain.w && wy < terrain.h) continue;
        if ((t * 1.1 + r1 * 9) % 2 > 0.7) continue;
        b.fillRect(wx - X0, wy - Y0, 1, 3);
      }
    }

    const flyers = [...f.others, f.player].filter((e) => e.downT <= 0);
    const state = new Map(flyers.map((e) => [e.id, flyOf(e, t)] as const));
    const formation = new Set(starState.formation);
    if (!f.mini && !f.quiet) for (const e of flyers) drawTrail(state.get(e.id) as Fly, formation.has(e.id));

    // ── Estrellas: sombra, y si alguien (tú) tomó una, sus chispas ──
    const now = starState.now || Date.now() / 1000, wave = Math.floor(now / STAR_EVERY), left = STAR_EVERY - (now % STAR_EVERY);
    const waveStars = structure.shared ? starsOf(wave, structure.size, f.places) : [];
    waveStars.forEach((s, i) => {
      const k = starKey(wave, i);
      if (starState.taken.has(k)) {
        if (!seenStars.has(k)) { seenStars.add(k); for (let j = 0; j < 9; j++) { const a = (j / 9) * TAU; emit({ x: s.x / WP, y: s.y / WP, vx: Math.cos(a) * 36, vy: Math.sin(a) * 36, life: 0.45, max: 0.45, c: j % 2 ? "#ffd93d" : "#fff6b0", s: 2 }); } }
        return;
      }
      b.fillStyle = "rgba(8,40,100,.32)"; ell(bx(s.x) + 3, by(s.y) + 8, 4, 1);
    });
    if (seenStars.size > 80) seenStars.clear();
    // Sombras de nubes.
    b.globalAlpha = 0.42;
    for (const c of clouds) {
      const x = ((c.x + (f.quiet ? 0 : c.v * t)) % (terrain.w + 80)) - 40;
      b.drawImage(c.s.s, Math.round(x + c.alt * 0.2 - X0) - (c.s.w >> 1), Math.round(c.y + c.alt * 0.28 - Y0) - (c.s.h >> 1));
    }
    b.globalAlpha = 1;
    for (const p of f.places) drawPlace(p, t);

    if (f.mini) {
      for (const e of flyers) { b.fillStyle = e.kind === "me" ? "#ffd93d" : "#fff"; b.fillRect(bx(e.x) - 1, by(e.y) - 1, 3, 3); }
    } else {
      // Sombra de cada fantasma.
      b.fillStyle = "rgba(8,40,100,.38)";
      for (const e of flyers) ell(bx(e.x) + 6, by(e.y) + (e.table != null ? 5 : 9), 8, 5);
      for (const [i, s] of waveStars.entries()) {
        if (starState.taken.has(starKey(wave, i))) continue;
        if (left < 3 && !f.quiet && Math.sin(t * 18) < 0) continue; // parpadea antes de cambiar de tanda
        const w = Math.max(3, Math.round(14 * Math.max(0.28, Math.abs(Math.cos(t * 2.6 + i))))), bob = Math.round(Math.sin(t * 3 + i) * 1.5);
        b.drawImage(star, bx(s.x) - (w >> 1), by(s.y) - 10 + bob, w, 14);
      }
      if (structure.shared) {
        showers();
        // Aros de la carrera: la salida en coral, el siguiente que te toca brilla.
        RINGS.forEach((r, i) => { if (ringOn(i)) ringTop(r.x, r.y, i === 0 ? START_R : RING_R, i === 0 ? "#f4a39a" : "#e8f1fa", t, ringHot(i)); });
        // Estrella de dos: grande, con su círculo punteado.
        const big = starState.big;
        if (big && !big.taken) {
          const bob = Math.round(Math.sin(t * 2.2) * 2), w = Math.max(6, Math.round(28 * Math.max(0.3, Math.abs(Math.cos(t * 1.8)))));
          const rx = Math.round(BIG_R / WP);
          for (let i = 0; i < 28; i += 2) { const a = (i / 28) * TAU + t * 0.6; b.fillStyle = "#fff6b0"; b.fillRect(Math.round(bx(big.x) + Math.cos(a) * rx), Math.round(by(big.y) + Math.sin(a) * rx * 0.6), 2, 2); }
          b.drawImage(star, bx(big.x) - (w >> 1), by(big.y) - 20 + bob, w, 28);
        }
        // Estrella dorada sin dueño.
        if (!starState.it) { const w = Math.max(3, Math.round(18 * Math.abs(Math.cos(t * 4)))); b.drawImage(star, bx(GOLDEN.x) - (w >> 1), by(GOLDEN.y) - 14 + Math.round(Math.sin(t * 5) * 2), w, 18); }
      }
    }
    // Chispas.
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) { b.globalAlpha = clamp((p.life / p.max) * 1.6, 0, 1); b.fillStyle = p.c; b.fillRect(Math.round(p.x - X0 - p.s / 2), Math.round(p.y - Y0 - p.s / 2), p.s, p.s); }
    b.globalAlpha = 1;

    if (!f.mini) {
      // Fantasmas, de atrás para adelante.
      for (const e of [...flyers].sort((a, c) => a.y - c.y)) {
        const st = state.get(e.id) as Fly, rc = Math.cos(st.roll * TAU), back = st.roll > 0 && rc < 0;
        const sp = ghostSprite(e.model, e.color, back);
        if (!sp) continue;
        // Turbo: a toda velocidad suelta chispas por detrás.
        if (!f.quiet && e.thrust > 0.9 && e.table == null) {
          const fx = Math.cos(e.ang), fy = Math.sin(e.ang), cols = ["#fff6b0", "#ffd93d", "#ff9b2e", "#ffffff"];
          const j = (Math.random() - 0.5) * 6;
          emit({ x: e.x / WP - fx * 9 - fy * j, y: e.y / WP - fy * 9 + fx * j, vx: -fx * (30 + Math.random() * 30), vy: -fy * (30 + Math.random() * 30), life: 0.35 + Math.random() * 0.4, max: 0.75, c: cols[(Math.random() * 4) | 0], s: Math.random() < 0.4 ? 2 : 1 });
        }
        const scx = (st.roll > 0 ? Math.max(0.12, Math.abs(rc)) : 1) * (1 - 0.22 * Math.abs(st.bank));
        const q = TAU / 24, rot = Math.round((st.rot + st.bank * 0.12) / q) * q;
        const wob = f.quiet ? 0 : Math.floor(t * 9 + e.bob * 4) & 3, lift = st.roll > 0 ? Math.sin(st.roll * PI) * 4 : 0;
        b.save(); b.translate(bx(e.x), Math.round(by(e.y) - 1 - lift)); if (rot) b.rotate(rot); if (scx !== 1) b.scale(scx, 1);
        b.drawImage(sp.frames[wob], -(sp.w >> 1), -(sp.h >> 1)); b.restore();
        if (starState.it && starState.it === e.id) crownTop(bx(e.x), Math.round(by(e.y) - lift - (sp.h >> 1) - 4));
      }
    }
    // Nubes por encima de todo.
    for (const c of clouds) {
      const x = ((c.x + (f.quiet ? 0 : c.v * t)) % (terrain.w + 80)) - 40;
      b.drawImage(c.s.c, Math.round(x - X0) - (c.s.w >> 1), Math.round(c.y - Y0) - (c.s.h >> 1));
    }

    // ── Ampliar sin suavizado ──
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = unit < 1.5;
    ctx.fillStyle = WATER[5]; ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(buf, (X0 * WP - view.camx) * scale + view.ox, (Y0 * WP - view.camy) * scale + view.oy, bw * unit, bh * unit);
    ctx.imageSmoothingEnabled = true;

    if (f.mini) {
      for (const p of f.places) if (p.kind !== "islet") { const s = toScreen(p.x, p.y + p.r * 0.6); text(s.x, Math.min(s.y, vh - 14), p.short, 10); }
      return;
    }
    if (f.marker) {
      const s = toScreen(f.marker.x, f.marker.y), k = 4 + Math.round(((f.marker.t * 2) % 1) * 4);
      ctx.fillStyle = "#fff"; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillRect(s.x + dx * k - 2, s.y + dy * k - 2, 4, 4);
    }
    for (const p of f.places) {
      const near = p === f.nearPlace, s = toScreen(p.x, p.y + p.r * (p.kind === "islet" ? 0.55 : 0.62));
      if (p.kind === "islet") { text(s.x, s.y, `${p.short} · ${f.tableCounts[p.table as number] ?? 0} de ${seats}`, 11, near ? "#ffd93d" : "#fff", true); continue; }
      text(s.x, s.y, p.short, 14, near ? "#ffd93d" : "#fff");
      const st = f.placeStatus[p.id];
      if (st?.sub) text(s.x, s.y + 17, st.sub, 11, st.on ? "#ffd93d" : "#dff1ff");
    }
    if (structure.shared) {
      const s = toScreen(RINGS[0].x, RINGS[0].y + START_R * 0.55 + 10), ph = racePhase();
      text(s.x, s.y, ph === "countdown" ? `Carrera en ${Math.ceil(starState.raceAt - (starState.now || Date.now() / 1000))}` : ph === "on" ? "Carrera en curso" : "Salida · entra para correr", 11, ph === "off" ? "#fff" : "#ffd93d", true);
    }
    // El nombre va justo debajo del sprite (media altura en pixeles del arte, más la sombra).
    const below = 17 * unit;
    for (const e of f.others) {
      if (e.downT > 0) continue;
      const s = toScreen(e.x, e.y);
      nameTag(s.x, s.y + below, e.kind === "bot" ? e.name : e.first, e === f.nearEntity ? "#ffd93d" : "#fff", e.face?.img ?? null);
    }
    const me = toScreen(f.player.x, f.player.y);
    nameTag(me.x, me.y + below, "Tú", "#ffd93d", null);
    for (const bub of f.bubbles) {
      const s = toScreen(bub.entity.x, bub.entity.y), k = bub.t / bub.dur;
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; bubble(s.x, s.y - 15 * unit - 22 - Math.min(1, bub.t / 0.2) * 6, bub.text); ctx.globalAlpha = 1;
    }
    edgeHints();
  }

  // ── Texto con contorno, como el letrero del juego ──
  function text(x: number, y: number, s: string, size: number, color = "#fff", free = false) {
    ctx.font = `800 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const w = ctx.measureText(s).width, cx = free ? x : clamp(x, w / 2 + 6, view.vw - w / 2 - 6);
    ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.strokeText(s, cx, y);
    ctx.fillStyle = color; ctx.fillText(s, cx, y);
  }
  function nameTag(x: number, y: number, s: string, color: string, img: HTMLImageElement | null) {
    ctx.font = `800 11px ${FONT}`;
    const w = ctx.measureText(s).width, lead = img ? 16 : 0, x0 = x - (w + lead) / 2;
    if (img && img.complete && img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(x0 + 6, y + 6, 6, 0, TAU); ctx.fillStyle = OUTLINE; ctx.fill(); ctx.clip();
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, x0 + 1, y + 1, 10, 10); ctx.restore();
    }
    text(x0 + lead + w / 2, y, s, 11, color, true);
  }
  function bubble(x: number, y: number, s: string) {
    ctx.font = `800 11px ${FONT}`; const w = ctx.measureText(s).width + 14, h = 20, x0 = clamp(x - w / 2, 4, view.vw - w - 4);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x0 - 2, y - 2, w + 4, h + 4); ctx.fillStyle = "#f2f6fb"; ctx.fillRect(x0, y, w, h);
    ctx.fillStyle = OUTLINE; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x0 + 7, y + h / 2 + 0.5);
  }
  function edgeHints() {
    const { vw, vh } = view, top = 56, m = 12;
    for (const p of frame.places) {
      if (p.kind === "islet" && p.table !== 1) continue;
      const s = toScreen(p.x, p.y);
      // Si la isla asoma (y con ella su nombre), no hace falta la flechita.
      const pad = p.r * 0.6 * view.scale;
      if (s.x > -pad && s.x < vw + pad && s.y > top - 40 - pad && s.y < vh + pad) continue;
      const name = p.kind === "islet" ? "Islotes" : p.short;
      ctx.font = `800 10px ${FONT}`; const w = ctx.measureText(name).width + 26, h = 20;
      // Arriba a la derecha va el botón de cámara: ahí la pista se hace a un lado.
      const cy = clamp(s.y, top + h / 2, vh - m - h / 2 - 4); const right = cy < 120 ? 70 : m;
      const cx = clamp(s.x, m + w / 2, vw - right - w / 2);
      ctx.fillStyle = OUTLINE; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.save(); ctx.translate(cx - w / 2 + 10, cy); ctx.rotate(Math.atan2(s.y - cy, s.x - cx)); ctx.fillStyle = "#ffd93d";
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, cx - w / 2 + 18, cy + 0.5);
    }
  }

  function event(ev: WorldEvent) {
    if (ev.type === "calm") { parts = []; for (const f of flies.values()) f.trail = []; }
    else if (ev.type === "greet") {
      // Saludo: el fantasma da una vuelta de barril con un aro de chispas, como el doble toque del juego.
      const e = ev.entity, f = flies.get(e.id);
      if (f && f.roll <= 0) f.roll = 0.001;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; emit({ x: e.x / WP, y: e.y / WP, vx: Math.cos(a) * 34, vy: Math.sin(a) * 34, life: 0.5, max: 0.5, c: "#fff", s: 2 }); }
    } else if (ev.type === "tickle") {
      const e = ev.entity;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; emit({ x: e.x / WP, y: e.y / WP, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.35, max: 0.35, c: "#ffd93d", s: 1 }); }
    }
  }

  // ── Vista de persecución (modo 7), como la cámara 🎥 del juego ──
  const chase = createChase(terrain);
  let camMode = 0, flash = 0, snap = true;
  const chaseOn = () => camMode === 1 && !frame?.mini;
  function toggleCam() {
    camMode = camMode ? 0 : 1; flash = 1; snap = true;
    window.dispatchEvent(new CustomEvent("archipielago:cam", { detail: camMode }));
    camBtn.setAttribute("aria-pressed", String(camMode === 1));
  }
  // Botón de cámara en pixel art (el icono del juego), arriba a la derecha bajo los botones del club.
  const camBtn = document.createElement("button");
  camBtn.type = "button"; camBtn.title = "Cambiar cámara (C)"; camBtn.setAttribute("aria-label", "Cambiar cámara"); camBtn.setAttribute("aria-pressed", "false");
  camBtn.style.cssText = "position:absolute;right:14px;top:60px;z-index:4;width:46px;height:46px;border:0;padding:0;border-radius:50%;background:#2a86dc;box-shadow:0 0 0 3px #0b2f66,inset 4px 4px 0 #6cc3f7,inset -4px -4px 0 #1a5fb4;display:grid;place-items:center;cursor:pointer";
  {
    const ic = document.createElement("canvas"); ic.width = 18; ic.height = 11; ic.style.cssText = "width:27px;height:16.5px;image-rendering:pixelated;pointer-events:none";
    const rows = ["....XXXX..........", "...XWWWWX.XXXX....", ".XXXXXXXXXXWWX....", "XWWWWWWWWWXWWWX...", "XWWXXXXWWWXXWWWX..", "XWXLLLLXWWWXXWWWX.", "XWXLllLXWWWXXWWWX.", "XWXLLLLXWWWXXWWWX.", "XWWXXXXWWWXXWWX...", "XWWWWWWWWWXWWX....", ".XXXXXXXXXXXXX...."];
    const pal: Record<string, string> = { X: "#0b2f66", W: "#f2f6fb", L: "#58b8f0", l: "#ffffff" }, ig = ic.getContext("2d") as Ctx;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { ig.fillStyle = pal[ch]; ig.fillRect(x, y, 1, 1); } }));
    camBtn.appendChild(ic);
  }
  camBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); }); // no mover al fantasma con el toque
  camBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleCam(); });
  stage.appendChild(camBtn);
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (e.code !== "KeyC" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    toggleCam();
  };
  window.addEventListener("keydown", onKey);

  function renderChase(f: WorldFrame) {
    const t = f.t, dt = f.dt, me = f.player, g = chase.ctx, PS = chase.PS, W = chase.W, H = chase.H;
    // Turbo (por encima de la velocidad tope): el lente se abre un poco, como en el juego.
    const boost = Math.hypot(me.vx, me.vy) > structure.movement.maxSpeed * 1.05 ? 1 : 0;
    chase.follow(me.x, me.y, me.ang, dt, boost, snap); snap = false;
    chase.ground();
    g.imageSmoothingEnabled = false;
    const flyers = [...f.others, me].filter((e) => e.downT <= 0);
    const state = new Map(flyers.map((e) => [e.id, flyOf(e, t)] as const));
    // Tamaño relativo a tu fantasma (que va fijo a 1×); topado para que nadie tape la pantalla al pasar cerca.
    const kRel = (z: number) => Math.min(1.25, chase.camBack / z);
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];
    const ell2 = (cx: number, cy: number, rx: number, ry: number) => {
      for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01)))); g.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1); }
    };
    // Nubes: su sombra se pinta en el piso de inmediato; la nube va a la lista por distancia.
    g.globalAlpha = 0.4;
    for (const c of clouds) {
      const cx = (((c.x + (f.quiet ? 0 : c.v * t)) % (terrain.w + 80)) - 40) * WP, cy = c.y * WP;
      const sh = chase.project(cx + c.alt * 0.2 * WP, cy + c.alt * 0.28 * WP, 0);
      if (sh && sh.z > 14) { const w = c.s.w * sh.sk, h = c.s.h * sh.sk * 0.32; if (w > 2 && w < W * 2) g.drawImage(c.s.s, Math.round(sh.x - w / 2), Math.round(sh.y - h / 2), Math.ceil(w), Math.max(1, Math.ceil(h))); }
      const p = chase.project(cx, cy, c.alt);
      if (p && p.z > 18) items.push({ z: p.z, draw: () => { const w = c.s.w * p.sk, h = c.s.h * p.sk; if (w < W * 1.6 && w > 2) g.drawImage(c.s.c, Math.round(p.x - w / 2), Math.round(p.y - h * 0.62), Math.ceil(w), Math.ceil(h)); } });
    }
    g.globalAlpha = 1;
    // Estrellas de la tanda.
    const now = starState.now || Date.now() / 1000, wave = Math.floor(now / STAR_EVERY);
    if (structure.shared) starsOf(wave, structure.size, f.places).forEach((s, i) => {
      if (starState.taken.has(starKey(wave, i))) return;
      const p = chase.project(s.x, s.y, ALT + Math.sin(t * 3 + i) * 2), gr = chase.project(s.x, s.y, 0);
      if (!p || p.z > chase.far * 0.8) return;
      if (gr) { g.fillStyle = "rgba(8,40,100,.3)"; ell2(gr.x, gr.y, Math.max(2, Math.round(5 * p.sk)), Math.max(1, Math.round(1.5 * p.sk))); }
      items.push({ z: p.z, draw: () => { const k = kRel(p.z) * 1.6, w = Math.max(2, Math.round(14 * k * Math.max(0.28, Math.abs(Math.cos(t * 2.6 + i))))), h = Math.max(2, Math.round(14 * k)); g.drawImage(star, Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h); } });
    });
    if (structure.shared) {
      showers();
      RINGS.forEach((r, i) => {
        if (!ringOn(i)) return;
        const p = chase.project(r.x, r.y, ALT); if (!p || p.z > chase.far * 0.9) return;
        const hot = ringHot(i), R = i === 0 ? START_R : RING_R;
        items.push({ z: p.z, draw: () => {
          const k = kRel(p.z) * 1.6, rx = Math.max(3, Math.round(R * 0.32 * k)), ry = Math.max(3, Math.round(R * 0.38 * k)), n = 40;
          for (let j = 0; j < n; j++) { const a = (j / n) * TAU; g.fillStyle = hot && ((j + Math.floor(t * 12)) % 6 < 3) ? "#fff6b0" : i === 0 ? "#f4a39a" : "#e8f1fa"; g.fillRect(Math.round(p.x + Math.cos(a) * rx) - 1, Math.round(p.y + Math.sin(a) * ry) - 1, Math.max(2, Math.round(k * 1.5)), Math.max(2, Math.round(k * 1.5))); }
        } });
      });
      const special: { x: number; y: number; size: number }[] = [];
      if (starState.big && !starState.big.taken) special.push({ ...starState.big, size: 28 });
      if (!starState.it) special.push({ ...GOLDEN, size: 18 });
      for (const sp of special) {
        const p = chase.project(sp.x, sp.y, ALT); if (!p || p.z > chase.far * 0.8) continue;
        items.push({ z: p.z, draw: () => { const k = kRel(p.z) * 1.6, h = Math.max(3, Math.round(sp.size * k)), w = Math.max(2, Math.round(h * Math.max(0.28, Math.abs(Math.cos(t * 2.6))))); g.drawImage(star, Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h); } });
      }
      const it = starState.it ? flyers.find((e) => e.id === starState.it) : null;
      const ip = it ? chase.project(it.x, it.y, ALT + 16) : null;
      if (ip) items.push({ z: ip.z - 0.01, draw: () => { const h = Math.max(4, Math.round(10 * kRel(ip.z) * 1.4)); g.drawImage(star, Math.round(ip.x - h / 2), Math.round(ip.y - h / 2), h, h); } });
    }
    // Edificios de las islas, de pie sobre el piso.
    for (const pl of f.places) {
      const key = pl.kind === "lighthouse" ? `lh:${!!f.placeStatus[pl.id]?.on}` : pl.kind === "islet" ? "fireOff" : `d:${pl.kind}`;
      const img = pl.kind === "lighthouse" ? spr(key, () => bake(DECOR.lighthouse, { L: f.placeStatus[pl.id]?.on ? "#fff6b0" : "#8f877f" })) : pl.kind === "islet" ? spr("fire:false:false", () => bake(DECOR.fireOff)) : DECOR[pl.kind] ? spr(key, () => bake(DECOR[pl.kind])) : null;
      const p = chase.project(pl.x, pl.y, 0);
      if (!img || !p || p.z > chase.far) continue;
      items.push({ z: p.z, draw: () => { const w = img.width * p.sk, h = img.height * p.sk; if (w < W * 2) g.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - h), Math.ceil(w), Math.ceil(h)); } });
    }
    // Fantasmas: sombra en el piso y su sprite (de espaldas si van alejándose de la cámara).
    for (const e of flyers) {
      const st = state.get(e.id) as Fly, isMe = e === me;
      const gr = chase.project(e.x, e.y, 0), p = chase.project(e.x, e.y, ALT);
      if (!p) continue;
      if (gr) { g.fillStyle = "rgba(8,40,100,.4)"; const k = kRel(p.z); ell2(gr.x + st.bank * 14 * k, gr.y, Math.max(2, Math.round(13 * k)), Math.max(1, Math.round(3 * k))); }
      items.push({ z: p.z, draw: () => {
        const away = isMe || Math.cos(angd(e.ang, chase.heading)) > 0.3, rc = Math.cos(st.roll * TAU), back = away ? !(st.roll > 0 && rc < 0) : st.roll > 0 && rc < 0;
        const sp = ghostSprite(e.model, e.color, back); if (!sp) return;
        const k = isMe ? 1 : kRel(p.z), wob = f.quiet ? 0 : Math.floor(t * 9 + e.bob * 4) & 3;
        const q = TAU / 24, rot = Math.round((st.bank * 0.42 + (st.roll > 0 ? st.roll * TAU : 0)) / q) * q;
        g.save(); g.translate(Math.round(p.x + st.bank * 15 * k), Math.round(p.y + (f.quiet ? 0 : Math.sin(t * 3 + e.bob) * 1.2))); if (rot) g.rotate(rot); g.scale(k, k);
        g.drawImage(sp.frames[wob], -(sp.w >> 1), -(sp.h >> 1)); g.restore();
      } });
    }
    // Estela doble de cada fantasma (dorada si vuela en formación).
    const formation = new Set(starState.formation);
    for (const e of flyers) {
      g.fillStyle = formation.has(e.id) ? "#ffd93d" : "#fff";
      const tr = (state.get(e.id) as Fly).trail, n = tr.length; if (n < 3) continue;
      for (const side of [-1, 1]) {
        let prev: { x: number; y: number } | null = null;
        tr.forEach((q, i) => {
          const p = chase.project(q.x - Math.sin(q.ang) * 18 * side, q.y + Math.cos(q.ang) * 18 * side, ALT - 2);
          if (p && prev && i > 1) { g.globalAlpha = (Math.ceil((i / n) * 4) / 4) * 0.95; line(g, Math.round(prev.x), Math.round(prev.y), Math.round(p.x), Math.round(p.y)); }
          prev = p;
        });
      }
    }
    g.globalAlpha = 1;
    for (const it of items.sort((a, c) => c.z - a.z)) it.draw();
    // Chispas.
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) { const q = chase.project(p.x * WP, p.y * WP, ALT); if (!q) continue; g.globalAlpha = clamp((p.life / p.max) * 1.6, 0, 1); g.fillStyle = p.c; const s = Math.max(1, Math.round(p.s * clamp(q.sk * 0.3, 1, 1.7))); g.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s); }
    g.globalAlpha = 1;
    if (flash > 0) { g.globalAlpha = flash * 0.85; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; flash = Math.max(0, flash - dt * 3.5); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(chase.canvas, 0, 0, W * PS, H * PS);
    ctx.imageSmoothingEnabled = true;
    // Nombres: lugares sobre el piso, personas bajo su fantasma; sólo lo cercano.
    for (const pl of f.places) {
      const p = chase.project(pl.x, pl.y, 0); if (!p || p.z > 260) continue;
      text(p.x * PS, p.y * PS + 4, pl.kind === "islet" ? `${pl.short} · ${f.tableCounts[pl.table as number] ?? 0} de ${seats}` : pl.short, pl.kind === "islet" ? 11 : 14, pl === f.nearPlace ? "#ffd93d" : "#fff", true);
    }
    for (const e of f.others) {
      if (e.downT > 0) continue;
      const p = chase.project(e.x, e.y, ALT); if (!p || p.z > 220) continue;
      nameTag(p.x * PS, (p.y + 15 * kRel(p.z)) * PS, e.kind === "bot" ? e.name : e.first, e === f.nearEntity ? "#ffd93d" : "#fff", e.face?.img ?? null);
    }
    for (const bub of f.bubbles) {
      const p = chase.project(bub.entity.x, bub.entity.y, ALT); if (!p) continue;
      const k = bub.t / bub.dur, kk = bub.entity === me ? 1 : kRel(p.z);
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; bubble(p.x * PS, (p.y - 18 * kk) * PS - 24, bub.text); ctx.globalAlpha = 1;
    }
  }

  loadGhosts();
  return {
    resize(v) {
      view = v; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(v.vw * dpr); cv.height = Math.round(v.vh * dpr);
      chase.resize(v.vw, v.vh);
    },
    render,
    event,
    // En persecución los controles son de avión (izquierda/derecha giran, arriba avanza).
    camera: () => (chaseOn() ? { controls: "steer", yaw: 0 } : { controls: "direct", yaw: 0 }),
    toScreen,
    toWorld: (sx, sy) => (chaseOn() ? chase.unproject(sx / chase.PS, sy / chase.PS) : { x: (sx - view.ox) / view.scale + view.camx, y: (sy - view.oy) / view.scale + view.camy }),
    destroy() { parts = []; flies.clear(); window.removeEventListener("keydown", onKey); camBtn.remove(); },
  };
}
