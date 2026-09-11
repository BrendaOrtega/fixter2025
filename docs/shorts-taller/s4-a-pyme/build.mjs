import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 63.4;         // duración del clip (21.45 → 84.85 de la ventana)
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 74.75;

// piel: plastilina. Tabla oscura cálida, colores de barra de plastilina, sombra dura, cero gradientes
const BG = "#2A2320";
const SHADOW = "#1A1512";
const CREAM = "#F5E9D6";
const CORAL = "#F26B4E";
const YELLOW = "#F7C948";
const GREEN = "#7CC576";
const BLUE = "#4FA8E8";
const BROWN = "#7A4F32";
const MUTE = "#9C8B78";
const DIM = "#7A6B5C";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; la palabra en curso se realza por PESO y color, no por escala
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// huella digital de fondo: arcos concéntricos muy tenues (nunca fondo plano)
const HUELLA = `<pattern id="huella" width="260" height="260" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><g fill="none" stroke="${CREAM}" stroke-width="2" opacity=".07"><ellipse cx="130" cy="130" rx="30" ry="42"/><ellipse cx="130" cy="130" rx="52" ry="68"/><ellipse cx="130" cy="130" rx="74" ry="94"/><ellipse cx="130" cy="130" rx="96" ry="120"/></g></pattern>`;
const board = (id) => `<svg class="board" viewBox="0 0 1080 1920"><defs>${HUELLA.replace('id="huella"', `id="huella-${id}"`)}</defs><rect width="1080" height="1920" fill="${BG}"/><rect width="1080" height="1920" fill="url(#huella-${id})"/></svg>`;

// migas de plastilina regadas por la tabla (deterministas)
const crumbs = [[120, 140, 14, CORAL], [960, 180, 10, GREEN], [1010, 1520, 16, BLUE], [80, 1600, 11, YELLOW], [540, 1760, 13, YELLOW], [200, 1840, 9, CORAL], [1020, 720, 9, GREEN], [50, 900, 12, BLUE]]
  .map(([x, y, r, c], i) => `<circle class="crumb" id="cr${i}" cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join("");

// la cortinilla: bolas de plastilina que se aplastan contra el cristal y tapan el corte
const BLOBS = [[200, 300, CORAL], [880, 300, YELLOW], [540, 800, GREEN], [150, 1250, BLUE], [930, 1250, CORAL], [540, 1700, YELLOW], [540, 60, BLUE], [540, 1900, GREEN]];
const blobs = BLOBS.map(([x, y, c], i) => `<g transform="translate(${x} ${y})"><circle class="blob" id="bl${i}" r="640" fill="${c}"/></g>`).join("");

// contorno de plastilina: el filtro ondula el borde de todo lo que lo lleva
const CLAY = (id, seed) => `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>`;
const H2 = `<pattern id="h2" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><g fill="none" stroke="${SHADOW}" stroke-width="2" opacity=".12"><ellipse cx="60" cy="60" rx="14" ry="20"/><ellipse cx="60" cy="60" rx="26" ry="34"/><ellipse cx="60" cy="60" rx="38" ry="48"/></g></pattern>`;

// una losa de plastilina con su sombra dura (x, y, w, h, radio, color)
const slab = (x, y, w, h, r, c, extra = "") => `<rect x="${x + 8}" y="${y + 10}" width="${w}" height="${h}" rx="${r}" fill="${SHADOW}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" ${extra}/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#h2)"/>`;

// los cuatro archivos del Drive
const sheets = [[-14, 62, 168], [-4, 112, 156], [6, 162, 158], [16, 208, 172]]
  .map(([rot, x, y], i) => `<g transform="translate(${x + 27} ${y + 36})"><g id="sh${i}" transform="rotate(${rot})"><rect x="-27" y="-36" width="54" height="72" rx="8" fill="${CREAM}"/><rect x="-17" y="-20" width="30" height="6" rx="3" fill="${MUTE}"/><rect x="-17" y="-8" width="34" height="6" rx="3" fill="${MUTE}" opacity=".6"/><rect x="-17" y="4" width="24" height="6" rx="3" fill="${MUTE}" opacity=".6"/></g></g>`).join("");

// la receta: cuatro pasos y un hueco para la variable
const steps = ["Drive", "totales", "PDF", "correo"];
const recipeSteps = steps.map((s, i) => `<g id="st${i}" opacity="0"><circle id="stc${i}" cx="48" cy="${66 + i * 30}" r="11" fill="${GREEN}"/><text class="stn" id="stn${i}" x="48" y="${71 + i * 30}" text-anchor="middle" font-size="15" fill="${SHADOW}">${i + 1}</text><text class="slbl" x="70" y="${72 + i * 30}" font-size="20" fill="${SHADOW}">${s}</text></g>`).join("");

// la tubería del workflow: cuatro nodos y tres tubos, el de en medio es el que se rompe
const pipeNodes = [[70, 342], [160, 300], [250, 342], [340, 300]];
const pipes = `
  <g id="pipe" opacity="0">
    <g id="pipeA"><path d="M70 342 L160 300" stroke="${SHADOW}" stroke-width="30" stroke-linecap="round" transform="translate(6 8)"/><path d="M70 342 L160 300" stroke="${MUTE}" stroke-width="22" stroke-linecap="round"/></g>
    <g transform="translate(205 321)"><g id="pipeB"><path d="M-45 21 L45 -21" stroke="${SHADOW}" stroke-width="30" stroke-linecap="round" transform="translate(6 8)"/><path d="M-45 21 L45 -21" stroke="${MUTE}" stroke-width="22" stroke-linecap="round"/></g></g>
    <g id="pipeC"><path d="M250 342 L340 300" stroke="${SHADOW}" stroke-width="30" stroke-linecap="round" transform="translate(6 8)"/><path d="M250 342 L340 300" stroke="${MUTE}" stroke-width="22" stroke-linecap="round"/></g>
    ${pipeNodes.map(([x, y], i) => `<g transform="translate(${x} ${y})"><g id="pn${i}"><circle r="30" fill="${SHADOW}" transform="translate(6 8)"/><circle r="30" fill="${[BLUE, YELLOW, CORAL, GREEN][i]}"/><circle r="30" fill="url(#h2)"/></g></g>`).join("")}
    <text class="slbl" id="pipelbl" x="205" y="445" text-anchor="middle" font-size="20" fill="${CREAM}">WORKFLOW</text>
  </g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Nunito:wght@500;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Nunito", system-ui; color: ${CREAM}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "JetBrains Mono", monospace; font-weight: 700; }
      .fred { font-family: "Fredoka", system-ui; font-weight: 700; }
      .board { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
      #crumbs { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 2; }

      /* firma discreta: el CTA del pie lo tapa TikTok, así que aquí sólo va la marca */
      #sig { position: absolute; right: 72px; top: 346px; z-index: 30; font-family: "JetBrains Mono"; font-weight: 700; font-size: 20px; letter-spacing: .14em; color: ${DIM}; }

      /* cabecera (250–390): aro de plastilina alrededor del avatar en video */
      #av { position: absolute; left: 72px; top: 250px; width: 132px; height: 132px; border-radius: 50%; overflow: hidden;
        border: 10px solid ${CREAM}; box-shadow: 8px 10px 0 ${SHADOW}; z-index: 30; background: ${BROWN}; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 232px; top: 262px; z-index: 30; }
      #who b { display: block; font-family: "Fredoka"; font-weight: 700; font-size: 44px; color: ${CREAM}; text-shadow: 4px 5px 0 ${SHADOW}; }
      #who span { display: block; margin-top: 6px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 24px; letter-spacing: .16em; color: ${MUTE}; }
      #clock { position: absolute; right: 72px; top: 270px; z-index: 30; font-family: "Fredoka"; font-weight: 700; font-size: 30px; letter-spacing: .06em;
        color: ${BG}; background: ${YELLOW}; padding: 14px 26px; border-radius: 999px; box-shadow: 6px 8px 0 ${SHADOW}; }

      /* cartel (404–654): Fredoka con sombra dura; un estado cada 7-9 s */
      #sign { position: absolute; left: 72px; right: 72px; top: 404px; height: 250px; z-index: 30; }
      #signin { font-family: "Fredoka"; font-weight: 700; font-size: 118px; line-height: .94; letter-spacing: -.01em; color: ${CREAM}; text-shadow: 8px 10px 0 ${SHADOW}; transform-origin: left center; }
      #signin em { font-style: normal; color: ${CORAL}; display: inline-block; }

      /* escenario (676–1172): la mesa de trabajo */
      #stage { position: absolute; left: 72px; top: 676px; width: 936px; height: 496px; z-index: 20; }
      #stage svg { width: 936px; height: 496px; overflow: hidden; }
      .slbl { font-family: "JetBrains Mono", monospace; font-weight: 700; letter-spacing: .06em; }
      .stn { font-family: "Fredoka", system-ui; font-weight: 700; }
      .fx { font-family: "Fredoka", system-ui; font-weight: 700; letter-spacing: -.01em; }
      #ghostimg { filter: drop-shadow(10px 12px 0 ${SHADOW}); }

      /* karaoke (1188–1388): una línea; la palabra en curso en amarillo y negrita */
      .cap { inset: auto; left: 60px; right: 60px; top: 1188px; height: 200px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.12; letter-spacing: -.01em; font-weight: 900; text-shadow: 4px 5px 0 ${SHADOW}; }
      .w { display: inline-block; color: ${MUTE}; font-weight: 500; }

      /* cortinilla: bolas de plastilina que se aplastan contra el cristal */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      #wipe svg { width: 1080px; height: 1920px; }
      #wipe .blob { transform-box: fill-box; }
      #wipeprint { position: absolute; inset: 0; z-index: 71; opacity: 0; pointer-events: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><g fill='none' stroke='%231A1512' stroke-width='3' opacity='.35'><ellipse cx='150' cy='150' rx='30' ry='44'/><ellipse cx='150' cy='150' rx='58' ry='78'/><ellipse cx='150' cy='150' rx='88' ry='112'/><ellipse cx='150' cy='150' rx='118' ry='146'/></g></svg>"); }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
      #logo { filter: drop-shadow(0 0 10px rgba(242, 239, 233, 0.95)) drop-shadow(0 0 22px rgba(242, 239, 233, 0.55)); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      ${board("body")}
      <svg id="crumbs" viewBox="0 0 1080 1920"><defs>${CLAY("clayc", 7)}</defs><g filter="url(#clayc)">${crumbs}</g></svg>

      <div id="sig">fixtergeek.com</div>
      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS</span></div>
      <div id="clock">SESIÓN 4</div>

      <div id="sign"><div id="signin">ESTO<br /><em>SE VENDE</em></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 496">
          <defs>${CLAY("c2", 3)}${H2}</defs>

          <!-- la mesa -->
          <g filter="url(#c2)">${slab(30, 392, 876, 70, 26, BROWN)}<rect x="52" y="402" width="400" height="14" rx="7" fill="#9A6A48" opacity=".8"/></g>

          <!-- la tubería del workflow (aparece en "pipelines", se rompe en "pum") -->
          <g filter="url(#c2)"><g transform="translate(-30 0)">${pipes}</g>
            <g id="handg" opacity="0"><g transform="translate(402 470)"><g id="hand">
              <!-- la persona: cabeza, cuerpo, brazos arriba y la llave; sube desde abajo de la mesa -->
              <rect x="-44" y="-96" width="88" height="110" rx="26" fill="${SHADOW}" transform="translate(6 8)"/><rect x="-44" y="-96" width="88" height="110" rx="26" fill="${BLUE}"/>
              <circle cx="0" cy="-124" r="36" fill="${SHADOW}" transform="translate(6 8)"/><circle cx="0" cy="-124" r="36" fill="${CREAM}"/>
              <circle cx="-12" cy="-128" r="4" fill="${SHADOW}"/><circle cx="12" cy="-128" r="4" fill="${SHADOW}"/>
              <path d="M-20 -142 l14 -6 M20 -142 l-14 -6" stroke="${SHADOW}" stroke-width="4" stroke-linecap="round"/>
              <path d="M-14 -110 q14 -8 28 0" fill="none" stroke="${SHADOW}" stroke-width="4" stroke-linecap="round"/>
              <g id="armL"><path d="M-40 -80 q-30 -30 -34 -90" fill="none" stroke="${CREAM}" stroke-width="18" stroke-linecap="round"/></g>
              <g id="armR"><path d="M40 -80 q30 -30 34 -90" fill="none" stroke="${CREAM}" stroke-width="18" stroke-linecap="round"/>
                <g transform="translate(74 -170) rotate(-30)"><rect x="-10" y="-40" width="20" height="80" rx="8" fill="${MUTE}"/><path d="M-22 -40 h44 v-26 l-14 8 h-16 l-14 -8z" fill="${MUTE}"/></g>
              </g>
              <text class="fx" id="qmark" x="0" y="-196" text-anchor="middle" font-size="64" fill="${CORAL}" opacity="0">?</text>
              <text class="slbl" x="0" y="-240" text-anchor="middle" font-size="18" fill="${CREAM}">HUMANO</text>
            </g></g></g>
          </g></g>

          <!-- la carpeta del Drive con sus cuatro hojas -->
          <g filter="url(#c2)"><g id="folder" opacity="0">
            <g transform="translate(10 12)"><path d="M40 250 h70 l22 -26 h96 a20 20 0 0 1 20 20 v130 a22 22 0 0 1 -22 22 h-186 a22 22 0 0 1 -22 -22 v-102 a22 22 0 0 1 22 -22z" fill="${SHADOW}"/></g>
            <path d="M40 250 h70 l22 -26 h96 a20 20 0 0 1 20 20 v130 a22 22 0 0 1 -22 22 h-186 a22 22 0 0 1 -22 -22 v-102 a22 22 0 0 1 22 -22z" fill="${BLUE}"/>
            <path d="M40 250 h70 l22 -26 h96 a20 20 0 0 1 20 20 v130 a22 22 0 0 1 -22 22 h-186 a22 22 0 0 1 -22 -22 v-102 a22 22 0 0 1 22 -22z" fill="url(#h2)"/>
            ${sheets}
            <text class="slbl" x="140" y="330" text-anchor="middle" font-size="20" fill="${CREAM}">DRIVE</text>
          </g></g>

          <!-- Ghosty oficial (sin repintar); la boca torcida va en tinta encima, y la hoja de totales enfrente -->
          <g transform="translate(352 118)"><g id="ghost">
            <image id="ghostimg" href="assets/ghosty.png" x="0" y="0" width="232" height="268"/>
            <g id="sweat" opacity="0"><path d="M232 96 q14 -22 20 0 a10 10 0 1 1 -20 0z" fill="${BLUE}"/></g>
          </g></g>
          <g filter="url(#c2)"><g transform="translate(400 330)"><g id="sheet" opacity="0">
            ${slab(0, 0, 136, 100, 12, CREAM)}
            <text id="tot" x="68" y="42" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="${CORAL}">$ 0</text>
            <rect x="16" y="62" width="70" height="10" rx="5" fill="${MUTE}"/><rect x="16" y="80" width="104" height="10" rx="5" fill="${MUTE}" opacity=".6"/>
          </g></g></g>

          <!-- la etiqueta de precio que cuelga en "se vende" -->
          <g filter="url(#c2)"><g transform="translate(600 150)"><g id="tag" opacity="0">
            <path d="M-50 -30 L30 -30 L60 0 L30 30 L-50 30 Z" fill="${SHADOW}" transform="translate(6 8)"/><path d="M-50 -30 L30 -30 L60 0 L30 30 L-50 30 Z" fill="${CORAL}"/>
            <circle cx="34" cy="0" r="6" fill="${BG}"/><text class="fx" x="-14" y="12" text-anchor="middle" font-size="34" fill="${CREAM}">$</text>
            <path d="M-50 0 q-20 -30 -40 -10" fill="none" stroke="${CREAM}" stroke-width="5" stroke-linecap="round"/>
          </g></g></g>

          <!-- el calendario: recorre los días en "consecutivamente" y se planta en viernes -->
          <g filter="url(#c2)"><g transform="translate(300 8)"><g id="cal" opacity="0">
            ${slab(0, 0, 150, 120, 16, CREAM)}<rect x="0" y="0" width="150" height="40" rx="16" fill="${CORAL}"/><rect x="0" y="26" width="150" height="14" fill="${CORAL}"/>
            <text id="cday" x="75" y="30" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="26" fill="${SHADOW}">LUNES</text>
            <text id="chour" x="75" y="96" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="52" fill="${BG}">8:00</text>
            <g id="calring" opacity="0"><ellipse cx="75" cy="60" rx="86" ry="70" fill="none" stroke="${YELLOW}" stroke-width="8" stroke-dasharray="14 10"/></g>
          </g></g></g>

          <!-- el PDF con sus barras -->
          <g filter="url(#c2)"><g transform="translate(640 150)"><g id="pdf" opacity="0">
            ${slab(0, 0, 250, 240, 22, CREAM)}
            <g transform="translate(55 216)"><rect id="b0" x="-23" y="-66" width="46" height="66" rx="12" fill="${BLUE}"/></g>
            <g transform="translate(117 216)"><rect id="b1" x="-23" y="-126" width="46" height="126" rx="12" fill="${YELLOW}"/></g>
            <g transform="translate(179 216)"><rect id="b2" x="-23" y="-170" width="46" height="170" rx="12" fill="${CORAL}"/></g>
            <rect x="24" y="18" width="96" height="30" rx="10" fill="${CORAL}"/><text class="slbl" x="72" y="40" text-anchor="middle" font-size="20" fill="${CREAM}">PDF</text>
          </g></g></g>

          <!-- el sobre que sale volando -->
          <g filter="url(#c2)"><g transform="translate(780 102)"><g id="env" opacity="0">
            <g transform="rotate(-12)"><rect x="-80" y="-52" width="160" height="104" rx="16" fill="${SHADOW}" transform="translate(8 10)"/><rect x="-80" y="-52" width="160" height="104" rx="16" fill="${YELLOW}"/>
            <path d="M-80 -36 l80 62 l80 -62" fill="none" stroke="${SHADOW}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
            <text class="slbl" x="0" y="38" text-anchor="middle" font-size="18" fill="${SHADOW}">@contador</text></g>
            <g id="envtrail" opacity="0"><path d="M-120 8 q-20 -6 -40 6 M-130 30 q-14 8 -30 8" fill="none" stroke="${CREAM}" stroke-width="8" stroke-linecap="round" opacity=".8"/></g>
          </g></g></g>

          <!-- la receta: la tarjeta con los cuatro pasos, y el hueco de la variable -->
          <g filter="url(#c2)"><g transform="translate(20 44)"><g id="recipe" opacity="0">
            ${slab(0, 0, 250, 190, 18, CREAM)}
            <rect x="0" y="0" width="250" height="38" rx="18" fill="${GREEN}"/><rect x="0" y="22" width="250" height="16" fill="${GREEN}"/>
            <text class="fx" x="125" y="28" text-anchor="middle" font-size="24" fill="${SHADOW}">RECETA</text>
            ${recipeSteps}
            <g id="vari" opacity="0"><text class="slbl" x="36" y="180" font-size="15" fill="${MUTE}">para:</text><rect id="varbox" x="90" y="164" width="130" height="22" rx="6" fill="none" stroke="${CORAL}" stroke-width="3" stroke-dasharray="8 6"/><text class="slbl" id="vartxt" x="155" y="181" text-anchor="middle" font-size="15" fill="${SHADOW}"></text></g>
            <!-- el desvío: si esto pasa, a esto; si esto pasa, al otro -->
            <g id="branch" opacity="0">
              <path id="br1" d="M 150 156 C 210 156, 220 120, 232 128" fill="none" stroke="${CORAL}" stroke-width="5" stroke-linecap="round"/>
              <path id="br2" d="M 150 156 C 210 170, 220 196, 232 190" fill="none" stroke="${BLUE}" stroke-width="5" stroke-linecap="round"/>
              <circle cx="236" cy="128" r="9" fill="${CORAL}"/><circle cx="236" cy="190" r="9" fill="${BLUE}"/>
            </g>
          </g></g></g>

          <!-- los desvíos grandes: si esto pasa → a esto; si esto pasa → al otro -->
          <g filter="url(#c2)"><g id="signs" opacity="0">
            <g transform="translate(330 150)"><g id="sg0" opacity="0">${slab(-40, -22, 140, 44, 14, GREEN)}<text class="slbl" x="30" y="6" text-anchor="middle" font-size="18" fill="${SHADOW}">a esto</text></g></g>
            <g transform="translate(330 214)"><g id="sg1" opacity="0">${slab(-40, -22, 140, 44, 14, BLUE)}<text class="slbl" x="30" y="6" text-anchor="middle" font-size="18" fill="${CREAM}">al otro</text></g></g>
            <path id="sa0" d="M 268 170 C 280 170, 280 150, 290 150" fill="none" stroke="${GREEN}" stroke-width="7" stroke-linecap="round"/>
            <path id="sa1" d="M 268 170 C 280 170, 280 214, 290 214" fill="none" stroke="${BLUE}" stroke-width="7" stroke-linecap="round"/>
          </g></g>
          <text class="fx" id="fx7" x="560" y="470" font-size="64" fill="${CORAL}" opacity="0" transform="rotate(-9 560 470)">¡UPS!</text>

          <!-- los tres encargos que orbitan en "de todo" -->
          <g filter="url(#c2)"><g transform="translate(608 200)"><g id="orbit" opacity="0">
            <g transform="translate(-200 -40)"><g id="ob0">${slab(-30, -20, 60, 40, 10, BLUE)}<text class="slbl" x="0" y="6" text-anchor="middle" font-size="16" fill="${CREAM}">XLS</text></g></g>
            <g transform="translate(10 -172)"><g id="ob1">${slab(-30, -20, 60, 40, 10, CORAL)}<text class="slbl" x="0" y="6" text-anchor="middle" font-size="16" fill="${CREAM}">PDF</text></g></g>
            <g transform="translate(212 -20)"><g id="ob2">${slab(-30, -20, 60, 40, 10, GREEN)}<text class="slbl" x="0" y="6" text-anchor="middle" font-size="16" fill="${SHADOW}">MAIL</text></g></g>
          </g></g></g>

          <!-- onomatopeyas -->
          <text class="fx" id="fx1" x="110" y="120" font-size="64" fill="${YELLOW}" opacity="0" transform="rotate(-8 110 120)">¡ZAS!</text>
          <text class="fx" id="fx2" x="700" y="120" font-size="64" fill="${CORAL}" opacity="0" transform="rotate(7 700 120)">¡PLOP!</text>
          <text class="fx" id="fx3" x="640" y="60" font-size="58" fill="${CREAM}" opacity="0" transform="rotate(-6 640 60)">¡FIU!</text>
          <text class="fx" id="fx4" x="540" y="470" font-size="78" fill="${CORAL}" opacity="0" transform="rotate(-9 540 470)">¡CRAC!</text>
          <text class="fx" id="fx5" x="700" y="200" font-size="64" fill="${YELLOW}" opacity="0" transform="rotate(6 700 200)">¡AH!</text>
          <text class="fx" id="fx6" x="660" y="110" font-size="70" fill="${GREEN}" opacity="0" transform="rotate(-5 660 110)">¡LISTO!</text>
        </svg>
      </div>

      ${lineEls}

      <!-- portada: completa desde el cuadro 0; lo que se anima es movimiento sobre lo que ya está -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        ${board("intro")}
        <div class="mono k" id="i1" style="top:262px;font-size:26px;letter-spacing:.16em;color:${MUTE}">TALLER DE SISTEMAS AGÉNTICOS · SESIÓN 4</div>
        <div class="fred k" id="i2" style="top:318px;font-size:168px;line-height:.9;color:${CREAM};text-shadow:10px 12px 0 ${SHADOW}">CÓMO<br />COBRARLE</div>
        <div class="fred k" id="i3" style="top:640px;font-size:112px;line-height:.92;color:${BG};padding:18px 34px;background:${CORAL};border-radius:30px;box-shadow:10px 12px 0 ${SHADOW};transform:rotate(-3deg);transform-origin:left center;display:inline-block">A UNA PyME</div>
        <div class="k" id="i4" style="top:822px;font-size:66px;font-weight:900;color:${YELLOW};line-height:1.14;width:900px;text-shadow:5px 6px 0 ${SHADOW}">por un agente que trabaja<br />cada viernes, solito.</div>
        <div id="i6" style="position:absolute;right:72px;top:1010px;width:400px;height:360px;border-radius:40px;border:12px solid ${CREAM};box-shadow:10px 12px 0 ${SHADOW};overflow:hidden;transform:rotate(3deg)"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div class="mono k" id="i7" style="top:1060px;font-size:30px;line-height:1.6;color:${MUTE};width:480px">Permisos y extensiones<br />10 sep 2026<br /><span style="color:${CREAM}">Héctorbliss</span></div>
        <svg style="position:absolute;left:0;top:0;width:1080px;height:1920px" viewBox="0 0 1080 1920"><g filter="url(#clayc)"><circle id="ic0" cx="990" cy="880" r="22" fill="${GREEN}"/><circle id="ic1" cx="130" cy="1300" r="18" fill="${BLUE}"/><circle id="ic2" cx="560" cy="1330" r="14" fill="${YELLOW}"/></g></svg>
      </div>

      <!-- cierre: tema, fecha, verbo, URL y logo -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        ${board("outro")}
        <div class="k" id="o1" style="right:72px;top:262px;font-size:56px;font-weight:900;color:${YELLOW};line-height:1.2;text-shadow:5px 6px 0 ${SHADOW}">«Receta, agenda, cada viernes.<br />Si algo falla, el agente improvisa.»</div>
        <div id="o2" style="position:absolute;left:72px;width:520px;top:470px;height:16px;border-radius:8px;background:${CORAL};box-shadow:5px 6px 0 ${SHADOW};transform-origin:left center"></div>
        <div class="k" style="top:540px;right:72px">
          <div id="o3" class="mono" style="font-size:30px;letter-spacing:.2em;color:${MUTE}">TALLER EN VIVO · 6 SESIONES</div>
          <div id="o4" class="fred" style="margin-top:28px;font-size:124px;line-height:.92;color:${CREAM};text-shadow:8px 10px 0 ${SHADOW}">SISTEMAS<br />AGÉNTICOS</div>
          <div id="o5" class="mono" style="margin-top:40px;font-size:32px;line-height:1.6;color:${MUTE}">Sesión 4 · Permisos y extensiones (MCP)<br />Las sesiones se graban. Entras a la edición en curso.</div>
          <div id="o6" class="fred" style="margin-top:56px;display:inline-block;padding:28px 40px;background:${GREEN};color:${BG};font-size:40px;border-radius:22px;box-shadow:8px 10px 0 ${SHADOW}">Regístrate en fixtergeek.com/sistemas-agenticos</div>
        </div>
        <img id="logo" src="assets/logo.png" style="position:absolute;left:72px;top:1270px;height:96px" />
      </div>

      <div id="wipe"><svg viewBox="0 0 1080 1920"><defs>${CLAY("clayw", 11)}</defs><g filter="url(#clayw)">${blobs}</g></svg></div>
      <div id="wipeprint"></div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const CREAM = "${CREAM}", CORAL = "${CORAL}", YELLOW = "${YELLOW}", GREEN = "${GREEN}", BLUE = "${BLUE}", MUTE = "${MUTE}", SHADOW = "${SHADOW}", BG = "${BG}";
      const STEP = "steps(6)";   // stop-motion: los desplazamientos van a saltos, como si fueran a 12 cuadros
      const REP = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);

      // ---- fondo vivo: las huellas se deslizan despacio y las migas respiran
      tl.to(".board", { x: -40, y: 30, duration: 14, ease: "none", yoyo: true, repeat: REP(14) }, 0);
      tl.to(".crumb", { scale: 1.25, transformOrigin: "50% 50%", duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: REP(1.3), stagger: .17 }, 0);

      // ---- portada: ya está completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 16, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { rotate: -1, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i6", { rotate: 1, y: -10, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i4", { y: -8, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to(["#ic0", "#ic1", "#ic2"], { scale: 1.3, transformOrigin: "50% 50%", duration: .8, yoyo: true, repeat: 4, ease: "sine.inOut", stagger: .2 }, 0);

      // ---- cortinilla: las bolas se aplastan contra el cristal en cascada, tapan, y se despegan dejando la huella
      tl.set(".blob", { scale: 0, transformOrigin: "50% 50%" }, 0);
      const wipe = (t) => {
        tl.to(".blob", { scale: 1, duration: .5, stagger: .07, ease: "power3.in" }, t);
        tl.to("#wipeprint", { opacity: 1, duration: .1 }, t + .5 + .07 * 7);
        tl.to("#wipeprint", { opacity: 0, duration: .3 }, t + .62 + .07 * 7);
        tl.to(".blob", { scale: 0, duration: .46, stagger: { each: .07, from: "end" }, ease: "power3.out" }, t + .58 + .07 * 7);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [4.45, 9.28, 20.88, 22.57, 33.83, 56.67, 61.0].forEach(punch);

      // ---- cartel: un estado cada 7-9 s; se aplasta y rebota como plastilina al cambiar
      const sign = (t, html) => {
        tl.to("#signin", { scaleY: .7, scaleX: 1.08, duration: .16, ease: "power2.in" }, BO + t - .16);
        tl.to("#signin", { innerHTML: html, duration: .01 }, BO + t);
        tl.to("#signin", { scaleY: 1, scaleX: 1, duration: .5, ease: "elastic.out(1,.5)" }, BO + t);
      };
      sign(9.28, "EL TRABAJO<br /><em>DE SIEMPRE</em>");
      sign(20.88, "RECETA<br />+ <em>AGENDA</em>");
      sign(29.22, "DE n8n A<br /><em>UN AGENTE</em>");
      sign(38.73, "TRABAJITOS<br /><em>EN ORDEN</em>");
      sign(46.63, "Y SI ALGO<br /><em>FALLA…</em>");
      sign(55.52, "EL WORKFLOW<br /><em>SE ROMPE</em>");
      sign(61.0, "EL AGENTE<br /><em>IMPROVISA</em>");

      // ---- escenario: tiempo del clip + 0.3, sumado a BO
      const at = (t) => BO + t + .3;
      const fx = (id, t, rot) => {
        tl.to(id, { opacity: 1, duration: .01 }, at(t))
          .from(id, { scale: .3, transformOrigin: "50% 50%", duration: .4, ease: "back.out(3)", immediateRender: false }, at(t))
          .to(id, { rotation: rot, transformOrigin: "50% 50%", duration: 1.1, ease: "sine.inOut" }, at(t) + .1)
          .to(id, { opacity: 0, duration: .25 }, at(t) + 1.2);
      };
      const pop = (id, t, o = "50% 50%") => {
        tl.to(id, { opacity: 1, duration: .01 }, at(t))
          .from(id, { scale: .4, transformOrigin: o, duration: .5, ease: "back.out(2.2)", immediateRender: false }, at(t));
      };

      // Ghosty respira a saltos
      tl.to("#ghost", { y: -6, duration: .5, ease: STEP, yoyo: true, repeat: Math.max(0, Math.floor(BODY / .5) - 1) }, BO);

      // 0.45 "se lo puedes vender": cuelga la etiqueta de precio y Ghosty se pavonea
      pop("#tag", 4.15);
      tl.to("#tag", { rotation: -8, transformOrigin: "-50px 0px", duration: .9, ease: "sine.inOut", yoyo: true, repeat: 5 }, at(4.4));
      tl.to("#ghost", { rotation: -6, transformOrigin: "50% 90%", duration: .6, ease: "sine.inOut", yoyo: true, repeat: 3 }, at(1.35));
      tl.to("#tag", { opacity: 0, duration: .3 }, at(8.6));

      // 6.94 "algo que ellos hacen consecutivamente": el calendario recorre la semana
      pop("#cal", 6.94);
      ["MARTES", "MIÉRC.", "JUEVES", "VIERNES", "LUNES", "MARTES", "MIÉRC."].forEach((d, i) => tl.to("#cday", { textContent: d, duration: .01 }, at(7.62) + i * .16));

      // 8.98 "baja los cuatro archivos del Drive": la carpeta entra por la izquierda y las hojas vuelan a Ghosty
      tl.to("#folder", { opacity: 1, duration: .01 }, at(8.98))
        .from("#folder", { x: -420, duration: .6, ease: STEP, immediateRender: false }, at(8.98));
      fx("#fx1", 9.34, -4);
      [0, 1, 2, 3].forEach((i) => {
        const t0 = 9.61 + i * .28;
        tl.to("#sh" + i, { x: 300 - [89, 139, 189, 235][i], y: 150 - [204, 192, 194, 208][i], rotation: 0, duration: .55, ease: STEP }, at(t0));
        tl.to("#sh" + i, { scale: .2, opacity: 0, transformOrigin: "50% 50%", duration: .2 }, at(t0) + .55);
      });
      // 11.79 "analiza las ventas": Ghosty se lo piensa (boca) y saca la hoja de totales
      pop("#sheet", 12.0, "50% 100%");
      tl.to("#ghost", { rotation: 3, transformOrigin: "50% 90%", duration: .4, ease: "sine.inOut", yoyo: true, repeat: 3 }, at(11.79));
      // 14.32 "saca los totales": el número sube a saltos
      [4200, 12800, 27500, 39100, 48300].forEach((n, i) => tl.to("#tot", { textContent: "$ " + n.toLocaleString("en-US"), duration: .01 }, at(14.32) + i * .14));
      tl.to("#sheet", { scale: 1.12, transformOrigin: "50% 100%", duration: .18, yoyo: true, repeat: 1, ease: "power2.out" }, at(14.95));
      // 15.77 "genera un PDF con gráficas": el PDF cae y las barras crecen
      pop("#pdf", 15.77, "50% 100%");
      fx("#fx2", 15.9, 5);
      tl.set(["#b0", "#b1", "#b2"], { scaleY: 0, transformOrigin: "50% 100%" }, 0);
      tl.to("#b0", { scaleY: 1, duration: .35, ease: STEP }, at(17.04));
      tl.to("#b1", { scaleY: 1, duration: .35, ease: STEP }, at(17.24));
      tl.to("#b2", { scaleY: 1, duration: .35, ease: STEP }, at(17.44));
      // 17.86 "entrégala en tal correo": el sobre sale volando hacia arriba a la derecha
      pop("#env", 17.86);
      tl.to("#envtrail", { opacity: 1, duration: .1 }, at(18.4));
      tl.to("#env", { x: 260, y: -190, duration: .9, ease: STEP }, at(18.5));
      tl.to("#env", { opacity: 0, duration: .15 }, at(19.3));
      fx("#fx3", 18.55, -3);

      // 20.58 "receta": la tarjeta aparece con los cuatro pasos; 21.40 "agenda" el calendario; 22.27 "cada viernes"
      tl.to("#folder", { x: -420, duration: .5, ease: STEP }, at(20.3));
      pop("#recipe", 20.58, "0% 0%");
      [0, 1, 2, 3].forEach((i) => pop("#st" + i, 20.75 + i * .12, "0% 50%"));
      tl.to("#cal", { scale: 1.15, transformOrigin: "50% 50%", duration: .25, yoyo: true, repeat: 1, ease: "power2.out" }, at(21.40));
      tl.to("#cday", { textContent: "VIERNES", duration: .01 }, at(22.27));
      pop("#calring", 22.63);
      tl.to("#calring", { rotation: 360, transformOrigin: "50% 50%", duration: 6, ease: "none" }, at(22.63));
      // 23.86 "variable": el hueco; 27.36 "del contador": se llena
      pop("#vari", 23.86, "0% 50%");
      tl.to("#varbox", { opacity: .3, duration: .3, yoyo: true, repeat: 5, ease: "none" }, at(24.2));
      tl.to("#vartxt", { textContent: "contador@", duration: .01 }, at(27.36));
      tl.to("#varbox", { opacity: 1, stroke: GREEN, attr: { "stroke-dasharray": "0 0" }, duration: .2 }, at(27.36));

      // 28.62 "pasas de construir pipelines, workflows de n8n": la tubería aparece y tiembla en "n8n"
      tl.to("#sheet", { opacity: 0, duration: .3 }, at(28.6));
      tl.to("#pdf", { opacity: 0, duration: .3 }, at(28.6));
      tl.to("#calring", { opacity: 0, duration: .3 }, at(28.6));
      tl.to("#pipe", { opacity: 1, duration: .01 }, at(30.10))
        .from("#pipe", { y: 120, duration: .5, ease: STEP, immediateRender: false }, at(30.10));
      tl.to("#pipelbl", { textContent: "n8n", duration: .01 }, at(32.97));
      tl.to("#pipe", { x: 6, duration: .06, yoyo: true, repeat: 7 }, at(32.97));
      // 33.53 "a trabajar con un agente que es general": Ghosty se estira y toma el centro
      tl.to("#ghost", { scale: 1.18, x: 140, transformOrigin: "50% 100%", duration: .5, ease: "elastic.out(1,.5)" }, at(33.53));
      // 36.74 "le puedes pedir de todo": los encargos orbitan alrededor (el calendario ya cumplió)
      tl.to("#cal", { opacity: 0, duration: .3 }, at(36.3));
      pop("#orbit", 36.74);
      ["#ob0", "#ob1", "#ob2"].forEach((id, i) => tl.to(id, { y: -14, rotation: i % 2 ? 6 : -6, transformOrigin: "50% 50%", duration: .5, ease: STEP, yoyo: true, repeat: 8 }, at(36.9 + i * .15)));
      tl.to("#orbit", { opacity: 0, duration: .3 }, at(41.4));
      // 38.43 "le enseñas a hacer ciertos trabajitos en orden": los pasos se marcan 1-2-3-4
      [0, 1, 2, 3].forEach((i) => {
        tl.to("#stc" + i, { fill: YELLOW, scale: 1.4, transformOrigin: "50% 50%", duration: .18, yoyo: true, repeat: 1 }, at(39.82 + i * .4));
      });
      // 42.90 "que además improvisa": la idea
      fx("#fx5", 43.14, 6);
      tl.to("#ghost", { rotation: -8, transformOrigin: "50% 90%", duration: .25, yoyo: true, repeat: 1 }, at(43.14));
      // 44.63 "ejecuta la receta": Ghosty vuelve a sacar el PDF y los pasos se marcan; 46.79 "falla": el PDF se le cae de la mesa
      tl.set("#pdf", { scale: .7, transformOrigin: "50% 100%" }, at(44.0));
      tl.to("#pdf", { opacity: 1, x: 60, y: 30, duration: .4, ease: "back.out(2)" }, at(44.63));
      [0, 1, 2].forEach((i) => tl.to("#stc" + i, { fill: YELLOW, duration: .15 }, at(44.63 + i * .35)));
      tl.to("#stc2", { fill: CORAL, duration: .15 }, at(46.79));
      tl.to("#st2", { x: 4, duration: .06, yoyo: true, repeat: 7 }, at(46.79));
      tl.to("#pdf", { rotation: 40, x: 120, y: 260, duration: .55, ease: STEP }, at(46.79));   // se cae por delante de la mesa
      tl.to("#pdf", { opacity: 0, duration: .15 }, at(47.4));
      fx("#fx7", 46.9, -4);
      pop("#sweat", 46.79);
      tl.to("#sweat", { y: 30, opacity: 0, duration: .8, ease: STEP }, at(47.6));
      tl.to("#ghost", { x: 110, duration: .12, yoyo: true, repeat: 5, ease: STEP }, at(46.79));   // Ghosty se sacude
      // 48.24 "la misma receta puede decirle": la receta crece hacia el centro y se sacude
      tl.to("#recipe", { scale: 1.22, transformOrigin: "0% 0%", duration: .45, ease: "back.out(1.8)" }, at(48.24));
      tl.to("#recipe", { rotation: 2, transformOrigin: "0% 0%", duration: .18, yoyo: true, repeat: 5, ease: STEP }, at(48.78));
      tl.to("#recipe", { scale: 1, rotation: 0, transformOrigin: "0% 0%", duration: .4, ease: "power2.inOut" }, at(50.2));
      // 50.58 "si esto pasa a esto" / 51.54 "al otro": dos letreros con su flecha
      tl.set(["#sa0", "#sa1"], { strokeDasharray: 200, strokeDashoffset: 200 }, 0);
      tl.to("#signs", { opacity: 1, duration: .01 }, at(50.5));
      tl.to("#sa0", { strokeDashoffset: 0, duration: .4, ease: STEP }, at(50.58));
      pop("#sg0", 50.9, "0% 50%");
      tl.to("#sa1", { strokeDashoffset: 0, duration: .4, ease: STEP }, at(51.54));
      pop("#sg1", 51.9, "0% 50%");
      tl.to(["#sg0", "#sg1"], { y: -6, duration: .4, ease: STEP, yoyo: true, repeat: 5 }, at(52.4));
      tl.to("#signs", { opacity: 0, duration: .3 }, at(55.2));
      // 53.08 "el agente improvisa y es mucho más útil que un workflow": Ghosty vs tubería
      tl.to("#pipe", { scale: 1.12, transformOrigin: "50% 100%", duration: .3, ease: "back.out(2)" }, at(55.48));
      // 56.37 "pum, falló, se rompe": el tubo de en medio truena, los nodos ruedan
      fx("#fx4", 56.37, -12);
      tl.to("#pipeB", { rotation: 40, x: -16, y: 42, transformOrigin: "50% 50%", duration: .35, ease: STEP }, at(56.60));
      tl.to("#pn1", { y: 46, rotation: -30, transformOrigin: "50% 50%", duration: .4, ease: STEP }, at(56.60));
      tl.to("#pn2", { y: 26, x: 24, rotation: 40, transformOrigin: "50% 50%", duration: .4, ease: STEP }, at(56.60));
      tl.to("#pipeA", { rotation: -14, transformOrigin: "0% 100%", duration: .35, ease: STEP }, at(57.03));
      tl.to("#pipeC", { rotation: 14, transformOrigin: "100% 0%", duration: .35, ease: STEP }, at(57.03));
      tl.to("#pipelbl", { textContent: "SE QUEDÓ", fill: CORAL, duration: .01 }, at(58.32));
      // 58.69 "necesita intervención humana": baja la mano
      tl.to("#handg", { opacity: 1, duration: .01 }, at(58.69));
      tl.set("#hand", { y: 260 }, 0);
      tl.to("#hand", { y: 0, duration: .6, ease: STEP }, at(58.69));
      tl.to("#qmark", { opacity: 1, duration: .01 }, at(59.2)).from("#qmark", { scale: .3, transformOrigin: "50% 50%", duration: .4, ease: "back.out(3)", immediateRender: false }, at(59.2));
      tl.to(["#armL", "#armR"], { rotation: -10, transformOrigin: "50% 100%", duration: .28, yoyo: true, repeat: 5, ease: STEP }, at(59.3));
      // 60.70 "un agente no, un agente puede improvisar": Ghosty salta por encima y aterriza
      tl.to("#hand", { y: 260, duration: .4, ease: STEP }, at(60.7));
      tl.to("#handg", { opacity: 0, duration: .1 }, at(61.1));
      tl.to("#ghost", { y: -120, duration: .32, ease: "power2.out" }, at(61.18))
        .to("#ghost", { y: 0, duration: .32, ease: "power2.in" }, at(61.18) + .32)
        .to("#ghost", { scaleY: .82, scaleX: 1.16, transformOrigin: "50% 100%", duration: .12 }, at(61.18) + .64)
        .to("#ghost", { scaleY: 1.18, scaleX: 1.18, duration: .5, ease: "elastic.out(1,.45)" }, at(61.18) + .76);
      fx("#fx6", 62.45, 4);

      // ---- karaoke: la línea entra y la palabra en curso se realza por peso y color
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const t = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .22, ease: "power3.out" }, t);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: MUTE, fontWeight: 500 }, t - .01)
            .set("#" + w.id, { color: YELLOW, fontWeight: 900 }, BO + w.s)
            .set("#" + w.id, { color: CREAM, fontWeight: 900 }, BO + w.e);
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
      tl.to("#o6", { rotate: -1.5, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 3 }, OUT_IN + 1.8);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s");
