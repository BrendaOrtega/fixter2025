import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 58.2;         // duración del clip (63:31.3 → 64:29.5 de la sesión 5)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 69.6;

// piel: blueprint. Plano técnico sobre el fondo de la casa, retícula menta fina, trazo a mano,
// cotas con flechas y sellos. Paleta FixterGeek, plana, sin gradientes.
const BG = "#0E1317";
const MINT = "#85DDCB";
const GREEN = "#8DCF6E";
const INK = "#F2F5F4";
const GREY = "#7C8A8E";
const LINE = "rgba(133,221,203,.16)"; // retícula

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; palabra en curso en menta, dichas en tinta, por decir en gris
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// cota: línea con dos flechitas y el número encima
const cota = (id, x1, y1, x2, y2, label, o = 0) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const vert = x1 === x2;
  return `<g class="cota" id="${id}" opacity="${o}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${MINT}" stroke-width="2"/>
    <path d="M${x1} ${y1} ${vert ? `l-6 10 h12z` : `l10 -6 v12z`}" fill="${MINT}"/><path d="M${x2} ${y2} ${vert ? `l-6 -10 h12z` : `l-10 -6 v12z`}" fill="${MINT}"/>
    <text class="mono" x="${vert ? mx + 14 : mx}" y="${vert ? my + 6 : my - 10}" text-anchor="${vert ? "start" : "middle"}" font-size="18" fill="${MINT}">${label}</text></g>`;
};
// engrane de 8 dientes
const gear = (id, cx, cy, r) => {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r : r * 1.28;
    d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1) + " ";
  }
  return `<g id="${id}"><path d="${d}Z" fill="${BG}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r * .3}" fill="none" stroke="${INK}" stroke-width="5"/></g>`;
};
// fichas del tablero: 4×4, las que ya están puestas
const pieces = () => [0, 1, 3, 4, 6, 7, 9, 10, 12, 14, 15].map((n) => {
  const x = 30 + (n % 4) * 100, y = 40 + Math.floor(n / 4) * 100;
  return `<g class="pz" id="pz${n}" opacity="0"><circle cx="${x + 50}" cy="${y + 50}" r="32" fill="${BG}" stroke="${INK}" stroke-width="5"/><circle cx="${x + 50}" cy="${y + 50}" r="14" fill="none" stroke="${INK}" stroke-width="4"/></g>`;
}).join("");
// la cortinilla: rebanadas sesgadas de menta/verde/tinta
const cols = Array.from({ length: 15 }, (_, i) => `<i class="col" style="top:${i * 192 - 520}px;background:${[MINT, GREEN, INK, MINT, GREEN, MINT, INK, GREEN, MINT, GREEN, INK, MINT, GREEN, MINT, GREEN][i]}"></i>`).join("");

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Architects+Daughter&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Architects Daughter", cursive; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      .big { font-family: "Big Shoulders Display", sans-serif; font-weight: 900; }
      .hand { font-family: "Architects Daughter", cursive; }
      .board { position: absolute; left: -72px; top: -72px; width: 1224px; height: 2064px; background: ${BG}; }
      .boardin { position: absolute; inset: 0;
        background-image: linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px),
          linear-gradient(rgba(133,221,203,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(133,221,203,.07) 1px, transparent 1px);
        background-size: 144px 144px, 144px 144px, 36px 36px, 36px 36px; }

      /* cajetín (250–400): la cara en el recuadro del plano y los datos de la hoja */
      #cajetin { position: absolute; left: 72px; right: 72px; top: 250px; height: 150px; z-index: 30; border: 4px solid ${INK}; display: flex; }
      #av { width: 150px; height: 142px; overflow: hidden; border-right: 4px solid ${INK}; background: ${BG}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { flex: 1; padding: 14px 20px; display: flex; flex-direction: column; justify-content: center; }
      #who b { display: block; font-family: "Big Shoulders Display"; font-weight: 900; font-size: 46px; letter-spacing: .02em; color: ${INK}; text-transform: uppercase; line-height: 1; }
      #who span { display: block; margin-top: 8px; font-family: "Space Mono"; font-weight: 400; font-size: 20px; color: ${MINT}; }
      #hoja { width: 200px; border-left: 4px solid ${INK}; padding: 12px 16px; font-family: "Space Mono"; font-size: 18px; color: ${MINT}; line-height: 1.5; }
      #hoja b { display: block; font-family: "Big Shoulders Display"; font-weight: 900; font-size: 60px; color: ${GREEN}; line-height: 1; }

      /* cartel (420–640): Big Shoulders enorme, la segunda línea en menta con la cota abajo */
      #sign { position: absolute; left: 72px; right: 72px; top: 420px; height: 220px; z-index: 30; }
      #signin { font-family: "Big Shoulders Display"; font-weight: 900; font-size: 112px; line-height: .92; letter-spacing: .01em; color: ${INK}; text-transform: uppercase; transform-origin: left top; white-space: nowrap; }
      #signin em { font-style: normal; color: ${MINT}; }
      #signrule { position: absolute; left: 0; bottom: 0; width: 936px; height: 2px; background: ${MINT}; transform-origin: left center; }

      /* escenario (660–1170): el plano */
      #stage { position: absolute; left: 72px; top: 660px; width: 936px; height: 510px; z-index: 20; }
      #stage svg { width: 936px; height: 510px; overflow: visible; font-family: "Architects Daughter"; }
      .draw { stroke-dasharray: 2400; stroke-dashoffset: 2400; }

      /* karaoke (1190–1390) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1190px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.1; }
      .w { display: inline-block; color: ${GREY}; padding: 0 9px; }

      /* cortinilla */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      .col { position: absolute; left: -500px; width: 2080px; height: 380px; transform-origin: center; }
      #wipeword { position: absolute; left: 50%; top: 50%; z-index: 72; pointer-events: none; width: 620px; height: auto; opacity: 0; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(14,19,23,.95)) drop-shadow(0 0 22px rgba(14,19,23,.7)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div class="board" id="bg"><div class="boardin"></div></div>

      <div id="cajetin">
        <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
        <div id="who"><b>Héctorbliss</b><span>PLANO · SISTEMAS AGÉNTICOS · fixtergeek.com</span></div>
        <div id="hoja">HOJA<b>05</b>de 05</div>
      </div>

      <div id="sign"><div id="signin">LA INDUSTRIA<br /><em>= AGENTES</em></div><div id="signrule"></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 510">
          <defs><clipPath id="stagecut"><rect x="-20" y="-20" width="976" height="550"/></clipPath></defs>
          <!-- 1. la fábrica: se dibuja a mano, con cotas -->
          <g id="factory">
            <path class="draw" id="fbody" d="M60 440 V250 L200 190 V250 L340 190 V250 L480 190 V440 Z" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
            <rect class="draw" id="fchim1" x="110" y="90" width="50" height="160" fill="none" stroke="${INK}" stroke-width="6"/>
            <rect class="draw" id="fchim2" x="380" y="120" width="44" height="130" fill="none" stroke="${INK}" stroke-width="6"/>
            <rect class="draw" id="fdoor" x="240" y="350" width="60" height="90" fill="none" stroke="${INK}" stroke-width="6"/>
            <g id="fwin"><rect class="draw" x="100" y="290" width="46" height="40" fill="none" stroke="${INK}" stroke-width="5"/><rect class="draw" x="170" y="290" width="46" height="40" fill="none" stroke="${INK}" stroke-width="5"/><rect class="draw" x="330" y="290" width="46" height="40" fill="none" stroke="${INK}" stroke-width="5"/><rect class="draw" x="400" y="290" width="46" height="40" fill="none" stroke="${INK}" stroke-width="5"/></g>
            <line class="draw" id="fground" x1="0" y1="440" x2="936" y2="440" stroke="${INK}" stroke-width="6"/>
            <g id="smoke"><circle id="sm1" cx="135" cy="80" r="14" fill="${GREY}" opacity="0"/><circle id="sm2" cx="140" cy="80" r="20" fill="${GREY}" opacity="0"/><circle id="sm3" cx="402" cy="110" r="12" fill="${GREY}" opacity="0"/></g>
            <g id="gears" opacity="0">${gear("g1", 640, 330, 62)}${gear("g2", 760, 390, 44)}</g>
            <g id="fstamp" opacity="0" transform="translate(690 190)"><rect x="-140" y="-46" width="280" height="92" fill="none" stroke="${GREEN}" stroke-width="8" transform="rotate(-8)"/><text class="big" x="0" y="22" text-anchor="middle" font-size="64" fill="${GREEN}" transform="rotate(-8)" style="font-family:'Big Shoulders Display';font-weight:900">DECIDIÓ</text></g>
            ${cota("c1", 60, 470, 480, 470, "INDUSTRIA · 2026")}
            ${cota("c2", 30, 90, 30, 440, "h")}
            <text class="hand" id="flbl" x="480" y="140" font-size="26" fill="${MINT}" opacity="0">← agentes de código</text>
            <g id="thumb" opacity="0" transform="translate(830 300)"><path d="M-30 20 h-26 v70 h26z M-30 30 c0 -30 22 -34 26 -66 c2 -14 22 -12 22 6 c0 14 -8 30 -8 36 h46 c14 0 16 22 2 26 c14 4 12 26 -4 28 c12 6 8 26 -8 28 c10 6 4 24 -10 24 h-66 z" fill="${BG}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/></g>
          </g>
          <!-- 2. el escritorio de RH: silla vacía y letrero -->
          <g id="desk" opacity="0" clip-path="url(#stagecut)">
            <rect x="80" y="300" width="500" height="26" fill="${INK}"/><rect x="100" y="326" width="22" height="114" fill="${INK}"/><rect x="538" y="326" width="22" height="114" fill="${INK}"/>
            <rect x="150" y="240" width="130" height="60" fill="${BG}" stroke="${INK}" stroke-width="5"/><rect x="180" y="296" width="70" height="8" fill="${INK}"/>
            <g id="chair" transform="translate(720 330)"><rect x="-52" y="-110" width="104" height="120" rx="14" fill="${BG}" stroke="${INK}" stroke-width="6"/><rect x="-70" y="10" width="140" height="22" rx="6" fill="${INK}"/><rect x="-8" y="32" width="16" height="50" fill="${INK}"/><path d="M-60 100 h120 M0 82 v18" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g>
            <g id="hiring" transform="translate(330 120)"><rect x="-150" y="-60" width="300" height="120" fill="${MINT}"/><text class="big" x="0" y="-8" text-anchor="middle" font-size="48" fill="${BG}" style="font-family:'Big Shoulders Display';font-weight:900">SE SOLICITA</text><text class="hand" x="0" y="40" text-anchor="middle" font-size="26" fill="${BG}">requisito: usa agentes</text></g>
            <line x1="0" y1="440" x2="936" y2="440" stroke="${INK}" stroke-width="6"/>
          </g>
          <!-- 3. el tablero con las fichas ya puestas -->
          <g id="board" opacity="0">
            <g transform="translate(40 30)"><rect x="30" y="40" width="400" height="400" fill="none" stroke="${INK}" stroke-width="6"/>
              ${[1, 2, 3].map((i) => `<line x1="${30 + i * 100}" y1="40" x2="${30 + i * 100}" y2="440" stroke="${INK}" stroke-width="3" opacity=".5"/><line x1="30" y1="${40 + i * 100}" x2="430" y2="${40 + i * 100}" stroke="${INK}" stroke-width="3" opacity=".5"/>`).join("")}
              ${pieces()}
            </g>
            <g id="bstamp" opacity="0" transform="translate(690 150)"><rect x="-150" y="-46" width="300" height="92" fill="none" stroke="${GREEN}" stroke-width="8" transform="rotate(6)"/><text x="0" y="22" text-anchor="middle" font-size="64" fill="${GREEN}" transform="rotate(6)" style="font-family:'Big Shoulders Display';font-weight:900">SETEADO</text></g>
            <g id="bwell" opacity="0" transform="translate(690 320)"><text class="hand" x="0" y="0" text-anchor="middle" font-size="34" fill="${MINT}">quién los usa</text><text x="0" y="60" text-anchor="middle" font-size="72" fill="${GREEN}" style="font-family:'Big Shoulders Display';font-weight:900">BIEN</text></g>
          </g>
          <!-- 4. el teléfono con la burbuja de WhatsApp -->
          <g id="phone" opacity="0">
            <g id="phoneg" transform="translate(180 20)"><rect x="0" y="0" width="230" height="440" rx="28" fill="${BG}" stroke="${INK}" stroke-width="6"/><rect x="80" y="18" width="70" height="8" rx="4" fill="${INK}"/><rect x="18" y="44" width="194" height="360" fill="none" stroke="${INK}" stroke-width="3" opacity=".5"/>
              <g id="dots"><circle cx="60" cy="380" r="7" fill="${GREY}"/><circle cx="86" cy="380" r="7" fill="${GREY}"/><circle cx="112" cy="380" r="7" fill="${GREY}"/></g>
              <g id="msg1" opacity="0"><rect x="30" y="70" width="150" height="46" rx="12" fill="${GREEN}"/><text class="hand" x="46" y="101" font-size="24" fill="${BG}">¿una duda?</text></g>
              <g id="msg2" opacity="0"><rect x="30" y="130" width="170" height="46" rx="12" fill="${GREEN}"/><text class="hand" x="46" y="161" font-size="24" fill="${BG}">¿y otra cosa?</text></g>
              <g id="msg3" opacity="0"><rect x="30" y="190" width="120" height="46" rx="12" fill="${GREEN}"/><text class="hand" x="46" y="221" font-size="24" fill="${BG}">oye…</text></g>
            </g>
            <text class="hand" id="plbl" x="440" y="120" font-size="28" fill="${MINT}" opacity="0">un estudiante</text>
            <!-- el gafete con la medalla -->
            <g id="badge" opacity="0" transform="translate(620 250)"><path d="M30 -60 v40" stroke="${INK}" stroke-width="6"/><rect x="-100" y="-20" width="260" height="170" rx="10" fill="${BG}" stroke="${INK}" stroke-width="6"/><rect x="-100" y="-20" width="260" height="44" fill="${INK}"/><text x="30" y="14" text-anchor="middle" font-size="34" fill="${BG}" style="font-family:'Big Shoulders Display';font-weight:900">DEVELOPER</text><circle cx="-40" cy="90" r="34" fill="${BG}" stroke="${INK}" stroke-width="5"/><path d="M-52 90 l8 8 l18 -20" stroke="${INK}" stroke-width="5" fill="none"/><text class="hand" x="10" y="82" font-size="24" fill="${INK}">moral de</text><text class="hand" x="10" y="112" font-size="24" fill="${INK}">developer</text>
              <g id="medal" opacity="0" transform="translate(150 -30)"><circle r="38" fill="${GREEN}"/><path d="M-14 -40 l-16 -40 h60 l-16 40" fill="${GREEN}" opacity=".6"/><text class="mono" y="8" text-anchor="middle" font-size="18" fill="${BG}">MORAL</text></g>
            </g>
            <!-- la gran pregunta -->
            <g id="ask" opacity="0" transform="translate(440 350)"><path d="M0 0 h470 v120 h-380 l-30 30 v-30 h-60 z" fill="${INK}"/><text class="hand" x="22" y="48" font-size="30" fill="${BG}">¿estás de acuerdo en usar</text><text class="hand" x="22" y="94" font-size="30" fill="${BG}">IA para programar?</text></g>
            ${cota("c3", 440, 505, 910, 505, "HOY · 2026")}
            <text class="hand" id="oldlbl" x="480" y="330" text-anchor="start" font-size="26" fill="${MINT}" opacity="0">se escucha viejo</text>
          </g>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:22px;color:${MINT};font-weight:400">PLANO 05 · SISTEMAS AGÉNTICOS · UN BACKEND, n CANALES · 14 SEP 2026</div>
        <div class="big k" id="i2" style="top:310px;font-size:168px;line-height:.9;letter-spacing:.01em;color:${INK};text-transform:uppercase">La industria<br /><span style="color:${MINT}">ya decidió,</span></div>
        <div class="hand k" id="i3" style="top:640px;left:520px;font-size:120px;line-height:1;color:${GREEN};transform:rotate(-6deg)">manito.</div>
        <div class="hand k" id="i4" style="top:820px;font-size:46px;color:${INK};line-height:1.25;width:900px">¿Discutir si usar agentes<br />para programar? Ya no es<br />la pregunta.</div>
        <div id="i6" style="position:absolute;left:72px;top:1030px;width:420px;height:340px;border:4px solid ${INK};overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div id="i7" style="position:absolute;left:520px;top:1030px;width:488px;height:340px;border:4px solid ${INK};overflow:hidden">
          <svg viewBox="0 0 488 340" style="width:488px;height:340px">
            <path d="M40 290 V170 L130 130 V170 L220 130 V170 L310 130 V290 Z" fill="rgba(133,221,203,.18)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
            <rect x="70" y="60" width="34" height="110" fill="none" stroke="${INK}" stroke-width="5"/><rect x="250" y="80" width="30" height="90" fill="none" stroke="${INK}" stroke-width="5"/>
            <rect x="150" y="230" width="40" height="60" fill="none" stroke="${INK}" stroke-width="5"/>
            <line x1="0" y1="290" x2="488" y2="290" stroke="${INK}" stroke-width="5"/>
            <g id="ig1">${gear("ig1g", 390, 220, 40)}</g><g id="ig2">${gear("ig2g", 455, 262, 28)}</g>
            <circle id="ism1" cx="87" cy="50" r="10" fill="${GREY}"/><circle id="ism2" cx="265" cy="70" r="8" fill="${GREY}"/>
            <text class="mono" x="175" y="322" text-anchor="middle" font-size="16" fill="${MINT}">INDUSTRIA · 2026</text>
          </svg>
        </div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="hand k" id="o1" style="top:262px;font-size:60px;color:${INK};line-height:1.2;width:936px">«Puedo tener mi opinión,<br />pero la industria ya decidió.»</div>
        <div id="o2" style="position:absolute;left:72px;width:936px;top:440px;height:2px;background:${MINT};transform-origin:left center"></div>
        <div class="k" style="top:500px">
          <div id="o3" class="mono" style="font-size:24px;color:${MINT};font-weight:400">TALLER GRABADO · 5 SESIONES · ON DEMAND</div>
          <div id="o4" class="big" style="margin-top:20px;font-size:132px;line-height:.9;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:36px;font-size:24px;line-height:1.7;color:${INK};font-weight:400">SESIÓN 05 · UN BACKEND, n CANALES (WHATSAPP) · 14 SEP 2026<br />LAS 5 SESIONES YA ESTÁN GRABADAS. ENTRAS HOY.</div>
          <div id="o6" class="big" style="margin-top:48px;display:inline-block;padding:20px 30px;background:${MINT};color:${BG};font-size:40px;letter-spacing:.02em">INSCRÍBETE EN FIXTERGEEK.COM/SISTEMAS-AGENTICOS</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <div id="wipe">${cols}</div>
      <img id="wipeword" src="assets/ghosty.png" />
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", MINT = "${MINT}", GREEN = "${GREEN}", GREY = "${GREY}", BG = "${BG}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: la retícula se desplaza un módulo, sin cesar
      tl.to("#bg", { x: 144, y: 144, duration: 24, ease: "none", repeat: REP(24) }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 10, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { rotation: -3, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#ig1g", { rotation: 180, svgOrigin: "390 220", duration: 4.4, ease: "none" }, 0);
      tl.to("#ig2g", { rotation: -257, svgOrigin: "455 262", duration: 4.4, ease: "none" }, 0);
      tl.fromTo("#ism1", { y: 0, opacity: .6 }, { y: -40, opacity: 0, duration: 1.4, ease: "power1.out", repeat: 2 }, 0);
      tl.fromTo("#ism2", { y: 0, opacity: .6 }, { y: -34, opacity: 0, duration: 1.2, ease: "power1.out", repeat: 2 }, .5);

      // ---- cortinilla: rebanadas sesgadas con rebote y Ghosty (asset oficial, sin repintar) sellando el corte
      tl.set(".col", { skewY: -8, xPercent: (i) => (i % 2 ? 110 : -110) }, 0);
      tl.set("#wipeword", { xPercent: -50, yPercent: -50, scale: .2, rotation: -20 }, 0);
      const wipe = (t) => {
        tl.to(".col", { xPercent: 0, duration: .38, stagger: { each: .03, from: "center" }, ease: "back.out(1.2)" }, t);
        tl.to("#wipeword", { opacity: 1, scale: 1, rotation: 0, duration: .3, ease: "back.out(2.5)" }, t + .3);
        tl.to("#wipeword", { opacity: 0, scale: 1.6, duration: .2, ease: "power2.in" }, t + .85);
        tl.to(".col", { xPercent: (i) => (i % 2 ? -110 : 110), duration: .42, stagger: { each: .04, from: "edges" }, ease: "power3.in" }, t + .78);
        tl.set(".col", { xPercent: (i) => (i % 2 ? 110 : -110) }, t + .78 + .42 + .04 * 5 + .02);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cajetín: la cara respira y da un golpe en las palabras clave
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [5.33, 13.23, 16.95, 27.57, 37.5, 47.22, 56.7, 57.3].forEach(punch);

      // ---- cartel: cambia en seco, como una plancha; la cota de abajo se redibuja
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .12, ease: "power3.in" }, BO + t - .12);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .22, ease: "power3.out" }, BO + t);
        tl.fromTo("#signrule", { scaleX: 0 }, { scaleX: 1, duration: .4, ease: "power2.out" }, BO + t);
      };
      sign(5.33, "¿QUIÉN<br /><em>TE CONTRATA?</em>");
      sign(9.54, "EL JUEGO<br /><em>YA ESTÁ SETEADO</em>");
      sign(16.95, "QUIÉN LOS<br /><em>USA BIEN</em>");
      sign(21.02, "UN<br /><em>ESTUDIANTE</em>");
      sign(35.15, "MORAL DE<br /><em>DEVELOPER</em>");
      sign(40.78, "¿ESTÁS DE<br /><em>ACUERDO?</em>");
      sign(52.99, "LA INDUSTRIA<br /><em>YA DECIDIÓ</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const show = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .15 }, at(t));
      const drawOn = (sel, t, d = .5, stagger = .08) => tl.to(sel, { strokeDashoffset: 0, duration: d, ease: "power2.inOut", stagger }, at(t));
      const stamp = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t)).from(id, { scale: 2.2, svgOrigin: id === "#fstamp" ? "690 190" : "690 150", duration: .22, ease: "power3.in", immediateRender: false }, at(t));

      // 0.00 "la industria": la fábrica se dibuja a mano: suelo, cuerpo, chimeneas, ventanas, puerta
      // SFX: paper ×4 (trazos), tick ×2 (cotas)
      drawOn("#fground", 0.0, .4, 0);
      drawOn("#fbody", 0.2, .9, 0);
      drawOn("#fchim1, #fchim2", 0.7, .5);
      drawOn("#fwin rect", 1.1, .3, .06);
      drawOn("#fdoor", 1.3, .3, 0);
      tl.to("#c1", { opacity: 1, duration: .2 }, at(1.6));
      tl.to("#c2", { opacity: 1, duration: .2 }, at(1.8));
      // 2.09 "agentes de código": los engranes aparecen y giran; el humo sube (bucle finito)
      // SFX: block, pop
      show("#gears", 2.0); tl.from("#gears", { scale: 0, svgOrigin: "700 360", duration: .3, ease: "back.out(2)", immediateRender: false }, at(2.0));
      tl.to("#g1", { rotation: 360, svgOrigin: "640 330", duration: 6, ease: "none", repeat: 8 }, at(2.3));
      tl.to("#g2", { rotation: -360, svgOrigin: "760 390", duration: 4.2, ease: "none", repeat: 12 }, at(2.3));
      tl.to("#flbl", { opacity: 1, duration: .2 }, at(2.4));
      [["#sm1", 0], ["#sm2", .9], ["#sm3", .5]].forEach(([id, d]) => {
        tl.fromTo(id, { y: 0, opacity: 0 }, { y: -70, opacity: .55, duration: 1.4, ease: "power1.out", repeat: 3, repeatDelay: .4 }, at(2.4 + d));
        tl.to(id, { opacity: 0, duration: .3 }, at(5.0));
      });
      // 5.33 "¿qué empresa…?": la fábrica se va, entra el escritorio de RH con la silla vacía
      // SFX: whoosh-short, block, whoosh-fly (silla)
      hide("#factory", 5.1);
      tl.to("#c1, #c2, #flbl", { opacity: 0, duration: .1 }, at(5.1));
      show("#desk", 5.33); tl.from("#desk", { x: -120, duration: .4, ease: "power3.out", immediateRender: false }, at(5.33));
      tl.from("#hiring", { y: -200, duration: .5, ease: "bounce.out", immediateRender: false }, at(5.9));
      // 7.33 "contratar": la silla gira vacía
      tl.to("#chair", { rotation: 360, svgOrigin: "720 330", duration: 1.4, ease: "power2.inOut", repeat: 1 }, at(7.33));
      // 9.54 "el juego ya está seteado": el tablero con las fichas ya puestas
      // SFX: whoosh-short, land ×11, stamp
      hide("#desk", 9.4);
      show("#board", 9.54); tl.from("#board", { y: 80, duration: .35, ease: "power3.out", immediateRender: false }, at(9.54));
      [0, 1, 3, 4, 6, 7, 9, 10, 12, 14, 15].forEach((n, i) => {
        show("#pz" + n, 10.2 + i * .12); tl.from("#pz" + n, { scale: 0, svgOrigin: (70 + 50 + (n % 4) * 100) + " " + (70 + 50 + Math.floor(n / 4) * 100), duration: .18, ease: "back.out(3)", immediateRender: false }, at(10.2 + i * .12));
      });
      stamp("#bstamp", 13.23);
      // 16.95 "usa bien": una ficha se enciende en verde; 19.57 "quién los usa, quién no": las demás en gris
      // SFX: ding, tick ×10
      tl.to("#pz6 circle", { stroke: GREEN, duration: .2 }, at(16.95));
      tl.to("#pz6", { scale: 1.25, svgOrigin: "320 320", duration: .2, yoyo: true, repeat: 1 }, at(16.95));
      show("#bwell", 16.95); tl.from("#bwell", { scale: .4, svgOrigin: "690 340", duration: .3, ease: "back.out(2)", immediateRender: false }, at(16.95));
      tl.to(".pz:not(#pz6) circle", { stroke: GREY, duration: .2, stagger: .05 }, at(19.57));
      // 21.02 "tengo un estudiante": el teléfono; 23.85 "me pregunta": llegan los mensajes; 27.57 vibra
      // SFX: whoosh-short, pop ×3, tick ×6 (vibración)
      hide("#board", 20.9);
      show("#phone", 21.02); tl.from("#phoneg", { y: 120, duration: .4, ease: "back.out(1.4)", immediateRender: false }, at(21.02));
      tl.to("#plbl", { opacity: 1, duration: .2 }, at(21.75));
      [["#msg1", 23.85], ["#msg2", 25.7], ["#msg3", 26.72]].forEach(([id, t]) => {
        show(id, t); tl.from(id, { scale: 0, svgOrigin: "210 " + (20 + 90 + 60 * [ "#msg1", "#msg2", "#msg3"].indexOf(id)), duration: .22, ease: "back.out(3)", immediateRender: false }, at(t));
      });
      tl.to("#dots circle", { y: -8, duration: .25, yoyo: true, repeat: 15, stagger: .1, ease: "sine.inOut" }, at(23.0));
      tl.to("#phoneg", { rotation: 3, svgOrigin: "295 240", duration: .06, yoyo: true, repeat: 11, ease: "none" }, at(27.57));
      // 35.15 "vino con su moral": el gafete de developer; 36.56 la medalla MORAL
      // SFX: pin, coin
      show("#badge", 35.15); tl.from("#badge", { y: -80, duration: .4, ease: "bounce.out", immediateRender: false }, at(35.15));
      show("#medal", 36.56); tl.from("#medal", { scale: 0, svgOrigin: "770 220", duration: .3, ease: "back.out(3)", immediateRender: false }, at(36.56));
      tl.to("#medal", { rotation: 12, svgOrigin: "770 220", duration: .5, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(37.0));
      // 40.78 "¿estás de acuerdo…?": la gran pregunta
      // SFX: pop
      tl.to("#badge", { scale: .78, svgOrigin: "650 250", duration: .3 }, at(40.6));
      show("#ask", 40.78); tl.from("#ask", { scale: 0, svgOrigin: "440 470", duration: .3, ease: "back.out(2)", immediateRender: false }, at(40.78));
      // 47.22 "imagínense cómo se escucha eso hoy": la cota mide la pregunta; 49.02 "hoy"
      // SFX: tick ×2
      tl.to("#c3", { opacity: 1, duration: .2 }, at(47.5));
      tl.to("#ask", { fill: GREY, duration: .3 }, at(48.8));
      tl.to("#ask path", { fill: GREY, duration: .3 }, at(48.8));
      tl.to("#oldlbl", { opacity: 1, duration: .2 }, at(49.02));
      // 52.99 "le dije": vuelve la fábrica, ya terminada; 56.70 "decidió": el sello; 57.30 "manito": el pulgar
      // SFX: whoosh-short, block, stamp, coin
      hide("#phone", 52.8);
      tl.to("#c3", { opacity: 0, duration: .1 }, at(52.8));
      tl.set(".draw", { strokeDashoffset: 0 }, at(52.9));
      tl.set("#c1, #c2, #flbl", { opacity: 1 }, at(52.9));
      tl.to("#factory", { opacity: 1, duration: .01 }, at(52.99)); tl.from("#factory", { y: 60, duration: .4, ease: "power3.out", immediateRender: false }, at(52.99));
      tl.to("#fbody, #fchim1, #fchim2, #fdoor", { fill: "rgba(133,221,203,.18)", duration: .4 }, at(53.4));
      tl.to("#g1", { rotation: "+=360", svgOrigin: "640 330", duration: 5, ease: "none" }, at(53.0));
      tl.to("#g2", { rotation: "-=360", svgOrigin: "760 390", duration: 3.5, ease: "none" }, at(53.0));
      tl.to("#flbl", { opacity: 0, duration: .15 }, at(56.4));
      stamp("#fstamp", 56.70);
      show("#thumb", 57.30); tl.from("#thumb", { scale: 0, svgOrigin: "830 340", duration: .3, ease: "back.out(3)", immediateRender: false }, at(57.30));
      tl.to("#thumb", { rotation: -10, svgOrigin: "830 340", duration: .3, yoyo: true, repeat: 1 }, at(57.6));

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

// SFX (tiempo del clip): mismos números que la timeline; sin repetir el mismo sonido dos veces seguidas
const sfx = {
  paper: [0.0, 0.2, 0.7, 1.3],
  tick: [1.6, 1.8, ...Array.from({ length: 10 }, (_, i) => +(19.57 + i * .05).toFixed(3)), ...Array.from({ length: 6 }, (_, i) => +(27.57 + i * .12).toFixed(3)), 47.5, 49.02],
  block: [2.0, 5.9, 53.4],
  pop: [2.4, 23.85, 25.7, 26.72, 40.78],
  "whoosh-short": [5.1, 9.4, 20.9, 52.8],
  "whoosh-fly": [7.33],
  land: Array.from({ length: 11 }, (_, i) => +(10.2 + i * .12).toFixed(3)),
  stamp: [13.23, 56.70],
  ding: [16.95],
  pin: [35.15],
  coin: [36.56, 57.30],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
