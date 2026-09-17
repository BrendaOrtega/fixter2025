import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 70.12;        // tres tramos: 1:35:53.8+40.4 s · 1:36:45.0+18.8 s · 1:39:03.8+10.9 s de la sesión 5
const CUT1 = 40.4;         // pegues (zoom-punch del servidor)
const CUT2 = 59.2;
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 81.5;

// tema: paleta FixterGeek. Piel isométrica: cubos de servidor con tres caras planas, sin sombras
// suaves; etiquetas de precio; el "techo" es una losa. Cambiar aquí cambia todo.
const T = { bg: "#0E1317", mint: "#85DDCB", green: "#8DCF6E", ink: "#F2F5F4", grey: "#7C8A8E", side: "#1C262C", top: "#243139" };
const { bg: BG, mint: MINT, green: GREEN, ink: INK, grey: GREY, side: SIDE, top: TOP } = T;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// cubo isométrico: (x,y) es el vértice frontal inferior; w ancho, d fondo, h alto (proyección 2:1)
const cube = (id, x, y, w, d, h, label = "", extra = "") => {
  const rx = w * 0.866, ry = w * 0.5, lx = d * 0.866, ly = d * 0.5;
  const front = `M${x} ${y} l${rx} ${-ry} v${-h} l${-rx} ${ry} z`;
  const left = `M${x} ${y} l${-lx} ${-ly} v${-h} l${lx} ${ly} z`;
  const topf = `M${x} ${y - h} l${rx} ${-ry} l${-lx} ${-ly} l${-rx} ${ry} z`;
  // rejillas: líneas paralelas a la arista superior de la cara izquierda
  const slats = [0.25, 0.4, 0.55, 0.7].map((k) => `<path d="M${x - lx * 0.15} ${y - ly * 0.15 - h * k} l${-lx * 0.7} ${-ly * 0.7}" stroke="${GREY}" stroke-width="3" stroke-linecap="round"/>`).join("");
  // LEDs: una hilera en el frente, cerca de la arista de abajo
  const leds = [0.2, 0.32, 0.44, 0.56, 0.68].map((k, i) => `<circle class="led" id="${id}led${i}" cx="${x + rx * k}" cy="${y - ry * k - h * 0.14}" r="4" fill="${i % 2 ? GREEN : MINT}"/>`).join("");
  // retícula de la tapa
  const grid = [0.33, 0.66].map((k) => `<path d="M${x + rx * k} ${y - h - ry * k} l${-lx} ${-ly}" stroke="${BG}" stroke-width="2" opacity=".5"/><path d="M${x - lx * k} ${y - h - ly * k} l${rx} ${-ry}" stroke="${BG}" stroke-width="2" opacity=".5"/>`).join("");
  return `<g id="${id}" ${extra}><path d="${left}" fill="${SIDE}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${slats}<path d="${front}" fill="${TOP}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${leds}<path d="${topf}" fill="${MINT}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${grid}</g>`;
};
// losetas isométricas del piso (se encienden en cascada)
const tiles = (id, cx, cy, n, size) => {
  const rx = size * 0.866, ry = size * 0.5; let out = "";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const px = cx + (i - j) * rx, py = cy + (i + j) * ry - n * ry;
    out += `<path class="tile" id="${id}${i}_${j}" d="M${px} ${py} l${rx} ${-ry} l${rx} ${ry} l${-rx} ${ry} z" fill="${MINT}" opacity="0"/>`;
  }
  return out;
};
// polvo al aterrizar: tres puntitos que saltan
const dust = (id, x, y) => `<g id="${id}" opacity="0"><circle cx="${x - 40}" cy="${y}" r="6" fill="${GREY}"/><circle cx="${x}" cy="${y + 6}" r="8" fill="${GREY}"/><circle cx="${x + 44}" cy="${y}" r="5" fill="${GREY}"/></g>`;
// burbuja de conversación (una ranura ocupada)
const bubble = (id, x, y, s = 1) => `<g id="${id}" opacity="0"><g transform="translate(${x} ${y}) scale(${s})"><path d="M-26 -18 h52 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-30 l-12 10 v-10 h-10 a8 8 0 0 1 -8 -8 v-22 a8 8 0 0 1 8 -8 z" fill="${GREEN}" stroke="${INK}" stroke-width="3"/><circle cx="-10" cy="1" r="3" fill="${BG}"/><circle cx="0" cy="1" r="3" fill="${BG}"/><circle cx="10" cy="1" r="3" fill="${BG}"/></g></g>`;
// etiqueta de precio
const tag = (id, x, y, text, color = GREEN, w = 150) => `<g id="${id}" opacity="0"><g transform="translate(${x} ${y})"><path d="M0 0 h${w} l24 22 l-24 22 h${-w} z" fill="${color}" stroke="${INK}" stroke-width="3"/><circle cx="${w - 4}" cy="22" r="5" fill="${BG}"/><text class="mono" x="${w / 2 - 4}" y="29" text-anchor="middle" font-size="18" fill="${BG}">${text}</text></g></g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Space Grotesk", sans-serif; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      .unb { font-family: "Unbounded", sans-serif; font-weight: 900; }
      .board { position: absolute; left: -144px; top: -144px; width: 1368px; height: 2208px; background: ${BG}; }
      /* retícula isométrica tenue: dos familias de líneas a 30° */
      .boardin { position: absolute; inset: 0; background-image: repeating-linear-gradient(30deg, rgba(133,221,203,.07) 0 1px, transparent 1px 48px), repeating-linear-gradient(-30deg, rgba(133,221,203,.07) 0 1px, transparent 1px 48px); }

      /* cabecera (250–400): cara en rombo isométrico a la derecha, nombre a la izquierda */
      #av { position: absolute; right: 90px; top: 246px; width: 150px; height: 150px; overflow: hidden; border: 5px solid ${INK}; border-radius: 22px; transform: rotate(45deg); z-index: 31; background: ${BG}; }
      #av video { width: 142%; height: 142%; margin: -21%; object-fit: cover; display: block; transform: rotate(-45deg); }
      #who { position: absolute; left: 72px; top: 256px; z-index: 30; }
      #who b { display: block; font-family: "Unbounded"; font-weight: 900; font-size: 40px; color: ${INK}; letter-spacing: -.01em; }
      #who span { display: block; margin-top: 12px; font-family: "Space Mono"; font-weight: 700; font-size: 20px; color: ${MINT}; }
      #pill { display: inline-block; margin-top: 10px; padding: 6px 16px; border: 3px solid ${GREEN}; border-radius: 30px; font-family: "Space Mono"; font-weight: 700; font-size: 18px; color: ${GREEN}; }

      /* cartel (430–650): Unbounded, segunda línea en menta */
      #sign { position: absolute; left: 72px; right: 72px; top: 430px; height: 220px; z-index: 30; }
      #signin { font-family: "Unbounded"; font-weight: 900; font-size: 84px; line-height: 1.05; letter-spacing: -.03em; color: ${INK}; text-transform: uppercase; transform-origin: left top; white-space: nowrap; }
      #signin em { font-style: normal; color: ${MINT}; }

      /* escenario (660–1170) */
      #stage { position: absolute; left: 72px; top: 660px; width: 936px; height: 510px; z-index: 20; }
      #stage svg { width: 936px; height: 510px; overflow: visible; font-family: "Space Grotesk"; font-weight: 700; }

      /* karaoke (1190–1390) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1190px; height: 200px; z-index: 40; display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.1; font-weight: 700; }
      .w { display: inline-block; color: ${GREY}; padding: 0 8px; }

      /* zoom-punch: el cubo del servidor crece hasta tapar; "TECHO" sella; del otro lado una losa isométrica se encoge */
      #punch { position: absolute; left: 50%; top: 50%; z-index: 70; pointer-events: none; width: 360px; height: 360px; margin-left: -180px; margin-top: -180px; opacity: 0; }
      #burst { position: absolute; left: 50%; top: 50%; z-index: 71; pointer-events: none; width: 2600px; height: 2600px; margin-left: -1300px; margin-top: -1300px; opacity: 0; }
      #hero { position: absolute; left: 50%; top: 50%; z-index: 72; pointer-events: none; width: 760px; height: 320px; margin-left: -380px; margin-top: -160px; opacity: 0; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(14,19,23,.95)) drop-shadow(0 0 22px rgba(14,19,23,.7)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div class="board" id="bg"><div class="boardin"></div></div>

      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS · fixtergeek.com</span><div id="pill">SESIÓN 05 · PREGUNTA DE ALUMNO</div></div>

      <div id="sign"><div id="signin">OTRO<br /><em>PROVEEDOR</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 510">
          <!-- 1. el servidor virtual: un cubo con su etiqueta; las 12 burbujas ocupan ranuras; la losa del techo -->
          <g id="s1">
            <g id="floor">${tiles("ft", 430, 470, 6, 70)}<path d="M120 470 l340 -196 l340 196 l-340 196 z" fill="none" stroke="${MINT}" stroke-width="2" opacity=".35"/></g>${dust("dust1", 410, 436)}
            ${cube("vps", 300, 430, 260, 160, 190)}
            <text class="mono" id="vpslbl" x="410" y="322" text-anchor="middle" font-size="18" fill="${INK}">VPS</text>
            <g id="whereq" opacity="0"><text class="unb" x="760" y="110" text-anchor="middle" font-size="60" fill="${MINT}" style="font-family:'Unbounded';font-weight:900">?</text><text x="760" y="150" text-anchor="middle" font-size="22" fill="${MINT}">¿dónde están?</text></g>
            ${tag("price", 560, 260, "$500 / mes")}
            ${tag("ramtag", 560, 320, "8 GB RAM", MINT)}
            ${Array.from({ length: 12 }, (_, i) => bubble("b" + i, 296 + (i % 4) * 74 + Math.floor(i / 4) * 18, 330 - Math.floor(i / 4) * 60, 1)).join("")}
            <text class="mono" id="count" x="410" y="430" text-anchor="middle" font-size="26" fill="${GREEN}" opacity="0">0 / 12</text>
            <g id="roof" opacity="0"><path d="M120 150 l340 -196 l340 196 l-340 196 z" fill="${SIDE}" stroke="${GREEN}" stroke-width="6" stroke-linejoin="round"/><text class="unb" x="460" y="160" text-anchor="middle" font-size="40" fill="${GREEN}" style="font-family:'Unbounded';font-weight:900">TECHO</text></g>
            ${bubble("b13", 700, 120, .9)}
          </g>
          <!-- 2. las cajas: se levanta otra al llegar la conversación 13; sin techo -->
          <g id="s2" opacity="0">
            <g id="floor2">${tiles("ft2", 460, 470, 7, 66)}<path d="M60 470 l400 -230 l400 230 l-400 230 z" fill="none" stroke="${MINT}" stroke-width="2" opacity=".35"/></g>${dust("dust2", 318, 446)}${dust("dust3", 558, 446)}${dust("dust4", 438, 306)}<path id="link12" d="M330 380 L560 380" stroke="${MINT}" stroke-width="3" stroke-dasharray="8 8" opacity="0"/><path id="link23" d="M440 320 L440 250" stroke="${MINT}" stroke-width="3" stroke-dasharray="8 8" opacity="0"/>
            ${cube("box3", 360, 300, 180, 120, 130, "", 'opacity="0"')}<text class="mono" id="box3lbl" x="438" y="235" text-anchor="middle" font-size="16" fill="${INK}" opacity="0">caja 3</text>
            ${cube("box1", 240, 440, 180, 120, 130, "")}<text class="mono" x="318" y="375" text-anchor="middle" font-size="16" fill="${INK}">caja 1</text>
            ${cube("box2", 480, 440, 180, 120, 130, "", 'opacity="0"')}<text class="mono" id="box2lbl" x="558" y="375" text-anchor="middle" font-size="16" fill="${INK}" opacity="0">caja 2</text>
            
            ${bubble("nb13", 560, 250, .9)}<text class="mono" id="nb13lbl" x="560" y="300" text-anchor="middle" font-size="16" fill="${GREEN}" opacity="0">conversación 13</text>
            <text class="mono" id="cap26" x="820" y="120" text-anchor="middle" font-size="30" fill="${MINT}" opacity="0">26</text>
            <text class="mono" id="cap26b" x="820" y="150" text-anchor="middle" font-size="16" fill="${GREY}" opacity="0">conversaciones</text>
            <g id="notecho" opacity="0"><path d="M60 60 h420" stroke="${GREEN}" stroke-width="6" stroke-dasharray="14 10"/><text class="unb" x="270" y="40" text-anchor="middle" font-size="30" fill="${GREEN}" style="font-family:'Unbounded';font-weight:900">SIN TECHO</text></g>
          </g>
          <!-- 3. producción: el mapa de proveedores y la caja con Ghosty -->
          <g id="s3" opacity="0">
            ${cube("prod", 300, 440, 220, 150, 170)}
            <text class="mono" x="395" y="380" text-anchor="middle" font-size="16" fill="${INK}">producción</text>
            ${tag("gringo", 540, 200, "proveedor gringo", GREY, 210)}
            <g id="eb" opacity="0"><path id="ebstar" d="M715 250 l8 22 l22 8 l-22 8 l-8 22 l-8 -22 l-22 -8 l22 -8 z" fill="${GREEN}"/><path id="ebstar2" d="M800 300 l5 14 l14 5 l-14 5 l-5 14 l-5 -14 l-14 -5 l14 -5 z" fill="${MINT}"/><image href="assets/ghosty.png" x="640" y="270" width="150" height="174"/><text class="unb" x="715" y="480" text-anchor="middle" font-size="30" fill="${MINT}" style="font-family:'Unbounded';font-weight:900">EasyBits</text></g>
          </g>
        </svg>
      </div>

      ${lineEls}

      <!-- portada -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:20px;color:${GREEN};font-weight:400">TALLER SISTEMAS AGÉNTICOS · SESIÓN 05 · 14 SEP 2026</div>
        <div class="k" id="i0" style="top:300px;width:936px;border-left:6px solid ${MINT};padding:6px 0 6px 22px;font-size:34px;line-height:1.3;color:${INK}">Un alumno pregunta:<br /><i>«¿Y si dejamos EasyBits y cambiamos<br />de proveedor? ¿Qué considerar?»</i></div>
        <div class="unb k" id="i2" style="top:470px;font-size:170px;line-height:1;letter-spacing:-.03em;color:${INK};white-space:nowrap">12<br /><span style="font-size:72px;color:${MINT};display:block;margin-top:6px">CONVERSACIONES.</span></div>
        <div class="k" id="i3" style="top:760px;font-size:44px;font-weight:700;color:${INK};line-height:1.25;width:900px">Ese es tu techo en un servidor de 500 pesos. Y cómo quitarlo.</div>
        <div id="i5" style="position:absolute;left:72px;top:900px;width:560px;height:470px"><svg viewBox="0 0 560 470" style="width:560px;height:470px;overflow:visible">
          ${cube("icube", 180, 400, 220, 140, 170)}
          ${Array.from({ length: 12 }, (_, i) => bubble("ib" + i, 190 + (i % 4) * 56 + Math.floor(i / 4) * 14, 280 - Math.floor(i / 4) * 44, .66).replace('opacity="0"', 'opacity="1"')).join("")}
          <g id="iroof"><path d="M20 120 l260 -150 l260 150 l-260 150 z" fill="${SIDE}" stroke="${GREEN}" stroke-width="5" opacity=".9"/><text class="unb" x="280" y="130" text-anchor="middle" font-size="34" fill="${GREEN}" style="font-family:'Unbounded';font-weight:900">TECHO</text></g>
        </svg></div>
        <div id="i6" style="position:absolute;right:72px;top:1010px;width:300px;height:300px;border:5px solid ${INK};border-radius:30px;overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="k" id="o1" style="top:262px;font-size:50px;font-weight:700;color:${INK};line-height:1.2;width:936px">«Ese límite de 12 va a ser tu techo.<br />Con cajas, no hay techo.»</div>
        <div id="o2" style="position:absolute;left:72px;width:936px;top:420px;height:8px;background:${MINT};transform-origin:left center"></div>
        <div class="k" style="top:480px">
          <div id="o3" class="mono" style="font-size:22px;color:${GREEN};font-weight:400">TALLER GRABADO · 5 SESIONES · ON DEMAND</div>
          <div id="o4" class="unb" style="margin-top:18px;font-size:108px;line-height:1;letter-spacing:-.03em;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:34px;font-size:21px;line-height:1.7;color:${INK};font-weight:400">SESIÓN 05 · UN BACKEND, n CANALES (WHATSAPP) · 14 SEP 2026<br />LAS 5 SESIONES YA ESTÁN GRABADAS. ENTRAS HOY.</div>
          <div id="o6" style="margin-top:44px;display:inline-block;padding:18px 30px;background:${MINT};color:${BG};font-size:32px;font-weight:700;border-radius:40px">Inscríbete en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <!-- zoom-punch: cubo -->
      <svg id="punch" viewBox="0 0 360 360">${cube("pcube", 100, 300, 200, 120, 180)}</svg>
      <svg id="burst" viewBox="0 0 2600 2600"><rect width="2600" height="2600" fill="${MINT}"/><path d="M1300 300 l1000 577 l-1000 577 l-1000 -577 z" fill="${BG}"/><path d="M1300 700 l650 375 l-650 375 l-650 -375 z" fill="${GREEN}"/></svg>
      <svg id="hero" viewBox="0 0 760 320"><rect x="0" y="30" width="760" height="260" rx="30" fill="${MINT}"/><text class="unb" x="380" y="230" text-anchor="middle" font-size="150" fill="${BG}" style="font-family:'Unbounded';font-weight:900">TECHO</text></svg>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, CUT1 = ${CUT1}, CUT2 = ${CUT2}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", MINT = "${MINT}", GREEN = "${GREEN}", GREY = "${GREY}", BG = "${BG}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: la retícula se desplaza un módulo, sin cesar
      tl.to("#bg", { x: 96, y: 55, duration: 14, ease: "none", repeat: REP(14) }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#iroof", { y: -14, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 2 }, 0);
      tl.to("[id^=ib]", { y: -6, duration: .4, stagger: { each: .05, yoyo: true, repeat: 5 }, ease: "sine.inOut" }, 0);

      // ---- zoom-punch: el cubo crece hasta tapar el cuadro, "TECHO" sella, la losa se encoge
      tl.set("#punch", { scale: .2, rotation: -15 }, 0);
      tl.set("#hero", { scale: .3, rotation: -6 }, 0);
      const punchIn = (t, withWord) => {
        tl.set("#punch", { opacity: 1, scale: .2, rotation: -15 }, t);
        tl.to("#punch", { scale: 18, rotation: 4, duration: .5, ease: "power3.in" }, t);
        tl.set("#burst", { opacity: 1, scale: 1.2, rotation: 0 }, t + .48);
        tl.set("#punch", { opacity: 0 }, t + .5);
        if (withWord) {
          tl.set("#hero", { opacity: 1, scale: .3, rotation: -6 }, t + .5);
          tl.to("#hero", { scale: 1, rotation: 0, duration: .3, ease: "back.out(2.5)" }, t + .5);
          tl.to("#hero", { opacity: 0, scale: 1.4, duration: .2, ease: "power2.in" }, t + .82);
          tl.to("#burst", { scale: 0, rotation: 30, duration: .5, ease: "back.in(1.4)" }, t + 1.02);
          tl.set("#burst", { opacity: 0 }, t + 1.52);
        } else {
          tl.to("#burst", { scale: 0, rotation: 30, duration: .5, ease: "back.in(1.4)" }, t + .5);
          tl.set("#burst", { opacity: 0 }, t + 1.0);
        }
      };
      punchIn(3.85, true);
      punchIn(BO + CUT1 - .5, false);
      punchIn(BO + CUT2 - .5, false);
      punchIn(OUT_IN - .55, true);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, rotation: 45, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      tl.set("#av", { rotation: 45 }, 0);
      const punch = (t) => tl.to("#av", { scale: 1.12, rotation: 45, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [3.56, 17.41, 26.17, 28.84, 43.61, 52.65, 57.45, 68.96].forEach(punch);

      // ---- cartel
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .1, ease: "power3.in" }, BO + t - .1);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .2, ease: "power4.out" }, BO + t);
      };
      sign(3.56, "¿DÓNDE ESTÁN<br /><em>TUS SERVIDORES?</em>");
      sign(17.41, "500 PESOS<br /><em>8 GB DE RAM</em>");
      sign(26.17, "12<br /><em>CONVERSACIONES</em>");
      sign(31.69, "ESE ES<br /><em>TU LÍMITE</em>");
      sign(41.24, "TU<br /><em>TECHO</em>");
      sign(44.23, "CAJAS:<br /><em>SIN TECHO</em>");
      sign(51.71, "CONVERSACIÓN 13<br /><em>OTRA CAJA</em>");
      sign(60.27, "¿DÓNDE LO LLEVO<br /><em>A PRODUCCIÓN?</em>");
      sign(67.02, "YO ME QUEDARÍA<br /><em>CON EASYBITS</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const show = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .15 }, at(t));
      const popIn = (id, t, origin, s = 2.5) => { show(id, t); tl.from(id, { scale: 0, svgOrigin: origin, duration: .28, ease: "back.out(" + s + ")", immediateRender: false }, at(t)); };
      const stampIn = (id, t, origin) => { show(id, t); tl.from(id, { scale: 2.4, svgOrigin: origin, duration: .2, ease: "power3.in", immediateRender: false }, at(t)); };

      // 0 el cubo del VPS sube del piso; 3.56 "¿dónde están?": el signo; 9.84 "servidor virtual fijo": el cubo se asienta
      // SFX: land, pop, block
      // el piso se enciende en cascada y respira; las losetas laten de vez en cuando
      tl.to("[id^=ft][id*=_]", { opacity: .16, duration: .25, stagger: { each: .02, from: "center", grid: [6, 6] } }, at(0));
      tl.to("[id^=ft][id*=_]", { opacity: .05, duration: 1.4, stagger: { each: .03, from: "random", repeat: 5, yoyo: true }, ease: "sine.inOut" }, at(2.5));
      tl.from("#vps, #vpslbl", { y: 200, duration: .6, ease: "back.out(1.2)", immediateRender: false }, at(0.1));
      tl.fromTo("#dust1", { opacity: 1, scale: .3, svgOrigin: "410 436" }, { opacity: 0, scale: 1.6, duration: .5, ease: "power2.out" }, at(0.55));
      // LEDs del servidor parpadean todo el rato (bucle finito)
      tl.to("#vpsled0, #vpsled2, #vpsled4", { opacity: .2, duration: .3, repeat: 60, yoyo: true, ease: "none" }, at(0.8));
      tl.to("#vpsled1, #vpsled3", { opacity: .2, duration: .45, repeat: 40, yoyo: true, ease: "none" }, at(1.0));
      popIn("#whereq", 3.56, "760 120", 2);
      tl.to("#whereq", { rotation: 8, svgOrigin: "760 120", duration: .4, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(4.0));
      hide("#whereq", 9.8);
      tl.to("#vps", { y: -10, duration: .12, yoyo: true, repeat: 1 }, at(12.5));
      // 17.41 "DigitalOcean de 500 pesos": la etiqueta de precio; 19.98 "8 GB de RAM": la de RAM
      // SFX: pin ×2
      popIn("#price", 18.34, "706 282", 2);
      tl.to("#price", { rotation: -6, svgOrigin: "706 282", duration: .6, yoyo: true, repeat: 9, ease: "sine.inOut" }, at(18.7));
      popIn("#ramtag", 19.98, "706 342", 2);
      tl.to("#ramtag", { rotation: 5, svgOrigin: "706 342", duration: .7, yoyo: true, repeat: 7, ease: "sine.inOut" }, at(20.4));
      // 22.10 "vas a soportar… unas 12 conversaciones": las 12 burbujas ocupan ranuras una por una y el contador cuenta
      // SFX: pop ×12
      for (let i = 0; i < 12; i++) {
        popIn("#b" + i, 22.6 + i * .3, (296 + (i % 4) * 74 + Math.floor(i / 4) * 18) + " " + (330 - Math.floor(i / 4) * 60), 3);
        tl.to("#count", { textContent: (i + 1) + " / 12", duration: .01 }, at(22.6 + i * .3));
      }
      tl.to("#count", { opacity: 1, duration: .1 }, at(22.6));
      // las burbujas flotan con fases distintas mientras están en escena
      for (let i = 0; i < 12; i++) tl.to("#b" + i, { y: -6, duration: .9 + (i % 3) * .2, yoyo: true, repeat: 9, ease: "sine.inOut" }, at(23.2 + i * .3));
      tl.to("#count", { scale: 1.4, svgOrigin: "410 422", duration: .2, yoyo: true, repeat: 1, ease: "back.out(3)" }, at(26.2));
      // 28.84 "tu límite": la losa del techo cae sobre el servidor; 33.25 "12 personas": las burbujas laten; 37.34 "sea el canal": nada cambia
      // SFX: hit-low, tick ×3
      tl.to("#roof", { opacity: 1, duration: .01 }, at(28.84)).from("#roof", { y: -220, duration: .45, ease: "bounce.out", immediateRender: false }, at(28.84));
      tl.to("[id^=b]:not(#b13)", { scale: 1.15, svgOrigin: "410 250", duration: .2, yoyo: true, repeat: 1, stagger: .02 }, at(33.25));
      tl.to("#vps", { x: -6, duration: .06, yoyo: true, repeat: 7 }, at(29.3));
      // las burbujas se aplastan bajo la losa y el polvo salta
      tl.to("[id^=b]:not(#b13)", { scaleY: .75, svgOrigin: "410 250", duration: .12, yoyo: true, repeat: 1, stagger: .01 }, at(29.3));
      tl.fromTo("#dust1", { opacity: 1, scale: .3, svgOrigin: "410 436" }, { opacity: 0, scale: 2, duration: .5, ease: "power2.out" }, at(29.3));
      // 40.4 corte (punch). 41.24 "ese límite de 12 va a ser tu techo": la losa se ilumina y llega la burbuja 13 que rebota contra el techo
      // SFX: whoosh-fly (39.9), hit-sub (40.4), whoosh-short (40.45), pop (41.6), hit-low (42.6)
      tl.to("#roof path", { fill: GREEN, duration: .15, yoyo: true, repeat: 3 }, at(41.24));
      popIn("#b13", 41.6, "700 120", 3);
      tl.to("#b13", { y: 60, duration: .4, ease: "power2.in" }, at(42.2));
      tl.to("#b13", { scaleY: .6, scaleX: 1.3, svgOrigin: "700 180", duration: .08, yoyo: true, repeat: 1 }, at(42.6));
      tl.to("#b13", { y: 0, rotation: -30, svgOrigin: "700 120", duration: .4, ease: "power2.out" }, at(42.68));
      tl.to("#roof", { y: -8, duration: .08, yoyo: true, repeat: 3 }, at(42.6));
      tl.to("#b13", { opacity: 0, duration: .2 }, at(44.0));
      // 44.23 "si le entras a las cajas": la escena de cajas; 47.22 "sandboxes"; 48.72 "no tener techo": la línea punteada; 51.71 "conversación 13" → 53.49 "se levante otra caja"; 57.45 "26"
      // SFX: whoosh-short, land, block, pop, land, coin
      hide("#s1", 44.1);
      show("#s2", 44.23);
      tl.to("[id^=ft2][id*=_]", { opacity: .16, duration: .25, stagger: { each: .015, from: "center", grid: [7, 7] } }, at(44.23));
      tl.to("[id^=ft2][id*=_]", { opacity: .05, duration: 1.4, stagger: { each: .03, from: "random", repeat: 5, yoyo: true }, ease: "sine.inOut" }, at(46.5));
      tl.from("#box1", { y: 200, duration: .5, ease: "back.out(1.2)", immediateRender: false }, at(44.23));
      tl.fromTo("#dust2", { opacity: 1, scale: .3, svgOrigin: "318 446" }, { opacity: 0, scale: 1.8, duration: .5, ease: "power2.out" }, at(44.65));
      tl.to("#box1led0, #box1led2, #box1led4", { opacity: .2, duration: .3, repeat: 40, yoyo: true, ease: "none" }, at(45));
      popIn("#notecho", 48.72, "270 50", 1.6);
      popIn("#nb13", 51.71, "560 250", 3);
      tl.to("#nb13lbl", { opacity: 1, duration: .1 }, at(52.65));
      tl.to("#box2", { opacity: 1, duration: .01 }, at(53.49)).from("#box2", { y: 200, duration: .5, ease: "back.out(1.2)", immediateRender: false }, at(53.49));
      tl.to("#box2lbl", { opacity: 1, duration: .1 }, at(53.9));
      tl.fromTo("#dust3", { opacity: 1, scale: .3, svgOrigin: "558 446" }, { opacity: 0, scale: 1.8, duration: .5, ease: "power2.out" }, at(53.9));
      tl.to("#link12", { opacity: 1, duration: .1 }, at(54.2));
      tl.to("#link12", { strokeDashoffset: -160, duration: 5, ease: "none" }, at(54.2));
      tl.to("#box2led1, #box2led3", { opacity: .2, duration: .35, repeat: 30, yoyo: true, ease: "none" }, at(54.2));
      tl.to("#nb13", { x: -20, y: -60, duration: .25, ease: "power2.out" }, at(54.0));
      tl.to("#nb13", { x: 0, y: 130, duration: .35, ease: "bounce.out" }, at(54.25));
      tl.to("#nb13lbl", { opacity: 0, duration: .1 }, at(54.0));
      tl.to("#box3", { opacity: 1, duration: .01 }, at(55.35)).from("#box3", { y: 200, duration: .5, ease: "back.out(1.2)", immediateRender: false }, at(55.35));
      tl.to("#box3lbl", { opacity: 1, duration: .1 }, at(55.8));
      tl.fromTo("#dust4", { opacity: 1, scale: .3, svgOrigin: "438 306" }, { opacity: 0, scale: 1.8, duration: .5, ease: "power2.out" }, at(55.8));
      tl.to("#link23", { opacity: 1, duration: .1 }, at(56.1));
      tl.to("#link23", { strokeDashoffset: -120, duration: 4, ease: "none" }, at(56.1));
      tl.to("#notecho path", { strokeDashoffset: -240, duration: 10, ease: "none" }, at(48.8));
      popIn("#cap26", 57.45, "820 110", 2.5);
      // el 26 cuenta desde 13
      [14, 16, 18, 20, 22, 24, 26].forEach((n, i) => tl.to("#cap26", { textContent: String(n), duration: .01 }, at(57.5 + i * .07)));
      tl.to("#cap26b", { opacity: 1, duration: .2 }, at(58.0));
      // 59.2 corte (punch). 60.27 "¿dónde lo llevo a producción?": el cubo de producción; 64.59 "proveedor gringo": etiqueta gris; 67.02 "yo me quedaría con EasyBits": Ghosty
      // SFX: whoosh-fly (58.7), hit-sub (59.2), whoosh-short (59.25), land, pin, pop
      hide("#s2", 59.0);
      show("#s3", 59.2); tl.from("#prod", { y: 200, duration: .5, ease: "back.out(1.2)", immediateRender: false }, at(59.4));
      popIn("#gringo", 64.59, "746 222", 2);
      tl.to("#gringo", { opacity: .4, duration: .3 }, at(67.4));
      popIn("#eb", 67.47, "715 360", 2);
      tl.to("#eb image", { y: -8, duration: .5, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(68.0));
      tl.fromTo("#ebstar", { scale: 0, svgOrigin: "715 280" }, { scale: 1, duration: .3, yoyo: true, repeat: 3, ease: "power2.out" }, at(67.9));
      tl.fromTo("#ebstar2", { scale: 0, svgOrigin: "800 319" }, { scale: 1, duration: .3, yoyo: true, repeat: 3, ease: "power2.out" }, at(68.3));
      tl.to("#prodled0, #prodled2, #prodled4", { opacity: .2, duration: .3, repeat: 30, yoyo: true, ease: "none" }, at(60));
      tl.to("#gringo", { rotation: -5, svgOrigin: "746 222", duration: .6, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(65));

      // ---- karaoke
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const t = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .18, ease: "power3.out" }, t);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: GREY, scale: 1 }, t - .01)
            .set("#" + w.id, { color: MINT }, BO + w.s)
            .to("#" + w.id, { scale: 1.22, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + w.s)
            .set("#" + w.id, { color: INK }, BO + w.e);
        });
      });

      // ---- cierre
      tl.from("#o1", { y: 24, opacity: 0, duration: .5, ease: "power3.out" }, OUT_IN + .1)
        .from("#o2", { scaleX: 0, duration: .4, ease: "power3.out" }, OUT_IN + .45)
        .from("#o3", { opacity: 0, duration: .3 }, OUT_IN + .6)
        .from("#o4", { y: 22, opacity: 0, duration: .45, ease: "power3.out" }, OUT_IN + .7)
        .from("#o5", { opacity: 0, duration: .4 }, OUT_IN + .95)
        .from("#o6", { scale: 0, transformOrigin: "left center", duration: .35, ease: "back.out(2)" }, OUT_IN + 1.15)
        .from("#logo", { opacity: 0, y: 12, duration: .4 }, OUT_IN + 1.35);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);

// SFX (tiempo del clip); cortinillas de entrada/salida antes del 0 y después del final
const OUTC = OUT_IN - .55 - BO - .3;
const sfx = {
  land: [0.1, 44.23, 53.49, 55.35, 59.4],
  pop: [3.56, ...Array.from({ length: 12 }, (_, i) => +(22.6 + i * .3).toFixed(2)), 41.6, 51.71, 67.47],
  block: [12.5, 48.72],
  pin: [18.34, 19.98, 64.59],
  "hit-low": [28.84, 42.6],
  tick: [33.25, 33.45, 33.65],
  coin: [57.45],
  "whoosh-fly": [-0.85, CUT1 - .5, CUT2 - .5, OUTC],
  "hit-sub": [-0.35, CUT1, CUT2, OUTC + .5],
  "whoosh-short": [0.17, CUT1 + .05, CUT2 + .05, OUTC + 1.02],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
