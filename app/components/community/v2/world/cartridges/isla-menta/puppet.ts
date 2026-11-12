// Cartucho «Isla Menta» — los muñequitos. Personaje low-poly chaparrito armado con primitivas de
// three: camina con un ciclo procedural (piernas, brazos, rebote), respira en reposo, se sienta y
// saluda. Las geometrías se comparten entre todos; los materiales, por color.
//
// Estilo de la casa: colores planos, formas redondeadas, sin contorno ni brillos.

import * as THREE from "three";
import type { ShapeId } from "./structure";
import type { PoseId } from "./things";

export type PuppetLook = { shape: ShapeId; fill: string; dark: string; face: "eyes" | "avatar" };
export type PuppetPose = {
  /** Reloj de animación y lo que avanzó. */
  t: number; dt: number;
  /** Lo que caminó en este cuadro, en unidades de three. */
  walked: number;
  /** Velocidad actual como fracción de la tope (0–1). */
  pace: number;
  sitting: boolean;
  waving: boolean;
  /** Pose de actividad (banca, fogata, pista…): la da el punto sobre el que está parado. */
  act?: PoseId | null;
};
export type Puppet = {
  root: THREE.Group;
  /** Altura de la coronilla sobre los pies (para colgar la etiqueta). */
  top: number;
  pose(p: PuppetPose): void;
  setFace(texture: THREE.Texture | null): void;
};

const INK = "#F2F5F4", NIGHT = "#0E1317", STRAW = "#EBD9B0", STEEL = "#7C8A8E";
const SEAT_LIFT = 0.17, HEAD_TILT = -0.26;

/** Las articulaciones que mueve una pose: giros en radianes y desplazamientos en unidades. */
type Joints = {
  legL: number; legR: number; armLx: number; armLz: number; armRx: number; armRz: number;
  y: number; z: number; pitch: number; twist: number; roll: number; headX: number; headZ: number;
};
const REST: Joints = { legL: 0, legR: 0, armLx: 0, armLz: -0.22, armRx: 0, armRz: 0.22, y: 0, z: 0, pitch: 0, twist: 0, roll: 0, headX: HEAD_TILT, headZ: 0 };
const smoothstep = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Cada actividad como función del tiempo: bucles suaves, sin cortes. */
function actJoints(id: PoseId, t: number): Joints {
  const j = { ...REST };
  if (id === "sit") { j.legL = j.legR = -1.45; j.armLx = j.armRx = -0.5; j.y = SEAT_LIFT; }
  else if (id === "perch") {
    const sw = Math.sin(t * 2.2) * 0.22;
    j.legL = -1.25 + sw; j.legR = -1.25 - sw; j.armLx = j.armRx = 0.45; j.armLz = -0.4; j.armRz = 0.4; j.y = -0.1; j.pitch = -0.12; j.headX = HEAD_TILT - 0.08;
  } else if (id === "warm") {
    const rub = Math.sin(t * 5);
    j.armLx = j.armRx = -1.2 + rub * 0.05; j.armLz = -0.02 + rub * 0.1; j.armRz = 0.02 - rub * 0.1; j.y = Math.sin(t * 2) * 0.008; j.pitch = 0.1; j.headX = HEAD_TILT + 0.12;
  } else if (id === "look") {
    const sway = Math.sin(t * 0.7);
    j.armRx = -2.3; j.armRz = -0.3; j.armLx = 0.35; j.armLz = -0.1; j.headX = HEAD_TILT - 0.3; j.headZ = sway * 0.14; j.roll = sway * 0.03;
  } else if (id === "peek") {
    j.pitch = 0.38; j.armRx = -1.7; j.armLx = -1.5; j.headX = -0.12; j.y = Math.sin(t * 1.5) * 0.006; j.legL = -0.3; j.legR = -0.3;
  } else if (id === "cheer") {
    const hop = Math.abs(Math.sin(t * 5.2)), shake = Math.sin(t * 10.4) * 0.18;
    j.y = hop * 0.17; j.armLz = -2.7 + shake; j.armRz = 2.7 - shake; j.legL = hop * 0.22; j.legR = -hop * 0.22; j.headX = HEAD_TILT - 0.15;
  } else if (id === "dance") {
    const b = Math.sin(t * 6.2), turn = Math.sin(t * 3.1);
    j.y = Math.abs(Math.cos(t * 6.2)) * 0.07; j.twist = turn * 0.55; j.armLz = -1.5 - b * 0.9; j.armRz = 1.5 - b * 0.9;
    j.legL = b * 0.35; j.legR = -b * 0.35; j.roll = turn * 0.09; j.headZ = -turn * 0.16;
  } else if (id === "drink") {
    const sip = smoothstep(0.25, 0.7, Math.sin(t * 1.1) * 0.5 + 0.5);
    j.armRx = -0.8 - 1.25 * sip; j.armRz = 0.2 - 0.3 * sip; j.headX = HEAD_TILT - 0.22 * sip;
  } else if (id === "rest") {
    const nod = Math.sin(t * 0.8) * 0.5 + 0.5;
    j.legL = -1.5; j.legR = -1.42; j.y = -0.2; j.pitch = -0.32; j.armLx = j.armRx = 0.75; j.armLz = -0.5; j.armRz = 0.5; j.headX = HEAD_TILT + 0.3 + nod * 0.28;
  } else if (id === "lie") {
    j.pitch = -Math.PI / 2 + 0.12; j.y = 0.64 + Math.sin(t * 1.1) * 0.02; j.z = 0.62; j.armLz = -1.0; j.armRz = 1.0; j.armLx = j.armRx = -0.3;
    j.legL = 0.14; j.legR = -0.1; j.headX = 0.05;
  }
  return j;
}
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export function createPuppetKit() {
  const geos: THREE.BufferGeometry[] = [];
  const keep = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g; };
  const G = {
    body: keep(new THREE.SphereGeometry(0.3, 14, 10)),
    head: keep(new THREE.SphereGeometry(0.3, 16, 12)),
    limb: keep(new THREE.CapsuleGeometry(0.075, 0.14, 3, 8)),
    arm: keep(new THREE.CapsuleGeometry(0.058, 0.15, 3, 8)),
    ball: keep(new THREE.SphereGeometry(1, 10, 8)),
    cap: keep(new THREE.SphereGeometry(0.315, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    ring: keep(new THREE.TorusGeometry(0.295, 0.045, 6, 18)),
    disc: keep(new THREE.CylinderGeometry(1, 1, 1, 18)),
    cone: keep(new THREE.ConeGeometry(1, 1, 10)),
    box: keep(new THREE.BoxGeometry(1, 1, 1)),
    face: keep(new THREE.CircleGeometry(0.2, 24)),
    shadow: keep(new THREE.CircleGeometry(0.4, 20)),
  };
  const mats = new Map<string, THREE.MeshLambertMaterial>();
  const mat = (color: string) => {
    let m = mats.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); mats.set(color, m); }
    return m;
  };
  const shadowMat = new THREE.MeshBasicMaterial({ color: NIGHT, transparent: true, opacity: 0.2, depthWrite: false });

  const mesh = (geo: THREE.BufferGeometry, color: string, parent: THREE.Object3D, pos: [number, number, number], scale?: [number, number, number] | number) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(...pos);
    if (typeof scale === "number") m.scale.setScalar(scale); else if (scale) m.scale.set(...scale);
    parent.add(m);
    return m;
  };

  function make(look: PuppetLook): Puppet {
    const robot = look.shape === "robot";
    const root = new THREE.Group();
    const rig = new THREE.Group(); root.add(rig);
    const shadow = new THREE.Mesh(G.shadow, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; shadow.renderOrder = 2; root.add(shadow);
    const skin = robot ? look.fill : INK, legColor = robot ? STEEL : look.dark;
    // Cada forma cambia un poco la silueta, no sólo el accesorio.
    const build = look.shape === "sombrero" ? { w: 1.14, h: 0.96 } : look.shape === "explorador" ? { w: 0.92, h: 1.1 } : { w: 1, h: 1 };

    // Piernas: el pivote va en la cadera.
    const leg = (side: number) => {
      const hip = new THREE.Group(); hip.position.set(0.115 * side * build.w, 0.3, 0); rig.add(hip);
      mesh(G.limb, legColor, hip, [0, -0.13, 0]);
      mesh(G.ball, legColor, hip, [0, -0.255, 0.035], [0.095, 0.065, 0.14]);
      return hip;
    };
    const legL = leg(-1), legR = leg(1);

    // Torso con brazos (pivote en el hombro).
    const torso = new THREE.Group(); torso.position.y = 0.3; rig.add(torso);
    const bodyY = 0.25 * build.h;
    if (robot) mesh(G.disc, look.dark, torso, [0, bodyY, 0], [0.27, 0.42, 0.24]);
    else mesh(G.body, look.fill, torso, [0, bodyY, 0], [build.w, 1.04 * build.h, 0.9]);
    const arm = (side: number) => {
      const shoulder = new THREE.Group(); shoulder.position.set(0.27 * side * build.w, bodyY + 0.1, 0); shoulder.rotation.z = 0.22 * side; torso.add(shoulder);
      mesh(G.arm, robot ? STEEL : look.fill, shoulder, [0, -0.12, 0]);
      mesh(G.ball, skin, shoulder, [0, -0.25, 0], 0.07);
      return shoulder;
    };
    const armL = arm(-1), armR = arm(1);

    // Cabeza: grande, un poco echada hacia atrás para que la cara se vea desde la cámara alta.
    const head = new THREE.Group(); head.position.y = 0.3 + bodyY * 2 + 0.18; head.rotation.x = HEAD_TILT; rig.add(head);
    let top = head.position.y + 0.32;
    let faceMesh: THREE.Mesh | null = null;
    if (robot) {
      mesh(G.box, look.fill, head, [0, 0.02, 0], [0.54, 0.42, 0.46]);
      mesh(G.box, NIGHT, head, [0, 0.03, 0.225], [0.42, 0.17, 0.03]);
      for (const s of [-1, 1]) mesh(G.ball, "#85DDCB", head, [0.1 * s, 0.03, 0.24], [0.04, 0.05, 0.015]);
      for (const s of [-1, 1]) mesh(G.disc, look.dark, head, [0.29 * s, 0.02, 0], [0.08, 0.05, 0.08]).rotation.z = Math.PI / 2;
      mesh(G.disc, STEEL, head, [0, 0.3, 0], [0.018, 0.18, 0.018]);
      mesh(G.ball, "#F2C98A", head, [0, 0.41, 0], 0.055);
      top = head.position.y + 0.5;
    } else {
      mesh(G.head, skin, head, [0, 0, 0]);
      if (look.face === "avatar") {
        // La cara es un disco con la foto (o las iniciales), enmarcado como una escotilla.
        const rim = mesh(G.disc, look.dark, head, [0, -0.01, 0.245], [0.235, 0.1, 0.235]); rim.rotation.x = Math.PI / 2;
        faceMesh = new THREE.Mesh(G.face, new THREE.MeshBasicMaterial({ color: "#ffffff" }));
        faceMesh.position.set(0, -0.01, 0.297); head.add(faceMesh);
      } else {
        for (const s of [-1, 1]) {
          mesh(G.ball, NIGHT, head, [0.105 * s, 0.01, 0.279], [0.04, 0.06, 0.02]);
          mesh(G.ball, "#F4AFAF", head, [0.185 * s, -0.075, 0.222], [0.05, 0.032, 0.02]);
        }
      }
      // Accesorio de cada forma.
      if (look.shape === "gorro") {
        mesh(G.cap, look.dark, head, [0, 0.03, 0]);
        mesh(G.ring, look.fill, head, [0, 0.05, 0]).rotation.x = Math.PI / 2;
        mesh(G.ball, look.fill, head, [0, 0.37, 0], 0.085);
        top = head.position.y + 0.47;
      } else if (look.shape === "sombrero") {
        const hat = new THREE.Group(); hat.position.set(0, 0.2, -0.1); hat.rotation.x = -0.5; head.add(hat);
        mesh(G.disc, STRAW, hat, [0, 0, 0], [0.42, 0.035, 0.42]);
        mesh(G.disc, STRAW, hat, [0, 0.1, 0], [0.23, 0.2, 0.23]);
        mesh(G.disc, look.dark, hat, [0, 0.045, 0], [0.24, 0.06, 0.24]);
        top = head.position.y + 0.44;
      } else if (look.shape === "orejas") {
        mesh(G.cap, look.fill, head, [0, 0.02, -0.01], 1.03);
        for (const s of [-1, 1]) {
          mesh(G.ball, look.fill, head, [0.2 * s, 0.28, 0], 0.105);
          mesh(G.ball, look.dark, head, [0.2 * s, 0.285, 0.05], 0.06);
        }
        mesh(G.ring, look.dark, torso, [0, bodyY * 2 + 0.01, 0], 0.72).rotation.x = Math.PI / 2;
        top = head.position.y + 0.42;
      } else {
        // Explorador: gorra con visera y mochila.
        mesh(G.cap, look.dark, head, [0, 0.04, 0]);
        mesh(G.disc, look.dark, head, [0, 0.06, 0.25], [0.2, 0.025, 0.2]);
        mesh(G.ball, look.fill, head, [0, 0.355, 0], 0.035);
        mesh(G.box, look.dark, torso, [0, bodyY + 0.02, -0.27], [0.34, 0.36, 0.2]);
        mesh(G.disc, STRAW, torso, [0, bodyY + 0.24, -0.27], [0.07, 0.36, 0.07]).rotation.z = Math.PI / 2;
        top = head.position.y + 0.4;
      }
    }

    // Tacita para «Tomar café»: va en la mano derecha y sólo se ve mientras toma.
    const cup = new THREE.Group(); cup.position.set(0, -0.27, 0.07); cup.visible = false; armR.add(cup);
    mesh(G.disc, INK, cup, [0, 0, 0], [0.06, 0.1, 0.06]);
    mesh(G.disc, "#8A6A34", cup, [0, 0.052, 0], [0.048, 0.01, 0.048]);

    const headY = head.position.y;
    const st = { phase: Math.random() * 6.28, walk: 0, sit: 0, wave: 0, act: 0, actId: null as PoseId | null, seed: Math.random() * 6.28 };
    function pose(p: PuppetPose) {
      const k = 1 - Math.exp(-Math.min(0.1, Math.max(0, p.dt)) * 10);
      const moving = p.walked > 0.0005 && !p.sitting;
      st.walk += ((moving ? 1 : 0) - st.walk) * k;
      st.sit += ((p.sitting ? 1 : 0) - st.sit) * k;
      st.wave += ((p.waving ? 1 : 0) - st.wave) * k;
      // La actividad entra y sale suave; mientras se desvanece se conserva cuál era.
      const act = p.act ?? null;
      if (act && (act === st.actId || st.act < 0.05)) st.actId = act;
      st.act += ((act && act === st.actId ? 1 : 0) - st.act) * k * 0.7;
      if (st.act < 0.01 && !act) st.actId = null;
      // El paso avanza con la distancia recorrida: los pies no patinan.
      st.phase += p.walked * 5.2;
      if (!moving && st.walk < 0.02) st.phase = Math.round(st.phase / Math.PI) * Math.PI; // se detiene con los pies juntos
      const s = Math.sin(st.phase), w = st.walk, stride = 0.55 + 0.35 * p.pace;
      const breath = Math.sin(p.t * 2.1 + st.seed);
      const sit = st.sit;
      // Base: caminar, reposo, sentado en una mesa y saludo.
      const j: Joints = {
        legL: s * stride * w * (1 - sit) - 1.45 * sit,
        legR: -s * stride * w * (1 - sit) - 1.45 * sit,
        armLx: -s * stride * 0.9 * w + 0.5 * sit,
        armRx: s * stride * 0.9 * w * (1 - st.wave) + 0.5 * sit * (1 - st.wave),
        armLz: -0.22 - breath * 0.03 * (1 - w),
        armRz: 0.22 + breath * 0.03 * (1 - w) + st.wave * (2.3 + Math.sin(p.t * 11) * 0.35),
        // Rebote: dos por ciclo, cuando cada pie pisa.
        y: Math.abs(Math.cos(st.phase)) * 0.075 * w * (1 - sit) + sit * SEAT_LIFT,
        z: 0, pitch: 0.13 * w * p.pace * (1 - sit), twist: 0, roll: s * 0.05 * w,
        headX: HEAD_TILT, headZ: -s * 0.045 * w,
      };
      if (st.actId && st.act > 0.001) {
        const a = actJoints(st.actId, p.t), m = st.act * st.act * (3 - 2 * st.act);
        for (const key in j) j[key as keyof Joints] = mix(j[key as keyof Joints], a[key as keyof Joints], m);
      }
      cup.visible = st.actId === "drink" && st.act > 0.4;
      legL.rotation.x = j.legL; legR.rotation.x = j.legR;
      armL.rotation.x = j.armLx; armL.rotation.z = j.armLz;
      armR.rotation.x = j.armRx; armR.rotation.z = j.armRz;
      rig.position.set(0, j.y, j.z);
      rig.rotation.set(j.pitch, j.twist, j.roll);
      torso.scale.y = 1 + breath * 0.022 * (1 - w);
      head.position.y = headY + breath * 0.012 * (1 - w) + Math.abs(Math.cos(st.phase + 0.5)) * 0.018 * w;
      head.rotation.x = j.headX; head.rotation.z = j.headZ;
      shadow.scale.setScalar(1 - Math.abs(Math.cos(st.phase)) * 0.12 * w);
    }
    function setFace(texture: THREE.Texture | null) {
      if (!faceMesh) return;
      const m = faceMesh.material as THREE.MeshBasicMaterial;
      m.map = texture; m.needsUpdate = true;
    }
    root.userData.dispose = () => { if (faceMesh) (faceMesh.material as THREE.Material).dispose(); };
    return { root, top, pose, setFace };
  }

  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of mats.values()) m.dispose();
    shadowMat.dispose();
  }
  return { make, dispose };
}
export type PuppetKit = ReturnType<typeof createPuppetKit>;
