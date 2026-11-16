// Archipiélago: la estructura (datos). La lee el motor en el navegador y el servidor para validar.
// Sólo datos y funciones puras: nada de DOM aquí.
import type { BotDef, Place, TableDef, WorldStructure } from "../../cartridge";
import { HIDE_R, HIDE_SPOT, MAP_K, RINGS, START_R, at } from "./stars";

export const WORLD_ID = "archipielago";
export const WORLD_NAME = "Archipiélago";
const W = Math.round(1800 * MAP_K), H = Math.round(1100 * MAP_K);

/** Tres asientos (troncos) alrededor de la fogata de cada islote. */
const seatPos = (t: { x: number; y: number }, k: number) => {
  const a = -Math.PI / 2 + (k * Math.PI * 2) / 4 + Math.PI / 4;
  return { x: t.x + Math.cos(a) * 52, y: t.y + Math.sin(a) * 40 };
};
const TABLES: TableDef[] = [
  { ...at(330, 860), topic: "Busco equipo" },
  { ...at(610, 960), topic: "Estoy atorado" },
  { ...at(890, 860), topic: "Muestra y cuenta" },
].map((t) => ({ ...t, seats: [0, 1, 2, 3].map((k) => seatPos(t, k)) }));

const PLACES: Place[] = [
  { id: "live", target: "call", kind: "lighthouse", ...at(900, 420), r: 190, name: "Isla del Faro · Sala en vivo", short: "Sala en vivo", table: null },
  { id: "wall", target: "wall", kind: "mural", ...at(330, 300), r: 160, name: "Isla del Mural", short: "Mural", table: null },
  { id: "recs", target: "recs", kind: "cinema", ...at(1480, 280), r: 150, name: "Isla del Cine · Grabaciones", short: "Grabaciones", table: null },
  { id: "courses", target: "courses", kind: "school", ...at(1470, 820), r: 160, name: "Isla Escuelita · Cursos", short: "Cursos", table: null },
  ...TABLES.map((t, i): Place => ({ id: `t${i}`, target: "table", kind: "islet", x: t.x, y: t.y, r: 100, name: `Islote «${t.topic}»`, short: t.topic, table: i })),
];

// Robots de la casa: su ruta sale del reloj, así todos los ven igual.
const BOTS: BotDef[] = [
  { id: "bot:ghosty", name: "Ghosty", look: { model: "ghosty", color: "sky", pilot: "avatar" }, note: "Robot de la casa · le da vueltas al Faro",
    at: (t) => ({ x: 900 * MAP_K + Math.cos(t * 0.18) * 230, y: 420 * MAP_K + Math.sin(t * 0.18) * 170 }) },
  { id: "bot:cartero", name: "Ghostyllo Cartero", look: { model: "ghostling", color: "amber", pilot: "avatar" }, note: "Robot de la casa · lleva el correo entre islas",
    at: (t) => ({ x: (900 + Math.sin(t * 0.07) * 620) * MAP_K, y: (600 + Math.sin(t * 0.14 + 1) * 120) * MAP_K }) },
];

export const structure: WorldStructure = {
  size: { w: W, h: H },
  spawn: at(900, 700),
  places: PLACES,
  tables: TABLES,
  tableZone: { name: "Islotes", entry: at(610, 760), ...at(200, 760), w: Math.round(820 * MAP_K), h: Math.round(300 * MAP_K) },
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
  // Récords del club y quién los tiene (estrellas y carrera, en décimas de segundo), quién trae la
  // estrella dorada y cuándo arranca la carrera convocada.
  shared: {
    best: { type: "number", min: 0, max: 9999, merge: "max" },
    leader: { type: "member" },
    raceBest: { type: "number", min: 1, max: 36000, merge: "min" },
    raceLeader: { type: "member" },
    raceAt: { type: "number", min: 0, max: 2147483647 },
    it: { type: "member" },
    itAt: { type: "number", min: 0, max: 2147483647 },
    // Tormenta: tanda × 100 + golpes (sólo sube).
    storm: { type: "number", min: 0, max: 2147483647, merge: "max" },
    seeker: { type: "member" },
    hideAt: { type: "number", min: 0, max: 2147483647 },
  },
  // Progreso de cada quien que se guarda en la base: estrellas de por vida, carreras y su mejor vuelta
  // (décimas), tormentas tumbadas, a cuántos encontraste y cuántas escondidillas ganaste.
  progress: {
    stars: { merge: "sum", max: 500 },
    races: { merge: "sum", max: 5 },
    bestLap: { merge: "min", max: 36000 },
    storms: { merge: "sum", max: 3 },
    found: { merge: "sum", max: 20 },
    hides: { merge: "sum", max: 3 },
  },
  // La salida de la carrera es un área fija; los demás aros los pone el modo sólo durante la carrera.
  areas: [
    { id: "start", shape: { kind: "circle", x: RINGS[0].x, y: RINGS[0].y, r: START_R }, tags: ["start"] },
    { id: "hide", shape: { kind: "circle", x: HIDE_SPOT.x, y: HIDE_SPOT.y, r: HIDE_R }, tags: ["hide"] },
  ],
};
