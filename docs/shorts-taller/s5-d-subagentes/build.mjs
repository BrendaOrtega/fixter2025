import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 73.4;         // un solo tramo: 1:30:27.7 → 1:31:41.1 de la sesión 5
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 84.8;

// tema: paleta FixterGeek. Piel terminal/CRT: paneles con barra de título, monospace, scanlines
// planas, LEDs. Cambiar aquí cambia todo.
const T = { bg: "#0E1317", mint: "#85DDCB", green: "#8DCF6E", ink: "#F2F5F4", grey: "#7C8A8E", panel: "#141B21" };
const { bg: BG, mint: MINT, green: GREEN, ink: INK, grey: GREY, panel: PANEL } = T;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// panel tipo ventana de terminal: barra con tres LEDs y título
const panel = (id, x, y, w, h, title, extra = "") => `<g id="${id}" ${extra}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${PANEL}" stroke="${INK}" stroke-width="4"/><rect x="${x}" y="${y}" width="${w}" height="34" rx="10" fill="${INK}"/><rect x="${x}" y="${y + 20}" width="${w}" height="14" fill="${INK}"/><circle cx="${x + 18}" cy="${y + 17}" r="6" fill="${BG}"/><circle cx="${x + 38}" cy="${y + 17}" r="6" fill="${GREY}"/><circle cx="${x + 58}" cy="${y + 17}" r="6" fill="${MINT}"/><text class="mono" x="${x + w / 2}" y="${y + 23}" text-anchor="middle" font-size="16" fill="${BG}">${title}</text></g>`;
// medidor de RAM: 10 celdas
const ramCells = (id, x, y) => Array.from({ length: 10 }, (_, i) => `<rect class="cell" id="${id}${i}" x="${x}" y="${y + 200 - i * 22}" width="60" height="18" rx="3" fill="${i < 8 ? MINT : GREEN}" opacity="0"/>`).join("");
// la caja (sandbox): un cubo de cara con LEDs; los ojos cambian a ✕ cuando muere
const box = (id, x, y) => `<g id="${id}"><g transform="translate(${x} ${y})"><rect x="-90" y="-70" width="180" height="140" rx="14" fill="${PANEL}" stroke="${INK}" stroke-width="6"/><rect x="-90" y="-70" width="180" height="24" rx="10" fill="${INK}"/><text class="mono" x="0" y="-52" text-anchor="middle" font-size="14" fill="${BG}">SANDBOX · 2 GB</text>
  <g id="${id}eyes"><circle cx="-34" cy="0" r="12" fill="${MINT}"/><circle cx="34" cy="0" r="12" fill="${MINT}"/><path d="M-18 30 q18 14 36 0" fill="none" stroke="${MINT}" stroke-width="5" stroke-linecap="round"/></g>
  <g id="${id}dead" opacity="0"><path d="M-46 -12 l24 24 M-22 -12 l-24 24 M22 -12 l24 24 M46 -12 l-24 24" stroke="${GREEN}" stroke-width="6" stroke-linecap="round"/><path d="M-18 36 q18 -14 36 0" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round"/></g>
  <circle id="${id}led" cx="70" cy="56" r="7" fill="${GREEN}"/></g></g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@500;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "IBM Plex Mono", monospace; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "IBM Plex Mono", monospace; font-weight: 700; }
      .black { font-family: "Archivo Black", sans-serif; font-weight: 400; }
      .board { position: absolute; left: -100px; top: -100px; width: 1280px; height: 2120px; background: ${BG}; }
      /* scanlines planas: una línea cada 6 px */
      .boardin { position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, rgba(133,221,203,.06) 0 2px, transparent 2px 6px); }

      /* cabecera (250–400): prompt de terminal con la cara como avatar cuadrado */
      #av { position: absolute; left: 72px; top: 250px; width: 150px; height: 150px; overflow: hidden; border: 4px solid ${MINT}; border-radius: 10px; z-index: 31; background: ${BG}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 250px; top: 258px; z-index: 30; font-family: "IBM Plex Mono"; font-weight: 700; }
      #who b { display: block; font-size: 40px; color: ${MINT}; }
      #who b::before { content: "$ "; color: ${GREEN}; }
      #who span { display: block; margin-top: 10px; font-size: 20px; color: ${GREY}; line-height: 1.5; }
      #cursor { display: inline-block; width: 14px; height: 24px; background: ${MINT}; vertical-align: -3px; margin-left: 6px; }

      /* cartel (420–650): Archivo Black, la segunda línea como comentario en verde */
      #sign { position: absolute; left: 72px; right: 72px; top: 420px; height: 230px; z-index: 30; }
      #signin { font-family: "Archivo Black"; font-size: 86px; line-height: 1.02; letter-spacing: -.02em; color: ${INK}; text-transform: uppercase; transform-origin: left top; white-space: nowrap; }
      #signin em { font-style: normal; color: ${GREEN}; }

      /* escenario (660–1170) */
      #stage { position: absolute; left: 72px; top: 660px; width: 936px; height: 510px; z-index: 20; }
      #stage svg { width: 936px; height: 510px; overflow: visible; font-family: "IBM Plex Mono"; font-weight: 700; }

      /* karaoke (1190–1390) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1190px; height: 200px; z-index: 40; display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-family: "Space Grotesk"; font-size: 72px; line-height: 1.1; font-weight: 700; }
      .w { display: inline-block; color: ${GREY}; padding: 0 8px; }

      /* zoom-punch: el módulo de RAM crece hasta tapar; "OOM" sella; del otro lado una cuadrícula que se encoge */
      #punch { position: absolute; left: 50%; top: 50%; z-index: 70; pointer-events: none; width: 420px; height: 200px; margin-left: -210px; margin-top: -100px; opacity: 0; }
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
      <div id="who"><b>hectorbliss<span id="cursor"></span></b><span># sistemas agénticos · sesión 05<br /># fixtergeek.com</span></div>

      <div id="sign"><div id="signin">UNA HERRAMIENTA<br /><em>// bien perrona</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 510">
          <!-- el medidor de RAM vive en todas las escenas -->
          <g id="ram">${panel("rampanel", 776, 40, 140, 300, "RAM")}${ramCells("rc", 816, 90)}<text class="mono" id="rampct" x="846" y="330" text-anchor="middle" font-size="22" fill="${MINT}">20%</text></g>
          <!-- 1. la caja con el agente y la herramienta gigante -->
          <g id="s1">
            ${box("bx", 200, 250)}
            <image href="assets/ghosty.png" x="330" y="140" width="130" height="150"/>
            <g id="tool" opacity="0"><g transform="translate(600 220)"><rect x="-120" y="-90" width="240" height="180" rx="12" fill="${PANEL}" stroke="${GREEN}" stroke-width="6"/><rect x="-120" y="-90" width="240" height="30" rx="10" fill="${GREEN}"/><text class="mono" x="0" y="-68" text-anchor="middle" font-size="16" fill="${BG}">tool: excel_gigante</text>${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${-100 + c * 70}" y="${-45 + r * 30}" width="60" height="22" fill="${BG}" stroke="${GREY}" stroke-width="2"/>`).join("")).join("")}</g></g>
            <text id="filelbl" class="mono" x="600" y="345" text-anchor="middle" font-size="20" fill="${GREEN}" opacity="0">4 GB · 2,000,000 filas</text>
            <g id="chat" opacity="0"><rect x="60" y="400" width="620" height="60" rx="10" fill="${PANEL}" stroke="${INK}" stroke-width="3"/><text class="mono" id="chattxt" x="80" y="438" font-size="20" fill="${INK}">&gt; ¿ya casi? …</text></g>
          </g>
          <!-- 2. en serie: el agente se fue a trabajar y no regresa -->
          <g id="s2" opacity="0">
            ${panel("term", 40, 40, 700, 420, "agente — sesión")}
            <text class="mono" id="t1" x="70" y="110" font-size="22" fill="${MINT}" opacity="0">$ genera el excel gigante</text>
            <text class="mono" id="t2" x="70" y="150" font-size="22" fill="${GREY}" opacity="0">⠋ trabajando… (no regresa)</text>
            <text class="mono" id="t3" x="70" y="200" font-size="22" fill="${INK}" opacity="0">&gt; oye, ¿y lo otro?</text>
            <text class="mono" id="t4" x="70" y="240" font-size="22" fill="${INK}" opacity="0">&gt; hola?</text>
            <text class="mono" id="t5" x="70" y="280" font-size="22" fill="${INK}" opacity="0">&gt; …</text>
            <g id="serial" opacity="0"><rect x="70" y="340" width="600" height="90" rx="8" fill="${BG}" stroke="${GREY}" stroke-width="3"/>${[0, 1, 2, 3].map((i) => `<rect x="${90 + i * 150}" y="360" width="120" height="50" rx="6" fill="${i ? PANEL : MINT}" stroke="${i ? GREY : MINT}" stroke-width="3"/><text class="mono" x="${150 + i * 150}" y="392" text-anchor="middle" font-size="16" fill="${i ? GREY : BG}">${i ? "espera" : "tarea 1"}</text>`).join("")}<text class="mono" x="70" y="326" font-size="14" fill="${GREY}">EN SERIE: una cosa a la vez</text></g>
          </g>
          <!-- 3. en paralelo: brotan subagentes y cada uno muerde RAM -->
          <g id="s3" opacity="0">
            ${box("bx3", 160, 260)}
            <image id="g0" href="assets/ghosty.png" x="280" y="100" width="110" height="127"/>
            ${[0, 1, 2, 3].map((i) => `<image id="sa${i}" href="assets/ghosty.png" x="${430 + (i % 2) * 150}" y="${120 + Math.floor(i / 2) * 170}" width="90" height="104" opacity="0"/><path id="sw${i}" d="M390 165 C420 165 ${420 + (i % 2) * 150} ${170 + Math.floor(i / 2) * 170} ${430 + (i % 2) * 150} ${170 + Math.floor(i / 2) * 170}" fill="none" stroke="${MINT}" stroke-width="3" stroke-dasharray="6 6" opacity="0"/><text class="mono" id="sl${i}" x="${475 + (i % 2) * 150}" y="${245 + Math.floor(i / 2) * 170}" text-anchor="middle" font-size="14" fill="${GREEN}" opacity="0">+20% RAM</text>`).join("")}
            <text class="mono" id="parlbl" x="160" y="420" text-anchor="middle" font-size="16" fill="${MINT}" opacity="0">EN PARALELO</text>
          </g>
          <!-- 4. la lista de herramientas: subagent tachado; la caja se muere -->
          <g id="s4" opacity="0">
            ${panel("tools", 40, 40, 460, 420, "herramientas de Claude")}
            ${["Bash", "Read", "Edit", "Write", "WebFetch", "Agent (subagent)"].map((n, i) => `<g id="tl${i}"><rect x="70" y="${92 + i * 56}" width="26" height="26" rx="4" fill="${BG}" stroke="${i === 5 ? GREEN : MINT}" stroke-width="3"/><path d="M76 ${105 + i * 56} l6 6 l10 -12" fill="none" stroke="${MINT}" stroke-width="3" opacity="${i === 5 ? 0 : 1}"/><text class="mono" x="112" y="${113 + i * 56}" font-size="22" fill="${i === 5 ? GREEN : INK}">${n}</text></g>`).join("")}
            <path id="tachon" d="M60 400 L470 400" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" opacity="0"/>
            <text class="mono" id="prohib" x="300" y="440" text-anchor="middle" font-size="18" fill="${GREEN}" opacity="0">disallowedTools: ["Agent"]</text>
            ${box("bx4", 640, 250)}
            ${[0, 1, 2, 3].map((i) => `<image id="ma${i}" href="assets/ghosty.png" x="${560 + i * 50}" y="${80 - (i % 2) * 30}" width="60" height="69" opacity="0"/>`).join("")}
            <g id="smoke"><circle id="sm1" cx="600" cy="170" r="12" fill="${GREY}" opacity="0"/><circle id="sm2" cx="660" cy="160" r="16" fill="${GREY}" opacity="0"/><circle id="sm3" cx="700" cy="175" r="10" fill="${GREY}" opacity="0"/></g>
            <g id="oom" opacity="0"><g transform="translate(640 400) rotate(-6)"><rect x="-150" y="-36" width="300" height="72" fill="none" stroke="${GREEN}" stroke-width="8"/><text class="black" x="0" y="16" text-anchor="middle" font-size="44" fill="${GREEN}" style="font-family:'Archivo Black'">SIN RAM</text></g></g>
          </g>
          <!-- 5. con los pies en la trinchera: las botas -->
          <g id="s5" opacity="0">
            <line x1="0" y1="430" x2="760" y2="430" stroke="${INK}" stroke-width="6"/>
            <g id="boots"><path d="M120 430 v-90 h70 v50 h60 a30 30 0 0 1 30 30 v10 z" fill="${PANEL}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M330 430 v-90 h70 v50 h60 a30 30 0 0 1 30 30 v10 z" fill="${PANEL}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/></g>
            <text class="black" id="trinch" x="380" y="200" text-anchor="middle" font-size="64" fill="${MINT}" opacity="0" style="font-family:'Archivo Black'">TRINCHERA</text>
            <text class="mono" x="380" y="250" text-anchor="middle" font-size="20" fill="${GREY}">los detalles se aprenden operando</text>
          </g>
        </svg>
      </div>

      ${lineEls}

      <!-- portada -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:20px;color:${GREEN}"># taller sistemas agénticos · sesión 05 · 14 sep 2026</div>
        <div class="black k" id="i2" style="top:300px;font-size:128px;line-height:1;letter-spacing:-.02em;color:${INK};text-transform:uppercase;white-space:nowrap">Quítale los<br /><span style="color:${MINT}">subagentes</span></div>
        <div class="mono k" id="i3" style="top:580px;font-size:40px;color:${GREEN}">// si corre en una caja chica</div>
        <div class="k" id="i4" style="top:660px;font-size:42px;font-family:'Space Grotesk';font-weight:700;color:${INK};line-height:1.25;width:900px">Manda tres, cuatro subagentes, se comen la RAM y se muere la caja.</div>
        <div id="i5" style="position:absolute;left:72px;top:860px;width:560px;height:500px"><svg viewBox="0 0 560 500" style="width:560px;height:500px;overflow:visible">
          ${box("ibx", 150, 260)}<image href="assets/ghosty.png" x="260" y="140" width="110" height="127"/>
          ${panel("iram", 400, 60, 140, 300, "RAM")}${ramCells("irc", 440, 110).replace(/opacity="0"/g, 'opacity="1"')}<text class="mono" x="470" y="350" text-anchor="middle" font-size="22" fill="${GREEN}">100%</text>
          <circle id="ism" cx="150" cy="170" r="14" fill="${GREY}"/>
        </svg></div>
        <div id="i6" style="position:absolute;right:72px;top:1000px;width:320px;height:320px;border:4px solid ${MINT};border-radius:10px;overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="k" id="o1" style="top:262px;font-size:50px;font-family:'Space Grotesk';font-weight:700;color:${INK};line-height:1.2;width:936px">«Lo primero que hago es quitarle<br />la herramienta de subagent.»</div>
        <div id="o2" style="position:absolute;left:72px;width:936px;top:420px;height:6px;background:${MINT};transform-origin:left center"></div>
        <div class="k" style="top:480px">
          <div id="o3" class="mono" style="font-size:22px;color:${GREEN}"># taller grabado · 5 sesiones · on demand</div>
          <div id="o4" class="black" style="margin-top:18px;font-size:124px;line-height:1;letter-spacing:-.02em;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:34px;font-size:21px;line-height:1.7;color:${INK};font-weight:500">SESIÓN 05 · UN BACKEND, n CANALES (WHATSAPP) · 14 SEP 2026<br />LAS 5 SESIONES YA ESTÁN GRABADAS. ENTRAS HOY.</div>
          <div id="o6" class="mono" style="margin-top:44px;display:inline-block;padding:18px 28px;background:${MINT};color:${BG};font-size:30px;border-radius:8px">$ inscríbete en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <!-- zoom-punch: módulo de RAM -->
      <svg id="punch" viewBox="-210 -100 420 200"><rect x="-200" y="-70" width="400" height="120" rx="10" fill="${PANEL}" stroke="${INK}" stroke-width="10"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${-180 + i * 46}" y="-50" width="36" height="60" rx="4" fill="${MINT}"/>`).join("")}<rect x="-200" y="50" width="400" height="30" fill="${GREEN}"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="${-192 + i * 33}" y="54" width="18" height="22" fill="${BG}"/>`).join("")}</svg>
      <svg id="burst" viewBox="0 0 2600 2600"><rect width="2600" height="2600" fill="${MINT}"/><defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><rect x="8" y="8" width="64" height="64" rx="8" fill="${BG}"/></pattern></defs><rect x="200" y="200" width="2200" height="2200" fill="url(#grid)"/></svg>
      <svg id="hero" viewBox="0 0 720 320"><rect x="0" y="20" width="720" height="280" rx="20" fill="${MINT}"/><text class="black" x="360" y="230" text-anchor="middle" font-size="150" fill="${BG}" style="font-family:'Archivo Black'">SIN RAM</text></svg>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", MINT = "${MINT}", GREEN = "${GREEN}", GREY = "${GREY}", BG = "${BG}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: las scanlines bajan un periodo, sin cesar; el cursor parpadea
      tl.to("#bg", { y: 6, duration: .5, ease: "none", repeat: REP(.5) }, 0);
      tl.to("#cursor", { opacity: 0, duration: .01, repeat: REP(1), repeatDelay: .5, yoyo: true }, BO);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#ibxled", { fill: BG, duration: .01, repeat: 8, repeatDelay: .25, yoyo: true }, 0);
      tl.fromTo("#ism", { y: 0, opacity: .6 }, { y: -50, opacity: 0, duration: 1.4, ease: "power1.out", repeat: 2 }, 0);
      tl.to("[id^=irc]", { fill: GREEN, duration: .01, stagger: .05, repeat: 1, repeatDelay: 1.2, yoyo: true }, .6);

      // ---- zoom-punch: el módulo de RAM crece hasta tapar el cuadro, "OOM" sella, la cuadrícula se encoge
      tl.set("#punch", { scale: .2, rotation: -25 }, 0);
      tl.set("#hero", { scale: .3, rotation: -6 }, 0);
      const punchIn = (t) => {
        tl.set("#punch", { opacity: 1, scale: .2, rotation: -25 }, t);
        tl.to("#punch", { scale: 18, rotation: 5, duration: .5, ease: "power3.in" }, t);
        tl.set("#burst", { opacity: 1, scale: 1.2, rotation: 0 }, t + .48);
        tl.set("#punch", { opacity: 0 }, t + .5);
        tl.set("#hero", { opacity: 1, scale: .3, rotation: -6 }, t + .5);
        tl.to("#hero", { scale: 1, rotation: 0, duration: .3, ease: "back.out(2.5)" }, t + .5);
        tl.to("#hero", { opacity: 0, scale: 1.4, duration: .2, ease: "power2.in" }, t + .82);
        tl.to("#burst", { scale: 0, rotation: 30, duration: .5, ease: "back.in(1.4)" }, t + 1.02);
        tl.set("#burst", { opacity: 0 }, t + 1.52);
      };
      punchIn(3.85);
      punchIn(OUT_IN - .55);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [3.0, 11.3, 14.58, 19.81, 29.46, 35.64, 50.49, 55.96, 64.33, 70.32].forEach(punch);

      // ---- cartel
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .1, ease: "power3.in" }, BO + t - .1);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .2, ease: "power4.out" }, BO + t);
      };
      sign(11.04, "PASAN<br /><em>// dos cosas</em>");
      sign(14.58, "SE COME<br /><em>// la RAM</em>");
      sign(19.34, "ESTÁS<br /><em>// en serie</em>");
      sign(29.28, "TRABAJO<br /><em>// en paralelo</em>");
      sign(35.64, "SUBAGENTES<br /><em>// también comen RAM</em>");
      sign(50.41, "YO SE LOS<br /><em>// prohíbo</em>");
      sign(55.96, "QUITARLE<br /><em>// subagent</em>");
      sign(64.33, "SE MUERE<br /><em>// la caja</em>");
      sign(69.79, "PIES EN LA<br /><em>// trinchera</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const show = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .15 }, at(t));
      const popIn = (id, t, origin, s = 2.5) => { show(id, t); tl.from(id, { scale: 0, svgOrigin: origin, duration: .28, ease: "back.out(" + s + ")", immediateRender: false }, at(t)); };
      const stampIn = (id, t, origin) => { show(id, t); tl.from(id, { scale: 2.4, svgOrigin: origin, duration: .2, ease: "power3.in", immediateRender: false }, at(t)); };
      // el medidor: enciende celdas hasta n (0–10) y escribe el porcentaje
      let ramLevel = 0;
      const ram = (n, t, step = .06) => {
        for (let i = ramLevel; i < n; i++) tl.to("#rc" + i, { opacity: 1, duration: .01 }, at(t + (i - ramLevel) * step));
        for (let i = n; i < ramLevel; i++) tl.to("#rc" + i, { opacity: 0, duration: .01 }, at(t));
        tl.to("#rampct", { textContent: n * 10 + "%", duration: .01 }, at(t + Math.abs(n - ramLevel) * step));
        ramLevel = n;
      };
      // 0 la caja y Ghosty; 2.16 "una herramienta bien perrona": entra la tool; 4.78 "gigantes" el letrero; 7.8 "sigues hablando": el chat
      // SFX: block, pop, tick, pop
      ram(2, 0.2);
      tl.to("#bxled", { fill: BG, duration: .01, repeat: 60, repeatDelay: .5, yoyo: true }, at(0));
      popIn("#tool", 2.16, "600 220", 1.8);
      tl.to("#filelbl", { opacity: 1, duration: .2 }, at(4.78));
      tl.to("#tool", { scale: 1.12, svgOrigin: "600 220", duration: .3, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(5.52));
      popIn("#chat", 7.8, "370 430", 2);
      // 11.04 "pasan dos cosas"; 14.58 "comerse la RAM": el medidor sube a 7; 17.31 "pesar mucho": a 8 y tiembla
      // SFX: tick ×6, block
      ram(7, 14.58);
      ram(8, 17.31);
      tl.to("#rampanel", { x: 4, duration: .06, yoyo: true, repeat: 9 }, at(17.31));
      // 19.34 "estás en serie": la terminal con la tarea que no regresa
      // SFX: whoosh-short, tick ×5
      hide("#s1", 19.2);
      show("#s2", 19.34); tl.from("#term", { y: 60, duration: .35, ease: "power3.out", immediateRender: false }, at(19.34));
      tl.to("#t1", { opacity: 1, duration: .05 }, at(21.84));
      tl.to("#t2", { opacity: 1, duration: .05 }, at(23.34));
      tl.to("#t3", { opacity: 1, duration: .05 }, at(25.04));
      tl.to("#t4", { opacity: 1, duration: .05 }, at(26.04));
      tl.to("#t5", { opacity: 1, duration: .05 }, at(26.64));
      tl.to("#serial", { opacity: 1, duration: .2 }, at(21.0));
      // 29.28 "trabajo en paralelo": Ghosty y brotan subagentes; cada uno +20% RAM; 38.26 "comer la RAM" → 10 y parpadea
      // SFX: whoosh-short, pop ×4, tick ×4, block
      hide("#s2", 29.1);
      show("#s3", 29.28); tl.from("#g0", { x: -100, duration: .35, ease: "power3.out", immediateRender: false }, at(29.28));
      tl.to("#parlbl", { opacity: 1, duration: .2 }, at(30.25));
      ram(3, 29.5);
      [[33.12, 0], [33.5, 1], [35.64, 2], [36.0, 3]].forEach(([t, i]) => {
        popIn("#sa" + i, t, (475 + (i % 2) * 150) + " " + (170 + Math.floor(i / 2) * 170), 3);
        tl.to("#sw" + i, { opacity: 1, duration: .1 }, at(t));
        tl.to("#sl" + i, { opacity: 1, duration: .1 }, at(t + .2));
        ram(3 + (i + 1) * 2 > 10 ? 10 : 3 + (i + 1) * 2, t + .25);
      });
      tl.to(".cell", { fill: GREEN, duration: .01, repeat: 11, repeatDelay: .2, yoyo: true }, at(38.26));
      tl.to("#rampanel", { x: 5, duration: .05, yoyo: true, repeat: 15 }, at(38.26));
      // 46.01 "mucha RAM": el panel crece; 47.38 "limites los subagentes": dos subagentes se apagan
      // SFX: block, tick ×2
      tl.to("#rampanel", { scale: 1.12, svgOrigin: "846 190", duration: .3, yoyo: true, repeat: 1 }, at(46.01));
      tl.to("#sa2, #sa3, #sw2, #sw3, #sl2, #sl3", { opacity: 0, duration: .25 }, at(47.38));
      ram(7, 47.6);
      // 50.41 "yo se los prohíbo": la lista de herramientas, tachón sobre Agent; 55.96 "quitarle": disallowedTools
      // SFX: whoosh-short, tick ×6, block (tachón), stamp
      hide("#s3", 50.2);
      show("#s4", 50.41); tl.from("#tools", { x: -80, duration: .35, ease: "power3.out", immediateRender: false }, at(50.41));
      [0, 1, 2, 3, 4, 5].forEach((i) => tl.from("#tl" + i, { x: -40, opacity: 0, duration: .2, ease: "power2.out", immediateRender: false }, at(50.9 + i * .12)));
      ram(2, 50.6);
      tl.to("#tachon", { opacity: 1, duration: .01 }, at(55.96)).from("#tachon", { scaleX: 0, svgOrigin: "60 400", duration: .25, ease: "power3.out", immediateRender: false }, at(55.96));
      tl.to("#prohib", { opacity: 1, duration: .2 }, at(57.35));
      // 60.69 "manda tres, cuatro subagentes": brotan sobre la caja; 63.31 "se come la RAM" → 10; 64.33 "se muere la caja": ojos ✕, humo, OOM KILLED
      // SFX: pop ×4, block, hit-low, stamp
      [[60.69, 0], [61.11, 1], [61.62, 2], [62.13, 3]].forEach(([t, i]) => popIn("#ma" + i, t, (590 + i * 50) + " " + (115 - (i % 2) * 30), 3));
      ram(10, 63.31, .05);
      tl.to(".cell", { fill: GREEN, duration: .01, repeat: 7, repeatDelay: .12, yoyo: true }, at(63.31));
      tl.to("#bx4eyes", { opacity: 0, duration: .1 }, at(64.33));
      tl.to("#bx4dead", { opacity: 1, duration: .1 }, at(64.33));
      tl.to("#bx4led", { fill: GREY, duration: .1 }, at(64.33));
      tl.to("#bx4", { rotation: 4, svgOrigin: "640 250", duration: .07, yoyo: true, repeat: 7 }, at(64.33));
      tl.to("#ma0, #ma1, #ma2, #ma3", { opacity: .25, duration: .3 }, at(64.5));
      [["#sm1", 0], ["#sm2", .3], ["#sm3", .6]].forEach(([id, d]) => tl.fromTo(id, { y: 0, opacity: .6 }, { y: -80, opacity: 0, duration: 1.4, ease: "power1.out", repeat: 3 }, at(64.6 + d)));
      stampIn("#oom", 64.91, "640 400");
      tl.to("#rampct", { textContent: "100%", duration: .01 }, at(64.33));
      // 69.79 "con los pies en la trinchera": las botas pisan, el sello
      // SFX: whoosh-short, land ×2, stamp
      hide("#s4", 69.5);
      show("#s5", 69.79);
      tl.from("#boots path:nth-of-type(1)", { y: -120, duration: .3, ease: "power3.in", immediateRender: false }, at(70.32));
      tl.from("#boots path:nth-of-type(2)", { y: -120, duration: .3, ease: "power3.in", immediateRender: false }, at(70.6));
      stampIn("#trinch", 71.0, "380 180");
      hide("#ram", 69.5);

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
        .from("#o6", { scaleY: 0, transformOrigin: "left top", duration: .3, ease: "power3.out" }, OUT_IN + 1.15)
        .from("#logo", { opacity: 0, y: 12, duration: .4 }, OUT_IN + 1.35);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);

// SFX (tiempo del clip); las cortinillas de entrada/salida caen antes del 0 y después del final
const OUTC = OUT_IN - .55 - BO - .3; // tiempo de clip de la cortinilla de salida
const sfx = {
  block: [0.2, 17.31, 38.26, 46.01, 55.96, 63.31],
  pop: [2.16, 7.8, 33.12, 33.5, 35.64, 36.0, 60.69, 61.11, 61.62, 62.13],
  tick: [4.78, 14.58, 14.7, 14.82, 14.94, 15.06, 21.84, 23.34, 25.04, 26.04, 26.64, 33.4, 33.8, 35.9, 36.3, 47.38, 47.6, 50.9, 51.02, 51.14, 51.26, 51.38, 51.5],
  "whoosh-short": [0.17, 19.2, 29.1, 50.2, 69.5, OUTC + 1.02],
  "whoosh-fly": [-0.85, OUTC],
  "hit-sub": [-0.35, OUTC + .5],
  "hit-low": [64.33],
  stamp: [57.35, 64.91, 71.0],
  land: [70.62, 70.9],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
