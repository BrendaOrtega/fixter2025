import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 67.3;         // dos tramos: 1:48:17.3+29.9 s y 1:48:53.7+37.4 s de la sesión 5 (cierra en "sin costo")
const CUT = 29.9;          // segundo del clip donde pegan los dos tramos (zoom-punch)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 78.7;

// tema: paleta FixterGeek. Piel agitprop: cartel de protesta, tipografía condensada enorme,
// tramas de puntos planas, sellos, tachones. Cambiar aquí cambia todo.
const T = { bg: "#0E1317", mint: "#85DDCB", green: "#8DCF6E", ink: "#F2F5F4", grey: "#7C8A8E" };
const { bg: BG, mint: MINT, green: GREEN, ink: INK, grey: GREY } = T;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// nodo de diagrama (n8n-style): caja con puerto a cada lado
const node = (id, x, y, w, label, fill = BG) => `<g id="${id}" opacity="0"><rect x="${x}" y="${y}" width="${w}" height="54" rx="8" fill="${fill}" stroke="${INK}" stroke-width="5"/><circle cx="${x}" cy="${y + 27}" r="7" fill="${MINT}"/><circle cx="${x + w}" cy="${y + 27}" r="7" fill="${MINT}"/><text class="mono" x="${x + w / 2}" y="${y + 34}" text-anchor="middle" font-size="18" fill="${fill === BG ? INK : BG}">${label}</text></g>`;
const wire = (id, x1, y1, x2, y2) => `<path id="${id}" d="M${x1} ${y1} C${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}" fill="none" stroke="${GREY}" stroke-width="4" opacity="0"/>`;
// personita
const person = (id, x, y, s = 1) => `<g id="${id}" opacity="0"><g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-64" r="22" fill="${BG}" stroke="${INK}" stroke-width="6"/><path d="M-26 0 v-30 a26 26 0 0 1 52 0 v30 z" fill="${BG}" stroke="${INK}" stroke-width="6"/><path d="M-14 0 v34 M14 0 v34" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g></g>`;
// sello inclinado
const stamp = (id, x, y, w, text, rot = -8, color = GREEN, size = 58) => `<g id="${id}" opacity="0"><g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-w / 2}" y="-44" width="${w}" height="88" fill="none" stroke="${color}" stroke-width="8"/><rect x="${-w / 2 + 10}" y="-34" width="${w - 20}" height="68" fill="none" stroke="${color}" stroke-width="3"/><text class="anton" x="0" y="${size * .36}" text-anchor="middle" font-size="${size}" fill="${color}">${text}</text></g></g>`;
// las rebanadas de la cortinilla no se usan: aquí el corte es un zoom-punch del candado
const halftone = `<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="4" fill="${MINT}"/></pattern>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Space Grotesk", sans-serif; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      .anton { font-family: "Anton", sans-serif; font-weight: 400; }
      .board { position: absolute; left: -100px; top: -100px; width: 1280px; height: 2120px; background: ${BG}; }
      /* franjas diagonales de cartel, muy tenues, que se desplazan */
      .boardin { position: absolute; inset: 0; background-image: repeating-linear-gradient(-30deg, rgba(133,221,203,.07) 0 28px, transparent 28px 100px); }

      /* cabecera (250–400): cara en caja con esquinas de sello, nombre en barra */
      #av { position: absolute; right: 72px; top: 246px; width: 154px; height: 154px; overflow: hidden; border: 6px solid ${INK}; z-index: 31; background: ${BG}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 72px; top: 250px; z-index: 30; }
      #who b { display: inline-block; font-family: "Anton"; font-size: 54px; letter-spacing: .02em; color: ${BG}; background: ${MINT}; padding: 6px 22px 2px; text-transform: uppercase; }
      #who span { display: block; margin-top: 10px; font-family: "Space Mono"; font-weight: 700; font-size: 20px; color: ${MINT}; }
      #tag { position: absolute; left: 72px; top: 362px; z-index: 30; font-family: "Space Mono"; font-weight: 700; font-size: 18px; color: ${INK}; }

      /* cartel (420–650): Anton enorme, dos líneas, la segunda sobre barra verde */
      #sign { position: absolute; left: 72px; right: 72px; top: 420px; height: 230px; z-index: 30; }
      #signin { font-family: "Anton"; font-size: 122px; line-height: .94; letter-spacing: .01em; color: ${INK}; text-transform: uppercase; transform-origin: left top; white-space: nowrap; }
      #signin em { font-style: normal; display: inline-block; line-height: 1.02; margin-top: 6px; color: ${BG}; background: ${GREEN}; padding: 0 14px; }

      /* escenario (660–1170) */
      #stage { position: absolute; left: 72px; top: 660px; width: 936px; height: 510px; z-index: 20; }
      #stage svg { width: 936px; height: 510px; overflow: visible; font-family: "Space Grotesk"; font-weight: 700; }

      /* karaoke (1190–1390) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1190px; height: 200px; z-index: 40; display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.1; font-weight: 700; }
      .w { display: inline-block; color: ${GREY}; padding: 0 8px; }

      /* zoom-punch: el candado crece hasta tapar; del otro lado, una trama de puntos que se encoge */
      #punch { position: absolute; left: 50%; top: 50%; z-index: 70; pointer-events: none; width: 320px; height: 400px; margin-left: -160px; margin-top: -200px; opacity: 0; }
      #burst { position: absolute; left: 50%; top: 50%; z-index: 71; pointer-events: none; width: 2600px; height: 2600px; margin-left: -1300px; margin-top: -1300px; opacity: 0; }
      #hero { position: absolute; left: 50%; top: 50%; z-index: 72; pointer-events: none; width: 720px; height: 320px; margin-left: -360px; margin-top: -160px; opacity: 0; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(14,19,23,.95)) drop-shadow(0 0 22px rgba(14,19,23,.7)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div class="board" id="bg"><div class="boardin"></div></div>

      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS · SESIÓN 05 · fixtergeek.com</span></div>

      <div id="sign"><div id="signin">EL MERCADO<br /><em>POR DINERO</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 510">
          <defs>${halftone}</defs>
          <!-- 1. el laberinto de diagramas que crece; la persona adentro; el ticket de certificación -->
          <g id="s1">
            <rect id="ht1" x="0" y="0" width="936" height="510" fill="url(#dots)" opacity="0"/>
            ${node("n1", 40, 60, 150, "TRIGGER")}${wire("w1", 190, 87, 290, 87)}
            ${node("n2", 290, 60, 150, "IF")}${wire("w2", 440, 87, 540, 60)}${wire("w3", 440, 87, 540, 180)}
            ${node("n3", 540, 33, 150, "SWITCH")}${node("n4", 540, 153, 170, "ESPERA")}
            ${wire("w4", 690, 60, 780, 60)}${node("n5", 780, 33, 140, "HTTP")}
            ${wire("w5", 365, 114, 365, 220)}${node("n6", 290, 220, 150, "LOOP")}${wire("w6", 440, 247, 540, 247)}${node("n7", 540, 220, 170, "MERGE")}
            ${wire("w7", 710, 247, 780, 247)}${node("n8", 780, 220, 140, "CÓDIGO")}
            ${wire("w8", 115, 114, 115, 330)}${node("n9", 40, 330, 150, "FUNCIÓN")}${wire("w9", 190, 357, 290, 357)}${node("n10", 290, 330, 150, "SET")}
            ${wire("w10", 440, 357, 540, 357)}${node("n11", 540, 330, 170, "SUBFLUJO")}${wire("w11", 710, 357, 780, 357)}${node("n12", 780, 330, 140, "ERROR")}
            ${person("p1", 468, 470, .9)}
            ${stamp("cert", 700, 460, 460, "CERTIFICACIÓN $$$", -6, GREEN, 44)}
            ${stamp("adrede", 468, 250, 520, "ADREDE", -10, MINT, 96)}
          </g>
          <!-- 2. el candado en la salida, el reloj de arena, el otro sistema tachado -->
          <g id="s2" opacity="0">
            <rect x="0" y="0" width="936" height="510" fill="url(#dots)" opacity=".25"/>
            <g id="walls"><rect x="60" y="40" width="816" height="430" fill="none" stroke="${INK}" stroke-width="8"/><rect x="140" y="120" width="656" height="270" fill="none" stroke="${INK}" stroke-width="6" opacity=".6"/><rect x="220" y="200" width="496" height="110" fill="none" stroke="${INK}" stroke-width="5" opacity=".4"/></g>
            ${person("p2", 468, 300, .8)}
            <g id="door"><rect x="410" y="426" width="116" height="52" fill="${BG}" stroke="${INK}" stroke-width="6"/><text class="mono" x="468" y="460" text-anchor="middle" font-size="18" fill="${INK}">SALIDA</text></g>
            <g id="lock" opacity="0"><g transform="translate(468 452)"><rect x="-34" y="-10" width="68" height="54" rx="8" fill="${GREEN}" stroke="${INK}" stroke-width="6"/><path d="M-20 -10 v-18 a20 20 0 0 1 40 0 v18" fill="none" stroke="${INK}" stroke-width="8"/><circle cy="16" r="7" fill="${BG}"/></g></g>
            ${stamp("diploma", 200, 110, 300, "DIPLOMA", 8, MINT, 48)}
            <g id="hour" opacity="0">
              <rect x="706" y="36" width="108" height="14" rx="4" fill="${INK}"/><rect x="706" y="170" width="108" height="14" rx="4" fill="${INK}"/>
              <path d="M716 50 h88 l-34 60 l34 60 h-88 l34 -60 z" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
              <path id="sandTop" d="M724 56 h72 l-36 52 z" fill="${MINT}"/>
              <line id="stream" x1="760" y1="108" x2="760" y2="164" stroke="${MINT}" stroke-width="4" stroke-dasharray="6 6" opacity="0"/>
              <path id="sandBot" d="M722 166 q38 -44 76 0 z" fill="${MINT}"/>
              <g id="grains"><circle id="gr1" cx="758" cy="118" r="2.5" fill="${MINT}" opacity="0"/><circle id="gr2" cx="762" cy="126" r="2.5" fill="${MINT}" opacity="0"/><circle id="gr3" cx="760" cy="112" r="2" fill="${MINT}" opacity="0"/></g>
            </g>
            <text class="mono" id="tiempo" x="760" y="200" text-anchor="middle" font-size="20" fill="${MINT}" opacity="0">MESES INVERTIDOS</text>
            <g id="otro" opacity="0"><rect x="120" y="200" width="200" height="60" rx="8" fill="${BG}" stroke="${GREY}" stroke-width="5"/><text class="mono" x="220" y="238" text-anchor="middle" font-size="20" fill="${GREY}">OTRO SISTEMA</text><path id="otrox" d="M120 200 L320 260 M320 200 L120 260" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" opacity="0"/></g>
          </g>
          <!-- 3. la marioneta: la mano con el $ tira de los hilos -->
          <g id="s3" opacity="0" transform="translate(0 28)">
            <rect x="0" y="0" width="936" height="510" fill="url(#dots)" opacity=".2"/>
            <!-- el puño con el $ y la cruceta del titiritero (todo absoluto: 468 es el eje) -->
            <g id="cuff"><rect x="398" y="0" width="140" height="56" fill="${GREEN}"/><text class="anton" x="468" y="46" text-anchor="middle" font-size="46" fill="${BG}">$</text>
              <path d="M418 56 h100 l-12 46 h-76 z" fill="${INK}"/></g>
            <g id="bar"><rect x="318" y="102" width="300" height="12" rx="6" fill="${INK}"/><rect x="462" y="60" width="12" height="96" rx="6" fill="${INK}"/></g>
            <g id="strings"><line id="st1" x1="330" y1="110" x2="392" y2="320" stroke="${MINT}" stroke-width="3"/><line id="st2" x1="468" y1="150" x2="468" y2="230" stroke="${MINT}" stroke-width="3"/><line id="st3" x1="606" y1="110" x2="544" y2="320" stroke="${MINT}" stroke-width="3"/></g>
            <!-- la marioneta: cabeza, cuerpo, brazos y piernas con pivote en la articulación -->
            <g id="puppet">
              <circle cx="468" cy="252" r="26" fill="${BG}" stroke="${INK}" stroke-width="6"/>
              <rect x="440" y="282" width="56" height="80" rx="12" fill="${BG}" stroke="${INK}" stroke-width="6"/>
              <path id="armL" d="M442 296 L396 318" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
              <path id="armR" d="M494 296 L540 318" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
              <path id="legL" d="M454 362 L446 420" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
              <path id="legR" d="M482 362 L490 420" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
            </g>
            <text id="psico" x="150" y="260" text-anchor="middle" font-size="30" fill="${MINT}" opacity="0">psicológico</text>
            ${stamp("manip", 740, 440, 380, "MANIPULACIÓN", 6, GREEN, 44)}
            <g id="lock2" opacity="0"><g transform="translate(200 440)"><rect x="-34" y="-10" width="68" height="54" rx="8" fill="${GREEN}" stroke="${INK}" stroke-width="6"/><path d="M-20 -10 v-18 a20 20 0 0 1 40 0 v18" fill="none" stroke="${INK}" stroke-width="8"/><circle cy="16" r="7" fill="${BG}"/></g></g>
            <text id="noteva" class="mono" x="200" y="510" text-anchor="middle" font-size="20" fill="${MINT}" opacity="0">YA NO TE VAS</text>
          </g>
          <!-- 4. la salida: Formmy abre la puerta, la persona sale, Ghosty espera afuera -->
          <g id="s4" opacity="0">
            <g id="frame"><rect x="330" y="60" width="276" height="400" fill="none" stroke="${INK}" stroke-width="8"/><rect id="doorleaf" x="336" y="66" width="264" height="388" fill="${MINT}"/></g>
            <g id="out"><text class="anton" x="468" y="150" text-anchor="middle" font-size="70" fill="${INK}">FORMMY</text><text class="mono" x="468" y="200" text-anchor="middle" font-size="22" fill="${MINT}">WHATSAPP BUSINESS</text></g>
            ${person("p4", 468, 420, .9)}
            <image id="ghosty" href="assets/ghosty.png" x="660" y="200" width="190" height="220" opacity="0"/>
            ${stamp("sincosto", 200, 380, 300, "SIN COSTO", -8, GREEN, 50)}
          </g>
        </svg>
      </div>

      ${lineEls}

      <!-- portada -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:20px;color:${MINT}">TALLER SISTEMAS AGÉNTICOS · SESIÓN 05 · 14 SEP 2026</div>
        <div class="k" id="i0" style="top:300px;width:936px;border-left:8px solid ${MINT};padding:8px 0 8px 24px;font-size:36px;line-height:1.3;color:${INK}">Un alumno pregunta:<br /><i>«¿En Respond.io el diseño del flujo<br />es con diagramas, tipo n8n?»</i></div>
        <div class="anton k" id="i2" style="top:520px;font-size:200px;line-height:.9;color:${INK};text-transform:uppercase;white-space:nowrap">Complicado<br /><span style="display:inline-block;line-height:1.02;margin-top:8px;color:${BG};background:${GREEN};padding:0 20px">adrede.</span></div>
        <div class="k" id="i3" style="top:930px;font-size:40px;font-weight:700;color:${INK};line-height:1.25;width:560px">Por qué los CRM de WhatsApp son un laberinto, y a quién le conviene.</div>
        <div id="i6" style="position:absolute;right:72px;top:930px;width:340px;height:340px;border:6px solid ${INK};overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div id="i5" style="position:absolute;left:72px;top:1100px;width:560px;height:180px"><svg viewBox="0 0 560 180" style="width:560px;height:180px">
          ${node("in1", 10, 20, 130, "TRIGGER", BG).replace('opacity="0"', 'opacity="1"')}${wire("iw1", 140, 47, 230, 47).replace('opacity="0"', 'opacity="1"')}${node("in2", 230, 20, 110, "IF", BG).replace('opacity="0"', 'opacity="1"')}${wire("iw2", 340, 47, 420, 110).replace('opacity="0"', 'opacity="1"')}${node("in3", 420, 83, 130, "SWITCH", BG).replace('opacity="0"', 'opacity="1"')}${wire("iw3", 285, 74, 285, 110).replace('opacity="0"', 'opacity="1"')}${node("in4", 230, 110, 110, "LOOP", BG).replace('opacity="0"', 'opacity="1"')}
          <g id="ilock"><g transform="translate(60 130)"><rect x="-26" y="-8" width="52" height="42" rx="6" fill="${GREEN}" stroke="${INK}" stroke-width="5"/><path d="M-16 -8 v-14 a16 16 0 0 1 32 0 v14" fill="none" stroke="${INK}" stroke-width="6"/></g></g>
        </svg></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="k" id="o1" style="top:262px;font-size:52px;font-weight:700;color:${INK};line-height:1.2;width:936px">«Una vez que inviertes en un sistema<br />complejo, ya no te vas. Es adrede.»</div>
        <div id="o2" style="position:absolute;left:72px;width:936px;top:430px;height:10px;background:${GREEN};transform-origin:left center"></div>
        <div class="k" style="top:490px">
          <div id="o3" class="mono" style="font-size:22px;color:${MINT}">TALLER GRABADO · 5 SESIONES · ON DEMAND</div>
          <div id="o4" class="anton" style="margin-top:16px;font-size:150px;line-height:.9;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:34px;font-size:22px;line-height:1.7;color:${INK};font-weight:400">SESIÓN 05 · UN BACKEND, n CANALES (WHATSAPP) · 14 SEP 2026<br />LAS 5 SESIONES YA ESTÁN GRABADAS. ENTRAS HOY.</div>
          <div id="o6" class="anton" style="margin-top:44px;display:inline-block;padding:18px 30px;background:${MINT};color:${BG};font-size:40px;letter-spacing:.02em">INSCRÍBETE EN FIXTERGEEK.COM/SISTEMAS-AGENTICOS</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <!-- zoom-punch: candado -->
      <svg id="punch" viewBox="-160 -200 320 400"><rect x="-120" y="-40" width="240" height="190" rx="24" fill="${GREEN}" stroke="${INK}" stroke-width="14"/><path d="M-70 -40 v-60 a70 70 0 0 1 140 0 v60" fill="none" stroke="${INK}" stroke-width="22"/><circle cy="50" r="24" fill="${BG}"/></svg>
      <svg id="burst" viewBox="0 0 2600 2600"><rect width="2600" height="2600" fill="${MINT}"/><rect x="300" y="300" width="2000" height="2000" fill="url(#dots2)"/><defs><pattern id="dots2" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="16" fill="${BG}"/></pattern></defs></svg>
      <svg id="hero" viewBox="0 0 720 320"><rect x="0" y="20" width="720" height="280" fill="${MINT}"/><text class="anton" x="360" y="250" text-anchor="middle" font-size="215" fill="${BG}" style="font-family:'Anton'">ADREDE</text></svg>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, CUT = ${CUT}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", MINT = "${MINT}", GREEN = "${GREEN}", GREY = "${GREY}", BG = "${BG}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: las franjas se desplazan un periodo, sin cesar
      tl.to("#bg", { x: 100, y: 58, duration: 9, ease: "none", repeat: REP(9) }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#ilock", { rotation: 10, svgOrigin: "60 130", duration: .5, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0);
      tl.to("#iw1, #iw2, #iw3", { strokeDashoffset: -40, duration: 2, ease: "none", repeat: 1 }, 0);
      tl.set("#iw1, #iw2, #iw3", { strokeDasharray: "10 10" }, 0);

      // ---- zoom-punch: el candado crece hasta tapar el cuadro, "ADREDE" sella, la trama se encoge
      tl.set("#punch", { scale: .2, rotation: -20 }, 0);
      tl.set("#hero", { scale: .3, rotation: -6 }, 0);
      const punchIn = (t, withWord) => {
        tl.set("#punch", { opacity: 1, scale: .2, rotation: -20 }, t);
        tl.to("#punch", { scale: 16, rotation: 6, duration: .5, ease: "power3.in" }, t);
        tl.set("#burst", { opacity: 1, scale: 1.2, rotation: 0 }, t + .48);
        tl.set("#punch", { opacity: 0 }, t + .5);
        if (withWord) {
          tl.set("#hero", { opacity: 1, scale: .3, rotation: -6 }, t + .5);
          tl.to("#hero", { scale: 1, rotation: 0, duration: .3, ease: "back.out(2.5)" }, t + .5);
          tl.to("#hero", { opacity: 0, scale: 1.4, duration: .2, ease: "power2.in" }, t + .82);
          tl.to("#burst", { scale: 0, rotation: 45, duration: .5, ease: "back.in(1.4)" }, t + 1.02);
          tl.set("#burst", { opacity: 0 }, t + 1.52);
        } else {
          tl.to("#burst", { scale: 0, rotation: 45, duration: .5, ease: "back.in(1.4)" }, t + .5);
          tl.set("#burst", { opacity: 0 }, t + 1.0);
        }
      };
      punchIn(3.85, true);
      punchIn(BO + CUT - .5, false);
      punchIn(OUT_IN - .55, true);

      // ---- cabecera: la cara respira y da un golpe en las palabras clave
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [2.94, 9.65, 13.96, 28.0, 30.93, 35.64, 48.15, 53.29, 58.44, 63.71].forEach(punch);

      // ---- cartel
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .1, ease: "power3.in" }, BO + t - .1);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .2, ease: "power4.out" }, BO + t);
      };
      sign(9.39, "MÁS COMPLICADO<br /><em>= MEJOR</em>");
      sign(13.96, "CERTIFICACIÓN<br /><em>QUE COBRAMOS</em>");
      sign(25.04, "COMPLEJIDAD<br /><em>ENCIMA</em>");
      sign(30.04, "ES<br /><em>ADREDE</em>");
      sign(35.29, "DIFÍCIL<br /><em>ESCAPAR</em>");
      sign(47.58, "TODO ES<br /><em>PSICOLÓGICO</em>");
      sign(51.64, "CAPITALISMO<br /><em>= MANIPULACIÓN</em>");
      sign(58.44, "YA NO<br /><em>TE VAS</em>");
      sign(63.71, "FORMMY<br /><em>SIN COSTO</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const show = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .15 }, at(t));
      const popIn = (id, t, origin, s = 2.5) => { show(id, t); tl.from(id, { scale: 0, svgOrigin: origin, duration: .28, ease: "back.out(" + s + ")", immediateRender: false }, at(t)); };
      const stampIn = (id, t, origin) => { show(id, t); tl.from(id, { scale: 2.4, svgOrigin: origin, duration: .2, ease: "power3.in", immediateRender: false }, at(t)); };
      const wireOn = (id, t) => { tl.set(id, { strokeDasharray: 400, strokeDashoffset: 400, opacity: 1 }, at(t)); tl.to(id, { strokeDashoffset: 0, duration: .3, ease: "power2.out" }, at(t)); };

      // 0 "el mercado capitalista está aquí por dinero": el diagrama empieza chico; 2.94 la trama de puntos late
      // SFX: block ×2, tick ×2
      popIn("#p1", 0.3, "468 400", 2);
      popIn("#n1", 0.47, "115 87", 2); wireOn("#w1", 1.0); popIn("#n2", 1.2, "365 87", 2);
      tl.to("#ht1", { opacity: .18, duration: .3 }, at(2.94));
      // 6.65 "programa o modelo"; 9.65 "mientras más complicado mejor": brotan nodos y cables sin parar
      // SFX: block ×10, tick ×11
      const grow = [["#w2", "#n3", 6.65], ["#w3", "#n4", 7.42], ["#w4", "#n5", 8.15], ["#w5", "#n6", 9.65], ["#w6", "#n7", 9.95], ["#w7", "#n8", 10.25], ["#w8", "#n9", 10.55], ["#w9", "#n10", 10.85], ["#w10", "#n11", 11.15], ["#w11", "#n12", 11.45]];
      grow.forEach(([w, n, t]) => { wireOn(w, t); popIn(n, t + .12, "468 250", 1.5); });
      tl.to("#p1", { x: -20, duration: .25, yoyo: true, repeat: 9, ease: "sine.inOut" }, at(9.65));
      // 13.96 "certificación… que vamos a cobrar": el ticket cae con sello; 16.27 "cobrar" tiembla
      // SFX: stamp, coin ×2
      stampIn("#cert", 13.96, "700 460");
      tl.to("#cert", { rotation: 3, svgOrigin: "700 460", duration: .1, yoyo: true, repeat: 5 }, at(16.27));
      // 25.04 "añaden una capa de complejidad encima": todo el diagrama se apila hacia abajo, aparece otro encima (halftone fuerte)
      // SFX: whoosh-short, stamp
      tl.to("#ht1", { opacity: .45, duration: .4 }, at(25.04));
      tl.to("#s1 g[id^=n]", { y: 12, duration: .3, stagger: .02, ease: "power2.out" }, at(25.61));
      stampIn("#adrede", 28.0, "468 250");
      // 29.9 corte: zoom-punch del candado. Del otro lado: el laberinto de muros, la persona adentro
      // SFX: whoosh-fly (29.45), hit-sub (29.95), whoosh-short (30.0)
      hide("#s1", 29.7);
      tl.set("#s2", { opacity: 1 }, at(30.0));
      tl.from("#walls rect", { scale: 0, svgOrigin: "468 255", duration: .5, stagger: .1, ease: "power3.out", immediateRender: false }, at(30.0));
      popIn("#p2", 30.5, "468 240", 2);
      // 30.93 "¿es adrede para qué?" 33.15 "capacitarte": el diploma; 35.64 "escapar": el candado en la salida
      // SFX: stamp, block (candado)
      stampIn("#diploma", 33.15, "200 110");
      popIn("#lock", 35.64, "468 452", 3);
      tl.to("#p2", { x: 0, y: 60, duration: .5, ease: "power2.inOut" }, at(35.0));
      tl.to("#p2", { x: -30, duration: .2, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(36.0));
      // 37.12 "invertiste tiempo": el reloj de arena se vacía; 41.68 "reaprender ningún otro": el otro sistema tachado
      // SFX: tick ×6, block
      popIn("#hour", 37.12, "760 110", 2);
      tl.to("#tiempo", { opacity: 1, duration: .2 }, at(37.99));
      // la arena de arriba se consume desde arriba (pivote en la punta de abajo), el chorro corre, el montículo crece desde la base
      tl.set("#sandBot", { scaleY: .08, svgOrigin: "760 166" }, at(37.0));
      tl.to("#sandTop", { scaleY: 0, svgOrigin: "760 108", duration: 8, ease: "power1.in" }, at(37.6));
      tl.to("#sandBot", { scaleY: 1, svgOrigin: "760 166", duration: 8, ease: "power1.out" }, at(37.6));
      tl.to("#stream", { opacity: 1, duration: .1 }, at(37.6));
      tl.to("#stream", { strokeDashoffset: -240, duration: 8, ease: "none" }, at(37.6));
      tl.to("#stream", { opacity: 0, duration: .2 }, at(45.5));
      [["#gr1", 0], ["#gr2", .17], ["#gr3", .33]].forEach(([id, d]) => tl.fromTo(id, { y: 0, opacity: 1 }, { y: 46, opacity: .2, duration: .5, ease: "power1.in", repeat: 14 }, at(37.7 + d)));
      // al vaciarse, el reloj se sacude: ya no hay vuelta atrás
      tl.to("#hour", { rotation: 6, svgOrigin: "760 110", duration: .08, yoyo: true, repeat: 5 }, at(45.6));
      popIn("#otro", 41.68, "220 230", 2);
      tl.to("#otrox", { opacity: 1, duration: .15 }, at(42.8));
      // 47.58 "todo eso es psicológico": la marioneta; 51.64 "capitalismo… manipulación": el sello; 58.44 "ya no se va": candado
      // SFX: whoosh-short, tick ×3, stamp, block
      hide("#s2", 47.4);
      show("#s3", 47.58);
      tl.from("#cuff, #bar", { y: -220, duration: .5, ease: "bounce.out", immediateRender: false }, at(47.58));
      tl.from("#strings line", { scaleY: 0, svgOrigin: "468 110", duration: .4, ease: "power2.out", immediateRender: false }, at(47.9));
      tl.from("#puppet", { y: -160, duration: .5, ease: "back.out(1.4)", immediateRender: false }, at(48.15));
      tl.to("#psico", { opacity: 1, duration: .2 }, at(48.15));
      // la cruceta se ladea y la marioneta responde: brazos y piernas giran en su articulación, el cuerpo se mece
      tl.to("#bar", { rotation: 10, svgOrigin: "468 108", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      tl.to("#st1", { attr: { y2: 300 }, duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      tl.to("#st3", { attr: { y2: 340 }, duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      tl.to("#armL", { rotation: -40, svgOrigin: "442 296", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      tl.to("#armR", { rotation: 40, svgOrigin: "494 296", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      tl.to("#legL", { rotation: 25, svgOrigin: "454 362", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(49.05));
      tl.to("#legR", { rotation: -25, svgOrigin: "482 362", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(49.05));
      tl.to("#puppet", { rotation: 5, svgOrigin: "468 230", duration: .7, yoyo: true, repeat: 19, ease: "sine.inOut" }, at(48.7));
      stampIn("#manip", 53.29, "740 440");
      popIn("#lock2", 58.44, "200 440", 3);
      tl.to("#lock2", { rotation: 8, svgOrigin: "200 440", duration: .1, yoyo: true, repeat: 5 }, at(58.7));
      tl.to("#noteva", { opacity: 1, duration: .2 }, at(59.2));
      // 63.71 "Formmy te deja usar WhatsApp Business sin costo": la puerta se abre, la persona sale, Ghosty espera
      // SFX: whoosh-short, ding, land, pop, stamp
      hide("#s3", 63.5);
      show("#s4", 63.71); tl.from("#frame", { y: 80, duration: .4, ease: "power3.out", immediateRender: false }, at(63.71));
      tl.to("#doorleaf", { scaleX: 0, svgOrigin: "336 260", duration: .45, ease: "power3.inOut" }, at(64.19));
      popIn("#p4", 64.66, "468 340", 2);
      tl.to("#p4", { x: -220, duration: 1.2, ease: "power2.inOut" }, at(65.0));
      tl.to("#ghosty", { opacity: 1, duration: .3 }, at(65.71));
      tl.from("#ghosty", { y: 40, duration: .4, ease: "back.out(2)", immediateRender: false }, at(65.71));
      stampIn("#sincosto", 66.77, "200 380");

      // ---- karaoke: palabra en curso en menta, dichas en tinta, por decir en gris
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
        .from("#o6", { scaleY: 0, transformOrigin: "left top", duration: .3, ease: "power3.out" }, OUT_IN + 1.15)
        .from("#logo", { opacity: 0, y: 12, duration: .4 }, OUT_IN + 1.35);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);

// SFX (tiempo del clip): las cortinillas de entrada/salida caen antes del 0 y después del final
const sfx = {
  block: [0.47, 1.2, 6.77, 7.54, 8.27, 9.77, 10.07, 10.37, 10.67, 10.97, 11.27, 11.57, 35.64, 41.68, 58.44],
  tick: [1.0, 2.94, 6.65, 7.42, 8.15, 9.65, 9.95, 10.25, 10.55, 10.85, 11.15, 11.45, 37.5, 38.5, 39.5, 40.5, 41.5, 42.8, 47.8, 48.5, 49.1],
  stamp: [13.96, 28.0, 33.15, 53.29, 66.77],
  coin: [16.27, 16.5],
  "whoosh-fly": [-0.85, 29.45, 59.89 + (BODY - 60.29)],
  "hit-sub": [-0.35, 29.95, 60.39 + (BODY - 60.29)],
  "whoosh-short": [0.17, 25.04, 30.0, 47.4, 63.5, 60.91 + (BODY - 60.29)],
  ding: [64.19],
  land: [64.66],
  pop: [48.15, 65.71],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
