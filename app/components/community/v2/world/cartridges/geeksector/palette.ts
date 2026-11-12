// GeekSector: paleta y utilerías de dibujo (canvas 2D).
// Estilo de la casa: ilustración plana, rellenos sólidos, borde fino. Sin gradientes ni brillos.

export const SHIP_COLORS = [
  { id: "mint", fill: "#85DDCB", dark: "#357265" },
  { id: "green", fill: "#8DCF6E", dark: "#4C7A39" },
  { id: "amber", fill: "#F2C98A", dark: "#8A6A34" },
  { id: "lilac", fill: "#BDB5F7", dark: "#5E57A0" },
  { id: "blue", fill: "#9CC8F2", dark: "#4A719A" },
  { id: "pink", fill: "#F4AFAF", dark: "#9A5656" },
] as const;

export const C = {
  bg: "#0E1317", panel: "#141B20", line: "#232D33", soft: "#1C252B", mint: "#85DDCB", green: "#8DCF6E",
  ink: "#F2F5F4", text: "#D9E0DE", gray: "#7C8A8E", mintDeep: "#357265", mintMid: "#65B0A1", suit: "#D1DEDB", suitLine: "#9AA9A6",
  rock: "#3A474E", rockDark: "#2B363C", rockLine: "#4B5A62",
};
export const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';
export const TAU = Math.PI * 2;
export const SHOT_COLORS: Record<string, string> = { seeker: "#BDB5F7", bounce: "#9CC8F2", bomb: "#F2C98A" };
/** Asset oficial de Ghosty (public/ghosty-oficial.png): nunca se repinta, sólo se escala. */
export const GHOSTY_SRC = "/ghosty-oficial.png";

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const colorOf = (id: string) => SHIP_COLORS.find((c) => c.id === id) ?? SHIP_COLORS[0];
export function seeded(seed: number) {
  // mulberry32: el cielo se dibuja igual en cada carga
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Ctx = CanvasRenderingContext2D;
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
}
