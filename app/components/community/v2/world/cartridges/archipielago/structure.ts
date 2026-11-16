// Archipiélago: la estructura (datos). La lee el motor en el navegador y el servidor para validar.
// Sólo datos y funciones puras: nada de DOM aquí.
import type { BotDef, Place, TableDef, WorldStructure } from "../../cartridge";

export const WORLD_ID = "archipielago";
export const WORLD_NAME = "Archipiélago";
const W = 1800, H = 1100;

/** Tres asientos (troncos) alrededor de la fogata de cada islote. */
const seatPos = (t: { x: number; y: number }, k: number) => {
  const a = -Math.PI / 2 + (k * Math.PI * 2) / 4 + Math.PI / 4;
  return { x: t.x + Math.cos(a) * 52, y: t.y + Math.sin(a) * 40 };
};
const TABLES: TableDef[] = [
  { x: 330, y: 860, topic: "Busco equipo" },
  { x: 610, y: 960, topic: "Estoy atorado" },
  { x: 890, y: 860, topic: "Muestra y cuenta" },
].map((t) => ({ ...t, seats: [0, 1, 2, 3].map((k) => seatPos(t, k)) }));

const PLACES: Place[] = [
  { id: "live", target: "call", kind: "lighthouse", x: 900, y: 420, r: 190, name: "Isla del Faro · Sala en vivo", short: "Sala en vivo", table: null },
  { id: "wall", target: "wall", kind: "mural", x: 330, y: 300, r: 160, name: "Isla del Mural", short: "Mural", table: null },
  { id: "recs", target: "recs", kind: "cinema", x: 1480, y: 280, r: 150, name: "Isla del Cine · Grabaciones", short: "Grabaciones", table: null },
  { id: "courses", target: "courses", kind: "school", x: 1470, y: 820, r: 160, name: "Isla Escuelita · Cursos", short: "Cursos", table: null },
  ...TABLES.map((t, i): Place => ({ id: `t${i}`, target: "table", kind: "islet", x: t.x, y: t.y, r: 100, name: `Islote «${t.topic}»`, short: t.topic, table: i })),
];

// Robots de la casa: su ruta sale del reloj, así todos los ven igual.
const BOTS: BotDef[] = [
  { id: "bot:ghosty", name: "Ghosty", look: { model: "ghosty", color: "sky", pilot: "avatar" }, note: "Robot de la casa · le da vueltas al Faro",
    at: (t) => ({ x: 900 + Math.cos(t * 0.18) * 230, y: 420 + Math.sin(t * 0.18) * 170 }) },
  { id: "bot:cartero", name: "Ghostyllo Cartero", look: { model: "ghostling", color: "amber", pilot: "avatar" }, note: "Robot de la casa · lleva el correo entre islas",
    at: (t) => ({ x: 900 + Math.sin(t * 0.07) * 620, y: 600 + Math.sin(t * 0.14 + 1) * 120 }) },
];

export const structure: WorldStructure = {
  size: { w: W, h: H },
  spawn: { x: 900, y: 700 },
  places: PLACES,
  tables: TABLES,
  tableZone: { name: "Islotes", entry: { x: 610, y: 760 }, x: 200, y: 760, w: 820, h: 300 },
  bots: BOTS,
  // Cada miembro es un fantasma en pixel art: Ghosty (lavanda, con lentes; su color no cambia) o un
  // ghostyllo del color que elija. La foto del miembro va junto a su nombre.
  looks: {
    models: [
      { id: "ghostling", name: "Ghostyllo" },
      { id: "ghosty", name: "Ghosty" },
    ],
    colors: [
      { id: "sky", name: "Cielo" },
      { id: "mint", name: "Menta" },
      { id: "amber", name: "Ámbar" },
      { id: "coral", name: "Coral" },
      { id: "green", name: "Verde" },
    ],
    pilots: [{ id: "avatar", name: "Mi avatar" }],
    initial: { model: "ghostling", color: "sky", pilot: "avatar" },
    fallback: { model: "ghostling", color: "sky", pilot: "avatar" },
  },
  // Vuelo libre con inercia, sin gravedad.
  // Turbo con Shift (×1.8, como el del juego) y, en la vista de persecución, giro de avión.
  movement: { maxSpeed: 320, accel: 640, drag: 1.7, idleDrag: 2.6, seatSpeed: 220, margin: 28, targetMargin: 40, boost: 1.8, steer: { turn: 2.4 } },
  camera: { minScale: 0.7, minScaleNarrow: 0.6, maxScale: 1.4 },
  combat: null,
  // Modo «Estrellas»: el récord del club y quién lo tiene.
  shared: { best: { type: "number", min: 0, max: 9999 }, leader: { type: "member" } },
};
