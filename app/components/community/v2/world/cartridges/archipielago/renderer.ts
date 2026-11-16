// Archipiélago: renderizador en canvas 2D con look pixel art.
//
// El mundo (mar, islas, sombras, vehículos, estrellas) se pinta en un búfer chico donde un pixel vale
// `WP` unidades del mapa, alineado a la rejilla, y se amplía sin suavizado al lienzo: pixeles gordos y
// nítidos. Encima, ya en resolución real, van las caras (foto del miembro o Ghosty oficial, que nunca
// se repinta), las etiquetas y las burbujas.

import type { Entity, Place, View, WorldEvent, WorldFrame, WorldRenderer, WorldStructure } from "../../cartridge";
import { STAR_EVERY, starKey, starState, starsOf } from "./stars";
import { C, DECOR, FONT, TAU, VEHICLES, WP, bake, clamp, colorOf, ghosty, seeded, spriteCache, vehicle } from "./sprites";

type Ctx = CanvasRenderingContext2D;
type Fx = { x: number; y: number; vx: number; vy: number; t: number; dur: number; color: string };

/** Dónde se planta la decoración de cada tipo de isla (en pixeles, respecto al centro) y su radio. */
const ISLAND_K: Record<string, number> = { lighthouse: 0.62, mural: 0.6, cinema: 0.6, school: 0.6, islet: 0.5 };
const LABEL_DY: Record<string, number> = { lighthouse: 0.78, mural: 0.74, cinema: 0.74, school: 0.74, islet: 0.62 };

/** Isla en pixel art: arena, pasto con textura, espuma y agua bajita alrededor. Se hornea una vez. */
function bakeIsland(p: Place, seed: number) {
  const R = (p.r * (ISLAND_K[p.kind] ?? 0.6)) / WP, pad = 7, half = Math.ceil(R * 1.2) + pad, size = half * 2;
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const g = cv.getContext("2d") as Ctx, img = g.createImageData(size, size), rnd = seeded(seed);
  const s1 = rnd() * TAU, s2 = rnd() * TAU, hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const cols = { shallow: hex(C.shallow), foam: hex(C.foam), sand: hex(C.sand), sandDark: hex(C.sandDark), grass: hex(C.grass), grassDark: hex(C.grassDark) };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - half + 0.5, dy = y - half + 0.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const edge = R * (1 + 0.09 * Math.sin(3 * a + s1) + 0.05 * Math.sin(7 * a + s2));
    let c: number[] | null = null;
    if (d > edge + pad - 1) c = null;
    else if (d > edge + 1.2) c = cols.shallow;
    else if (d > edge) c = cols.foam;
    else if (d > edge - 3) c = (x * 7 + y * 13) % 11 === 0 ? cols.sandDark : cols.sand;
    else c = rnd() < 0.07 ? cols.grassDark : cols.grass;
    if (!c) continue;
    const i = (y * size + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Palmeras alrededor de la orilla de pasto.
  const palm = bake(DECOR.palm), n = p.kind === "islet" ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const a = s1 + (i * TAU) / n + 0.9, rr = R - 7;
    g.drawImage(palm, Math.round(half + Math.cos(a) * rr - 3), Math.round(half + Math.sin(a) * rr * 0.8 - 6));
  }
  return { cv, half };
}

export function createRenderer({ canvas: cv, structure }: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure }): WorldRenderer {
  const ctx = cv.getContext("2d") as Ctx;
  const buf = document.createElement("canvas"), b = buf.getContext("2d") as Ctx;
  const cache = spriteCache();
  const islands = new Map(structure.places.map((p, i) => [p.id, bakeIsland(p, i * 31 + 7)]));
  const waves = (() => { const r = seeded(5); return Array.from({ length: 160 }, () => ({ x: r() * structure.size.w, y: r() * structure.size.h, ph: r() * TAU, len: 2 + Math.floor(r() * 3) })); })();
  const seatsPerTable = structure.tables[0]?.seats.length ?? 0;
  const facing = new Map<string, boolean>();
  let fx: Fx[] = [];
  let view: View = { vw: 1, vh: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 }, dpr = 1;
  let frame: WorldFrame;
  let X0 = 0, Y0 = 0; // esquina del búfer en unidades del mapa (múltiplo de WP)
  const toScreen = (x: number, y: number) => ({ x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy });
  /** Del mapa al pixel del búfer (entero: así todo cae en la rejilla). */
  const px = (x: number) => Math.round((x - X0) / WP), py = (y: number) => Math.round((y - Y0) / WP);
  const blit = (img: HTMLCanvasElement, x: number, y: number, ax = 0.5, ay = 0.5) => b.drawImage(img, px(x) - Math.round(img.width * ax), py(y) - Math.round(img.height * ay));

  // ── Mundo en pixeles ──
  function drawSea(t: number, quiet: boolean) {
    b.fillStyle = C.sea; b.fillRect(0, 0, buf.width, buf.height);
    b.fillStyle = C.wave;
    for (const w of waves) {
      const k = quiet ? 1 : Math.sin(t * 1.1 + w.ph);
      if (k < 0.1) continue;
      const shift = quiet ? 0 : Math.round(Math.sin(t * 0.6 + w.ph) * 1.5);
      b.fillRect(px(w.x) + shift, py(w.y), w.len, 1);
    }
  }
  function drawIsland(p: Place, t: number) {
    const isl = islands.get(p.id);
    if (!isl) return;
    b.drawImage(isl.cv, px(p.x) - isl.half, py(p.y) - isl.half);
    const status = frame.placeStatus[p.id];
    if (p.kind === "lighthouse") {
      const on = !!status?.on;
      // Con la sala abierta el faro se enciende y su haz gira.
      if (on && !frame.quiet) {
        const a = t * 1.4; b.fillStyle = "rgba(255, 233, 168, .35)";
        for (let s = 3; s < 34; s++) for (const da of [-0.06, 0, 0.06]) b.fillRect(px(p.x) + Math.round(Math.cos(a + da) * s), py(p.y) - 13 + Math.round(Math.sin(a + da) * s * 0.6), 1, 1);
      }
      blit(cache(`lh:${on}`, () => bake(DECOR.lighthouse, { L: on ? "#FFE9A8" : "#7C8A8E" })), p.x, p.y - 6 * WP, 0.5, 0.6);
    } else if (p.kind === "islet") {
      const busy = (frame.tableCounts[p.table as number] ?? 0) > 0, tb = structure.tables[p.table as number];
      for (const s of tb?.seats ?? []) blit(cache("stump", () => bake(DECOR.stump)), s.x, s.y);
      const flick = busy && !frame.quiet && Math.sin(t * 9) > 0;
      blit(cache(`fire:${busy}:${flick}`, () => bake(busy ? DECOR.fire : DECOR.fireOff, flick ? { o: "#FFE9A8", Y: "#F7B267" } : {})), p.x, p.y);
    } else if (DECOR[p.kind]) {
      blit(cache(`d:${p.kind}`, () => bake(DECOR[p.kind])), p.x, p.y - 3 * WP);
    }
  }
  function drawStars(t: number) {
    if (!structure.shared) return;
    const now = starState.now || Date.now() / 1000, wave = Math.floor(now / STAR_EVERY), left = STAR_EVERY - (now % STAR_EVERY);
    starsOf(wave, structure.size, frame.places).forEach((s, i) => {
      if (starState.taken.has(starKey(wave, i))) return;
      // Parpadea los últimos 3 s antes de cambiar de tanda.
      if (left < 3 && !frame.quiet && Math.sin(t * 18) < 0) return;
      const up = frame.quiet ? 0 : Math.round(Math.sin(t * 3 + i) * 1);
      b.fillStyle = C.shadow; b.fillRect(px(s.x) - 2, py(s.y) + 4, 5, 1);
      b.drawImage(cache("star", () => bake(DECOR.star, { S: C.starDark })), px(s.x) - 2, py(s.y) - 2 + up);
    });
  }
  function bobOf(e: Entity, t: number) { return frame.quiet ? 0 : Math.round(Math.sin(t * 2.2 + e.bob * TAU) * 1); }
  function drawFlyer(e: Entity, t: number) {
    const lift = e.table != null ? 1 : 5; // sentado vuela bajito
    // Sombra sobre el agua: un óvalo de pixeles, más abajo que el vehículo.
    b.fillStyle = C.shadow; b.globalAlpha = 0.55;
    b.fillRect(px(e.x) - 4, py(e.y) + lift + 1, 9, 1); b.fillRect(px(e.x) - 3, py(e.y) + lift, 7, 3);
    b.globalAlpha = 1;
    if (Math.abs(Math.cos(e.ang)) > 0.2 && e.thrust > 0.05) facing.set(e.id, Math.cos(e.ang) < 0);
    const flip = e.model === "balloon" ? false : facing.get(e.id) ?? false;
    const v = vehicle(cache, e.model, e.color, flip);
    if (v) b.drawImage(v, px(e.x) - Math.round(v.width / 2), py(e.y) - Math.round(v.height / 2) + bobOf(e, t));
    // Estela: soplos blancos cuando acelera.
    if (!frame.quiet && e.thrust > 0.45 && Math.random() < 0.35) {
      const back = flip ? 1 : -1;
      fx.push({ x: e.x + back * 30, y: e.y + (Math.random() - 0.5) * 8, vx: back * 20, vy: 0, t: 0, dur: 0.5, color: C.ink });
    }
  }

  // ── Encima, en resolución real ──
  /** Centro de la cara de quien vuela, en pantalla, y su radio. */
  function seatOf(e: Entity, t: number) {
    const sp = VEHICLES[e.model], s = toScreen(e.x, e.y), k = WP * view.scale, bob = bobOf(e, t) * k;
    if (!sp?.seat) return { x: s.x, y: s.y + bob, r: 15 * view.scale, solo: true };
    const w = Math.max(...sp.rows.map((r) => r.length)), h = sp.rows.length;
    const flip = e.model === "balloon" ? false : facing.get(e.id) ?? false;
    const sx = flip ? w - sp.seat.x : sp.seat.x;
    return { x: s.x + (sx - w / 2) * k, y: s.y + (sp.seat.y - h / 2) * k + bob, r: sp.seat.r * k, solo: false };
  }
  function drawFace(e: Entity, t: number) {
    const st = seatOf(e, t), g = ghosty();
    if (e.pilot === "ghosty" && g && g.complete && g.naturalWidth) {
      // Ghosty oficial, sólo escalado (nunca repintado).
      const h = st.solo ? st.r * 2.6 : st.r * 2.8, w = (h * g.naturalWidth) / g.naturalHeight;
      ctx.drawImage(g, st.x - w / 2, st.y - h * (st.solo ? 0.5 : 0.75), w, h);
      return;
    }
    const f = e.face, col = colorOf(e.color);
    ctx.fillStyle = f?.bg ?? col.fill; ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(1, st.r * 0.18);
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill();
    if (f?.img && f.img.complete && f.img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.clip();
      const iw = f.img.naturalWidth, ih = f.img.naturalHeight, side = Math.min(iw, ih);
      ctx.drawImage(f.img, (iw - side) / 2, (ih - side) / 2, side, side, st.x - st.r, st.y - st.r, st.r * 2, st.r * 2); ctx.restore();
    } else if (f) {
      ctx.fillStyle = f.fg; ctx.font = `700 ${Math.round(st.r * 1.05)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.initials, st.x, st.y + 0.5);
    }
    ctx.stroke();
  }
  type LabelOpts = { size?: number; color?: string; stroke?: string; bg?: string; free?: boolean };
  function label(x: number, y: number, text: string, o: LabelOpts = {}) {
    const size = o.size ?? 11; ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(text).width + 14, h = size + 8;
    const bx = o.free ? x - w / 2 : clamp(x - w / 2, 4, Math.max(4, view.vw - w - 4));
    ctx.fillStyle = o.bg ?? C.pill; ctx.fillRect(bx, y, w, h);
    ctx.strokeStyle = o.stroke ?? C.line; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = o.color ?? C.ink; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, bx + 7, y + h / 2 + 0.5);
    return h;
  }
  function drawEdgeHints() {
    const { vw, vh } = view, top = 56, m = 12;
    for (const p of frame.places) {
      if (p.kind === "islet" && p.table !== 1) continue;
      const s = toScreen(p.x, p.y);
      if (s.x > -20 && s.x < vw + 20 && s.y > top - 40 && s.y < vh + 20) continue;
      const name = p.kind === "islet" ? "Islotes" : p.short;
      ctx.font = `700 10px ${FONT}`; const w = ctx.measureText(name).width + 28, h = 20;
      const cx = clamp(s.x, m + w / 2, vw - m - w / 2), cy = clamp(s.y, top + h / 2, vh - m - h / 2 - 4);
      ctx.fillStyle = C.pill; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.save(); ctx.translate(cx - w / 2 + 11, cy); ctx.rotate(Math.atan2(s.y - cy, s.x - cx)); ctx.fillStyle = C.mint;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.text; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, cx - w / 2 + 20, cy + 0.5);
    }
  }

  function render(f: WorldFrame) {
    frame = f; view = f.view;
    for (const e of fx) { e.t += f.dt; e.x += e.vx * f.dt; e.y += e.vy * f.dt; }
    fx = fx.filter((e) => e.t < e.dur);
    const { vw, vh, scale } = view, t = f.t;
    // Búfer alineado a la rejilla de WP que cubre la pantalla.
    const unit = WP * scale;
    X0 = Math.floor((view.camx - view.ox / scale) / WP) * WP; Y0 = Math.floor((view.camy - view.oy / scale) / WP) * WP;
    const bw = Math.ceil(vw / unit) + 2, bh = Math.ceil(vh / unit) + 2;
    if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
    b.imageSmoothingEnabled = false;

    drawSea(t, f.quiet);
    for (const p of f.places) drawIsland(p, t);
    drawStars(t);
    const flyers = [...f.others, f.player].filter((e) => e.downT <= 0).sort((a, c) => a.y - c.y);
    if (f.mini) {
      for (const e of flyers) { b.fillStyle = e.kind === "me" ? C.ink : colorOf(e.color).fill; b.fillRect(px(e.x) - 1, py(e.y) - 1, 3, 3); }
    } else for (const e of flyers) drawFlyer(e, t);
    for (const e of fx) { b.globalAlpha = 1 - e.t / e.dur; b.fillStyle = e.color; b.fillRect(px(e.x), py(e.y), 1, 1); }
    b.globalAlpha = 1;

    // Ampliar sin suavizado: pixeles gordos y nítidos.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = unit < 1.5; // en el mapa reducido el pixel es menor que uno de pantalla
    ctx.fillStyle = C.sea; ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(buf, (X0 - view.camx) * scale + view.ox, (Y0 - view.camy) * scale + view.oy, bw * unit, bh * unit);
    ctx.imageSmoothingEnabled = true;

    if (f.mini) {
      for (const p of f.places) if (p.kind !== "islet") { const s = toScreen(p.x, p.y + p.r * 0.7); label(s.x, Math.min(s.y, vh - 22), p.short, { size: 10 }); }
      return;
    }
    // Destino del toque: una cruz de pixeles que late.
    if (f.marker) {
      const s = toScreen(f.marker.x, f.marker.y), k = 3 + Math.round(((f.marker.t * 2) % 1) * 3);
      ctx.fillStyle = C.ink; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillRect(s.x + dx * k * 2 - 2, s.y + dy * k * 2 - 2, 4, 4);
    }
    for (const e of flyers) drawFace(e, t);
    for (const p of f.places) {
      const s = toScreen(p.x, p.y + p.r * (LABEL_DY[p.kind] ?? 0.7)), near = p === f.nearPlace;
      if (p.kind === "islet") { label(s.x, s.y, `${p.short} · ${f.tableCounts[p.table as number] ?? 0} de ${seatsPerTable}`, { size: 10, free: true, stroke: near ? C.mint : C.line, color: near ? C.ink : C.text }); continue; }
      const h = label(s.x, s.y, p.short, { size: 12, stroke: near ? C.mint : C.line });
      const sub = f.placeStatus[p.id]?.sub;
      if (sub) label(s.x, s.y + h + 3, sub, { size: 10, color: f.placeStatus[p.id]?.on ? C.mint : C.gray });
    }
    for (const e of f.others) {
      if (e.downT > 0) continue;
      const s = toScreen(e.x, e.y), near = e === f.nearEntity, dy = 26 * scale + 4;
      label(s.x, s.y + dy, e.kind === "bot" ? `${e.name} · robot` : e.first, { size: 10, free: true, stroke: near ? C.mint : C.line, color: near ? C.ink : C.text });
    }
    const me = toScreen(f.player.x, f.player.y);
    label(me.x, me.y + 26 * scale + 4, "Tú", { size: 11, free: true, stroke: C.mint, color: C.mint });
    for (const bub of f.bubbles) {
      const s = toScreen(bub.entity.x, bub.entity.y), k = bub.t / bub.dur, rise = Math.min(1, bub.t / 0.2) * 6;
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      label(s.x, s.y - 38 * scale - 18 - rise, bub.text, { size: 11, bg: C.ink, color: "#0E1317", stroke: C.ink });
      ctx.globalAlpha = 1;
    }
    drawEdgeHints();
  }

  function event(ev: WorldEvent) {
    if (ev.type === "calm") fx = [];
    else if (ev.type === "greet" || ev.type === "tickle") {
      const e = ev.entity, n = ev.type === "greet" ? 10 : 4;
      for (let i = 0; i < n; i++) { const a = (i * TAU) / n; fx.push({ x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, t: 0, dur: 0.7, color: i % 2 ? C.star : C.mint }); }
    }
  }

  ghosty();
  return {
    resize(v) {
      view = v; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(v.vw * dpr); cv.height = Math.round(v.vh * dpr);
    },
    render,
    event,
    destroy() { fx = []; facing.clear(); },
  };
}
