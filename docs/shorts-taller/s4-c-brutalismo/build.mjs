import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 77.75;        // duración del clip (36.3→107.15 + 117.9→124.7 de la ventana)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 89.1;

// piel: brutalismo editorial. Papel con rejilla, bloques planos sin bordes, tres tintas
const BG = "#E9E6DF";
const INK = "#111111";
const ACID = "#D6FF3A";
const RED = "#FF3B1F";
const GREY = "#777777";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; la palabra en curso va en negativo (negro sobre ácido)
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// diez tickets en dos filas de cinco (bloques 56×56 con hueco de 5)
const tickets = (id, color) => Array.from({ length: 10 }, (_, i) => `<rect class="tk" id="${id}${i}" x="${(i % 5) * 61}" y="${86 + Math.floor(i / 5) * 61}" width="56" height="56" fill="${color}" opacity="0"/>`).join("");
// la cortinilla: seis columnas de bloques que bajan en cascada y tapan el cuadro
const cols = Array.from({ length: 10 }, (_, i) => `<i class="col" style="top:${i * 192 - 110}px;background:${[INK, ACID, INK, RED, INK, ACID, INK, RED, INK, ACID][i]}"></i>`).join("");

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Space Grotesk", sans-serif; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      .syne { font-family: "Syne", sans-serif; font-weight: 800; }
      .board { position: absolute; left: -72px; top: -72px; width: 1224px; height: 2064px; background: ${BG}; }
      .boardin { position: absolute; inset: 0; opacity: .09;
        background-image: linear-gradient(${INK} 1px, transparent 1px), linear-gradient(90deg, ${INK} 1px, transparent 1px); background-size: 72px 72px; }

      #sig { position: absolute; right: 72px; top: 346px; z-index: 30; font-family: "Space Mono"; font-weight: 700; font-size: 18px; color: ${INK}; opacity: .6; }

      /* cabecera (250–390): foto en blanco y negro, bloques sin bordes */
      #av { position: absolute; left: 72px; top: 250px; width: 132px; height: 132px; overflow: hidden; background: ${INK}; z-index: 30; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(1) contrast(1.2); }
      #who { position: absolute; left: 232px; top: 256px; z-index: 30; }
      #who b { display: block; font-family: "Syne"; font-weight: 800; font-size: 46px; letter-spacing: -.03em; color: ${INK}; text-transform: uppercase; }
      #who span { display: block; margin-top: 4px; font-family: "Space Mono"; font-weight: 700; font-size: 22px; color: ${INK}; }
      #clock { position: absolute; right: 72px; top: 250px; z-index: 30; font-family: "Space Mono"; font-weight: 700; font-size: 26px; color: ${BG}; background: ${INK}; padding: 16px 22px; }

      /* cartel (404–654): Syne enorme, la segunda línea sobre ácido */
      #sign { position: absolute; left: 72px; right: 72px; top: 404px; height: 250px; z-index: 30; }
      #signin { font-family: "Syne"; font-weight: 800; font-size: 98px; line-height: 1.04; letter-spacing: -.06em; color: ${INK}; text-transform: uppercase; transform-origin: left top; }
      #signin em { font-style: normal; background: ${ACID}; padding: 0 12px; }

      /* escenario (676–1172): la rejilla de bloques */
      #stage { position: absolute; left: 72px; top: 676px; width: 936px; height: 496px; z-index: 20; }
      #stage svg { width: 936px; height: 496px; overflow: hidden; font-family: "Syne"; font-weight: 800; }
      .sm { font-family: "Space Mono", monospace; font-weight: 700; }

      /* karaoke (1188–1388) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1188px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 70px; line-height: 1.1; letter-spacing: -.02em; font-weight: 700; }
      .w { display: inline-block; color: ${GREY}; font-weight: 500; padding: 0 6px; }

      /* cortinilla: columnas que bajan */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      .col { position: absolute; left: -300px; width: 1680px; height: 360px; transform-origin: center; }
      #wipeword { position: absolute; left: 50%; top: 50%; z-index: 72; pointer-events: none; font-family: "Syne"; font-weight: 800; font-size: 460px; letter-spacing: -.06em; color: ${BG}; opacity: 0; }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(242, 239, 233, 0.95)) drop-shadow(0 0 22px rgba(242, 239, 233, 0.55)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <div class="board" id="bg"><div class="boardin"></div></div>

      <div id="sig">FIXTERGEEK.COM</div>
      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS_AGÉNTICOS</span></div>
      <div id="clock">SESIÓN 04</div>

      <div id="sign"><div id="signin">¿DE QUIÉN<br /><em>ES QUÉ?</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 496">
          <!-- columna X -->
          <g id="colX"><g id="hdX" opacity="0"><rect x="0" y="0" width="300" height="70" fill="${INK}"/><text x="16" y="50" font-size="40" fill="${BG}">X · 10</text></g>${tickets("tx", INK)}<text class="sm" id="lblX" x="0" y="240" font-size="18" fill="${INK}" opacity="0">TICKETS DE X</text></g>
          <!-- columna Y -->
          <g transform="translate(636 0)"><g id="colY"><g id="hdY" opacity="0"><rect x="0" y="0" width="300" height="70" fill="${RED}"/><text x="16" y="50" font-size="40" fill="${INK}">Y · 10</text></g>${tickets("ty", RED)}<text class="sm" id="lblY" x="0" y="240" font-size="18" fill="${INK}" opacity="0">TICKETS DE Y</text></g></g>
          <!-- el centro: Ghosty con la pregunta, y luego el token -->
          <g transform="translate(330 0)">
            <g id="ghostg" opacity="0"><image href="assets/ghosty.png" x="70" y="10" width="140" height="162"/><g id="qmark" opacity="0"><rect x="196" y="6" width="70" height="70" fill="${RED}"/><text x="231" y="60" text-anchor="middle" font-size="54" fill="${INK}">?</text></g></g>
            <g id="token" opacity="0">
              <rect x="0" y="0" width="276" height="203" fill="${ACID}"/>
              <text class="sm" id="toklbl" x="16" y="44" font-size="20" fill="${INK}">TOKEN</text>
              <text id="tokwho" x="16" y="118" font-size="64" fill="${INK}"></text>
              <text class="sm" id="toklvl" x="16" y="176" font-size="22" fill="${INK}"></text>
              <rect x="200" y="20" width="56" height="56" fill="${INK}"/><rect x="216" y="36" width="24" height="24" fill="${ACID}"/>
              <g id="slot" opacity="0"><rect x="0" y="58" width="276" height="88" fill="${INK}"/><clipPath id="slotcut"><rect x="0" y="58" width="276" height="88"/></clipPath><g clip-path="url(#slotcut)"><text id="slottxt" x="138" y="120" text-anchor="middle" font-size="44" fill="${ACID}"></text></g></g>
            </g>
            <g id="apistamp" opacity="0"><rect x="0" y="40" width="276" height="120" fill="${INK}"/><text x="138" y="128" text-anchor="middle" font-size="86" fill="${ACID}">API</text></g>
          </g>
          <!-- el servidor: la barra que decide; se parte en endpoints -->
          <g id="server" opacity="0">
            <rect id="srvbar" x="0" y="292" width="936" height="120" fill="${INK}"/>
            <text id="srvlbl" x="24" y="368" font-size="56" fill="${BG}" letter-spacing="-2">SERVIDOR</text>
            <text class="sm" id="srv1" x="640" y="342" font-size="22" fill="${ACID}" opacity="0">DECIDE</text>
            <text class="sm" id="srv2" x="640" y="382" font-size="22" fill="${BG}" opacity="0">DEJA / NO DEJA PASAR</text>
          </g>
          <g id="endpoints" opacity="0">
            <g transform="translate(0 292)"><g id="epA"><rect width="456" height="120" fill="${INK}"/><text x="20" y="70" font-size="32" fill="${ACID}">/operación</text></g></g>
            <g transform="translate(480 292)"><g id="epB"><rect width="456" height="120" fill="${RED}"/><text x="20" y="70" font-size="32" fill="${INK}">/administración</text></g></g>
            <g transform="translate(330 250)"><g id="epS" opacity="0"><rect width="276" height="34" fill="${BG}" stroke="${INK}" stroke-width="4"/><text class="sm" x="138" y="24" text-anchor="middle" font-size="18" fill="${INK}">SESIÓN INTERNA</text></g></g>
          </g>
          <!-- la compuerta -->
          <g id="gate" opacity="0">
            <g id="gPass" opacity="0"><rect x="0" y="430" width="300" height="66" fill="${ACID}"/><text x="16" y="476" font-size="34" fill="${INK}">PASA →</text></g>
            <g id="gStop" opacity="0"><rect x="636" y="430" width="300" height="66" fill="${RED}"/><text x="652" y="476" font-size="34" fill="${INK}">✕ NO PASA</text></g>
            <g id="gMine" opacity="0"><rect x="330" y="430" width="276" height="66" fill="none" stroke="${INK}" stroke-width="4"/><text class="sm" x="344" y="474" font-size="20" fill="${INK}">SÓLO LO TUYO</text></g>
          </g>
          <!-- las diez mil formas de decir evidencia -->
          <text class="sm" id="tenk" x="468" y="235" text-anchor="middle" font-size="18" fill="${INK}" opacity="0"></text>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="mono k" id="i1" style="top:262px;font-size:22px;color:${INK}">TALLER_SISTEMAS_AGÉNTICOS / SESIÓN_04</div>
        <div class="syne k" id="i2" style="top:318px;font-size:150px;line-height:.92;letter-spacing:-.06em;color:${INK};text-transform:uppercase">¿Quién<br />eres?</div>
        <div class="syne k" id="i3" style="top:640px;font-size:60px;line-height:1;letter-spacing:-.04em;color:${INK};background:${ACID};padding:14px 24px;display:inline-block;text-transform:uppercase">Tokens y niveles</div>
        <div class="k" id="i4" style="top:770px;font-size:54px;font-weight:700;color:${INK};line-height:1.15;width:900px;letter-spacing:-.02em">Le das tu MCP a un agente.<br />¿Cómo sabe quién pide qué?</div>
        <div id="i6" style="position:absolute;right:72px;top:1010px;width:400px;height:360px;background:${INK};overflow:hidden"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.2)" /></div>
        <div id="i5" style="position:absolute;left:72px;top:1010px;width:480px;height:360px;background:${RED}"></div>
        <div class="mono k" id="i7" style="top:1040px;left:96px;font-size:26px;line-height:1.7;color:${INK};width:440px">PERMISOS_Y_EXTENSIONES<br />10_SEP_2026<br />HÉCTORBLISS</div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <div class="board"><div class="boardin"></div></div>
        <div class="k" id="o1" style="right:72px;top:262px;font-size:54px;font-weight:700;color:${INK};line-height:1.2;letter-spacing:-.02em">«Tú mandas una evidencia,<br />y el servidor decide.»</div>
        <div id="o2" style="position:absolute;left:72px;width:520px;top:440px;height:18px;background:${RED};transform-origin:left center"></div>
        <div class="k" style="top:520px;right:72px">
          <div id="o3" class="mono" style="font-size:24px;color:${INK}">TALLER_EN_VIVO / 6_SESIONES</div>
          <div id="o4" class="syne" style="margin-top:24px;font-size:92px;line-height:.92;letter-spacing:-.06em;color:${INK};text-transform:uppercase">Sistemas<br />agénticos</div>
          <div id="o5" class="mono" style="margin-top:40px;font-size:26px;line-height:1.7;color:${INK}">SESIÓN_04 / PERMISOS_Y_EXTENSIONES_(MCP)<br />LAS SESIONES SE GRABAN. ENTRAS A LA EDICIÓN EN CURSO.</div>
          <div id="o6" class="syne" style="margin-top:52px;display:inline-block;padding:22px 30px;background:${INK};color:${ACID};font-size:30px;letter-spacing:-.02em">Regístrate en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <div id="wipe">${cols}</div><div id="wipeword">→</div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const INK = "${INK}", ACID = "${ACID}", RED = "${RED}", GREY = "${GREY}", BG = "${BG}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: la rejilla se desplaza un módulo, sin cesar
      tl.to("#bg", { x: 72, y: 72, duration: 18, ease: "none", repeat: REP(18) }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 12, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { x: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i5", { scaleX: 1.04, transformOrigin: "left center", duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);

      // ---- cortinilla: las columnas bajan en cascada y luego suben
      // rebanadas sesgadas: entran alternadas desde la izquierda y la derecha con rebote, la flecha sella, y salen desde el centro
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

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [6.15, 23.7, 31.06, 39.81, 66.64, 71.56].forEach(punch);

      // ---- cartel: cambia en seco, como una plancha
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .04, duration: .12, ease: "power3.in" }, BO + t - .12);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .22, ease: "power3.out" }, BO + t);
      };
      sign(6.15, "¿QUIÉN<br /><em>ERES?</em>");
      sign(15.8, "SÓLO<br /><em>LO MÍO</em>");
      sign(23.7, "ES UNA<br /><em>API</em>");
      sign(31.06, "UN TOKEN<br /><em>CON NIVEL</em>");
      sign(39.81, "ENDPOINTS<br /><em>POR ROL</em>");
      sign(55.62, "UNA<br /><em>EVIDENCIA</em>");
      sign(66.01, "SERVIDOR<br /><em>DECIDE</em>");
      sign(70.77, "EL MCP:<br /><em>IGUAL</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const block = (id, t, o = "left top") => {
        tl.to(id, { opacity: 1, duration: .01 }, at(t)).from(id, { scaleY: 0, transformOrigin: o, duration: .22, ease: "power3.out", immediateRender: false }, at(t));
      };

      // 0.80 "levanto 10 tickets": la columna X y sus diez bloques, uno por uno
      // SFX: block (cabecera), tick ×10
      block("#hdX", 0.6);
      for (let i = 0; i < 10; i++) tl.to("#tx" + i, { opacity: 1, duration: .01 }, at(0.9 + i * .09)).from("#tx" + i, { scale: 0, transformOrigin: "50% 50%", duration: .12, ease: "power2.out", immediateRender: false }, at(0.9 + i * .09));
      tl.to("#lblX", { opacity: 1, duration: .2 }, at(1.9));
      // 3.48 "otra persona levanta otros 10": la columna Y
      block("#hdY", 3.3);
      for (let i = 0; i < 10; i++) tl.to("#ty" + i, { opacity: 1, duration: .01 }, at(3.6 + i * .09)).from("#ty" + i, { scale: 0, transformOrigin: "50% 50%", duration: .12, ease: "power2.out", immediateRender: false }, at(3.6 + i * .09));
      tl.to("#lblY", { opacity: 1, duration: .2 }, at(4.6));
      // 6.15 "¿cómo verificamos esa identidad?": Ghosty al centro con el signo
      tl.to("#ghostg", { opacity: 1, duration: .01 }, at(5.4)).from("#ghostg", { y: 60, duration: .35, ease: "power3.out", immediateRender: false }, at(5.4));
      tl.to("#qmark", { opacity: 1, duration: .01 }, at(6.15)).from("#qmark", { scale: 0, transformOrigin: "50% 50%", duration: .25, ease: "power3.out", immediateRender: false }, at(6.15));
      tl.to("#qmark", { rotation: 8, transformOrigin: "50% 50%", duration: .4, yoyo: true, repeat: 7, ease: "sine.inOut" }, at(6.5));
      // 11.32 "X persona y Y persona": cada columna se enciende cuando la nombra
      tl.to("#hdX", { scale: 1.06, transformOrigin: "left center", duration: .15, yoyo: true, repeat: 1 }, at(11.32));
      tl.to("#hdY", { scale: 1.06, transformOrigin: "left center", duration: .15, yoyo: true, repeat: 1 }, at(12.57));
      // 15.8 "me muestren mis recursos y no los de otra persona": X se queda, Y se apaga en tachones
      tl.to(".tk[id^=ty]", { opacity: .18, duration: .25, stagger: .04 }, at(17.44));
      tl.to("#hdY", { opacity: .35, duration: .3 }, at(17.44));
      tl.to("#qmark", { opacity: 0, duration: .2 }, at(19.0));
      // 23.7 "al final es una API": el sello API tapa a Ghosty
      // SFX: stamp
      tl.to("#ghostg", { opacity: 0, duration: .15 }, at(23.5));
      tl.to("#apistamp", { opacity: 1, duration: .01 }, at(23.7)).from("#apistamp", { scale: 1.8, transformOrigin: "50% 50%", duration: .22, ease: "power3.in", immediateRender: false }, at(23.7));
      tl.to("#apistamp", { opacity: 0, duration: .2 }, at(30.2));
      // 30.75 "con un token que identifica a la persona": el token entra; 33.5 la X; 36.38 el nivel
      // SFX: block, tick ×2
      block("#token", 30.75, "left top");
      tl.to("#tokwho", { textContent: "X", duration: .01 }, at(33.5));
      tl.to("#tokwho", { scale: 1.3, transformOrigin: "left bottom", duration: .15, yoyo: true, repeat: 1 }, at(33.5));
      tl.to("#toklvl", { textContent: "NIVEL: OPERACIÓN", duration: .01 }, at(36.38));
      // 39.81 "endpoints": la barra del servidor aparece y se parte en dos
      // SFX: block ×2, tick
      block("#server", 39.81);
      tl.to("#server", { opacity: 0, duration: .01 }, at(43.4));
      tl.to("#endpoints", { opacity: 1, duration: .01 }, at(43.4));
      tl.from("#epA", { x: -480, duration: .3, ease: "power3.out", immediateRender: false }, at(43.59));
      tl.from("#epB", { x: 480, duration: .3, ease: "power3.out", immediateRender: false }, at(45.91));
      // 47.63 "híbrido": los dos se acercan; 51.18 "interno con una sesión": la ficha de sesión
      tl.to("#epA", { x: 12, duration: .25, yoyo: true, repeat: 1 }, at(47.63));
      tl.to("#epB", { x: -12, duration: .25, yoyo: true, repeat: 1 }, at(47.63));
      tl.to("#epS", { opacity: 1, duration: .01 }, at(51.18)).from("#epS", { y: 40, duration: .25, ease: "power3.out", immediateRender: false }, at(51.18));
      // 54.38 "tú mandas… una evidencia, una credencial, una llave": la etiqueta del token cambia con cada palabra
      // SFX: tick ×3, tick ×8 (las diez mil formas)
      tl.to("#toklbl", { textContent: "EVIDENCIA", duration: .01 }, at(56.72));
      tl.to("#toklbl", { textContent: "CREDENCIAL", duration: .01 }, at(58.40));
      tl.to("#toklbl", { textContent: "LLAVE", duration: .01 }, at(59.38));
      tl.to("#slot", { opacity: 1, duration: .01 }, at(60.3));
      ["FIRMA", "SESIÓN", "API KEY", "JWT", "COOKIE", "CERTIFICADO", "PASE", "OAUTH", "EVIDENCIA"].forEach((w, i) => {
        tl.to("#slottxt", { textContent: w, duration: .01 }, at(60.45 + i * .3))
          .fromTo("#slottxt", { y: 70 }, { y: 0, duration: .22, ease: "power3.out", immediateRender: false }, at(60.45 + i * .3));
      });
      tl.to("#slot", { opacity: 0, duration: .2 }, at(63.6));
      // 64.46 "y entonces el servidor decide": el token baja al servidor; la barra vuelve y late
      // SFX: whoosh, block
      tl.to("#endpoints", { opacity: 0, duration: .2 }, at(65.0));
      tl.to("#epS", { opacity: 0, duration: .1 }, at(65.0));
      tl.to("#token", { y: 60, scale: .5, transformOrigin: "50% 100%", duration: .45, ease: "power3.in" }, at(65.2));
      tl.to("#server", { opacity: 1, duration: .01 }, at(65.6));
      tl.to("#srvbar", { fill: ACID, duration: .08, yoyo: true, repeat: 3 }, at(66.64));
      tl.to("#srv1", { opacity: 1, duration: .01 }, at(66.64));
      tl.to("#srv2", { opacity: 1, duration: .01 }, at(69.3));
      // 69.53 "deja o no pasar": la compuerta
      // SFX: gate (whoosh corto) ×2, tick
      tl.to("#gate", { opacity: 1, duration: .01 }, at(69.4));
      block("#gPass", 69.53);
      block("#gStop", 70.07, "right top");
      tl.to("#gMine", { opacity: 1, duration: .2 }, at(70.4));
      tl.to(".tk[id^=tx]", { fill: ACID, duration: .2, stagger: .03 }, at(69.53));
      // 70.77 "con el MCP es lo mismo": la barra se llama MCP; 74.74 "una llave que trae ciertos permisos"
      // SFX: stamp, block
      tl.to("#srvlbl", { textContent: "MCP", duration: .01 }, at(71.56));
      tl.to("#srvlbl", { scale: 1.15, transformOrigin: "left center", duration: .15, yoyo: true, repeat: 1 }, at(71.56));
      tl.to("#srv1", { textContent: "MISMA REGLA", duration: .01 }, at(71.9));
      tl.to("#srv2", { textContent: "LLAVE → PERMISOS", duration: .01 }, at(74.74));
      tl.to("#token", { y: 20, scale: .7, duration: .3, ease: "power3.out" }, at(74.74));
      tl.to("#toklbl", { textContent: "LLAVE", duration: .01 }, at(74.74));
      tl.to("#toklvl", { textContent: "PERMISOS: [ ... ]", duration: .01 }, at(76.3));

      // ---- karaoke: la palabra en curso en negativo
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const t = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .18, ease: "power3.out" }, t);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: GREY, fontWeight: 500, backgroundColor: "transparent" }, t - .01)
            .set("#" + w.id, { color: ACID, fontWeight: 700, backgroundColor: INK }, BO + w.s)
            .set("#" + w.id, { color: INK, fontWeight: 700, backgroundColor: "transparent" }, BO + w.e);
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

// SFX (tiempo del clip): mismos números que la timeline
const sfx = {
  block: [0.6, 3.3, 30.75, 39.81, 43.59, 45.91, 65.6, 69.53, 70.07],
  tick: [...Array.from({ length: 10 }, (_, i) => +(0.9 + i * .09).toFixed(3)), ...Array.from({ length: 10 }, (_, i) => +(3.6 + i * .09).toFixed(3)), 11.32, 12.57, 33.5, 36.38, 51.18, 56.72, 58.40, 59.38, ...Array.from({ length: 9 }, (_, i) => +(60.45 + i * .3).toFixed(3)), 76.3],
  stamp: [23.7, 66.64, 71.56],
  whoosh: [65.2, 74.74],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
