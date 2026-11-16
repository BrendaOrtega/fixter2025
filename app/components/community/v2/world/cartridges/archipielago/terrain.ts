// Archipiélago: el terreno en pixel art, con la receta de «Ghosty sobre las islas»: ruido de valor
// en capas con torcedura de dominio, seis tonos de agua por profundidad, espuma, arena, pasto con
// curvas de nivel, rocas en las cimas, bosques en racimos, rayitas de ola y tramado Bayer 4×4.
// Aquí las islas no salen al azar: cada lugar del club levanta la suya y el ruido le da la orilla.
import type { Place, WorldStructure } from "../../cartridge";

/** Unidades del mapa por pixel del arte. */
export const WP = 4;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const hsh = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };

export const WATER = ["#7fd0f5", "#4fb0ee", "#3593e1", "#2677cd", "#1d63b6", "#17529f"];
/** Cuánto pesa cada isla según el tipo de lugar (radio = `r` × esto). */
const ISLAND_K: Record<string, number> = { lighthouse: 0.95, mural: 0.9, cinema: 0.9, school: 0.9, islet: 0.62 };

export type Terrain = { cv: HTMLCanvasElement; w: number; h: number; land: (x: number, y: number) => boolean; deep: (x: number, y: number) => boolean };

export function buildTerrain(structure: WorldStructure): Terrain {
  const w = Math.ceil(structure.size.w / WP), h = Math.ceil(structure.size.h / WP), N = w * h;
  const rng = mulberry(20251116);
  const mk = (p: number) => { const a = new Float32Array(p * p); for (let i = 0; i < a.length; i++) a[i] = rng(); return { p, a }; };
  const LH = [mk(6), mk(12), mk(24), mk(48)], LP = [mk(5), mk(10), mk(20)], LT = [mk(10), mk(20), mk(40)], WX = mk(4), WY = mk(4);
  type L = { p: number; a: Float32Array };
  const vn = (l: L, u: number, v: number) => {
    const p = l.p, x = u * p, y = v * p; let xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
    xi = ((xi % p) + p) % p; yi = ((yi % p) + p) % p; const x1 = (xi + 1) % p, y1 = (yi + 1) % p, a = l.a;
    const A = a[yi * p + xi], B = a[yi * p + x1], C = a[y1 * p + xi], D = a[y1 * p + x1];
    const s = xf * xf * (3 - 2 * xf), t = yf * yf * (3 - 2 * yf);
    return A + (B - A) * s + (C - A) * t + (A - B - C + D) * s * t;
  };
  const fb = (ls: L[], u: number, v: number) => { let amp = 1, sum = 0, tot = 0; for (const l of ls) { sum += amp * vn(l, u, v); tot += amp; amp *= 0.5; } return sum / tot; };

  // Islas: una por lugar, más unas chiquitas de adorno lejos de todo.
  const bumps = structure.places.map((p: Place) => ({ x: p.x / WP, y: p.y / WP, r: (p.r * (ISLAND_K[p.kind] ?? 0.85)) / WP }));
  const r2 = mulberry(9);
  for (let i = 0, tries = 0; i < 7 && tries < 300; tries++) {
    const b = { x: 20 + r2() * (w - 40), y: 20 + r2() * (h - 40), r: 9 + r2() * 12 };
    if (bumps.some((q) => Math.hypot(q.x - b.x, q.y - b.y) < q.r + b.r + 14)) continue;
    bumps.push(b); i++;
  }
  const S = Math.max(w, h), e = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / S, v = y / S;
    const n = fb(LH, u + (vn(WX, u, v) - 0.5) * 0.16, v + (vn(WY, u, v) - 0.5) * 0.16);
    let bump = 0;
    for (const b of bumps) { const d = Math.hypot(x - b.x, y - b.y) / b.r; if (d < 1.6) bump = Math.max(bump, 1 - d * d * 0.62); }
    // e > 0 es tierra; la escala imita los rangos del juego original.
    e[y * w + x] = (bump - 0.5 + (n - 0.5) * 0.7) * 0.32;
  }
  const LE = 0.022, STEP = 0.019, eHi = 0.17;
  const lv = new Uint8Array(N);
  for (let i = 0; i < N; i++) lv[i] = e[i] > LE ? 1 + Math.min(40, Math.floor((e[i] - LE) / STEP)) : 0;
  const WC = WATER.map(rgb);
  const FOAM = rgb("#eaf8ff"), SAND_W = rgb("#d6bd80"), SAND = rgb("#efdca2"), SAND_L = rgb("#f8ecc4");
  const G = ["#8bd84b", "#70c742", "#59b13a", "#469a32"].map(rgb), LINE_L = rgb("#2f8a2b"), LINE_D = rgb("#277728");
  const RK = ["#8f877f", "#a9a199", "#c2bab0"].map(rgb), RLINE = rgb("#625b55");
  const col = new Uint32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, ei = e[i], b = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
    if (ei < 0) {
      const dd = -ei + b * 0.02;
      col[i] = dd < 0.011 ? (hsh(x, y, 3) < 0.5 ? FOAM : WC[0]) : dd < 0.035 ? WC[0] : dd < 0.075 ? WC[1] : dd < 0.13 ? WC[2] : dd < 0.2 ? WC[3] : dd < 0.28 ? WC[4] : WC[5];
    } else if (ei < LE + b * 0.006) {
      col[i] = ei < 0.009 + b * 0.004 ? SAND_W : hsh(x, y, 5) < 0.08 ? SAND_L : SAND;
    } else {
      const p = fb(LP, x / S, y / S), L = lv[i];
      const Lr = x + 1 < w ? lv[i + 1] : 0, Ld = y + 1 < h ? lv[i + w] : 0;
      const edge = (Lr > 1 && L > Lr) || (Ld > 1 && L > Ld);
      if (ei > eHi) col[i] = ei < eHi + 0.004 || edge ? RLINE : p + b * 0.15 > 0.55 ? RK[2] : p + b * 0.15 > 0.4 ? RK[1] : RK[0];
      else { const val = p + b * 0.12 + Math.min(L, 8) * 0.012, t = val < 0.38 ? 3 : val < 0.5 ? 2 : val < 0.62 ? 1 : 0; col[i] = edge ? (t >= 2 ? LINE_D : LINE_L) : G[t]; }
    }
  }
  // Bosques: bolitas verde oscuro en racimos. Lejos del centro de cada lugar, que ahí va su edificio.
  const T0 = rgb("#1e6a2d"), T1 = rgb("#124c21"), T2 = rgb("#34933c");
  const disc = (cx: number, cy: number, r: number, f: (dx: number, dy: number, k: number) => void) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 0.6) continue; const X = cx + dx, Y = cy + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) f(dx, dy, Y * w + X);
    }
  };
  const clear = structure.places.map((p) => ({ x: p.x / WP, y: p.y / WP, r: (p.kind === "islet" ? p.r * 0.55 : p.r * 0.32) / WP }));
  for (let gy = 0; gy < h; gy += 4) for (let gx = 0; gx < w; gx += 4) {
    const px = gx + ((hsh(gx, gy, 11) * 4) | 0), py = gy + ((hsh(gx, gy, 12) * 4) | 0);
    if (px >= w || py >= h) continue;
    const ei = e[py * w + px];
    if (ei < 0.03 || ei > eHi * 0.92 || clear.some((c) => Math.hypot(c.x - px, c.y - py) < c.r)) continue;
    const f = fb(LT, px / S, py / S);
    if (f < 0.47 || hsh(gx, gy, 13) > (f - 0.45) * 9) continue;
    const r = hsh(gx, gy, 14) < 0.35 ? 2 : 3;
    disc(px, py, r, (dx, dy, k) => { const q = dx + dy; col[k] = q > r ? T1 : q < -1 && ((dx + dy) & 1) === 0 ? T2 : q < -2 ? T2 : T0; });
  }
  // Rayitas blancas de ola.
  for (let y = 0; y < h - 2; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (e[i] < -0.03 && hsh(x, y, 31) < 0.0042) { const c = e[i] < -0.13 ? rgb("#7cc0f2") : rgb("#cfeaff"); col[i] = c; col[i + w] = c; if (hsh(x, y, 32) < 0.6) col[i + 2 * w] = c; }
  }
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d") as CanvasRenderingContext2D, id = g.createImageData(w, h);
  new Uint32Array(id.data.buffer).set(col); g.putImageData(id, 0, 0);
  const at = (x: number, y: number) => { const X = Math.floor(x / WP), Y = Math.floor(y / WP); return X < 0 || Y < 0 || X >= w || Y >= h ? -1 : e[Y * w + X]; };
  return { cv, w, h, land: (x, y) => at(x, y) > 0.03, deep: (x, y) => at(x, y) < -0.05 };
}
