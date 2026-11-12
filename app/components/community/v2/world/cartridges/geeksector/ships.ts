// GeekSector: naves y pilotos.
import type { Face } from "../../cartridge";
import { C, FONT, GHOSTY_SRC, TAU, colorOf, roundRect, type Ctx } from "./palette";

// ───────── Pilotos y naves ─────────
let ghostyImg: HTMLImageElement | null = null;
export function ghosty() {
  if (!ghostyImg) { ghostyImg = new Image(); ghostyImg.src = GHOSTY_SRC; }
  return ghostyImg;
}

/** El piloto siempre va derecho (cabeza arriba), aunque la nave gire. */
export function drawPilot(ctx: Ctx, pilot: string, x: number, y: number, r: number, face?: Face | null, ring?: string) {
  const g = ghosty();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C.bg; ctx.fill(); ctx.clip();
  if (pilot === "avatar" && face) {
    // La foto del miembro, recortada en círculo; mientras carga (o si falla), sus iniciales.
    const img = face.img;
    if (img && img.complete && img.naturalWidth) {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = face.bg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = face.fg; ctx.font = `700 ${Math.max(6, r * 0.82)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(face.initials, x, y + r * 0.06);
    }
  } else if (pilot === "ghosty" && g.complete && g.naturalWidth) {
    const h = r * 1.72, w = (h * g.naturalWidth) / g.naturalHeight;
    ctx.drawImage(g, x - w / 2, y - h / 2 + r * 0.1, w, h);
  } else if (pilot === "alien") {
    ctx.strokeStyle = C.green; ctx.lineWidth = r * 0.12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.5); ctx.lineTo(x - r * 0.5, y - r * 0.86);
    ctx.moveTo(x + r * 0.3, y - r * 0.5); ctx.lineTo(x + r * 0.5, y - r * 0.86); ctx.stroke();
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 0.66, r * 0.7, 0, 0, TAU); ctx.fill();
    // Ojos almendrados: la punta de afuera hacia arriba y la de adentro hacia la nariz ( \ / ).
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.ellipse(x - r * 0.27, y + r * 0.08, r * 0.19, r * 0.31, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.27, y + r * 0.08, r * 0.19, r * 0.31, 0.5, 0, TAU); ctx.fill();
  } else if (pilot === "robot") {
    // Robot de la casa: cabeza clara con visor menta, como el robot del sitio.
    ctx.strokeStyle = C.suitLine; ctx.lineWidth = r * 0.12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.5); ctx.lineTo(x, y - r * 0.82); ctx.stroke();
    ctx.fillStyle = C.suit; roundRect(ctx, x - r * 0.68, y - r * 0.5, r * 1.36, r * 1.16, r * 0.3); ctx.fill();
    ctx.fillStyle = C.mint; roundRect(ctx, x - r * 0.48, y - r * 0.26, r * 0.96, r * 0.58, r * 0.2); ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.arc(x - r * 0.2, y + r * 0.02, r * 0.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.02, r * 0.1, 0, TAU); ctx.fill();
  } else {
    // Astronauta: casco claro con visor oscuro.
    ctx.fillStyle = C.suit; ctx.beginPath(); ctx.arc(x, y + r * 0.06, r * 0.82, 0, TAU); ctx.fill();
    ctx.fillStyle = C.bg; roundRect(ctx, x - r * 0.56, y - r * 0.34, r * 1.12, r * 0.78, r * 0.34); ctx.fill();
    ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.1, r * 0.12, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = ring ?? C.suit; ctx.lineWidth = Math.max(1, r * 0.14); ctx.stroke();
}

function flame(ctx: Ctx, x: number, y: number, len: number, half: number, t: number) {
  const l = len * (0.82 + 0.18 * Math.sin(t * 22));
  ctx.fillStyle = C.mint; ctx.beginPath(); ctx.moveTo(x, y - half); ctx.quadraticCurveTo(x - l * 0.5, y - half * 0.5, x - l, y);
  ctx.quadraticCurveTo(x - l * 0.5, y + half * 0.5, x, y + half); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(x, y - half * 0.45); ctx.quadraticCurveTo(x - l * 0.3, y, x - l * 0.5, y);
  ctx.quadraticCurveTo(x - l * 0.3, y, x, y + half * 0.45); ctx.closePath(); ctx.fill();
}

export type Drawable = { model: string; color: string; pilot: string; ang: number; thrust: number; face?: Face | null };
/** Nave de ~56 unidades apuntando a +x. */
export function drawShip(ctx: Ctx, s: Drawable, x: number, y: number, size: number, t: number) {
  const col = colorOf(s.color);
  const k = size / 56, th = s.thrust || 0;
  let cockpitX = 0, cockpitR = 9;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.lineJoin = "round"; ctx.lineWidth = 1.4;
  if (s.model === "saucer") {
    cockpitR = 11;
    ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark; ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.dark; ctx.beginPath(); ctx.arc(0, 0, 16.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink;
    for (let i = 0; i < 6; i++) { const a = t * 0.9 + (i * TAU) / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * 20.8, Math.sin(a) * 20.8, 2, 0, TAU); ctx.fill(); }
  } else {
    ctx.rotate(s.ang);
    if (s.model === "rocket") {
      if (th > 0.06) flame(ctx, -24, 0, 22 * th, 5.5, t);
      ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-10, sg * 9); ctx.lineTo(-27, sg * 21); ctx.quadraticCurveTo(-25, sg * 12, -22, sg * 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = C.ink; ctx.strokeStyle = C.suitLine;
      ctx.beginPath(); ctx.moveTo(-22, -10.5); ctx.lineTo(8, -10.5); ctx.quadraticCurveTo(27, -9, 31, 0); ctx.quadraticCurveTo(27, 9, 8, 10.5);
      ctx.lineTo(-22, 10.5); ctx.quadraticCurveTo(-25, 0, -22, -10.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col.fill; ctx.beginPath(); ctx.moveTo(14, -9.6); ctx.quadraticCurveTo(27, -8, 30.3, 0); ctx.quadraticCurveTo(27, 8, 14, 9.6); ctx.closePath(); ctx.fill();
      ctx.fillRect(-19, -9.8, 4, 19.6);
      cockpitX = -1;
    } else if (s.model === "pod") {
      if (th > 0.06) { flame(ctx, -24, -14, 16 * th, 3.5, t); flame(ctx, -24, 14, 16 * th, 3.5, t + 1); }
      ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark;
      for (const sg of [-1, 1]) { roundRect(ctx, -25, sg * 14 - 5, 20, 10, 4); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = C.ink; ctx.strokeStyle = C.suitLine; roundRect(ctx, -18, -16, 40, 32, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col.fill; roundRect(ctx, 14, -9, 6, 18, 3); ctx.fill();
      cockpitX = -1; cockpitR = 10;
    } else {
      if (th > 0.06) flame(ctx, -13, 0, 22 * th, 5, t);
      ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark;
      ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(-23, -21); ctx.quadraticCurveTo(-14, -8, -13, 0); ctx.quadraticCurveTo(-14, 8, -23, 21); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(27, 0); ctx.lineTo(-11, -8.5); ctx.lineTo(-11, 8.5); ctx.closePath(); ctx.fill();
      cockpitX = -1; cockpitR = 8;
    }
  }
  ctx.restore();
  // La cabina se dibuja fuera de la rotación: el piloto nunca queda de cabeza.
  const a = s.model === "saucer" ? 0 : s.ang;
  const avatar = s.pilot === "avatar" && !!s.face;
  drawPilot(ctx, s.pilot, x + Math.cos(a) * cockpitX * k, y + Math.sin(a) * cockpitX * k, (avatar ? cockpitR + 1.5 : cockpitR) * k, s.face, avatar ? col.fill : undefined);
}

/**
 * Naves de los enemigos: siluetas en punta que ningún miembro puede elegir, en el rosa reservado para
 * ellos. `manta` (Alien): ala ancha en media luna con dos colmillos al frente. `lancer` (Astronauta):
 * casco largo y delgado con dos lanzas a los lados. El piloto va a la vista en la cabina, con aro rosa.
 * ~60 unidades apuntando a +x.
 */
export function drawEnemy(ctx: Ctx, e: { model: string; pilot: string; ang: number }, x: number, y: number, size: number) {
  const col = colorOf("pink"), k = size / 60;
  let cockpitX = 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(e.ang);
  ctx.lineJoin = "miter"; ctx.lineWidth = 1.6;
  if (e.model === "lancer") {
    // Dos lanzas oscuras a los lados, unidas al casco por un travesaño.
    ctx.fillStyle = col.dark;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(30, sg * 19); ctx.lineTo(-6, sg * 23); ctx.lineTo(-30, sg * 19); ctx.lineTo(-6, sg * 15); ctx.closePath(); ctx.fill(); }
    ctx.fillRect(-12, -17, 9, 34);
    // Casco: una aguja larga con la cola partida.
    ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark;
    ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(10, -9); ctx.lineTo(-24, -9); ctx.lineTo(-32, -15); ctx.lineTo(-27, 0); ctx.lineTo(-32, 15); ctx.lineTo(-24, 9); ctx.lineTo(10, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.dark; ctx.beginPath(); ctx.moveTo(33, 0); ctx.lineTo(20, -4.5); ctx.lineTo(20, 4.5); ctx.closePath(); ctx.fill();
    cockpitX = -4;
  } else {
    // Ala en media luna: puntas hacia adelante y la orilla de atrás en picos.
    ctx.fillStyle = col.fill; ctx.strokeStyle = col.dark;
    ctx.beginPath(); ctx.moveTo(22, -31); ctx.lineTo(6, -14); ctx.lineTo(16, 0); ctx.lineTo(6, 14); ctx.lineTo(22, 31);
    ctx.lineTo(-10, 26); ctx.lineTo(-18, 13); ctx.lineTo(-27, 9); ctx.lineTo(-19, 0); ctx.lineTo(-27, -9); ctx.lineTo(-18, -13); ctx.lineTo(-10, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Costillas oscuras sobre el ala y dos colmillos al frente.
    ctx.fillStyle = col.dark;
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(16, sg * 27); ctx.lineTo(-8, sg * 22); ctx.lineTo(-3, sg * 15); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(31, sg * 6); ctx.lineTo(13, sg * 3); ctx.lineTo(11, sg * 10); ctx.closePath(); ctx.fill();
    }
    cockpitX = -3;
  }
  ctx.restore();
  // El piloto va derecho, como en todas las naves.
  drawPilot(ctx, e.pilot, x + Math.cos(e.ang) * cockpitX * k, y + Math.sin(e.ang) * cockpitX * k, 9 * k, null, col.fill);
}
