import { useEffect, useRef } from "react";
import {
  AmbientLight, BoxGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  Group, HemisphereLight, Mesh, MeshLambertMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, RingGeometry, Scene, SphereGeometry, Sprite, SpriteMaterial, WebGLRenderer,
} from "three";

/**
 * Isla miniatura estilo diorama (como los demos de Astra + Three.js): bloque de
 * mar con rocas en los costados, isla de arena y pasto, cabaña con humo, faro con
 * haz que gira y letrero "AI", muelle con lancha, palmeras, gaviotas y espuma.
 * Todo primitivas y color plano; sin texturas ni postprocessing. Gira sola,
 * sigue al mouse en desktop, se pausa fuera de pantalla y respeta reduced-motion.
 */
const P = {
  sand: 0xf3e2b3, grass: 0x8dcf6e, grass2: 0x6fbf5a, water: 0x3aa7b8, foam: 0xeafaf7, rock: 0x5c6b70,
  wood: 0xb9895b, wall: 0xf6f1e6, roof: 0x85ddcb, roof2: 0x37ab93, palm: 0x4fae6a, trunk: 0x8a6a48,
  tree: 0xf3a15a, light: 0xfff0b0, slab: 0x2f3f46, slab2: 0x243036,
};
const lam = (color: number, extra: Partial<MeshLambertMaterial> = {}) => new MeshLambertMaterial({ color, ...extra });
const box = (w: number, h: number, d: number, color: number) => new Mesh(new BoxGeometry(w, h, d), lam(color));
const put = (m: Object3D, x: number, y: number, z: number, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; return m; };
const bush = (r: number, color: number) => new Mesh(new SphereGeometry(r, 6, 5), lam(color));

const neonSprite = (text: string) => {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.font = "900 78px 'Archivo Black', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "#8DCF6E"; ctx.shadowBlur = 26; ctx.fillStyle = "#8DCF6E";
  for (let i = 0; i < 3; i++) ctx.fillText(text, 128, 66);
  ctx.shadowBlur = 0; ctx.fillStyle = "#F2F5F4"; ctx.fillText(text, 128, 66);
  const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.8, 1); return s;
};
const palm = (h = 1.4) => {
  const g = new Group();
  const trunk = new Mesh(new CylinderGeometry(0.05, 0.09, h, 6), lam(P.trunk));
  trunk.position.y = h / 2; trunk.rotation.z = 0.12; g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new Mesh(new BoxGeometry(0.7, 0.04, 0.22), lam(P.palm));
    leaf.position.set(0.3, h, 0); leaf.rotation.z = -0.45;
    const pivot = new Group(); pivot.rotation.y = (i / 6) * Math.PI * 2; pivot.add(leaf); pivot.position.set(0.08, 0, 0); g.add(pivot);
  }
  return g;
};

export const IslandDiorama = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 640;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(11.5, 10.5, 13.5); camera.lookAt(0, 0.2, 0);
    scene.add(new HemisphereLight(0xffffff, 0x9fd9d0, 1.1));
    const sun = new DirectionalLight(0xfff3d6, 1.5); sun.position.set(6, 10, 4); scene.add(sun);
    scene.add(new AmbientLight(0xffffff, 0.25));

    const world = new Group(); scene.add(world);

    // el bloque: mar encima, tierra y rocas en los costados
    const SIZE = 7.2;
    world.add(put(box(SIZE, 1.3, SIZE, P.slab), 0, -0.95, 0));
    world.add(put(box(SIZE + 0.02, 0.18, SIZE + 0.02, P.slab2), 0, -0.4, 0));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, side = i % 4;
      const x = side < 2 ? (side ? SIZE / 2 : -SIZE / 2) : Math.cos(a) * SIZE / 2;
      const z = side < 2 ? Math.sin(a) * SIZE / 2 : (side === 2 ? SIZE / 2 : -SIZE / 2);
      world.add(put(bush(0.08 + (i % 3) * 0.04, P.rock), x, -0.7 - (i % 5) * 0.15, z));
    }
    const water = new Mesh(new BoxGeometry(SIZE, 0.32, SIZE), new MeshStandardMaterial({ color: P.water, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92 }));
    water.position.y = -0.16; world.add(water);
    const shallow = new Mesh(new CylinderGeometry(2.9, 3.1, 0.02, 24), lam(0x5ccbc8, { transparent: true, opacity: 0.7 }));
    shallow.position.y = 0.005; world.add(shallow);

    // la isla: arena, pasto en dos tonos, sendero
    world.add(put(new Mesh(new CylinderGeometry(2.4, 2.7, 0.22, 20), lam(P.sand)), 0, 0.1, 0));
    world.add(put(new Mesh(new CylinderGeometry(1.75, 2.1, 0.3, 18), lam(P.grass)), 0.1, 0.32, -0.15));
    world.add(put(new Mesh(new CylinderGeometry(1.0, 1.3, 0.28, 14), lam(P.grass2)), -0.2, 0.55, -0.5));
    for (let i = 0; i < 9; i++) { const t = i / 8; world.add(put(new Mesh(new CylinderGeometry(0.11, 0.11, 0.04, 6), lam(0xd9d3c4)), -1.6 + t * 1.8, 0.38 + (t > 0.5 ? 0.2 : 0), 1.2 - t * 1.3, t)); }

    // cabaña con porche, ventanas encendidas y humo
    const house = new Group();
    house.add(put(box(1.3, 0.8, 1.0, P.wall), 0, 0.4, 0));
    const roof = new Mesh(new ConeGeometry(1.05, 0.6, 4), lam(P.roof)); roof.rotation.y = Math.PI / 4; roof.position.y = 1.1; roof.scale.set(1.15, 1, 0.95); house.add(roof);
    house.add(put(box(0.16, 0.5, 0.16, P.rock), 0.4, 1.15, -0.2));
    house.add(put(box(0.3, 0.42, 0.04, P.roof2), 0, 0.28, 0.52));
    house.add(put(box(0.24, 0.24, 0.04, 0xffe9a3), -0.42, 0.5, 0.52));
    house.add(put(box(0.24, 0.24, 0.04, 0xffe9a3), 0.42, 0.5, 0.52));
    house.add(put(box(1.5, 0.08, 0.5, P.wood), 0, 0.05, 0.75));
    put(house, -0.2, 0.68, -0.5, -0.35); world.add(house);
    const smoke: Mesh[] = [];
    for (let i = 0; i < 4; i++) { const s = bush(0.08, 0xffffff); (s.material as MeshLambertMaterial).transparent = true; world.add(s); smoke.push(s); }

    // faro con haz que gira y letrero AI
    const lh = new Group();
    lh.add(put(new Mesh(new CylinderGeometry(0.22, 0.3, 1.5, 10), lam(P.wall)), 0, 0.75, 0));
    [0.35, 0.85].forEach((y) => lh.add(put(new Mesh(new CylinderGeometry(0.28, 0.29, 0.14, 10), lam(0xe8735a)), 0, y, 0)));
    lh.add(put(new Mesh(new CylinderGeometry(0.2, 0.2, 0.28, 10), lam(0xfff0b0, { emissive: new Color(P.light), emissiveIntensity: 0.9 })), 0, 1.6, 0));
    lh.add(put(new Mesh(new ConeGeometry(0.3, 0.3, 10), lam(0xe8735a)), 0, 1.9, 0));
    const beam = new Mesh(new ConeGeometry(0.45, 2.6, 12, 1, true), new MeshLambertMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false }));
    beam.rotation.z = Math.PI / 2; beam.position.set(1.3, 1.6, 0);
    const beamPivot = new Group(); beamPivot.add(beam); lh.add(beamPivot);
    put(lh, 1.35, 0.45, 0.35); world.add(lh);
    const sign = neonSprite("AI"); sign.position.set(1.35, 3.0, 0.35); world.add(sign);

    // muelle y lancha
    const dock = new Group();
    dock.add(put(box(0.5, 0.06, 1.4, P.wood), 0, 0.12, 0));
    [-0.55, 0, 0.55].forEach((z) => [-0.2, 0.2].forEach((x) => dock.add(put(new Mesh(new CylinderGeometry(0.03, 0.03, 0.5, 5), lam(0x7a5a3a)), x, -0.1, z))));
    put(dock, -1.9, 0, 1.9, 0.4); world.add(dock);
    const boat = new Group();
    boat.add(put(box(0.7, 0.18, 0.32, 0xe8735a), 0, 0.08, 0));
    boat.add(put(box(0.5, 0.06, 0.24, P.wood), 0, 0.2, 0));
    boat.add(put(new Mesh(new CylinderGeometry(0.02, 0.02, 0.7, 5), lam(0xffffff)), 0.05, 0.5, 0));
    const sail = new Mesh(new PlaneGeometry(0.4, 0.5), lam(0xffffff, { side: DoubleSide })); sail.position.set(0.25, 0.55, 0); boat.add(sail);
    put(boat, -2.5, 0, 2.35, 0.4); world.add(boat);

    // palmeras, árbol naranja, arbustos, rocas
    [[-1.4, 0.4, -0.9, 1.5], [1.9, 0.2, -1.2, 1.3], [-1.9, 0.35, 0.4, 1.2], [0.9, 0.4, 1.5, 1.1]].forEach(([x, y, z, h]) => world.add(put(palm(h), x, y, z, x * 3)));
    const tree = new Group();
    tree.add(put(new Mesh(new CylinderGeometry(0.06, 0.1, 0.8, 6), lam(P.trunk)), 0, 0.4, 0));
    [[0, 1.0, 0, 0.42], [0.3, 0.85, 0.1, 0.3], [-0.25, 0.9, -0.15, 0.28]].forEach(([x, y, z, r]) => tree.add(put(bush(r, P.tree), x, y, z)));
    put(tree, 0.9, 0.7, -1.3); world.add(tree);
    ([[-0.9, 0.5, 0.9, 0.16, P.grass2], [0.4, 0.42, 1.3, 0.14, P.grass2], [1.9, 0.35, 0.9, 0.18, P.grass], [-0.4, 0.75, -1.3, 0.2, P.grass2], [1.4, 0.45, 1.6, 0.12, 0xe8735a]] as number[][]).forEach(([x, y, z, r, c]) => world.add(put(bush(r, c), x, y, z)));
    [[2.0, 0.32, 0.4, 0.22], [-2.1, 0.3, -1.4, 0.2], [0.2, 0.3, 2.1, 0.16]].forEach(([x, y, z, r]) => world.add(put(bush(r, P.rock), x, y, z)));

    // espuma y gaviotas
    const rings: Mesh[] = [];
    [[0, 0, 2.75], [0, 0, 2.95], [-2.3, 2.2, 0.55], [1.9, -0.3, 0.8]].forEach(([x, z, r]) => {
      const m = new Mesh(new RingGeometry(r - 0.03, r, 40, 1, 0, Math.PI * 1.4), new MeshLambertMaterial({ color: P.foam, transparent: true, opacity: 0.55, side: DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); world.add(m); rings.push(m);
    });
    const gulls: Group[] = [];
    for (let i = 0; i < 3; i++) {
      const g = new Group();
      [-1, 1].forEach((s) => { const w = new Mesh(new BoxGeometry(0.22, 0.02, 0.06), lam(0xffffff)); w.position.x = s * 0.11; w.rotation.z = s * 0.4; g.add(w); });
      world.add(g); gulls.push(g);
    }

    let mouseX = 0, mouseY = 0;
    const onMove = (e: MouseEvent) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; mouseY = (e.clientY / window.innerHeight - 0.5) * 2; };
    if (!isMobile) window.addEventListener("mousemove", onMove);
    const resize = () => { const s = host.clientWidth; renderer.setSize(s, s, false); camera.aspect = 1; camera.updateProjectionMatrix(); };
    resize(); window.addEventListener("resize", resize);
    let visible = true; const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(host);

    let raf = 0, last = 0, t = 0;
    const frameMs = isMobile ? 1000 / 30 : 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < frameMs) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (!reduced) t += dt;
      world.rotation.y = -0.6 + t * (Math.PI * 2 / 48) + mouseX * 0.15;
      world.rotation.x = mouseY * 0.05;
      world.position.y = Math.sin(t * 0.7) * 0.05;
      beamPivot.rotation.y = t * 1.2;
      boat.position.y = Math.sin(t * 1.6) * 0.03; boat.rotation.z = Math.sin(t * 1.3) * 0.06;
      rings.forEach((r, i) => { r.rotation.z = t * (0.15 + i * 0.05); (r.material as MeshLambertMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 1.5 + i); });
      gulls.forEach((g, i) => {
        const a = t * 0.5 + i * 2.1; g.position.set(Math.cos(a) * (2.2 + i * 0.4), 2.6 + i * 0.35 + Math.sin(t * 2 + i) * 0.1, Math.sin(a) * (2.2 + i * 0.4));
        g.rotation.y = -a; g.children.forEach((w, k) => { w.rotation.z = (k ? 1 : -1) * (0.4 + Math.sin(t * 9 + i) * 0.35); });
      });
      smoke.forEach((s, i) => {
        const k = (t * 0.35 + i * 0.25) % 1; s.position.set(0.12 + Math.sin(k * 6) * 0.05, 1.9 + k * 1.1, -0.65);
        s.scale.setScalar(0.6 + k * 1.2); (s.material as MeshLambertMaterial).opacity = 0.5 * (1 - k);
      });
      sign.scale.set(1.6 * (0.9 + 0.1 * Math.sin(t * 3)), 0.8 * (0.9 + 0.1 * Math.sin(t * 3)), 1);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove);
      renderer.dispose(); host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} aria-hidden className={`aspect-square w-full ${className}`} />;
};

export default IslandDiorama;
