// GeekSector: los lugares (estación, planeta, satélite, base y mesas). Se dibujan centrados en el origen.
import { C, TAU, roundRect, type Ctx } from "./palette";
import { seatPos } from "./structure";

function solarPanel(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = C.mintDeep; ctx.strokeStyle = C.mintMid; ctx.lineWidth = 1.4;
  roundRect(ctx, x, y, w, h, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { ctx.moveTo(x + (w * i) / 4, y); ctx.lineTo(x + (w * i) / 4, y + h); }
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}
export function drawStation(ctx: Ctx, open: boolean, t: number) {
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-84, 0); ctx.lineTo(84, 0); ctx.stroke();
  solarPanel(ctx, -132, -17, 50, 34); solarPanel(ctx, 82, -17, 50, 34);
  if (open) {
    // Señal: tres arcos finos que salen de la antena.
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const f = (t * 0.45 + i / 3) % 1;
      ctx.globalAlpha = (1 - f) * 0.8; ctx.strokeStyle = C.mint; ctx.beginPath(); ctx.arc(0, -66, 10 + f * 30, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.rotate(t * 0.07);
  ctx.strokeStyle = C.rock; ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); ctx.stroke(); }
  ctx.strokeStyle = C.rock; ctx.lineWidth = 19; ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.stroke();
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 67.5, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 48.5, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    // Ventanas: apagadas, o en menta cuando la sala está abierta.
    const a = (i * TAU) / 12;
    ctx.save(); ctx.translate(Math.cos(a) * 58, Math.sin(a) * 58); ctx.rotate(a);
    ctx.fillStyle = open ? C.mint : C.rockDark; roundRect(ctx, -4, -5.5, 8, 11, 3); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = open ? C.mint : C.suit; ctx.strokeStyle = open ? C.mintDeep : C.suitLine; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.bg; roundRect(ctx, -12, -8, 16, 16, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -1.5); ctx.lineTo(13, -6.5); ctx.lineTo(13, 6.5); ctx.lineTo(6, 1.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -67); ctx.lineTo(0, -80); ctx.stroke();
  ctx.fillStyle = open ? C.mint : C.gray; ctx.beginPath(); ctx.arc(0, -82, 4, 0, TAU); ctx.fill();
}
export function drawPlanet(ctx: Ctx) {
  const R = 76, tilt = -0.32;
  ctx.save(); ctx.rotate(tilt); ctx.strokeStyle = C.suit; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 122, 30, 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
  ctx.fillStyle = C.mintMid; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
  ctx.fillStyle = C.mint; ctx.beginPath(); ctx.ellipse(-8, -44, 92, 15, -0.12, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, 40, 80, 9, -0.12, 0, TAU); ctx.fill();
  ctx.fillStyle = "#4E9486";
  for (const [cx, cy, cr] of [[-34, 2, 13], [30, -8, 8], [8, 14, 5], [-12, 58, 9], [48, 22, 6]]) { ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = C.mintDeep; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.save(); ctx.rotate(tilt); ctx.strokeStyle = C.suit; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 122, 30, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = C.suitLine; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 125, 33, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
}
export function drawSatellite(ctx: Ctx, t: number) {
  ctx.rotate(-0.28 + Math.sin(t * 0.5) * 0.05);
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke();
  solarPanel(ctx, -92, -18, 52, 36); solarPanel(ctx, 40, -18, 52, 36);
  ctx.strokeStyle = C.suitLine; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -38); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.strokeStyle = C.suitLine; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -50, 15, 0.12 * Math.PI, 0.88 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.suit; roundRect(ctx, -30, -23, 60, 46, 11); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = C.mint; ctx.beginPath(); ctx.moveTo(-4.5, -7); ctx.lineTo(8, 0); ctx.lineTo(-4.5, 7); ctx.closePath(); ctx.fill();
}
export function drawBase(ctx: Ctx) {
  ctx.fillStyle = C.rock; ctx.strokeStyle = C.rockLine; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-96, 14); ctx.quadraticCurveTo(-100, -8, -70, -10); ctx.lineTo(70, -10); ctx.quadraticCurveTo(102, -6, 96, 18);
  ctx.quadraticCurveTo(84, 50, 34, 54); ctx.quadraticCurveTo(-2, 66, -40, 52); ctx.quadraticCurveTo(-88, 46, -96, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.rockDark;
  for (const [cx, cy, rx, ry] of [[-56, 18, 14, 7], [44, 28, 18, 8], [-8, 40, 9, 4], [74, 6, 7, 3]]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.mint; ctx.strokeStyle = C.mintDeep; ctx.beginPath(); ctx.arc(-6, -10, 44, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.mintMid; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-6, -10, 30, Math.PI, TAU); ctx.moveTo(-6, -54); ctx.lineTo(-6, -10); ctx.stroke();
  ctx.fillStyle = C.bg; roundRect(ctx, -17, -32, 22, 22, 6); ctx.fill();
  ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -25); ctx.lineTo(-6, -15); ctx.moveTo(-6, -25); ctx.quadraticCurveTo(-10, -28, -13, -26);
  ctx.lineTo(-13, -16); ctx.quadraticCurveTo(-10, -18, -6, -15); ctx.quadraticCurveTo(-2, -18, 1, -16); ctx.lineTo(1, -26); ctx.quadraticCurveTo(-2, -28, -6, -25); ctx.stroke();
  ctx.fillStyle = C.suit; ctx.strokeStyle = C.suitLine; ctx.lineWidth = 1.4; roundRect(ctx, 52, -44, 16, 34, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.bg; roundRect(ctx, 56, -38, 8, 7, 2); ctx.fill();
  ctx.strokeStyle = C.suitLine; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, -44); ctx.lineTo(60, -70); ctx.stroke();
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(61, -70); ctx.lineTo(80, -64); ctx.lineTo(61, -58); ctx.closePath(); ctx.fill();
}
export function drawTable(ctx: Ctx, occupied: boolean, simple: boolean) {
  ctx.fillStyle = C.soft; ctx.strokeStyle = occupied ? C.mint : C.rockLine; ctx.lineWidth = occupied ? 2 : 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.mint; ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("</>", 0, 1);
  if (simple) return;
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]);
  for (let k = 0; k < 4; k++) { const s = seatPos({ x: 0, y: 0 }, k); ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
}
