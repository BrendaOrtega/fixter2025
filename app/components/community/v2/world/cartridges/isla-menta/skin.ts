// Isla Menta: la skin (cómo se ve y suena). Sólo navegador; se carga con `import()` desde el
// manifiesto, así three.js no le pesa a los demás mundos ni al servidor.
import type { Face, SoundBank, WorldSkin } from "../../cartridge";
import { createRenderer } from "./renderer";
import { shapeFor, toneOf } from "./structure";

// Sonidos de caminata: pasitos, campanita al llegar, banquito al sentarse. Lo que no se usa aquí queda en silencio.
const sounds: SoundBank = {
  // Almohadazo: golpe sordo y un soplido de plumas.
  bonk: (k) => { k.tone({ type: "sine", from: 190, to: 70, dur: 0.16, gain: 0.8 }); k.whoosh(0.22, 0.25, 900, 300); },
  // La almohada sale volando.
  toss: (k) => k.whoosh(0.2, 0.3, 500, 1500),
  // Cosquillas: risita de tres notas que suben.
  nudge: (k) => {
    k.tone({ type: "sine", from: 620, to: 760, dur: 0.07, gain: 0.5 });
    k.tone({ type: "sine", from: 700, to: 860, at: 0.09, dur: 0.07, gain: 0.5 });
    k.tone({ type: "sine", from: 780, to: 980, at: 0.18, dur: 0.09, gain: 0.5 });
  },
  thrust: (k) => {
    k.tone({ type: "triangle", from: 210, to: 150, dur: 0.06, gain: 0.45 });
    k.tone({ type: "triangle", from: 250, to: 170, at: 0.13, dur: 0.06, gain: 0.4 });
  },
  arrive: (k) => {
    k.tone({ type: "sine", from: 784, dur: 0.1, gain: 0.5 });
    k.tone({ type: "sine", from: 1047, at: 0.09, dur: 0.16, gain: 0.5 });
  },
  sit: (k) => k.tone({ type: "sine", from: 330, to: 196, dur: 0.16, gain: 0.7 }),
  stand: (k) => k.tone({ type: "sine", from: 196, to: 349, dur: 0.14, gain: 0.6 }),
  waveOut: (k) => {
    k.tone({ type: "triangle", from: 587, dur: 0.09, gain: 0.55 });
    k.tone({ type: "triangle", from: 880, at: 0.08, dur: 0.13, gain: 0.55 });
  },
  waveIn: (k) => {
    k.tone({ type: "sine", from: 880, dur: 0.09, gain: 0.55 });
    k.tone({ type: "sine", from: 1175, at: 0.09, dur: 0.17, gain: 0.55 });
  },
  msg: (k) => k.tone({ type: "sine", from: 1047, to: 1319, dur: 0.12, gain: 0.45 }),
  pick: (k) => k.tone({ type: "triangle", from: 523, dur: 0.07, gain: 0.45 }),
  expand: (k) => k.tone({ type: "triangle", from: 294, to: 587, dur: 0.2, gain: 0.45 }),
  collapse: (k) => k.tone({ type: "triangle", from: 587, to: 294, dur: 0.2, gain: 0.45 }),
  // Acciones sobre las cosas de la isla. Sólo suenan si el motor le presta a la skin un `motor.sound(nombre)`.
  "act-sit": (k) => k.tone({ type: "sine", from: 330, to: 196, dur: 0.16, gain: 0.6 }),
  "act-lie": (k) => k.tone({ type: "sine", from: 294, to: 147, dur: 0.3, gain: 0.5 }),
  "act-warm": (k) => k.whoosh(0.3, 0.3, 300, 900),
  "act-look": (k) => k.tone({ type: "sine", from: 659, to: 880, dur: 0.14, gain: 0.4 }),
  "act-drink": (k) => { k.tone({ type: "sine", from: 520, to: 700, dur: 0.07, gain: 0.4 }); k.tone({ type: "sine", from: 600, to: 820, at: 0.1, dur: 0.07, gain: 0.4 }); },
  "act-cheer": (k) => { k.tone({ type: "triangle", from: 523, dur: 0.08, gain: 0.5 }); k.tone({ type: "triangle", from: 659, at: 0.08, dur: 0.08, gain: 0.5 }); k.tone({ type: "triangle", from: 784, at: 0.16, dur: 0.14, gain: 0.5 }); },
  "act-dance": (k) => { k.tone({ type: "triangle", from: 392, dur: 0.09, gain: 0.5 }); k.tone({ type: "triangle", from: 523, at: 0.12, dur: 0.09, gain: 0.5 }); k.tone({ type: "triangle", from: 392, at: 0.24, dur: 0.09, gain: 0.5 }); },
};

type Ctx = CanvasRenderingContext2D;
const INK = "#F2F5F4", NIGHT = "#0E1317";
const oval = (ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
function drawFaceDisc(ctx: Ctx, x: number, y: number, r: number, face: Face | null, ring: string) {
  oval(ctx, x, y, r + 1.5, r + 1.5, ring);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  if (face?.img && face.img.naturalWidth) ctx.drawImage(face.img, x - r, y - r, r * 2, r * 2);
  else {
    ctx.fillStyle = face?.bg ?? "#17302C"; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = face?.fg ?? "#85DDCB"; ctx.font = `700 ${Math.round(r * 0.95)}px Inter, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(face?.initials ?? "?", x, y + 0.5);
  }
  ctx.restore();
}
/** Muñequito de frente, en plano, para el selector de aspecto (56×40). */
function drawPuppet(ctx: Ctx, shape: string, colorId: string, pilot: string, face: Face | null) {
  const tone = toneOf(colorId), cx = 28, wide = shape === "sombrero" ? 1.12 : shape === "explorador" ? 0.92 : 1;
  oval(ctx, cx - 4, 36, 3, 2.2, tone.dark); oval(ctx, cx + 4, 36, 3, 2.2, tone.dark);
  if (shape === "explorador") { ctx.fillStyle = tone.dark; ctx.beginPath(); ctx.roundRect(cx - 9.5, 23, 19, 9, 3); ctx.fill(); }
  oval(ctx, cx, 28.5, 8 * wide, 7.5, tone.fill);
  oval(ctx, cx - 8.5 * wide, 28, 2.2, 3.6, tone.fill); oval(ctx, cx + 8.5 * wide, 28, 2.2, 3.6, tone.fill);
  if (shape === "orejas") { oval(ctx, cx - 6.5, 6.5, 3.4, 3.4, tone.fill); oval(ctx, cx + 6.5, 6.5, 3.4, 3.4, tone.fill); oval(ctx, cx - 6.5, 6.8, 1.8, 1.8, tone.dark); oval(ctx, cx + 6.5, 6.8, 1.8, 1.8, tone.dark); }
  oval(ctx, cx, 14.5, 9, 8.6, INK);
  if (pilot === "avatar") drawFaceDisc(ctx, cx, 15.5, 5.6, face, tone.dark);
  else { oval(ctx, cx - 3.2, 15, 1.2, 1.8, NIGHT); oval(ctx, cx + 3.2, 15, 1.2, 1.8, NIGHT); oval(ctx, cx - 5.8, 17.8, 1.6, 1, "#F4AFAF"); oval(ctx, cx + 5.8, 17.8, 1.6, 1, "#F4AFAF"); }
  // Accesorio
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 56, 10.5); ctx.clip();
  if (shape === "gorro" || shape === "explorador") oval(ctx, cx, 14.5, 9.4, 9, tone.dark);
  if (shape === "orejas") oval(ctx, cx, 14.5, 9.4, 9, tone.fill);
  ctx.restore();
  if (shape === "gorro") { ctx.fillStyle = tone.fill; ctx.beginPath(); ctx.roundRect(cx - 9.8, 8.6, 19.6, 3, 1.5); ctx.fill(); oval(ctx, cx, 4.6, 2.6, 2.6, tone.fill); }
  if (shape === "explorador") { ctx.fillStyle = tone.dark; ctx.beginPath(); ctx.roundRect(cx - 4, 9.2, 15, 2.6, 1.3); ctx.fill(); }
  if (shape === "sombrero") { oval(ctx, cx, 8.6, 14, 2.6, "#EBD9B0"); ctx.fillStyle = "#EBD9B0"; ctx.beginPath(); ctx.roundRect(cx - 6, 2.2, 12, 6.4, 2.5); ctx.fill(); ctx.fillStyle = tone.dark; ctx.fillRect(cx - 6, 6, 12, 2); }
}

const skin: WorldSkin = {
  createRenderer,
  sounds,
  drawOption(ctx, slot, id, look, face) {
    if (slot === "model") drawPuppet(ctx, shapeFor(id), look.color, look.pilot, face);
    else if (id === "avatar") drawFaceDisc(ctx, 28, 20, 14, face, toneOf(look.color).dark);
    else { oval(ctx, 28, 20, 15, 14.4, INK); oval(ctx, 22.6, 19.5, 2, 3, NIGHT); oval(ctx, 33.4, 19.5, 2, 3, NIGHT); oval(ctx, 18.4, 24.4, 2.6, 1.6, "#F4AFAF"); oval(ctx, 37.6, 24.4, 2.6, 1.6, "#F4AFAF"); }
  },
  swatch: (colorId) => toneOf(colorId).fill,
};
export default skin;
