// Archipiélago: renderizador en canvas 2D, portado de la vista aérea de «Ghosty sobre las islas».
//
// Todo el mundo se pinta en un búfer chico (un pixel = `WP` unidades del mapa) alineado a la rejilla
// y se amplía sin suavizado: terreno con tramado, olas que destellan, estelas blancas dobles, sombras
// de nubes, estrellas que giran, chispas, fantasmas que se inclinan al girar y nubes por encima.
// Encima, ya en resolución real, van los nombres con contorno, las burbujas y las pistas de orilla.

import type { Entity, View, WorldEvent, WorldFrame, WorldRenderer, WorldStructure } from "../../cartridge";
import { TAU, buildStar, ghostSprite, loadGhosts, makeCloud, type Cloud } from "./ghost";
import { DECOR, bake } from "./landmarks";
import { STAR_EVERY, starKey, starState, starsOf } from "./stars";
import { WATER, WP, buildTerrain, hsh, mulberry } from "./terrain";

type Ctx = CanvasRenderingContext2D;
const PI = Math.PI;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const angd = (a: number, b: number) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const OUTLINE = "#0b2f66", FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Lo que la skin recuerda de cada fantasma para animarlo (inclinación, giro, estela). */
type Fly = { rot: number; bank: number; roll: number; trail: { x: number; y: number; ang: number; t: number }[]; lastT: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number };

export function createRenderer({ canvas: cv, structure }: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure }): WorldRenderer {
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
    return Array.from({ length: 14 }, () => ({ x: rng() * terrain.w, y: rng() * terrain.h, alt: 52 + rng() * 40, v: 1.5 + rng() * 2.5, s: shapes[(rng() * shapes.length) | 0] as Cloud }));
  })();
  const flies = new Map<string, Fly>();
  let parts: Particle[] = [];
  const seenStars = new Set<string>();
  let view: View = { vw: 1, vh: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 }, dpr = 1;
  let frame: WorldFrame;
  let X0 = 0, Y0 = 0; // esquina del búfer, en pixeles del arte
  const toScreen = (x: number, y: number) => ({ x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy });
  /** Del mapa (unidades) al pixel del búfer. */
  const bx = (x: number) => Math.round(x / WP - X0), by = (y: number) => Math.round(y / WP - Y0);

  function ell(cx: number, cy: number, rx: number, ry: number) {
    for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01)))); b.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
  }
  function line(x0: number, y0: number, x1: number, y1: number) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
    for (let k = 0; k < 300; k++) { b.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
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

  function drawTrail(f: Fly) {
    const n = f.trail.length; if (n < 3) return;
    b.fillStyle = "#fff";
    for (const side of [-1, 1]) {
      let px = 0, py = 0;
      f.trail.forEach((p, i) => {
        const x = bx(p.x - Math.sin(p.ang) * 18 * side), y = by(p.y + Math.cos(p.ang) * 18 * side) + 6;
        if (i > 1) { b.globalAlpha = (Math.ceil((i / n) * 4) / 4) * 0.9; line(px, py, x, y); }
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
    if (!f.mini && !f.quiet) for (const e of flyers) drawTrail(state.get(e.id) as Fly);

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
      const cx = clamp(s.x, m + w / 2, vw - m - w / 2), cy = clamp(s.y, top + h / 2, vh - m - h / 2 - 4);
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

  loadGhosts();
  return {
    resize(v) {
      view = v; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(v.vw * dpr); cv.height = Math.round(v.vh * dpr);
    },
    render,
    event,
    destroy() { parts = []; flies.clear(); },
  };
}
