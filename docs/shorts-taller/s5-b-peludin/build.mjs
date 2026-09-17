import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 60.29;        // dos tramos: 21:44.6+8.75 s y 22:43.5+51.5 s de la sesión 5
const CUT = 8.75;          // segundo del clip donde pegan los dos tramos (zoom-punch)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 71.7;

// tema: paleta de formmy.app (sacada de su CSS el 15 sep 2026). Cambiar aquí cambia todo.
const T = {
  bg: "#191A20",      // fondo oscuro
  lilac: "#9A99EA",   // marca (el color de Ghosty)
  light: "#F5F5FC",   // claro
  aqua: "#8AD7C9",
  lime: "#BFDD78",
  wa: "#25D366",      // verde WhatsApp
  grey: "#878893",
};
const { bg: BG, lilac: LILAC, light: INK, aqua: AQUA, lime: LIME, wa: WA, grey: GREY } = T;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; palabra en curso en lila, dichas en claro, por decir en gris
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// estrella Y2K de n picos
const star = (cx, cy, r1, r2, n = 12) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1;
    d += (i ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(1) + " " + (cy + Math.sin(a) * r).toFixed(1) + " ";
  }
  return d + "Z";
};
// la botella de Peludín: tapa, cuello, cuerpo con etiqueta y perrito
const bottle = (id, x, y, s = 1, full = true) => `<g id="${id}"><g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-34" y="-150" width="68" height="34" rx="8" fill="${LIME}" stroke="${INK}" stroke-width="6"/>
  <rect x="-22" y="-118" width="44" height="26" fill="${INK}"/>
  <path d="M-70 -92 h140 v190 a30 30 0 0 1 -30 30 h-80 a30 30 0 0 1 -30 -30 z" fill="${full ? LILAC : BG}" stroke="${INK}" stroke-width="6"/>
  <rect class="lbl" x="-56" y="-50" width="112" height="110" rx="12" fill="${INK}"/>
  <text x="0" y="-16" text-anchor="middle" font-size="22" fill="${BG}" style="font-family:'Chango'">PELUDÍN</text>
  ${dog(id + "d", 0, 12, .28, BG)}
  <text x="0" y="52" text-anchor="middle" font-size="12" fill="${BG}" style="font-family:'Space Mono';font-weight:700">CHAMPÚ · PERROS</text>
</g></g>`;
// el perrito de Peludín (dibujado a mano). Sin transform propio en lo que anima GSAP:
// la cola se dibuja aparte, en coordenadas absolutas, para que svgOrigin apunte al eje real.
const dog = (id, ox, oy, s = 1, K = INK) => `<g id="${id}"><g transform="translate(${ox} ${oy}) scale(${s})">
  <ellipse cx="-40" cy="112" rx="24" ry="14" fill="${LILAC}" stroke="${K}" stroke-width="6"/><ellipse cx="40" cy="112" rx="24" ry="14" fill="${LILAC}" stroke="${K}" stroke-width="6"/>
  <ellipse cx="0" cy="60" rx="80" ry="60" fill="${LILAC}" stroke="${K}" stroke-width="6"/>
  <ellipse cx="0" cy="76" rx="44" ry="34" fill="${INK}"/>
  <rect x="-44" y="18" width="88" height="16" rx="8" fill="${LIME}" stroke="${K}" stroke-width="5"/><circle cx="0" cy="40" r="11" fill="${AQUA}" stroke="${K}" stroke-width="4"/>
  <ellipse cx="-74" cy="-14" rx="24" ry="54" transform="rotate(16 -74 -14)" fill="${LILAC}" stroke="${K}" stroke-width="6"/><ellipse cx="74" cy="-14" rx="24" ry="54" transform="rotate(-16 74 -14)" fill="${LILAC}" stroke="${K}" stroke-width="6"/>
  <circle cx="0" cy="-30" r="70" fill="${LILAC}" stroke="${K}" stroke-width="6"/>
  <circle cx="-22" cy="-96" r="16" fill="${LILAC}" stroke="${K}" stroke-width="6"/><circle cx="4" cy="-104" r="17" fill="${LILAC}" stroke="${K}" stroke-width="6"/><circle cx="28" cy="-94" r="14" fill="${LILAC}" stroke="${K}" stroke-width="6"/>
  <circle cx="-2" cy="-92" r="12" fill="${LILAC}"/><circle cx="18" cy="-86" r="10" fill="${LILAC}"/>
  <ellipse cx="0" cy="2" rx="32" ry="24" fill="${INK}"/>
  <circle cx="-26" cy="-38" r="11" fill="${BG}"/><circle cx="26" cy="-38" r="11" fill="${BG}"/><circle cx="-22" cy="-42" r="4" fill="${INK}"/><circle cx="30" cy="-42" r="4" fill="${INK}"/>
  <ellipse cx="0" cy="-10" rx="12" ry="9" fill="${BG}"/>
  <path d="M-14 4 q14 14 28 0" fill="none" stroke="${BG}" stroke-width="5" stroke-linecap="round"/>
  <path d="M-4 8 q4 16 8 0" fill="${AQUA}" stroke="${BG}" stroke-width="3"/>
</g></g>`;
const tail = (id, ox, oy, s = 1, K = INK) => `<path id="${id}" d="M${ox + 78 * s} ${oy + 40 * s} c${30 * s} ${-18 * s} ${62 * s} ${-48 * s} ${44 * s} ${-92 * s}" fill="none" stroke="${LILAC}" stroke-width="${16 * s}" stroke-linecap="round"/><path d="M${ox + 78 * s} ${oy + 40 * s} c${30 * s} ${-18 * s} ${62 * s} ${-48 * s} ${44 * s} ${-92 * s}" fill="none" stroke="${K}" stroke-width="${6 * s}" stroke-linecap="round" opacity="0"/>`;
// figurita de la fila
const person = (x) => `<g transform="translate(${x} 0)"><circle cx="0" cy="-58" r="18" fill="${BG}" stroke="${INK}" stroke-width="5"/><path d="M-22 0 v-30 a22 22 0 0 1 44 0 v30 z" fill="${BG}" stroke="${INK}" stroke-width="5"/></g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Chango&family=Fredoka:wght@500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Fredoka", sans-serif; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      .chango { font-family: "Chango", cursive; font-weight: 400; }
      .board { position: absolute; left: -144px; top: -144px; width: 1368px; height: 2208px; background: ${BG}; }
      /* tablero Y2K: cuadros lila tenues en dos escalas */
      .boardin { position: absolute; inset: 0; opacity: 1;
        background-image: linear-gradient(45deg, rgba(154,153,234,.10) 25%, transparent 25%, transparent 75%, rgba(154,153,234,.10) 75%),
          linear-gradient(45deg, rgba(154,153,234,.10) 25%, transparent 25%, transparent 75%, rgba(154,153,234,.10) 75%);
        background-size: 144px 144px; background-position: 0 0, 72px 72px; }

      /* cabecera (250–400): la cara en un sticker redondo con estrella detrás, y una píldora con el nombre */
      #av { position: absolute; left: 72px; top: 240px; width: 170px; height: 170px; border-radius: 50%; overflow: hidden; border: 8px solid ${INK}; z-index: 31; background: ${BG}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #avstar { position: absolute; left: 40px; top: 208px; width: 234px; height: 234px; z-index: 30; }
      #who { position: absolute; left: 270px; top: 262px; z-index: 30; }
      #who b { display: inline-block; font-family: "Chango"; font-weight: 400; font-size: 44px; color: ${BG}; background: ${AQUA}; border: 6px solid ${INK}; border-radius: 60px; padding: 8px 28px; }
      #who span { display: block; margin-top: 10px; margin-left: 8px; font-family: "Space Mono"; font-weight: 700; font-size: 20px; color: ${AQUA}; }
      #tag { position: absolute; right: 72px; top: 262px; z-index: 30; font-family: "Space Mono"; font-weight: 700; font-size: 20px; color: ${BG}; background: ${LIME}; border: 6px solid ${INK}; border-radius: 40px; padding: 10px 20px; }

      /* cartel (430–650): Chango en dos líneas, la segunda en lila */
      #sign { position: absolute; left: 72px; right: 72px; top: 430px; height: 220px; z-index: 30; }
      #signin { font-family: "Chango"; font-weight: 400; font-size: 104px; line-height: .98; color: ${INK}; text-transform: uppercase; transform-origin: left top; white-space: nowrap; }
      #signin em { font-style: normal; color: ${LILAC}; }

      /* escenario (660–1170) */
      #stage { position: absolute; left: 72px; top: 660px; width: 936px; height: 510px; z-index: 20; }
      #stage svg { width: 936px; height: 510px; overflow: visible; font-family: "Fredoka"; font-weight: 700; }

      /* karaoke (1190–1390) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1190px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.1; font-weight: 700; }
      .w { display: inline-block; color: ${GREY}; padding: 0 8px; }

      /* zoom-punch: la botella crece hasta tapar el cuadro; del otro lado una estrella se encoge */
      #punch { position: absolute; left: 50%; top: 50%; z-index: 70; pointer-events: none; width: 300px; height: 420px; margin-left: -150px; margin-top: -210px; opacity: 0; }
      #burst { position: absolute; left: 50%; top: 50%; z-index: 71; pointer-events: none; width: 2600px; height: 2600px; margin-left: -1300px; margin-top: -1300px; opacity: 0; }
      #ghost { position: absolute; left: 50%; top: 50%; z-index: 72; pointer-events: none; width: 560px; height: 604px; margin-left: -280px; margin-top: -302px; opacity: 0; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(25,26,32,.95)) drop-shadow(0 0 22px rgba(25,26,32,.7)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div class="board" id="bg"><div class="boardin"></div></div>

      <svg id="avstar" viewBox="0 0 234 234"><path id="avstarp" d="${star(117, 117, 117, 92, 14)}" fill="${LILAC}"/></svg>
      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS · fixtergeek.com</span></div>
      <div id="tag">SESIÓN 05</div>

      <div id="sign"><div id="signin">¿Y CÓMO<br /><em>SABE?</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 510">
          <!-- 1. la botella con las tres preguntas -->
          <g id="s1">
            ${bottle("b1", 468, 300, 1.3)}
            <g id="q1" opacity="0"><g transform="translate(150 120)"><rect x="-130" y="-34" width="260" height="68" rx="34" fill="${AQUA}" stroke="${INK}" stroke-width="6"/><text x="0" y="12" text-anchor="middle" font-size="30" fill="${BG}">¿OFERTAS?</text></g></g>
            <g id="q2" opacity="0"><g transform="translate(770 200)"><rect x="-150" y="-34" width="300" height="68" rx="34" fill="${LIME}" stroke="${INK}" stroke-width="6"/><text x="0" y="12" text-anchor="middle" font-size="30" fill="${BG}">¿PROMO DEL MES?</text></g></g>
            <g id="qm1" opacity="0"><circle cx="330" cy="120" r="44" fill="${INK}"/><text class="chango" x="330" y="140" text-anchor="middle" font-size="60" fill="${BG}" style="font-family:'Chango'">?</text></g>
            <g id="qm2" opacity="0"><circle cx="640" cy="90" r="36" fill="${LILAC}"/><text class="chango" x="640" y="106" text-anchor="middle" font-size="50" fill="${BG}" style="font-family:'Chango'">?</text></g>
            <g id="qm3" opacity="0"><circle cx="700" cy="420" r="30" fill="${AQUA}"/><text class="chango" x="700" y="433" text-anchor="middle" font-size="40" fill="${BG}" style="font-family:'Chango'">?</text></g>
            <path id="sp1" d="${star(230, 240, 22, 8, 4)}" fill="${LIME}" opacity="0"/><path id="sp2" d="${star(720, 300, 16, 6, 4)}" fill="${INK}" opacity="0"/><path id="sp3" d="${star(560, 470, 14, 5, 4)}" fill="${LIME}" opacity="0"/>
            <g id="q3" opacity="0"><g transform="translate(180 400)"><rect x="-130" y="-34" width="260" height="68" rx="34" fill="${LILAC}" stroke="${INK}" stroke-width="6"/><text x="0" y="12" text-anchor="middle" font-size="30" fill="${BG}">¿CAMBIOS?</text></g></g>
          </g>
          <!-- 2. la etiqueta grande con el perrito; el estante con tres botellas -->
          <g id="s2" opacity="0">
            <path id="bigstar" d="${star(250, 250, 210, 165, 16)}" fill="${LIME}" opacity="0"/>
            ${tail("tail", 250, 250, 1.1)}
            ${dog("dogbig", 250, 250, 1.1)}
            <g id="bubbles"><circle id="bb1" cx="120" cy="150" r="12" fill="${AQUA}" stroke="${INK}" stroke-width="4"/><circle id="bb2" cx="380" cy="130" r="16" fill="${AQUA}" stroke="${INK}" stroke-width="4"/><circle id="bb3" cx="350" cy="260" r="9" fill="${AQUA}" stroke="${INK}" stroke-width="4"/></g>
            <g id="labelbig"><g transform="translate(690 130)"><rect x="-190" y="-60" width="380" height="120" rx="20" fill="${INK}"/><text class="chango" x="0" y="-2" text-anchor="middle" font-size="58" fill="${BG}" style="font-family:'Chango'">PELUDÍN</text><text class="mono" x="0" y="40" text-anchor="middle" font-size="20" fill="${BG}">CHAMPÚ PARA PERROS</text></g></g>
            <g id="hit" opacity="0"><g transform="translate(690 330) rotate(-8)"><path d="${star(0, 0, 130, 100, 12)}" fill="${LIME}" stroke="${INK}" stroke-width="6"/><text x="0" y="-8" text-anchor="middle" font-size="30" fill="${BG}">ÉXITO DE</text><text x="0" y="28" text-anchor="middle" font-size="34" fill="${BG}">VENTAS</text></g></g>
          </g>
          <g id="s3" opacity="0">
            <rect x="60" y="360" width="816" height="26" rx="8" fill="${INK}"/><rect x="60" y="150" width="816" height="14" rx="6" fill="${INK}" opacity=".35"/>
            ${bottle("sh1", 250, 300, .95)}${bottle("sh2", 468, 300, .95)}${bottle("sh3", 686, 300, .95)}
            <g id="agot" opacity="0"><g transform="translate(468 220) rotate(-10)"><rect x="-250" y="-56" width="500" height="112" rx="16" fill="${LILAC}" stroke="${INK}" stroke-width="8"/><text class="chango" x="0" y="22" text-anchor="middle" font-size="64" fill="${BG}" style="font-family:'Chango'">AGOTADO</text></g></g>
            <text id="nohay" x="468" y="470" text-anchor="middle" font-size="34" fill="${AQUA}" opacity="0">ya no hay Peludín</text>
          </g>
          <!-- 3. la burocracia tachada; el grupo de WhatsApp -->
          <g id="s4" opacity="0">
            <g id="buro"><g id="paper"><g transform="translate(120 60)"><rect width="260" height="330" rx="10" fill="${INK}"/><rect x="30" y="40" width="200" height="14" rx="7" fill="${GREY}"/><rect x="30" y="80" width="160" height="14" rx="7" fill="${GREY}"/><rect x="30" y="120" width="200" height="14" rx="7" fill="${GREY}"/><rect x="30" y="160" width="120" height="14" rx="7" fill="${GREY}"/>
                <g id="st1" opacity="0"><g transform="translate(190 230) rotate(-14)"><circle r="40" fill="none" stroke="${LILAC}" stroke-width="7"/><text y="8" text-anchor="middle" font-size="18" fill="${LILAC}">SELLO</text></g></g>
                <g id="st2" opacity="0"><g transform="translate(90 280) rotate(10)"><circle r="40" fill="none" stroke="${LILAC}" stroke-width="7"/><text y="8" text-anchor="middle" font-size="18" fill="${LILAC}">SELLO</text></g></g></g></g>
              <g id="queue"><g transform="translate(0 400)">${person(470)}${person(560)}${person(650)}${person(740)}</g></g>
              <text id="fixlbl" class="mono" x="620" y="200" text-anchor="middle" font-size="24" fill="${AQUA}">"háblale a los de Fixter"</text>
              <text id="ticket" class="mono" x="620" y="250" text-anchor="middle" font-size="22" fill="${GREY}" opacity="0">turno 1/4 · espera 3 días</text>
              <g id="cross" opacity="0"><path d="M60 40 L880 470 M880 40 L60 470" stroke="${LILAC}" stroke-width="26" stroke-linecap="round"/></g>
            </g>
            <g id="phone" opacity="0"><g transform="translate(300 20)">
              <rect x="0" y="0" width="336" height="470" rx="34" fill="${BG}" stroke="${INK}" stroke-width="8"/>
              <rect x="10" y="10" width="316" height="66" rx="26" fill="${WA}"/><text x="168" y="52" text-anchor="middle" font-size="26" fill="${BG}">Grupo · Admin tienda</text>
              <g id="wa1" opacity="0"><rect x="60" y="120" width="250" height="70" rx="16" fill="${WA}"/><text x="80" y="164" font-size="28" fill="${BG}">se acabó el Peludín</text></g>
              <g id="wa2" opacity="0"><rect x="26" y="220" width="200" height="60" rx="16" fill="${INK}"/><text x="46" y="259" font-size="28" fill="${BG}">recibido ✓</text></g>
              <g id="wacheck" opacity="0" transform="translate(168 380)"><circle r="46" fill="${LIME}" stroke="${INK}" stroke-width="6"/><path d="M-22 0 l14 14 l32 -34" fill="none" stroke="${BG}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>
            </g></g>
            <text id="simple" x="800" y="260" text-anchor="middle" font-size="34" fill="${AQUA}" opacity="0">y ya</text>
          </g>
          <!-- 4. Ghosty pone la señal y guarda la memoria; los agentes de Business responden -->
          <g id="s5" opacity="0">
            <image href="assets/ghosty.png" x="80" y="120" width="220" height="254"/>
            <g id="flag" opacity="0"><g transform="translate(320 120)"><rect x="0" y="0" width="10" height="200" fill="${INK}"/><path d="M10 10 h170 l-40 40 l40 40 h-170 z" fill="${LILAC}" stroke="${INK}" stroke-width="6"/><text x="70" y="60" text-anchor="middle" font-size="26" fill="${BG}">¡SEÑAL!</text></g></g>
            <g id="mem" opacity="0"><g transform="translate(560 130)"><rect x="0" y="0" width="330" height="150" rx="18" fill="${INK}"/><rect x="0" y="0" width="330" height="44" rx="18" fill="${AQUA}"/><text class="mono" x="20" y="30" font-size="20" fill="${BG}">MEMORIA</text><text class="mono" x="20" y="90" font-size="26" fill="${BG}">Peludín: 0</text><text class="mono" x="20" y="126" font-size="20" fill="${GREY}">stock · ahora mismo</text></g></g>
            <g id="biz" opacity="0"><g transform="translate(340 300)">
              <rect x="0" y="0" width="560" height="60" rx="30" fill="${WA}"/><text x="280" y="40" text-anchor="middle" font-size="26" fill="${BG}">WhatsApp Business · 100 clientes</text>
              <g id="c1" opacity="0"><rect x="0" y="72" width="260" height="60" rx="16" fill="${INK}"/><text x="20" y="112" font-size="26" fill="${BG}">¿tienen Peludín?</text></g>
              <g id="c2" opacity="0"><rect x="180" y="142" width="380" height="60" rx="16" fill="${LILAC}"/><text x="200" y="182" font-size="24" fill="${BG}">disculpa, no hay stock ahora</text></g>
            </g></g>
          </g>
          <!-- 5. en tiempo real: el reloj y la botella con la estrella -->
          <g id="s6" opacity="0">
            <g id="clock"><circle cx="200" cy="260" r="150" fill="${INK}" stroke="${LILAC}" stroke-width="10"/><rect id="hand" x="194" y="140" width="12" height="120" rx="6" fill="${BG}"/><rect id="hand2" x="200" y="255" width="80" height="10" rx="5" fill="${LILAC}"/><circle cx="200" cy="260" r="12" fill="${BG}"/></g>
            <g id="live"><g transform="translate(640 150) rotate(-6)"><path d="${star(0, 0, 150, 115, 12)}" fill="${LIME}" stroke="${INK}" stroke-width="6"/><text x="0" y="-10" text-anchor="middle" font-size="30" fill="${BG}">EN TIEMPO</text><text class="chango" x="0" y="34" text-anchor="middle" font-size="40" fill="${BG}" style="font-family:'Chango'">REAL</text></g></g>
            ${bottle("b6", 640, 400, .7)}
            <g id="nohands" opacity="0"><g transform="translate(860 380)"><circle r="60" fill="${INK}" stroke="${LILAC}" stroke-width="8"/><path d="M-30 -30 L30 30 M30 -30 L-30 30" stroke="${LILAC}" stroke-width="12" stroke-linecap="round"/><text y="95" text-anchor="middle" font-size="22" fill="${AQUA}">sin intervenir</text></g></g>
          </g>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:22px;color:${AQUA}">TALLER SISTEMAS AGÉNTICOS · SESIÓN 05 · 14 SEP 2026</div>
        <div class="chango k" id="i2" style="top:306px;font-size:100px;line-height:.95;color:${INK};text-transform:uppercase;white-space:nowrap">Administra<br /><span style="color:${LILAC}">tu agente</span></div>
        <div class="k" id="i2b" style="top:548px;display:inline-block;padding:12px 30px;background:${WA};border:6px solid ${INK};border-radius:50px;font-size:54px;font-weight:700;color:${BG};white-space:nowrap">directo en WhatsApp</div>
        <div class="k" id="i3" style="top:672px;font-size:44px;font-weight:700;color:${INK};line-height:1.25;width:900px">Se acabó el producto: se lo dices<br />al agente y ya. Sin programador.</div>
        <div id="i5" style="position:absolute;left:72px;top:800px;width:936px;height:560px">
          <svg viewBox="0 0 936 560" style="width:936px;height:560px;overflow:visible">
            <path id="istar" d="${star(640, 280, 250, 195, 16)}" fill="${LIME}"/>
            ${bottle("ib", 640, 300, 1.55)}
            <g id="iq"><g transform="translate(250 110) rotate(-8)"><rect x="-190" y="-40" width="380" height="80" rx="40" fill="${AQUA}" stroke="${INK}" stroke-width="6"/><text x="0" y="14" text-anchor="middle" font-size="34" fill="${BG}" font-weight="700">se acabó el Peludín</text></g></g>
            <g id="iq2"><g transform="translate(360 520) rotate(6)"><rect x="-160" y="-40" width="320" height="80" rx="40" fill="${LILAC}" stroke="${INK}" stroke-width="6"/><text x="0" y="14" text-anchor="middle" font-size="34" fill="${BG}" font-weight="700">en el grupo</text></g></g>
          </svg>
        </div>
        <div id="i6" style="position:absolute;left:72px;top:1000px;width:250px;height:250px;border-radius:50%;border:8px solid ${INK};overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="k" id="o1" style="top:262px;font-size:52px;font-weight:700;color:${INK};line-height:1.2;width:936px">«Vas a tu grupo de WhatsApp<br />y le dices: se acabó el Peludín.»</div>
        <div id="o2" style="position:absolute;left:72px;width:936px;top:430px;height:10px;border-radius:5px;background:${LILAC};transform-origin:left center"></div>
        <div class="k" style="top:490px">
          <div id="o3" class="mono" style="font-size:24px;color:${AQUA}">TALLER GRABADO · 5 SESIONES · ON DEMAND</div>
          <div id="o4" class="chango" style="margin-top:20px;font-size:118px;line-height:.95;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:36px;font-size:22px;line-height:1.7;color:${INK};font-weight:400">SESIÓN 05 · UN BACKEND, n CANALES (WHATSAPP) · 14 SEP 2026<br />LAS 5 SESIONES YA ESTÁN GRABADAS. ENTRAS HOY.</div>
          <div id="o6" style="margin-top:44px;display:inline-block;padding:20px 32px;background:${LIME};border:6px solid ${INK};border-radius:60px;color:${BG};font-size:34px;font-weight:700">Inscríbete en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <!-- zoom-punch -->
      <svg id="punch" viewBox="-150 -210 300 420">${bottle("pb", 0, 0, 1.2)}</svg>
      <svg id="burst" viewBox="0 0 2600 2600"><path d="${star(1300, 1300, 1300, 1000, 16)}" fill="${LILAC}"/><path d="${star(1300, 1300, 900, 700, 16)}" fill="${LIME}"/><path d="${star(1300, 1300, 780, 620, 16)}" fill="${INK}"/></svg>
      <svg id="ghost" viewBox="-130 -140 260 280">${dog("herodog", 0, 0, 1, BG)}</svg>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, CUT = ${CUT}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", LILAC = "${LILAC}", AQUA = "${AQUA}", LIME = "${LIME}", GREY = "${GREY}", BG = "${BG}", WA = "${WA}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: el tablero se desplaza una casilla, sin cesar
      tl.to("#bg", { x: 144, y: 144, duration: 20, ease: "none", repeat: REP(20) }, 0);
      // la estrella de la cara gira despacio todo el video
      tl.to("#avstar", { rotation: 360, duration: 30, ease: "none", repeat: REP(30) }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#istar", { rotation: 40, svgOrigin: "640 280", duration: 4.4, ease: "none" }, 0);
      tl.to("#ib", { y: -10, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 2 }, 0);
      tl.to("#iq", { rotation: -4, svgOrigin: "250 110", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      tl.to("#iq2", { rotation: 10, svgOrigin: "360 520", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i2b", { rotation: -2, transformOrigin: "left center", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);

      // ---- zoom-punch: la botella crece hasta tapar el cuadro (sella el corte), el perrito salta al centro y la estrella se encoge
      tl.set("#punch", { scale: .2, rotation: -25 }, 0);
      tl.set("#burst", { scale: 1, rotation: 0 }, 0);
      tl.set("#ghost", { scale: .3, rotation: -12 }, 0);
      const punchIn = (t, withGhost) => {
        tl.set("#punch", { opacity: 1, scale: .2, rotation: -25 }, t);
        tl.to("#punch", { scale: 16, rotation: 8, duration: .5, ease: "power3.in" }, t);
        tl.set("#burst", { opacity: 1, scale: 1.2, rotation: 0 }, t + .48);
        tl.set("#punch", { opacity: 0 }, t + .5);
        if (withGhost) {
          tl.set("#ghost", { opacity: 1, scale: .3, rotation: -12 }, t + .5);
          tl.to("#ghost", { scale: 1, rotation: 0, duration: .32, ease: "back.out(2.5)" }, t + .5);
          tl.to("#ghost", { opacity: 0, scale: 1.5, duration: .2, ease: "power2.in" }, t + .82);
          tl.to("#burst", { scale: 0, rotation: 90, duration: .5, ease: "back.in(1.4)" }, t + 1.02);
          tl.set("#burst", { opacity: 0 }, t + 1.52);
        } else {
          tl.to("#burst", { scale: 0, rotation: 90, duration: .5, ease: "back.in(1.4)" }, t + .5);
          tl.set("#burst", { opacity: 0 }, t + 1.0);
        }
      };
      punchIn(3.85, true);
      punchIn(BO + CUT - .5, false);
      punchIn(OUT_IN - .55, true);

      // ---- cabecera: la cara respira y da un golpe en las palabras clave
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [13.15, 20.61, 28.15, 34.94, 39.29, 43.41, 52.69, 57.05].forEach(punch);

      // ---- cartel
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .12, ease: "power3.in" }, BO + t - .12);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .22, ease: "back.out(1.6)" }, BO + t);
      };
      sign(8.6, "EL<br /><em>PELUDÍN</em>");
      sign(20.41, "SE ACABÓ<br /><em>EL PELUDÍN</em>");
      sign(30.18, "SIN<br /><em>BUROCRACIA</em>");
      sign(36.18, "UN GRUPO DE<br /><em>WHATSAPP</em>");
      sign(42.9, "SEÑAL +<br /><em>MEMORIA</em>");
      sign(49.77, "NO HAY<br /><em>STOCK</em>");
      sign(54.98, "EN TIEMPO<br /><em>REAL</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const show = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .15 }, at(t));
      const popIn = (id, t, origin, s = 2.5) => { show(id, t); tl.from(id, { scale: 0, svgOrigin: origin, duration: .28, ease: "back.out(" + s + ")", immediateRender: false }, at(t)); };
      const stampIn = (id, t, origin) => { show(id, t); tl.from(id, { scale: 2.4, svgOrigin: origin, duration: .22, ease: "power3.in", immediateRender: false }, at(t)); };

      // 0.49 "¿cómo sabe cuáles son las ofertas?": las píldoras brotan alrededor de la botella
      // SFX: pop ×3
      tl.to("#b1", { y: -8, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 5 }, at(0));
      popIn("#qm1", 0.49, "330 120", 3); tl.to("#qm1", { rotation: 14, svgOrigin: "330 120", duration: .4, yoyo: true, repeat: 17, ease: "sine.inOut" }, at(0.8));
      popIn("#qm2", 3.36, "640 90", 3); tl.to("#qm2", { rotation: -16, svgOrigin: "640 90", duration: .35, yoyo: true, repeat: 13, ease: "sine.inOut" }, at(3.6));
      popIn("#qm3", 6.52, "700 420", 3); tl.to("#qm3", { rotation: 12, svgOrigin: "700 420", duration: .3, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(6.8));
      [["#sp1", 1.0], ["#sp2", 2.2], ["#sp3", 4.9], ["#sp1", 6.0], ["#sp2", 7.4]].forEach(([id, t]) => tl.fromTo(id, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, svgOrigin: id === "#sp1" ? "230 240" : id === "#sp2" ? "720 300" : "560 470", duration: .25, yoyo: true, repeat: 1, ease: "power2.out" }, at(t)));
      tl.to("#b1", { rotation: -5, svgOrigin: "468 300", duration: .35, yoyo: true, repeat: 21, ease: "sine.inOut" }, at(0.3));
      popIn("#q1", 1.58, "150 120");
      popIn("#q2", 4.17, "770 200");
      popIn("#q3", 7.23, "180 400");
      tl.to("#q1, #q2, #q3", { rotation: 4, svgOrigin: "468 300", duration: .5, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(7.6));
      // 8.75 corte: zoom-punch de la botella. Del otro lado, la etiqueta grande con el perrito
      // SFX: whoosh-fly (8.3), hit-sub (8.9)
      hide("#s1", 8.6);
      tl.set("#s2", { opacity: 1 }, at(8.9));
      tl.from("#labelbig", { y: -300, duration: .5, ease: "bounce.out", immediateRender: false }, at(9.0));
      tl.from("#dogbig, #tail", { scale: 0, svgOrigin: "250 250", duration: .4, ease: "back.out(2)", immediateRender: false }, at(9.2));
      // 13.15 "Peludín": la estrella detrás del perro; la cola mueve todo el rato (bucle finito)
      // SFX: coin
      popIn("#bigstar", 13.15, "250 250", 1.6);
      tl.to("#bigstar", { rotation: 60, svgOrigin: "250 250", duration: 8, ease: "none" }, at(13.4));
      tl.to("#tail", { rotation: -35, svgOrigin: "336 294", duration: .22, yoyo: true, repeat: 25, ease: "sine.inOut" }, at(9.6));
      // 17.33 "champú para perros": suben burbujas
      // SFX: pop ×3
      [["#bb1", 17.33], ["#bb2", 17.6], ["#bb3", 17.9]].forEach(([id, t]) => tl.fromTo(id, { y: 20, opacity: 0 }, { y: -60, opacity: 1, duration: 1.2, ease: "power1.out", repeat: 1 }, at(t)));
      // 20.41 "se acabó el Peludín": el estante con tres botellas; se vacían con cada "Peludín"
      // SFX: whoosh-short, land ×3, block ×3 (vaciadas), coin (éxito), stamp (agotado), tick
      hide("#s2", 20.2);
      show("#s3", 20.41); tl.from("#s3", { y: 80, duration: .35, ease: "power3.out", immediateRender: false }, at(20.41));
      [["#sh1", 20.5], ["#sh2", 20.62], ["#sh3", 20.74]].forEach(([id, t]) => tl.from(id, { y: -120, duration: .35, ease: "bounce.out", immediateRender: false }, at(t)));
      const empty = (id, t, cx) => { tl.to(id + " path", { fill: BG, duration: .2 }, at(t)); tl.to(id, { rotation: -6, svgOrigin: cx + " 300", duration: .12, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(t)); };
      empty("#sh1", 21.27, 250);
      popIn("#hit", 22.48, "690 330", 2);
      empty("#sh2", 24.69, 468);
      empty("#sh3", 25.59, 686);
      tl.to("#hit", { opacity: 0, duration: .2 }, at(27.0));
      stampIn("#agot", 28.15, "468 220");
      tl.to("#nohay", { opacity: 1, duration: .2 }, at(29.53));
      // 30.18 "esto no tiene que pasar por una burocracia": el oficio con sellos y la fila; 34.94 "Fixter" → se tacha
      // SFX: paper, stamp ×2, tick ×4, block (tachón)
      hide("#s3", 30.0);
      show("#s4", 30.18); tl.from("#paper", { y: -200, duration: .4, ease: "bounce.out", immediateRender: false }, at(30.18));
      [470, 560, 650, 740].forEach((x, i) => tl.from("#queue > g:nth-of-type(" + (i + 1) + ")", { x: 300, opacity: 0, duration: .3, ease: "power3.out", immediateRender: false }, at(31.0 + i * .18)));
      stampIn("#st1", 32.33, "310 290");
      stampIn("#st2", 32.9, "210 340");
      tl.to("#ticket", { opacity: 1, duration: .2 }, at(33.67));
      show("#cross", 34.94); tl.from("#cross path", { strokeDasharray: 1200, strokeDashoffset: 1200, duration: .35, ease: "power3.out", immediateRender: false }, at(34.94));
      // 36.18 "vas a tu grupo de WhatsApp": el teléfono tapa la burocracia; 39.29 "se acabó el Peludín" → el mensaje; palomita
      // SFX: whoosh-short, pop, ding
      tl.to("#buro", { opacity: 0, duration: .2 }, at(36.0));
      show("#phone", 36.18); tl.from("#phone", { y: 300, duration: .45, ease: "back.out(1.4)", immediateRender: false }, at(36.18));
      popIn("#wa1", 39.29, "485 175", 3);
      popIn("#wa2", 40.0, "426 270", 3);
      popIn("#wacheck", 40.3, "468 400", 3);
      tl.to("#simple", { opacity: 1, duration: .2 }, at(40.1));
      // 40.92 "el agente en ese momento": Ghosty; 43.41 la señal; 44.81 la memoria; 48.78 Business; 49.97 el cliente; 52.69 la disculpa
      // SFX: whoosh-short, ding (señal), pin (memoria), block (business), pop ×2
      hide("#s4", 40.8);
      show("#s5", 40.92); tl.from("#s5 image", { x: -200, duration: .4, ease: "power3.out", immediateRender: false }, at(40.92));
      popIn("#flag", 43.41, "325 320", 2);
      tl.to("#flag path", { skewX: -10, svgOrigin: "330 130", duration: .25, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(43.7));
      show("#mem", 44.81); tl.from("#mem", { x: 300, duration: .4, ease: "back.out(1.5)", immediateRender: false }, at(44.81));
      show("#biz", 48.78); tl.from("#biz", { y: 100, duration: .35, ease: "power3.out", immediateRender: false }, at(48.78));
      popIn("#c1", 49.97, "340 400", 3);
      popIn("#c2", 52.69, "720 470", 3);
      // 54.98 "todo esto pasa en tiempo real": el reloj corre, la estrella EN TIEMPO REAL, la botella vuelve; 58.27 "intervenir" → ✕ manos fuera
      // SFX: whoosh-short, 8bit-blip ×4, coin, block
      hide("#s5", 54.8);
      show("#s6", 54.98); tl.from("#clock", { scale: 0, svgOrigin: "200 260", duration: .35, ease: "back.out(2)", immediateRender: false }, at(54.98));
      tl.to("#hand", { rotation: 720, svgOrigin: "200 260", duration: 4.6, ease: "none" }, at(55.1));
      tl.to("#hand2", { rotation: 60, svgOrigin: "200 260", duration: 4.6, ease: "none" }, at(55.1));
      tl.from("#live", { scale: 0, svgOrigin: "640 150", duration: .35, ease: "back.out(2.5)", immediateRender: false }, at(56.41));
      tl.to("#live", { rotation: 6, svgOrigin: "640 150", duration: .5, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(56.8));
      tl.from("#b6", { y: 200, duration: .4, ease: "back.out(1.6)", immediateRender: false }, at(57.05));
      popIn("#nohands", 58.27, "860 380", 2);

      // ---- karaoke: palabra en curso en lila, dichas en claro, por decir en gris
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const t = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .18, ease: "power3.out" }, t);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: GREY, scale: 1 }, t - .01)
            .set("#" + w.id, { color: LILAC }, BO + w.s)
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

// SFX (tiempo del clip): mismos números que la timeline; nunca el mismo sonido dos veces seguidas
const sfx = {
  pop: [0.49, 1.58, 3.36, 4.17, 6.52, 7.23, 17.33, 17.6, 17.9, 39.29, 40.0, 49.97, 52.69],
  // cortinillas (en tiempo del clip; las de entrada/salida caen antes del 0 y después del final): soplo mientras crece la botella, golpe al tapar, soplo corto al abrirse la estrella
  "whoosh-fly": [-0.85, 7.95, 20.2, 59.89],
  "hit-sub": [-0.35, 8.45, 60.39],
  coin: [13.15, 22.48, 57.05],
  "whoosh-short": [0.17, 8.5, 30.0, 36.0, 40.8, 54.8, 60.91],
  land: [20.5, 20.62, 20.74],
  block: [21.27, 24.69, 25.59, 34.94, 48.78, 58.27],
  stamp: [28.15, 32.33, 32.9],
  tick: [29.53, 31.0, 31.18, 31.36, 31.54, 33.67],
  paper: [30.18],
  ding: [40.3, 43.41],
  pin: [44.81],
  "8bit-blip": [55.1, 55.6, 56.1, 56.41],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
