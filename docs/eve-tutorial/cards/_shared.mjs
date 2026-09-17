import fs from "node:fs";
import path from "node:path";

// Toma el <svg> de un style frame y lo envuelve en una composición HyperFrames 1920×1080
// con una timeline GSAP pausada (window.__timelines.main). Cada tarjeta pasa su script.
const ANIMS = fs.readFileSync(new URL("./_anims.css", import.meta.url), "utf8");

export function buildCard({ dir, frame, total, script, sfx, css = "" }) {
  const src = fs.readFileSync(path.join(dir, "../../style-frames", frame), "utf8");
  const svg = src.slice(src.indexOf("<svg"), src.indexOf("</svg>") + 6).replace(/xlink:href="ghosty\.png"/g, 'xlink:href="assets/ghosty.png"');
  const html = `<!doctype html>
<html lang="es" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0E1317; }
      body { font-family: ui-monospace, Menlo, monospace; color: #F2F5F4; }
      .clip { position: absolute; inset: 0; }
      svg text { font-family: ui-monospace, Menlo, monospace; }
      /* recetas CSS de motion-anything (Animate.css): seek-safe. Sobre SVG: transform-box fill-box. */
      ${ANIMS}
      .anim { transform-box: fill-box; transform-origin: 50% 50%; animation-fill-mode: both; animation-timing-function: ease; }
      ${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
      <div class="clip" id="scene" data-start="0" data-duration="${total}">
${svg}
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // entrada estándar de un elemento: sube 24px con rebote suave (sin scale ni svgOrigin: sin vibración)
      const rise = (sel, t, d = .45) => tl.from(sel, { y: 24, opacity: 0, duration: d, ease: "power3.out", immediateRender: false }, t);
      const pop = (sel, t) => tl.from(sel, { opacity: 0, duration: .2, immediateRender: false }, t);
      const draw = (sel, t, d = .6) => { tl.set(sel, { strokeDasharray: 2000, strokeDashoffset: 2000 }, 0); tl.to(sel, { strokeDashoffset: 0, duration: d, ease: "power2.inOut" }, t); };
${script}
      tl.set({}, {}, ${total});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html);
  fs.writeFileSync(path.join(dir, "sfx.json"), JSON.stringify(sfx, null, 2));
  console.log(path.basename(dir), html.length, "bytes ·", total, "s");
}
