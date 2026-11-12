// Cartucho «Isla Menta» — COSAS con las que se puede hacer algo (banca, fogata, pista de baile…).
// Datos puros: ni three ni DOM, y no importa nada de la carpeta (lo leen `structure.ts` y la skin).
//
// La regla que hace que todos lo vean sin tocar el servidor: **la pose sale de la posición**. Cada
// cosa trae «puntos» (posición + hacia dónde mira + pose). Cualquier muñequito —tú, otra persona o
// un robot— que esté quieto sobre un punto se dibuja con esa pose en todos los clientes, porque la
// posición ya viaja por la presencia. No hay ningún campo nuevo en el protocolo.
//
// Coordenadas en el plano del mapa (1600×1000). `face` es el giro del muñequito: 0 mira al sur
// (hacia la cámara), π/2 al este, π al norte.

export type PoseId = "sit" | "perch" | "warm" | "look" | "peek" | "cheer" | "dance" | "drink" | "rest" | "lie";
/** Globito de ánimo (ícono plano, sin texto) de quien lleva rato en una actividad. */
export type Mood = "note" | "cup" | "star" | "flame" | "zzz" | "wave";

export type Spot = { x: number; y: number; face: number };
export type Action = {
  id: string;
  /** Lo que dice el menú: un verbo. */
  label: string;
  /** Lo que se anuncia cuando ya lo estás haciendo. */
  done: string;
  pose: PoseId;
  mood: Mood;
  /** Nombre del sonido en el banco de la skin. */
  sound: string;
  /** Cupo = cuántos puntos hay. Dos personas no comparten punto. */
  spots: Spot[];
};
export type Thing = {
  id: string;
  name: string;
  /** Centro de la cosa (para tocarla y para colgarle el menú) y altura del menú en unidades de la escena. */
  x: number; y: number; h: number;
  /** Radio para atinarle con el dedo, en pixeles del mapa. */
  hit: number;
  /** Radio que estorba al caminar (0 = se puede pisar) y radio en el que no se siembran árboles. */
  solid: number; clear: number;
  actions: Action[];
};

/** Qué tan cerca de un punto hay que quedar para tomar la pose. Los puntos van a más del doble entre sí. */
export const SPOT_REACH = 13;

const toward = (x: number, y: number, px: number, py: number) => Math.atan2(px - x, py - y);
const SOUTH = 0, EAST = Math.PI / 2, NORTH = Math.PI;

/** Fogata del Campamento y el aro por el que pasea Robot Tres (sus puntos caen sobre ese aro). */
export const FIRE = { x: 470, y: 800 };
export const FIRE_RING = { rx: 58, ry: 46 };
export const fireRing = (a: number) => ({ x: FIRE.x + Math.cos(a) * FIRE_RING.rx, y: FIRE.y + Math.sin(a) * FIRE_RING.ry });
/** Ángulos del aro donde uno se calienta; en el primero se detiene Robot Tres. */
export const FIRE_ANGLES = [2.2, 0.75, 3.75, 5.5];

/** Casitas de campaña: dónde van, de qué tono y hacia dónde mira su puerta. */
export const TENT_SPOTS = [
  { x: 352, y: 686, tone: "mint", rot: 0.5 },
  { x: 578, y: 868, tone: "lilac", rot: -1.1 },
] as const;
const tentDoor = (t: { x: number; y: number; rot: number }): Spot => ({ x: t.x + Math.sin(t.rot) * 48, y: t.y + Math.cos(t.rot) * 48, face: t.rot });

export const BENCH = { x: 310, y: 330 };
export const DANCE = { x: 560, y: 305 };
export const CAFE = { x: 1080, y: 348 };
export const HAMMOCK = { x: 1000, y: 280 };
export const SCOPE = { x: 1412, y: 500 };
export const DOCK_END = { x: 800, y: 878 };
/** Donde espera amarrado el barquito, atravesado en la punta del muelle; ahí se sube la gente. Caben cuatro. */
export const MOOR = { x: 800, y: 916 };
export const BOAT_SEATS = 4;
export const MEGAPHONE = { x: 694, y: 582 };
/** Paradas de los robots: caen exactamente sobre su ruta. */
export const BOT_STOPS = { uno: { x: 800, y: 553 }, dos: { x: 1080, y: 400 } };

export const THINGS: Thing[] = [
  {
    id: "bench", name: "Banca del Mural", x: BENCH.x, y: BENCH.y, h: 1.5, hit: 34, solid: 0, clear: 40,
    actions: [{ id: "sit", label: "Sentarse", done: "Te sentaste en la banca.", pose: "sit", mood: "zzz", sound: "act-sit",
      spots: [{ x: BENCH.x - 17, y: BENCH.y, face: SOUTH }, { x: BENCH.x + 17, y: BENCH.y, face: SOUTH }] }],
  },
  {
    id: "mural", name: "El Mural", x: 310, y: 258, h: 3, hit: 56, solid: 0, clear: 0,
    actions: [{ id: "look", label: "Mirar el mural", done: "Estás mirando el mural.", pose: "look", mood: "star", sound: "act-look",
      spots: [{ x: 262, y: 372, face: NORTH }, { x: 310, y: 380, face: NORTH }, { x: 358, y: 372, face: NORTH }] }],
  },
  {
    id: "fire", name: "Fogata", x: FIRE.x, y: FIRE.y, h: 1.5, hit: 30, solid: 22, clear: 80,
    actions: [
      { id: "warm", label: "Calentarse", done: "Te estás calentando junto a la fogata.", pose: "warm", mood: "flame", sound: "act-warm",
        spots: FIRE_ANGLES.map((a) => { const p = fireRing(a); return { ...p, face: toward(p.x, p.y, FIRE.x, FIRE.y) }; }) },
      { id: "rest", label: "Sentarse junto al fuego", done: "Te sentaste junto al fuego.", pose: "rest", mood: "zzz", sound: "act-sit",
        spots: [1.05, 1.62, 2.75].map((a) => { const p = { x: FIRE.x + Math.cos(a) * 96, y: FIRE.y + Math.sin(a) * 74 }; return { ...p, face: toward(p.x, p.y, FIRE.x, FIRE.y) }; }) },
    ],
  },
  ...TENT_SPOTS.map((t, i): Thing => ({
    id: `tent${i}`, name: "Casita de campaña", x: t.x, y: t.y, h: 1.9, hit: 36, solid: 28, clear: 46,
    actions: [{ id: "rest", label: "Descansar", done: "Estás descansando en la casita.", pose: "rest", mood: "zzz", sound: "act-sit", spots: [tentDoor(t)] }],
  })),
  {
    id: "boat", name: "Barquito", x: MOOR.x, y: MOOR.y, h: 1.6, hit: 34, solid: 0, clear: 0,
    actions: [{ id: "board", label: "Subirse al barquito", done: "Te subiste al barquito.", pose: "sit", mood: "wave", sound: "act-sit",
      spots: [{ x: MOOR.x - 30, y: MOOR.y, face: SOUTH }, { x: MOOR.x - 10, y: MOOR.y, face: SOUTH }, { x: MOOR.x + 10, y: MOOR.y, face: SOUTH }, { x: MOOR.x + 30, y: MOOR.y, face: SOUTH }] }],
  },
  {
    id: "dock", name: "Muelle", x: 800, y: 868, h: 1.3, hit: 30, solid: 0, clear: 0,
    actions: [{ id: "perch", label: "Sentarse a ver el mar", done: "Te sentaste en la orilla del muelle.", pose: "perch", mood: "wave", sound: "act-sit",
      spots: [{ x: DOCK_END.x - 14, y: DOCK_END.y, face: SOUTH }, { x: DOCK_END.x + 14, y: DOCK_END.y, face: SOUTH }] }],
  },
  {
    // Las porras se echan en la placita, frente al Foro; lo que se toca es el megáfono de un lado,
    // para que tocar el piso de la placita siga siendo «camina para acá».
    id: "forum", name: "Megáfono del Foro", x: MEGAPHONE.x, y: MEGAPHONE.y, h: 1.9, hit: 26, solid: 9, clear: 0,
    actions: [{ id: "cheer", label: "Echar porras", done: "Estás echando porras frente al Foro.", pose: "cheer", mood: "star", sound: "act-cheer",
      spots: [BOT_STOPS.uno, { x: 748, y: 570 }, { x: 852, y: 570 }, { x: 774, y: 596 }, { x: 826, y: 596 }].map((p) => ({ ...p, face: NORTH })) }],
  },
  {
    id: "dance", name: "Pista de baile", x: DANCE.x, y: DANCE.y, h: 1.9, hit: 60, solid: 0, clear: 86,
    actions: [{ id: "dance", label: "Bailar", done: "Estás bailando en la pista.", pose: "dance", mood: "note", sound: "act-dance",
      spots: [-1, 0, 1].flatMap((i) => [-1, 1].map((j) => ({ x: DANCE.x + i * 34, y: DANCE.y + j * 17, face: SOUTH }))) }],
  },
  {
    id: "cafe", name: "Puesto de café", x: CAFE.x, y: CAFE.y, h: 2.7, hit: 44, solid: 27, clear: 80,
    actions: [{ id: "drink", label: "Tomar café", done: "Te estás tomando un café.", pose: "drink", mood: "cup", sound: "act-drink",
      spots: [BOT_STOPS.dos, { x: 1042, y: 398 }, { x: 1118, y: 394 }].map((p) => ({ ...p, face: toward(p.x, p.y, CAFE.x, CAFE.y - 30) })) }],
  },
  {
    id: "hammock", name: "Hamaca", x: HAMMOCK.x, y: HAMMOCK.y, h: 1.9, hit: 46, solid: 0, clear: 70,
    actions: [{ id: "lie", label: "Echarse", done: "Te echaste en la hamaca.", pose: "lie", mood: "zzz", sound: "act-lie", spots: [{ x: HAMMOCK.x, y: HAMMOCK.y, face: EAST }] }],
  },
  {
    id: "scope", name: "Telescopio", x: SCOPE.x, y: SCOPE.y, h: 2, hit: 34, solid: 11, clear: 50,
    actions: [{ id: "peek", label: "Mirar por el telescopio", done: "Estás mirando por el telescopio.", pose: "peek", mood: "star", sound: "act-look", spots: [{ x: SCOPE.x - 26, y: SCOPE.y + 4, face: EAST }] }],
  },
];

export type PlacedSpot = Spot & { thing: Thing; action: Action; index: number };
/** Todos los puntos, ya con su cosa y su acción. */
export const SPOTS: PlacedSpot[] = THINGS.flatMap((thing) => thing.actions.flatMap((action) => action.spots.map((s, index) => ({ ...s, thing, action, index }))));

/** El punto sobre el que está parado alguien en (x, y), si hay uno. */
export function spotAt(x: number, y: number): PlacedSpot | null {
  let best: PlacedSpot | null = null, bd = SPOT_REACH * SPOT_REACH;
  for (const s of SPOTS) {
    const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
    if (d <= bd) { best = s; bd = d; }
  }
  return best;
}
