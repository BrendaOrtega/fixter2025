// Motor del «Mundo» del club: guarda el estado (tú, las demás personas, robots, proyectiles) y aplica
// las reglas (movimiento, cámara lógica, cercanía, disparos). No tiene contenido propio: el mundo lo
// pone un cartucho (`cartridge.ts`) y lo pinta su skin. Sólo corre en el navegador (se crea dentro de
// un `useEffect`); React pone encima los controles y las tarjetas.
// Manual: docs/club-rediseno/MUNDO-CARTUCHOS.md.

import { SHAKE, type Bubble, type Cartridge, type Entity, type Face, type GameMode, type Look, type ModeContext, type ModeHud, type Pickup, type Place, type PlaceTarget, type Point, type SharedState, type SharedValue, type Shot, type View, type WorldEvent, type WorldFrame, type WorldSkin } from "./cartridge";

// Mismos seis tonos y mismo reparto que `Avatar` (v2/ui.tsx).
const FACE_TONES = [["#17302C", "#85DDCB"], ["#33291A", "#F2C98A"], ["#26233F", "#BDB5F7"], ["#3A2020", "#F4AFAF"], ["#1A2B3D", "#9CC8F2"], ["#22331A", "#8DCF6E"]];
/** Cara de un miembro para quien la pinte: su foto, o sus iniciales sobre su tono si no carga. */
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

/** Nave de otra persona, tal como la entrega el servidor. */
export type RemoteShip = {
  id: string; name: string; photoURL: string; x: number; y: number; tx: number; ty: number;
  ship: string; color: string; pilot: string; table: number | null; seat: number | null;
  /** La amenaza destruyó su nave: no está en el mapa hasta que reaparezca. */
  down?: boolean;
};
export type PlaceInfo = { id: string; target: PlaceTarget; kind: string; name: string; table: number | null };
export type ShipInfo = { id: string; name: string; photoURL: string | null; isBot: boolean; where: string; note: string | null };
/** Cuánta gente hay y dónde: `byPlace` por id de lugar (sin las mesas, que van juntas en `tables` y por mesa en `perTable`). */
export type Counts = { humans: number; flying: number; tables: number; perTable: number[]; byPlace: Record<string, number> };
export type MyState = { x: number; y: number; tx: number; ty: number; table: number | null; flying: boolean; down: boolean };
export type WeaponInfo = { kind: string; name: string; left: number };

export type Callbacks = {
  onPlace: (place: PlaceInfo | null) => void;
  onShip: (ship: ShipInfo | null) => void;
  onCounts: (counts: Counts) => void;
  /** Cambió algo que los demás deben saber pronto (destino, mesa). */
  onIntent: () => void;
  onFirstMove: () => void;
  /** Algo que merece sonido: arrancar, llegar a un lugar, sentarse, levantarse. */
  /** `other`: lo hizo otra nave (o un robot), suena más bajito. */
  onSound: (name: string, other?: boolean) => void;
  /** Tu disparo tocó la nave de un miembro: hay que avisarle para que también la vea temblar. */
  onNudge: (shipId: string) => void;
  /** Tumbaste la nave de un robot de la casa: se avisa para que todos la vean estallar y volver a la vez. */
  onBoom: (botId: string) => void;
  /** Cambió el aparato que llevas (o sus tiros restantes). `null`: disparo básico. Es local, no viaja al servidor. */
  onWeapon: (weapon: WeaponInfo | null) => void;
  /** La amenaza del cartucho: viene en camino (`warn`), ya está (`here`) o no hay (`null`). */
  onThreat?: (phase: "warn" | "here" | null, name: string) => void;
  /** Tu nave fue destruida: segundos (enteros) para reaparecer; `null` cuando vuelves. */
  onDown?: (seconds: number | null) => void;
  /** El modo de juego del cartucho cambió su letrero. */
  onHud?: (hud: ModeHud) => void;
  /** El modo de juego propone un valor del estado compartido: hay que mandarlo al servidor. */
  onShare?: (key: string, value: SharedValue | null) => void;
  /** La skin pidió saludar a alguien (persona o robot) desde su propio menú. */
  onGreet?: (entityId: string) => void;
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
  /** Estado vivo de un lugar (p. ej. la sala abierta y su subtítulo): la skin decide cómo se nota. */
  setPlaceStatus: (placeId: string, status: { on: boolean; sub: string }) => void;
  /** Lugares que hoy no llevan a nada (p. ej. grabaciones sin grabaciones): no se dibujan. */
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
  /** Robots tumbados según el servidor (`back`: ms para que vuelvan). `silent`: ya estaban así al llegar, sin explosión. */
  setBotsDown: (down: Array<{ bot: string; back: number }>, silent?: boolean) => void;
  /** Estado compartido del modo de juego, tal como llegó del servidor. */
  setShared: (shared: SharedState) => void;
  /** Dispara hacia donde apunta la nave con el aparato que lleves. A las personas sólo las hace temblar; a los robots los tumba. */
  shoot: () => void;
  /** El aparato flotante más cercano a tu nave (para pruebas y para pistas en pantalla). */
  nearestPickup: (kind?: string) => { x: number; y: number; kind: string } | null;
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

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
function lerpAngle(a: number, b: number, k: number) {
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * k;
}

export function createWorld(opts: {
  canvas: HTMLCanvasElement; stage: HTMLElement; cartridge: Pick<Cartridge, "structure" | "copy" | "mode">; skin: WorldSkin;
  meId: string; meName: string; mePhoto: string | null; look: Look; quiet: boolean; callbacks: Callbacks;
}): WorldApi {
  const { stage, callbacks: cb } = opts;
  const S = opts.cartridge.structure, copy = opts.cartridge.copy;
  const { w: WORLD_W, h: WORLD_H } = S.size;
  const TABLES = S.tables, BOTS = S.bots, M = S.movement, G = S.combat;
  const BOT_HP = G?.bot.hp ?? 0, WARP = G?.bot.warp ?? 0;
  /** Amenaza del cartucho (sólo con juego). */
  const T = G ? S.threat ?? null : null;
  const renderer = opts.skin.createRenderer({
    canvas: opts.canvas, stage, structure: S,
    // Ganchos para skins con menús propios: caminar a un punto, saludar y sonar pasan por el motor.
    motor: { walkTo: (p) => flyTo(p.x, p.y), greet: (id) => cb.onGreet?.(id), sound: (name) => cb.onSound(name) },
  });
  const emit = (ev: WorldEvent) => renderer.event?.(ev);
  const state = {
    mini: false, quiet: opts.quiet, animT: 0,
    keys: new Set<string>(), joy: { x: 0, y: 0 }, moved: false, wasFlying: false,
    nearPlace: null as Place | null, nearShip: null as Entity | null, bubbles: [] as Bubble[], marker: null as { x: number; y: number; t: number } | null,
    /** Puntos que faltan por recorrer después del destino actual (sólo con `movement.route`). */
    path: [] as Point[],
    placeStatus: {} as Record<string, { on: boolean; sub: string }>,
    hidden: new Set<string>(), dead: false,
    pickups: [] as Pickup[], shots: [] as Shot[], weapon: null as { kind: string; left: number } | null, shotT: 9, kindTurn: 0,
    /** Amenaza: fase, ciclo en curso, ciclo en que ya fue derribada, reloj de su disparo, segundos que llevas avisado y sus disparos. */
    threatPhase: "away" as "away" | "warn" | "here", threatCycle: -1, threatKilled: -1, threatShotT: 0, threatSeenT: 0, hostile: [] as Shot[],
    downShown: null as number | null,
  };
  const entity = (id: string, kind: Entity["kind"], name: string, look: Look, x: number, y: number): Entity => ({
    id, kind, name, first: firstName(name), photoURL: null, note: null, x, y, vx: 0, vy: 0, ang: -Math.PI / 2, thrust: 0,
    model: look.model, color: look.color, pilot: look.pilot, tx: null, ty: null, table: null, seat: null,
    bob: (id.length * 1.7) % TAU, waveT: 0, face: null, shakeT: 0, hp: BOT_HP, healT: 0, downT: 0, warpT: 0, shieldT: 0, leaveT: 0,
  });
  const player = entity("me", "me", opts.meName, opts.look, S.spawn.x, S.spawn.y);
  player.face = faceFor(opts.meId, opts.meName, opts.mePhoto);
  if (T) player.hp = T.player.hp;
  const threat = T ? entity(T.id, "bot", T.name, T.look, 0, 0) : null;
  const humans = new Map<string, Entity>();
  const bots = BOTS.map((b) => { const p = b.at(Date.now() / 1000); const e = entity(b.id, "bot", b.name, b.look, p.x, p.y); e.note = b.note; return e; });
  /** Las demás naves que hoy están en el mapa (un robot tumbado o una persona destruida no están). */
  const others = () => [...humans.values(), ...bots].filter((e) => e.downT <= 0);

  // ── Movimiento ──
  // Llegada suave: acelera hacia el punto y frena al acercarse.
  function steer(e: Entity, tx: number, ty: number, max: number, dt: number, slowR = 110, snap = 3.2) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1e-6;
    const sp = max * Math.min(1, d / slowR), k = Math.min(1, snap * dt);
    e.vx += ((dx / d) * sp - e.vx) * k; e.vy += ((dy / d) * sp - e.vy) * k;
    return d;
  }
  function integrate(e: Entity, dt: number, max: number) {
    let x = clamp(e.x + e.vx * dt, M.margin, WORLD_W - M.margin), y = clamp(e.y + e.vy * dt, M.margin, WORLD_H - M.margin);
    // Restricción del cartucho (caminos, isla…): la posición permitida más cercana.
    if (M.constrain) { const p = M.constrain({ x, y }, { x: e.x, y: e.y }, state.hidden); x = p.x; y = p.y; }
    e.x = x; e.y = y;
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
  /** Sin destino: ni punto al que ir, ni ruta pendiente, ni marca. */
  function clearTarget() { player.tx = player.ty = null; state.marker = null; state.path.length = 0; }
  // ── Gravedad sutil de los lugares: una curva y un empujoncito al pasar, nunca una trampa ──
  // Cero dentro del lugar (ahí ya llegaste, y no te mete sola a zona segura), cero en la orilla de su
  // alcance y cero si vas despacio: una nave quieta o que llega frenando no se mueve sola.
  const GRAV = M.gravity ?? 0, GRAV_CAP = M.accel * 0.25, GRAV_SLOW = M.maxSpeed * 0.2, GRAV_FAST = M.maxSpeed * 0.6, GRAV_CLICK = 0.35;
  const calm = typeof window.matchMedia === "function" && (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches);
  function gravity(dt: number, k: number) {
    if (GRAV <= 0 || calm || state.quiet || state.mini || view.vw < 640) return;
    const sp = Math.hypot(player.vx, player.vy), gate = clamp((sp - GRAV_SLOW) / (GRAV_FAST - GRAV_SLOW), 0, 1);
    if (gate <= 0) return;
    for (const p of places) {
      const g = p.gravity; if (!g || g.radius <= p.r) continue;
      const dx = p.x - player.x, dy = p.y - player.y, d = Math.hypot(dx, dy);
      if (d <= p.r || d >= g.radius) continue;
      // Campana entre la orilla del lugar y su alcance: lo más fuerte queda a medio camino.
      const a = Math.min(g.pull * GRAV, GRAV_CAP) * Math.sin(Math.PI * ((d - p.r) / (g.radius - p.r))) * gate * k * dt;
      player.vx += (dx / d) * a; player.vy += (dy / d) * a;
    }
  }
  function updatePlayer(dt: number) {
    if (player.downT > 0) {
      // Destruida: sin controles hasta que venza la cuenta; luego reaparece en el punto de entrada, con escudo.
      if ((player.downT -= dt) <= 0) revivePlayer(); else showDown(Math.ceil(player.downT));
      return;
    }
    const inp = inputVector(), flying = !!(inp.x || inp.y);
    if (flying !== state.wasFlying) { state.wasFlying = flying; cb.onIntent(); if (flying) cb.onSound("thrust"); }
    if (flying) {
      clearTarget(); noteMoved();
      if (player.table !== null) { player.table = player.seat = null; refreshPlace(); }
      player.vx += inp.x * M.accel * dt; player.vy += inp.y * M.accel * dt;
      gravity(dt, 1);
      const k = Math.exp(-M.drag * dt); player.vx *= k; player.vy *= k;
      const sp = Math.hypot(player.vx, player.vy); if (sp > M.maxSpeed) { player.vx *= M.maxSpeed / sp; player.vy *= M.maxSpeed / sp; }
    } else if (player.table !== null && player.seat !== null) {
      const s = TABLES[player.table].seats[player.seat];
      if (steer(player, s.x, s.y, M.seatSpeed, dt) < 10) faceTable(player, dt);
    } else if (player.tx !== null && player.ty !== null) {
      if (steer(player, player.tx, player.ty, M.maxSpeed, dt, 150) < 8) {
        // Llegó: sigue con el siguiente punto de la ruta, o se queda.
        const next = state.path.shift();
        if (next) { player.tx = next.x; player.ty = next.y; cb.onIntent(); } else clearTarget();
      } else gravity(dt, GRAV_CLICK); // con destino por clic, apenas una curva: el clic llega a donde tocaste
    } else { gravity(dt, 1); const k = Math.exp(-M.idleDrag * dt); player.vx *= k; player.vy *= k; }
    integrate(player, dt, M.maxSpeed);
  }
  function updateHuman(e: Entity, dt: number) {
    if (e.downT > 0) return; // destruida: no está en el mapa
    if (e.warpT > 0 && (e.warpT -= dt) <= 0) { e.warpT = 0; emit({ type: "bot-back", entity: e }); }
    // Entre lectura y lectura la nave vuela sola hacia su último destino conocido.
    if (e.table !== null && e.seat !== null && TABLES[e.table]?.seats[e.seat]) {
      const s = TABLES[e.table].seats[e.seat];
      if (steer(e, s.x, s.y, M.seatSpeed, dt) < 10) faceTable(e, dt);
    } else if (e.tx !== null && e.ty !== null) steer(e, e.tx, e.ty, M.maxSpeed, dt, 150);
    integrate(e, dt, M.maxSpeed);
    if (e.waveT > 0) e.waveT -= dt;
  }
  function updateBots(dt: number) {
    const t = Date.now() / 1000;
    bots.forEach((e, i) => {
      const p = BOTS[i].at(t), q = BOTS[i].at(t + 0.2);
      e.x = p.x; e.y = p.y; e.thrust = 0.5;
      const heading = Math.atan2(q.y - p.y, q.x - p.x);
      if (e.downT > 0) {
        // Tumbado: su ruta sigue corriendo con el reloj; al vencer el plazo llega en hipervelocidad a donde le toque.
        e.ang = heading;
        if ((e.downT -= dt) <= 0) { e.downT = 0; e.warpT = WARP; if (!state.mini && onScreen(e)) cb.onSound("warp", true); }
        return;
      }
      if (e.warpT > 0 && (e.warpT -= dt) <= 0) { e.warpT = 0; emit({ type: "bot-back", entity: e }); }
      if (e.healT > 0 && (e.healT -= dt) <= 0) e.hp = BOT_HP;
      const face = e.waveT > 0 ? Math.atan2(player.y - e.y, player.x - e.x) : heading;
      e.ang = lerpAngle(e.ang, face, Math.min(1, 5 * dt));
      if (e.waveT > 0) e.waveT -= dt;
    });
  }
  function flyTo(x: number, y: number) {
    if (player.downT > 0) return;
    noteMoved();
    if (player.table !== null) { player.table = player.seat = null; refreshPlace(); }
    x = clamp(x, M.targetMargin, WORLD_W - M.targetMargin); y = clamp(y, M.targetMargin, WORLD_H - M.targetMargin);
    // Con ruta del cartucho se va punto por punto; sin ella, en línea recta.
    const path = M.route ? M.route({ x: player.x, y: player.y }, { x, y }, state.hidden) : [{ x, y }];
    const end = path[path.length - 1];
    if (!end) return;
    if (state.quiet) { clearTarget(); player.x = end.x; player.y = end.y; player.vx = player.vy = 0; } // sin vuelo: salta
    else { player.tx = path[0].x; player.ty = path[0].y; state.path = path.slice(1); state.marker = { x: end.x, y: end.y, t: 0 }; cb.onSound("thrust"); }
    cb.onIntent();
  }

  // ── Cercanía ──
  // Un lugar sólo existe si lleva a algo que funciona (sin grabaciones no hay satélite).
  let places = S.places;
  function placeOf(e: { x: number; y: number }) {
    let best: Place | null = null, bd = 0;
    for (const p of places) { const d = Math.hypot(e.x - p.x, e.y - p.y) - p.r; if (d < 0 && (!best || d < bd)) { best = p; bd = d; } }
    return best;
  }
  const tableCount = (i: number) => [...humans.values(), player].filter((e) => e.table === i).length;
  function refreshPlace() {
    const p = state.nearPlace;
    cb.onPlace(p ? { id: p.id, target: p.target, kind: p.kind, name: p.name, table: p.table } : null);
  }
  function shipInfo(e: Entity): ShipInfo {
    const p = placeOf(e);
    const where = e.kind === "bot" ? "" : p ? (p.table !== null ? `en la mesa «${p.short}»` : `en ${p.name}`) : copy.roaming;
    return { id: e.id, name: e.name, photoURL: e.photoURL, isBot: e.kind === "bot", where, note: e.note };
  }
  function updateProximity() {
    const p = placeOf(player);
    if (p !== state.nearPlace) { state.nearPlace = p; refreshPlace(); if (p) cb.onSound("arrive"); }
    // Una persona cerca siempre gana sobre un robot de la casa; entre iguales, la más cercana.
    let near: Entity | null = null, nd = Infinity;
    for (const group of [[...humans.values()].filter((e) => e.downT <= 0), bots.filter((b) => b.downT <= 0 && b.warpT <= 0)]) {
      for (const e of group) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < (e === state.nearShip ? 150 : 112) && d < nd) { near = e; nd = d; } // histéresis: la tarjeta no parpadea
      }
      if (near) break;
    }
    if (near !== state.nearShip) { state.nearShip = near; cb.onShip(near ? shipInfo(near) : null); }
  }
  function counts(): Counts {
    const n: Counts = { humans: humans.size + 1, flying: 0, tables: 0, perTable: TABLES.map((_, i) => tableCount(i)), byPlace: {} };
    for (const p of S.places) if (p.table === null) n.byPlace[p.id] = 0;
    for (const e of [player, ...humans.values()]) {
      const p = placeOf(e);
      if (!p) n.flying++; else if (p.table !== null) n.tables++; else n.byPlace[p.id]++;
    }
    return n;
  }

  // ── Vista: cámara lógica 2D (la skin puede pintar con ella o traer su propia proyección) ──
  const view: View = { vw: 1, vh: 1, scale: 1, camx: 0, camy: 0, ox: 0, oy: 0 };
  const toScreen = (x: number, y: number) => renderer.toScreen?.(x, y) ?? { x: (x - view.camx) * view.scale + view.ox, y: (y - view.camy) * view.scale + view.oy };
  const onScreen = (p: { x: number; y: number }) => { const s = toScreen(p.x, p.y); return s.x > -40 && s.x < view.vw + 40 && s.y > -40 && s.y < view.vh + 40; };
  const toWorld = (sx: number, sy: number) => (renderer.toWorld ? renderer.toWorld(sx, sy) : { x: (sx - view.ox) / view.scale + view.camx, y: (sy - view.oy) / view.scale + view.camy });
  function updateCamera(k: number) {
    if (state.mini) return;
    const vwW = view.vw / view.scale, vhW = view.vh / view.scale;
    const tx = clamp(player.x - vwW / 2, 0, Math.max(0, WORLD_W - vwW)), ty = clamp(player.y - vhW / 2, 0, Math.max(0, WORLD_H - vhW));
    view.camx += (tx - view.camx) * k; view.camy += (ty - view.camy) * k;
  }
  function measure() {
    const r = stage.getBoundingClientRect();
    view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height);
    if (state.mini) {
      // Mapa reducido: el mundo completo a la vista.
      view.scale = Math.min(view.vw / WORLD_W, view.vh / WORLD_H); view.camx = view.camy = 0;
      view.ox = (view.vw - WORLD_W * view.scale) / 2; view.oy = (view.vh - WORLD_H * view.scale) / 2;
    } else {
      view.scale = clamp(Math.max(view.vw / WORLD_W, view.vh / WORLD_H), view.vw < 640 ? S.camera.minScaleNarrow : S.camera.minScale, S.camera.maxScale); view.ox = view.oy = 0;
      updateCamera(1);
    }
    renderer.resize(view, state.mini);
  }
  // El cuadro que se le entrega a la skin: un solo objeto que se actualiza antes de pintar.
  const frame: WorldFrame = {
    t: 0, dt: 0, mini: false, quiet: state.quiet, view, player, others: [], places, placeStatus: state.placeStatus, tableCounts: [],
    nearPlace: null, nearEntity: null, marker: null, bubbles: state.bubbles, pickups: state.pickups, shots: state.shots,
    threat: null, hostile: state.hostile,
  };
  function render(dt: number) {
    frame.t = state.animT; frame.dt = dt; frame.mini = state.mini; frame.quiet = state.quiet;
    frame.others = others(); frame.places = places; frame.tableCounts = TABLES.map((_, i) => tableCount(i));
    frame.nearPlace = state.nearPlace; frame.nearEntity = state.nearShip; frame.marker = state.marker;
    frame.bubbles = state.bubbles; frame.shots = state.shots; frame.hostile = state.hostile;
    frame.threat = !threat ? null : state.threatPhase === "away" ? (threat.leaveT > 0 ? { entity: threat, phase: "leaving" } : null) : { entity: threat, phase: state.threatPhase };
    renderer.render(frame);
  }

  // ── Modo de juego del cartucho (opcional): sus reglas corren aquí, cada cuadro, sin DOM ni red ──
  let mode: GameMode | null = opts.cartridge.mode?.() ?? null, shared: SharedState = {}, hudKey = "null";
  const modeCtx: ModeContext = {
    now: 0, meId: opts.meId, player, others: [], places, nearPlace: null, shared,
    sound: (name) => cb.onSound(name),
    bubble: (entity, text) => { state.bubbles = state.bubbles.filter((b) => b.entity !== entity || b.say); state.bubbles.push({ entity, text: text.slice(0, 60), t: 0, dur: 1.6 }); },
    hud: (hud) => { const key = JSON.stringify(hud); if (key !== hudKey) { hudKey = key; cb.onHud?.(hud); } },
    propose: (key, value) => { if (S.shared && key in S.shared) cb.onShare?.(key, value); },
  };
  function updateMode(dt: number) {
    if (!mode || state.mini) return;
    modeCtx.now = Date.now() / 1000; modeCtx.others = others(); modeCtx.places = places; modeCtx.nearPlace = state.nearPlace; modeCtx.shared = shared;
    try { mode.update(modeCtx, dt); }
    catch (err) { console.error("[mundo] el modo de juego falló y se apagó", err); mode = null; modeCtx.hud(null); }
  }

  // ── Juego: aparatos que cambian tu disparo (sólo si el cartucho trae `combat`) ──
  // Flotan pocos aparatos por el mapa; al pasar encima lo recoges y tu disparo cambia por unos tiros.
  // Sin aparato queda el disparo básico. El disparo se apaga en la primera nave que toca. Las naves de
  // personas sólo tiemblan; las de los robots pierden golpes hasta estallar. No hay puntos ni marcador.
  // En «Tranquilo» no hay juego.
  function pickupSpot(pk: NonNullable<typeof G>["pickups"]) {
    for (let k = 0; k < 40; k++) { const g = { x: pk.margin + Math.random() * (WORLD_W - pk.margin * 2), y: pk.margin + Math.random() * (WORLD_H - pk.margin * 2) }; if (!placeOf(g) && Math.hypot(g.x - player.x, g.y - player.y) > pk.clear) return g; }
    return { x: pk.fallback.x, y: pk.fallback.y };
  }
  const weaponDef = (kind: string) => G?.weapons.find((w) => w.id === kind);
  const weaponInfo = (): WeaponInfo | null => (state.weapon ? { kind: state.weapon.kind, name: weaponDef(state.weapon.kind)?.name ?? "", left: state.weapon.left } : null);
  /** El siguiente aparato de la rueda que no esté ya flotando: así todos pasan por el mapa. */
  function nextKind(kinds: string[]): string {
    for (let k = 0; k < kinds.length; k++) {
      const kind = kinds[state.kindTurn++ % kinds.length];
      if (!state.pickups.some((p) => p.alive && p.kind === kind)) return kind;
    }
    return kinds[state.kindTurn++ % kinds.length];
  }
  const WEAPON_KINDS = G?.weapons.map((w) => w.id) ?? [];
  const fire = (a: number, kind: string) => {
    const sp = G?.shots[kind]; if (!sp) return;
    state.shots.push({ kind, x: player.x + Math.cos(a) * 30, y: player.y + Math.sin(a) * 30, vx: Math.cos(a) * sp.speed, vy: Math.sin(a) * sp.speed, t: 0, life: sp.life, dmg: sp.dmg, bounces: sp.bounces ?? 0 });
  };
  /** Sin ángulo dispara hacia donde apunta la nave; el clic derecho manda el ángulo hacia el cursor. */
  function shoot(angle?: number) {
    if (!G || state.quiet || state.mini || player.downT > 0 || state.shotT < G.shotEvery) return;
    state.shotT = 0;
    const a = angle ?? player.ang, w = state.weapon, def = w && weaponDef(w.kind);
    if (!w || !def) { fire(a, G.basic.shot); cb.onSound(G.basic.sound); return; }
    if ("pulse" in def) {
      // Aro: no viaja; alcanza de una vez a las naves que estén dentro.
      emit({ type: "pulse", x: player.x, y: player.y, r: def.pulse.radius, dur: def.pulse.dur });
      for (const e of targets()) if (Math.hypot(e.x - player.x, e.y - player.y) < def.pulse.radius) touch(e, def.pulse.dmg);
    } else for (const d of def.spread ?? [0]) fire(a + d, def.shot);
    cb.onSound(def.sound);
    if (--w.left <= 0) state.weapon = null;
    cb.onWeapon(weaponInfo());
  }
  /** Tu disparo tocó esa nave: tiembla aquí y se avisa para que su dueño también la vea temblar. */
  function touch(e: Entity, dmg: number) {
    tickle(e); cb.onSound("nudge");
    // Al enemigo, con `needsWeapon`, sólo lo dañan los aparatos (el básico vale 0); si no, cualquier disparo le quita al menos un golpe.
    if (e === threat) { if (state.threatPhase === "here" && (e.hp -= T?.needsWeapon ? dmg : Math.max(1, dmg)) <= 0) destroyThreat(true); return; }
    if (e.kind === "human") cb.onNudge(e.id);
    else if (e.kind === "bot" && G) { e.healT = G.bot.heal; if ((e.hp -= dmg) <= 0) destroyBot(e, true); }
  }
  /** Naves a las que un disparo les puede pegar (un robot que viene llegando todavía no). */
  const targets = () => {
    const list = others().filter((e) => e.warpT <= 0);
    if (threat && state.threatPhase === "here" && threat.warpT <= 0) list.push(threat);
    return list;
  };
  /** La nave del robot estalla y desaparece; vuelve sola en `bot.back` s. */
  function destroyBot(e: Entity, mine: boolean, silent = false) {
    e.downT = G?.bot.back ?? 0; e.warpT = 0; e.hp = BOT_HP; e.healT = 0; e.shakeT = 0; e.waveT = 0;
    state.bubbles = state.bubbles.filter((b) => b.entity !== e);
    if (mine) cb.onBoom(e.id);
    if (silent || state.mini) return;
    emit({ type: "bot-down", entity: e });
    if (mine || onScreen(e)) cb.onSound("boom", !mine);
  }
  function updateGame(dt: number) {
    state.shotT += dt;
    if (!G) return;
    if (state.quiet) { state.shots.length = 0; return; }
    const pk = G.pickups;
    for (const p of state.pickups) {
      if (!p.alive) { if ((p.back -= dt) <= 0) Object.assign(p, pickupSpot(pk), { alive: true, kind: nextKind(WEAPON_KINDS), age: 0 }); continue; }
      if ((p.age += dt) > pk.swap) {
        // Nadie lo recogió: le toca al siguiente de la rueda, en el mismo lugar.
        p.kind = nextKind(WEAPON_KINDS); p.age = 0;
        emit({ type: "pickup", x: p.x, y: p.y, taken: false });
      }
      if (state.mini || Math.hypot(p.x - player.x, p.y - player.y) > pk.reach) continue;
      // Recogido: cambia tu disparo por unos tiros (si ya traías otro aparato, lo reemplaza).
      const def = weaponDef(p.kind); if (!def) continue;
      p.alive = false; p.back = SUPPLY && state.threatPhase !== "away" ? SUPPLY.back : pk.back + Math.random() * pk.backExtra;
      state.weapon = { kind: p.kind, left: def.uses };
      emit({ type: "pickup", x: p.x, y: p.y, taken: true });
      state.bubbles.push({ entity: player, text: `${def.name} · ${copy.uses(def.uses)}`, t: 0, dur: 1.4 });
      cb.onSound("pickup"); cb.onWeapon(weaponInfo());
    }
    const live = targets();
    for (const s of state.shots) {
      const x0 = s.x, y0 = s.y, def = G.shots[s.kind];
      if (def.seek) {
        // Gira poco a poco hacia la nave más cercana que tenga a su alcance.
        let goal: Entity | null = null, gd = def.seek.radius;
        for (const e of live) { const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < gd) { goal = e; gd = d; } }
        if (goal) {
          const cur = Math.atan2(s.vy, s.vx), a = lerpAngle(cur, Math.atan2(goal.y - s.y, goal.x - s.x), 1) - cur;
          const next = cur + clamp(a, -def.seek.turn * dt, def.seek.turn * dt), v = def.speed;
          s.vx = Math.cos(next) * v; s.vy = Math.sin(next) * v;
        }
      }
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.bounces > 0) {
        // Rebota en las orillas del mapa.
        if ((s.x < 8 && s.vx < 0) || (s.x > WORLD_W - 8 && s.vx > 0)) { s.vx = -s.vx; s.bounces--; }
        if ((s.y < 8 && s.vy < 0) || (s.y > WORLD_H - 8 && s.vy > 0)) { s.vy = -s.vy; s.bounces--; }
      }
      // Distancia al tramo recorrido en este cuadro: con pocos cuadros por segundo el disparo no se salta a nadie.
      const near = (q: { x: number; y: number }) => {
        const dx = s.x - x0, dy = s.y - y0, u = clamp(((q.x - x0) * dx + (q.y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        return Math.hypot(q.x - (x0 + dx * u), q.y - (y0 + dy * u));
      };
      // Un disparo con `selfHit` (Rebote) ya rebotó al menos una vez: también le pega a quien lo disparó.
      if (def.selfHit && T && !state.quiet && s.bounces < (def.bounces ?? 0) && exposed() && near(player) <= G.hitRadius) {
        s.t = s.life; hitPlayer(); // puede vaciar `state.shots` si con esto estalla tu nave
        continue;
      }
      const hit = live.find((e) => e.downT <= 0 && near(e) <= G.hitRadius);
      if (def.blast) {
        // Revienta al tocar una nave o al acabarse su vuelo, y alcanza a todo lo cercano.
        if (!hit && s.t < s.life) continue;
        emit({ type: "blast", x: s.x, y: s.y, r: def.blast.radius, shot: s.kind });
        cb.onSound("blast");
        for (const e of live) if (e.downT <= 0 && Math.hypot(e.x - s.x, e.y - s.y) < def.blast.radius) touch(e, s.dmg);
        s.t = s.life;
        // El estallido (no la bola en vuelo) también alcanza a quien la soltó, si se quedó dentro del radio.
        if (def.blast.self && T && !state.quiet && exposed() && Math.hypot(player.x - s.x, player.y - s.y) < def.blast.radius) hitPlayer(def.blast.self);
        continue;
      }
      if (!hit) continue;
      touch(hit, s.dmg); s.t = s.life; // el disparo se apaga en la nave que toca
    }
    state.shots = state.shots.filter((s) => s.t < s.life && s.x > -20 && s.x < WORLD_W + 20 && s.y > -20 && s.y < WORLD_H + 20);
  }
  // ── Amenaza: la nave enemiga del cartucho ──
  // Su calendario sale del reloj (como las rutas de los robots): todos la ven llegar, moverse e irse
  // a la vez sin pasar por el servidor. Cada quien simula los disparos contra SU nave. Al servidor
  // sólo viajan «me destruyó» (`down` en el latido) y «la derribé» (`boom` con el id del ciclo).
  const threatId = (cycle: number) => `${T?.id}:${cycle}`;
  /** Nadie te apunta ni te daña sentado en una mesa, dentro de un lugar, destruido o con escudo. */
  const exposed = () => player.downT <= 0 && player.shieldT <= 0 && player.warpT <= 0 && player.table === null && !placeOf(player);
  function showDown(seconds: number | null) { if (seconds !== state.downShown) { state.downShown = seconds; cb.onDown?.(seconds); } }
  /** Con `needsWeapon`: aparatos de sobra mientras dura la visita y uno cerca de quien no trae, para que nadie quede indefenso. */
  const SUPPLY = G && T?.needsWeapon ? T.supply ?? null : null;
  function supply(on: boolean) {
    if (!G || !SUPPLY) return;
    const base = G.pickups.count;
    if (!on) { state.pickups.length = Math.min(state.pickups.length, base); return; } // se fue: quedan los de siempre
    while (state.pickups.length < Math.max(base, SUPPLY.count)) state.pickups.push({ kind: nextKind(WEAPON_KINDS), ...pickupSpot(G.pickups), ph: state.pickups.length * 1.7, alive: true, back: 0, age: 0 });
    for (const p of state.pickups) if (!p.alive) p.back = Math.min(p.back, SUPPLY.back);
    if (state.weapon) return;
    // Uno cerca de ti: se mueve hasta acá el que esté apagado o, si no hay, el más lejano.
    const [min, max] = SUPPLY.near, m = G.pickups.margin;
    let spot: Point | null = null;
    for (let k = 0; k < 40 && !spot; k++) {
      const a = Math.random() * TAU, d = min + Math.random() * (max - min), g = { x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d };
      if (g.x > m && g.x < WORLD_W - m && g.y > m && g.y < WORLD_H - m && !placeOf(g)) spot = g;
    }
    if (!spot || state.pickups.some((p) => p.alive && Math.hypot(p.x - player.x, p.y - player.y) <= max)) return; // ya hay uno a la mano
    const dist = (p: Pickup) => (p.alive ? Math.hypot(p.x - player.x, p.y - player.y) : Infinity);
    const pick = state.pickups.reduce((a, b) => (dist(b) > dist(a) ? b : a));
    Object.assign(pick, spot, { alive: true, age: 0, back: 0 }); if (!pick.kind) pick.kind = nextKind(WEAPON_KINDS);
    emit({ type: "pickup", x: spot.x, y: spot.y, taken: false });
  }
  function setThreatPhase(phase: "away" | "warn" | "here") {
    if (phase === state.threatPhase) return;
    if (phase === "away") supply(false); else if (state.threatPhase === "away") supply(true);
    state.threatPhase = phase;
    cb.onThreat?.(phase === "away" ? null : phase, threat?.name ?? "");
  }
  /** Quién viene en este ciclo: los personajes de la amenaza se alternan, y cada uno trae su nave, su ruta y su disparo. */
  let castCycle = -1, routeAt = T?.at ?? (() => ({ x: 0, y: 0 })), gun = T?.shot ?? { speed: 0, life: 0, every: 1, range: 0 }, burstLeft = 0, burstT = 0;
  function cast(cycle: number) {
    if (!T || !threat || cycle === castCycle) return;
    castCycle = cycle;
    const n = T.variants?.length ?? 0, v = n ? T.variants![((cycle % n) + n) % n] : null;
    threat.name = v?.name ?? T.name; threat.first = firstName(threat.name);
    const look = v?.look ?? T.look; threat.model = look.model; threat.color = look.color; threat.pilot = look.pilot;
    routeAt = v?.at ?? T.at; gun = { ...T.shot, ...v?.shot }; burstLeft = 0;
  }
  function fireAt(p: Point) {
    // Puntería con anticipación: apunta a donde vas a estar cuando llegue el tiro (`lead` 0 = a donde estás).
    const eta = (Math.hypot(player.x - p.x, player.y - p.y) / gun.speed) * (gun.lead ?? 0);
    const a = Math.atan2(player.y + player.vy * eta - p.y, player.x + player.vx * eta - p.x);
    state.hostile.push({ kind: T!.id, x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 34, vx: Math.cos(a) * gun.speed, vy: Math.sin(a) * gun.speed, t: 0, life: gun.life, dmg: 1, bounces: 0 });
    cb.onSound("enemyShot", true);
  }
  function updateThreat(dt: number) {
    if (!T || !threat) return;
    if (threat.leaveT > 0) threat.leaveT = Math.max(0, threat.leaveT - dt);
    if (state.quiet || state.mini) { setThreatPhase("away"); threat.leaveT = 0; state.hostile.length = 0; return; }
    const now = Date.now() / 1000, cycle = Math.floor(now / T.every), u = now - cycle * T.every;
    state.threatCycle = cycle; cast(cycle);
    const phase = state.threatKilled === cycle ? "away" : u < T.warn ? "warn" : u < T.warn + T.stay ? "here" : "away";
    if (phase !== state.threatPhase) {
      if (phase === "warn") { state.threatSeenT = 0; cb.onSound("alarm"); }
      else if (phase === "here") {
        // Llega en hipervelocidad a donde le toque en su ruta.
        const p = routeAt(cycle, 0), q = routeAt(cycle, 0.2);
        threat.x = p.x; threat.y = p.y; threat.ang = Math.atan2(q.y - p.y, q.x - p.x); threat.hp = T.hp; threat.warpT = WARP; threat.leaveT = 0; threat.shakeT = 0;
        state.threatShotT = 0;
        if (state.threatPhase === "away") state.threatSeenT = 0; // llegaste a media visita: primero el aviso
        cb.onSound("warp", true);
      } else if (state.threatPhase === "here") { threat.leaveT = WARP; cb.onSound("warp", true); } // se va como llegó
      setThreatPhase(phase);
    }
    if (phase !== "away") state.threatSeenT += dt;
    if (phase === "here") {
      const tv = u - T.warn, p = routeAt(cycle, tv), q = routeAt(cycle, tv + 0.2);
      threat.x = p.x; threat.y = p.y; threat.thrust = 0.6;
      const d = Math.hypot(player.x - p.x, player.y - p.y), aim = exposed() && d < gun.range;
      // Voltea hacia quien tiene a tiro; si no, sigue su rumbo.
      threat.ang = lerpAngle(threat.ang, aim ? Math.atan2(player.y - p.y, player.x - p.x) : Math.atan2(q.y - p.y, q.x - p.x), Math.min(1, 4 * dt));
      if (threat.warpT > 0) { if ((threat.warpT -= dt) <= 0) { threat.warpT = 0; emit({ type: "bot-back", entity: threat }); } }
      // Nadie es destruido sin aviso: no dispara hasta que lleves `warn` segundos sabiendo que anda aquí.
      else if (burstLeft > 0) {
        // Resto de la ráfaga: si dejaste de estar a tiro, se corta.
        if (!aim) burstLeft = 0;
        else if ((burstT -= dt) <= 0) { burstLeft--; burstT = gun.gap ?? 0.3; fireAt(p); }
      } else if ((state.threatShotT += dt) >= gun.every && aim && state.threatSeenT >= T.warn) {
        state.threatShotT = 0; burstLeft = Math.max(0, (gun.burst ?? 1) - 1); burstT = gun.gap ?? 0.3;
        fireAt(p);
      }
    }
    for (const s of state.hostile) {
      const x0 = s.x, y0 = s.y;
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const dx = s.x - x0, dy = s.y - y0, k = clamp(((player.x - x0) * dx + (player.y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      if (!exposed() || Math.hypot(player.x - (x0 + dx * k), player.y - (y0 + dy * k)) > (G?.hitRadius ?? 0)) continue;
      s.t = s.life; hitPlayer();
    }
    state.hostile = state.hostile.filter((s) => s.t < s.life);
  }
  /** Un disparo de la enemiga (o tu propio Rebote de regreso, o el estallido de tu Bomba) tocó tu nave: tiembla, pierde un golpe y, sin golpes, estalla. */
  function hitPlayer(dmg = 1) {
    if (!T) return;
    tickle(player); cb.onSound("hit");
    player.healT = T.player.heal;
    if ((player.hp -= dmg) > 0) return;
    player.downT = T.player.back; player.hp = T.player.hp; player.healT = 0; player.shakeT = 0; player.vx = player.vy = 0; player.thrust = 0;
    clearTarget(); state.keys.clear(); state.wasFlying = false; state.shots.length = 0;
    state.bubbles = state.bubbles.filter((b) => b.entity !== player);
    emit({ type: "bot-down", entity: player }); cb.onSound("boom");
    showDown(Math.ceil(player.downT)); cb.onIntent();
  }
  function revivePlayer() {
    player.downT = 0; player.x = S.spawn.x; player.y = S.spawn.y; player.vx = player.vy = 0; player.ang = -Math.PI / 2;
    player.warpT = WARP; player.shieldT = WARP + (T?.player.shield ?? 0);
    showDown(null); cb.onSound("warp"); cb.onIntent();
  }
  /** La enemiga estalla y no vuelve hasta el siguiente ciclo. `mine`: la derribaste tú y se avisa a los demás. */
  function destroyThreat(mine: boolean, silent = false) {
    if (!threat) return;
    state.threatKilled = state.threatCycle; state.hostile.length = 0; threat.leaveT = 0; threat.warpT = 0;
    const was = state.threatPhase;
    setThreatPhase("away");
    if (mine) cb.onBoom(threatId(state.threatCycle));
    if (silent || was !== "here" || state.mini) return;
    emit({ type: "bot-down", entity: threat });
    if (mine || onScreen(threat)) cb.onSound("boom", !mine);
  }

  /** Temblor breve. Varias cosquillas seguidas son un solo temblor. */
  function tickle(e: Entity) {
    if (state.quiet || e.shakeT > 0) return;
    e.shakeT = SHAKE;
    emit({ type: "tickle", entity: e });
  }

  // ── Saludos ──
  function burst(e: Entity) {
    if (state.quiet) return;
    emit({ type: "greet", entity: e });
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
    if (w) flyTo(w.x, w.y);
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
    if (w) shoot(Math.atan2(w.y - player.y, w.x - player.x));
  };
  stage.addEventListener("pointerdown", onPointerType, true);
  stage.addEventListener("contextmenu", onContextMenu);
  stage.addEventListener("pointerdown", onPointerDown);
  const observer = new ResizeObserver(() => measure()); observer.observe(stage);

  // ── Ciclo ──
  let last = performance.now(), countAcc = 1, raf = 0;
  function tick(now: number) {
    if (state.dead) return;
    // Nunca negativo: el primer cuadro puede traer una marca anterior a `last`.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (!state.quiet) { state.animT += dt; updateBots(dt); }
    for (const e of humans.values()) updateHuman(e, dt);
    updatePlayer(dt); updateGame(dt); updateThreat(dt);
    if (player.shakeT > 0) player.shakeT -= dt;
    if (T) {
      if (player.warpT > 0 && (player.warpT -= dt) <= 0) { player.warpT = 0; emit({ type: "bot-back", entity: player }); }
      if (player.shieldT > 0) player.shieldT = Math.max(0, player.shieldT - dt);
      if (player.healT > 0 && (player.healT -= dt) <= 0) player.hp = T.player.hp; // unos segundos sin golpes: se recupera
      if (threat && threat.shakeT > 0) threat.shakeT -= dt;
    }
    for (const e of others()) if (e.shakeT > 0) e.shakeT -= dt;
    if (state.marker) state.marker.t += dt;
    for (const b of state.bubbles) b.t += dt;
    state.bubbles = state.bubbles.filter((b) => b.t < b.dur);
    updateProximity(); updateMode(dt);
    countAcc += dt; if (countAcc > 0.5) { countAcc = 0; cb.onCounts(counts()); }
    updateCamera(Math.min(1, 5 * dt)); render(dt);
    raf = requestAnimationFrame(tick);
  }
  // Los relojes arrancan escalonados: los aparatos se turnan de uno en uno, no todos a la vez.
  if (G) for (let i = 0; i < G.pickups.count; i++) state.pickups.push({ kind: nextKind(WEAPON_KINDS), ...pickupSpot(G.pickups), ph: i * 1.7, alive: true, back: 0, age: (i * G.pickups.swap) / G.pickups.count });
  measure();
  raf = requestAnimationFrame(tick);

  return {
    resize(mini) { state.mini = mini; measure(); },
    setQuiet(quiet) { state.quiet = quiet; if (quiet) { clearTarget(); player.shakeT = 0; for (const e of others()) e.shakeT = 0; for (const b of bots) { b.downT = b.warpT = b.healT = 0; b.hp = BOT_HP; } if (state.weapon) { state.weapon = null; cb.onWeapon(null); } emit({ type: "calm" }); state.shots.length = 0;
        // Sin juego no hay enemiga ni naves destruidas: quien estaba fuera vuelve de una vez.
        for (const e of humans.values()) e.downT = e.warpT = 0;
        player.warpT = player.shieldT = player.healT = 0; if (T) player.hp = T.player.hp;
        if (player.downT > 0) { player.downT = 0; player.x = S.spawn.x; player.y = S.spawn.y; showDown(null); cb.onIntent(); }
      }
    },
    setLook(look) { player.model = look.model; player.color = look.color; player.pilot = look.pilot; cb.onIntent(); },
    setPlaceStatus(placeId, status) { state.placeStatus[placeId] = status; },
    setHidden(ids) { state.hidden = new Set(ids); places = S.places.filter((p) => !state.hidden.has(p.id)); },
    setRemote(ships, me) {
      meId = me;
      const seen = new Set<string>(), L = S.looks;
      for (const s of ships) {
        if (s.id === me) continue;
        seen.add(s.id);
        const look: Look = {
          model: L.models.find((m) => m.id === s.ship)?.id ?? L.fallback.model,
          color: L.colors.find((c) => c.id === s.color)?.id ?? L.fallback.color,
          pilot: L.pilots.find((p) => p.id === s.pilot)?.id ?? L.fallback.pilot,
        };
        let e = humans.get(s.id);
        const arrived = !e;
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
        // La amenaza destruyó su nave: estalla aquí también, se oculta, y vuelve en hipervelocidad cuando reaparezca.
        const down = !!s.down && !!T && !state.quiet;
        if (down && e.downT <= 0) {
          e.downT = 1; e.warpT = 0; e.shakeT = 0;
          state.bubbles = state.bubbles.filter((b) => b.entity !== e);
          if (state.nearShip === e) { state.nearShip = null; cb.onShip(null); }
          if (!arrived && !state.mini) { emit({ type: "bot-down", entity: e }); if (onScreen(e)) cb.onSound("boom", true); }
        } else if (!down && e.downT > 0) {
          e.downT = 0; e.x = s.x; e.y = s.y; e.vx = e.vy = 0; e.ang = -Math.PI / 2; e.warpT = state.quiet ? 0 : WARP;
          if (!state.quiet && !state.mini && onScreen(e)) cb.onSound("warp", true);
        }
      }
      for (const id of humans.keys()) if (!seen.has(id)) { if (state.nearShip?.id === id) { state.nearShip = null; cb.onShip(null); } humans.delete(id); }
    },
    showSay(fromId, text) {
      const from = byId(fromId, meId); if (!from) return;
      // Una burbuja por nave: el mensaje nuevo reemplaza al anterior. Lo largo se lee completo en el historial.
      state.bubbles = state.bubbles.filter((b) => !(b.say && b.entity === from));
      const chars = [...text];
      state.bubbles.push({ entity: from, text: chars.length > 46 ? `${chars.slice(0, 45).join("")}…` : text, t: 0, dur: 5, say: true });
    },
    showNudge(toId) {
      const to = byId(toId, meId); if (!to || state.quiet) return false;
      tickle(to);
      return to === player;
    },
    setBotsDown(down, silent) {
      if (state.quiet) return;
      if (T) state.threatCycle = Math.floor(Date.now() / 1000 / T.every);
      for (const d of down) {
        // La enemiga de este ciclo ya fue derribada por alguien: cae aquí también.
        if (T && d.bot === threatId(state.threatCycle)) { if (state.threatKilled !== state.threatCycle) destroyThreat(false, silent); continue; }
        const e = bots.find((b) => b.id === d.bot); if (!e) continue;
        // Ya tumbado aquí: sólo se empareja el regreso con el del servidor, para que todos lo vean llegar a la vez.
        if (e.downT > 0) e.downT = d.back / 1000;
        // Lo tumbó otra persona. Si le queda poco por volver (o ya viene llegando), es una lectura vieja: se ignora.
        else if (e.warpT <= 0 && d.back > 3000) { destroyBot(e, false, silent); e.downT = d.back / 1000; }
      }
    },
    showWave(fromId, toId) {
      const from = byId(fromId, meId), to = byId(toId, meId); if (!from || !to) return;
      state.bubbles.push({ entity: from, text: `¡Hola, ${to === player ? firstName(opts.meName) : to.first}!`, t: 0, dur: 1.5 });
      if (to === player) burst(player); else if (from === player) to.waveT = 3;
    },
    waveBot(botId) {
      const bot = bots.find((b) => b.id === botId); if (!bot || bot.downT > 0) return;
      state.bubbles.push({ entity: player, text: `¡Hola, ${bot.first}!`, t: 0, dur: 1.5 });
      bot.waveT = 3.5;
      window.setTimeout(() => { if (state.dead || bot.downT > 0) return; state.bubbles.push({ entity: bot, text: `¡Hola, ${firstName(opts.meName)}!`, t: 0, dur: 1.5 }); burst(bot); cb.onSound("waveIn"); }, 650);
    },
    shoot: () => shoot(),
    nearestPickup(kind) {
      let best: Pickup | null = null, bd = Infinity;
      for (const p of state.pickups) { const d = Math.hypot(p.x - player.x, p.y - player.y); if (p.alive && (!kind || p.kind === kind) && d < bd) { best = p; bd = d; } }
      return best ? { x: best.x, y: best.y, kind: best.kind } : null;
    },
    flyToPlace(placeId) {
      const p = places.find((q) => q.id === placeId); if (!p) return;
      if (p.table !== null && S.tableZone) flyTo(S.tableZone.entry.x, S.tableZone.entry.y); else flyTo(p.x - p.r * 0.5, p.y + p.r * 0.62);
    },
    setJoy(x, y) { state.joy.x = x; state.joy.y = y; },
    sit(table) {
      const seats = TABLES[table]?.seats; if (!seats || player.downT > 0) return;
      const taken = new Set([...humans.values()].filter((e) => e.table === table && e.seat !== null).map((e) => e.seat));
      const k = seats.findIndex((_, s) => !taken.has(s)); if (k < 0) return;
      clearTarget(); player.table = table; player.seat = k;
      if (state.quiet) { const s = seats[k]; player.x = s.x; player.y = s.y; player.vx = player.vy = 0; }
      refreshPlace(); cb.onIntent(); cb.onSound("sit");
    },
    stand() { if (player.table === null) return; player.table = player.seat = null; refreshPlace(); cb.onIntent(); cb.onSound("stand"); },
    confirmSeat(table, seat) {
      // El servidor manda: si la mesa se llenó o tocó otro asiento, la nave se acomoda.
      if (player.table === null || (table === player.table && seat === player.seat)) return;
      if (table === null) { player.table = player.seat = null; refreshPlace(); } else if (table === player.table) player.seat = seat;
    },
    myTable: () => player.table,
    setShared(next) { shared = next; },
    myState() {
      const flying = state.wasFlying;
      const seat = player.table !== null && player.seat !== null ? TABLES[player.table].seats[player.seat] : null;
      // Volando con teclas no hay destino: se manda a dónde va a estar en un momento.
      const tx = seat ? seat.x : player.tx ?? player.x + (flying ? player.vx * 1.1 : 0);
      const ty = seat ? seat.y : player.ty ?? player.y + (flying ? player.vy * 1.1 : 0);
      return { x: Math.round(player.x), y: Math.round(player.y), tx: Math.round(clamp(tx, M.margin, WORLD_W - M.margin)), ty: Math.round(clamp(ty, M.margin, WORLD_H - M.margin)), table: player.table, flying, down: player.downT > 0 };
    },
    screenOf: (x, y) => toScreen(x, y),
    destroy() {
      state.dead = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointerdown", onPointerType, true);
      stage.removeEventListener("contextmenu", onContextMenu);
      renderer.destroy();
    },
  };
}
