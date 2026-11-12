// Cartucho «Isla Menta» — la isla: terreno, agua, caminos, edificios y adornos, todo procedural con
// primitivas de three (sin modelos ni texturas externas).
//
// Estilo de la casa: low-poly de colores planos, formas redondeadas y sombra suave. Sin contorno,
// sin brillos. El mar es azul verdoso oscuro (nunca negro plano).

import * as THREE from "three";
import {
  BUILDINGS, CAMPFIRE, DOCK, PLACES, PROPS, TABLES, TABLE_TONES, TENTS, TONES, UNIT, WORLD_H, WORLD_W,
  heightAt, landField, pathDistance, seeded, toneOf,
} from "./structure";
import { BENCH, CAFE, DANCE, HAMMOCK, MEGAPHONE, CAFE_STOOLS, CAFE_TABLES, PILLOWS, SCOPE, STANDS } from "./things";

export const SEA = "#12272E";
const C = {
  ink: "#F2F5F4", stone: "#D9E0DE", night: "#141B20", mint: "#85DDCB", mintDark: "#357265", green: "#8DCF6E",
  amber: "#F2C98A", wood: "#8A6A34", woodLight: "#B8915A", straw: "#EBD9B0", lilac: "#BDB5F7", lilacDark: "#5E57A0",
  blue: "#9CC8F2", blueDark: "#4A719A", pink: "#F4AFAF", gray: "#7C8A8E", slate: "#3A474E",
};
const GRASS = ["#8DCF6E", "#82C766", "#98D57B"], SAND = ["#EAD9AC", "#E3D09E"], TRAIL = ["#F0E4C0", "#E9DBB2"];
const CROWNS = ["#4C7A39", "#5C9146", "#6BA552"], PINES = ["#357265", "#3F8475", "#4C7A39"], ROCKS = ["#9AA9A6", "#7C8A8E"];
const PETALS = ["#F4AFAF", "#F2C98A", "#BDB5F7", "#F2F5F4"];

/** Del plano del mapa (px) a la escena. */
export const wx = (x: number) => (x - WORLD_W / 2) * UNIT;
export const wz = (y: number) => (y - WORLD_H / 2) * UNIT;

/** Dónde va el banderín de cada mesa, respecto a su centro (unidades de la escena). */
export const FLAG_AT = { x: -1.55, z: -0.95 };

export type IslandState = { t: number; dt: number; quiet: boolean; liveOn: boolean; visible: Set<string>; nearId: string | null; tableCounts: number[];
  /** El barquito: dónde va (plano del mapa) y hacia dónde apunta la proa. */
  boat: { x: number; y: number; yaw: number } };

export function createIsland(scene: THREE.Scene) {
  const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geos.add(g); return g; };
  const flat = new Map<string, THREE.MeshLambertMaterial>();
  const mat = (color: string) => {
    let m = flat.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, flatShading: true }); flat.set(color, m); mats.add(m); }
    return m;
  };
  const own = <T extends THREE.Material>(m: T) => { mats.add(m); return m; };
  const G = {
    box: geo(new THREE.BoxGeometry(1, 1, 1)),
    cyl: geo(new THREE.CylinderGeometry(1, 1, 1, 12)),
    cyl8: geo(new THREE.CylinderGeometry(1, 1, 1, 8)),
    cone: geo(new THREE.ConeGeometry(1, 1, 10)),
    cone4: geo(new THREE.ConeGeometry(1, 1, 4)),
    tri: geo(new THREE.CylinderGeometry(1, 1, 1, 3)),
    ball: geo(new THREE.IcosahedronGeometry(1, 1)),
    rock: geo(new THREE.DodecahedronGeometry(1, 0)),
    roof: geo(prism()),
  };
  type V3 = [number, number, number];
  const part = (parent: THREE.Object3D, g: THREE.BufferGeometry, color: string | THREE.Material, pos: V3, scale: V3 | number = 1, rot?: V3) => {
    const m = new THREE.Mesh(g, typeof color === "string" ? mat(color) : color);
    m.position.set(...pos);
    if (typeof scale === "number") m.scale.setScalar(scale); else m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const groupAt = (x: number, y: number, lift = 0) => {
    const g = new THREE.Group(); g.position.set(wx(x), Math.max(heightAt(x, y), 0.3) + lift, wz(y)); scene.add(g); return g;
  };

  // ── Terreno: una malla de triángulos planos; el color de cada cara sale de qué es (playa, pasto, camino) ──
  {
    const STEP = 16, x0 = -64, y0 = -64, cols = Math.ceil((WORLD_W + 128) / STEP), rows = Math.ceil((WORLD_H + 128) / STEP);
    const hs = new Float32Array((cols + 1) * (rows + 1));
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) hs[j * (cols + 1) + i] = heightAt(x0 + i * STEP, y0 + j * STEP);
    const pos: number[] = [], col: number[] = [];
    const rnd = seeded(7), tint = new THREE.Color();
    const plazas = PLACES.map((p) => ({ x: p.x, y: p.y, r: p.table !== null ? 0 : p.id === "live" ? 64 : 48 }));
    const tri = (ax: number, ay: number, ah: number, bx: number, by: number, bh: number, cx: number, cy: number, ch: number) => {
      const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3, mh = (ah + bh + ch) / 3, f = landField(mx, my);
      let palette = GRASS;
      if (mh < 0.3 || f < 0.6) palette = SAND;
      else if (pathDistance(mx, my) < 17 || plazas.some((p) => Math.hypot(p.x - mx, p.y - my) < p.r)) palette = TRAIL;
      tint.set(palette[Math.floor(rnd() * palette.length)]);
      if (palette === GRASS && mh > 0.55) tint.lerp(new THREE.Color("#A6DD8A"), Math.min(1, (mh - 0.55) * 2.2));
      pos.push(wx(ax), ah, wz(ay), wx(bx), bh, wz(by), wx(cx), ch, wz(cy));
      for (let k = 0; k < 3; k++) col.push(tint.r, tint.g, tint.b);
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = hs[j * (cols + 1) + i], b = hs[j * (cols + 1) + i + 1], c = hs[(j + 1) * (cols + 1) + i], d = hs[(j + 1) * (cols + 1) + i + 1];
      if (Math.max(a, b, c, d) < -0.6) continue; // fondo del mar: no hace falta
      const xa = x0 + i * STEP, ya = y0 + j * STEP, xb = xa + STEP, yb = ya + STEP;
      // La diagonal se alterna para que el relieve no se vea rayado.
      if ((i + j) % 2) { tri(xa, ya, a, xa, yb, c, xb, ya, b); tri(xb, ya, b, xa, yb, c, xb, yb, d); }
      else { tri(xa, ya, a, xa, yb, c, xb, yb, d); tri(xa, ya, a, xb, yb, d, xb, ya, b); }
    }
    const g = geo(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const terrain = new THREE.Mesh(g, own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    terrain.receiveShadow = true;
    scene.add(terrain);
  }

  // ── Mar: fondo oscuro y, encima, agua translúcida; la playa sumergida se ve como agua bajita ──
  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(400, 400)), own(new THREE.MeshBasicMaterial({ color: "#0F2329" })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.56; scene.add(floor);
  const water = new THREE.Mesh(geo(new THREE.PlaneGeometry(400, 400)), own(new THREE.MeshLambertMaterial({ color: "#237880", transparent: true, opacity: 0.68 })));
  water.rotation.x = -Math.PI / 2; water.receiveShadow = true; scene.add(water);

  // ── Adornos sembrados (una sola malla instanciada por tipo de pieza) ──
  const batches: THREE.InstancedMesh[] = [];
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), color = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const white = own(new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true }));
    const batch = (g: THREE.BufferGeometry, items: Array<{ x: number; y: number; dy: number; s: V3; rot: number; color: string }>, shadow = true) => {
      if (!items.length) return;
      const im = new THREE.InstancedMesh(g, white, items.length);
      items.forEach((it, i) => {
        p.set(wx(it.x), heightAt(it.x, it.y) + it.dy, wz(it.y)); q.setFromAxisAngle(up, it.rot); s.set(...it.s);
        im.setMatrixAt(i, m4.compose(p, q, s)); im.setColorAt(i, color.set(it.color));
      });
      im.castShadow = shadow; im.receiveShadow = true;
      scene.add(im); batches.push(im);
    };
    const trees = PROPS.filter((o) => o.kind === "tree"), pines = PROPS.filter((o) => o.kind === "pine");
    batch(G.cyl8, [...trees, ...pines].map((o) => ({ x: o.x, y: o.y, dy: 0.3 * o.s, s: [0.1 * o.s, 0.7 * o.s, 0.1 * o.s] as V3, rot: o.rot, color: C.wood })));
    batch(G.ball, trees.map((o) => ({ x: o.x, y: o.y, dy: 1.0 * o.s, s: [0.54 * o.s, 0.5 * o.s, 0.54 * o.s] as V3, rot: o.rot, color: CROWNS[o.tone] })));
    batch(G.ball, trees.map((o) => ({ x: o.x + 9 * o.s * Math.cos(o.rot), y: o.y + 9 * o.s * Math.sin(o.rot), dy: 0.78 * o.s, s: [0.4 * o.s, 0.36 * o.s, 0.4 * o.s] as V3, rot: o.rot, color: CROWNS[(o.tone + 1) % 3] })));
    batch(G.cone, pines.map((o) => ({ x: o.x, y: o.y, dy: 0.85 * o.s, s: [0.46 * o.s, 0.9 * o.s, 0.46 * o.s] as V3, rot: o.rot, color: PINES[o.tone] })));
    batch(G.cone, pines.map((o) => ({ x: o.x, y: o.y, dy: 1.4 * o.s, s: [0.33 * o.s, 0.75 * o.s, 0.33 * o.s] as V3, rot: o.rot + 0.4, color: PINES[(o.tone + 1) % 3] })));
    batch(G.ball, PROPS.filter((o) => o.kind === "bush").map((o) => ({ x: o.x, y: o.y, dy: 0.14 * o.s, s: [0.34 * o.s, 0.26 * o.s, 0.34 * o.s] as V3, rot: o.rot, color: CROWNS[o.tone] })));
    batch(G.rock, PROPS.filter((o) => o.kind === "rock").map((o) => ({ x: o.x, y: o.y, dy: 0.08 * o.s, s: [0.3 * o.s, 0.22 * o.s, 0.26 * o.s] as V3, rot: o.rot, color: ROCKS[o.tone] })));
    const petals = PROPS.filter((o) => o.kind === "flower").flatMap((o) => [0, 1, 2].map((k) => ({
      x: o.x + Math.cos(o.rot + k * 2.1) * 7, y: o.y + Math.sin(o.rot + k * 2.1) * 7, dy: 0.07, s: [0.07, 0.06, 0.07] as V3, rot: 0, color: PETALS[(o.tone + k) % 4],
    })));
    batch(G.rock, petals, false);
  }

  // ── El Foro (Sala en vivo): auditorio al aire libre; se nota cuando está abierta ──
  const liveMat = own(new THREE.MeshLambertMaterial({ color: C.slate, flatShading: true }));
  const dotMat = own(new THREE.MeshLambertMaterial({ color: C.gray, flatShading: true }));
  const pulseMat = own(new THREE.MeshBasicMaterial({ color: C.mint, transparent: true, opacity: 0, depthWrite: false }));
  const groups: Record<string, THREE.Group> = {};
  let flag: THREE.Mesh, liveDot: THREE.Mesh;
  const pennants: THREE.Mesh[] = [];
  {
    // Auditorio al aire libre: escenario con pantalla grande al norte y gradas en abanico (las gradas se
    // dibujan abajo, una por asiento). La pantalla y los faroles se encienden cuando la sala está abierta.
    const b = BUILDINGS.live, g = groups.live = groupAt(b.bx, b.by, -0.05);
    part(g, G.box, C.stone, [0, 0.16, 0], [4.4, 0.32, 1.7]);
    part(g, G.box, C.mintDark, [0, 0.34, 0.86], [4.4, 0.08, 0.1]);
    for (const s of [-1, 1]) part(g, G.box, "#EEF2EF", [1.95 * s, 1.5, -0.55], [0.22, 2.5, 0.22]);
    part(g, G.box, C.night, [0, 1.75, -0.55], [3.7, 1.9, 0.14]);
    part(g, G.box, liveMat, [0, 1.75, -0.47], [3.4, 1.6, 0.04]);
    part(g, G.roof, C.mint, [0, 2.75, -0.45], [4.5, 0.5, 1.1]);
    part(g, G.box, C.night, [-1.55, 0.62, 0.45], [0.5, 0.56, 0.4]);
    liveDot = part(g, G.ball, dotMat, [-1.55, 1.02, 0.45], 0.1);
    // Asta con bandera: sólo ondea cuando la sala está abierta.
    part(g, G.cyl8, C.stone, [2.05, 3.5, -0.55], [0.03, 1.6, 0.03]);
    flag = part(g, G.box, C.pink, [2.35, 4.1, -0.55], [0.56, 0.32, 0.03]); flag.castShadow = false;
    // Faroles a los lados del escenario.
    for (const s of [-1, 1]) {
      part(g, G.cyl8, C.slate, [2.6 * s, 0.6, 0.9], [0.05, 1.2, 0.05]);
      part(g, G.ball, liveMat, [2.6 * s, 1.3, 0.9], 0.17);
      const pn = part(g, G.box, s < 0 ? C.mint : C.amber, [2.6 * s + 0.22 * s, 0.95, 0.9], [0.36, 0.22, 0.03]); pn.castShadow = false; pennants.push(pn);
    }
    // Gradas: cada asiento es un escalón de piedra con su tabla; las filas de atrás quedan más altas.
    for (const seat of STANDS) {
      const sg = groupAt(seat.x, seat.y, -0.05), lift = seat.lift ?? 0; sg.rotation.y = seat.face; g.attach(sg);
      if (lift > 0) part(sg, G.box, C.stone, [0, lift / 2 + 0.02, -0.06], [0.84, lift + 0.04, 0.78]);
      part(sg, G.box, C.stone, [0, lift + 0.16, -0.12], [0.8, 0.26, 0.4]);
      part(sg, G.box, C.woodLight, [0, lift + 0.31, -0.12], [0.8, 0.06, 0.44]);
    }
  }
  const livePlace = PLACES.find((p) => p.id === "live")!;
  const pulse = new THREE.Mesh(geo(new THREE.RingGeometry(0.86, 1, 40)), pulseMat);
  pulse.rotation.x = -Math.PI / 2; pulse.position.set(wx(livePlace.x), heightAt(livePlace.x, livePlace.y) + 0.05, wz(livePlace.y)); pulse.renderOrder = 1; scene.add(pulse);

  // ── El Mural (Muro): tablero con notas de colores ──
  {
    const b = BUILDINGS.wall, g = groups.wall = groupAt(b.bx, b.by);
    for (const s of [-1, 1]) part(g, G.box, C.wood, [1.62 * s, 1.1, 0], [0.18, 2.2, 0.18]);
    part(g, G.box, C.stone, [0, 1.3, 0], [3.2, 1.6, 0.14]);
    part(g, G.box, C.mintDark, [0, 2.22, 0.05], [3.7, 0.14, 0.7], [0.12, 0, 0]);
    const rnd = seeded(31);
    for (let k = 0; k < 10; k++) {
      const cx = -1.25 + (k % 5) * 0.62 + (rnd() - 0.5) * 0.1, cy = 1.65 - Math.floor(k / 5) * 0.66 + (rnd() - 0.5) * 0.08;
      part(g, G.box, TONES[(k * 5 + 2) % 6].fill, [cx, cy, 0.09], [0.46, 0.44 + rnd() * 0.1, 0.04], [0, 0, (rnd() - 0.5) * 0.24]).castShadow = false;
    }
  }

  // ── El Cine (Grabaciones): marquesina, pantalla con «play» y dos carretes que giran ──
  const reels: THREE.Group[] = [];
  {
    const b = BUILDINGS.recs, g = groups.recs = groupAt(b.bx, b.by, -0.05);
    part(g, G.box, C.lilacDark, [0, 0.12, 0], [2.9, 0.25, 2.3]);
    part(g, G.box, C.lilac, [0, 1.4, 0], [2.6, 2.3, 2.0]);
    part(g, G.box, C.lilacDark, [0, 2.6, 0], [2.75, 0.14, 2.15]);
    // Marquesina con foquitos y, debajo, la pantalla con el «play».
    part(g, G.box, C.night, [0, 2.25, 1.1], [2.8, 0.3, 0.34]);
    for (let k = 0; k < 6; k++) part(g, G.ball, C.amber, [-1.15 + k * 0.46, 2.07, 1.24], 0.07).castShadow = false;
    part(g, G.box, C.ink, [0, 1.08, 1.02], [1.8, 1.15, 0.06]);
    part(g, G.tri, C.lilacDark, [0.05, 1.08, 1.06], [0.36, 0.05, 0.36], [Math.PI / 2, Math.PI / 2, 0]).castShadow = false;
    for (const s of [-1, 1]) {
      const reel = new THREE.Group(); reel.position.set(0.62 * s, 3.22, 0); g.add(reel); reels.push(reel);
      part(reel, G.cyl, C.stone, [0, 0, 0], [0.56, 0.16, 0.56], [Math.PI / 2, 0, 0]).castShadow = false;
      part(reel, G.cyl, C.lilacDark, [0, 0, 0], [0.14, 0.2, 0.14], [Math.PI / 2, 0, 0]).castShadow = false;
      for (let k = 0; k < 3; k++) part(reel, G.cyl, C.slate, [Math.cos(k * 2.094) * 0.32, Math.sin(k * 2.094) * 0.32, 0], [0.12, 0.18, 0.12], [Math.PI / 2, 0, 0]).castShadow = false;
    }
    part(g, G.box, C.lilacDark, [0, 2.82, 0], [0.5, 0.36, 0.5]);
  }

  // ── La Escuelita (Cursos): casita con techo de dos aguas, torre con reloj y libros gigantes ──
  {
    const b = BUILDINGS.courses, g = groups.courses = groupAt(b.bx, b.by, -0.05);
    part(g, G.box, C.stone, [0, 0.1, 0], [2.8, 0.2, 2.3]);
    part(g, G.box, C.amber, [-0.2, 0.95, 0], [2.2, 1.5, 1.9]);
    part(g, G.roof, C.blueDark, [-0.2, 1.7, 0], [2.5, 0.95, 2.2]);
    part(g, G.box, "#F7E2B8", [0.95, 1.4, 0.5], [0.85, 2.4, 0.85]);
    part(g, G.cone4, C.blueDark, [0.95, 2.98, 0.5], [0.78, 0.8, 0.78], [0, Math.PI / 4, 0]);
    part(g, G.cyl, C.ink, [0.95, 2.1, 0.94], [0.27, 0.05, 0.27], [Math.PI / 2, 0, 0]);
    part(g, G.box, C.night, [0.95, 2.17, 0.98], [0.04, 0.17, 0.02]);
    part(g, G.box, C.night, [1.01, 2.1, 0.98], [0.13, 0.04, 0.02]);
    part(g, G.box, C.wood, [-0.2, 0.62, 0.96], [0.55, 0.85, 0.08]);
    for (const s of [-1, 1]) part(g, G.box, C.blue, [-0.2 + 0.72 * s, 1.05, 0.96], [0.4, 0.42, 0.06]);
    part(g, G.box, C.blue, [0.95, 1.2, 0.94], [0.34, 0.42, 0.06]);
    [C.pink, C.mint, C.lilac].forEach((color, k) => part(g, G.box, color, [-1.75, 0.2 + k * 0.2, 1.25], [0.85 - k * 0.1, 0.19, 0.6 - k * 0.06], [0, 0.25 - k * 0.3, 0]));
  }

  // ── El Campamento: tres mesas con banquitos, fogata y casitas de campaña ──
  const flames: THREE.Mesh[] = [];
  TABLES.forEach((t, i) => {
    const tone = toneOf(TABLE_TONES[i]), g = groups[`t${i}`] = groupAt(t.x, t.y);
    part(g, G.cyl, "#D8BC84", [0, 0.02, 0], [1.9, 0.06, 1.9]).castShadow = false;
    part(g, G.cyl8, C.wood, [0, 0.25, 0], [0.11, 0.5, 0.11]);
    part(g, G.cyl, C.straw, [0, 0.52, 0], [0.66, 0.09, 0.66]);
    part(g, G.cyl8, tone.dark, [0, 0.62, 0], [0.1, 0.12, 0.1]);
    part(g, G.ball, tone.fill, [0, 0.76, 0], 0.11);
    for (const seat of t.seats) {
      const sx = (seat.x - t.x) * UNIT, sz = (seat.y - t.y) * UNIT;
      part(g, G.cyl, tone.fill, [sx, 0.25, sz], [0.25, 0.1, 0.25]);
      part(g, G.cyl8, C.wood, [sx, 0.11, sz], [0.08, 0.22, 0.08]);
    }
    // Banderín con el tono de la mesa.
    part(g, G.cyl8, C.wood, [FLAG_AT.x, 0.95, FLAG_AT.z], [0.04, 1.9, 0.04]);
    const pn = part(g, G.box, tone.fill, [FLAG_AT.x + 0.3, 1.68, FLAG_AT.z], [0.56, 0.3, 0.03]); pn.castShadow = false; pennants.push(pn);
  });
  {
    const g = groupAt(CAMPFIRE.x, CAMPFIRE.y);
    for (let k = 0; k < 7; k++) part(g, G.rock, ROCKS[k % 2], [Math.cos(k * 0.9) * 0.42, 0.06, Math.sin(k * 0.9) * 0.42], [0.14, 0.11, 0.14], [0, k, 0]);
    part(g, G.box, C.wood, [0, 0.1, 0], [0.62, 0.1, 0.12], [0, 0.6, 0]);
    part(g, G.box, C.wood, [0, 0.14, 0], [0.62, 0.1, 0.12], [0, -0.7, 0]);
    flames.push(part(g, G.cone, "#F2B36A", [0, 0.42, 0], [0.2, 0.55, 0.2]), part(g, G.cone, "#F7E2B8", [0.03, 0.34, 0.03], [0.11, 0.34, 0.11]));
    for (const f of flames) f.castShadow = false;
  }
  for (const t of TENTS) {
    const tone = toneOf(t.tone), g = groupAt(t.x, t.y, -0.04); g.rotation.y = t.rot;
    part(g, G.roof, tone.fill, [0, 0, 0], [1.5, 1.05, 1.5], [0, Math.PI / 2, 0]);
    part(g, G.tri, tone.dark, [0, 0.36, 0.76], [0.36, 0.03, 0.36], [Math.PI / 2, Math.PI, 0]).castShadow = false;
  }

  // ── Cosas con las que se hace algo (sus puntos y acciones están en `things.ts`) ──
  // Banca frente al Mural: uno se sienta viendo hacia la cámara.
  {
    const g = groupAt(BENCH.x, BENCH.y);
    part(g, G.box, C.woodLight, [0, 0.3, 0], [1.7, 0.1, 0.44]);
    part(g, G.box, C.woodLight, [0, 0.58, -0.22], [1.7, 0.3, 0.08]);
    for (const s of [-1, 1]) { part(g, G.box, C.wood, [0.7 * s, 0.14, 0], [0.1, 0.28, 0.38]); part(g, G.box, C.wood, [0.7 * s, 0.4, -0.22], [0.08, 0.6, 0.08]); }
  }
  // Mesitas del café con sus banquitos y una taza servida.
  for (const t of CAFE_TABLES) {
    const g = groupAt(t.x, t.y);
    part(g, G.cyl8, C.slate, [0, 0.28, 0], [0.07, 0.56, 0.07]);
    part(g, G.cyl, C.pink, [0, 0.58, 0], [0.42, 0.06, 0.42]);
    part(g, G.cyl8, "#EEF2EF", [0.1, 0.66, 0.05], [0.07, 0.1, 0.07]);
  }
  for (const s of CAFE_STOOLS) {
    const g = groupAt(s.x, s.y);
    part(g, G.cyl8, C.wood, [0, 0.14, 0], [0.1, 0.28, 0.1]);
    part(g, G.cyl, C.woodLight, [0, 0.3, 0], [0.2, 0.06, 0.2]);
  }
  // Canasta de almohadas del campamento: de ahí salen los almohadazos.
  {
    const g = groupAt(PILLOWS.x, PILLOWS.y);
    part(g, G.cyl8, C.wood, [0, 0.16, 0], [0.42, 0.32, 0.42]);
    part(g, G.cyl8, C.woodLight, [0, 0.33, 0], [0.46, 0.05, 0.46]);
    [C.pink, C.lilac, C.mint].forEach((color, k) => part(g, G.box, color, [0.04 * (k - 1), 0.44 + k * 0.15, 0.03 * (1 - k)], [0.5, 0.15, 0.36], [0, 0.4 - k * 0.5, 0.08 * (k - 1)]));
  }
  // Megáfono a un lado de la placita del Foro: desde ahí se echan porras.
  {
    const g = groupAt(MEGAPHONE.x, MEGAPHONE.y);
    part(g, G.cyl8, C.slate, [0, 0.6, 0], [0.05, 1.2, 0.05]);
    part(g, G.cyl8, C.stone, [0, 0.04, 0], [0.2, 0.08, 0.2]);
    part(g, G.cone, C.pink, [0.12, 1.3, 0.1], [0.24, 0.5, 0.24], [0.9, 0, -1.0]);
    part(g, G.cyl, C.ink, [-0.05, 1.2, 0.0], [0.08, 0.16, 0.08], [0.9, 0, -1.0]);
  }
  // Pista de baile: mosaicos de colores planos, postes con banderines y una bocina que late.
  const speakers: THREE.Mesh[] = [];
  {
    const g = groupAt(DANCE.x, DANCE.y);
    part(g, G.box, C.night, [0, 0.03, 0], [3.7, 0.06, 2.3]).castShadow = false;
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) {
      part(g, G.box, TONES[(i * 2 + k * 3) % 6].fill, [-1.4 + i * 0.7, 0.07, -0.7 + k * 0.7], [0.62, 0.04, 0.62]).castShadow = false;
    }
    for (const s of [-1, 1]) {
      part(g, G.cyl8, C.slate, [1.95 * s, 0.9, -1.2], [0.05, 1.8, 0.05]);
      const pn = part(g, G.box, s < 0 ? C.pink : C.mint, [1.95 * s - 0.3 * s, 1.62, -1.2], [0.5, 0.28, 0.03]); pn.castShadow = false; pennants.push(pn);
      part(g, G.box, C.night, [1.3 * s, 0.4, -1.35], [0.62, 0.8, 0.5]);
      const cone = part(g, G.cyl, C.lilac, [1.3 * s, 0.45, -1.09], [0.2, 0.04, 0.2], [Math.PI / 2, 0, 0]); cone.castShadow = false; speakers.push(cone);
      part(g, G.cyl, C.ink, [1.3 * s, 0.45, -1.07], [0.08, 0.03, 0.08], [Math.PI / 2, 0, 0]).castShadow = false;
    }
  }
  // Puesto de café: mostrador, toldo y una taza grande de letrero.
  {
    const g = groupAt(CAFE.x, CAFE.y);
    part(g, G.box, C.woodLight, [0, 0.42, 0], [1.6, 0.84, 0.8]);
    part(g, G.box, C.straw, [0, 0.87, 0.04], [1.75, 0.07, 0.95]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, G.cyl8, C.wood, [0.78 * sx, 1.0, 0.36 * sz], [0.04, 2.0, 0.04]);
    part(g, G.roof, C.pink, [0, 1.95, 0], [1.4, 0.45, 2.0], [0, Math.PI / 2, 0]);
    part(g, G.box, C.ink, [0, 1.93, 0.72], [1.95, 0.1, 0.06]).castShadow = false;
    for (const x of [-0.45, 0.1]) { part(g, G.cyl, C.ink, [x, 0.97, 0.22], [0.07, 0.13, 0.07]); part(g, G.cyl, C.wood, [x, 1.04, 0.22], [0.055, 0.01, 0.055]).castShadow = false; }
    part(g, G.box, C.mintDark, [0.5, 1.02, 0.1], [0.3, 0.24, 0.3]);
    part(g, G.cyl, C.ink, [0, 2.62, 0], [0.24, 0.34, 0.24]);
    part(g, G.cyl, C.wood, [0, 2.8, 0], [0.19, 0.02, 0.19]).castShadow = false;
    part(g, G.box, C.ink, [0.3, 2.62, 0], [0.14, 0.2, 0.07]);
  }
  // Hamaca entre dos postes.
  {
    const g = groupAt(HAMMOCK.x, HAMMOCK.y);
    for (const s of [-1, 1]) { part(g, G.cyl8, C.wood, [1.35 * s, 0.65, 0], [0.07, 1.3, 0.07]); part(g, G.ball, CROWNS[1], [1.35 * s, 1.4, 0], [0.26, 0.2, 0.26]); }
    for (let i = -2; i <= 2; i++) {
      const y = 0.4 + (i / 2) * (i / 2) * 0.5;
      part(g, G.box, i % 2 ? C.ink : C.amber, [i * 0.52, y, 0], [0.6, 0.05, 0.72], [0, 0, i * 0.3]).castShadow = false;
    }
    for (const s of [-1, 1]) part(g, G.box, C.straw, [1.2 * s, 1.0, 0], [0.34, 0.03, 0.03], [0, 0, 0.5 * s]).castShadow = false;
  }
  // Telescopio en el mirador del este.
  {
    const g = groupAt(SCOPE.x, SCOPE.y);
    for (let k = 0; k < 3; k++) part(g, G.cyl8, C.slate, [Math.cos(k * 2.094) * 0.16, 0.5, Math.sin(k * 2.094) * 0.16], [0.03, 1.02, 0.03], [Math.sin(k * 2.094) * 0.3, 0, -Math.cos(k * 2.094) * 0.3]);
    part(g, G.ball, C.slate, [0, 1.02, 0], 0.09);
    part(g, G.cyl, C.lilacDark, [0.1, 1.18, 0], [0.11, 0.95, 0.11], [0, 0, -1.15]);
    part(g, G.cyl, C.ink, [0.52, 1.37, 0], [0.13, 0.08, 0.13], [0, 0, -1.15]).castShadow = false;
    part(g, G.cyl, C.night, [-0.36, 0.97, 0], [0.07, 0.12, 0.07], [0, 0, -1.15]).castShadow = false;
  }

  // ── Muelle, velero y farito (adornos) ──
  {
    const g = new THREE.Group(); g.position.set(wx(DOCK.x), 0, wz(DOCK.y)); scene.add(g);
    part(g, G.box, C.woodLight, [0, 0.15, -0.2], [1.2, 0.08, 2.7]);
    for (const z of [-1.3, -0.2, 0.95]) for (const s of [-1, 1]) part(g, G.cyl8, C.wood, [0.56 * s, 0, z], [0.06, 0.6, 0.06]);
    part(g, G.cyl8, C.slate, [0.56, 0.55, 0.2], [0.04, 0.8, 0.04]);
    part(g, G.ball, C.amber, [0.56, 0.98, 0.2], 0.11);
  }
  // Velero con cuatro lugares; la proa mira a +Z. Lo mueve el renderizador (quien maneja lo lleva).
  const boat = new THREE.Group(); scene.add(boat);
  part(boat, G.box, C.ink, [0, 0.1, 0], [1.1, 0.26, 2.5]);
  part(boat, G.cone4, C.ink, [0, 0.1, 1.55], [0.78, 0.7, 0.18], [Math.PI / 2, Math.PI / 4, 0]);
  part(boat, G.box, C.pink, [0, 0.21, 0], [1.16, 0.06, 2.55]);
  part(boat, G.cyl8, C.wood, [0, 1.05, 0.85], [0.04, 1.8, 0.04]);
  part(boat, G.roof, C.mint, [0.02, 0.5, 0.42], [0.03, 1.35, 0.8]);
  {
    const g = new THREE.Group(); g.position.set(wx(1010), 0, wz(905)); scene.add(g);
    for (let k = 0; k < 5; k++) part(g, G.rock, ROCKS[k % 2], [Math.cos(k * 1.3) * 0.5, 0.05, Math.sin(k * 1.3) * 0.45], [0.5, 0.3, 0.45], [0, k * 1.1, 0]);
    part(g, G.cyl, C.ink, [0, 0.75, 0], [0.3, 1.1, 0.3]);
    part(g, G.cyl, C.pink, [0, 0.75, 0], [0.31, 0.3, 0.31]);
    part(g, G.cyl, C.night, [0, 1.38, 0], [0.36, 0.08, 0.36]);
    part(g, G.cyl8, C.amber, [0, 1.56, 0], [0.2, 0.3, 0.2]);
    part(g, G.cone, C.pink, [0, 1.9, 0], [0.34, 0.4, 0.34]);
  }

  // ── Aro que marca el lugar donde estás parado ──
  const nearRing = new THREE.Mesh(geo(new THREE.RingGeometry(0.93, 1, 48)), own(new THREE.MeshBasicMaterial({ color: C.mint, transparent: true, opacity: 0.85, depthWrite: false })));
  nearRing.rotation.x = -Math.PI / 2; nearRing.visible = false; nearRing.renderOrder = 1; scene.add(nearRing);

  let wasOn: boolean | null = null, lastVisible = "";
  /** Regresa `true` si cambió algo que proyecta sombra (hay que volver a hornear el mapa de sombras). */
  function update(s: IslandState) {
    let dirty = false;
    if (s.liveOn !== wasOn) {
      wasOn = s.liveOn;
      liveMat.color.set(s.liveOn ? C.amber : C.slate);
      dotMat.color.set(s.liveOn ? "#F08A8A" : C.gray);
      flag.visible = s.liveOn;
    }
    const key = [...s.visible].sort().join(",");
    if (key !== lastVisible) {
      lastVisible = key; dirty = true;
      for (const id in groups) groups[id].visible = s.visible.has(id);
    }
    const t = s.quiet ? 0 : s.t;
    water.position.y = Math.sin(t * 0.8) * 0.018;
    boat.position.set(wx(s.boat.x), Math.sin(t * 1.3) * 0.04, wz(s.boat.y)); boat.rotation.set(0, s.boat.yaw, Math.sin(t * 0.9) * 0.04, "YXZ");
    for (const r of reels) r.rotation.z = -t * 0.8;
    speakers.forEach((sp, i) => { const beat = 1 + Math.max(0, Math.sin(t * 6.2 + i)) * 0.22; sp.scale.set(0.2 * beat, 0.04, 0.2 * beat); });
    flames.forEach((f, i) => { f.scale.y = (i ? 0.34 : 0.55) * (1 + Math.sin(t * (9 + i * 4) + i) * 0.16); f.rotation.y = t * 2; });
    pennants.forEach((p, i) => { p.rotation.y = Math.sin(t * 2.4 + i) * 0.22; });
    flag.rotation.y = Math.sin(t * 2.8) * 0.28;
    liveDot.scale.setScalar(s.liveOn ? 0.1 + Math.abs(Math.sin(t * 2.4)) * 0.035 : 0.09);
    // Onda plana en la placita del Foro mientras la sala está abierta.
    if (s.liveOn && !s.quiet) { const k = (t * 0.45) % 1; pulse.visible = true; pulse.scale.setScalar(1.2 + k * 2.2); pulseMat.opacity = 0.5 * (1 - k); }
    else pulse.visible = false;
    const near = s.nearId ? PLACES.find((p) => p.id === s.nearId) : null;
    nearRing.visible = !!near;
    if (near) {
      nearRing.position.set(wx(near.x), heightAt(near.x, near.y) + 0.07, wz(near.y));
      nearRing.scale.setScalar(near.table !== null ? 1.95 : near.id === "live" ? 2.75 : 2.15);
    }
    return dirty;
  }

  function dispose() {
    for (const b of batches) b.dispose();
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }
  return { update, dispose };
}

/** Prisma triangular (techo de dos aguas): base 1×1 centrada, cumbrera a lo largo de X, altura 1. */
function prism() {
  const A = [-0.5, 0, 0.5], B = [0.5, 0, 0.5], Cc = [0.5, 0, -0.5], D = [-0.5, 0, -0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
  const faces = [A, B, F, A, F, E, Cc, D, E, Cc, E, F, D, A, E, B, Cc, F, A, D, Cc, A, Cc, B];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(faces.flat(), 3));
  g.computeVertexNormals();
  return g;
}
