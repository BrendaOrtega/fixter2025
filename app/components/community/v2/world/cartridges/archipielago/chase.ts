// Archipiélago: vista de persecución en modo 7, portada de «Ghosty sobre las islas» (`drawChase` y
// `renderGround`). La cámara va detrás y arriba de tu fantasma; el piso se muestrea renglón por
// renglón con tres niveles de mip y se pierde en una neblina por bandas; el cielo también va por
// bandas (sin degradado continuo, como el original). Todo en pixeles del arte (1 = `WP` unidades).
import { WATER, WP, type Terrain } from "./terrain";

const TAU = Math.PI * 2;
const angd = (a: number, b: number) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const SKY_T = [74, 156, 224], SKY_M = [146, 202, 243], HAZE = [208, 231, 245];
const lerpC = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const pack = (c: number[]) => (0xff000000 | ((c[2] | 0) << 16) | ((c[1] | 0) << 8) | (c[0] | 0)) >>> 0;
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
/** Altura de vuelo, altura y distancia de la cámara y lejanía máxima (pixeles del arte, como el juego). */
export const ALT = 30;
const CAM_UP = 46, FAR = 520;

function mip(src: Uint32Array, w: number, h: number) {
  const mw = w >> 1, mh = h >> 1, d = new Uint32Array(mw * mh);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < 4; k++) { const c = src[(y * 2 + (k >> 1)) * w + x * 2 + (k & 1)]; r += c & 255; g += (c >> 8) & 255; b += (c >> 16) & 255; }
    d[y * mw + x] = (0xff000000 | ((b >> 2) << 16) | ((g >> 2) << 8) | (r >> 2)) >>> 0;
  }
  return { d, w: mw, h: mh };
}

export function createChase(terrain: Terrain) {
  const m0 = { d: terrain.col, w: terrain.w, h: terrain.h }, m1 = mip(m0.d, m0.w, m0.h), m2 = mip(m1.d, m1.w, m1.h);
  // Fuera del mapa, el mismo mar que su orilla (así no se nota el borde del mundo).
  const DEEP = terrain.col[0] ?? rgb(WATER[5]);
  const cv = document.createElement("canvas"), g = cv.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
  let W = 190, H = 400, PS = 2, focal = 160, camBack = 54, img: ImageData | null = null, buf32: Uint32Array | null = null;
  // Estado de la cámara (en pixeles del arte).
  let hd = -Math.PI / 2, camX = 0, camY = 0, camH = ALT + CAM_UP, cfx = 0, cfy = -1, crx = 1, cry = 0, horizon = 130, fovK = 1;

  const sample = (m: { d: Uint32Array; w: number; h: number }, x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? DEEP : m.d[(y | 0) * m.w + (x | 0)]);

  return {
    canvas: cv,
    ctx: g,
    get W() { return W; }, get H() { return H; }, get PS() { return PS; }, get camBack() { return camBack; },
    resize(vw: number, vh: number) {
      // Mismo tamaño de pixel que el juego: unos 190 pixeles del arte en el lado corto.
      PS = Math.max(2, Math.round(Math.min(vw, vh) / 190));
      W = Math.ceil(vw / PS); H = Math.ceil(vh / PS); cv.width = W; cv.height = H;
      img = g.createImageData(W, H); buf32 = new Uint32Array(img.data.buffer);
      focal = Math.min(W * 0.85, H * 0.8);
      camBack = clamp((CAM_UP * focal) / (0.34 * H), 40, 130);
    },
    /** La cámara alcanza el rumbo de tu fantasma con suavidad. `snap`: sin transición (al cambiar de vista). */
    follow(x: number, y: number, ang: number, dt: number, boost: number, snap = false) {
      hd = snap ? ang : hd + angd(ang, hd) * Math.min(1, 4.5 * dt);
      fovK = 1 + 0.07 * boost;
      cfx = Math.cos(hd); cfy = Math.sin(hd); crx = -cfy; cry = cfx;
      camX = x / WP - cfx * camBack; camY = y / WP - cfy * camBack; camH = ALT + CAM_UP;
      horizon = Math.round(H * 0.33);
    },
    /** Pinta cielo y piso en el búfer. */
    ground() {
      if (!img || !buf32) return;
      const b = buf32, hazeP = pack(HAZE), f0 = focal * fovK;
      for (let y = 0; y <= horizon && y < H; y++) {
        const band = Math.min(11, Math.floor((y / Math.max(1, horizon)) * 12)) / 11;
        const c = band < 0.62 ? lerpC(SKY_T, SKY_M, band / 0.62) : lerpC(SKY_M, HAZE, (band - 0.62) / 0.38);
        b.fill(pack(c), y * W, y * W + W);
      }
      const [hr, hg, hb] = HAZE;
      for (let y = Math.max(0, horizon + 1); y < H; y++) {
        const dy = y - horizon, z = (camH * f0) / dy, row = y * W;
        const f = clamp((z - 80) / (FAR - 80), 0, 1), fi = Math.round(f * 8) * 32;
        if (fi >= 256) { b.fill(hazeP, row, row + W); continue; }
        const k = z / f0, lat0 = -(W >> 1) * k;
        let wx = camX + cfx * z + crx * lat0, wy = camY + cfy * z + cry * lat0;
        const dwx = crx * k, dwy = cry * k, lvl = z < 120 ? 0 : z < 260 ? 1 : 2;
        for (let x = 0; x < W; x++, wx += dwx, wy += dwy) {
          let c = lvl === 0 ? sample(m0, wx, wy) : lvl === 1 ? sample(m1, wx / 2, wy / 2) : sample(m2, wx / 4, wy / 4);
          if (fi) {
            const r = c & 255, gg = (c >> 8) & 255, bb = (c >> 16) & 255;
            c = (0xff000000 | ((bb + (((hb - bb) * fi) >> 8)) << 16) | ((gg + (((hg - gg) * fi) >> 8)) << 8) | (r + (((hr - r) * fi) >> 8))) >>> 0;
          }
          b[row + x] = c;
        }
      }
      g.putImageData(img, 0, 0);
    },
    /** Del mapa (unidades) y una altura (pixeles del arte) al búfer. `null` si queda detrás de la cámara. */
    project(x: number, y: number, alt: number) {
      const dx = x / WP - camX, dy = y / WP - camY, z = dx * cfx + dy * cfy;
      if (z < 6) return null;
      const lat = dx * crx + dy * cry, sk = (focal * fovK) / z;
      return { x: (W >> 1) + lat * sk, y: horizon + (camH - alt) * sk, z, sk };
    },
    /** Del búfer al piso del mapa (unidades). `null` si cae en el cielo. */
    unproject(sx: number, sy: number) {
      const dy = sy - horizon; if (dy <= 0.5) return null;
      const f0 = focal * fovK, z = (camH * f0) / dy, lat = ((sx - (W >> 1)) * z) / f0;
      if (z > FAR) return null;
      return { x: (camX + cfx * z + crx * lat) * WP, y: (camY + cfy * z + cry * lat) * WP };
    },
    get heading() { return hd; },
    get far() { return FAR; },
  };
}
export type Chase = ReturnType<typeof createChase>;
