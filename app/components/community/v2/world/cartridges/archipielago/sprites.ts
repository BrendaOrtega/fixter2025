// Archipiélago: paleta y sprites en pixel art. Cada sprite es una matriz de letras (una letra = un
// pixel); se pinta una vez en un canvas chico y se reutiliza. Rellenos sólidos, borde de un pixel en
// tono oscuro (nada de contorno grueso negro), sin gradientes ni brillos.

export const TAU = Math.PI * 2;
export const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
/** Unidades del mapa por pixel del arte: el tamaño del «pixel gordo». */
export const WP = 4;
export const GHOSTY_SRC = "/ghosty-oficial.png";

export const C = {
  sea: "#1D5A6B", seaDeep: "#174B5A", wave: "#3C8E9C", shallow: "#2C7F8C", foam: "#BFEDE3",
  sand: "#F2D59A", sandDark: "#D9B877", grass: "#8DCF6E", grassDark: "#6FB056", shadow: "#0F3F4C",
  ink: "#F2F5F4", text: "#D9E0DE", gray: "#7C8A8E", mint: "#85DDCB", pill: "rgba(14, 40, 48, .92)", line: "#2E6573",
  star: "#FFE27A", starDark: "#E0A93A",
};

export const FLY_COLORS = [
  { id: "mint", fill: "#85DDCB", dark: "#357265" },
  { id: "green", fill: "#8DCF6E", dark: "#4C7A39" },
  { id: "amber", fill: "#F2C98A", dark: "#8A6A34" },
  { id: "lilac", fill: "#BDB5F7", dark: "#5E57A0" },
  { id: "coral", fill: "#F4A39A", dark: "#9A5650" },
] as const;
export const colorOf = (id: string) => FLY_COLORS.find((c) => c.id === id) ?? FLY_COLORS[0];

// Colores fijos de los sprites. `a`/`d` son el color de quien vuela (relleno y su tono oscuro).
const FIXED: Record<string, string> = {
  k: "#1B3A40", w: "#F2F5F4", r: "#F08A7A", y: "#F2C98A", Y: "#FFE9A8", g: "#8DCF6E", G: "#4C7A39",
  b: "#8A5A3B", B: "#5E3B26", m: "#85DDCB", s: "#7C8A8E", n: "#1B2B33", o: "#F7B267",
};

export type Sprite = { rows: string[]; /** Dónde va la cara del piloto (pixel del sprite) y su radio en pixeles. */ seat?: { x: number; y: number; r: number } };

export const VEHICLES: Record<string, Sprite> = {
  plane: { seat: { x: 9.5, y: 3, r: 2.4 }, rows: [
    "......kk.........",
    ".....kaak........",
    "kk...kaak........",
    "kak.kkaakkkkkkk..",
    "kaakaaaaaaaaaaawk",
    "kkkkddddddddddkk.",
    "....kddak........",
    ".....kddk........",
    "......kk.........",
  ] },
  balloon: { seat: { x: 5.5, y: 13.5, r: 1.9 }, rows: [
    "...kkkkk...",
    ".kkaaaaakk.",
    "kaaawaaddak",
    "kaawaaadddk",
    "kaaaaaadddk",
    "kaaaaaadddk",
    ".kaaaaaddk.",
    ".kaaaaaddk.",
    "..kaaaadk..",
    "...kaadk...",
    "....k.k....",
    "....k.k....",
    "...kbbbk...",
    "...kbbbk...",
    "....kkk....",
  ] },
  kite: { seat: { x: 4.5, y: 14, r: 2.2 }, rows: [
    "....k....",
    "...kak...",
    "..kaaak..",
    ".kaawaak.",
    "kaaawaaak",
    ".kddwddk.",
    "..kdddk..",
    "...kdk...",
    "....k....",
    "....k....",
    "....k....",
  ] },
};

export const DECOR: Record<string, string[]> = {
  lighthouse: [
    "....kkk....",
    "...kLLLk...",
    "...kLLLk...",
    "..kkkkkkk..",
    "...kwwwk...",
    "...krrrk...",
    "...krrrk...",
    "..kwwwwwk..",
    "..kwwwwwk..",
    "..krrrrrk..",
    "..krrrrrk..",
    ".kwwwwwwwk.",
    ".kwwwwwwwk.",
    ".krrrrrrrk.",
    "kbbbbbbbbbk",
    "kkkkkkkkkkk",
  ],
  mural: [
    "kkkkkkkkkkkkkkkkkk",
    "kmmmmrrrryyyyggggk",
    "kmmmmrrrryyyyggggk",
    "kggyyyymmmmrrrrwwk",
    "kggyyyymmmmrrrrwwk",
    "kyyrrrrggggmmmmyyk",
    "kyyrrrrggggmmmmyyk",
    "kkkkkkkkkkkkkkkkkk",
    "..B............B..",
    "..B............B..",
    "..B............B..",
  ],
  cinema: [
    "kkkkkkkkkkkkkkkkkk",
    "knnnnnnnnnnnnnnnnk",
    "knnnnnnnwnnnnnnnnk",
    "knnnnnnnwwnnnnnnnk",
    "knnnnnnnwwwnnnnnnk",
    "knnnnnnnwwnnnnnnnk",
    "knnnnnnnwnnnnnnnnk",
    "knnnnnnnnnnnnnnnnk",
    "kkkkkkkkkkkkkkkkkk",
    "...B..........B...",
    "...B..........B...",
    "..................",
    "..rr.rr.rr.rr.rr..",
    "..................",
    "..rr.rr.rr.rr.rr..",
  ],
  school: [
    "......kkk......",
    ".....krrrk.....",
    "....krrrrrk....",
    "...krrrrrrrk...",
    "..krrrrrrrrrk..",
    ".krrrrrrrrrrrk.",
    "kkkkkkkkkkkkkkk",
    ".kyyyyyyyyyyyk.",
    ".kymmyyyyymmyk.",
    ".kymmyyyyymmyk.",
    ".kyyyyyByyyyyk.",
    ".kyyyyBByyyyyk.",
    ".kkkkkkkkkkkkk.",
  ],
  palm: [
    "gg...gg",
    ".gGgGg.",
    "gGgbgGg",
    "g..b..g",
    "...b...",
    "...b...",
    "...B...",
  ],
  stump: ["kbbk", "kBBk", ".kk."],
  fire: [
    "..o..",
    ".oYo.",
    "oYyYo",
    "bBbBb",
  ],
  fireOff: [
    ".....",
    ".....",
    ".s.s.",
    "bBbBb",
  ],
  star: [
    "..S..",
    ".SYS.",
    "SYYYS",
    ".SYS.",
    ".S.S.",
  ],
};

/** Pinta un sprite en un canvas propio (`colors` decide `a`, `d`, `L` y `S`). `flip` lo voltea. */
export function bake(rows: string[], colors: Record<string, string> = {}, flip = false): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const col = colors[ch] ?? FIXED[ch];
    if (!col || ch === ".") return;
    g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }));
  return cv;
}

/** Caché de sprites horneados por llave. */
export function spriteCache() {
  const map = new Map<string, HTMLCanvasElement>();
  return (key: string, make: () => HTMLCanvasElement) => { let c = map.get(key); if (!c) { c = make(); map.set(key, c); } return c; };
}

export function vehicle(cache: ReturnType<typeof spriteCache>, model: string, color: string, flip: boolean) {
  const sp = VEHICLES[model];
  if (!sp) return null;
  const col = colorOf(color);
  return cache(`v:${model}:${color}:${flip}`, () => bake(sp.rows, { a: col.fill, d: col.dark }, flip));
}

let ghostyImg: HTMLImageElement | null = null;
export function ghosty() {
  if (!ghostyImg && typeof Image !== "undefined") { ghostyImg = new Image(); ghostyImg.src = GHOSTY_SRC; }
  return ghostyImg;
}

export function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
