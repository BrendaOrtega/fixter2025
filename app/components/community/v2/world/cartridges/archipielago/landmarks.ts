// Archipiélago: el edificio de cada isla en pixel art, con la paleta del juego (contorno azul marino
// de un pixel, rellenos sólidos). Cada matriz de letras se hornea una vez en un canvas chico.
const FIXED: Record<string, string> = {
  k: "#0b2f66", w: "#f2f6fb", r: "#e8564a", y: "#ffd93d", Y: "#fff6b0", g: "#8bd84b", G: "#277728",
  b: "#9a6a3a", B: "#5e3b26", m: "#7fd0f5", s: "#8f877f", n: "#17304f", o: "#ff9b2e", p: "#ec93c6",
};
export const DECOR: Record<string, string[]> = {
  lighthouse: [
    "....kkk....", "...kLLLk...", "...kLLLk...", "..kkkkkkk..", "...kwwwk...", "...krrrk...", "...krrrk...",
    "..kwwwwwk..", "..kwwwwwk..", "..krrrrrk..", "..krrrrrk..", ".kwwwwwwwk.", ".kwwwwwwwk.", ".krrrrrrrk.",
    "kbbbbbbbbbk", "kkkkkkkkkkk",
  ],
  mural: [
    "kkkkkkkkkkkkkkkkkk", "kmmmmrrrryyyyggggk", "kmmmmrrrryyyyggggk", "kggyyyymmmmrrrrppk", "kggyyyymmmmrrrrppk",
    "kyyrrrrggggmmmmyyk", "kyyrrrrggggmmmmyyk", "kkkkkkkkkkkkkkkkkk", "..B............B..", "..B............B..", "..B............B..",
  ],
  cinema: [
    "kkkkkkkkkkkkkkkkkk", "knnnnnnnnnnnnnnnnk", "knnnnnnnwnnnnnnnnk", "knnnnnnnwwnnnnnnnk", "knnnnnnnwwwnnnnnnk",
    "knnnnnnnwwnnnnnnnk", "knnnnnnnwnnnnnnnnk", "knnnnnnnnnnnnnnnnk", "kkkkkkkkkkkkkkkkkk", "...B..........B...",
    "...B..........B...", "..................", "..rr.rr.rr.rr.rr..", "..................", "..rr.rr.rr.rr.rr..",
  ],
  school: [
    "......kkk......", ".....krrrk.....", "....krrrrrk....", "...krrrrrrrk...", "..krrrrrrrrrk..", ".krrrrrrrrrrrk.",
    "kkkkkkkkkkkkkkk", ".kyyyyyyyyyyyk.", ".kymmyyyyymmyk.", ".kymmyyyyymmyk.", ".kyyyyyByyyyyk.", ".kyyyyBByyyyyk.", ".kkkkkkkkkkkkk.",
  ],
  stump: ["kbbk", "kBBk", ".kk."],
  fire: ["..o..", ".oYo.", "oYyYo", "bBbBb"],
  fireOff: [".....", ".....", ".s.s.", "bBbBb"],
};
/** Hornea una matriz (`colors` decide letras propias, p. ej. la luz `L` del faro). */
export function bake(rows: string[], colors: Record<string, string> = {}): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = colors[ch] ?? FIXED[ch]; if (c && ch !== ".") { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }));
  return cv;
}
