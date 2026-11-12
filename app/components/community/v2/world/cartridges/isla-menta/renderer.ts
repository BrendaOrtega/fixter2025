// Cartucho «Isla Menta» — renderizador three.js. El motor manda un `WorldFrame` por cuadro (él lleva
// el único `requestAnimationFrame`); aquí sólo se pinta: isla, muñequitos, cámara inclinada que sigue
// a tu personaje y etiquetas HTML encima. Todo lo que se crea se suelta en `destroy`.

import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { makeGhosty3D } from "./ghosty3d.js";
import type { Entity, Place, Point, View, WorldEvent, WorldFrame, WorldRenderer, WorldStructure } from "../../cartridge";
import { FLAG_AT, SEA, createIsland, wx, wz } from "./island";
import { createPuppetKit, type Puppet, type PuppetLook } from "./puppet";
import { createActions, moodHtml, type MotorHooks, type Person } from "./actions";
import { BUILDINGS, GHOSTY_ID, UNIT, WORLD_H, WORLD_W, heightAt, isSea, crowd, nearMoor, nearestWalkable, sea, shapeFor, standHeight, toneOf } from "./structure";
import { BOAT_SEATS, DANCE_BEAT, MOOR, PILLOWS, PILLOW_COUNT, spotAt, type PlacedSpot } from "./things";

const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';
const PUPPET_SCALE = 1.15;
/** Segundos que dura la risa de una cosquilla y el tambaleo de un almohadazo. */
const GIGGLE = 1.1, BONK = 1.3;
/** Al pasar a esta distancia (px del mapa) de la canasta se toman almohadas; segundos que vuela una almohada. */
const PILLOW_GRAB = 62, TOSS = 0.3;
const FOV = 30, ELEVATION = (50 * Math.PI) / 180, ELEVATION_MINI = (64 * Math.PI) / 180, DISTANCE = 25, ZOOM_MIN = 0.4, ELEVATION_CLOSE = (24 * Math.PI) / 180;
/** Altura (unidades) a la que flota la etiqueta de cada lugar, según su edificio. */
const LABEL_LIFT: Record<string, number> = { forum: 5, mural: 3, cinema: 4.3, school: 4.1, "camp-table": 2.25 };

const FLAG_OFFSET = { x: FLAG_AT.x, z: FLAG_AT.z }, NO_OFFSET = { x: 0, z: 0 };

type Actor = {
  puppet: Puppet; key: string; x: number; y: number; yaw: number; seen: number; giggle: number; bonk: number; pillow: THREE.Mesh | null;
  /** Hacia dónde lo empuja el almohadazo (three, unitario) y si la almohada ya le llegó volando (no cae del cielo). */
  kx: number; kz: number; landed: boolean;
  label: HTMLDivElement; labelKey: string; face: { texture: THREE.CanvasTexture; img: HTMLImageElement | null } | null;
  /** Actividad: segundos quieto, el punto sobre el que está, cuánto lleva ahí, qué tan «pegado» al punto se dibuja y su globito. */
  /** Sólo Ghosty: su modelo, que siempre mira a la cámara (es plano por detrás). */
  ghosty: THREE.Group | null;
  stillT: number; spot: PlacedSpot | null; spotT: number; snap: number; sx: number; sy: number; mood: HTMLDivElement | null; moodKey: string;
};

const lerpAngle = (a: number, b: number, k: number) => a + ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;

export function createRenderer(opts: { canvas: HTMLCanvasElement; stage: HTMLElement; structure: WorldStructure }): WorldRenderer {
  const { stage, structure } = opts;
  let dead = false;

  // ── WebGL ── Si el <canvas> que llega ya tiene otro contexto (p. ej. 2D de otro mundo), se usa uno propio encima.
  let ownCanvas: HTMLCanvasElement | null = null;
  let gl: THREE.WebGLRenderer;
  const glOptions = { antialias: true, powerPreference: "high-performance" as const };
  try {
    gl = new THREE.WebGLRenderer({ canvas: opts.canvas, ...glOptions });
  } catch {
    ownCanvas = document.createElement("canvas");
    ownCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    opts.canvas.insertAdjacentElement("afterend", ownCanvas);
    gl = new THREE.WebGLRenderer({ canvas: ownCanvas, ...glOptions });
  }
  const canvas = ownCanvas ?? opts.canvas;
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  // Las sombras son de cosas quietas (edificios, árboles): se hornean una vez y sólo se repiten si algo cambia.
  gl.shadowMap.autoUpdate = false;
  gl.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SEA);
  const fog = new THREE.Fog(SEA, 40, 110);
  scene.fog = fog;
  scene.add(new THREE.HemisphereLight("#F2FBF7", "#3A5B54", 1.35));
  const sun = new THREE.DirectionalLight("#FFF6E6", 1.75);
  sun.position.set(-13, 26, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 18, bottom: -18, near: 1, far: 70 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);
  const island = createIsland(scene);
  const kit = createPuppetKit();

  // Marca de «voy para allá».
  const markerGeo = new THREE.RingGeometry(0.2, 0.3, 28);
  const markerMat = new THREE.MeshBasicMaterial({ color: "#F2F5F4", transparent: true, opacity: 0.9, depthWrite: false });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2; marker.visible = false; marker.renderOrder = 3; scene.add(marker);

  // ── Capa de etiquetas (HTML): nombres, lugares y burbujas. No recibe toques. ──
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;font-family:${FONT};contain:strict`;
  canvas.insertAdjacentElement("afterend", layer);
  const TAG = "position:absolute;left:0;top:0;white-space:nowrap;will-change:transform;";
  const NAME = `${TAG}padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:15px;color:#F2F5F4;background:rgba(14,19,23,.74);border:1px solid rgba(124,138,142,.35)`;
  const PLACE = `${TAG}padding:4px 11px;border-radius:12px;font-size:12px;font-weight:700;line-height:16px;color:#F2F5F4;background:rgba(14,19,23,.86);border:1px solid #232D33;text-align:center;box-shadow:0 4px 14px rgba(14,19,23,.22)`;
  const MOOD = `${TAG}width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#F2F5F4;box-shadow:0 3px 10px rgba(14,19,23,.25);transition:opacity .35s`;
  const BUBBLE = `${TAG}max-width:220px;white-space:normal;padding:5px 10px;border-radius:12px;font-size:12px;font-weight:600;line-height:16px;color:#0E1317;background:#F2F5F4;box-shadow:0 4px 14px rgba(14,19,23,.25)`;
  const tag = (css: string) => { const el = document.createElement("div"); el.style.cssText = css; layer.appendChild(el); return el; };
  const place = (el: HTMLElement, sx: number, sy: number, show: boolean) => {
    el.style.display = show ? "" : "none";
    if (show) el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(-50%,-100%)`;
  };
  const placeTags = new Map<string, { el: HTMLDivElement; key: string }>();
  // Menú de acciones, marcas y anuncios (ver `actions.ts`). Los ganchos del motor son opcionales: hoy no existen.
  const hooks: MotorHooks = (opts as { motor?: MotorHooks }).motor ?? {};
  const actions = createActions({ stage, canvases: ownCanvas ? [opts.canvas, ownCanvas] : [opts.canvas], after: layer, hooks, onThrow: (id) => toss(id) });
  const guideGeo = new THREE.RingGeometry(0.36, 0.46, 32);
  const guideMat = new THREE.MeshBasicMaterial({ color: "#85DDCB", transparent: true, opacity: 0.9, depthWrite: false });
  const guideRing = new THREE.Mesh(guideGeo, guideMat);
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; guideRing.renderOrder = 3; scene.add(guideRing);
  const bubbleTags: HTMLDivElement[] = [];

  // ── Proyección ──
  let vw = 1, vh = 1;
  const v3 = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const project = (X: number, Y: number, Z: number) => { v3.set(X, Y, Z).project(camera); return { x: (v3.x + 1) * 0.5 * vw, y: (1 - v3.y) * 0.5 * vh, front: v3.z < 1 }; };
  function toScreen(x: number, y: number): Point {
    const p = project(wx(x), Math.max(standHeight(x, y), 0), wz(y));
    return { x: p.x, y: p.y };
  }
  function toWorld(sx: number, sy: number): Point | null {
    // Un toque sobre una cosa, una marca o el menú no es «camina aquí»: lo resuelve el menú de acciones.
    const reply = actions.reply();
    if (reply !== undefined) return reply;
    ray.setFromCamera(ndc.set((sx / vw) * 2 - 1, 1 - (sy / vh) * 2), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -0.02) return null; // apunta al horizonte: no cae en el mapa
    // El rayo se corta con un plano y el plano se ajusta a la altura del terreno en ese punto (converge en pocos pasos).
    let level = 0.3, x = 0, y = 0;
    for (let i = 0; i < 4; i++) {
      const k = (level - o.y) / d.y;
      x = (o.x + d.x * k) / UNIT + WORLD_W / 2; y = (o.z + d.z * k) / UNIT + WORLD_H / 2;
      level = Math.max(heightAt(x, y), 0);
    }
    return { x, y };
  }

  // ── Muñequitos ──
  const actors = new Map<string, Actor>();
  let tick = 0;
  function lookOf(e: Entity): PuppetLook {
    const tone = toneOf(e.color), shape = e.kind === "bot" ? "robot" : shapeFor(e.model);
    return { shape, fill: tone.fill, dark: tone.dark, face: e.pilot === "avatar" && shape !== "robot" ? "avatar" : "eyes" };
  }
  function makeFace(e: Entity, uid: string) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const ctx = cv.getContext("2d")!;
    const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
    const initials = e.face?.initials ?? (e.name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?");
    ctx.fillStyle = e.face?.bg ?? "#17302C"; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = e.face?.fg ?? "#85DDCB"; ctx.font = `700 54px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(initials, 64, 68);
    let img: HTMLImageElement | null = null;
    if (e.photoURL) {
      // WebGL no acepta una foto de otro origen sin permiso, así que se pide por el mismo origen
      // (`/api/avatar/:id?raw=1` reenvía los bytes). Si falla, quedan las iniciales.
      img = new Image();
      img.onload = () => {
        if (dead || !img || !img.naturalWidth) return;
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
        texture.needsUpdate = true;
      };
      img.src = /^[a-f0-9]{24}$/.test(uid) ? `/api/avatar/${uid}?raw=1` : e.photoURL;
    }
    return { texture, img };
  }
  function dropActor(a: Actor) {
    scene.remove(a.puppet.root);
    (a.puppet.root.userData.dispose as (() => void) | undefined)?.();
    if (a.face) { a.face.texture.dispose(); if (a.face.img) { a.face.img.onload = null; a.face.img.src = ""; } }
    a.label.remove(); a.mood?.remove();
    if (a.pillow) scene.remove(a.pillow);
  }
  // ── Ghosty ── Pasea como un personaje más, con el modelo 3D oficial (sale del vector de la marca, sin
  // repintar y sin boca). Flota: no camina ni toma poses. Mientras su vector carga no se ve nada.
  function ghostyPuppet(): { puppet: Puppet; model: THREE.Group } {
    const root = new THREE.Group(), model = makeGhosty3D({ THREE, SVGLoader, url: "/mundo/ghosty-oficial.svg" });
    model.position.y = 0.28; model.visible = false; root.add(model);
    let gone = false;
    const free = () => model.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); }
    });
    (model.userData.ready as Promise<unknown>).then(() => {
      if (gone || dead) { free(); return; }
      model.traverse((o) => { o.castShadow = false; });
      model.visible = true;
    }).catch(() => { root.remove(model); });
    root.userData.dispose = () => { gone = true; if (model.visible) free(); };
    let last = 0;
    const puppet: Puppet = {
      root, top: 1.25,
      pose: (p) => {
        if (!model.visible) return;
        if (Math.floor(p.t / 3.4) !== Math.floor(last / 3.4)) (model.userData.blink as (t: number) => void)(p.t);
        last = p.t;
        (model.userData.update as (t: number, dt: number) => void)(p.t, p.dt);
      },
      setFace: () => {},
    };
    return { puppet, model };
  }
  function actorFor(e: Entity, uid: string): Actor {
    const look = lookOf(e), key = `${look.shape}|${look.fill}|${look.face}|${look.face === "avatar" ? e.photoURL ?? e.name : ""}`;
    let a = actors.get(e.id);
    if (a && a.key === key) return a;
    const prev = a;
    if (prev) dropActor(prev);
    const g = e.id === GHOSTY_ID ? ghostyPuppet() : null;
    const puppet = g ? g.puppet : kit.make(look);
    puppet.root.scale.setScalar(PUPPET_SCALE);
    const face = look.face === "avatar" ? makeFace(e, uid) : null;
    if (face) puppet.setFace(face.texture);
    scene.add(puppet.root);
    a = { puppet, key, x: e.x, y: e.y, yaw: prev?.yaw ?? Math.PI / 2 - e.ang, seen: tick, label: tag(NAME), labelKey: "", face,
      ghosty: g?.model ?? null, giggle: 0, bonk: 0, pillow: null, kx: 0, kz: 0, landed: false, stillT: 0, spot: null, spotT: 0, snap: 0, sx: e.x, sy: e.y, mood: null, moodKey: "" };
    actors.set(e.id, a);
    return a;
  }
  // ── Barquito ── Quien está en el agua va a bordo. Maneja quien se subió con el id más bajo y se
  // queda con el timón al zarpar; los demás van sentados. Todo sale de las posiciones.
  /** Lugares en el barquito (x, z locales; proa en +z): timón en la popa y tres bancas. */
  const SEATS: Array<[number, number]> = [[0, -0.85], [-0.27, -0.25], [0.27, -0.25], [0, 0.25]];
  const MOOR_YAW = Math.PI / 2; // amarrado, de costado a la punta del muelle
  const boat = { x: MOOR.x, y: MOOR.y, bx: -1, by: -1, yaw: MOOR_YAW, captain: null as string | null, crew: [] as string[], said: "" };
  const helm = tag(NAME); helm.style.borderColor = "#85DDCB";
  function updateBoat(frame: WorldFrame) {
    const meId = frame.meId ?? "me", at = new Map<string, Entity>();
    const all = [frame.player, ...frame.others];
    for (const e of all) if (e.kind !== "bot" && e.table === null && isSea(e.x, e.y)) at.set(e === frame.player ? meId : e.id, e);
    const ids = [...at.keys()].sort();
    const lead = boat.captain ? at.get(boat.captain) : undefined;
    // Amarrado, el timón es del id más bajo; ya navegando no cambia de manos hasta que se baje.
    if (!lead || nearMoor(lead.x, lead.y)) boat.captain = ids[0] ?? null;
    const cap = boat.captain ? at.get(boat.captain)! : null;
    const moored = !cap || nearMoor(cap.x, cap.y);
    boat.crew = boat.captain ? [boat.captain, ...ids.filter((id) => id !== boat.captain)] : [];
    // El barquito va con quien maneja; solo, regresa despacio a su amarre.
    const tx = moored ? MOOR.x : cap!.x, ty = moored ? MOOR.y : cap!.y;
    const k = frame.quiet ? 1 : 1 - Math.exp(-dt * (cap ? 9 : 0.9));
    const dx = (tx - boat.x) * k, dy = (ty - boat.y) * k;
    boat.x += dx; boat.y += dy;
    const wantYaw = moored && Math.hypot(tx - boat.x, ty - boat.y) < 6 ? MOOR_YAW : Math.hypot(dx, dy) > 0.05 ? Math.atan2(dx, dy) : boat.yaw;
    boat.yaw = lerpAngle(boat.yaw, wantYaw, frame.quiet ? 1 : 1 - Math.exp(-dt * 4));
    // Lo que leen `constrain` y `route` de tu personaje.
    const mine = boat.crew.indexOf(meId);
    sea.role = mine < 0 ? "ashore" : mine === 0 ? "captain" : "passenger";
    sea.x = cap ? cap.x : MOOR.x; sea.y = cap ? cap.y : MOOR.y;
    sea.boardable = moored && ids.length < BOAT_SEATS;
    // Aviso al cambiar de papel, y etiqueta de quién maneja cuando van varios.
    const say = sea.role === "captain" ? (ids.length > 1 ? "Tú manejas el barquito. Los demás van contigo." : "Tú manejas el barquito: navega con las flechas o tocando el agua.")
      : sea.role === "passenger" ? `Vas de pasajero; maneja ${cap?.first || cap?.name || "alguien"}. Para bajarte, camina hacia la orilla cuando esté cerca.` : "";
    if (say !== boat.said) { boat.said = say; if (say) actions.announce(say); }
    const text = boat.crew.length > 1 && !frame.mini ? (sea.role === "captain" ? "Tú manejas" : `Maneja ${cap?.first || cap?.name || ""}`) : "";
    if (helm.textContent !== text) helm.textContent = text;
    const p = project(wx(boat.x), 3.5, wz(boat.y));
    place(helm, p.x, p.y, !!text && p.front);
  }
  /** Dónde va sentado alguien de la tripulación (coordenadas de three), o `null` si no va a bordo. */
  function seatOf(id: string) {
    const i = boat.crew.indexOf(id);
    if (i < 0) return null;
    const [sx, sz] = SEATS[i % SEATS.length], c = Math.cos(boat.yaw), s = Math.sin(boat.yaw);
    return { x: wx(boat.x) + sx * c + sz * s, z: wz(boat.y) - sx * s + sz * c };
  }

  // ── Almohadazos ── El motor avisa a quién le tocó; aquí se anima. Una sola geometría para todas las almohadas.
  const bonked = new Set<string>();
  const pillowGeo = new THREE.BoxGeometry(0.62, 0.2, 0.44), pillowMat = new THREE.MeshLambertMaterial({ color: "#F4AFAF" });
  /** La pila de almohadas que cargas sobre la cabeza (sólo en tu pantalla). */
  const held: THREE.Mesh[] = [];
  function event(ev: WorldEvent) { if (ev.type === "tickle" && ev.kind === "bonk") bonked.add(ev.entity.id); }
  // Almohadas en el aire: salen de tu cabeza y caen en la de quien tocaste; al llegar, el golpe.
  let meId = "me", throwT = 0;
  /** Beat de la pista: suena sólo en tu pantalla mientras bailas, un compás a la vez. */
  let danceT = 0, danceBar = 0;
  const flying: Array<{ id: string; t: number; mesh: THREE.Mesh; from: THREE.Vector3 }> = [];
  function toss(id: string) {
    const me = actors.get(meId), target = actors.get(id);
    if (!me || !target) { hooks.nudge?.(id, "bonk"); return; }
    const r = me.puppet.root, mesh = new THREE.Mesh(pillowGeo, pillowMat);
    const from = new THREE.Vector3(r.position.x, r.position.y + me.puppet.top * PUPPET_SCALE + 0.2, r.position.z);
    mesh.position.copy(from); scene.add(mesh);
    flying.push({ id, t: 0, mesh, from });
    me.yaw = Math.atan2(target.puppet.root.position.x - r.position.x, target.puppet.root.position.z - r.position.z);
    throwT = 0.45; hooks.sound?.("toss");
  }
  function updateFlying() {
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], target = actors.get(f.id);
      f.t += dt;
      const k = Math.min(1, f.t / TOSS);
      if (!target) { scene.remove(f.mesh); flying.splice(i, 1); continue; }
      const r = target.puppet.root, top = r.position.y + target.puppet.top * PUPPET_SCALE + 0.12;
      f.mesh.position.set(f.from.x + (r.position.x - f.from.x) * k, f.from.y + (top - f.from.y) * k + Math.sin(Math.PI * k) * 1.1, f.from.z + (r.position.z - f.from.z) * k);
      f.mesh.rotation.set(0.2, k * 5, k * 3);
      if (k >= 1) {
        scene.remove(f.mesh); flying.splice(i, 1);
        const len = Math.hypot(r.position.x - f.from.x, r.position.z - f.from.z) || 1;
        target.kx = (r.position.x - f.from.x) / len; target.kz = (r.position.z - f.from.z) / len; target.landed = true;
        hooks.nudge?.(f.id, "bonk");
      }
    }
  }

  function drawActor(e: Entity, frame: WorldFrame, me: boolean) {
    const a = actorFor(e, me ? frame.meId ?? "" : e.id);
    a.seen = tick;
    const dx = e.x - a.x, dy = e.y - a.y, moved = Math.hypot(dx, dy);
    const jumped = moved > 90; // salto (modo tranquilo o corrección del servidor): no es caminar
    a.x = e.x; a.y = e.y;
    const table = e.table !== null ? structure.tables[e.table] : null;
    const seated = !!table && Math.hypot(table.x - e.x, table.y - e.y) < 78;
    // Actividad: quien está quieto sobre un punto de una cosa toma su pose. Sale de la posición, así que
    // todos los clientes ven lo mismo sin que viaje nada nuevo.
    a.stillT = moved < 0.4 ? a.stillT + dt : 0;
    const aboard = e.kind === "bot" ? null : seatOf(me ? frame.meId ?? "me" : e.id);
    const spot = !aboard && !seated && e.table === null && a.stillT > 0.15 ? spotAt(e.x, e.y) : null;
    if (spot !== a.spot && (spot?.x !== a.spot?.x || spot?.y !== a.spot?.y)) {
      a.spotT = 0;
      if (me && spot && spot.thing.id !== "pillows") { actions.announce(spot.action.done); hooks.sound?.(spot.action.sound); }
    }
    a.spot = spot;
    if (spot) { a.spotT += dt; a.sx = spot.x; a.sy = spot.y; }
    a.snap += ((spot ? 1 : 0) - a.snap) * (1 - Math.exp(-dt * 7));
    if (a.snap < 0.002) a.snap = 0;
    const px = e.x + (a.sx - e.x) * a.snap, py = e.y + (a.sy - e.y) * a.snap;
    let want = a.yaw;
    if (aboard) want = boat.yaw;
    else if (spot) want = spot.face;
    else if (seated && table) want = Math.atan2(table.x - e.x, table.y - e.y);
    else if (moved > 0.15 && !jumped) want = Math.atan2(dx, dy);
    else if (e.waveT > 0) want = Math.PI / 2 - e.ang;
    a.yaw = jumped ? want : lerpAngle(a.yaw, want, 1 - Math.exp(-dt * 11));
    const root = a.puppet.root;
    if (aboard) root.position.set(aboard.x, 0.2 + Math.sin(frame.t * 1.3) * (frame.quiet ? 0 : 0.04), aboard.z);
    else root.position.set(wx(px), standHeight(px, py) + (a.spot?.lift ?? 0) * a.snap, wz(py));
    root.rotation.y = a.yaw;
    if (a.ghosty) {
      // De frente a la cámara siempre; con los ojos mira hacia donde va.
      a.ghosty.rotation.y = camTurn - a.yaw;
      if (a.ghosty.visible) (a.ghosty.userData.look as (x: number, y: number) => void)(Math.sin(a.yaw - camTurn) * 0.8, 0);
    }
    // Cosquillas: se retuerce de risa y da brinquitos un momento (el temblor del motor dura muy poco para un muñequito).
    // Almohadazo: la almohada cae sobre la cabeza, el muñequito se aplasta y queda tambaleándose.
    if (bonked.delete(e.id)) {
      a.bonk = BONK; a.giggle = 0;
      // Quien lo vio de lejos no sabe de dónde vino: sale empujado hacia atrás.
      if (!a.landed) { a.kx = -Math.sin(a.yaw); a.kz = -Math.cos(a.yaw); }
    }
    if (a.bonk > 0) {
      a.bonk -= dt;
      const g = 1 - Math.max(0, a.bonk) / BONK, fall = a.landed ? 1 : Math.min(1, g / 0.18), squash = Math.sin(Math.PI * Math.min(1, Math.max(0, (g - 0.14) / 0.4)));
      root.scale.set(PUPPET_SCALE * (1 + squash * 0.16), PUPPET_SCALE * (1 - squash * 0.3), PUPPET_SCALE * (1 + squash * 0.16));
      root.rotation.z = g > 0.3 ? Math.sin(frame.t * 13) * 0.14 * (1 - g) : 0;
      // Retroceso: el golpe lo avienta medio paso y regresa solo.
      const push = Math.sin(Math.PI * Math.min(1, g / 0.6)) * 0.55;
      root.position.x += a.kx * push; root.position.z += a.kz * push;
      if (!a.pillow) { a.pillow = new THREE.Mesh(pillowGeo, pillowMat); scene.add(a.pillow); }
      const top = root.position.y + a.puppet.top * PUPPET_SCALE * (1 - squash * 0.3), away = Math.max(0, (g - 0.3) / 0.7);
      a.pillow.position.set(root.position.x + away * 0.9, top + 0.12 + (1 - fall) * 1.3 + Math.sin(Math.PI * away) * 0.7, root.position.z + away * 0.3);
      a.pillow.rotation.set(0.2, a.yaw, -0.5 + fall * 0.5 - away * 2.4);
      a.pillow.scale.setScalar(1 - away * away);
      if (a.bonk <= 0) { scene.remove(a.pillow); a.pillow = null; a.landed = false; root.scale.setScalar(PUPPET_SCALE); }
    } else if (a.giggle > 0 || e.shakeT > 0) {
      if (a.giggle <= 0) a.giggle = GIGGLE;
      a.giggle -= dt;
      const g = Math.max(0, a.giggle) / GIGGLE;
      root.rotation.z = Math.sin(frame.t * 38) * 0.16 * g;
      root.position.y += Math.abs(Math.sin(frame.t * 19)) * 0.22 * g;
    } else root.rotation.z = 0;
    // Almohadas: al pasar junto a la canasta se toman; las que traes van apiladas sobre tu cabeza.
    if (me) {
      if (!aboard && Math.hypot(e.x - PILLOWS.x, e.y - PILLOWS.y) < PILLOW_GRAB && actions.pillows() < PILLOW_COUNT) {
        actions.setPillows(PILLOW_COUNT);
        actions.announce("Tomaste tres almohadas. Toca a cualquier persona o robot y corres a darle un almohadazo.");
        hooks.sound?.("act-cheer");
      }
      const n = aboard ? 0 : actions.pillows();
      while (held.length < PILLOW_COUNT) { const m = new THREE.Mesh(pillowGeo, pillowMat); m.scale.setScalar(0.8); m.visible = false; scene.add(m); held.push(m); }
      const base = root.position.y + a.puppet.top * PUPPET_SCALE + 0.1, sway = moved > 0.15 ? 0.05 : 0.015;
      held.forEach((m, i) => {
        m.visible = i < n;
        if (!m.visible) return;
        const wob = Math.sin(frame.t * 7 + i * 1.3) * sway * (i + 1);
        m.position.set(root.position.x + wob, base + i * 0.17, root.position.z);
        m.rotation.set(0, a.yaw + (i - 1) * 0.3, wob * 2);
      });
      if (throwT > 0) throwT -= dt;
      if (!aboard && spot?.thing.id === "dance" && a.spotT > 0.2 && !frame.quiet && !frame.mini) {
        if (danceT <= 0) { hooks.sound?.(`dance-${danceBar++ % 4}`); danceT += DANCE_BEAT * 4; }
        danceT -= dt;
      } else { danceT = 0; danceBar = 0; }
    }
    const speed = dt > 0 ? moved / dt : 0;
    a.puppet.pose({
      t: frame.t + e.bob, dt, walked: aboard || jumped || frame.quiet ? 0 : (moved * UNIT) / PUPPET_SCALE,
      pace: Math.min(1, speed / structure.movement.maxSpeed), sitting: seated || !!aboard || !!spot?.action.seated, waving: e.waveT > 0,
      act: me && throwT > 0 ? "cheer" : spot?.action.pose ?? null,
    });
    // Etiqueta con el nombre; la tuya va en menta. En el mapa reducido sólo se marca dónde estás.
    const text = frame.mini ? (me ? "Tú" : "") : e.first || e.name;
    const labelKey = `${text}|${me}`;
    if (labelKey !== a.labelKey) {
      a.labelKey = labelKey; a.label.textContent = text;
      if (me) { a.label.style.borderColor = "#85DDCB"; a.label.style.color = "#85DDCB"; }
    }
    const p = project(root.position.x, root.position.y + (a.puppet.top + (seated ? 0.5 : 0.3)) * PUPPET_SCALE, root.position.z);
    const shown = !!text && p.front && p.x > -60 && p.x < vw + 60 && p.y > -10 && p.y < vh + 40;
    place(a.label, p.x, p.y, shown);
    // Globito de ánimo: un ícono, sin texto, que asoma cada tanto sobre quien lleva rato en lo suyo.
    const moody = !!spot && shown && !frame.mini && !frame.quiet && a.spotT > 3.5 && (a.spotT - 3.5) % 7 < 2.8;
    if (moody && spot) {
      if (!a.mood) { a.mood = tag(MOOD); a.mood.style.opacity = "0"; }
      if (a.moodKey !== spot.action.mood) { a.moodKey = spot.action.mood; a.mood.innerHTML = moodHtml(spot.action.mood); }
      const k = ((a.spotT - 3.5) % 7) / 2.8;
      place(a.mood, p.x, p.y - 22 - Math.min(1, k * 3) * 5, true);
      a.mood.style.opacity = k < 0.85 ? "1" : "0";
    } else if (a.mood) { a.mood.style.opacity = "0"; if (!shown) a.mood.style.display = "none"; }
  }
  const people: Person[] = [];
  const unitPx = (x: number, y: number) => {
    const X = wx(x), Y = Math.max(standHeight(x, y), 0), Z = wz(y), a = project(X, Y, Z), ax = a.x, ay = a.y, b = project(X + 1, Y, Z);
    return Math.hypot(b.x - ax, b.y - ay);
  };

  // ── Cámara inclinada que sigue a tu personaje (o toda la isla en el mapa reducido) ──
  const focus = new THREE.Vector3(); let camDist = 0, camElev = ELEVATION, camReady = false;
  // Rueda del ratón: acerca la cámara a tu personaje, con tope. En el tope la página se desplaza normal.
  let zoom = 1, mini = false;
  const onWheel = (ev: WheelEvent) => {
    if (mini || ev.ctrlKey) return;
    const next = Math.min(1, Math.max(ZOOM_MIN, zoom * Math.exp(ev.deltaY * 0.0015)));
    if (next === zoom) return;
    zoom = next; ev.preventDefault();
  };
  stage.addEventListener("wheel", onWheel, { passive: false });
  // Clic derecho y arrastrar: gira el mapa alrededor de tu personaje, hasta 35° por lado.
  const TURN_MAX = (35 * Math.PI) / 180;
  let turn = 0, camTurn = 0, turning: { id: number; x: number } | null = null;
  const onTurnDown = (ev: PointerEvent) => {
    if (ev.button !== 2 || ev.pointerType !== "mouse" || mini) return;
    turning = { id: ev.pointerId, x: ev.clientX };
    try { stage.setPointerCapture(ev.pointerId); } catch { /* sin captura también sirve */ }
  };
  const onTurnMove = (ev: PointerEvent) => {
    if (!turning || ev.pointerId !== turning.id) return;
    turn = Math.max(-TURN_MAX, Math.min(TURN_MAX, turn - (ev.clientX - turning.x) * 0.006));
    turning.x = ev.clientX;
  };
  const onTurnUp = (ev: PointerEvent) => {
    if (!turning || ev.pointerId !== turning.id) return;
    turning = null;
    try { stage.releasePointerCapture(ev.pointerId); } catch { /* ya se soltó */ }
  };
  stage.addEventListener("pointerdown", onTurnDown);
  stage.addEventListener("pointermove", onTurnMove);
  stage.addEventListener("pointerup", onTurnUp);
  stage.addEventListener("pointercancel", onTurnUp);
  function aimCamera(frame: WorldFrame) {
    const aspect = vw / vh, half = Math.tan((FOV * Math.PI) / 360);
    let tx: number, tz: number, ty = 0.5, dist: number, elev: number;
    mini = !!frame.mini;
    if (frame.mini) {
      tx = 0; tz = 0.6; elev = ELEVATION_MINI;
      dist = Math.max((WORLD_W * UNIT * 0.5 + 1) / (half * aspect), (WORLD_H * UNIT * 0.5 * Math.sin(elev) + 1.5) / half) * 1.04;
    } else {
      // Al acercarse, la cámara también baja: de vista de mapa a vista a la altura del personaje.
      const near = (1 - zoom) / (1 - ZOOM_MIN), ease = near * near * (3 - 2 * near);
      tx = wx(frame.player.x); tz = wz(frame.player.y); elev = ELEVATION + (ELEVATION_CLOSE - ELEVATION) * ease;
      ty = 0.5 + ease * 0.7;
      // En pantalla angosta la cámara se aleja para que quepa lo que hay a los lados.
      dist = DISTANCE * Math.min(1.75, Math.max(1, 1.15 / aspect)) * zoom;
    }
    const k = camReady ? 1 - Math.exp(-dt * (frame.quiet ? 30 : 4.5)) : 1;
    camReady = true;
    focus.x += (tx - focus.x) * k; focus.z += (tz - focus.z) * k; focus.y += (ty - focus.y) * k;
    camDist += (dist - camDist) * k; camElev += (elev - camElev) * k;
    // En el mapa reducido no se gira: se ve la isla completa de frente.
    camTurn += ((frame.mini ? 0 : turn) - camTurn) * (camReady ? 1 - Math.exp(-dt * 10) : 1);
    const flat = Math.cos(camElev) * camDist;
    camera.position.set(focus.x + Math.sin(camTurn) * flat, focus.y + Math.sin(camElev) * camDist, focus.z + Math.cos(camTurn) * flat);
    camera.lookAt(focus);
    const far = camDist / (mini ? 1 : zoom); // la niebla no se acerca con el zoom
    fog.near = far * 1.5; fog.far = far * 4.5;
    camera.updateMatrixWorld();
  }

  function drawPlaces(frame: WorldFrame) {
    const live = new Set<string>();
    for (const p of frame.places) {
      live.add(p.id);
      let t = placeTags.get(p.id);
      if (!t) { t = { el: tag(PLACE), key: "" }; placeTags.set(p.id, t); }
      const status = frame.placeStatus[p.id], near = frame.nearPlace?.id === p.id;
      const seats = p.table !== null ? structure.tables[p.table]?.seats.length ?? 0 : 0;
      const sub = p.table !== null ? `${frame.tableCounts[p.table] ?? 0}/${seats}` : status?.sub ?? "";
      const key = `${p.short}|${sub}|${status?.on ? 1 : 0}|${near ? 1 : 0}|${frame.mini ? 1 : 0}`;
      if (key !== t.key) {
        t.key = key;
        t.el.textContent = "";
        const title = document.createElement("div");
        if (status?.on) {
          const dot = document.createElement("span");
          dot.style.cssText = "display:inline-block;width:7px;height:7px;border-radius:50%;background:#F08A8A;margin-right:6px;vertical-align:1px";
          title.appendChild(dot);
        }
        title.appendChild(document.createTextNode(p.short));
        t.el.appendChild(title);
        if (sub && !frame.mini) {
          const small = document.createElement("div");
          small.style.cssText = `font-size:10.5px;font-weight:500;line-height:14px;color:${status?.on ? "#F2C98A" : "#9AA9A6"}`;
          small.textContent = sub; t.el.appendChild(small);
        }
        t.el.style.borderColor = near ? "#85DDCB" : "#232D33";
        t.el.style.fontSize = frame.mini ? "10px" : "12px";
        t.el.style.padding = frame.mini ? "2px 7px" : "4px 11px";
      }
      const b = BUILDINGS[p.id] ?? { bx: p.x, by: p.y };
      const lift = (LABEL_LIFT[p.kind] ?? 3) * (frame.mini ? 0.75 : 1);
      // La etiqueta de una mesa cuelga de su banderín, para no tapar a quien está sentado.
      const off = p.table !== null && !frame.mini ? FLAG_OFFSET : NO_OFFSET;
      const s = project(wx(b.bx) + off.x, Math.max(heightAt(b.bx, b.by), 0) + lift, wz(b.by) + off.z);
      place(t.el, s.x, Math.max(s.y, 30), s.front && s.x > -80 && s.x < vw + 80 && s.y > -30 && s.y < vh + 60);
    }
    for (const [id, t] of placeTags) if (!live.has(id)) { t.el.remove(); placeTags.delete(id); }
    return live;
  }

  function drawBubbles(frame: WorldFrame) {
    const list = frame.mini ? [] : frame.bubbles;
    list.forEach((b, i) => {
      let el = bubbleTags[i];
      if (!el) { el = bubbleTags[i] = tag(BUBBLE); }
      const a = actors.get(b.entity.id);
      if (!a) { el.style.display = "none"; return; }
      if (el.textContent !== b.text) el.textContent = b.text;
      const k = b.t / b.dur, root = a.puppet.root;
      el.style.opacity = String(Math.min(1, k * 8, (1 - k) * 5));
      const p = project(root.position.x, root.position.y + (a.puppet.top + 0.62) * PUPPET_SCALE, root.position.z);
      place(el, p.x, p.y - Math.min(1, k * 5) * 6, p.front);
    });
    for (let i = list.length; i < bubbleTags.length; i++) bubbleTags[i].style.display = "none";
  }

  function resize(view: View) {
    vw = Math.max(1, view.vw); vh = Math.max(1, view.vh);
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    gl.setSize(vw, vh, false); // el tamaño en pantalla lo da el CSS del escenario
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
  }

  /** `dt` acotado: un cuadro raro (pestaña dormida, reloj que retrocede) no debe romper los suavizados. */
  let dt = 0;
  function render(frame: WorldFrame) {
    if (dead) return;
    tick++;
    dt = Math.min(0.1, Math.max(0, frame.dt || 0));
    if (frame.view.vw !== vw || frame.view.vh !== vh) resize(frame.view);
    aimCamera(frame);
    const visible = drawPlaces(frame);
    updateBoat(frame);
    // Cuerpos con los que choca tu personaje: quien está de pie (ni en mesa, ni en una actividad, ni a bordo).
    crowd.length = 0;
    for (const e of frame.others) if (e.table === null && !isSea(e.x, e.y) && !spotAt(e.x, e.y)) crowd.push({ x: e.x, y: e.y });
    const dirty = island.update({
      boat,
      t: frame.t, dt, quiet: frame.quiet, liveOn: Object.entries(frame.placeStatus).some(([id, s]) => s.on && frame.places.find((p) => p.id === id)?.target === "call"),
      visible, nearId: frame.nearPlace?.id ?? null, tableCounts: frame.tableCounts,
    });
    // La sombra está horneada: si el barquito se movió hay que hornearla otra vez.
    if (dirty || Math.hypot(boat.x - boat.bx, boat.y - boat.by) > 0.5) { gl.shadowMap.needsUpdate = true; boat.bx = boat.x; boat.by = boat.y; }
    meId = frame.player.id;
    drawActor(frame.player, frame, true);
    for (const e of frame.others) drawActor(e, frame, false);
    for (const [id, a] of actors) if (a.seen !== tick) { dropActor(a); actors.delete(id); }
    updateFlying();
    if (frame.marker && !frame.mini) {
      const m = frame.marker, k = (m.t * 1.6) % 1;
      marker.visible = true;
      marker.position.set(wx(m.x), Math.max(standHeight(m.x, m.y), 0) + 0.08, wz(m.y));
      marker.scale.setScalar(1 + k * 0.9); markerMat.opacity = 0.9 * (1 - k * 0.7);
    } else marker.visible = false;
    drawBubbles(frame);
    // Menú de acciones y marcas.
    people.length = 0;
    people.push({ id: frame.player.id, name: frame.player.first || frame.player.name, x: frame.player.x, y: frame.player.y, me: true, human: true });
    for (const e of frame.others) people.push({ id: e.id, name: e.first || e.name, x: e.x, y: e.y, me: false, human: e.kind === "human" });
    actions.frame({
      mini: frame.mini, vw, vh, dt, people, unitPx,
      project: (x, y, h) => project(wx(x), Math.max(standHeight(x, y), 0) + h, wz(y)),
      standNear: (x, y) => nearestWalkable(x, y, 120),
    });
    const g = frame.mini ? null : actions.guide();
    guideRing.visible = !!g;
    if (g) {
      const k = (frame.t * 1.1) % 1;
      guideRing.position.set(wx(g.x), Math.max(standHeight(g.x, g.y), 0) + 0.09, wz(g.y));
      guideRing.scale.setScalar(1 + k * 0.5); guideMat.opacity = 0.95 - k * 0.6;
    }
    gl.render(scene, camera);
  }

  function destroy() {
    if (dead) return;
    dead = true;
    for (const a of actors.values()) dropActor(a);
    actors.clear();
    island.dispose(); kit.dispose();
    markerGeo.dispose(); markerMat.dispose(); guideGeo.dispose(); guideMat.dispose();
    stage.removeEventListener("wheel", onWheel);
    stage.removeEventListener("pointerdown", onTurnDown); stage.removeEventListener("pointermove", onTurnMove);
    stage.removeEventListener("pointerup", onTurnUp); stage.removeEventListener("pointercancel", onTurnUp);
    for (const f of flying) scene.remove(f.mesh);
    for (const m of held) scene.remove(m);
    pillowGeo.dispose(); pillowMat.dispose();
    actions.destroy();
    sun.shadow.map?.dispose(); sun.dispose();
    scene.clear();
    gl.renderLists.dispose();
    // El contexto queda como lo encontramos (three deja prendido el volteo vertical de texturas).
    const raw = gl.getContext();
    raw.pixelStorei(raw.UNPACK_FLIP_Y_WEBGL, false); raw.pixelStorei(raw.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.dispose();
    // El lienzo propio ya no se usa: se suelta su contexto de una vez. El del escenario se deja vivo, por
    // si el mismo mundo se vuelve a montar sobre él (un contexto perdido no se puede volver a pedir).
    if (ownCanvas) gl.forceContextLoss();
    layer.remove();
    ownCanvas?.remove();
  }

  return { resize, render, toScreen, toWorld, event, destroy };
}

