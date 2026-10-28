// Chequeo de colisiones de la tapa: para cada cuadro del timeline (30 fps) pone la escena en su pose y mide
// Box3 de three.js de la tapa contra la caja, la mesa y el robot. Falla si se encajan más de 1 px
// o si la tapa se sale del cuadro.
//
// Las cajas se miden vértice por vértice en el marco propio de cada pieza (la caja en el suyo, la tapa en el suyo):
// dos piezas sólo se tocan si sus Box3 se encajan en LOS DOS marcos (si uno las separa, hay un plano entre ellas).
// En el marco del mundo una caja girada infla su Box3 y daría choques falsos; ese número se imprime aparte.
// 1 px = lo que mide un pixel del cuadro (720 de alto) a la distancia de la tapa.
//
// Uso (desde motion-lab/): node toon-object/check-lid.mjs [toon-object/recipe.html]
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// puppeteer-core y el Chrome que ya baja HyperFrames (no se instala nada nuevo)
function findPuppeteer() {
  try { return createRequire(import.meta.url)("puppeteer-core"); } catch {}
  const npx = join(homedir(), ".npm/_npx");
  for (const d of existsSync(npx) ? readdirSync(npx) : []) {
    const p = join(npx, d, "node_modules/puppeteer-core");
    if (existsSync(p)) return createRequire(join(npx, d, "node_modules/"))("puppeteer-core");
  }
  throw new Error("no encontré puppeteer-core (corre una vez `npx hyperframes`)");
}
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  for (const v of existsSync(base) ? readdirSync(base) : []) {
    for (const sub of readdirSync(join(base, v))) {
      const bin = join(base, v, sub, "chrome-headless-shell");
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error("no encontré chrome-headless-shell (exporta CHROME=/ruta)");
}

const file = resolve(process.argv[2] || new URL("./recipe.html", import.meta.url).pathname);
const puppeteer = findPuppeteer();
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on("console", (m) => { if (m.type() === "warn" || m.type() === "warning" || m.type() === "error") console.log("aviso de la página:", m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: "networkidle0" });
await page.waitForFunction(() => window.__toon);
const lp = await page.evaluate(() => { const { LP, LID } = window.__toon; return { rim: LP.rim, spinBase: LP.spinBase, yA: LP.yA, margin: LP.margin, spin: [LP.tS0, LP.tS1], rSpin: LID.rSpin, cy: LID.cy }; });
console.log(`tapa: libra el borde con la base a ${lp.rim.toFixed(3)} (contorno ${lp.margin.toFixed(3)}), gira desde ${lp.spinBase.toFixed(3)} (radio ${lp.rSpin.toFixed(3)}), ápice ${lp.yA.toFixed(3)}, voltereta ${lp.spin[0].toFixed(2)}–${lp.spin[1].toFixed(2)} s`);

const res = await page.evaluate(() => {
  const { poseAt, boxIn, lid, boxG, table, bot, camera, fps, total } = window.__toon;
  const THREE = window.THREE;
  const lidFrame = lid.children[0].children[0];       // lidBody: el marco propio de la tapa
  const robotFrame = bot.children[0];                 // botInner
  const pen = (A, B) => Math.min(
    Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x),
    Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y),
    Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z));
  const others = [["caja", boxG, boxG], ["mesa", table, table], ["robot", bot, robotFrame]];
  const frames = Math.round(total * fps), rows = [], c = new THREE.Vector3();
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    poseAt(t);
    const lb = new THREE.Box3().setFromObject(lid, true);
    lb.getCenter(c);
    const d = c.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
    const px = (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / 720;
    // y además: que la tapa no se salga del cuadro (vértices proyectados a pantalla, px)
    let top = Infinity, left = Infinity, right = -Infinity;
    lid.traverse((o) => {
      if (!o.isMesh || o.userData.shadow) return;
      const pos = o.geometry.attributes.position, v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).project(camera);
        top = Math.min(top, (1 - v.y) / 2 * 720); left = Math.min(left, (v.x + 1) / 2 * 1280); right = Math.max(right, (v.x + 1) / 2 * 1280);
      }
    });
    const row = { i, t: +t.toFixed(3), px, top, left, right };
    for (const [name, obj, frame] of others) {
      const inObs = pen(boxIn(lid, frame), boxIn(obj, frame));
      const inLid = pen(boxIn(lid, lidFrame), boxIn(obj, lidFrame));
      const world = pen(lb, new THREE.Box3().setFromObject(obj, true));
      row[name] = { depthPx: Math.min(inObs, inLid) / px, worldPx: world / px };
    }
    rows.push(row);
  }
  return rows;
});
await browser.close();

let fails = 0;
const minTop = Math.min(...res.map((r) => r.top));
const ink = 9 + 2.5;   // el contorno (line.outer + line.extra) también debe caber en el cuadro
const off = res.filter((r) => r.top < ink || r.right > 1280 - ink);
for (const r of off) { fails++; console.log(`FALLA cuadro ${r.i} (t=${r.t}s): la tapa sale del cuadro (arriba ${r.top.toFixed(0)} px, derecha ${r.right.toFixed(0)} px)`); }
const worst = { caja: -Infinity, mesa: -Infinity, robot: -Infinity };
for (const r of res) {
  for (const k of Object.keys(worst)) {
    worst[k] = Math.max(worst[k], r[k].depthPx);
    if (r[k].depthPx > 1) { fails++; console.log(`FALLA cuadro ${r.i} (t=${r.t}s): tapa ↔ ${k} se encajan ${r[k].depthPx.toFixed(2)} px (Box3 de mundo: ${r[k].worldPx.toFixed(2)} px)`); }
  }
}
console.log(`${res.length} cuadros · peor encaje (px, negativo = separadas): ` + Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · "));
console.log(`la tapa (sin contorno) llega a y=${minTop.toFixed(0)} px arriba y x=${Math.max(...res.map((r) => r.right)).toFixed(0)} px a la derecha`);
console.log(fails ? `✗ ${fails} choques o salidas de más de 1 px` : "✓ la tapa no atraviesa caja, mesa ni robot en ningún cuadro");
process.exit(fails ? 1 : 0);
