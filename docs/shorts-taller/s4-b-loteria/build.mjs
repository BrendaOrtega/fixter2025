import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 43.55;        // duración del clip (30.3 → 73.85 de la ventana)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 54.9;

// piel: lotería mexicana. Negro cálido con papel picado, cartas crema con banda roja, tinta negra
const BG = "#1B1B1B";
const INK = "#1B1B1B";
const CREAM = "#F6E7C8";
const CARD = "#FFF6E0";
const RED = "#C8322B";
const BLUE = "#1F4E9C";
const YELLOW = "#F2C14E";
const GREEN = "#2E7D4F";
const MUTE = "#9a8b6e";
const DIM = "#8a7a5a";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; la palabra en curso se realza por peso y color
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// papel picado de fondo (nunca negro plano) y la guirnalda
const PICADO = (id) => `<pattern id="${id}" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M45 8 L82 45 L45 82 L8 45 Z" fill="none" stroke="${CREAM}" stroke-width="1.5" opacity=".08"/><circle cx="45" cy="45" r="8" fill="${CREAM}" opacity=".05"/></pattern>`;
const board = (id) => `<svg class="board" viewBox="0 0 1080 1920"><defs>${PICADO("p" + id)}</defs><rect width="1080" height="1920" fill="${BG}"/><rect width="1080" height="1920" fill="url(#p${id})"/></svg>`;
const garland = (id) => `<svg class="garland" id="${id}" viewBox="0 0 1080 60"><path d="M0 10 Q270 45 540 10 T1080 10" fill="none" stroke="${RED}" stroke-width="4"/><g class="ban"><rect x="120" y="14" width="60" height="30" fill="${RED}"/><rect x="380" y="22" width="60" height="30" fill="${BLUE}"/><rect x="640" y="22" width="60" height="30" fill="${GREEN}"/><rect x="900" y="14" width="60" height="30" fill="${YELLOW}"/></g></svg>`;

// los iconos de las cartas, como símbolos reutilizables (todo tinta y color plano)
const ICONS = {
  lupa: `<circle cx="52" cy="52" r="26" fill="none" stroke="${BLUE}" stroke-width="8"/><path d="M70 70 l26 26" stroke="${BLUE}" stroke-width="10" stroke-linecap="round"/>`,
  sobre: `<rect x="26" y="34" width="70" height="46" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/><path d="M26 34 l35 28 l35 -28" fill="none" stroke="${INK}" stroke-width="3"/>`,
  nube: `<path d="M30 78 a18 18 0 0 1 10 -34 a24 24 0 0 1 46 -4 a16 16 0 0 1 6 38z" fill="${BLUE}" stroke="${INK}" stroke-width="3"/>`,
  pdf: `<rect x="36" y="26" width="50" height="64" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="44" y="40" width="34" height="5" fill="${RED}"/><rect x="44" y="52" width="34" height="5" fill="${RED}"/><rect x="44" y="64" width="22" height="5" fill="${RED}"/>`,
  reloj: `<circle cx="61" cy="56" r="30" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/><path d="M61 56 v-20 M61 56 h14" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  base: `<ellipse cx="61" cy="34" rx="30" ry="10" fill="${GREEN}" stroke="${INK}" stroke-width="3"/><path d="M31 34 v44 a30 10 0 0 0 60 0 v-44" fill="${GREEN}" stroke="${INK}" stroke-width="3"/>`,
  camara: `<rect x="26" y="34" width="70" height="50" rx="6" fill="${INK}"/><circle cx="61" cy="59" r="14" fill="${CREAM}"/><circle cx="61" cy="59" r="7" fill="${BLUE}"/>`,
  voz: `<path d="M30 46 h16 l20 -16 v56 l-20 -16 h-16z" fill="${RED}" stroke="${INK}" stroke-width="3"/><path d="M76 44 q10 12 0 24 M86 36 q18 20 0 40" fill="none" stroke="${INK}" stroke-width="3"/>`,
  arana: `<circle cx="61" cy="56" r="14" fill="${INK}"/><path d="M47 50 l-22 -14 M47 60 l-24 6 M75 50 l22 -14 M75 60 l24 6 M50 66 l-14 20 M72 66 l14 20" stroke="${INK}" stroke-width="3"/>`,
  caja: `<rect x="28" y="40" width="66" height="48" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/><path d="M28 40 l12 -14 h66 l-12 14" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/>`,
  calendario: `<rect x="28" y="30" width="66" height="60" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="28" y="30" width="66" height="16" fill="${RED}"/><text x="61" y="78" font-family="Alfa Slab One" font-size="26" text-anchor="middle" fill="${INK}">11</text>`,
  mapa: `<path d="M30 40 l20 -8 l22 8 l20 -8 v52 l-20 8 l-22 -8 l-20 8z" fill="${GREEN}" stroke="${INK}" stroke-width="3"/>`,
};
const symbols = Object.entries(ICONS).map(([k, v]) => `<symbol id="ic-${k}" viewBox="0 0 122 104">${v}</symbol>`).join("");

// las doce de la tabla
const SLOTS = [["LA LUPA", "lupa"], ["EL SOBRE", "sobre"], ["LA NUBE", "nube"], ["EL PDF", "pdf"], ["EL RELOJ", "reloj"], ["LA BASE", "base"], ["LA CÁMARA", "camara"], ["LA VOZ", "voz"], ["LA ARAÑA", "arana"], ["LA CAJA", "caja"], ["EL CALENDARIO", "calendario"], ["EL MAPA", "mapa"]];
const slotCards = SLOTS.map(([name, ic], i) => {
  const x = 46 + (i % 4) * 134, y = 46 + Math.floor(i / 4) * 140;
  return `<g transform="translate(${x + 61} ${y + 65})"><g id="sc${i}" opacity="0"><rect x="-61" y="-65" width="122" height="130" fill="${CARD}" stroke="${INK}" stroke-width="3"/><use href="#ic-${ic}" x="-61" y="-65" width="122" height="104"/><rect x="-61" y="39" width="122" height="26" fill="${RED}"/><text class="cn" x="0" y="57" text-anchor="middle" font-size="13" fill="${CREAM}">${name}</text><text class="cn" x="-49" y="-47" font-size="12" fill="${INK}">${i + 1}</text><rect id="st${i}" x="-61" y="-65" width="122" height="130" fill="${YELLOW}" opacity="0"/></g></g>`;
}).join("");
// las casillas vacías de la tabla, debajo
const slotHoles = SLOTS.map((_, i) => {
  const x = 46 + (i % 4) * 134, y = 46 + Math.floor(i / 4) * 140;
  return `<rect x="${x}" y="${y}" width="122" height="130" fill="none" stroke="${MUTE}" stroke-width="2" stroke-dasharray="6 5"/>`;
}).join("");

// las que ya no caben: 28 cartas chicas que caen sobre la tabla y se salen
const EXTRA = ["EL WEB", "EL CRAWL", "EL TTS", "EL SCRAPER", "LA FOTO", "EL VIDEO", "EL AUDIO", "EL EMBED", "LA TABLA", "EL ZIP", "EL OCR", "EL CHAT", "EL MAIL", "EL CRON", "EL LOG", "EL SQL", "EL VECTOR", "EL DOC", "EL SLIDE", "EL SVG", "LA VOZ 2", "EL LINK", "EL RSS", "EL QR", "EL PIN", "EL MAPA 2", "EL S3", "LA CAJA 2"];
const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
const extraCards = EXTRA.map((name, i) => {
  const x = 30 + rnd(i, 1) * 560, y = 30 + rnd(i, 2) * 400, rot = -30 + rnd(i, 3) * 60;
  const col = [RED, BLUE, GREEN, YELLOW][i % 4];
  const icon = Object.keys(ICONS)[i % 12];
  return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)})"><g id="xc${i}" opacity="0"><rect x="-45" y="-48" width="90" height="96" fill="${CARD}" stroke="${INK}" stroke-width="3"/><use href="#ic-${icon}" x="-45" y="-52" width="90" height="76"/><rect x="-45" y="28" width="90" height="20" fill="${col}"/><text class="cn" x="0" y="42" text-anchor="middle" font-size="11" fill="${col === YELLOW ? INK : CREAM}">${name}</text><rect id="xt${i}" x="-45" y="-48" width="90" height="96" fill="${YELLOW}" opacity="0"/></g></g>`;
}).join("");

// frijoles que tapan la carta del agente, y monedas que caen
const beans = Array.from({ length: 36 }, (_, i) => {
  const x = 40 + rnd(i, 7) * 210, y = 60 + rnd(i, 8) * 250, rot = rnd(i, 9) * 180;
  return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)})"><ellipse class="bean" id="bn${i}" rx="17" ry="11" fill="#5A2E1A" stroke="${INK}" stroke-width="2" opacity="0"/></g>`;
}).join("");
const coins = Array.from({ length: 14 }, (_, i) => {
  const x = 640 + rnd(i, 4) * 270;
  return `<g transform="translate(${x.toFixed(0)} -40)"><g class="coin" id="cn${i}" opacity="0"><circle r="22" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/><text class="cn" x="0" y="8" text-anchor="middle" font-size="22" fill="${INK}">$</text></g></g>`;
}).join("");

// la cortinilla: un abanico de cartas grandes que tapa el cuadro y se retira
const fan = Array.from({ length: 8 }, (_, i) => `<g class="fan" style="top:${i * 240}px"><i style="background:${i % 2 ? CREAM : RED}"></i></g>`).join("");

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Bitter:wght@500;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Bitter", serif; color: ${CREAM}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "JetBrains Mono", monospace; font-weight: 700; }
      .slab { font-family: "Alfa Slab One", serif; font-weight: 400; }
      .board { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
      .garland { position: absolute; left: 0; top: 190px; width: 1080px; height: 60px; z-index: 3; }

      #sig { position: absolute; right: 72px; top: 346px; z-index: 30; font-family: "JetBrains Mono"; font-weight: 700; font-size: 20px; letter-spacing: .14em; color: ${DIM}; }

      /* cabecera (250–390) */
      #av { position: absolute; left: 72px; top: 250px; width: 132px; height: 132px; border-radius: 50%; overflow: hidden;
        border: 8px solid ${YELLOW}; box-shadow: 0 0 0 6px ${RED}; z-index: 30; background: ${INK}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 236px; top: 262px; z-index: 30; }
      #who b { display: block; font-family: "Alfa Slab One"; font-weight: 400; font-size: 42px; color: ${CREAM}; }
      #who span { display: block; margin-top: 6px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 24px; letter-spacing: .16em; color: ${YELLOW}; }
      #clock { position: absolute; right: 72px; top: 266px; z-index: 30; font-family: "Alfa Slab One"; font-size: 28px; color: ${CREAM}; background: ${RED}; padding: 14px 26px; border: 4px solid ${YELLOW}; }

      /* cartel (404–654) */
      #sign { position: absolute; left: 72px; right: 72px; top: 404px; height: 250px; z-index: 30; }
      #signin { font-family: "Alfa Slab One"; font-size: 100px; line-height: .98; color: ${CREAM}; transform-origin: left center; }
      #signin em { font-style: normal; color: ${YELLOW}; }

      /* escenario (676–1172) */
      #stage { position: absolute; left: 72px; top: 676px; width: 936px; height: 496px; z-index: 20; }
      #stage svg { width: 936px; height: 496px; overflow: hidden; }
      .cn { font-family: "Alfa Slab One", serif; }
      .fx { font-family: "Alfa Slab One", serif; }

      /* karaoke (1188–1388) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1188px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.12; font-weight: 800; }
      .w { display: inline-block; color: ${MUTE}; font-weight: 500; }

      /* cortinilla: el abanico de cartas */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      .fan { position: absolute; left: -40px; width: 1160px; height: 244px; }
      .fan i { display: block; width: 100%; height: 100%; border: 6px solid ${INK}; outline: 4px dotted ${YELLOW}; outline-offset: -14px; transform: scaleX(0); transform-origin: left center; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(242, 239, 233, 0.95)) drop-shadow(0 0 22px rgba(242, 239, 233, 0.55)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      ${board("body")}
      ${garland("g1")}

      <div id="sig">fixtergeek.com</div>
      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS</span></div>
      <div id="clock">SESIÓN 4</div>

      <div id="sign"><div id="signin">CUIDADO CON<br /><em>LA CANTIDAD</em></div></div>

      <div id="stage" data-layout-allow-overlap>
        <svg viewBox="0 0 936 496">
          <defs>${symbols}<pattern id="marco" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${RED}"/><circle cx="7" cy="7" r="2.6" fill="${YELLOW}"/></pattern></defs>

          <!-- la tabla -->
          <g id="tabla">
            <rect x="20" y="20" width="560" height="456" fill="${CREAM}" stroke="${RED}" stroke-width="10"/>
            <rect x="34" y="34" width="532" height="428" fill="none" stroke="${BLUE}" stroke-width="3" stroke-dasharray="10 6"/>
            ${slotHoles}
            ${slotCards}
          </g>

          <!-- la carta del agente -->
          <g transform="translate(620 30)"><g id="agent">
            <rect x="8" y="10" width="290" height="420" fill="${INK}" opacity=".5"/>
            <rect x="0" y="0" width="290" height="420" fill="${CARD}" stroke="${INK}" stroke-width="4"/>
            <rect x="10" y="10" width="270" height="400" fill="none" stroke="url(#marco)" stroke-width="10"/>
            <text class="cn" x="34" y="46" font-size="26" fill="${INK}">13</text>
            <image href="assets/ghosty.png" x="62" y="70" width="170" height="196"/>
            <g id="sweat" opacity="0"><path d="M246 90 q14 -22 20 0 a10 10 0 1 1 -20 0z" fill="${BLUE}"/></g>
            <rect x="18" y="330" width="254" height="60" fill="${RED}"/>
            <text class="cn" id="agentlbl" x="145" y="372" text-anchor="middle" font-size="34" fill="${CREAM}">EL AGENTE</text>
            <!-- la barra de contexto, en la carta -->
            <g id="ctxg" opacity="0"><rect x="30" y="290" width="230" height="22" fill="${CARD}" stroke="${INK}" stroke-width="3"/><rect id="ctx" x="33" y="293" width="224" height="16" fill="${GREEN}" transform="scale(0 1)" transform-origin="33 0"/><text class="cn" x="145" y="282" text-anchor="middle" font-size="14" fill="${INK}">CONTEXTO</text></g>
            <!-- los frijoles -->
            <g id="beans">${beans}</g>
          </g></g>

          <!-- el contador de herramientas -->
          <g transform="translate(760 460)"><g id="counter" opacity="0">
            <rect x="-120" y="-40" width="240" height="60" fill="${INK}" stroke="${YELLOW}" stroke-width="4"/>
            <text class="cn" id="cnt" x="0" y="6" text-anchor="middle" font-size="40" fill="${YELLOW}">0</text>
          </g></g>

          <!-- las que ya no caben -->
          <g id="extras">${extraCards}</g>

          <!-- los sellos de 40 experimentales y 200 firmes -->
          <g transform="translate(300 250)"><g id="stampExp" opacity="0"><rect x="-150" y="-36" width="300" height="72" fill="none" stroke="${YELLOW}" stroke-width="8"/><text class="cn" x="0" y="14" text-anchor="middle" font-size="40" fill="${YELLOW}">40 EXPERIMENTAL</text></g></g>
          <g transform="translate(300 250)"><g id="stampFirm" opacity="0"><rect x="-130" y="-36" width="260" height="72" fill="none" stroke="${GREEN}" stroke-width="8"/><text class="cn" x="0" y="14" text-anchor="middle" font-size="40" fill="${GREEN}">200 FIRMES</text></g></g>

          <!-- monedas y la etiqueta de precio -->
          <g id="coinsg"><g id="coins">${coins}</g></g>
          <g id="priceg"><g transform="translate(765 470)"><g id="price" opacity="0"><rect x="-130" y="-42" width="260" height="64" fill="${RED}" stroke="${INK}" stroke-width="4"/><text class="cn" id="pricetxt" x="0" y="8" text-anchor="middle" font-size="38" fill="${CREAM}">$ 0.00</text></g></g></g>

          <!-- onomatopeyas -->
          <text class="fx" id="fx1" x="300" y="260" font-size="70" fill="${RED}" opacity="0" transform="rotate(-8 300 260)">¡ZAS!</text>
          <text class="fx" id="fx2" x="300" y="260" font-size="70" fill="${RED}" opacity="0" transform="rotate(6 300 260)">¡ZAS!</text>
          <text class="fx" id="fx3" x="300" y="260" font-size="70" fill="${RED}" opacity="0" transform="rotate(-4 300 260)">¡ZAS!</text>
          <text class="fx" id="fx4" x="300" y="250" font-size="96" fill="${INK}" stroke="${YELLOW}" stroke-width="4" opacity="0" transform="rotate(-6 300 250)">¡240!</text>
          <text class="fx" id="fx5" x="520" y="470" font-size="64" fill="${YELLOW}" opacity="0" transform="rotate(5 520 470)">¡ÑAM!</text>
          <text class="fx" id="fx6" x="560" y="120" font-size="70" fill="${YELLOW}" stroke="${INK}" stroke-width="3" opacity="0" transform="rotate(-7 560 120)">¡CARO!</text>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        ${board("intro")}
        ${garland("g2")}
        <div class="mono k" id="i1" style="top:262px;font-size:26px;letter-spacing:.16em;color:${YELLOW}">TALLER DE SISTEMAS AGÉNTICOS · SESIÓN 4</div>
        <div class="slab k" id="i2" style="top:318px;font-size:150px;line-height:.96;color:${CREAM}">MI MCP<br />TIENE</div>
        <div class="slab k" id="i3" style="top:632px;font-size:138px;line-height:.9;color:${INK};padding:16px 34px;background:${YELLOW};border:8px solid ${RED};transform:rotate(-3deg);transform-origin:left center;display:inline-block">240 TOOLS</div>
        <div class="k" id="i4" style="top:838px;font-size:62px;font-weight:800;color:${CREAM};line-height:1.16;width:900px">y por eso no debes<br />cargarlo entero.</div>
        <div id="i6" style="position:absolute;right:72px;top:1010px;width:400px;height:360px;border:10px solid ${CREAM};outline:6px solid ${RED};outline-offset:-22px;overflow:hidden;transform:rotate(3deg)"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div class="mono k" id="i7" style="top:1060px;font-size:30px;line-height:1.6;color:${MUTE};width:480px">Permisos y extensiones<br />10 sep 2026<br /><span style="color:${CREAM}">Héctorbliss</span></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        ${board("outro")}
        ${garland("g3")}
        <div class="k" id="o1" style="right:72px;top:262px;font-size:54px;font-weight:800;color:${YELLOW};line-height:1.2">«Usas mi MCP y empiezas a gastar<br />mucho. Es una desventaja horrible.»</div>
        <div id="o2" style="position:absolute;left:72px;width:520px;top:470px;height:12px;background:${RED};transform-origin:left center"></div>
        <div class="k" style="top:540px;right:72px">
          <div id="o3" class="mono" style="font-size:30px;letter-spacing:.2em;color:${MUTE}">TALLER EN VIVO · 6 SESIONES</div>
          <div id="o4" class="slab" style="margin-top:28px;font-size:118px;line-height:.96;color:${CREAM}">SISTEMAS<br />AGÉNTICOS</div>
          <div id="o5" class="mono" style="margin-top:40px;font-size:32px;line-height:1.6;color:${MUTE}">Sesión 4 · Permisos y extensiones (MCP)<br />Las sesiones se graban. Entras a la edición en curso.</div>
          <div id="o6" class="slab" style="margin-top:56px;display:inline-block;padding:26px 40px;background:${RED};color:${CREAM};font-size:38px;border:6px solid ${YELLOW}">Regístrate en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <div id="wipe">${fan}</div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const CREAM = "${CREAM}", RED = "${RED}", YELLOW = "${YELLOW}", GREEN = "${GREEN}", BLUE = "${BLUE}", MUTE = "${MUTE}", INK = "${INK}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: el papel picado se desliza y la guirnalda se mece
      tl.to(".board", { y: -45, duration: 16, ease: "none", yoyo: true, repeat: REP(16) }, 0);
      tl.to(".ban rect", { y: 6, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: REP(1.1), stagger: .2 }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 14, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { rotate: -1, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { rotate: 1, y: -10, duration: 2.6, ease: "sine.inOut" }, 0);

      // ---- cortinilla: el abanico de cartas cierra en cascada y se retira
      const wipe = (t) => {
        tl.to(".fan i", { scaleX: 1, duration: .46, stagger: .07, ease: "power3.in" }, t);
        tl.set(".fan i", { transformOrigin: "right center" }, t + .46 + .07 * 7 + .06);
        tl.to(".fan i", { scaleX: 0, duration: .46, stagger: .07, ease: "power3.out" }, t + .48 + .07 * 7 + .06);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [8.64, 12.95, 28.32, 31.92, 39.44, 43.2].forEach(punch);

      // ---- cartel: cambia con un golpe de sello
      const sign = (t, html) => {
        tl.to("#signin", { scale: .8, rotation: -3, duration: .14, ease: "power2.in" }, BO + t - .14);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scale: 1, rotation: 0, duration: .35, ease: "back.out(2.5)" }, BO + t);
      };
      sign(8.64, "CRECER,<br /><em>CRECER…</em>");
      sign(12.95, "240 CARTAS<br /><em>NO CABEN</em>");
      sign(19.92, "ASÍ NO<br /><em>SE CARGA</em>");
      sign(28.02, "SE COME<br /><em>EL CONTEXTO</em>");
      sign(31.62, "Y SALE<br /><em>CARO</em>");
      sign(40.41, "¿EASYBITS<br /><em>Y GASTAR MÁS?</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const fx = (id, t, rot) => {
        tl.to(id, { opacity: 1, duration: .01 }, at(t))
          .from(id, { scale: .3, transformOrigin: "50% 50%", duration: .35, ease: "back.out(3)", immediateRender: false }, at(t))
          .to(id, { rotation: rot, transformOrigin: "50% 50%", duration: 1, ease: "sine.inOut" }, at(t) + .1)
          .to(id, { opacity: 0, duration: .22 }, at(t) + 1.0);
      };
      // una carta cae sobre la tabla: llega de arriba, grande, y azota
      const drop = (id, t) => {
        tl.to(id, { opacity: 1, duration: .01 }, at(t))
          .from(id, { y: -140, scale: 1.5, transformOrigin: "50% 50%", duration: .22, ease: "power3.in", immediateRender: false }, at(t))
          .to("#tabla", { y: 3, duration: .05, yoyo: true, repeat: 1, overwrite: "auto" }, at(t) + .22);
      };

      // la carta del agente respira
      tl.to("#agent", { y: -5, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 1.6) - 1) }, BO);

      // 3.41 "cuidado con la cantidad": la tabla se estremece, vacía
      tl.to("#tabla", { x: 4, duration: .06, yoyo: true, repeat: 5 }, at(3.41));
      // 6.15 "EasyBits": el contador aparece
      tl.to("#counter", { opacity: 1, duration: .01 }, at(6.15)).from("#counter", { scale: .4, transformOrigin: "50% 50%", duration: .4, ease: "back.out(2)", immediateRender: false }, at(6.15));
      // 8.34 / 8.80 / 9.40 "crecer, crecer, crecer": cuatro cartas por crecer llenan la tabla
      // SFX: card ×12
      const CARD_T = [];
      [8.34, 8.80, 9.40].forEach((t, k) => {
        for (let j = 0; j < 4; j++) { const i = k * 4 + j; drop("#sc" + i, t + j * .1); CARD_T.push(t + j * .1); }
        fx(["#fx1", "#fx2", "#fx3"][k], t, k % 2 ? 6 : -6);
        tl.to("#cnt", { textContent: String((k + 1) * 4), duration: .01 }, at(t + .3));
      });
      // 10.58 "añadiendo herramientas": las de más llueven, ya sin lugar, y el contador corre
      // SFX: card ×28 (cada .07 s)
      for (let i = 0; i < 28; i++) { drop("#xc" + i, 10.58 + i * .075); CARD_T.push(10.58 + i * .075); }
      for (let i = 0; i < 20; i++) tl.to("#cnt", { textContent: String(Math.round(12 + (i + 1) * 11.4)), duration: .01 }, at(10.58 + i * .1));
      // 12.65 "240": el sello
      // SFX: stamp
      tl.to("#cnt", { textContent: "240", fill: CREAM, duration: .01 }, at(12.65));
      tl.to("#counter", { scale: 1.25, transformOrigin: "50% 50%", duration: .15, yoyo: true, repeat: 1, ease: "power2.out" }, at(12.65));
      fx("#fx4", 12.65, -3);
      // 14.34 "40 experimental": un tercio de cartas se tiñe de amarillo y el sello; 16.15 "200 firmes": el resto verde
      // SFX: stamp ×2
      const exp = [0, 3, 5, 9, 11].map((i) => "#st" + i).concat([1, 4, 8, 12, 15, 19, 22, 26].map((i) => "#xt" + i));
      tl.to(exp, { opacity: .55, duration: .2, stagger: .03 }, at(14.34));
      tl.to("#stampExp", { opacity: 1, duration: .01 }, at(14.6)).from("#stampExp", { scale: 2.2, rotation: -12, transformOrigin: "50% 50%", duration: .25, ease: "power3.in", immediateRender: false }, at(14.6));
      tl.to("#stampExp", { opacity: 0, duration: .2 }, at(16.0));
      tl.to("#stampFirm", { opacity: 1, duration: .01 }, at(16.4)).from("#stampFirm", { scale: 2.2, rotation: 8, transformOrigin: "50% 50%", duration: .25, ease: "power3.in", immediateRender: false }, at(16.4));
      tl.to("#stampFirm", { opacity: 0, duration: .2 }, at(19.3));
      // 19.62 "esto ya no lo puedo poner en un agente así nada más": todas las cartas se van hacia la carta del agente
      // SFX: whoosh
      tl.to("#extras > g", { x: 300, y: 40, scale: .5, opacity: 0, transformOrigin: "50% 50%", duration: .8, ease: "power2.in", stagger: .02 }, at(24.54));
      tl.to("#tabla > g", { x: 420, y: 40, scale: .4, opacity: 0, transformOrigin: "50% 50%", duration: .8, ease: "power2.in", stagger: .03 }, at(25.92));
      tl.to("#agent", { scale: 1.06, transformOrigin: "50% 50%", duration: .2, yoyo: true, repeat: 1 }, at(26.5));
      // la tabla ya cumplió: se apaga, y la carta del agente toma el centro y crece (con sus monedas y su precio)
      tl.to("#tabla", { opacity: .18, duration: .5 }, at(26.9));
      tl.to("#counter", { opacity: 0, duration: .3 }, at(26.9));
      tl.to("#agent", { x: -240, scale: 1.12, transformOrigin: "50% 100%", duration: .6, ease: "back.out(1.4)", overwrite: "auto" }, at(26.9));
      tl.set(["#coinsg", "#priceg"], { x: -240 }, at(26.9));
      tl.to("#agent", { y: -5, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 9 }, at(27.6));
      // 27.62 "me como todo el contexto": los frijoles llenan la carta y la barra sube
      // SFX: bean ×36
      const BEAN_T = [];
      tl.to("#ctxg", { opacity: 1, duration: .2 }, at(27.3));
      for (let i = 0; i < 36; i++) {
        const t = 27.62 + i * .07; BEAN_T.push(t);
        tl.to("#bn" + i, { opacity: 1, duration: .01 }, at(t)).from("#bn" + i, { y: -60, duration: .16, ease: "power3.in", immediateRender: false }, at(t));
      }
      tl.to("#ctx", { attr: { transform: "scale(1 1)" }, duration: 2.4, ease: "power1.in" }, at(27.62));
      fx("#fx5", 28.74, 5);
      tl.to("#ctx", { fill: RED, duration: .2 }, at(29.9));
      tl.to("#agentlbl", { textContent: "LLENO", duration: .01 }, at(30.28));
      // 31.32 "sale caro": monedas que caen y la etiqueta de precio que sube
      // SFX: coin ×14
      const COIN_T = [];
      tl.to("#price", { opacity: 1, duration: .01 }, at(31.32)).from("#price", { scale: .4, transformOrigin: "50% 50%", duration: .35, ease: "back.out(2)", immediateRender: false }, at(31.32));
      for (let i = 0; i < 14; i++) {
        const t = 31.5 + i * .18; COIN_T.push(t);
        tl.to("#cn" + i, { opacity: 1, duration: .01 }, at(t)).to("#cn" + i, { y: 470, rotation: 180 * (i % 2 ? 1 : -1), duration: .55, ease: "power2.in" }, at(t)).to("#cn" + i, { opacity: 0, duration: .1 }, at(t) + .55);
      }
      fx("#fx6", 31.64, -4);
      ["$ 0.40", "$ 1.90", "$ 4.20", "$ 9.80", "$ 18.50", "$ 31.00", "$ 52.00", "$ 84.00"].forEach((p, i) => tl.to("#pricetxt", { textContent: p, duration: .01 }, at(32.64 + i * .45)));
      // 38.84 "desventaja horrible": la carta del agente se ladea y suda
      tl.to("#agent", { rotation: -5, transformOrigin: "50% 100%", duration: .3, ease: "power2.out" }, at(38.84));
      tl.to("#sweat", { opacity: 1, duration: .01 }, at(38.9)).from("#sweat", { scale: .3, transformOrigin: "50% 50%", duration: .3, ease: "back.out(3)", immediateRender: false }, at(38.9));
      tl.to("#sweat", { y: 30, opacity: 0, duration: .8 }, at(39.8));
      // 40.11 "yo no quiero decirte, usa EasyBits y gasta más": el precio se tacha
      // SFX: stamp
      tl.to("#agent", { rotation: 0, duration: .4, ease: "back.out(1.5)" }, at(40.5));
      tl.to("#pricetxt", { textContent: "GASTA MÁS", duration: .01 }, at(42.63));
      tl.to("#price", { scale: 1.2, transformOrigin: "50% 50%", duration: .18, yoyo: true, repeat: 1 }, at(42.63));
      window.__sfx = { card: CARD_T, bean: BEAN_T, coin: COIN_T, stamp: [12.65, 14.6, 16.4, 42.63], whoosh: [24.54, 25.92], shake: [3.41] };

      // ---- karaoke
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const t = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .22, ease: "power3.out" }, t);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: MUTE, fontWeight: 500 }, t - .01)
            .set("#" + w.id, { color: YELLOW, fontWeight: 800 }, BO + w.s)
            .set("#" + w.id, { color: CREAM, fontWeight: 800 }, BO + w.e);
        });
      });

      // ---- cierre
      tl.from("#o1", { y: 24, opacity: 0, duration: .6, ease: "power3.out" }, OUT_IN + .1)
        .from("#o2", { scaleX: 0, duration: .5, ease: "power2.out" }, OUT_IN + .5)
        .from("#o3", { opacity: 0, duration: .4 }, OUT_IN + .65)
        .from("#o4", { y: 22, opacity: 0, duration: .5, ease: "power3.out" }, OUT_IN + .75)
        .from("#o5", { opacity: 0, duration: .45 }, OUT_IN + 1.0)
        .from("#o6", { scale: .6, opacity: 0, transformOrigin: "left center", duration: .5, ease: "back.out(1.8)" }, OUT_IN + 1.2)
        .from("#logo", { opacity: 0, y: 12, duration: .45 }, OUT_IN + 1.4);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);

// la lista de SFX (tiempo del clip) para montarlos en la mezcla: mismos tiempos que la timeline
const sfx = { card: [], bean: [], coin: [], stamp: [12.65, 14.6, 16.4, 42.63], whoosh: [24.54, 25.92], shake: [3.41] };
[8.34, 8.80, 9.40].forEach((t) => { for (let j = 0; j < 4; j++) sfx.card.push(+(t + j * .1).toFixed(3)); });
for (let i = 0; i < 28; i++) sfx.card.push(+(10.58 + i * .075).toFixed(3));
for (let i = 0; i < 36; i++) sfx.bean.push(+(27.62 + i * .07).toFixed(3));
for (let i = 0; i < 14; i++) sfx.coin.push(+(31.5 + i * .18).toFixed(3));
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
