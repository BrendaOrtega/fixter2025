// Contrato del «Mundo» del club. Los mundos son intercambiables, como cartuchos: el mismo motor,
// distinto mundo. Manual: docs/club-rediseno/MUNDO-CARTUCHOS.md.
//
//   motor      reglas: movimiento, cámara lógica, presencia, disparos, cercanía (`engine.ts` + servidor).
//   cartucho   un mundo completo: su estructura + su skin (`cartridges/<id>/`).
//   estructura datos: tamaño, lugares y a qué llevan, mesas, robots y rutas, armas, aparición.
//   skin       cómo se ve y suena: renderizador (canvas 2D, three.js…), efectos y sonidos.
//
// ⚠️ Este archivo sólo trae tipos (y dos constantes) y el servidor lo importa: nada de DOM en tiempo de módulo.
// La ESTRUCTURA también la lee el servidor (valida contra ella): debe ser datos y funciones puras.

export type Point = { x: number; y: number };

// ───────── Estructura ─────────

/** Aspecto que elige cada persona. Viaja al servidor como `ship`, `color` y `pilot` (protocolo de siempre). */
export type Look = { model: string; color: string; pilot: string };
export type LookOption = { id: string; name: string };

/** A qué lleva un lugar dentro del club. `table`: una mesa donde uno se sienta (estado compartido, sin audio). */
export type PlaceTarget = "call" | "wall" | "recs" | "courses" | "table";

export type Place = {
  id: string;
  target: PlaceTarget;
  /** Pista libre para la skin (qué dibujo le toca): el motor no la interpreta. */
  kind: string;
  x: number;
  y: number;
  /** Radio de cercanía: adentro, el lugar se ofrece en la franja de abajo. */
  r: number;
  name: string;
  short: string;
  /** Índice en `tables` si es una mesa; `null` si no. */
  table: number | null;
  /**
   * Gravedad sutil: curva tu trayectoria al pasar cerca. `pull`: aceleración máxima (unidades/s²; el
   * motor la topa al 25 % de `movement.accel`). `radius`: hasta dónde llega, medido desde el centro
   * (debe ser mayor que `r`). Es cero dentro de `r`, en la orilla de `radius` y cuando vas despacio.
   * Sólo cuenta si `movement.gravity` es mayor que cero.
   */
  gravity?: { pull: number; radius: number };
};

export type TableDef = {
  x: number;
  y: number;
  topic: string;
  /** Asientos en coordenadas del mapa. Cuántos caben en la mesa = `seats.length` (el servidor lo respeta). */
  seats: Point[];
};

/** Robot de la casa: no es miembro ni cuenta en «N en el Mundo». Su ruta depende sólo del reloj (segundos Unix). */
export type BotDef = { id: string; name: string; look: Look; note: string; at: (t: number) => Point };

export type Movement = {
  /** Velocidad tope, aceleración con teclas/joystick y frenado (1/s) con y sin entrada. */
  maxSpeed: number;
  accel: number;
  drag: number;
  idleDrag: number;
  /** Velocidad al acomodarse en un asiento. */
  seatSpeed: number;
  /** Margen contra las orillas del mapa: para moverse y para elegir destino con un toque. */
  margin: number;
  targetMargin: number;
  /**
   * Interruptor de la gravedad de los lugares (`Place.gravity`): multiplica su fuerza. `0` o sin el
   * campo: apagada por completo. Sólo te afecta a ti (no a los disparos ni a las naves de los demás) y
   * nunca en «Tranquilo», con movimiento reducido, sentado, en pantalla angosta o táctil.
   */
  gravity?: number;
  /**
   * Restricción de movimiento. Recibe la posición a la que el motor quiere mover a alguien y de dónde
   * viene; regresa la posición permitida (p. ej. el punto más cercano sobre un camino o dentro de la
   * isla). Sin esto el movimiento es libre y sólo lo acotan las orillas. Se aplica a todos (tú, las
   * demás personas) en cada cuadro: debe ser barata y pura. `hidden`: ids de los lugares que hoy no
   * existen (los que no llevan a nada), por si su edificio estorbaba el paso.
   */
  /** `self` es `true` cuando quien se mueve es tu personaje (las demás personas se mueven solas entre lecturas). */
  constrain?: (next: Point, prev: Point, hidden?: ReadonlySet<string>, self?: boolean) => Point;
  /**
   * Ruta para ir de `from` a `to` con un toque: puntos intermedios en orden, terminando en el destino
   * (que puede corregirse al punto permitido más cercano). Sin esto se va en línea recta.
   */
  route?: (from: Point, to: Point, hidden?: ReadonlySet<string>) => Point[];
  /**
   * Los robots de la casa siguen una ruta que sale del reloj. Si el cartucho quiere que no se
   * encimen ni atraviesen a nadie, aquí dice a dónde se hace a un lado un robot que iría en `at`
   * dados los cuerpos que tienen preferencia (`bodies`: personas y robots ya acomodados). Regresa
   * `at` si nadie estorba. `heading`: hacia dónde camina (vector unitario), o `null` si está quieto.
   * Sin esto los robots van exactos sobre su ruta (naves que se cruzan).
   */
  giveWay?: (at: Point, bodies: Point[], heading: Point | null) => Point;
  /** Turbo (Shift): multiplica la velocidad tope mientras se mantiene. Sin el campo no hay turbo. */
  boost?: number;
  /** Controlador `steer` (lo pide la skin con `renderer.camera()`): radianes por segundo que gira el rumbo. */
  steer?: { turn: number };
};

/** Un proyectil. `seek`: gira hacia quien tenga cerca. `bounces`: rebotes en las orillas. `blast`: revienta y alcanza a todo lo cercano. */
export type ShotDef = {
  speed: number;
  life: number;
  dmg: number;
  seek?: { radius: number; turn: number };
  bounces?: number;
  /** Tras su primer rebote también le pega a quien lo disparó (1 golpe de `threat.player.hp`). Pide `bounces` y `threat`. */
  selfHit?: boolean;
  /** `self`: golpes que el estallido le quita a quien lo disparó si queda dentro del radio (pide `threat`). */
  blast?: { radius: number; self?: number };
};

/** Aparato que cambia tu disparo por `uses` tiros: lanza proyectiles (`shot`, en abanico si hay `spread`) o un aro (`pulse`). */
export type WeaponDef = { id: string; name: string; uses: number; sound: string } & (
  | { shot: string; spread?: number[] }
  | { pulse: { radius: number; dur: number; dmg: number } }
);

/** El juego de disparos. Un cartucho sin juego pone `combat: null`: no hay disparo, aparatos ni robots tumbados. */
export type Combat = {
  /** Disparo sin aparato: id en `shots` y su sonido. */
  basic: { shot: string; sound: string };
  shots: Record<string, ShotDef>;
  /** En el orden en que se turnan en el mapa. */
  weapons: WeaponDef[];
  /** Segundos entre disparos y qué tan cerca debe pasar un proyectil para tocar a alguien. */
  shotEvery: number;
  hitRadius: number;
  pickups: {
    count: number;
    reach: number;
    /** Segundos para reaparecer tras recogerlo (`back` + hasta `backExtra` al azar) y para turnarse si nadie lo toma. */
    back: number;
    backExtra: number;
    swap: number;
    /** Aparición: margen contra las orillas, distancia mínima a ti y punto de respaldo. Nunca dentro de un lugar. */
    margin: number;
    clear: number;
    fallback: Point;
  };
  /** Robots: golpes que aguantan, segundos sin golpes para recuperarse, segundos fuera del mapa y lo que dura su llegada. */
  bot: { hp: number; heal: number; back: number; warp: number };
};

/**
 * Amenaza: una nave enemiga que llega de vez en cuando y sí puede destruir a las personas (luego
 * reaparecen). Su calendario depende sólo del reloj, así todos la ven a la vez sin servidor: cada
 * `every` s empieza un ciclo; avisa `warn` s, se queda `stay` s y se va. Sólo ataca a quien anda
 * libre: sentado en una mesa o dentro de un lugar nadie te apunta ni te daña. En «Tranquilo» y en
 * el mapa reducido no existe. Requiere `combat`. Un cartucho sin amenaza omite el campo.
 */
/**
 * Disparo de la amenaza. `burst`/`gap`: tiros por ráfaga y segundos entre ellos (sin `burst`, de uno en uno).
 * `lead` (0 a 1): cuánto anticipa tu movimiento al apuntar; 0 dispara a donde estás, 1 a donde vas a estar.
 */
export type ThreatShot = { speed: number; life: number; every: number; range: number; burst?: number; gap?: number; lead?: number };
/** Un personaje de la amenaza: nombre, nave y, si quiere, su propia ruta y su manera de disparar. */
export type ThreatVariant = { name: string; look: Look; at?: (cycle: number, t: number) => Point; shot?: Partial<ThreatShot> };
export type Threat = {
  /** Prefijo del id compartido: cuando alguien la derriba viaja como `${id}:${ciclo}` por el mismo canal que los robots tumbados. */
  id: string;
  name: string;
  look: Look;
  every: number;
  warn: number;
  stay: number;
  /** Ruta de su visita: número de ciclo y segundos desde que llegó. */
  at: (cycle: number, t: number) => Point;
  /** Golpes que aguanta (cualquier disparo le quita al menos uno). */
  hp: number;
  /** Su disparo: lento y esquivable. `every`: segundos entre disparos; `range`: hasta dónde te alcanza a ver. */
  shot: ThreatShot;
  /** Al ser destruida suelta una vida: dura `stay` s y, al recogerla, tu nave recupera todos sus golpes (`text` es lo que dice la burbuja). */
  life?: { stay: number; text: string };
  /**
   * Defenderse pide un aparato: un disparo con `dmg: 0` (el básico) sólo lo hace temblar. En `false` (o sin
   * el campo), cualquier disparo le quita al menos un golpe.
   */
  needsWeapon?: boolean;
  /**
   * Con `needsWeapon`, para que nadie quede indefenso: durante el aviso aparece un aparato a entre
   * `near[0]` y `near[1]` unidades de quien no traiga uno, y mientras dura la visita flotan `count`
   * aparatos y reaparecen en `back` segundos (en vez de `combat.pickups.count`/`back`).
   */
  supply?: { count: number; back: number; near: [number, number] };
  /** Personajes que se alternan por ciclo (`variants[ciclo % n]`): todos ven al mismo. Lo que no traigan sale de arriba. */
  variants?: ThreatVariant[];
  /** Tú: golpes que aguantas, segundos sin golpes para recuperarte, segundos fuera al ser destruido y de escudo al reaparecer. */
  player: { hp: number; heal: number; back: number; shield: number };
};

export type WorldStructure = {
  size: { w: number; h: number };
  /** Dónde aparece quien entra. */
  spawn: Point;
  places: Place[];
  tables: TableDef[];
  /** La zona de las mesas: su nombre en las listas y a dónde se llega al elegirla desde la lista del teléfono. */
  tableZone: { name: string; entry: Point; x: number; y: number; w: number; h: number } | null;
  bots: BotDef[];
  looks: {
    models: LookOption[];
    colors: LookOption[];
    pilots: LookOption[];
    /** Con qué arranca alguien nuevo, y qué se usa cuando llega un valor que no está en las listas. */
    initial: Look;
    fallback: Look;
  };
  movement: Movement;
  /** Cámara lógica 2D del motor: zoom mínimo (pantalla ancha y angosta) y máximo. Un renderizador 3D puede ignorarla. */
  camera: { minScale: number; minScaleNarrow: number; maxScale: number };
  combat: Combat | null;
  threat?: Threat | null;
  /** Llaves del estado compartido que acepta el servidor para este mundo (ver `GameMode`). Sin esto, ninguna. */
  shared?: Record<string, SharedKey>;
  /** Áreas fijas del mundo (como el Area2D de Godot): al entrar o salir tu personaje, el modo recibe una señal. */
  areas?: Area[];
  /**
   * Progreso de cada miembro que se guarda en la base (estrellas de por vida, carreras, logros…). Cada
   * cartucho declara sus contadores y cómo se mezclan: `sum` suma lo que llega (a lo más `max` por
   * guardado), `max`/`min` se queda con el mejor. Sin esto, el mundo no guarda nada.
   */
  progress?: Record<string, ProgressKey>;
};

// ───────── Áreas (Area2D) ─────────

/** Forma de un área, en unidades del mapa. */
export type Shape = { kind: "circle"; x: number; y: number; r: number } | { kind: "rect"; x: number; y: number; w: number; h: number };
/**
 * Un área: forma, id y etiquetas. Etiqueta que el motor entiende: `safe` (adentro nadie te daña, como en un
 * lugar). Las demás son libres para el modo. Sólo tu personaje dispara sus señales.
 */
export type Area = { id: string; shape: Shape; tags?: string[] };
export const inShape = (s: Shape, x: number, y: number) =>
  s.kind === "circle" ? Math.hypot(x - s.x, y - s.y) <= s.r : x >= s.x && y >= s.y && x <= s.x + s.w && y <= s.y + s.h;

// ───────── Modo de juego (opcional): reglas propias del cartucho ─────────

/** Tope de llaves declaradas y de caracteres de un texto compartido. */
export const SHARED_MAX_KEYS = 16;
export const SHARED_MAX_TEXT = 80;
/**
 * Una llave del estado compartido: número entero entre `min` y `max`, texto corto (hasta `max`
 * caracteres, tope `SHARED_MAX_TEXT`) o el id de un miembro presente en el Mundo.
 */
export type SharedKey = { type: "number"; min: number; max: number; merge?: SharedMerge } | { type: "text"; max: number } | { type: "member" };
/**
 * Regla de mezcla de un número (la decide el servidor, como la autoridad de Godot): `set` (default) gana el
 * último que escribe; `max`/`min` sólo acepta un valor que supere al actual. Si un cambio de varias llaves
 * (`commit`) trae una llave `max`/`min` que no gana, se rechaza completo: así `leader` sólo se escribe si
 * `best` ganó.
 */
export type SharedMerge = "set" | "max" | "min";
export type SharedValue = number | string;
/** Diccionario chico por comunidad, en memoria del servidor. Se borra al cambiar de cartucho. */
export type SharedState = Readonly<Record<string, SharedValue>>;
/** Letrero del modo: lo pinta el club en un lugar fijo y discreto. `null`: sin letrero. */
export type ProgressKey = { merge: "sum" | "max" | "min"; max: number };
/** Lo guardado de un miembro en este cartucho: contadores y misiones terminadas. */
export type Progress = { stats: Record<string, number>; quests: string[] };
export const PROGRESS_MAX_QUESTS = 64;
export const QUEST_ID = /^[a-z0-9][a-z0-9:-]{0,39}$/;
/** Objetivo que el motor señala con un marcador y, si no se ve, con una flecha al borde (en cualquier piel). */
export type Objective = { x: number; y: number; label: string };
export type ModeHud = { title: string; lines: string[] } | null;
/** Lo que el modo puede leer y hacer en un cuadro. Sin DOM ni red: todo pasa por el motor. */
export type ModeContext = {
  /** Reloj del mundo en segundos Unix (el mismo de las rutas de los robots). */
  now: number;
  /** Tu id de miembro (el que se guarda en una llave `member`). */
  meId: string;
  player: Entity;
  others: Entity[];
  /** Lugares visibles hoy y el que tienes cerca. */
  places: Place[];
  nearPlace: Place | null;
  /** Último estado compartido que entregó el servidor (llega con el sondeo, cada ~2.5 s). */
  shared: SharedState;
  /** Suena una receta del banco de la skin. */
  sound(name: string): void;
  /** Burbuja breve sobre alguien. */
  bubble(entity: Entity, text: string): void;
  /** Fija el letrero. Llamarlo cada cuadro con lo mismo no cuesta. */
  hud(hud: ModeHud): void;
  /** Propone un valor para una llave declarada (`null` la borra). Atajo de `commit({ [key]: value })`. */
  propose(key: string, value: SharedValue | null): void;
  /**
   * Propone varias llaves en un solo cambio atómico: el servidor las acepta todas o ninguna (con su regla
   * `merge`). El motor no reenvía el mismo cambio mientras uno igual va en camino, así que llamarlo cada
   * cuadro no cuesta. Lo aceptado vuelve en `shared` y como señal `shared-changed`.
   */
  commit(changes: Record<string, SharedValue | null>): void;
  /** Registra (o con `null` quita) un área propia del modo, p. ej. una estrella. Mismo trato que `structure.areas`. */
  area(id: string, shape: Shape | null, tags?: string[]): void;
  /** Señala a dónde ir (`null` lo quita). Lo pinta el motor encima de la piel, igual en todas. */
  objective(o: Objective | null): void;
  /** Tu progreso guardado en este cartucho; `null` mientras carga (llega la señal `progress-loaded`). */
  progress: Progress | null;
  /** Guarda progreso: contadores (según su `merge`) y misiones terminadas. El motor junta y manda por lotes. */
  save(stats: Record<string, number>, quests?: string[]): void;
};
/** Algo que pasó y le interesa al modo (las señales de Godot): así no tiene que revisar todo cada cuadro. */
export type ModeSignal =
  | { type: "place-entered" | "place-exited"; place: Place }
  | { type: "area-entered" | "area-exited"; area: Area }
  /** Un saludo que viste pasar (de ti, a ti o entre otras dos personas). */
  | { type: "wave"; from: Entity; to: Entity }
  | { type: "shared-changed"; key: string; value: SharedValue | null }
  /** Clic derecho (o Espacio) en un mundo sin `combat`: la acción la decide el modo. `at`: a dónde apuntó, si fue con el mouse. */
  | { type: "action"; at: Point | null }
  /** Ya llegó tu progreso guardado (`ctx.progress`). */
  | { type: "progress-loaded" };
/** Reglas propias de un cartucho. El motor llama `update` cada cuadro (no en el mapa reducido) y `on` con cada señal. */
export type GameMode = { update(ctx: ModeContext, dt: number): void; on?(signal: ModeSignal, ctx: ModeContext): void };

// ───────── Estado que el motor entrega a la skin ─────────

/** Cara de un miembro (su foto, o iniciales sobre su tono si no carga). */
export type Face = { img: HTMLImageElement | null; initials: string; bg: string; fg: string };

/** Alguien en el mapa: tú (`me`), otra persona (`human`) o un robot de la casa (`bot`). Sólo lectura para la skin. */
export type Entity = {
  id: string;
  kind: "me" | "human" | "bot";
  name: string;
  first: string;
  photoURL: string | null;
  note: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rumbo en radianes (0 = +x) y fracción de la velocidad tope (0–1). */
  ang: number;
  thrust: number;
  model: string;
  color: string;
  pilot: string;
  tx: number | null;
  ty: number | null;
  table: number | null;
  seat: number | null;
  /** Fase propia para mecerse, distinta en cada quien. */
  bob: number;
  waveT: number;
  face: Face | null;
  /** Segundos de temblor que le quedan (cosquilla de un disparo); dura `SHAKE` del motor. */
  shakeT: number;
  /** Sólo robots: golpes que le quedan, segundos para recuperarlos, segundos fuera del mapa y segundos de llegada. */
  hp: number;
  healT: number;
  downT: number;
  warpT: number;
  /** Con amenaza: segundos de escudo que le quedan a quien acaba de reaparecer, y segundos de salida de quien se va. */
  shieldT: number;
  leaveT: number;
};

export type Pickup = { kind: string; x: number; y: number; ph: number; alive: boolean; back: number; age: number };
export type Shot = { kind: string; x: number; y: number; vx: number; vy: number; t: number; life: number; dmg: number; bounces: number };
/** Texto sobre alguien (saludo, mensaje del chat, aparato recogido). `t` avanza hasta `dur`. */
export type Bubble = { entity: Entity; text: string; t: number; dur: number; say?: boolean };

/**
 * Cámara lógica 2D: `vw`×`vh` es el escenario en pixeles CSS; un punto del mapa cae en
 * `(x - camx) * scale + ox`. En `mini` el mapa completo queda a la vista.
 */
export type View = { vw: number; vh: number; scale: number; camx: number; camy: number; ox: number; oy: number };

/** Todo lo que hay que pintar en un cuadro. El motor reutiliza el objeto: no lo guardes ni lo modifiques. */
export type WorldFrame = {
  /** Reloj de animación en segundos (se detiene en «Tranquilo») y lo que avanzó desde el cuadro anterior. */
  t: number;
  dt: number;
  /** Mapa reducido (teléfono sin expandir) y modo «Tranquilo» (sin animación ni juego). */
  mini: boolean;
  quiet: boolean;
  view: View;
  /** Tu id de miembro (el de `player` es "me"). */
  meId?: string;
  player: Entity;
  /** Las demás personas y los robots presentes (un robot tumbado no está). */
  others: Entity[];
  /** Los lugares que hoy existen (los que no llevan a nada se ocultan). */
  places: Place[];
  /**
   * Estado vivo de un lugar, por id: `on` (p. ej. la sala abierta) y un subtítulo. Un lugar que lleva a
   * la llamada trae además cuándo empieza y termina su evento (segundos Unix), para los rituales de la skin.
   */
  placeStatus: Record<string, { on: boolean; sub: string; startsAt?: number; endsAt?: number }>;
  /** Cuántas personas hay sentadas en cada mesa. */
  tableCounts: number[];
  nearPlace: Place | null;
  nearEntity: Entity | null;
  /** A dónde vas (toque en el mapa). */
  marker: { x: number; y: number; t: number } | null;
  bubbles: Bubble[];
  pickups: Pickup[];
  /** Vidas que soltó la amenaza al ser destruida (mismo tipo que un aparato, `kind: "life"`). */
  lives?: Pickup[];
  shots: Shot[];
  /** La amenaza, si anda cerca: `warn` (viene en camino, todavía no está), `here` o `leaving`. Y sus disparos. */
  threat: { entity: Entity; phase: "warn" | "here" | "leaving" } | null;
  hostile: Shot[];
};

/** Algo que acaba de pasar y merece un efecto. La skin decide cómo se ve; puede ignorar lo que no use. */
export type WorldEvent =
  /** Aro de un aparato de tipo `pulse`. */
  | { type: "pulse"; x: number; y: number; r: number; dur: number }
  /** Un proyectil con `blast` reventó. */
  | { type: "blast"; x: number; y: number; r: number; shot: string }
  /** Una nave fue tumbada / acaba de volver: un robot y, con amenaza, también una persona, tú o la enemiga. */
  | { type: "bot-down"; entity: Entity; big?: boolean }
  | { type: "bot-back"; entity: Entity }
  /** Cosquilla: un disparo tocó a alguien. */
  | { type: "tickle"; entity: Entity; kind?: "bonk" }
  /** Un aparato fue recogido (`taken`) o le tocó turno al siguiente. */
  | { type: "pickup"; x: number; y: number; taken: boolean }
  /** Alguien recibió un saludo. */
  | { type: "greet"; entity: Entity }
  /** Entró el modo «Tranquilo»: se apagan todos los efectos. */
  | { type: "calm" };

// ───────── Skin ─────────

export type WorldRenderer = {
  /** Cambió el tamaño del escenario (o el modo `mini`). Aquí se ajusta el lienzo. */
  resize(view: View, mini: boolean): void;
  /** Pinta un cuadro: fondo, lugares, gente, juego, efectos y etiquetas. */
  render(frame: WorldFrame): void;
  event?(event: WorldEvent): void;
  /**
   * Proyección propia (obligatoria si no pintas con la cámara lógica 2D, p. ej. en 3D): del mapa a
   * pixeles CSS del escenario y de regreso (`null` si el toque no cae sobre el mapa). El motor las
   * usa para los toques, el clic derecho y para saber si algo está a la vista.
   */
  toScreen?(x: number, y: number): Point;
  toWorld?(sx: number, sy: number): Point | null;
  /**
   * Cámara y controles, cuadro a cuadro (ver `controllers.ts`): `direct` mueve hacia donde apunta la
   * entrada, girada por `yaw` (rad; 0 = arriba es el norte del mapa); `steer` es de tanque (izquierda y
   * derecha giran, arriba avanza). Sin el método: `direct` con yaw 0, el control de siempre.
   */
  camera?(): { controls: "direct" | "steer"; yaw: number };
  destroy(): void;
};

/** Receta de un sonido: recibe las herramientas del motor de audio (`sound.ts`). */
export type SoundKit = {
  tone: (o: { type: OscillatorType; from: number; to?: number; at?: number; dur: number; gain: number }) => void;
  whoosh: (dur: number, gain: number, from?: number, to?: number) => void;
  /** Para lo que no se pueda con `tone`/`whoosh`: el contexto, el nodo de salida y la desafinación del turno (cents). */
  ctx: AudioContext;
  dest: AudioNode;
  cents: number;
};
/** Sonidos por nombre. Los que pide el motor están en `MOTOR_SOUNDS`; un nombre sin receta queda en silencio. */
export type SoundBank = Record<string, (kit: SoundKit) => void>;

/** Regla del motor que la skin necesita para animar: segundos que dura el temblor de una cosquilla (`Entity.shakeT`). */
export const SHAKE = 0.25;

/** Nombres de sonido que emiten el motor y la interfaz (además del `sound` de cada aparato y de `combat.basic.sound`). */
export const MOTOR_SOUNDS = [
  "thrust", "arrive", "sit", "stand", "waveOut", "waveIn", "msg", "nudge", "pick", "expand", "collapse", "pickup", "blast", "boom", "warp",
  // Sólo con amenaza: aviso de que viene, su disparo y un golpe a tu nave.
  "alarm", "enemyShot", "hit",
] as const;

export type WorldSkin = {
  /**
   * Crea el renderizador sobre el `<canvas>` del escenario (pide tú el contexto: `2d` o WebGL). Puedes
   * agregar elementos propios dentro de `stage` (p. ej. una capa para etiquetas) si los quitas en `destroy`.
   */
  createRenderer(opts: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure; motor?: MotorHooks; state?: unknown }): WorldRenderer;
  sounds: SoundBank;
  /** Selector de aspecto: dibuja la opción `id` de modelo o piloto en un canvas 2D de 56×40 (ya escalado). */
  drawOption?(ctx: CanvasRenderingContext2D, slot: "model" | "pilot", id: string, look: Look, face: Face | null): void;
  /** Color CSS de una opción de `looks.colors`, para su botón en el selector. */
  swatch?(colorId: string): string;
};

/**
 * Lo que una skin con interfaz propia (menús sobre objetos o personas) le puede pedir al motor.
 * `walkTo`: ir a un punto del mapa, como un toque (usa `movement.route`). `greet`: el saludo compartido a
 * una persona o robot. `sound`: una receta del banco de la skin, con el volumen y silencio del usuario.
 */
/** `nudge`: la cosquilla compartida (la misma del disparo de GeekSector): esa persona tiembla en todas las pantallas. Con `kind: "bonk"` es un golpe con un objeto. */
export type MotorHooks = { walkTo(p: Point): void; greet(entityId: string): void; sound(name: string): void; nudge(entityId: string, kind?: "bonk"): void };

// ───────── Cartucho ─────────

/** Textos que cambian con el tema del mundo (nave, piloto, volar…). */
export type WorldCopy = {
  /** «Preparando tu nave…» mientras carga. */
  loading: string;
  /** Botón y título del selector de aspecto, y sus tres secciones. */
  lookButton: string;
  lookTitle: string;
  lookLabel: string;
  modelLabel: string;
  colorLabel: string;
  pilotLabel: string;
  /** Conteo en la lista del teléfono: «1 nave» / «3 naves». */
  count: (n: number) => string;
  /** Dónde anda alguien que no está en ningún lugar: «volando por el club». */
  roaming: string;
  /** Pistas de la franja de abajo: la corta siempre, la de teclado sólo en pantalla ancha, la del mapa reducido en teléfono. */
  hint: string;
  hintKeys: string;
  hintMini: string;
  expandMini: string;
  /** Descripción accesible del mapa. */
  mapLabel: string;
  /** Disparo (sólo con `combat`): sin aparato, tiros restantes y la pista con mouse. */
  basicWeapon: string;
  uses: (n: number) => string;
  shootHint: string;
  /** Botón de acción en el celular para mundos sin `combat` (lo que hace lo decide el modo con la señal `action`). */
  action?: { label: string; sub?: string };
  /** Sólo con amenaza: el aviso, la pista mientras anda cerca y la tarjeta de «te destruyeron» con su cuenta. */
  /** `arm`: qué hacer si no traes aparato (va tras el aviso). `unarmed`: pista de escritorio sin aparato y con enemigo. Sólo con `needsWeapon`. */
  threat?: { arm?: string; unarmed?: string; warning: (name: string) => string; advice: string; near: (name: string) => string; destroyed: string; back: (seconds: number) => string };
};

export type Cartridge = {
  /** Id estable: se guarda en la comunidad y viaja en el sondeo. Minúsculas, sin espacios. */
  id: string;
  name: string;
  /** Una línea para el administrador del club. */
  description: string;
  structure: WorldStructure;
  copy: WorldCopy;
  /** Primer pintado, antes de que cargue la skin (también en el HTML del servidor): CSS de fondo del escenario. */
  poster: { backgroundColor: string; backgroundImage?: string };
  /** La skin se carga aparte (`() => import("./skin")`): un renderizador pesado no le cuesta a los demás mundos. */
  loadSkin: () => Promise<WorldSkin>;
  /**
   * Estado del cartucho por montaje (el autoload de Godot, con alcance): el motor lo crea una vez al montar
   * y se lo pasa al modo y a la skin (`createRenderer({ state })`). Nada de estado en variables de módulo:
   * sobreviviría a cambiar de mundo y volver, y el servidor importa la estructura.
   */
  createState?: () => unknown;
  /** Modo de juego: se crea uno por montaje con el estado de `createState`. Sin esto, el mundo no trae reglas propias. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada cartucho tipa su propio estado
  mode?: (state: any) => GameMode;
};
