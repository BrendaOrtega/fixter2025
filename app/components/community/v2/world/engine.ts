// Motor del «Mundo» del club: un canvas 2D con las naves, los lugares y la cámara. Sólo corre en
// el navegador (se crea dentro de un `useEffect`); React pone encima los controles y las tarjetas.
// Portado del mockup aprobado: docs/club-rediseno/mockup-micromundo.html.
//
// Estilo de la casa: ilustración plana, rellenos sólidos, borde fino. Sin gradientes ni brillos.

export const WORLD_W = 1600;
export const WORLD_H = 1000;

export const SHIP_COLORS = [
  { id: "mint", name: "Menta", fill: "#85DDCB", dark: "#357265" },
  { id: "green", name: "Verde", fill: "#8DCF6E", dark: "#4C7A39" },
  { id: "amber", name: "Ámbar", fill: "#F2C98A", dark: "#8A6A34" },
  { id: "lilac", name: "Lila", fill: "#BDB5F7", dark: "#5E57A0" },
  { id: "blue", name: "Azul", fill: "#9CC8F2", dark: "#4A719A" },
  { id: "pink", name: "Rosa", fill: "#F4AFAF", dark: "#9A5656" },
] as const;
export const SHIP_MODELS = [
  { id: "rocket", name: "Cohete" },
  { id: "saucer", name: "Platillo" },
  { id: "pod", name: "Cápsula" },
  { id: "dart", name: "Flecha" },
] as const;
export const SHIP_PILOTS = [
  { id: "avatar", name: "Mi avatar" },
  { id: "ghosty", name: "Ghosty" },
  { id: "astro", name: "Astronauta" },
  { id: "alien", name: "Alien" },
] as const;

export type ShipModel = (typeof SHIP_MODELS)[number]["id"];
export type ShipColor = (typeof SHIP_COLORS)[number]["id"];
export type ShipPilot = (typeof SHIP_PILOTS)[number]["id"] | "robot";
export type Look = { model: ShipModel; color: ShipColor; pilot: ShipPilot };

/** Cara de un miembro para el piloto «avatar»: su foto, o sus iniciales sobre su tono si no carga. */
export type Face = { img: HTMLImageElement | null; initials: string; bg: string; fg: string };
// Mismos seis tonos y mismo reparto que `Avatar` (v2/ui.tsx).
const FACE_TONES = [["#17302C", "#85DDCB"], ["#33291A", "#F2C98A"], ["#26233F", "#BDB5F7"], ["#3A2020", "#F4AFAF"], ["#1A2B3D", "#9CC8F2"], ["#22331A", "#8DCF6E"]];
export function faceFor(id: string, name: string, photoURL: string | null): Face {
  const [bg, fg] = FACE_TONES[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % FACE_TONES.length];
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
  let img: HTMLImageElement | null = null;
  if (photoURL) {
    // Si la foto falla (miembro sin foto → 404), `naturalWidth` queda en 0 y se pintan las iniciales.
    img = new Image(); img.referrerPolicy = "no-referrer"; img.onerror = () => { face.img = null; }; img.src = photoURL;
  }
  const face: Face = { img, initials, bg, fg };
  return face;
}

/** Las mesas del hackatón: a qué se sienta uno ahí. Sentarse es estado compartido, sin audio. */
export const TABLES = [
  { x: 200, y: 810, topic: "Busco equipo" },
  { x: 400, y: 690, topic: "Estoy atorado" },
  { x: 600, y: 810, topic: "Muestra y cuenta" },
] as const;
const ZONE = { x: 86, y: 578, w: 628, h: 372 };

export type PlaceKind = "station" | "planet" | "satellite" | "base" | "table";
type Place = { id: string; kind: PlaceKind; x: number; y: number; r: number; name: string; short: string; labelDy: number; table: number | null };
export const PLACES: Place[] = [
  { id: "live", kind: "station", x: 800, y: 390, r: 205, name: "Sala en vivo", short: "Sala en vivo", labelDy: 104, table: null },
  { id: "wall", kind: "planet", x: 290, y: 250, r: 165, name: "Planeta Muro", short: "Muro", labelDy: 104, table: null },
  { id: "recs", kind: "satellite", x: 1310, y: 230, r: 150, name: "Satélite Grabaciones", short: "Grabaciones", labelDy: 78, table: null },
  { id: "courses", kind: "base", x: 1290, y: 760, r: 165, name: "Base Cursos", short: "Cursos", labelDy: 84, table: null },
  ...TABLES.map((t, i) => ({ id: `t${i}`, kind: "table" as const, x: t.x, y: t.y, r: 122, name: `Mesa «${t.topic}»`, short: t.topic, labelDy: 100, table: i })),
];

/** Nave de otra persona, tal como la entrega el servidor. */
export type RemoteShip = {
  id: string; name: string; photoURL: string; x: number; y: number; tx: number; ty: number;
  ship: string; color: string; pilot: string; table: number | null; seat: number | null;
};
export type PlaceInfo = { id: string; kind: PlaceKind; name: string; table: number | null };
export type ShipInfo = { id: string; name: string; photoURL: string | null; isBot: boolean; where: string; note: string | null };
export type Counts = { humans: number; live: number; wall: number; recs: number; courses: number; tables: number; flying: number; perTable: number[] };
export type MyState = { x: number; y: number; tx: number; ty: number; table: number | null; flying: boolean };

type Callbacks = {
  onPlace: (place: PlaceInfo | null) => void;
  onShip: (ship: ShipInfo | null) => void;
  onCounts: (counts: Counts) => void;
  /** Cambió algo que los demás deben saber pronto (destino, mesa). */
  onIntent: () => void;
  onFirstMove: () => void;
  /** Algo que merece sonido: arrancar, llegar a un lugar, sentarse, levantarse. */
  onSound: (name: "thrust" | "arrive" | "sit" | "stand" | "waveIn" | "shoot" | "catch" | "nudge") => void;
  /** Tu disparo tocó la nave de un miembro: hay que avisarle para que también la vea temblar. */
  onNudge: (shipId: string) => void;
  /** Cristales juntados en esta visita (el juego es local: no viaja al servidor). */
  onScore: (crystals: number) => void;
  /** Enter con un lugar cerca. */
  onEnter: () => void;
  /** Escape. */
  onEscape: () => void;
  /** Toque en el mapa; si regresa `true`, el motor no mueve la nave (había un panel abierto). */
  onStageTap: () => boolean;
};

export type WorldApi = {
  resize: (mini: boolean) => void;
  setQuiet: (quiet: boolean) => void;
  setLook: (look: Look) => void;
  setStation: (station: { open: boolean; sub: string }) => void;
  /** Lugares que hoy no llevan a nada (p. ej. `recs` sin grabaciones): no se dibujan. */
  setHidden: (placeIds: string[]) => void;
  setRemote: (ships: RemoteShip[], meId: string) => void;
  /** Saludo entre dos naves (llegó del servidor o lo acabas de mandar). */
  showWave: (fromId: string, toId: string) => void;
  /** Cosquilla que llegó del servidor: esa nave (quizá la tuya) tiembla un instante. Regresa si era para ti. */
  showNudge: (toId: string) => boolean;
  /** Mensaje del chat: burbuja sobre la nave de quien habló (si sigue presente). */
  showSay: (fromId: string, text: string) => void;
  /** Saludo a un robot de la casa: contesta solo. */
  waveBot: (botId: string) => void;
  flyToPlace: (placeId: string) => void;
  /** Dispara un destello hacia donde apunta la nave; sólo atrapa cristales, nunca a otra nave. */
  shoot: () => void;
  /** El cristal más cercano a tu nave (para pruebas y para pistas en pantalla). */
  nearestCrystal: () => { x: number; y: number } | null;
  setJoy: (x: number, y: number) => void;
  sit: (table: number) => void;
  stand: () => void;
  /** El servidor confirmó (o negó) el asiento. */
  confirmSeat: (table: number | null, seat: number | null) => void;
  myTable: () => number | null;
  myState: () => MyState;
  /** Punto del mundo en pixeles del mapa (para pruebas y para anclar cosas encima). */
  screenOf: (x: number, y: number) => { x: number; y: number };
  destroy: () => void;
};

type Entity = {
  id: string; kind: "me" | "human" | "bot"; name: string; first: string; photoURL: string | null; note: string | null;
  x: number; y: number; vx: number; vy: number; ang: number; thrust: number;
  model: ShipModel; color: ShipColor; pilot: ShipPilot;
  tx: number | null; ty: number | null; table: number | null; seat: number | null;
  bob: number; waveT: number; face: Face | null;
  /** Segundos de temblor que le quedan (cosquilla de un disparo). */
  shakeT: number;
};
type Fx =
  | { kind: "bubble"; ship: Entity; text: string; t: number; dur: number; say?: boolean }
  | { kind: "flash"; x: number; y: number; t: number; dur: number }
  | { kind: "spark"; x: number; y: number; vx: number; vy: number; t: number; dur: number; color: string };

const C = {
  bg: "#0E1317", panel: "#141B20", line: "#232D33", soft: "#1C252B", mint: "#85DDCB", green: "#8DCF6E",
  ink: "#F2F5F4", text: "#D9E0DE", gray: "#7C8A8E", mintDeep: "#357265", mintMid: "#65B0A1", suit: "#D1DEDB", suitLine: "#9AA9A6",
  rock: "#3A474E", rockDark: "#2B363C", rockLine: "#4B5A62",
};
const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';
const TAU = Math.PI * 2;
const MAX_SPEED = 310;
// Juego de los cristales: local, de esta visita y sin blancos humanos.
const GEM_COUNT = 9, GEM_HIT = 26, SHOT_SPEED = 640, SHOT_LIFE = 0.8, SHOT_EVERY = 0.28;
type Gem = { x: number; y: number; ph: number; alive: boolean; back: number };
type Shot = { x: number; y: number; vx: number; vy: number; t: number; touched: Set<string> };
/** Cosquilla: cuánto tiembla una nave tocada y qué tan cerca debe pasar el disparo. */
const SHAKE = 0.25, SHAKE_PX = 2.6, SHIP_HIT = 26;
/** Asset oficial de Ghosty (public/ghosty-oficial.png): nunca se repinta, sólo se escala. */
const GHOSTY_SRC = "/ghosty-oficial.png";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const colorOf = (id: string) => SHIP_COLORS.find((c) => c.id === id) ?? SHIP_COLORS[0];
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
function seeded(seed: number) {
  // mulberry32: el cielo se dibuja igual en cada carga
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lerpAngle(a: number, b: number, k: number) {
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * k;
}
export function seatPos(table: { x: number; y: number }, k: number) {
  const a = -Math.PI * 0.75 + (k * Math.PI) / 2;
  return { x: table.x + Math.cos(a) * 66, y: table.y + Math.sin(a) * 66 };
}
type Ctx = CanvasRenderingContext2D;
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
}

// ───────── Pilotos y naves ─────────
let ghostyImg: HTMLImageElement | null = null;
function ghosty() {
  if (!ghostyImg) { ghostyImg = new Image(); ghostyImg.src = GHOSTY_SRC; }
  return ghostyImg;
}

/** El piloto siempre va derecho (cabeza arriba), aunque la nave gire. */
export function drawPilot(ctx: Ctx, pilot: ShipPilot, x: number, y: number, r: number, face?: Face | null, ring?: string) {
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

type Drawable = { model: ShipModel; color: ShipColor; pilot: ShipPilot; ang: number; thrust: number; face?: Face | null };
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

// ───────── Lugares ─────────
function solarPanel(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = C.mintDeep; ctx.strokeStyle = C.mintMid; ctx.lineWidth = 1.4;
  roundRect(ctx, x, y, w, h, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { ctx.moveTo(x + (w * i) / 4, y); ctx.lineTo(x + (w * i) / 4, y + h); }
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}
function drawStation(ctx: Ctx, open: boolean, t: number) {
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
function drawPlanet(ctx: Ctx) {
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
function drawSatellite(ctx: Ctx, t: number) {
  ctx.rotate(-0.28 + Math.sin(t * 0.5) * 0.05);
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke();
  solarPanel(ctx, -92, -18, 52, 36); solarPanel(ctx, 40, -18, 52, 36);
  ctx.strokeStyle = C.suitLine; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -38); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.strokeStyle = C.suitLine; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -50, 15, 0.12 * Math.PI, 0.88 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.suit; roundRect(ctx, -30, -23, 60, 46, 11); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = C.mint; ctx.beginPath(); ctx.moveTo(-4.5, -7); ctx.lineTo(8, 0); ctx.lineTo(-4.5, 7); ctx.closePath(); ctx.fill();
}
function drawBase(ctx: Ctx) {
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
function drawTable(ctx: Ctx, occupied: boolean, simple: boolean) {
  ctx.fillStyle = C.soft; ctx.strokeStyle = occupied ? C.mint : C.rockLine; ctx.lineWidth = occupied ? 2 : 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.mint; ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("</>", 0, 1);
  if (simple) return;
  ctx.strokeStyle = C.rockLine; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]);
  for (let k = 0; k < 4; k++) { const s = seatPos({ x: 0, y: 0 }, k); ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
}

// ───────── Robots de la casa ─────────
// No son miembros y no cuentan en «N en el club». Su ruta depende sólo del reloj, así todas las
// personas los ven en el mismo lugar sin pasar por el servidor.
const BOTS: Array<{ id: string; name: string; look: Look; note: string; at: (t: number) => { x: number; y: number } }> = [
  { id: "bot:ghosty", name: "Ghosty", look: { model: "saucer", color: "mint", pilot: "ghosty" }, note: "Robot de la casa · cuida la Sala en vivo",
    at: (t) => ({ x: 800 + Math.cos(t * 0.2) * 178, y: 390 + Math.sin(t * 0.2) * 178 }) },
  { id: "bot:uno", name: "Robot Uno", look: { model: "pod", color: "blue", pilot: "robot" }, note: "Robot de la casa · le da vueltas al Planeta Muro",
    at: (t) => ({ x: 290 + Math.cos(-t * 0.17 + 2) * 150, y: 250 + Math.sin(-t * 0.17 + 2) * 132 }) },
  { id: "bot:dos", name: "Robot Dos", look: { model: "dart", color: "blue", pilot: "robot" }, note: "Robot de la casa · patrulla el lado este del mapa",
    at: (t) => ({ x: 1160 + Math.sin(t * 0.21) * 120, y: 500 + Math.sin(t * 0.105 + 1) * 190 }) },
];

export function createWorld(opts: { canvas: HTMLCanvasElement; stage: HTMLElement; meId: string; meName: string; mePhoto: string | null; look: Look; quiet: boolean; callbacks: Callbacks }): WorldApi {
  const { canvas: cv, stage, callbacks: cb } = opts;
  const ctx = cv.getContext("2d") as Ctx;
  const state = {
    mini: false, quiet: opts.quiet, open: false, stationSub: "", animT: 0,
    keys: new Set<string>(), joy: { x: 0, y: 0 }, moved: false, wasFlying: false,
    nearPlace: null as Place | null, nearShip: null as Entity | null, fx: [] as Fx[], marker: null as { x: number; y: number; t: number } | null,
    hidden: new Set<string>(), dead: false,
    gems: [] as Gem[], shots: [] as Shot[], crystals: 0, shotT: 9,
  };
  const entity = (id: string, kind: Entity["kind"], name: string, look: Look, x: number, y: number): Entity => ({
    id, kind, name, first: firstName(name), photoURL: null, note: null, x, y, vx: 0, vy: 0, ang: -Math.PI / 2, thrust: 0,
    model: look.model, color: look.color, pilot: look.pilot, tx: null, ty: null, table: null, seat: null,
    bob: (id.length * 1.7) % TAU, waveT: 0, face: null, shakeT: 0,
  });
  const player = entity("me", "me", opts.meName, opts.look, 800, 650);
  player.face = faceFor(opts.meId, opts.meName, opts.mePhoto);
  const humans = new Map<string, Entity>();
  const bots = BOTS.map((b) => { const p = b.at(Date.now() / 1000); const e = entity(b.id, "bot", b.name, b.look, p.x, p.y); e.note = b.note; return e; });
  const others = () => [...humans.values(), ...bots];

  // ── Movimiento ──
  // Llegada suave: acelera hacia el punto y frena al acercarse.
  function steer(e: Entity, tx: number, ty: number, max: number, dt: number, slowR = 110, snap = 3.2) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1e-6;
    const sp = max * Math.min(1, d / slowR), k = Math.min(1, snap * dt);
    e.vx += ((dx / d) * sp - e.vx) * k; e.vy += ((dy / d) * sp - e.vy) * k;
    return d;
  }
  function integrate(e: Entity, dt: number, max: number) {
    e.x = clamp(e.x + e.vx * dt, 28, WORLD_W - 28); e.y = clamp(e.y + e.vy * dt, 28, WORLD_H - 28);
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 10) e.ang = lerpAngle(e.ang, Math.atan2(e.vy, e.vx), Math.min(1, 7 * dt));
    e.thrust += (Math.min(1, sp / max) - e.thrust) * Math.min(1, 6 * dt);
  }
  function faceTable(e: Entity, dt: number) {
    if (e.table === null) return;
    const t = TABLES[e.table];
    e.ang = lerpAngle(e.ang, Math.atan2(t.y - e.y, t.x - e.x), Math.min(1, 4 * dt));
  }
  function inputVector() {
    const k = state.keys; let x = state.joy.x, y = state.joy.y;
    if (k.has("ArrowLeft") || k.has("KeyA")) x -= 1;
    if (k.has("ArrowRight") || k.has("KeyD")) x += 1;
    if (k.has("ArrowUp") || k.has("KeyW")) y -= 1;
    if (k.has("ArrowDown") || k.has("KeyS")) y += 1;
    const d = Math.hypot(x, y); return d > 1 ? { x: x / d, y: y / d } : { x, y };
  }
  function noteMoved() { if (!state.moved) { state.moved = true; cb.onFirstMove(); } }
  function updatePlayer(dt: number) {
    const inp = inputVector(), flying = !!(inp.x || inp.y);
    if (flying !== state.wasFlying) { state.wasFlying = flying; cb.onIntent(); if (flying) cb.onSound("thrust"); }
    if (flying) {
      player.tx = player.ty = null; state.marker = null; noteMoved();
      if (player.table !== null) { player.table = player.seat = null; refreshPlace(); }
      player.vx += inp.x * 620 * dt; player.vy += inp.y * 620 * dt;
      const k = Math.exp(-1.7 * dt); player.vx *= k; player.vy *= k;
      const sp = Math.hypot(player.vx, player.vy); if (sp > MAX_SPEED) { player.vx *= MAX_SPEED / sp; player.vy *= MAX_SPEED / sp; }
    } else if (player.table !== null && player.seat !== null) {
      const s = seatPos(TABLES[player.table], player.seat);
      if (steer(player, s.x, s.y, 220, dt) < 10) faceTable(player, dt);
    } else if (player.tx !== null && player.ty !== null) {
      if (steer(player, player.tx, player.ty, MAX_SPEED, dt, 150) < 8) { player.tx = player.ty = null; state.marker = null; }
    } else { const k = Math.exp(-2.6 * dt); player.vx *= k; player.vy *= k; }
    integrate(player, dt, MAX_SPEED);
  }
  function updateHuman(e: Entity, dt: number) {
    // Entre lectura y lectura la nave vuela sola hacia su último destino conocido.
    if (e.table !== null && e.seat !== null) {
      const s = seatPos(TABLES[e.table], e.seat);
      if (steer(e, s.x, s.y, 220, dt) < 10) faceTable(e, dt);
    } else if (e.tx !== null && e.ty !== null) steer(e, e.tx, e.ty, MAX_SPEED, dt, 150);
    integrate(e, dt, MAX_SPEED);
    if (e.waveT > 0) e.waveT -= dt;
  }
  function updateBots(dt: number) {
    const t = Date.now() / 1000;
    bots.forEach((e, i) => {
      const p = BOTS[i].at(t), q = BOTS[i].at(t + 0.2);
      e.x = p.x; e.y = p.y; e.thrust = 0.5;
      const face = e.waveT > 0 ? Math.atan2(player.y - e.y, player.x - e.x) : Math.atan2(q.y - p.y, q.x - p.x);
      e.ang = lerpAngle(e.ang, face, Math.min(1, 5 * dt));
      if (e.waveT > 0) e.waveT -= dt;
    });
  }
  function flyTo(x: number, y: number) {
    noteMoved();
    if (player.table !== null) { player.table = player.seat = null; refreshPlace(); }
    x = clamp(x, 40, WORLD_W - 40); y = clamp(y, 40, WORLD_H - 40);
    if (state.quiet) { player.x = x; player.y = y; player.vx = player.vy = 0; player.tx = player.ty = null; state.marker = null; } // sin vuelo: salta
    else { player.tx = x; player.ty = y; state.marker = { x, y, t: 0 }; cb.onSound("thrust"); }
    cb.onIntent();
  }

  // ── Cercanía ──
  // Un lugar sólo existe si lleva a algo que funciona (sin grabaciones no hay satélite).
  let places = PLACES;
  function placeOf(e: { x: number; y: number }) {
    let best: Place | null = null, bd = 0;
    for (const p of places) { const d = Math.hypot(e.x - p.x, e.y - p.y) - p.r; if (d < 0 && (!best || d < bd)) { best = p; bd = d; } }
    return best;
  }
  const tableCount = (i: number) => [...humans.values(), player].filter((e) => e.table === i).length;
  function refreshPlace() {
    const p = state.nearPlace;
    cb.onPlace(p ? { id: p.id, kind: p.kind, name: p.name, table: p.table } : null);
  }
  function shipInfo(e: Entity): ShipInfo {
    const p = placeOf(e);
    const where = e.kind === "bot" ? "" : p ? (p.kind === "table" ? `en la mesa «${p.short}»` : `en ${p.name}`) : "volando por el club";
    return { id: e.id, name: e.name, photoURL: e.photoURL, isBot: e.kind === "bot", where, note: e.note };
  }
  function updateProximity() {
    const p = placeOf(player);
    if (p !== state.nearPlace) { state.nearPlace = p; refreshPlace(); if (p) cb.onSound("arrive"); }
    // Una persona cerca siempre gana sobre un robot de la casa; entre iguales, la más cercana.
    let near: Entity | null = null, nd = Infinity;
    for (const group of [[...humans.values()], bots]) {
      for (const e of group) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < (e === state.nearShip ? 150 : 112) && d < nd) { near = e; nd = d; } // histéresis: la tarjeta no parpadea
      }
      if (near) break;
    }
    if (near !== state.nearShip) { state.nearShip = near; cb.onShip(near ? shipInfo(near) : null); }
  }
  function counts(): Counts {
    const n: Counts = { humans: humans.size + 1, live: 0, wall: 0, recs: 0, courses: 0, tables: 0, flying: 0, perTable: TABLES.map((_, i) => tableCount(i)) };
    for (const e of [player, ...humans.values()]) {
      const p = placeOf(e);
      if (!p) n.flying++; else if (p.kind === "table") n.tables++; else n[p.id as "live" | "wall" | "recs" | "courses"]++;
    }
    return n;
  }

  // ── Fondo: estrellas con la paleta (nunca negro plano) ──
  const starTile = document.createElement("canvas"); starTile.width = starTile.height = 512;
  {
    const g = starTile.getContext("2d") as Ctx, rnd = seeded(3);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 512, y = rnd() * 512, r = 0.5 + rnd() * 1.1, k = rnd();
      g.globalAlpha = 0.35 + rnd() * 0.45; g.fillStyle = k < 0.55 ? C.gray : k < 0.85 ? C.ink : C.mint;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 7; i++) { g.globalAlpha = 0.55; g.fillStyle = i % 3 ? C.ink : C.mint; sparkle(g, 30 + rnd() * 452, 30 + rnd() * 452, 3.5 + rnd() * 3.5); g.fill(); }
  }
  const twinkles = (() => { const rnd = seeded(11); return Array.from({ length: 14 }, () => ({ x: rnd() * WORLD_W, y: rnd() * WORLD_H, r: 4 + rnd() * 5, ph: rnd() * TAU, mint: rnd() < 0.4 })); })();
  function drawDecor(t: number) {
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1668, 505, 150, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.soft; for (const [x, y, r] of [[1590, 450, 22], [1610, 560, 12], [1560, 512, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(985, 905); ctx.rotate(-0.25); ctx.lineCap = "round";
    for (const [rx, ry, a0, a1, w, col] of [[92, 30, 0.1, 2.6, 7, C.line], [92, 30, 3.3, 5.7, 7, C.line], [56, 17, 0.5, 3.0, 6, C.soft], [56, 17, 3.7, 6.0, 6, C.soft]] as const) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
    }
    ctx.fillStyle = C.line; ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([3, 11]); ctx.beginPath(); ctx.arc(800, 390, 176, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (const s of twinkles) { const k = 0.55 + 0.45 * Math.sin(t * 1.3 + s.ph); ctx.globalAlpha = 0.25 + 0.5 * k; ctx.fillStyle = s.mint ? C.mint : C.ink; sparkle(ctx, s.x, s.y, s.r * (0.6 + 0.4 * k)); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(20, 27, 32, .55)"; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([7, 7]);
    roundRect(ctx, ZONE.x, ZONE.y, ZONE.w, ZONE.h, 34); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawPlace(p: Place, t: number, boost: number, simple: boolean) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(boost, boost);
    if (p.kind === "station") drawStation(ctx, state.open, t);
    else if (p.kind === "planet") drawPlanet(ctx);
    else if (p.kind === "satellite") drawSatellite(ctx, t);
    else if (p.kind === "base") drawBase(ctx);
    else drawTable(ctx, tableCount(p.table as number) > 0, simple);
    ctx.restore();
  }

  // ── Vista ──
  const view = { vw: 1, vh: 1, dpr: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 };
  const toScreen = (x: number, y: number) => ({ x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy });
  const toWorld = (sx: number, sy: number) => ({ x: (sx - view.ox) / view.scale + view.camx, y: (sy - view.oy) / view.scale + view.camy });
  let starPattern: CanvasPattern | null = null;
  function updateCamera(k: number) {
    if (state.mini) return;
    const vwW = view.vw / view.scale, vhW = view.vh / view.scale;
    const tx = clamp(player.x - vwW / 2, 0, Math.max(0, WORLD_W - vwW)), ty = clamp(player.y - vhW / 2, 0, Math.max(0, WORLD_H - vhW));
    view.camx += (tx - view.camx) * k; view.camy += (ty - view.camy) * k;
  }
  function measure() {
    const r = stage.getBoundingClientRect();
    view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height); view.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr);
    starPattern = ctx.createPattern(starTile, "repeat");
    if (state.mini) {
      // Mapa reducido: el mundo completo a la vista.
      view.scale = Math.min(view.vw / WORLD_W, view.vh / WORLD_H); view.camx = view.camy = 0;
      view.ox = (view.vw - WORLD_W * view.scale) / 2; view.oy = (view.vh - WORLD_H * view.scale) / 2;
    } else {
      view.scale = clamp(Math.max(view.vw / WORLD_W, view.vh / WORLD_H), view.vw < 640 ? 0.66 : 0.75, 1.5); view.ox = view.oy = 0;
      updateCamera(1);
    }
  }

  type LabelOpts = { size?: number; weight?: number; bg?: string; stroke?: string; color?: string; free?: boolean; dot?: string; img?: HTMLImageElement | null };
  /** Pastilla de texto en coordenadas de pantalla (nítida a cualquier escala). */
  function label(x: number, y: number, text: string, o: LabelOpts = {}) {
    const size = o.size ?? 11; ctx.font = `${o.weight ?? 600} ${size}px ${FONT}`;
    const lead = o.dot ? size + 7 : 0, w = ctx.measureText(text).width + 14 + lead, h = size + 8;
    // `free`: la etiqueta se va con el mundo; si no, se queda dentro del cuadro.
    const bx = o.free ? x - w / 2 : clamp(x - w / 2, 4, Math.max(4, view.vw - w - 4));
    ctx.fillStyle = o.bg ?? "rgba(20, 27, 32, .94)"; ctx.strokeStyle = o.stroke ?? C.line; ctx.lineWidth = 1;
    roundRect(ctx, bx, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    if (o.dot) {
      const cx = bx + h / 2, cy = y + h / 2, cr = h / 2 - 2.5;
      ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
      if (o.img && o.img.complete && o.img.naturalWidth) {
        // Foto real del miembro, recortada en círculo.
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.clip();
        const iw = o.img.naturalWidth, ih = o.img.naturalHeight, side = Math.min(iw, ih);
        ctx.drawImage(o.img, (iw - side) / 2, (ih - side) / 2, side, side, cx - cr, cy - cr, cr * 2, cr * 2); ctx.restore();
      }
    }
    ctx.fillStyle = o.color ?? C.ink; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, bx + 7 + lead, y + h / 2 + 0.5);
    return h;
  }
  function drawEdgeHints() {
    // Lugares fuera de cuadro: una flechita con su nombre en la orilla.
    const { vw, vh } = view, top = 56, m = 12;
    for (const p of places) {
      if (p.kind === "table" && p.table !== 1) continue;
      const s = toScreen(p.x, p.y); if (s.x > -20 && s.x < vw + 20 && s.y > top - 40 && s.y < vh + 20) continue;
      const name = p.kind === "table" ? "Mesas" : p.short;
      ctx.font = `600 10px ${FONT}`; const w = ctx.measureText(name).width + 28, h = 20;
      const cx = clamp(s.x, m + w / 2, vw - m - w / 2), cy = clamp(s.y, top + h / 2, vh - m - h / 2 - 4);
      ctx.fillStyle = "rgba(20, 27, 32, .94)"; ctx.strokeStyle = C.line; ctx.lineWidth = 1; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(cx - w / 2 + 11, cy); ctx.rotate(Math.atan2(s.y - cy, s.x - cx)); ctx.fillStyle = C.mint;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.gray; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, cx - w / 2 + 20, cy + 0.5);
    }
  }
  function render() {
    const { vw, vh, dpr, scale } = view, t = state.animT, mini = state.mini;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, vw, vh);
    const px = mini ? 0 : view.camx * scale * 0.4, py = mini ? 0 : view.camy * scale * 0.4;
    if (starPattern) { ctx.save(); ctx.translate(-px, -py); ctx.fillStyle = starPattern; ctx.fillRect(px, py, vw, vh); ctx.restore(); }

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (view.ox - view.camx * scale), dpr * (view.oy - view.camy * scale));
    drawDecor(t);
    for (const p of places) drawPlace(p, t, p.kind === "table" ? (mini ? 1.25 : 1) : mini ? 1.45 : 1, mini);
    const all = others();
    if (mini) {
      for (const e of all) {
        // En el mapa chico las demás naves son puntos de su color.
        ctx.fillStyle = colorOf(e.color).fill; ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5 / scale;
        ctx.beginPath(); ctx.arc(e.x, e.y, (e.kind === "bot" ? 3.2 : 4.4) / scale, 0, TAU); ctx.fill(); ctx.stroke();
      }
      if (state.marker) {
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.5 / scale; ctx.setLineDash([3 / scale, 3 / scale]);
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(state.marker.x, state.marker.y); ctx.stroke(); ctx.setLineDash([]);
      }
      drawShip(ctx, player, player.x, player.y, 30 / scale, t);
    } else {
      if (state.marker) {
        // A dónde va tu nave.
        const m = state.marker, f = (m.t * 1.4) % 1;
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(m.x, m.y, 14 + f * 12, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, TAU); ctx.fill();
      }
      if (state.nearShip) {
        // Marca mínima de selección: un anillo alrededor de la nave que tienes cerca.
        const e = state.nearShip;
        ctx.strokeStyle = C.mint; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(e.x, e.y, 38, t * 0.6, t * 0.6 + TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (!state.quiet) for (const g of state.gems) if (g.alive) drawGem(g, t);
      for (const e of [...all, player].sort((a, b) => a.y - b.y)) {
        const bob = e.kind === "me" || state.quiet ? 0 : Math.sin(t * 1.6 + e.bob) * 2.2;
        // Temblor amortiguado: 2–3 px que se apagan en un cuarto de segundo.
        const k = e.shakeT > 0 ? e.shakeT / SHAKE : 0, sx = k ? Math.sin((SHAKE - e.shakeT) * 80) * SHAKE_PX * k : 0, sy = k ? Math.cos((SHAKE - e.shakeT) * 63) * SHAKE_PX * 0.5 * k : 0;
        drawShip(ctx, e, e.x + sx, e.y + bob + sy, 56, t);
      }
      for (const s of state.shots) drawShot(s);
      for (const f of state.fx) if (f.kind === "flash") {
        // Destello al atrapar: un aro que se abre y se apaga.
        const k = f.t / f.dur; ctx.globalAlpha = 1 - k; ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, 8 + 26 * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (const f of state.fx) if (f.kind === "spark") {
        const k = f.t / f.dur; ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color; sparkle(ctx, f.x + f.vx * f.t, f.y + f.vy * f.t, 7 * (1 - k * 0.5)); ctx.fill(); ctx.globalAlpha = 1;
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mini) {
      for (const p of places) if (p.kind !== "table") { const s = toScreen(p.x, p.y + (p.kind === "station" ? 96 : p.labelDy) * 1.45); label(s.x, Math.min(s.y, vh - 22), p.short, { size: 10 }); }
      const z = toScreen(ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h); label(z.x, Math.min(z.y - 9, vh - 22), "Mesas del hackatón", { size: 10 });
      const s = toScreen(player.x, player.y); label(s.x, s.y + 17, "Tú", { size: 10, stroke: C.mint, color: C.mint });
      return;
    }
    const z = toScreen(ZONE.x + 30, ZONE.y);
    ctx.font = `600 11px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const zt = "MESAS DEL HACKATÓN";
    ctx.fillStyle = C.bg; ctx.fillRect(z.x - 8, z.y - 8, ctx.measureText(zt).width + 16, 16); ctx.fillStyle = C.gray; ctx.fillText(zt, z.x, z.y + 0.5);
    for (const p of places) {
      const s = toScreen(p.x, p.y + p.labelDy), near = p === state.nearPlace;
      if (p.kind === "table") { label(s.x, s.y, `${p.short} · ${tableCount(p.table as number)} de 4`, { size: 11, weight: 500, free: true, color: near ? C.ink : C.gray, stroke: near ? C.mint : C.line }); continue; }
      const h = label(s.x, s.y, p.name, { size: 12, free: true, stroke: near ? C.mint : C.line });
      if (p.kind === "station" && state.stationSub) { ctx.font = `500 11px ${FONT}`; ctx.textAlign = "center"; ctx.fillStyle = state.open ? C.mint : C.gray; ctx.fillText(state.stationSub, s.x, s.y + h + 10); }
    }
    // Con mucha gente las etiquetas se enciman: sólo llevan nombre las naves cercanas a la tuya.
    const crowded = all.length > 9;
    for (const e of all) {
      const s = toScreen(e.x, e.y); if (s.x < -80 || s.x > vw + 80 || s.y < -60 || s.y > vh + 60) continue;
      const near = e === state.nearShip;
      if (crowded && !near && Math.hypot(e.x - player.x, e.y - player.y) > 300) continue;
      if (e.kind === "bot") label(s.x, s.y + 31 * scale + 2, `${e.name} · robot`, { size: 10, weight: 500, free: true, color: near ? C.ink : C.gray, stroke: near ? C.mint : C.line });
      else label(s.x, s.y + 31 * scale + 2, e.first, { size: 11, weight: 500, free: true, dot: colorOf(e.color).fill, img: e.face?.img ?? null, color: near ? C.ink : C.text, stroke: near ? C.mint : C.line });
    }
    const ps = toScreen(player.x, player.y);
    label(ps.x, ps.y + 31 * scale + 2, "Tú", { size: 11, free: true, stroke: C.mint, color: C.mint });
    for (const f of state.fx) if (f.kind === "bubble") {
      const s = toScreen(f.ship.x, f.ship.y), k = f.t / f.dur, rise = state.quiet ? 0 : Math.min(1, k * 4) * 8;
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; label(s.x, s.y - 36 * scale - 18 - rise, f.text, { size: 11, bg: C.ink, color: C.bg, stroke: C.ink }); ctx.globalAlpha = 1;
    }
    drawEdgeHints();
  }
  // ── Juego: juntar cristales con un disparo ──
  // Cristales de energía flotan por el mapa; el disparo sale de la punta de tu nave y sólo los cristales
  // lo detienen: atraviesa naves y lugares sin tocarlos, así nadie puede ser blanco de nadie. Todo es
  // local (no viaja al servidor) y la cuenta es de esta visita. En «Tranquilo» no hay juego.
  function gemSpot() {
    for (let k = 0; k < 40; k++) { const g = { x: 80 + Math.random() * (WORLD_W - 160), y: 80 + Math.random() * (WORLD_H - 160) }; if (!placeOf(g) && Math.hypot(g.x - player.x, g.y - player.y) > 140) return g; }
    return { x: 1000, y: 120 };
  }
  /** Sin ángulo dispara hacia donde apunta la nave; el clic derecho manda el ángulo hacia el cursor. */
  function shoot(angle?: number) {
    if (state.quiet || state.mini || state.shotT < SHOT_EVERY) return;
    state.shotT = 0;
    const a = angle ?? player.ang;
    state.shots.push({ x: player.x + Math.cos(a) * 30, y: player.y + Math.sin(a) * 30, vx: Math.cos(a) * SHOT_SPEED, vy: Math.sin(a) * SHOT_SPEED, t: 0, touched: new Set() });
    cb.onSound("shoot");
  }
  function updateGame(dt: number) {
    state.shotT += dt;
    if (state.quiet) { state.shots.length = 0; return; }
    for (const g of state.gems) if (!g.alive && (g.back -= dt) <= 0) Object.assign(g, gemSpot(), { alive: true });
    for (const s of state.shots) {
      const x0 = s.x, y0 = s.y;
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      // Distancia al tramo recorrido en este cuadro: con pocos cuadros por segundo el disparo no se salta a nadie.
      const near = (q: { x: number; y: number }) => {
        const dx = s.x - x0, dy = s.y - y0, u = clamp(((q.x - x0) * dx + (q.y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        return Math.hypot(q.x - (x0 + dx * u), q.y - (y0 + dy * u));
      };
      // Cosquilla: la nave que roza tiembla un instante. El disparo sigue de largo: no hay daño ni puntos.
      for (const e of others()) {
        if (s.touched.has(e.id) || near(e) > SHIP_HIT) continue;
        s.touched.add(e.id); tickle(e); cb.onSound("nudge");
        if (e.kind === "human") cb.onNudge(e.id);
      }
      const g = state.gems.find((q) => q.alive && near(q) < GEM_HIT);
      if (!g) continue;
      g.alive = false; g.back = 5 + Math.random() * 4; s.t = SHOT_LIFE; // el disparo se gasta en el cristal
      for (let i = 0; i < 7; i++) { const b = (i * TAU) / 7; state.fx.push({ kind: "spark", x: g.x, y: g.y, vx: Math.cos(b) * 80, vy: Math.sin(b) * 80, t: 0, dur: 0.5, color: i % 2 ? C.mint : C.ink }); }
      state.fx.push({ kind: "flash", x: g.x, y: g.y, t: 0, dur: 0.28 });
      state.fx.push({ kind: "bubble", ship: player, text: "+1 cristal", t: 0, dur: 1 });
      state.crystals++; cb.onSound("catch"); cb.onScore(state.crystals);
    }
    state.shots = state.shots.filter((s) => s.t < SHOT_LIFE && s.x > -20 && s.x < WORLD_W + 20 && s.y > -20 && s.y < WORLD_H + 20);
  }
  /** Temblor breve con un chispazo chico. Varias cosquillas seguidas son un solo temblor. */
  function tickle(e: Entity) {
    if (state.quiet || e.shakeT > 0) return;
    e.shakeT = SHAKE;
    for (let i = 0; i < 4; i++) { const b = (i * TAU) / 4 + 0.6; state.fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(b) * 55, vy: Math.sin(b) * 55, t: 0, dur: 0.3, color: C.ink }); }
  }
  function drawGem(g: Gem, t: number) {
    // Cristal plano de tres facetas, flotando despacio.
    const x = g.x, y = g.y + Math.sin(t * 1.8 + g.ph) * 3.5, w = 9, h = 15;
    const outline = () => { ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y - 3); ctx.lineTo(x, y + h); ctx.lineTo(x - w, y - 3); ctx.closePath(); };
    ctx.fillStyle = C.mint; outline(); ctx.fill();
    ctx.fillStyle = "#BDEEE3"; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - 3); ctx.lineTo(x - w, y - 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4FA896"; ctx.beginPath(); ctx.moveTo(x + w, y - 3); ctx.lineTo(x, y + h); ctx.lineTo(x, y - 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.mintDeep; ctx.lineWidth = 1; outline(); ctx.stroke();
    if (Math.sin(t * 1.8 + g.ph) > 0.92) { ctx.fillStyle = C.ink; sparkle(ctx, x + w + 3, y - h + 2, 4); ctx.fill(); }
  }
  function drawShot(s: Shot) {
    // Destello alargado con estela corta, del color de la casa.
    const a = Math.atan2(s.vy, s.vx), fade = s.t > SHOT_LIFE - 0.15 ? (SHOT_LIFE - s.t) / 0.15 : 1;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.globalAlpha = Math.max(0, fade);
    ctx.lineCap = "round"; ctx.strokeStyle = C.mintDeep; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, 0); ctx.stroke();
    ctx.strokeStyle = C.mint; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(6, 0, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ── Saludos ──
  function burst(e: Entity) {
    if (state.quiet) return;
    for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + 0.3; state.fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, t: 0, dur: 0.8, color: i % 2 ? C.mint : C.green }); }
  }
  const byId = (id: string, meId: string) => (id === meId ? player : humans.get(id) ?? null);
  let meId = "";

  // ── Entrada ──
  const MOVE_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"];
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey || (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return;
    if (MOVE_KEYS.includes(e.code)) { state.keys.add(e.code); e.preventDefault(); }
    else if (e.code === "Space" && !target?.closest("button, a")) { shoot(); e.preventDefault(); }
    else if (e.code === "Enter" && !target?.closest("button, a")) cb.onEnter();
    else if (e.code === "Escape") cb.onEscape();
  };
  const onKeyUp = (e: KeyboardEvent) => state.keys.delete(e.code);
  const onBlur = () => state.keys.clear();
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return; // el clic derecho dispara (ver `onContextMenu`), no mueve la nave
    if (cb.onStageTap()) return;
    const r = stage.getBoundingClientRect(), w = toWorld(e.clientX - r.left, e.clientY - r.top);
    flyTo(w.x, w.y);
  };
  window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlur);
  // Clic derecho: dispara hacia el cursor y, de paso, no abre el menú del navegador sobre el mapa.
  // En táctil el toque largo también lanza `contextmenu`: ahí sólo se cancela el menú.
  let lastPointerType = "mouse";
  const onPointerType = (e: PointerEvent) => { lastPointerType = e.pointerType; };
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (lastPointerType !== "mouse") return;
    const r = stage.getBoundingClientRect(), w = toWorld(e.clientX - r.left, e.clientY - r.top);
    shoot(Math.atan2(w.y - player.y, w.x - player.x));
  };
  stage.addEventListener("pointerdown", onPointerType, true);
  stage.addEventListener("contextmenu", onContextMenu);
  stage.addEventListener("pointerdown", onPointerDown);
  const observer = new ResizeObserver(() => measure()); observer.observe(stage);

  // ── Ciclo ──
  let last = performance.now(), countAcc = 1, raf = 0;
  function frame(now: number) {
    if (state.dead) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!state.quiet) { state.animT += dt; updateBots(dt); }
    for (const e of humans.values()) updateHuman(e, dt);
    updatePlayer(dt); updateGame(dt);
    if (player.shakeT > 0) player.shakeT -= dt;
    for (const e of others()) if (e.shakeT > 0) e.shakeT -= dt;
    if (state.marker) state.marker.t += dt;
    for (const f of state.fx) f.t += dt;
    state.fx = state.fx.filter((f) => f.t < f.dur);
    updateProximity();
    countAcc += dt; if (countAcc > 0.5) { countAcc = 0; cb.onCounts(counts()); }
    updateCamera(Math.min(1, 5 * dt)); render();
    raf = requestAnimationFrame(frame);
  }
  state.gems = Array.from({ length: GEM_COUNT }, (_, i) => ({ ...gemSpot(), ph: i * 1.7, alive: true, back: 0 }));
  ghosty();
  measure();
  raf = requestAnimationFrame(frame);

  return {
    resize(mini) { state.mini = mini; measure(); },
    setQuiet(quiet) { state.quiet = quiet; if (quiet) { player.tx = player.ty = null; state.marker = null; player.shakeT = 0; for (const e of others()) e.shakeT = 0; state.fx = state.fx.filter((f) => f.kind === "bubble"); state.shots.length = 0; } },
    setLook(look) { player.model = look.model; player.color = look.color; player.pilot = look.pilot; cb.onIntent(); },
    setStation(s) { state.open = s.open; state.stationSub = s.sub; },
    setHidden(ids) { state.hidden = new Set(ids); places = PLACES.filter((p) => !state.hidden.has(p.id)); },
    setRemote(ships, me) {
      meId = me;
      const seen = new Set<string>();
      for (const s of ships) {
        if (s.id === me) continue;
        seen.add(s.id);
        const look: Look = {
          model: (SHIP_MODELS.find((m) => m.id === s.ship)?.id ?? "rocket") as ShipModel,
          color: colorOf(s.color).id,
          pilot: (SHIP_PILOTS.find((p) => p.id === s.pilot)?.id ?? "astro") as ShipPilot,
        };
        let e = humans.get(s.id);
        if (!e) {
          e = entity(s.id, "human", s.name, look, s.x, s.y);
          e.photoURL = s.photoURL;
          e.face = faceFor(s.id, s.name, s.photoURL);
          humans.set(s.id, e);
        }
        e.name = s.name; e.first = firstName(s.name); e.model = look.model; e.color = look.color; e.pilot = look.pilot;
        e.tx = s.tx; e.ty = s.ty; e.table = s.table; e.seat = s.seat;
        // Si la nave local quedó muy lejos de la real (o no hay animación), se coloca de golpe.
        if (state.quiet || Math.hypot(s.x - e.x, s.y - e.y) > 320) { e.x = s.x; e.y = s.y; e.vx = e.vy = 0; }
      }
      for (const id of humans.keys()) if (!seen.has(id)) { if (state.nearShip?.id === id) { state.nearShip = null; cb.onShip(null); } humans.delete(id); }
    },
    showSay(fromId, text) {
      const from = byId(fromId, meId); if (!from) return;
      // Una burbuja por nave: el mensaje nuevo reemplaza al anterior. Lo largo se lee completo en el historial.
      state.fx = state.fx.filter((f) => !(f.kind === "bubble" && f.say && f.ship === from));
      const chars = [...text];
      state.fx.push({ kind: "bubble", ship: from, text: chars.length > 46 ? `${chars.slice(0, 45).join("")}…` : text, t: 0, dur: 5, say: true });
    },
    showNudge(toId) {
      const to = byId(toId, meId); if (!to || state.quiet) return false;
      tickle(to);
      return to === player;
    },
    showWave(fromId, toId) {
      const from = byId(fromId, meId), to = byId(toId, meId); if (!from || !to) return;
      state.fx.push({ kind: "bubble", ship: from, text: `¡Hola, ${to === player ? firstName(opts.meName) : to.first}!`, t: 0, dur: 1.5 });
      if (to === player) burst(player); else if (from === player) to.waveT = 3;
    },
    waveBot(botId) {
      const bot = bots.find((b) => b.id === botId); if (!bot) return;
      state.fx.push({ kind: "bubble", ship: player, text: `¡Hola, ${bot.first}!`, t: 0, dur: 1.5 });
      bot.waveT = 3.5;
      window.setTimeout(() => { if (state.dead) return; state.fx.push({ kind: "bubble", ship: bot, text: `¡Hola, ${firstName(opts.meName)}!`, t: 0, dur: 1.5 }); burst(bot); cb.onSound("waveIn"); }, 650);
    },
    shoot: () => shoot(),
    nearestCrystal() {
      let best: Gem | null = null, bd = Infinity;
      for (const g of state.gems) { const d = Math.hypot(g.x - player.x, g.y - player.y); if (g.alive && d < bd) { best = g; bd = d; } }
      return best ? { x: best.x, y: best.y } : null;
    },
    flyToPlace(placeId) {
      const p = places.find((q) => q.id === placeId); if (!p) return;
      if (p.kind === "table") flyTo(400, 560); else flyTo(p.x - p.r * 0.5, p.y + p.r * 0.62);
    },
    setJoy(x, y) { state.joy.x = x; state.joy.y = y; },
    sit(table) {
      const taken = new Set([...humans.values()].filter((e) => e.table === table && e.seat !== null).map((e) => e.seat));
      const k = [0, 1, 2, 3].find((s) => !taken.has(s)); if (k === undefined) return;
      player.tx = player.ty = null; state.marker = null; player.table = table; player.seat = k;
      if (state.quiet) { const s = seatPos(TABLES[table], k); player.x = s.x; player.y = s.y; player.vx = player.vy = 0; }
      refreshPlace(); cb.onIntent(); cb.onSound("sit");
    },
    stand() { if (player.table === null) return; player.table = player.seat = null; refreshPlace(); cb.onIntent(); cb.onSound("stand"); },
    confirmSeat(table, seat) {
      // El servidor manda: si la mesa se llenó o tocó otro asiento, la nave se acomoda.
      if (player.table === null || (table === player.table && seat === player.seat)) return;
      if (table === null) { player.table = player.seat = null; refreshPlace(); } else if (table === player.table) player.seat = seat;
    },
    myTable: () => player.table,
    myState() {
      const flying = state.wasFlying;
      const seat = player.table !== null && player.seat !== null ? seatPos(TABLES[player.table], player.seat) : null;
      // Volando con teclas no hay destino: se manda a dónde va a estar en un momento.
      const tx = seat ? seat.x : player.tx ?? player.x + (flying ? player.vx * 1.1 : 0);
      const ty = seat ? seat.y : player.ty ?? player.y + (flying ? player.vy * 1.1 : 0);
      return { x: Math.round(player.x), y: Math.round(player.y), tx: Math.round(clamp(tx, 28, WORLD_W - 28)), ty: Math.round(clamp(ty, 28, WORLD_H - 28)), table: player.table, flying };
    },
    screenOf: (x, y) => toScreen(x, y),
    destroy() {
      state.dead = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointerdown", onPointerType, true);
      stage.removeEventListener("contextmenu", onContextMenu);
    },
  };
}
