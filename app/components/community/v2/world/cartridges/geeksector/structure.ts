// GeekSector: la estructura (datos). La lee el motor en el navegador y el servidor para validar.
// Sólo datos y funciones puras: nada de DOM aquí.

import type { BotDef, Place, TableDef, WorldStructure } from "../../cartridge";

const WORLD_W = 1600;
const WORLD_H = 1000;

/** Cuatro asientos alrededor de una mesa. */
export function seatPos(table: { x: number; y: number }, k: number) {
  const a = -Math.PI * 0.75 + (k * Math.PI) / 2;
  return { x: table.x + Math.cos(a) * 66, y: table.y + Math.sin(a) * 66 };
}

/** Las mesas del hackatón: a qué se sienta uno ahí. Sentarse es estado compartido, sin audio. */
const TABLES: TableDef[] = [
  { x: 200, y: 810, topic: "Busco equipo" },
  { x: 400, y: 690, topic: "Estoy atorado" },
  { x: 600, y: 810, topic: "Muestra y cuenta" },
].map((t) => ({ ...t, seats: [0, 1, 2, 3].map((k) => seatPos(t, k)) }));

const PLACES: Place[] = [
  { id: "live", target: "call", kind: "station", x: 800, y: 390, r: 205, name: "Sala en vivo", short: "Sala en vivo", table: null, gravity: { pull: 110, radius: 370 } },
  { id: "wall", target: "wall", kind: "planet", x: 290, y: 250, r: 165, name: "Planeta Muro", short: "Muro", table: null, gravity: { pull: 140, radius: 340 } },
  { id: "recs", target: "recs", kind: "satellite", x: 1310, y: 230, r: 150, name: "Satélite Grabaciones", short: "Grabaciones", table: null, gravity: { pull: 80, radius: 290 } },
  { id: "courses", target: "courses", kind: "base", x: 1290, y: 760, r: 165, name: "Base Cursos", short: "Cursos", table: null, gravity: { pull: 110, radius: 330 } },
  ...TABLES.map((t, i): Place => ({ id: `t${i}`, target: "table", kind: "table", x: t.x, y: t.y, r: 122, name: `Mesa «${t.topic}»`, short: t.topic, table: i })),
];

// Robots de la casa. No son miembros y no cuentan en «N en el Mundo». Su ruta depende sólo del
// reloj, así todas las personas los ven en el mismo lugar sin pasar por el servidor.
const BOTS: BotDef[] = [
  { id: "bot:ghosty", name: "Ghosty", look: { model: "saucer", color: "mint", pilot: "ghosty" }, note: "Robot de la casa · cuida la Sala en vivo",
    at: (t) => ({ x: 800 + Math.cos(t * 0.2) * 178, y: 390 + Math.sin(t * 0.2) * 178 }) },
  { id: "bot:uno", name: "Robot Uno", look: { model: "pod", color: "blue", pilot: "robot" }, note: "Robot de la casa · le da vueltas al Planeta Muro",
    at: (t) => ({ x: 290 + Math.cos(-t * 0.17 + 2) * 150, y: 250 + Math.sin(-t * 0.17 + 2) * 132 }) },
  { id: "bot:dos", name: "Robot Dos", look: { model: "dart", color: "blue", pilot: "robot" }, note: "Robot de la casa · patrulla el lado este del mapa",
    at: (t) => ({ x: 1160 + Math.sin(t * 0.21) * 120, y: 500 + Math.sin(t * 0.105 + 1) * 190 }) },
];

export const structure: WorldStructure = {
  size: { w: WORLD_W, h: WORLD_H },
  spawn: { x: 800, y: 650 },
  places: PLACES,
  tables: TABLES,
  tableZone: { name: "Mesas del hackatón", entry: { x: 400, y: 560 }, x: 86, y: 578, w: 628, h: 372 },
  bots: BOTS,
  looks: {
    models: [
      { id: "rocket", name: "Cohete" },
      { id: "saucer", name: "Platillo" },
      { id: "pod", name: "Cápsula" },
      { id: "dart", name: "Flecha" },
    ],
    colors: [
      { id: "mint", name: "Menta" },
      { id: "green", name: "Verde" },
      { id: "amber", name: "Ámbar" },
      { id: "lilac", name: "Lila" },
      { id: "blue", name: "Azul" },
      // El rosa (`pink`) queda reservado para los enemigos: nadie los confunde con un miembro.
    ],
    // `avatar`: la foto del miembro va en la cabina (la foto sale del servidor, el cliente sólo manda la palabra).
    pilots: [
      { id: "avatar", name: "Mi avatar" },
      { id: "ghosty", name: "Ghosty" },
      { id: "astro", name: "Astronauta" },
      { id: "alien", name: "Alien" },
    ],
    initial: { model: "rocket", color: "mint", pilot: "ghosty" },
    fallback: { model: "rocket", color: "mint", pilot: "astro" },
  },
  // Vuelo libre con inercia: sin `constrain` ni `route`.
  // `gravity`: interruptor de la gravedad de los lugares (planeta, estación, satélite y base). 0 la apaga por completo.
  movement: { maxSpeed: 310, accel: 620, drag: 1.7, idleDrag: 2.6, seatSpeed: 220, margin: 28, targetMargin: 40, gravity: 1 },
  camera: { minScale: 0.75, minScaleNarrow: 0.66, maxScale: 1.5 },
  // Juego: aparatos espaciales que cambian tu disparo por unos tiros. A las personas sólo les hace cosquillas
  // (su nave tiembla); a los robots de la casa los tumban los aparatos: aguantan `bot.hp` golpes, estallan y
  // vuelven al rato en hipervelocidad. El disparo básico sólo les hace cosquillas (daño 0). Al servidor sólo
  // viajan el temblor (`nudge`) y el robot tumbado (`boom`).
  //
  // «Triple» (abanico de tres), «Rayo» (largo y rápido), «Onda» (aro que alcanza a las naves cercanas),
  // «Buscador» (da la vuelta hacia la nave más cercana), «Rebote» (rebota en las orillas del mapa) y
  // «Bomba» (lenta, revienta y alcanza a todo lo cercano). Sin aparato queda el disparo básico.
  combat: {
    basic: { shot: "basic", sound: "shoot" },
    shots: {
      basic: { speed: 640, life: 0.8, dmg: 0 },
      // Los tres del «Triple» se ven como el básico, pero sí quitan un golpe cada uno.
      triple: { speed: 640, life: 0.8, dmg: 1 },
      ray: { speed: 1300, life: 0.8, dmg: 3 },
      seeker: { speed: 430, life: 1.7, dmg: 2, seek: { radius: 460, turn: 4.2 } },
      bounce: { speed: 600, life: 2.4, dmg: 2, bounces: 3, selfHit: true },
      bomb: { speed: 300, life: 0.9, dmg: 3, blast: { radius: 120, self: 3 } },
    },
    weapons: [
      { id: "triple", name: "Triple", uses: 6, sound: "shootTriple", shot: "triple", spread: [-0.2, 0, 0.2] },
      { id: "ray", name: "Rayo", uses: 5, sound: "shootRay", shot: "ray" },
      { id: "wave", name: "Onda", uses: 4, sound: "shootWave", pulse: { radius: 175, dur: 0.4, dmg: 2 } },
      { id: "seeker", name: "Buscador", uses: 5, sound: "shootSeeker", shot: "seeker" },
      { id: "bounce", name: "Rebote", uses: 6, sound: "shootBounce", shot: "bounce" },
      { id: "bomb", name: "Bomba", uses: 3, sound: "shootBomb", shot: "bomb" },
    ],
    shotEvery: 0.28,
    hitRadius: 26,
    // Pocos aparatos a la vez en todo el mapa. Los seis se turnan despacio: el que nadie recoge cambia por el siguiente cada `swap` s.
    pickups: { count: 3, reach: 34, back: 20, backExtra: 10, swap: 40, margin: 80, clear: 220, fallback: { x: 1000, y: 120 } },
    bot: { hp: 3, heal: 8, back: 20, warp: 0.55 },
  },
  // Los enemigos: el Alien y el Astronauta se alternan. Cada tres minutos uno avisa 3 s, llega en
  // hipervelocidad, ronda el mapa 40 s y se va. Su ruta sale del número de ciclo, así todos lo ven en el
  // mismo lugar. Disparan lento (más lento que cualquier nave) y sólo a quien vuela libre: en un lugar o
  // sentado en una mesa nadie te alcanza. Los dos tiran lo mismo por minuto, cada quien a su manera:
  // el Alien va en zigzag y suelta ráfagas de dos; el Astronauta va derecho y tira menos, más rápido (quieto bajo su fuego toda la visita apenas llegas a 10 golpes).
  // Tu nave aguanta 10 golpes: para ser destruido hay que quedarse bajo fuego unos 22 s seguidos.
  threat: {
    id: "enemy",
    name: "Enemigo",
    look: { model: "manta", color: "pink", pilot: "alien" },
    every: 180,
    warn: 3,
    stay: 40,
    at: (cycle, t) => {
      const a = (cycle * 2.399963) % (Math.PI * 2), b = (cycle * 1.618034) % (Math.PI * 2);
      return { x: 800 + Math.cos(t * 0.21 + a) * 560, y: 520 + Math.sin(t * 0.34 + b) * 330 };
    },
    hp: 6,
    shot: { speed: 240, life: 2.2, every: 2.2, range: 430 },
    // Defenderse pide un aparato: el disparo básico (daño 0) sólo les hace cosquillas. `false` regresa a
    // «cualquier disparo les quita un golpe». Con `true`, `supply` evita la mala suerte: en el aviso aparece
    // un aparato cerca de quien no trae y durante la visita flotan 5 y reaparecen en 8 s.
    needsWeapon: true,
    supply: { count: 5, back: 8, near: [150, 250] },
    variants: [
      {
        name: "Alien",
        look: { model: "manta", color: "pink", pilot: "alien" },
        // La misma ronda, con un zigzag encima.
        at: (cycle, t) => {
          const a = (cycle * 2.399963) % (Math.PI * 2), b = (cycle * 1.618034) % (Math.PI * 2);
          return { x: 800 + Math.cos(t * 0.21 + a) * 520 + Math.sin(t * 2.3) * 46, y: 520 + Math.sin(t * 0.34 + b) * 300 + Math.cos(t * 2.9) * 46 };
        },
        shot: { every: 4.4, burst: 2, gap: 0.35 },
      },
      {
        name: "Astronauta",
        look: { model: "lancer", color: "pink", pilot: "astro" },
        // Cruza el mapa en línea recta, de orilla a orilla, ida y vuelta; el ciclo decide la inclinación.
        at: (cycle, t) => {
          const tilt = ((cycle * 0.754877) % 1) * Math.PI, u = 1 - Math.abs(((t / 20) % 2) - 1), k = u * 2 - 1;
          return { x: 800 + Math.cos(tilt) * 600 * k, y: 520 + Math.sin(tilt) * 360 * k };
        },
        shot: { speed: 330, life: 1.6, every: 3.8, range: 380 },
      },
    ],
    player: { hp: 10, heal: 6, back: 6, shield: 2 },
  },
};
