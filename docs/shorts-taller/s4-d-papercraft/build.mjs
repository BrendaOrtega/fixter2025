import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 142.6;        // tres tramos: Osvaldo (27:21→28:53) + la recomendación (29:02→29:35) + el scope de Google (43:50→44:09)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 153.95;

// piel: papercraft. Papel azul marino con grano, figuras de papel recortado con sombra dura, capas
const BG = "#1E2A44";
const BG2 = "#26375A";
const BG3 = "#2E4470";
const CREAM = "#F4EBD9";
const RED = "#E1523D";
const BLUE = "#3D6FB6";
const BLUE2 = "#5B8BD6";
const YELLOW = "#F2C14E";
const GREEN = "#4C9A6A";
const GREEN2 = "#6CBE8A";
const INK = "#1E2A44";
const MUTE = "#8fa0c4";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; la palabra en curso en amarillo y negrita
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// el fondo: papel con grano y dos montes recortados (nunca plano)
const board = (id) => `<svg class="board" viewBox="0 0 1080 1920"><defs><filter id="grain-${id}"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .06 0"/></filter></defs><rect width="1080" height="1920" fill="${BG}"/><rect width="1080" height="1920" filter="url(#grain-${id})"/><g class="hills"><path d="M-100 1500 Q 200 1380 420 1470 T 800 1440 T 1180 1500 V1920 H-100z" fill="${BG2}"/><path d="M-100 1640 Q 300 1540 560 1620 T 1180 1600 V1920 H-100z" fill="${BG3}"/></g></svg>`;

// una figura de papel (cabeza, cuerpo, distintivo) con su etiqueta
const person = (id, color, label, prop) => `<g id="${id}" opacity="0">
    <circle cx="0" cy="250" r="34" fill="${CREAM}"/>
    <path d="M-46 300 q46 -30 92 0 v110 h-92z" fill="${color}"/>
    ${prop}
    <rect x="-70" y="426" width="140" height="40" rx="4" fill="${INK}"/><text x="0" y="453" text-anchor="middle" font-size="16" fill="${CREAM}" letter-spacing="1">${label}</text>
  </g>`;
// burbuja de papel (izquierda o derecha) con texto
const bubble = (id, x, y, w, txt, side) => {
  const tail = side === "l" ? `h-140 l-22 24 v-24 h-16` : `h-16 v24 l-22 -24 h-140`;
  return `<g id="${id}" opacity="0"><path d="M${x} ${y} h${w - 24} a12 12 0 0 1 12 12 v54 a12 12 0 0 1 -12 12 ${tail} a12 12 0 0 1 -12 -12 v-54 a12 12 0 0 1 12 -12z" fill="${CREAM}" transform="translate(-12 0)"/><text id="${id}t" x="${x + w / 2 - 12}" y="${y + 42}" text-anchor="middle" font-size="22" fill="${INK}">${txt}</text></g>`;
};
// una ficha de papel (herramienta o permiso)
const chip = (id, x, y, txt, color, fg = CREAM, w = 150) => `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0"><rect x="${-w / 2}" y="-18" width="${w}" height="36" rx="6" fill="${color}"/><text id="${id}t" x="0" y="7" text-anchor="middle" font-size="17" fill="${fg}">${txt}</text><g id="${id}x" opacity="0"><path d="M${-w / 2 + 8} -14 L${w / 2 - 8} 14 M${w / 2 - 8} -14 L${-w / 2 + 8} 14" stroke="${RED}" stroke-width="6" stroke-linecap="round"/></g></g></g>`;
// el gafete de papel
const badge = (id, x, y, top, a, b, colorA = INK, colorB = RED) => `<g transform="translate(${x} ${y})"><g id="${id}" opacity="0">
    <rect x="-64" y="0" width="128" height="86" rx="8" fill="${CREAM}"/>
    <rect id="${id}h" x="-64" y="0" width="128" height="26" rx="8" fill="${RED}"/><rect id="${id}h2" x="-64" y="14" width="128" height="12" fill="${RED}"/>
    <text id="${id}top" x="0" y="19" text-anchor="middle" font-size="13" fill="${CREAM}" letter-spacing="2">${top}</text>
    <text id="${id}a" x="0" y="50" text-anchor="middle" font-family="Fraunces" font-weight="900" font-size="20" fill="${colorA}">${a}</text>
    <text id="${id}b" x="0" y="74" text-anchor="middle" font-family="Fraunces" font-weight="900" font-size="20" fill="${colorB}">${b}</text>
    <circle cx="0" cy="0" r="7" fill="${YELLOW}"/>
  </g></g>`;

// la cortinilla: hojas de papel que suben en cascada desde abajo, con borde ondulado, y bajan
const SHEETS = [BLUE, CREAM, RED, YELLOW, GREEN, BG3];
const sheets = SHEETS.map((c, i) => `<svg class="sheet" style="z-index:${i}" viewBox="0 0 1080 2000"><path d="M0 80 q90 -60 180 0 t180 0 t180 0 t180 0 t180 0 t180 0 V2000 H0z" fill="${c}"/></svg>`).join("");

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,900&family=Figtree:wght@500;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Figtree", sans-serif; color: ${CREAM}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "JetBrains Mono", monospace; font-weight: 700; }
      .fr { font-family: "Fraunces", serif; font-weight: 900; }
      .board { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
      .paper { filter: drop-shadow(0 8px 0 rgba(0,0,0,.35)); }

      #sig { position: absolute; right: 72px; top: 346px; z-index: 30; font-family: "JetBrains Mono"; font-weight: 700; font-size: 20px; letter-spacing: .14em; color: ${MUTE}; }

      /* cabecera (250–390) */
      #av { position: absolute; left: 72px; top: 250px; width: 132px; height: 132px; border-radius: 50%; overflow: hidden; border: 8px solid ${CREAM}; z-index: 30; background: ${INK}; box-shadow: 0 8px 0 rgba(0,0,0,.35); }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 232px; top: 262px; z-index: 30; }
      #who b { display: block; font-family: "Fraunces"; font-weight: 900; font-size: 44px; color: ${CREAM}; }
      #who span { display: block; margin-top: 6px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 24px; letter-spacing: .16em; color: ${YELLOW}; }
      #clock { position: absolute; right: 72px; top: 266px; z-index: 30; font-family: "Fraunces"; font-weight: 900; font-size: 28px; color: ${INK}; background: ${YELLOW}; padding: 14px 26px; border-radius: 6px; box-shadow: 0 8px 0 rgba(0,0,0,.35); transform: rotate(-2deg); }

      /* cartel (404–654) */
      #sign { position: absolute; left: 72px; right: 72px; top: 404px; height: 250px; z-index: 30; }
      #signin { font-family: "Fraunces"; font-weight: 900; font-size: 108px; line-height: .98; color: ${CREAM}; filter: drop-shadow(0 8px 0 rgba(0,0,0,.4)); transform-origin: left center; }
      #signin em { font-style: normal; color: ${YELLOW}; }

      /* escenario (676–1172) */
      #stage { position: absolute; left: 72px; top: 676px; width: 936px; height: 496px; z-index: 20; }
      #stage svg { width: 936px; height: 496px; overflow: hidden; font-family: "Figtree"; font-weight: 800; }

      /* karaoke (1188–1388) */
      .cap { inset: auto; left: 60px; right: 60px; top: 1188px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.12; font-weight: 800; filter: drop-shadow(0 5px 0 rgba(0,0,0,.4)); }
      .w { display: inline-block; color: ${MUTE}; font-weight: 500; }

      /* cortinilla: hojas de papel */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      .sheet { position: absolute; left: 0; top: 0; width: 1080px; height: 2000px; filter: drop-shadow(0 -10px 0 rgba(0,0,0,.25)); }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(242, 239, 233, 0.95)) drop-shadow(0 0 22px rgba(242, 239, 233, 0.55)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      ${board("body")}

      <div id="sig">fixtergeek.com</div>
      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS</span></div>
      <div id="clock">SESIÓN 4</div>

      <div id="sign"><div id="signin">EL CASO<br /><em>DE OSVALDO</em></div></div>

      <div id="stage" data-layout-allow-overlap>
        <svg viewBox="0 0 936 496">
          <defs>
            <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="0" flood-color="#000" flood-opacity=".35"/></filter>
            <filter id="sh2" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="0" flood-color="#000" flood-opacity=".3"/></filter>
          </defs>

          <!-- las dos personas -->
          <g transform="translate(110 0)" filter="url(#sh)">${person("admin", BLUE, "OSVALDO·ADMIN", `<rect x="-14" y="300" width="28" height="60" fill="${YELLOW}"/>`)}</g>
          <g transform="translate(826 0)" filter="url(#sh)">${person("client", GREEN, "CLIENTE", `<rect x="26" y="330" width="44" height="50" rx="4" fill="${YELLOW}"/><path d="M36 330 v-14 a12 12 0 0 1 24 0 v14" fill="none" stroke="${YELLOW}" stroke-width="5"/>`)}</g>
          <!-- el toldo de la tienda, sobre el cliente -->
          <g transform="translate(826 300)" filter="url(#sh2)"><g id="awning" opacity="0"><path d="M-90 0 h180 l-14 -34 h-152z" fill="${RED}"/><path d="M-90 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0" fill="${RED}"/><text x="0" y="-10" text-anchor="middle" font-size="16" fill="${CREAM}">TIENDA</text></g></g>

          <!-- Ghosty (uno) y Ghosty (dos), de papel -->
          <g transform="translate(348 140)" filter="url(#sh)"><g id="g1" opacity="0"><image href="assets/ghosty.png" x="0" y="0" width="240" height="278"/><g id="sweat" opacity="0"><path d="M246 70 q14 -22 20 0 a10 10 0 1 1 -20 0z" fill="${BLUE2}"/></g></g></g>
          <g transform="translate(348 140)" filter="url(#sh)"><g id="g2" opacity="0"><image href="assets/ghosty.png" x="0" y="0" width="240" height="278"/></g></g>

          <!-- los gafetes -->
          ${badge("bg1", 468, 292, "GAFETE", "ACCESO", "TOTAL")}
          ${badge("bg2", 468, 292, "GAFETE", "NIVEL:", "PÚBLICO", INK, GREEN)}
          ${badge("bg3", 748, 292, "GAFETE", "NIVEL:", "PÚBLICO", INK, GREEN)}

          <!-- burbujas -->
          ${bubble("bAdm", 130, 96, 214, "¿cuánto vendimos?", "l")}
          ${bubble("bCli", 604, 96, 214, "¿cuánto vendieron?", "r")}
          <g id="bAns" opacity="0"><rect x="368" y="14" width="200" height="60" rx="10" fill="${YELLOW}"/><text id="bAnst" x="468" y="54" text-anchor="middle" font-family="Fraunces" font-weight="900" font-size="30" fill="${INK}">$ 84,300</text></g>
          <path id="bAnsl" d="M468 74 v60" stroke="${YELLOW}" stroke-width="6" stroke-dasharray="8 6" opacity="0"/>

          <!-- las fichas del cliente (verdes) y las privadas (rojas) -->
          ${chip("c1", 748, 150, "comprar", GREEN)}
          ${chip("c2", 748, 192, "carrito", GREEN)}
          ${chip("c3", 748, 234, "catálogo", GREEN)}
          ${chip("r1", 188, 150, "base de datos", RED)}
          ${chip("r2", 188, 192, "total de ventas", RED)}
          <!-- los papeles que se fugan -->
          <g id="leak" opacity="0">${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${470 + i * 8} ${300 - i * 6})"><g id="lk${i}"><rect x="-22" y="-28" width="44" height="56" rx="4" fill="${CREAM}"/><rect x="-14" y="-16" width="28" height="5" fill="${RED}"/><rect x="-14" y="-6" width="28" height="5" fill="${RED}"/><rect x="-14" y="4" width="18" height="5" fill="${RED}"/></g></g>`).join("")}</g>

          <!-- la llave y sus permisos -->
          <g transform="translate(468 346)" filter="url(#sh2)"><g id="key" opacity="0">
            <circle cx="-70" cy="0" r="34" fill="${YELLOW}"/><circle cx="-70" cy="0" r="14" fill="${INK}"/>
            <rect x="-40" y="-10" width="140" height="20" fill="${YELLOW}"/><rect x="56" y="10" width="12" height="20" fill="${YELLOW}"/><rect x="82" y="10" width="12" height="26" fill="${YELLOW}"/>
            <g id="keylvl" opacity="0"><rect x="-32" y="-52" width="130" height="28" rx="6" fill="${CREAM}"/><text id="keylvlt" x="33" y="-32" text-anchor="middle" font-size="15" fill="${INK}">NIVEL DE ACCESO</text></g>
          </g></g>
          ${chip("p1", 250, 300, "ver ventas", CREAM, INK, 150)}
          ${chip("p2", 250, 345, "ver catálogo", CREAM, INK, 150)}
          ${chip("p3", 250, 390, "comprar", CREAM, INK, 150)}
          ${chip("p4", 690, 300, "borrar", CREAM, INK, 150)}
          <g id="wires" opacity="0" stroke="${YELLOW}" stroke-width="4" stroke-dasharray="8 6" fill="none"><path d="M325 300 Q 380 300 398 342"/><path d="M325 345 Q 380 345 400 348"/><path d="M325 390 Q 390 390 402 354"/><path d="M605 300 Q 580 300 566 342"/></g>

          <!-- el token de Google, de papel -->
          <g transform="translate(748 300)" filter="url(#sh2)"><g id="gtok" opacity="0">
            <rect x="-96" y="-70" width="192" height="150" rx="10" fill="${CREAM}"/>
            <circle cx="-56" cy="-36" r="22" fill="${BLUE2}"/><text x="-56" y="-27" text-anchor="middle" font-family="Fraunces" font-weight="900" font-size="26" fill="${CREAM}">G</text>
            <text x="-22" y="-28" font-size="16" fill="${INK}">token</text>
            <text class="sc" id="sc1" x="-80" y="8" font-size="15" fill="${INK}" opacity=".35">calendar.read</text>
            <text class="sc" id="sc2" x="-80" y="34" font-size="15" fill="${INK}" opacity=".35">gmail.send</text>
            <text class="sc" id="sc3" x="-80" y="60" font-size="15" fill="${INK}" opacity=".35">drive.files</text>
            <text id="sc1k" x="72" y="8" text-anchor="middle" font-size="16" fill="${GREEN}" opacity="0">✓</text>
            <text id="sc2k" x="72" y="34" text-anchor="middle" font-size="16" fill="${RED}" opacity="0">✕</text>
            <text id="sc3k" x="72" y="60" text-anchor="middle" font-size="16" fill="${GREEN}" opacity="0">✓</text>
          </g></g>

          <!-- sellos y onomatopeyas -->
          <g transform="translate(188 171)"><g id="xstamp" opacity="0"><circle r="52" fill="none" stroke="${RED}" stroke-width="12"/><path d="M-26 -26 L26 26 M26 -26 L-26 26" stroke="${RED}" stroke-width="12" stroke-linecap="round"/></g></g>
          <g transform="translate(468 300)"><g id="okstamp" opacity="0"><circle r="70" fill="none" stroke="${GREEN2}" stroke-width="12"/><path d="M-40 4 L-12 32 L44 -30" fill="none" stroke="${GREEN2}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g></g>
          <text class="fr" id="fx1" x="620" y="80" font-family="Fraunces" font-weight="900" font-size="62" fill="${YELLOW}" opacity="0" transform="rotate(-8 620 80)">¡DING!</text>
          <text class="fr" id="fx2" x="560" y="470" font-family="Fraunces" font-weight="900" font-size="66" fill="${RED}" opacity="0" transform="rotate(6 560 470)">¡UPS!</text>
          <text class="fr" id="fx3" x="640" y="120" font-family="Fraunces" font-weight="900" font-size="66" fill="${GREEN2}" opacity="0" transform="rotate(-6 640 120)">¡IGUAL!</text>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        ${board("intro")}
        <div class="mono k" id="i1" style="top:262px;font-size:26px;letter-spacing:.16px;color:${YELLOW}">TALLER DE SISTEMAS AGÉNTICOS · SESIÓN 4</div>
        <div class="fr k paper" id="i2" style="top:318px;font-size:150px;line-height:.94;color:${CREAM}">¿Y SI EL<br />CLIENTE</div>
        <div class="fr k paper" id="i3" style="top:620px;font-size:104px;line-height:.92;color:${INK};padding:18px 34px;background:${YELLOW};border-radius:10px;transform:rotate(-3deg);transform-origin:left center;display:inline-block">VE LAS VENTAS?</div>
        <div class="k paper" id="i4" style="top:800px;font-size:60px;font-weight:800;color:${CREAM};line-height:1.14;width:900px">Le prestas tu agente a tu tienda.<br />Trae el mismo gafete.</div>
        <div id="i6" class="paper" style="position:absolute;right:72px;top:1010px;width:400px;height:360px;border-radius:14px;border:10px solid ${CREAM};overflow:hidden;transform:rotate(3deg)"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div class="mono k" id="i7" style="top:1060px;font-size:30px;line-height:1.6;color:${MUTE};width:480px">Permisos y extensiones<br />10 sep 2026<br /><span style="color:${CREAM}">Héctorbliss</span></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        ${board("outro")}
        <div class="k paper" id="o1" style="right:72px;top:262px;font-size:54px;font-weight:800;color:${YELLOW};line-height:1.2">«Créate roles, créate permisos,<br />y asígnaselos a la llave.»</div>
        <div id="o2" class="paper" style="position:absolute;left:72px;width:520px;top:440px;height:16px;border-radius:8px;background:${RED};transform-origin:left center"></div>
        <div class="k" style="top:520px;right:72px">
          <div id="o3" class="mono" style="font-size:30px;letter-spacing:.2em;color:${MUTE}">TALLER EN VIVO · 6 SESIONES</div>
          <div id="o4" class="fr paper" style="margin-top:28px;font-size:120px;line-height:.94;color:${CREAM}">SISTEMAS<br />AGÉNTICOS</div>
          <div id="o5" class="mono" style="margin-top:40px;font-size:32px;line-height:1.6;color:${MUTE}">Sesión 4 · Permisos y extensiones (MCP)<br />Las sesiones se graban. Entras a la edición en curso.</div>
          <div id="o6" class="fr paper" style="margin-top:56px;display:inline-block;padding:26px 40px;background:${GREEN};color:${CREAM};font-size:38px;border-radius:12px">Regístrate en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <div id="wipe">${sheets}</div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const CREAM = "${CREAM}", RED = "${RED}", YELLOW = "${YELLOW}", GREEN = "${GREEN}", GREEN2 = "${GREEN2}", BLUE = "${BLUE}", MUTE = "${MUTE}", INK = "${INK}";
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: los montes de papel respiran
      tl.to(".hills path", { y: -14, duration: 5, ease: "sine.inOut", yoyo: true, repeat: REP(5), stagger: 1.2 }, 0);

      // ---- portada: completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 14, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { rotate: -1, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { rotate: 1, y: -10, duration: 2.6, ease: "sine.inOut" }, 0);

      // ---- cortinilla: seis hojas de papel suben en cascada desde abajo (pop-up) y bajan desde la última
      tl.set(".sheet", { y: 2000 }, 0);
      const wipe = (t) => {
        tl.to(".sheet", { y: -60, duration: .5, stagger: .07, ease: "back.out(1.1)" }, t);
        tl.to(".sheet", { y: 2000, duration: .42, stagger: { each: .06, from: "end" }, ease: "power3.in" }, t + .95);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [4.0, 18.99, 35.89, 45.6, 69.35, 91.36, 104.42, 127.98, 141.52].forEach(punch);

      // ---- cartel: la hoja se dobla y se abre
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .05, duration: .14, ease: "power3.in" }, BO + t - .14);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, duration: .4, ease: "back.out(1.6)" }, BO + t);
      };
      sign(15.62, "EL MISMO<br /><em>GAFETE</em>");
      sign(27.62, "ESO<br /><em>NO DEBERÍA</em>");
      sign(37.71, "EXPONE<br /><em>TODO</em>");
      sign(45.6, "¿CÓMO SE<br /><em>RESUELVE?</em>");
      sign(52.24, "GAFETES<br /><em>CON NIVEL</em>");
      sign(67.7, "O DOS<br /><em>MCPs</em>");
      sign(91.36, "UN SOLO<br /><em>ENDPOINT</em>");
      sign(104.42, "ROLES Y<br /><em>PERMISOS</em>");
      sign(117.88, "SIN CAMBIAR<br /><em>LA LLAVE</em>");
      sign(126.3, "COMO EL SCOPE<br /><em>DE GOOGLE</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const pop = (id, t, o = "50% 100%") => tl.to(id, { opacity: 1, duration: .01 }, at(t)).from(id, { scaleY: 0, scaleX: .6, transformOrigin: o, duration: .4, ease: "back.out(2)", immediateRender: false }, at(t));
      const hide = (id, t) => tl.to(id, { opacity: 0, duration: .2 }, at(t));
      const fx = (id, t, rot) => tl.to(id, { opacity: 1, duration: .01 }, at(t)).from(id, { scale: .3, transformOrigin: "50% 50%", duration: .35, ease: "back.out(3)", immediateRender: false }, at(t)).to(id, { rotation: rot, transformOrigin: "50% 50%", duration: 1, ease: "sine.inOut" }, at(t) + .1).to(id, { opacity: 0, duration: .22 }, at(t) + 1.0);
      const stamp = (id, t) => tl.to(id, { opacity: 1, duration: .01 }, at(t)).from(id, { scale: 2.2, rotation: -14, transformOrigin: "50% 50%", duration: .22, ease: "power3.in", immediateRender: false }, at(t));

      // 1.04 "Osvaldo": aparece el admin · SFX pop
      pop("#admin", 1.0);
      // 3.48 "ya le di acceso a mi agente": Ghosty; 4.00 "acceso": el gafete se prende · SFX pop, pin
      pop("#g1", 3.4);
      tl.to("#g1", { y: -6, duration: .8, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / .8) - 1) }, at(3.4));
      pop("#bg1", 4.1, "50% 0%");
      // 7.69 "en nombre del administrador": el admin pregunta; 10.47 "base de datos" y 12.58 "los totales": Ghosty contesta · SFX paper, ding
      pop("#bAdm", 7.7, "0% 100%");
      tl.to("#bAdmt", { textContent: "¿cuánto vendimos?", duration: .01 }, at(10.4));
      pop("#bAns", 12.6, "50% 100%");
      tl.to("#bAnsl", { opacity: 1, duration: .1 }, at(12.6));
      fx("#fx1", 13.2, 5);
      // 15.62 "ese mismo MCP se lo quiero dar a mi cliente" (18.99): el cliente entra; 20.45 "una tienda": el toldo · SFX pop, paper
      hide("#bAdm", 15.6); hide("#bAns", 15.6); hide("#bAnsl", 15.6);
      pop("#client", 18.9);
      pop("#awning", 20.4, "50% 100%");
      // 23.51 comprar / 24.73 carrito / 26.52 catálogo: fichas verdes · SFX tick ×3
      pop("#c1", 24.0, "100% 50%"); pop("#c2", 25.0, "100% 50%"); pop("#c3", 26.7, "100% 50%");
      // 28.61 "base de datos" / 34.36 "total de ventas": fichas rojas del lado del admin; 35.89 "para nada": ✕ · SFX tick ×2, stamp
      pop("#r1", 30.4, "0% 50%"); pop("#r2", 34.3, "0% 50%");
      tl.to(["#r1", "#r2"], { x: 8, duration: .06, yoyo: true, repeat: 5 }, at(35.9));
      stamp("#xstamp", 35.9);
      hide("#xstamp", 37.5);
      // 37.71 "un agente público usando el mismo MCP estaría exponiendo toda la información": el cliente pregunta y se fugan los papeles · SFX paper, whoosh, hit
      hide("#c1", 37.6); hide("#c2", 37.6); hide("#c3", 37.6);
      pop("#bCli", 37.8, "100% 100%");
      pop("#bAns", 39.6, "50% 100%"); tl.to("#bAnsl", { opacity: 1, duration: .1 }, at(39.6));
      tl.to("#leak", { opacity: 1, duration: .01 }, at(41.3));
      [0, 1, 2, 3, 4].forEach((i) => tl.to("#lk" + i, { x: 220 + i * 30, y: -120 + i * 40, rotation: 40 + i * 25, duration: .7, ease: "power2.out" }, at(41.36 + i * .08)));
      fx("#fx2", 41.9, -6);
      tl.to("#leak", { opacity: 0, duration: .3 }, at(44.5));
      // 45.60 "¿cómo se resuelve?": Ghosty suda · SFX pop
      hide("#bCli", 45.5); hide("#bAns", 45.5); hide("#bAnsl", 45.5); hide("#awning", 45.5);
      pop("#sweat", 45.7); tl.to("#sweat", { y: 30, opacity: 0, duration: .9 }, at(46.8));
      // 50.70 "invéntate en el MCP niveles… tokens con niveles" (52.24/54.14): el gafete se voltea · SFX paper ×2
      tl.to("#bg1", { scaleX: 0, transformOrigin: "50% 50%", duration: .18, ease: "power2.in" }, at(52.2));
      tl.to("#bg1a", { textContent: "NIVEL:", duration: .01 }, at(52.4)).to("#bg1b", { textContent: "ADMIN", duration: .01 }, at(52.4));
      tl.to("#bg1", { scaleX: 1, duration: .22, ease: "power2.out" }, at(52.4));
      pop("#bg3", 54.1, "50% 0%");
      // 55.30 "el token lleve toda la información de quién eres" (57.58): nombres en los gafetes · SFX tick ×2
      tl.to("#bg1top", { textContent: "OSVALDO", duration: .01 }, at(57.6));
      tl.to("#bg3top", { textContent: "CLIENTE", duration: .01 }, at(58.9));
      // 62.10 "público": el gafete verde; 65.27 "usuario limitado": las rojas se tachan para él · SFX tick ×2
      tl.to(["#bg3h", "#bg3h2"], { fill: GREEN, duration: .2 }, at(62.1));
      tl.to(["#r1x", "#r2x"], { opacity: 1, duration: .01, stagger: .3 }, at(65.3)).from(["#r1x", "#r2x"], { scale: 2, transformOrigin: "50% 50%", duration: .2, stagger: .3, immediateRender: false }, at(65.3));
      // 67.70 "la otra es invéntate dos MCPs" (69.35): un segundo Ghosty; 73.57 "separas": se abren · SFX pop, whoosh
      hide("#bg3", 67.5); hide("#r1", 67.5); hide("#r2", 67.5);
      tl.to("#g2", { opacity: 1, duration: .01 }, at(69.3)).from("#g2", { x: 0, scale: .6, transformOrigin: "50% 100%", duration: .4, ease: "back.out(2)", immediateRender: false }, at(69.3));
      tl.to("#g2", { x: 180, duration: .5, ease: "back.out(1.4)" }, at(73.6));
      tl.to(["#g1", "#bg1"], { x: -180, duration: .5, ease: "back.out(1.4)", overwrite: "auto" }, at(73.6));
      tl.to("#g1", { y: -6, duration: .8, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor((BODY - 74) / .8) - 1) }, at(74.2));
      // 76.03 "este MCP es para administración y funciona con un token" (78.59): gafete rojo al de la izquierda; 80.34 "para público y ni siquiera necesita token" (82.74): el de la derecha sin gafete · SFX stamp, tick
      tl.to("#bg1a", { textContent: "ADMIN", duration: .01 }, at(78.6)).to("#bg1b", { textContent: "CON TOKEN", duration: .01 }, at(78.6));
      tl.to("#bg1", { scale: 1.2, transformOrigin: "50% 50%", duration: .15, yoyo: true, repeat: 1 }, at(78.6));
      tl.to("#g2", { rotation: -6, transformOrigin: "50% 100%", duration: .3, yoyo: true, repeat: 1 }, at(82.7));
      tl.to("#client", { x: -80, duration: .5, ease: "back.out(1.4)" }, at(84.5));
      // 87.67 "le das el acceso… y ya está" (90.73): ✓ · SFX stamp
      stamp("#okstamp", 90.7); hide("#okstamp", 92.0);
      // 91.36 "a mí me resulta más fácil usar un solo endpoint": el segundo Ghosty se va; 97.68 "por llave": la llave · SFX whoosh, pop
      tl.to("#g2", { x: 420, opacity: 0, duration: .5, ease: "power2.in" }, at(92.0));
      tl.to("#client", { x: 0, duration: .5 }, at(92.0));
      tl.to(["#g1", "#bg1"], { x: 0, duration: .5, ease: "back.out(1.2)", overwrite: "auto" }, at(92.4));
      tl.to("#g1", { y: -6, duration: .8, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor((BODY - 93) / .8) - 1) }, at(93.0));
      hide("#bg1", 97.6);
      pop("#key", 97.7, "50% 50%");
      tl.to("#key", { rotation: -12, transformOrigin: "-70px 0px", duration: .6, ease: "sine.inOut", yoyo: true, repeat: 3 }, at(98.2));
      // 100.36 "nivel de acceso": la etiqueta en la llave · SFX tick
      pop("#keylvl", 100.4, "50% 100%");
      // 104.42 "créate roles, créate permisos" (106.24), "los objetos permiso" (107.5): fichas de permiso; 110.14 "asígnaselos a la llave": se conectan · SFX tick ×4, paper
      pop("#p1", 105.0, "100% 50%"); pop("#p2", 106.2, "100% 50%"); pop("#p3", 107.5, "100% 50%"); pop("#p4", 108.2, "0% 50%");
      tl.to("#wires", { opacity: 1, duration: .3 }, at(110.2));
      tl.set("#wires path", { strokeDasharray: 300, strokeDashoffset: 300 }, 0);
      tl.to("#wires path", { strokeDashoffset: 0, duration: .5, stagger: .1, ease: "power2.out" }, at(110.2));
      // 120.06 "añadir" / 120.63 "quitar": los permisos se prenden y apagan; 122.0 "sin cambiar la llave": la llave ni se mueve · SFX tick ×3
      tl.to("#p4", { opacity: .3, duration: .15 }, at(120.6)).to("#p4x", { opacity: 1, duration: .01 }, at(120.6));
      tl.to("#p1", { scale: 1.15, transformOrigin: "50% 50%", duration: .15, yoyo: true, repeat: 1 }, at(120.1));
      tl.to("#key", { scale: 1.08, transformOrigin: "50% 50%", duration: .2, yoyo: true, repeat: 1 }, at(122.0));
      // 123.86 "el token debería decirlo": la llave brilla · SFX ding
      tl.to("#keylvlt", { textContent: "DICE QUÉ PUEDES", duration: .01 }, at(123.9));
      tl.to("#keylvl", { scale: 1.12, transformOrigin: "50% 100%", duration: .18, yoyo: true, repeat: 1 }, at(123.9));
      // 127.98 "Google": el token de papel con sus scopes; 133.35 "qué te da y qué no": ✓ ✕ ✓; 138.82 "scope, ciertos permisos": se encienden; 141.52 "es igual" · SFX pop, tick ×3, stamp
      hide("#p4", 127.8); hide("#client", 127.8);
      pop("#gtok", 128.0, "50% 100%");
      tl.to("#sc1k", { opacity: 1, duration: .01 }, at(134.2)); tl.to("#sc2k", { opacity: 1, duration: .01 }, at(134.8)); tl.to("#sc3k", { opacity: 1, duration: .01 }, at(135.4));
      tl.to([".sc"], { opacity: 1, duration: .2, stagger: .12 }, at(138.8));
      fx("#fx3", 141.5, -4);
      tl.to(["#key", "#gtok"], { scale: 1.08, transformOrigin: "50% 50%", duration: .2, yoyo: true, repeat: 1 }, at(141.5));

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
        .from("#o6", { scaleY: 0, transformOrigin: "left bottom", duration: .45, ease: "back.out(1.8)" }, OUT_IN + 1.2)
        .from("#logo", { opacity: 0, y: 12, duration: .45 }, OUT_IN + 1.4);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);

// SFX (tiempo del clip): mismos números que la timeline
const sfx = {
  pop: [1.0, 3.4, 18.9, 45.7, 54.1, 69.3, 97.7, 128.0],
  pin: [4.1],
  paper: [7.7, 20.4, 37.8, 52.2, 52.4, 110.2],
  ding: [12.6, 123.9],
  tick: [24.0, 25.0, 26.7, 30.4, 34.3, 57.6, 58.9, 62.1, 65.3, 65.6, 82.7, 100.4, 105.0, 106.2, 107.5, 108.2, 120.1, 120.6, 122.0, 134.2, 134.8, 135.4, 138.8, 138.92, 139.04],
  stamp: [35.9, 78.6, 90.7, 141.5],
  whoosh: [41.36, 73.6, 92.0],
  hit: [41.9],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx));
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s · sfx", Object.values(sfx).flat().length);
