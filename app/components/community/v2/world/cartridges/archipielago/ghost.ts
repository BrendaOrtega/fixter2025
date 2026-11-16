// Archipiélago: sprites en pixel art, portados de «Ghosty sobre las islas».
// - Ghosty: el SVG se rasteriza a 4×, se reduce por votación a una paleta de 4 tintas, lleva contorno,
//   luz arriba-izquierda y sombra abajo-derecha, y 4 cuadros con la falda ondeando.
// - Ghostyllo: la misma silueta sin lentes, en el color de quien vuela. Ghosty nunca cambia de color.
// - Estrella de 14 px y nubes de bolitas con su sombra.
import { GHOST_SVG } from "./ghost-svg";

export const TAU = Math.PI * 2;
const mkc = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

/** Tintas de un fantasma: cuerpo, luz, sombra y contorno. */
export type GhostInk = { body: string; hi: string; sh: string; ol: string };
export const GHOSTY_INK: GhostInk = { body: "#9a99ea", hi: "#b9b8f8", sh: "#7d7bd2", ol: "#33317a" };
/** Ghostyllos: un color por miembro (Ghosty conserva el suyo). */
export const GHOSTLING_INK: Record<string, GhostInk & { name: string }> = {
  sky: { name: "Cielo", body: "#8ec9f5", hi: "#bfe3fb", sh: "#5fa6e0", ol: "#1b4c80" },
  mint: { name: "Menta", body: "#85ddcb", hi: "#b5f0e4", sh: "#5fbfab", ol: "#1f5a4f" },
  amber: { name: "Ámbar", body: "#f7c873", hi: "#ffe2a6", sh: "#d9a54a", ol: "#7a4e10" },
  coral: { name: "Coral", body: "#f4a39a", hi: "#fbc9c2", sh: "#d97c72", ol: "#7a2e27" },
  green: { name: "Verde", body: "#9bd86e", hi: "#c4eea3", sh: "#74b84a", ol: "#2f5e18" },
};
export const inkOf = (model: string, color: string) => (model === "ghosty" ? GHOSTY_INK : GHOSTLING_INK[color] ?? GHOSTLING_INK.sky);

export type GhostSprite = { frames: HTMLCanvasElement[]; w: number; h: number };

// Índices de la rasterización: 0 vacío, 1 cuerpo, 2 lentes, 3 ojos, 4 chapitas.
type Raster = { idx: Uint8Array; w: number; h: number };
let rasters: { front: Raster; back: Raster } | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function loadImg(svg: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
}
function rasterize(img: HTMLImageElement, h: number, back: boolean): Raster {
  const w = Math.round((h * 160) / 190), ss = 4, bw = w * ss, bh = h * ss;
  const big = mkc(bw, bh), bx = big.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  bx.drawImage(img, 0, 0, bw, bh);
  const d = bx.getImageData(0, 0, bw, bh).data;
  const PAL = [hex("#9a99ea"), hex("#d4d4d7"), hex("#11151a"), hex("#8886d9")];
  const idx = new Uint8Array(w * h);
  for (let oy = 0; oy < h; oy++) for (let ox = 0; ox < w; ox++) {
    const cnt = [0, 0, 0, 0]; let t = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const i = ((oy * ss + sy) * bw + ox * ss + sx) * 4; if (d[i + 3] < 110) continue; t++;
      let best = 0, bd = 1e9;
      for (let k = 0; k < 4; k++) { const dr = d[i] - PAL[k][0], dg = d[i + 1] - PAL[k][1], db = d[i + 2] - PAL[k][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; best = k; } }
      cnt[best]++;
    }
    const n = ss * ss; let v = 0;
    if (cnt[2] >= n * 0.4) v = 3; else if (cnt[1] >= n * 0.2) v = 2; else if (cnt[3] >= n * 0.5) v = 4; else if (t >= n * 0.5) v = 1;
    idx[oy * w + ox] = v;
  }
  // De espaldas asoman las patitas de los lentes.
  if (back) { const ty = Math.round(h * 0.27); for (const [x, y] of [[0, ty], [1, ty], [0, ty + 1], [w - 1, ty], [w - 2, ty], [w - 1, ty + 1]]) idx[y * w + x] = 2; }
  return { idx, w, h };
}

/** Carga y rasteriza el SVG una vez; `onReady` avisa cuando ya hay sprites. */
export function loadGhosts(onReady?: () => void) {
  if (rasters) { onReady?.(); return; }
  if (onReady) listeners.add(onReady);
  if (loading || typeof Image === "undefined") return;
  const paths = GHOST_SVG.match(/<path[^>]*\/>/g) ?? [];
  const backSvg = GHOST_SVG.replace(/<path[^>]*\/>/g, "").replace("</svg>", () => paths[0] + "</svg>");
  loading = Promise.all([loadImg(GHOST_SVG), loadImg(backSvg)]).then(([f, b]) => {
    // Un poco más chicos que en el juego (30 y 38 px): aquí vuelan varias personas a la vez.
    rasters = { front: rasterize(f, 24, false), back: rasterize(b, 30, true) };
    for (const fn of listeners) fn(); listeners.clear();
  }).catch((err) => console.error("[archipiélago] no cargó el sprite", err));
}

const cache = new Map<string, GhostSprite>();
/** Sprite de un fantasma (`back`: de espaldas, para el giro). `null` mientras carga. */
export function ghostSprite(model: string, color: string, back = false): GhostSprite | null {
  if (!rasters) return null;
  const glasses = model === "ghosty", ink = inkOf(model, color), key = `${model}:${glasses ? "" : color}:${back}`;
  let s = cache.get(key);
  if (s) return s;
  const { idx: src, w, h } = back ? rasters.back : rasters.front;
  // El ghostyllo no lleva lentes: esos pixeles pasan a ser cuerpo.
  const idx = glasses ? src : src.map((v) => (v === 2 ? 1 : v));
  const MX = 3, MY = 1, W2 = w + MX * 2, H2 = h + MY * 2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : idx[y * w + x]);
  const C: Record<number, string> = { 1: ink.body, 2: "#e6e6ea", 3: "#12151b", 4: "#ec93c6" };
  const base = mkc(W2, H2), bc = base.getContext("2d") as CanvasRenderingContext2D;
  const put = (x: number, y: number, c: string) => { bc.fillStyle = c; bc.fillRect(x + MX, y + MY, 1, 1); };
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const v = at(x, y);
    if (v === 0) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) put(x, y, ink.ol); continue; }
    if (v === 1) put(x, y, !at(x, y - 1) || !at(x - 1, y) ? ink.hi : !at(x + 1, y) || !at(x, y + 1) ? ink.sh : ink.body);
    else put(x, y, C[v]);
  }
  // Cuatro cuadros: la falda ondea renglón por renglón.
  const frames: HTMLCanvasElement[] = [], skirt = Math.floor(H2 * 0.7);
  for (let f = 0; f < 4; f++) {
    const fc = mkc(W2, H2), fx = fc.getContext("2d") as CanvasRenderingContext2D;
    for (let r = 0; r < H2; r++) {
      const sh = r >= skirt ? Math.round(Math.sin((f * TAU) / 4 + r * 0.9) * 1.5 * (r - skirt + 1) / (H2 - skirt)) : 0;
      fx.drawImage(base, 0, r, W2, 1, sh, r, W2, 1);
    }
    frames.push(fc);
  }
  s = { frames, w: W2, h: H2 };
  cache.set(key, s);
  return s;
}

export function buildStar() {
  const c = mkc(14, 14), x = c.getContext("2d") as CanvasRenderingContext2D, cx = 7, cy = 7.4, PI = Math.PI;
  const pts: number[][] = [];
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.9 : 6.4, a = -PI / 2 + (k * PI) / 5; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const inside = (px: number, py: number) => { let o = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) o = !o; } return o; };
  const ins = (X: number, Y: number) => X >= 0 && Y >= 0 && X < 14 && Y < 14 && inside(X + 0.5, Y + 0.5);
  for (let Y = 0; Y < 14; Y++) for (let X = 0; X < 14; X++) {
    if (!ins(X, Y)) continue;
    const edge = !ins(X - 1, Y) || !ins(X + 1, Y) || !ins(X, Y - 1) || !ins(X, Y + 1);
    x.fillStyle = edge ? "#b3600f" : X + Y < 13 && (!ins(X - 1, Y - 1) || !ins(X - 2, Y)) ? "#fff6b0" : X + Y > 16 ? "#ffae1f" : "#ffd93d";
    x.fillRect(X, Y, 1, 1);
  }
  return c;
}

const CL = ["#aac2df", "#cddcef", "#e8f1fa", "#ffffff"];
function discF(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy + 0.25)); c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
export type Cloud = { c: HTMLCanvasElement; s: HTMLCanvasElement; w: number; h: number };
export function makeCloud(rng: () => number, n: number, rb: number, pal = CL): Cloud {
  const w = Math.ceil(n * rb * 1.45 + rb * 2.2) + 6, h = Math.ceil(rb * 3.1) + 6;
  const cc = mkc(w, h), c = cc.getContext("2d") as CanvasRenderingContext2D, sc = mkc(w, h), s = sc.getContext("2d") as CanvasRenderingContext2D;
  const puffs: { x: number; y: number; r: number }[] = [];
  let px = rb + 3; const py = h - rb - 5;
  for (let i = 0; i < n; i++) { const r = Math.round(rb * (0.72 + rng() * 0.55)); puffs.push({ x: Math.round(px), y: Math.round(py - (i % 2 ? rng() * rb * 0.7 : 0)), r }); px += r * 1.1; }
  puffs.sort((a, b) => b.y - a.y);
  s.fillStyle = "#0a2d6a";
  for (const p of puffs) { discF(s, p.x, p.y, p.r); for (let k = 0; k < 4; k++) { c.fillStyle = pal[k]; discF(c, p.x, p.y - Math.round(k * 1.8), Math.max(2, p.r - Math.round(k * 1.4))); } }
  return { c: cc, s: sc, w, h };
}
