// Ghosty en 3D, sacado del vector OFICIAL (ghosty-rig/ghosty.svg): el cuerpo es la silueta de gBody INFLADA
// (perfil de almohada: centro abombado, orilla redonda, de frente la silueta exacta); ojos, chapitas y lentes son
// los mismos trazos proyectados sobre esa superficie. Nada se
// redibuja ni se repinta: los colores salen del SVG. Se anima, no se muta: los olanes se mecen desde su unión
// en el vertex shader (con amplitud 0 la forma es la exacta) y el cuerpo sólo flota.

const UNITS_TALL = 1.05; // alto final del cuerpo
const BODY_TOP = 28.24, BODY_BASE = 208; // y del vector (de la punta a la base de los olanes)
const CX = 128; // centro horizontal del vector
const HEM_FROM = 182; // desde aquí hacia abajo son olanes (y del vector)

// Desde el 28-oct-2026 el default es el Ghosty MEJORADO: vinil mate sin contorno ni toon, lentes con volumen
// (thickRims), mica de vidrio (lensGlass; dar reflejo con setLensEnv) y chapitas pegadas a la piel (blushFit).
// DEPRECADOS: el de contorno/toon, el de lentes planos y el de chapitas planas. Sólo para reproducir shorts viejos:
// pasar outline/toon/thickRims/lensGlass/blushFit explícitos.
export function makeGhosty3D({ THREE, SVGLoader, gradientMap, INK = "#1B1B1F", outline = false, toon = false, svg = null, url = "ghosty-oficial.svg", thickRims = true, lensGlass = true, skin = null, skinSeed = 7, blushFit = true }) {
  // thickRims: aro con volumen (extruido del trazo oficial, bisel redondo); lensGlass: mica de vidrio en cada aro.
  // Las dos son opt-in: con el default Ghosty sale idéntico a los shorts aprobados.
  // toon:false = sombreado suave (vinil/plastilina) con MeshStandardMaterial, para escenas con luz realista
  const shaded = (opts) => toon ? new THREE.MeshToonMaterial({ ...opts, gradientMap }) : new THREE.MeshStandardMaterial({ ...opts, roughness: 0.72, metalness: 0 });
  const group = new THREE.Group();
  const rig = new THREE.Group(); // flota y respira; el grupo de afuera lo mueve la escena
  group.add(rig);
  const s = UNITS_TALL / (BODY_BASE - BODY_TOP);
  const GRID_X = 90, GRID_Y = 110; // rejilla del inflado
  const BACK = 0.6; // la espalda es más plana que el frente

  // uniforms compartidos por el cuerpo y su contorno: los olanes se mecen igual en los dos
  const hem = { uTime: { value: 0 }, uAmp: { value: 1 } };
  const hemY = (BODY_BASE - HEM_FROM) * s;
  const hemGLSL = `
    float hemW = clamp((${hemY.toFixed(4)} - position.y) / ${hemY.toFixed(4)}, 0.0, 1.0);
    hemW = hemW * hemW;
    transformed.x += sin(uTime * 2.6 + position.x * 9.0) * 0.022 * uAmp * hemW;
    transformed.z += cos(uTime * 2.1 + position.x * 7.0) * 0.03 * uAmp * hemW;`;
  const withHem = (mat, push = 0) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = hem.uTime; sh.uniforms.uAmp = hem.uAmp;
      sh.vertexShader = "uniform float uTime;\nuniform float uAmp;\n" + sh.vertexShader.replace(
        "#include <begin_vertex>",
        `vec3 transformed = position + normal * ${push.toFixed(4)};\n${hemGLSL}`,
      );
    };
    return mat;
  };

  const parts = { pupils: [], body: null };
  const build = (text) => {
    const data = new SVGLoader().parse(text);
    const byId = (id) => data.paths.filter((p) => {
      let n = p.userData?.node;
      while (n) { if (n.id === id) return true; n = n.parentNode; }
      return false;
    });
    const shapesOf = (id) => byId(id).flatMap((p) => SVGLoader.createShapes(p));
    const colorOf = (id) => byId(id)[0]?.color?.getStyle?.() ?? "#ffffff";
    // del vector (y hacia abajo) al mundo (y hacia arriba, base en 0, centrado en x)
    // volteo y + z a la vez (un giro de 180° en x): no invierte el orden de las caras
    const place = (geo) => { geo.translate(-CX, -BODY_BASE, 0); geo.scale(s, -s, -s); return geo; };
    const flip = (geo) => { geo.computeVertexNormals(); return geo; };

    // ---- cuerpo inflado desde la silueta ----
    const contour = shapesOf("gBody")[0].getSpacedPoints(420).map((p) => [p.x, p.y]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of contour) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const R = 0.42 * (maxX - minX);
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
        const [xi, yi] = contour[i], [xj, yj] = contour[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    // distancia al contorno y el punto más cercano
    const nearest = (x, y) => {
      let best = Infinity, bx = 0, by = 0;
      for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
        const [ax, ay] = contour[j], [cx2, cy2] = contour[i];
        const dx = cx2 - ax, dy = cy2 - ay, L = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
        const px = ax + u * dx, py = ay + u * dy, d = Math.hypot(x - px, y - py);
        if (d < best) { best = d; bx = px; by = py; }
      }
      return [best, bx, by];
    };
    const pillow = (d) => { const k = 1 - Math.min(d, R) / R; return R * Math.sqrt(Math.max(0, 1 - k * k)); };
    const pad = 3, x0 = minX - pad, y0 = minY - pad, cw = (maxX - minX + 2 * pad) / GRID_X, ch = (maxY - minY + 2 * pad) / GRID_Y;
    const gx = [], gy = [], gz = [], gin = [];
    for (let j = 0; j <= GRID_Y; j++) for (let i = 0; i <= GRID_X; i++) {
      const x = x0 + i * cw, y = y0 + j * ch, inn = inside(x, y);
      const [d, nx, ny] = nearest(x, y);
      gin.push(inn);
      if (inn) { gx.push(x); gy.push(y); gz.push(pillow(d)); }
      else { gx.push(nx); gy.push(ny); gz.push(0); } // fuera: al contorno, z = 0 (silueta suave)
    }
    const id = (i, j) => j * (GRID_X + 1) + i;
    // altura del frente en cualquier punto del vector (para pegar ojos, chapitas y lentes a la curva)
    const heightAt = (x, y) => {
      const fi = Math.max(0, Math.min(GRID_X - 1e-6, (x - x0) / cw)), fj = Math.max(0, Math.min(GRID_Y - 1e-6, (y - y0) / ch));
      const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
      const z = (a, b) => (gin[id(a, b)] ? gz[id(a, b)] : 0);
      if (inside(x, y)) return pillow(nearest(x, y)[0]);
      return z(i, j) * (1 - u) * (1 - v) + z(i + 1, j) * u * (1 - v) + z(i, j + 1) * (1 - u) * v + z(i + 1, j + 1) * u * v;
    };
    const toWorld = (x, y, z) => [(x - CX) * s, (BODY_BASE - y) * s, z * s];
    // la pupila pregunta la altura en cada cuadro: memo en una rejilla de 1/8 de unidad
    // (sin esto, cada vértice buscaba el punto más cercano de todo el contorno 60 veces por segundo)
    const hMemo = new Map();
    parts.heightAt = (x, y) => {
      const key = Math.round(x * 8) * 100000 + Math.round(y * 8);
      let h = hMemo.get(key);
      if (h === undefined) { h = heightAt(Math.round(x * 8) / 8, Math.round(y * 8) / 8); hMemo.set(key, h); }
      return h;
    };
    const pos = [], idx = [];
    const N = (GRID_X + 1) * (GRID_Y + 1);
    for (let k = 0; k < N; k++) pos.push(...toWorld(gx[k], gy[k], gz[k]));          // frente
    for (let k = 0; k < N; k++) pos.push(...toWorld(gx[k], gy[k], -BACK * gz[k]));  // espalda
    for (let j = 0; j < GRID_Y; j++) for (let i = 0; i < GRID_X; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
      if (!(gin[a] || gin[b] || gin[c] || gin[d])) continue; // celda toda fuera
      idx.push(a, c, b, b, c, d);                         // frente: antihorario visto desde +z
      idx.push(N + a, N + b, N + c, N + b, N + d, N + c); // espalda: al revés
    }
    let bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    bodyGeo.setIndex(idx);
    bodyGeo = mergeVerts(THREE, bodyGeo, 1e-4); // frente y espalda se sueldan en la orilla (z = 0)
    // quita triángulos degenerados que deja la proyección al contorno
    {
      const P = bodyGeo.attributes.position, I = bodyGeo.index.array, keep = [];
      const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      for (let t = 0; t < I.length; t += 3) {
        A.fromBufferAttribute(P, I[t]); B.fromBufferAttribute(P, I[t + 1]); C.fromBufferAttribute(P, I[t + 2]);
        if (B.clone().sub(A).cross(C.clone().sub(A)).lengthSq() > 1e-12) keep.push(I[t], I[t + 1], I[t + 2]);
      }
      bodyGeo.setIndex(keep);
    }
    bodyGeo.computeVertexNormals();
    const bodyColor = colorOf("gBody");
    // skin (opt-in): material de prueba (clay, felt, toy, ceramic, inflatable, jelly); sin skin, el vinil aprobado
    if (skin) ensureCylUV(THREE, bodyGeo);
    const body = new THREE.Mesh(bodyGeo, withHem(skin ? makeSkinMaterial(THREE, skin, bodyColor, skinSeed) : shaded({ color: bodyColor })));
    const line = new THREE.Mesh(bodyGeo, withHem(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }), 0.009));
    rig.add(body);
    if (outline) rig.add(line); // sin contorno combina con escenas horneadas de luz suave
    parts.body = body;

    // piezas del frente: el trazo oficial, cada vértice a la altura del cuerpo en su x, y (siguen la curva)
    // lentes: un plano apenas curvo delante de la cara (las patitas se van hacia atrás suave), nunca dentro del cuerpo
    const zEyes = heightAt(CX, 76);
    const glassesZ = (x, y) => Math.max(heightAt(x, y), zEyes - 0.0016 * (x - CX) * (x - CX));
    parts.glassesZ = glassesZ; parts.toWorld = toWorld; parts.shapesOf = shapesOf; parts.colorOf = colorOf;
    const decal = (id, z, depth, mat) => {
      const shapes = shapesOf(id);
      if (!shapes.length) return null;
      // tapa plana subdividida en triángulos chicos: así sigue la curva y no se hunde en el cuerpo
      const geo = subdivide(THREE, new THREE.ShapeGeometry(shapes, 32).toNonIndexed(), 2.2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const [wx, wy, wz] = toWorld(x, y, id === "gGl" ? glassesZ(x, y) : heightAt(x, y));
        p.setXYZ(i, wx, wy, wz + z);
      }
      // el volteo de y invierte el sentido de las caras: se cambia el orden de dos vértices por triángulo
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1), y = p.getY(i + 1), zz = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, zz);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      rig.add(m);
      return m;
    };
    // siempre por delante del cuerpo aunque se meza: desplazamiento de profundidad
    const flat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -4 * k });
    parts.blush = [decal("gBlushL", 0.006, 0.4, flat(colorOf("gBlushL"), 1)), decal("gBlushR", 0.006, 0.4, flat(colorOf("gBlushR"), 1))].filter(Boolean);
    if (!toon) {
      // vinil: las chapitas del logo (lavanda un poco más oscuro, color oficial) con la orilla difuminada
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.55, "rgba(255,255,255,0.9)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      const soft = new THREE.CanvasTexture(c);
      parts.blush = parts.blush.map((d) => {
        d.geometry.computeBoundingBox();
        const bb = d.geometry.boundingBox, size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3());
        const m = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.25, size.y * 1.45),
          new THREE.MeshBasicMaterial({ map: soft, color: d.material.color.clone().multiplyScalar(0.82), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
        m.position.copy(mid).add(new THREE.Vector3(0, 0, 0.004));
        if (blushFit) {
          // chapita pegada a la piel: plano subdividido, cada vértice a la altura del cuerpo (+ un pelo) y
          // transparente donde ya no hay cuerpo (antes el plano plano flotaba o asomaba junto al aro de 3/4)
          const g = new THREE.PlaneGeometry(size.x * 1.25, size.y * 1.45, 28, 28), P = g.attributes.position;
          const alpha = new Float32Array(P.count * 4);
          for (let i = 0; i < P.count; i++) {
            const wx = P.getX(i) + mid.x, wy = P.getY(i) + mid.y, vx = wx / s + CX, vy = BODY_BASE - wy / s;
            const inn = inside(vx, vy), edge = inn ? Math.min(1, nearest(vx, vy)[0] / 3) : 0; // se desvanece 3 u antes de la orilla
            P.setXYZ(i, P.getX(i), P.getY(i), heightAt(vx, vy) * s + 0.0025);
            alpha.set([1, 1, 1, edge], i * 4);
          }
          g.setAttribute("color", new THREE.BufferAttribute(alpha, 4));
          g.computeVertexNormals();
          m.geometry.dispose(); m.geometry = g;
          m.material.vertexColors = true;
          m.position.set(mid.x, mid.y, 0);
        }
        rig.remove(d); rig.add(m);
        return m;
      });
    }
    for (const b of parts.blush) b.userData.base = b.material.color.clone();
    for (const [id, cx] of [["pupL", 108], ["pupR", 157]]) {
      const pup = decal(id, 0.014, 0.4, flat(colorOf(id), 3)); // ojos negros planos, sin brillo (pedido de bliss)
      if (!pup) continue;
      // pivote en el centro del ojo para parpadear y mirar
      const c = new THREE.Vector3((cx - CX) * s, (BODY_BASE - 76) * s, 0);
      pup.geometry.translate(-c.x, -c.y, 0);
      pup.position.set(c.x, c.y, 0);
      pup.userData.vx = cx;
      // coordenadas del vector de cada vértice: cada cuadro se vuelven a pegar a la curva del cuerpo
      const pa = pup.geometry.attributes.position;
      pup.userData.vxy = Array.from({ length: pa.count }, (_, i) => [(pa.getX(i) + c.x) / s + CX, BODY_BASE - (pa.getY(i) + c.y) / s, pa.getZ(i) - heightAt((pa.getX(i) + c.x) / s + CX, BODY_BASE - (pa.getY(i) + c.y) / s) * s]);
      parts.pupils.push(pup);
    }
    // lentes: el trazo oficial con grosor real, en #D4D4D7, separados un poco de la cara
    // los lentes siempre ganan sobre ojos y chapitas (van por delante en profundidad)
    const glMat = toon ? shaded({ color: colorOf("gGl"), polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -32 })
      : new THREE.MeshStandardMaterial({ color: colorOf("gGl"), metalness: 0.1, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -32 }); // metal satinado
    const gl = thickRims ? rimSolid() : decal("gGl", 0.02, 3.5, glMat); // 3.5 del vector de grueso: un aro real
    if (gl) parts.glasses = gl; // sin tinta: el logo oficial no lleva contorno en los lentes
    if (lensGlass) parts.lenses = lensMicas();
  };

  // ---- aro grueso y mica (opt-in) ----
  // medidas en unidades del vector: la cara trasera del aro queda RIM_GAP delante de la curva glassesZ
  const RIM_GAP = 0, RIM_D = 2.6, RIM_B = 1.0, DOME = 3.6; // el domo nunca sale del frente del aro
  // cara trasera del aro: un plano por lente (inclinado como la cara en su centro), unidos en el puente.
  // Cada plano se acerca a la piel lo más posible: el aro a RIM_SKIN de la cara y la mica por encima de los ojos
  const RIM_SKIN = 0.9, EYE_TOP = 0.014 / (UNITS_TALL / (BODY_BASE - BODY_TOP)), MICA_CLEAR = 0.7;
  const LENS_C = [[89.21, 79.73], [166.79, 79.73]], LENS_R = 32.3, LENS_RIN = 27.5;
  let rimPlanes = null;
  const zOf = (x, y) => {
    if (!rimPlanes) {
      const H = parts.heightAt;
      rimPlanes = LENS_C.map(([cx, cy]) => {
        // la mitad de la inclinación de la cara: los dos lentes casi de frente, como armazón real (y el puente no se tuerce)
        const e = 10, gx = 0.5 * (H(cx + e, cy) - H(cx - e, cy)) / (2 * e), gy = 0.5 * (H(cx, cy + e) - H(cx, cy - e)) / (2 * e);
        let a = -Infinity;
        for (let r = 0; r <= LENS_R; r += 1) for (let k = 0; k < 72; k++) {
          const t = (k / 72) * Math.PI * 2, x = cx + r * Math.cos(t), y = cy + r * Math.sin(t), h = H(x, y);
          if (h <= 0) continue; // fuera del cuerpo no hay piel
          // dentro del hueco manda la mica (base del aro + RIM_B/2) contra la tapa del ojo; en el aro, la piel
          const need = r < LENS_RIN ? EYE_TOP + MICA_CLEAR - RIM_B * 0.5 : RIM_SKIN;
          a = Math.max(a, h + need - (gx * (x - cx) + gy * (y - cy)));
        }
        return (x, y) => a + gx * (x - cx) + gy * (y - cy);
      });
    }
    // cada aro en su plano; el puente (entre las orillas interiores de los aros) va recto de un plano al otro
    // y, si hace falta, se levanta en arco para no rozar la piel (mezclar los planos lo torcía como listón)
    const xa = LENS_C[0][0] + LENS_RIN + 4.8, xb = LENS_C[1][0] - LENS_RIN - 4.8;
    if (x <= xa) return rimPlanes[0](x, y);
    if (x >= xb) return rimPlanes[1](x, y);
    const t = (x - xa) / (xb - xa), za = rimPlanes[0](xa, y), zb = rimPlanes[1](xb, y);
    return za + (zb - za) * t + bridgeLift * Math.sin(Math.PI * t);
  };
  let bridgeLift = 0;
  const fitBridge = () => {
    zOf(CX, 64); // arma los planos
    const H = parts.heightAt, xa = LENS_C[0][0] + LENS_RIN + 4.8, xb = LENS_C[1][0] - LENS_RIN - 4.8;
    let need = 0;
    for (let x = xa; x <= xb; x += 0.5) for (let y = 58; y <= 70; y += 0.5) {
      const t = (x - xa) / (xb - xa), base = rimPlanes[0](xa, y) + (rimPlanes[1](xb, y) - rimPlanes[0](xa, y)) * t;
      need = Math.max(need, (H(x, y) + RIM_SKIN - base) / Math.max(0.2, Math.sin(Math.PI * t)));
    }
    bridgeLift = need;
  };
  // del vector al mundo con la y volteada: hay que invertir el sentido de cada triángulo
  const flipWinding = (geo) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i += 3) {
      for (const a of [p, uv].filter(Boolean)) {
        const n = a.itemSize, t = [];
        for (let k = 0; k < n; k++) t.push(a.getComponent(i + 1, k));
        for (let k = 0; k < n; k++) { a.setComponent(i + 1, k, a.getComponent(i + 2, k)); a.setComponent(i + 2, k, t[k]); }
      }
    }
  };
  const rimSolid = () => {
    fitBridge();
    const shapes = parts.shapesOf("gGl");
    if (!shapes.length) return null;
    // bisel hacia adentro (offset = -size): la orilla exterior sigue siendo exactamente el trazo oficial
    let geo = new THREE.ExtrudeGeometry(shapes, { depth: RIM_D, bevelEnabled: true, bevelThickness: RIM_B, bevelSize: 0.75, bevelOffset: -0.75, bevelSegments: 4, curveSegments: 40 });
    geo = geo.index ? geo.toNonIndexed() : geo;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const [wx, wy, wz] = parts.toWorld(x, y, zOf(x, y) + RIM_GAP + RIM_B + z);
      p.setXYZ(i, wx, wy, wz);
    }
    flipWinding(geo);
    creasedNormals(THREE, geo, 60); // suave en el bisel, sin soldar vértices (soldar abría grietas oscuras)
    // acetato satinado: mismo #D4D4D7, menos «metal rígido», un barniz suave
    const mat = makeRimMaterial(THREE, parts.colorOf("gGl"));
    const m = new THREE.Mesh(geo, mat);
    rig.add(m);
    // patitas: de la punta de cada patita del trazo, hacia atrás por el costado hasta meterse en la cabeza
    const H = parts.heightAt;
    for (const [x0, y0, sg] of [[51.6, 73.3, -1], [204.4, 73.3, 1]]) {
      let xe = CX; // orilla del cuerpo a esa altura
      while (H(xe + sg, y0 + 1) > 0 && Math.abs(xe - CX) < 120) xe += sg;
      const zc = zOf(x0, y0) + RIM_B + RIM_D * 0.5;
      const P = [[x0 - sg * 1.5, y0, zc], [x0 + sg * 1.2, y0 + 0.3, zc * 0.55], [xe + sg * 1.6, y0 + 0.8, zc * 0.12], [xe + sg * 0.6, y0 + 1.2, -2.2], [xe - sg * 3.5, y0 + 1.5, -4]];
      const curve = new THREE.CatmullRomCurve3(P.map(([x, y, z]) => new THREE.Vector3(...parts.toWorld(x, y, z))));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 1.55 * s, 12, false), mat);
      rig.add(tube);
    }
    return m;
  };
  const lensMicas = () => {
    const holes = parts.shapesOf("gGl").flatMap((sh) => sh.holes).filter((h) => {
      const b = new THREE.Box2().setFromPoints(h.getPoints(24));
      return b.max.x - b.min.x > 20; // sólo los dos huecos grandes (los lentes)
    });
    const mat = makeLensGlassMaterial(THREE);
    return holes.map((h) => {
      // malla polar limpia (centro + anillos hacia el contorno del hueco): sin uniones en T, normales curvas
      // elipse ajustada al hueco (un poco más grande: la orilla queda escondida en el aro). El contorno del trazo
      // tiene un piquito junto al puente que daba normales rotas y rayas de brillo
      const hb = new THREE.Box2().setFromPoints(h.getPoints(64)), c = hb.getCenter(new THREE.Vector2()), hs = hb.getSize(new THREE.Vector2()).multiplyScalar(0.515);
      const pts = Array.from({ length: 64 }, (_, j) => new THREE.Vector2(c.x + hs.x * Math.cos((j / 64) * 6.2832), c.y + hs.y * Math.sin((j / 64) * 6.2832)));
      // base plana (plano tangente de glassesZ en el centro) + domo: curvatura limpia, sin quiebres
      const e = 1.5, z0 = zOf(c.x, c.y), gx = (zOf(c.x + e, c.y) - zOf(c.x - e, c.y)) / (2 * e), gy = (zOf(c.x, c.y + e) - zOf(c.x, c.y - e)) / (2 * e);
      const baseZ = (x, y) => z0 + gx * (x - c.x) + gy * (y - c.y);
      const NR = 10, NS = pts.length, pos = [], idx = [];
      const put = (x, y, rho) => {
        // mica a media altura del aro, abombada hacia el frente (curva real: el reflejo se deforma y se mueve)
        const [wx, wy, wz] = parts.toWorld(x, y, baseZ(x, y) + RIM_GAP + RIM_B * 0.5 + DOME * (1 - rho ** 4)); // curva más fuerte cerca del aro: ahí cae el brillo de la luz
        pos.push(wx, wy, wz);
      };
      put(c.x, c.y, 0);
      for (let i = 1; i <= NR; i++) for (const p of pts) { const k = i / NR; put(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k, k); }
      const V = (i, j) => (i === 0 ? 0 : 1 + (i - 1) * NS + (j % NS));
      // la y se voltea al pasar al mundo: el orden va al revés para que la cara mire al frente
      for (let j = 0; j < NS; j++) idx.push(0, V(1, j + 1), V(1, j));
      for (let i = 1; i < NR; i++) for (let j = 0; j < NS; j++) idx.push(V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i, j), V(i + 1, j + 1), V(i + 1, j));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      { // que las normales miren a la cámara (+z); si no, se voltea el orden
        const n = geo.attributes.normal; if (n.getZ(0) < 0) { idx.reverse(); geo.setIndex(idx); geo.computeVertexNormals(); }
      }
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = 5; // transparente: después de ojos y cuerpo, sin escribir profundidad
      rig.add(m);
      return m;
    });
  };

  // mirada y parpadeo (los ojos se mueven completos, dentro de su contorno)
  const eye = { x: 0, y: 0, tx: 0, ty: 0, blinkAt: -9 };
  group.userData.look = (x, y) => { eye.tx = Math.max(-1, Math.min(1, x)); eye.ty = Math.max(-1, Math.min(1, y)); };
  group.userData.blink = (t) => { eye.blinkAt = t; };
  // sonrojo: las chapitas se ponen rosas y crecen un poco, y vuelven a su color oficial
  let blushAt = -9;
  const PINK = new THREE.Color("#F27FA0");
  group.userData.blush = (t) => { blushAt = t; };
  group.userData.hemAmp = hem.uAmp;
  // ojos expresivos (opcional): scale agranda las pupilas, squint las entrecierra (0..1). Por defecto no cambian nada
  const eyes = group.userData.eyes = { scale: 1, squint: 0 };
  group.userData.update = (t, dt = 1 / 60) => {
    hem.uTime.value = t;
    // flota (sin estirones): sube y baja y se mece apenas desde la base
    rig.position.y = 0.04 + Math.sin(t * 2.2) * 0.035;
    rig.rotation.z = Math.sin(t * 1.1) * 0.035;
    const bk = (t - blushAt) / 1.8, bw = bk >= 0 && bk < 1 ? Math.sin(Math.min(bk * 4, 1) * Math.PI / 2) * (bk > 0.6 ? 1 - (bk - 0.6) / 0.4 : 1) : 0;
    for (const b of parts.blush ?? []) {
      b.material.color.copy(b.userData.base).lerp(PINK, bw);
      b.scale.setScalar(1 + bw * 0.25);
    }
    const k = 1 - Math.exp(-dt * 14);
    eye.x += (eye.tx - eye.x) * k; eye.y += (eye.ty - eye.y) * k;
    const b = t - eye.blinkAt, lid = b >= 0 && b < 0.14 ? Math.sin((b / 0.14) * Math.PI) : 0;
    for (const p of parts.pupils) {
      p.position.x = p.userData.cx ?? (p.userData.cx = p.position.x);
      p.position.y = p.userData.cy ?? (p.userData.cy = p.position.y);
      p.position.x += eye.x * 3 * s; p.position.y += -eye.y * 3 * s; // poquito: la pupila nunca se sale del aro del lente
      // la pupila se desliza SOBRE la cara: cada vértice toma la altura del cuerpo en su nuevo lugar
      const H = parts.heightAt, base = p.userData.vxy;
      const dx = eye.x * 3, dy = eye.y * 3;
      // sólo se re-asienta si la mirada se movió de verdad
      if (H && base && (Math.abs(dx - (p.userData.lx ?? 1e9)) > 0.01 || Math.abs(dy - (p.userData.ly ?? 1e9)) > 0.01)) {
        p.userData.lx = dx; p.userData.ly = dy;
        const pa = p.geometry.attributes.position;
        for (let i = 0; i < base.length; i++) pa.setZ(i, H(base[i][0] + dx, base[i][1] + dy) * s + base[i][2]);
        pa.needsUpdate = true;
        p.position.z = 0;
      }
      p.scale.x = eyes.scale;
      p.scale.y = (1 - Math.max(lid, eyes.squint) * 0.88) * eyes.scale;
    }
  };

  group.userData.ready = svg ? Promise.resolve(build(svg)) : fetch(url).then((r) => r.text()).then(build);
  return group;
}

// aro de los lentes (Ghosty y flamitas): acetato gris claro satinado, con volumen y un barniz suave
export function makeRimMaterial(THREE, color = "#D4D4D7") {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
}

// mica de vidrio: sólo aporta lo que refleja (mezcla aditiva sobre un difuso negro), así los ojos detrás
// siguen negros y nítidos y el brillo sale de la luz y del entorno reales: se mueve con la cámara y con el
// personaje. El entorno va SÓLO en la mica: setLensEnv(pmremTexture) (p. ej. RoomEnvironment con PMREM).
const glassMats = new Set();
let lensEnv = null;
export function setLensEnv(tex) { lensEnv = tex; for (const m of glassMats) { m.envMap = tex; m.needsUpdate = true; } }
export function makeLensGlassMaterial(THREE) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, roughness: 0.14, ior: 1.52, specularIntensity: 1, specularColor: 0xffffff,
    clearcoat: 1, clearcoatRoughness: 0.03, envMap: lensEnv, envMapIntensity: 4,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  glassMats.add(m);
  return m;
}

// flamitas (glb de _shared/flamita-3d): mismo aro y misma mica que Ghosty, aplicados por nombre de nodo.
// { skin } opcional: el mismo material de prueba que Ghosty, con el color propio de cada flamita
// lensReflect:false = mica sin reflejo (referencia para comparar, pedida por bliss el 28-oct)
export function dressFlamita(THREE, root, { skin = null, seed = 7, lensReflect = true } = {}) {
  const glass = makeLensGlassMaterial(THREE);
  if (!lensReflect) { glass.specularIntensity = 0; glass.clearcoat = 0; glass.envMapIntensity = 0; }
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (skin && o.name === "body") {
      o.geometry = o.geometry.clone(); ensureCylUV(THREE, o.geometry);
      o.material = makeSkinMaterial(THREE, skin, o.material.color.clone(), seed);
      return;
    }
    const name = (o.name + "|" + (o.parent?.name ?? "")).toLowerCase();
    if (name.includes("lenses")) { o.material = glass; o.renderOrder = 5; }
    else if (name.includes("glasses")) o.material = makeRimMaterial(THREE);
  });
  return root;
}

// normales suaves por posición, sólo entre caras a menos de `deg` grados (geometría no indexada)
function creasedNormals(THREE, geo, deg) {
  const P = geo.attributes.position, n = P.count, cos = Math.cos((deg * Math.PI) / 180);
  const fn = [], groups = new Map(), key = (i) => `${Math.round(P.getX(i) * 1e5)},${Math.round(P.getY(i) * 1e5)},${Math.round(P.getZ(i) * 1e5)}`;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    A.fromBufferAttribute(P, t); B.fromBufferAttribute(P, t + 1); C.fromBufferAttribute(P, t + 2);
    const f = B.clone().sub(A).cross(C.clone().sub(A)); // pesa por área
    fn.push(f, f, f);
  }
  for (let i = 0; i < n; i++) { const k = key(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const own = fn[i].clone().normalize(), acc = new THREE.Vector3();
    for (const j of groups.get(key(i))) {
      const f = fn[j]; if (f.lengthSq() < 1e-20) continue;
      if (f.clone().normalize().dot(own) >= cos) acc.add(f);
    }
    if (acc.lengthSq() < 1e-20) acc.copy(own);
    acc.normalize(); out[i * 3] = acc.x; out[i * 3 + 1] = acc.y; out[i * 3 + 2] = acc.z;
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(out, 3));
}

// parte cada triángulo hasta que ninguna arista mida más de maxLen (en unidades del vector)
function subdivide(THREE, geo, maxLen) {
  const src = geo.attributes.position.array, out = [];
  const stack = [];
  for (let i = 0; i < src.length; i += 9) stack.push(Array.from(src.slice(i, i + 9)));
  const d2 = (a, b, t) => (t[a * 3] - t[b * 3]) ** 2 + (t[a * 3 + 1] - t[b * 3 + 1]) ** 2;
  while (stack.length) {
    const t = stack.pop();
    const e = [d2(0, 1, t), d2(1, 2, t), d2(2, 0, t)], m = Math.max(...e);
    if (m <= maxLen * maxLen) { out.push(...t); continue; }
    const k = e.indexOf(m), a = k, b = (k + 1) % 3, c = (k + 2) % 3;
    const mid = [0, 1, 2].map((q) => (t[a * 3 + q] + t[b * 3 + q]) / 2);
    const V = (i) => t.slice(i * 3, i * 3 + 3);
    const tri = (x, y, z) => { const r = [...x, ...y, ...z]; return r; };
    // conserva el sentido: (a, mid, c) y (mid, b, c)
    const order = [V(0), V(1), V(2)];
    order[b] = mid; stack.push(order.flat());
    const order2 = [V(0), V(1), V(2)];
    order2[a] = mid; stack.push(order2.flat());
    void tri;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  return g;
}

// junta vértices duplicados (para que el contorno empujado por la normal no se abra en las aristas)
function mergeVerts(THREE, geo, tol = 1e-3) {
  const pos = geo.attributes.position, map = new Map(), verts = [], index = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = `${Math.round(x / tol)},${Math.round(y / tol)},${Math.round(z / tol)}`;
    let id = map.get(key);
    if (id === undefined) { id = verts.length / 3; verts.push(x, y, z); map.set(key, id); }
    index.push(id);
  }
  const src = geo.index;
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  out.setIndex(src ? Array.from(src.array, (i) => index[i]) : index);
  return out;
}

// ======================= pruebas de material (skins, opt-in) =======================
// Todo procedural y con semilla: alturas en un Float32Array que se repite sin costura en u y v, de ahí un
// normal map en canvas. Mismo seed → misma textura en cada render (determinista para el pipeline).
export const SKINS = ["clay", "felt", "toy", "ceramic", "inflatable", "jelly"];

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// UV cilíndricas para cuerpos que no traen (Ghosty inflado, flamitas): la costura queda en la espalda
export function ensureCylUV(THREE, geo) {
  if (geo.attributes.uv) return geo;
  geo.computeBoundingBox();
  const b = geo.boundingBox, P = geo.attributes.position, uv = new Float32Array(P.count * 2);
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = b.max.y - b.min.y || 1;
  for (let i = 0; i < P.count; i++) {
    uv[i * 2] = Math.atan2(P.getX(i) - cx, P.getZ(i) - cz) / (2 * Math.PI) + 0.5;
    uv[i * 2 + 1] = (P.getY(i) - b.min.y) / h;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

const N = 512;
const wrap = (i) => ((i % N) + N) % N;
// mancha gaussiana con signo, con vuelta en los bordes
function stamp(H, x, y, rx, ry, amp, rot = 0) {
  const R = Math.ceil(Math.max(rx, ry) * 2.5), c = Math.cos(rot), s = Math.sin(rot);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d = u * u + v * v;
    if (d < 6.25) H[wrap(y + dy) * N + wrap(x + dx)] += amp * Math.exp(-d);
  }
}
// ruido de valor que se repite (rejilla de `cells`)
function valueNoise(H, r, cells, amp) {
  const g = Array.from({ length: cells * cells }, () => r() * 2 - 1), k = N / cells;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = x / k, fy = y / k, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const G = (i, j) => g[((j % cells) * cells) + (i % cells)];
    const a = G(x0, y0) + (G(x0 + 1, y0) - G(x0, y0)) * sx, b = G(x0, y0 + 1) + (G(x0 + 1, y0 + 1) - G(x0, y0 + 1)) * sx;
    H[y * N + x] += amp * (a + (b - a) * sy);
  }
}
function heightFor(skin, seed) {
  const H = new Float32Array(N * N), r = rng(seed * 1000 + skin.length);
  if (skin === "clay") {
    // plastilina: abolladuras de pulgar, huellas digitales (arcos concéntricos) y rayones de palillo
    valueNoise(H, r, 8, 0.25);
    for (let i = 0; i < 70; i++) stamp(H, r() * N | 0, r() * N | 0, 10 + r() * 22, 8 + r() * 16, -(0.5 + r() * 0.6), r() * 3.14);
    for (let f = 0; f < 9; f++) {
      const cx = r() * N, cy = r() * N, rad = 26 + r() * 22, freq = 0.9 + r() * 0.3, rot = r() * 6.28, el = 0.6 + r() * 0.3;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const u = dx * Math.cos(rot) + dy * Math.sin(rot), v = (-dx * Math.sin(rot) + dy * Math.cos(rot)) / el, d = Math.hypot(u, v);
        if (d < rad) H[wrap(cy + dy | 0) * N + wrap(cx + dx | 0)] += 0.16 * Math.sin(d * freq) * (1 - d / rad) ** 0.7;
      }
    }
    for (let i = 0; i < 14; i++) {
      let x = r() * N, y = r() * N; const a = r() * 6.28, len = 30 + r() * 60;
      for (let t = 0; t < len; t += 1.5) stamp(H, (x + Math.cos(a) * t) | 0, (y + Math.sin(a) * t) | 0, 1.6, 1.6, -0.12);
    }
  } else if (skin === "felt") {
    // fieltro: miles de fibras cortas y finas en todas direcciones + grumos suaves
    valueNoise(H, r, 16, 0.08);
    for (let i = 0; i < 14000; i++) {
      const x = r() * N, y = r() * N, a = r() * 6.28, len = 6 + r() * 14, amp = (r() - 0.35) * 0.22;
      for (let t = 0; t < len; t += 1) { const px = wrap((x + Math.cos(a) * t) | 0), py = wrap((y + Math.sin(a) * t) | 0); H[py * N + px] += amp; }
    }
  } else if (skin === "toy") {
    // vinil soft-touch: piel de naranja muy fina
    valueNoise(H, r, 64, 0.12); valueNoise(H, r, 128, 0.08);
  } else if (skin === "ceramic") {
    // esmalte: ondas suaves donde el esmalte escurrió (vertical) y poros mínimos
    for (let i = 0; i < 26; i++) stamp(H, r() * N | 0, r() * N | 0, 6 + r() * 6, 40 + r() * 50, 0.25 + r() * 0.2, 0);
    valueNoise(H, r, 128, 0.02);
  } else if (skin === "inflatable") {
    // globo/inflable: 8 gajos con costura hundida y panza abombada entre costuras, más arrugas cerca de la costura
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = (x / N) * 8, f = p - Math.floor(p), d = Math.min(f, 1 - f);
      H[y * N + x] = Math.sin(Math.PI * f) * 0.9 - 1.6 * Math.exp(-(d * d) / 0.0009);
    }
    for (let i = 0; i < 40; i++) { const k = Math.floor(r() * 8), x = ((k + (r() < 0.5 ? 0.04 : 0.96)) / 8) * N; stamp(H, x | 0, r() * N | 0, 3, 14, -0.25, 0.6); }
  }
  return H;
}
const texCache = new Map();
function normalTex(THREE, skin, seed, strength) {
  const key = `${skin}:${seed}`;
  if (texCache.has(key)) return texCache.get(key);
  const H = heightFor(skin, seed), c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d"), img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H[y * N + wrap(x + 1)] - H[y * N + wrap(x - 1)]) * strength, dy = (H[wrap(y + 1) * N + x] - H[wrap(y - 1) * N + x]) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  texCache.set(key, t);
  return t;
}
// motitas del gres bajo el esmalte (mapa de color casi blanco con puntitos oscuros)
function speckleTex(THREE, seed) {
  const key = `speckle:${seed}`; if (texCache.has(key)) return texCache.get(key);
  const r = rng(seed + 99), c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(60,45,35,${0.25 + r() * 0.45})`; g.beginPath(); g.arc(r() * N, r() * N, 0.6 + r() * 1.3, 0, 6.29); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t); return t;
}

export function makeSkinMaterial(THREE, skin, color, seed = 7) {
  const col = new THREE.Color(color);
  const rep = (t, u, v) => { const c = t.clone(); c.repeat.set(u, v); c.needsUpdate = true; return c; };
  switch (skin) {
    case "clay": // plastilina: mate, sin barniz, huellas y abolladuras
      return new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.88, metalness: 0, normalMap: rep(normalTex(THREE, "clay", seed, 4), 2, 1.4), normalScale: new THREE.Vector2(0.7, 0.7), sheen: 0.15, sheenRoughness: 0.9, sheenColor: col.clone().lerp(new THREE.Color(1, 1, 1), 0.4) });
    case "felt": // fieltro de aguja: brillo de fibra en el contorno (sheen) y pelusa fina
      return new THREE.MeshPhysicalMaterial({ color: col.clone().multiplyScalar(0.85), roughness: 1, metalness: 0, specularIntensity: 0.2, normalMap: rep(normalTex(THREE, "felt", seed, 2.2), 5, 3), normalScale: new THREE.Vector2(1, 1), sheen: 1, sheenRoughness: 0.35, sheenColor: col.clone().lerp(new THREE.Color(1, 1, 1), 0.7) });
    case "toy": // vinil soft-touch de juguete de diseñador: satinado con un barniz muy leve
      return new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.5, metalness: 0, normalMap: rep(normalTex(THREE, "toy", seed, 3), 3, 2), normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 0.25, clearcoatRoughness: 0.45 });
    case "ceramic": // cerámica esmaltada: barniz espejo, esmalte que escurrió y motitas de gres
      return new THREE.MeshPhysicalMaterial({ color: col, map: rep(speckleTex(THREE, seed), 2, 1.5), roughness: 0.3, metalness: 0, normalMap: rep(normalTex(THREE, "ceramic", seed, 4), 2, 1), normalScale: new THREE.Vector2(0.5, 0.5), clearcoat: 1, clearcoatRoughness: 0.03 });
    case "inflatable": // inflable/globo: gajos con costura, plástico brillante y tenso
      return new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.22, metalness: 0, normalMap: normalTex(THREE, "inflatable", seed, 9), normalScale: new THREE.Vector2(1, 1), clearcoat: 0.8, clearcoatRoughness: 0.12 });
    case "jelly": // gomita: translúcida con color en el volumen (absorción), barniz
      return new THREE.MeshPhysicalMaterial({ color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.2), roughness: 0.1, metalness: 0, transmission: 0.85, thickness: 0.12, ior: 1.38, attenuationColor: col, attenuationDistance: 1.2, clearcoat: 1, clearcoatRoughness: 0.08 });
    default:
      return new THREE.MeshStandardMaterial({ color: col, roughness: 0.72, metalness: 0 });
  }
}
