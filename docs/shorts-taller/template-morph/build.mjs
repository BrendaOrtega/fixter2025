import fs from "node:fs";
import lines from "./build-lines.mjs";

// ---- constantes (declararlas ANTES de cualquier uso: un TDZ mata la timeline en silencio)
const BO = 4.4;            // el cuerpo arranca aquí
const BODY = 55.8;         // duración del clip
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 67.15;

const BG = "#0E1317";
const MINT = "#85DDCB";
const GREEN = "#8DCF6E";
const AMBER = "#F2B441";
const INK = "#F2F5F4";
const MUTE = "#7C8A8E";
const PANEL = "#141B20";
const LINE = "#243036";

// escenario: caricatura plana, 936 × 620, coordenadas absolutas
const MX = 468;            // eje del personaje
const MOUTH_Y = 385;       // la línea de la boca: hasta ahí se ve caer el archivo

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// karaoke: una línea a la vez; la palabra en curso se realza por PESO, no por escala
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// malla de puntos del fondo (determinista, nunca negro plano)
const dots = (() => {
  let s = "";
  for (let y = 0; y < 2000; y += 80) for (let x = 0; x < 1160; x += 80) s += `<circle cx="${x}" cy="${y}" r="3" />`;
  return s;
})();

// renglones de texto de un archivo
const paper = (x, y, w, n, gap) => {
  let s = "";
  for (let i = 0; i < n; i++) s += `<rect x="${x + 14}" y="${y + 18 + i * gap}" width="${i % 3 === 2 ? w - 46 : w - 28}" height="6" rx="3" fill="${MUTE}" opacity=".6" />`;
  return s;
};

// monedas de token que salen volando
const toks = Array.from({ length: 20 }, (_, i) =>
  `<g class="tok" id="tk${i}" opacity="0"><circle cx="0" cy="0" r="36" fill="${AMBER}" stroke="${BG}" stroke-width="6" /><text x="0" y="13" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="38" fill="${BG}">T</text></g>`
).join("");

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,800&family=Archivo:wght@400;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Archivo", system-ui; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "JetBrains Mono", monospace; }
      .serif { font-family: "Instrument Serif", serif; font-style: italic; }
      .disp { font-family: "Bricolage Grotesque", "Archivo", system-ui; font-weight: 800; letter-spacing: -.035em; }

      #dots { position: absolute; left: -80px; top: -80px; width: 1160px; height: 2000px; fill: ${MINT}; opacity: .14; }
      #grain { position: absolute; inset: -40px; z-index: 80; pointer-events: none; opacity: .18;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.6'/></svg>"); }

      /* cabecera: avatar en video + nombre + reloj */
      #av { position: absolute; left: 72px; top: 84px; width: 132px; height: 132px; border-radius: 50%; overflow: hidden;
        border: 6px solid ${GREEN}; background: ${PANEL}; z-index: 30; }
      #av video { width: 100%; height: 100%; object-fit: cover; display: block; }
      #who { position: absolute; left: 232px; top: 100px; z-index: 30; }
      #who b { display: block; font-size: 42px; font-weight: 800; letter-spacing: -.02em; color: ${INK}; }
      #who span { display: block; margin-top: 8px; font-family: "JetBrains Mono"; font-size: 26px; letter-spacing: .16em; color: ${MUTE}; }
      #clock { position: absolute; right: 72px; top: 116px; z-index: 30; font-family: "JetBrains Mono"; font-weight: 700; font-size: 30px;
        letter-spacing: .14em; color: ${MUTE}; border: 3px solid ${LINE}; border-radius: 999px; padding: 14px 24px; }
      #live { display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: ${GREEN}; margin-right: 12px; vertical-align: middle; }

      /* cartel: un estado cada 5-9 s, con subrayado pintado */
      #sign { position: absolute; left: 72px; right: 72px; top: 286px; height: 300px; z-index: 30; }
      #signin { font-family: "Bricolage Grotesque", system-ui; font-weight: 800; font-size: 124px; line-height: .92; letter-spacing: -.045em; color: ${INK}; }
      #signin em { font-style: normal; color: ${MINT}; }
      #signbar { position: absolute; left: 0; top: 258px; width: 420px; height: 16px; background: ${GREEN}; transform-origin: left center; }

      /* escenario: caricatura plana, cero gradientes */
      #stage { position: absolute; left: 72px; top: 636px; width: 936px; height: 620px; z-index: 20; }
      #stage svg { width: 936px; height: 620px; overflow: hidden; }
      .slbl { font-family: "JetBrains Mono", monospace; font-weight: 700; letter-spacing: .16em; }
      .fx { font-family: "Bricolage Grotesque", system-ui; font-weight: 800; letter-spacing: -.03em; }

      /* karaoke: una línea, centrada; la palabra en curso se realza por peso */
      .cap { inset: auto; left: 60px; right: 60px; top: 1370px; height: 250px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 72px; line-height: 1.12; letter-spacing: -.02em; }
      .w { display: inline-block; color: ${MUTE}; font-weight: 400; }

      /* pie */
      #foot { position: absolute; left: 72px; right: 72px; bottom: 132px; z-index: 30; display: flex; align-items: center; justify-content: space-between; }
      #foot .tag { font-family: "JetBrains Mono"; font-weight: 700; font-size: 30px; letter-spacing: .2em; color: ${MINT}; }
      #foot .cta { font-family: "JetBrains Mono"; font-weight: 700; font-size: 30px; letter-spacing: .06em; color: ${BG}; background: ${GREEN}; padding: 18px 30px; border-radius: 14px; }

      /* persianas */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      #wipe i { position: absolute; left: 0; width: 1080px; height: 242px; background: ${GREEN}; transform: scaleX(0); transform-origin: left center; }
      #wipe i:nth-child(even) { background: ${MINT}; }
      #wipe i:nth-child(1) { top: 0 } #wipe i:nth-child(2) { top: 240px } #wipe i:nth-child(3) { top: 480px } #wipe i:nth-child(4) { top: 720px }
      #wipe i:nth-child(5) { top: 960px } #wipe i:nth-child(6) { top: 1200px } #wipe i:nth-child(7) { top: 1440px } #wipe i:nth-child(8) { top: 1680px }

      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <svg id="dots" viewBox="0 0 1160 2000">${dots}</svg>

      <div id="av"><video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video></div>
      <div id="who"><b>Héctorbliss</b><span>SISTEMAS AGÉNTICOS</span></div>
      <div id="clock"><i id="live"></i>SESIÓN 3</div>

      <div id="sign"><div id="signin">UN ARCHIVO<br /><em>GIGANTE</em></div><div id="signbar"></div></div>

      <div id="stage">
        <svg viewBox="0 0 936 620">
          <defs>
            <!-- lo que pasa de la boca ya no se ve: así el archivo "entra" -->
            <clipPath id="cut"><rect x="0" y="-400" width="936" height="${MOUTH_Y + 6 + 400}" /></clipPath>
          </defs>

          <!-- la flecha de regreso: de la panza, por la izquierda, otra vez arriba -->
          <g id="loopg" opacity="0">
            <path id="loopline" d="M 214 532 C 96 532, 90 150, 300 118" fill="none" stroke="${AMBER}" stroke-width="12" stroke-linecap="round" stroke-dasharray="42 26" />
            <path id="loophead" d="M 272 92 L 320 118 L 272 144 Z" fill="${AMBER}" />
            <text class="slbl" x="104" y="330" text-anchor="middle" font-size="24" fill="${AMBER}" transform="rotate(-90 104 330)">OTRA VEZ</text>
          </g>

          <g id="tokg">${toks}</g>

          <!-- el agente -->
          <g id="charg">
            <rect id="ear0" x="288" y="286" width="34" height="86" rx="17" fill="${PANEL}" stroke="${MINT}" stroke-width="8" />
            <rect id="ear1" x="614" y="286" width="34" height="86" rx="17" fill="${PANEL}" stroke="${MINT}" stroke-width="8" />
            <rect id="head" x="318" y="200" width="300" height="285" rx="48" fill="${PANEL}" stroke="${MINT}" stroke-width="10" />
            <g id="eyew0"><g id="eye0"><circle cx="388" cy="315" r="32" fill="${INK}" /><circle id="pup0" cx="388" cy="315" r="14" fill="${BG}" /><circle cx="397" cy="304" r="6" fill="${INK}" /></g></g>
            <g id="eyew1"><g id="eye1"><circle cx="548" cy="315" r="32" fill="${INK}" /><circle id="pup1" cx="548" cy="315" r="14" fill="${BG}" /><circle cx="557" cy="304" r="6" fill="${INK}" /></g></g>
            <rect id="brow0" x="354" y="252" width="68" height="13" rx="6" fill="${MINT}" />
            <rect id="brow1" x="514" y="252" width="68" height="13" rx="6" fill="${MINT}" />
            <g id="xeyes" opacity="0" stroke="${AMBER}" stroke-width="9" stroke-linecap="round">
              <g id="xe0"><path d="M368 295 L408 335 M408 295 L368 335" /></g>
              <g id="xe1"><path d="M528 295 L568 335 M568 295 L528 335" /></g>
            </g>
            <rect id="mouth" x="413" y="${MOUTH_Y}" width="110" height="80" rx="24" fill="${BG}" stroke="${MINT}" stroke-width="8" />
          </g>

          <!-- el recordatorio que sobrevive al compact -->
          <g id="noteg" opacity="0">
            <rect x="262" y="170" width="176" height="60" rx="8" fill="${AMBER}" transform="rotate(-9 350 200)" />
            <text class="slbl" x="350" y="207" text-anchor="middle" font-size="16" fill="${BG}" transform="rotate(-9 350 200)">leer informe.md</text>
          </g>

          <!-- el archivo, cayendo por el canal entre los ojos -->
          <g clip-path="url(#cut)">
            <g id="fileg">
              <g id="tail"><rect x="436" y="-330" width="64" height="346" fill="${BG}" stroke="${MINT}" stroke-width="6" />${paper(436, -330, 64, 17, 19)}</g>
              <rect x="428" y="6" width="80" height="146" rx="10" fill="${BG}" stroke="${MINT}" stroke-width="6" />
              ${paper(428, 46, 80, 5, 18)}
              <rect x="436" y="14" width="64" height="32" rx="8" fill="${MINT}" />
              <text class="slbl" x="468" y="36" text-anchor="middle" font-size="15" fill="${BG}">informe.md</text>
            </g>
          </g>

          <!-- la panza: cuánto contexto queda -->
          <g id="barg">
            <rect x="214" y="509" width="508" height="46" rx="23" fill="${BG}" stroke="${LINE}" stroke-width="6" />
            <rect id="fill" x="220" y="515" width="496" height="34" rx="17" fill="${MINT}" />
            <text id="barlbl" class="slbl" x="468" y="592" text-anchor="middle" font-size="24" fill="${MUTE}">CONTEXTO</text>
            <g id="spill" opacity="0">
              <rect x="150" y="470" width="52" height="66" rx="6" fill="${BG}" stroke="${AMBER}" stroke-width="5" transform="rotate(-24 176 503)" />
              <rect x="734" y="470" width="52" height="66" rx="6" fill="${BG}" stroke="${AMBER}" stroke-width="5" transform="rotate(20 760 503)" />
            </g>
          </g>


          <!-- lo que dice cuando ya no se acuerda -->
          <g id="bubbleg" opacity="0">
            <path d="M 626 176 L 590 236 L 660 226 Z" fill="${INK}" />
            <rect x="620" y="140" width="300" height="112" rx="26" fill="${INK}" />
            <text id="bubtxt" class="slbl" x="770" y="205" text-anchor="middle" font-size="22" fill="${BG}">¿en qué me quedé?</text>
          </g>

          <!-- los que hacen fila -->
          <g id="queueg" opacity="0">
            <g id="q0"><rect x="486" y="92" width="110" height="105" rx="12" fill="${BG}" stroke="${MINT}" stroke-width="6" /><text class="slbl" x="541" y="152" text-anchor="middle" font-size="26" fill="${MINT}">.md</text></g>
            <g id="q1"><rect x="632" y="92" width="110" height="105" rx="12" fill="${BG}" stroke="${GREEN}" stroke-width="6" /><text class="slbl" x="687" y="152" text-anchor="middle" font-size="26" fill="${GREEN}">PDF</text></g>
            <g id="q2"><rect x="778" y="92" width="110" height="105" rx="12" fill="${BG}" stroke="${AMBER}" stroke-width="6" /><text class="slbl" x="833" y="152" text-anchor="middle" font-size="19" fill="${AMBER}">gigante</text></g>
          </g>

          <!-- onomatopeyas -->
          <text class="fx" id="fx1" x="128" y="300" font-size="76" fill="${GREEN}" opacity="0" transform="rotate(-8 128 300)">¡GLUP!</text>
          <text class="fx" id="fx2" x="660" y="286" font-size="86" fill="${AMBER}" opacity="0" transform="rotate(7 660 286)">¡AGH!</text>
          <text class="fx" id="fx3" x="668" y="452" font-size="72" fill="${MINT}" opacity="0" transform="rotate(-5 668 452)">PUF</text>
          <text class="fx" id="fx4" x="624" y="132" font-size="60" fill="${GREEN}" opacity="0" transform="rotate(-6 624 132)">¡OTRA VEZ!</text>
        </svg>
      </div>

      ${lineEls}

      <div id="foot">
        <div class="tag">FIXTERGEEK</div>
        <div class="cta">Regístrate en fixtergeek.com</div>
      </div>

      <!-- portada: completa desde el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <svg style="position:absolute;left:-80px;top:-80px;width:1160px;height:2000px;fill:${MINT};opacity:.14" viewBox="0 0 1160 2000">${dots}</svg>
        <div class="serif k" id="i1" style="top:286px;font-size:82px;color:${MINT};line-height:1">El bucle que quema tokens:</div>
        <div class="disp k" id="i2" style="top:382px;font-size:172px;line-height:.9;color:${INK}">SE COME</div>
        <div class="disp k" id="i5" style="top:562px;font-size:112px;line-height:.92;color:${GREEN};padding:16px 30px;border:12px solid ${GREEN};border-radius:26px;transform:rotate(-4deg);transform-origin:left center;display:inline-block">EL ARCHIVO</div>
        <div class="serif k" id="i4" style="top:826px;font-size:70px;color:${MUTE};line-height:1.16;width:900px">Compacta, se le olvida,<br />y se lo vuelve a comer.</div>
        <div id="i3" style="position:absolute;left:64px;top:1046px;width:520px;height:16px;background:${GREEN};transform:rotate(-3deg);transform-origin:left center"></div>
        <div id="i6" style="position:absolute;right:72px;top:1180px;width:420px;height:392px;border-radius:36px;border:6px solid ${MINT};overflow:hidden;transform:rotate(3deg)"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div class="mono k" id="i7" style="top:1260px;font-size:34px;line-height:1.55;color:${MUTE};width:480px">Taller de sistemas agénticos<br />Sesión 3 · 8 sep 2026<br /><span style="color:${INK}">Héctorbliss</span></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <svg style="position:absolute;left:-80px;top:-80px;width:1160px;height:2000px;fill:${MINT};opacity:.14" viewBox="0 0 1160 2000">${dots}</svg>
        <div class="serif k" id="o1" style="right:72px;top:296px;font-size:62px;color:${MINT};line-height:1.18">«Se lo va a tragar todo, se va a atragantar,<br />entra el compact… y se lo vuelve a comer.»</div>
        <div id="o2" style="position:absolute;left:72px;right:72px;top:560px;height:3px;background:${LINE};transform-origin:left center"></div>
        <div class="k" style="top:640px;right:72px">
          <div id="o3" class="mono" style="font-size:34px;letter-spacing:.2em;color:${MUTE}">TALLER EN VIVO · 6 SESIONES</div>
          <div id="o4" class="disp" style="margin-top:34px;font-size:120px;line-height:.94;color:${INK}">SISTEMAS<br />AGÉNTICOS</div>
          <div id="o5" class="mono" style="margin-top:44px;font-size:36px;line-height:1.55;color:${MUTE}">Las sesiones se graban.<br />Entras a la edición en curso.</div>
          <div id="o6" class="mono" style="margin-top:76px;display:inline-block;padding:30px 48px;background:${GREEN};color:${BG};font-weight:700;font-size:44px;border-radius:16px">Regístrate en fixtergeek.com</div>
        </div>
        <div class="mono k" style="bottom:170px;font-size:32px;letter-spacing:.18em;color:${MINT}">FIXTERGEEK</div>
      </div>

      <div id="wipe"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div id="grain"></div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const BO = ${BO}, BODY = ${BODY}, TOTAL = ${TOTAL}, OUT_IN = ${OUT_IN};
      const MINT = "${MINT}", GREEN = "${GREEN}", AMBER = "${AMBER}", INK = "${INK}", MUTE = "${MUTE}", LINE = "${LINE}", BG = "${BG}";

      // ---- fondo vivo
      tl.to("#dots", { x: 80, y: 80, duration: 12, ease: "none", repeat: Math.max(0, Math.floor(TOTAL / 12) - 1) }, 0);
      tl.to("#loopline", { strokeDashoffset: -136, duration: 1.6, ease: "none", repeat: Math.max(0, Math.floor(TOTAL / 1.6) - 1) }, 0);
      tl.to("#loophead", { scale: 1.22, svgOrigin: "300 118", duration: .55, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(TOTAL / .55) - 1) }, 0);
      tl.to("#live", { opacity: .25, duration: .6, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(TOTAL / .6) - 1) }, 0);

      // ---- portada: ya está completa en el cuadro 0; lo que pasa es movimiento
      tl.to("#i2", { x: 18, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i5", { rotate: -2, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { scaleX: 1.35, duration: 2.2, ease: "power2.inOut" }, .3);
      tl.to("#i6", { rotate: 1, y: -10, duration: 2.6, ease: "sine.inOut" }, 0);

      // ---- persianas
      const wipe = (t) => {
        tl.to("#wipe i", { scaleX: 1, duration: .46, stagger: .07, ease: "power3.in" }, t);
        tl.set("#wipe i", { transformOrigin: "right center" }, t + .46 + .07 * 7 + .06);
        tl.to("#wipe i", { scaleX: 0, duration: .46, stagger: .07, ease: "power3.out" }, t + .48 + .07 * 7 + .06);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cabecera
      tl.to("#av", { scale: 1.03, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor(BODY / 3.4) - 1) }, BO);
      const punch = (t) => tl.to("#av", { scale: 1.12, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [6.1, 10.41, 20.27, 28.78, 49.13].forEach(punch);

      // ---- cartel: un estado cada 5-9 s, con el subrayado que se vuelve a pintar
      const sign = (t, html) => {
        tl.to("#signin", { y: -26, opacity: 0, duration: .22, ease: "power2.in" }, BO + t)
          .to("#signbar", { scaleX: 0, duration: .18, ease: "power2.in" }, BO + t)
          .set("#signin", { innerHTML: html }, BO + t + .23)
          .fromTo("#signin", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .34, ease: "back.out(1.5)", immediateRender: false }, BO + t + .24)
          .to("#signbar", { scaleX: 1, duration: .3, ease: "power3.out" }, BO + t + .36);
      };
      sign(6.10, "SE LO TRAGA<br /><em>TODO</em>");
      sign(10.41, "SE<br /><em>ATRAGANTA</em>");
      sign(20.27, "ENTRA EL<br /><em>COMPACT</em>");
      sign(26.79, "Y SE LO VUELVE<br /><em>A COMER</em>");
      sign(35.92, "TOKENS<br /><em>QUEMADOS</em>");
      sign(43.90, "«¿EN QUÉ<br /><em>ME QUEDÉ?»</em>");
      sign(49.13, "EL BUCLE<br /><em>MÁS COMÚN</em>");

      // ---- el agente: estado inicial, todo absoluto
      const ARRIBA = 0, ATORADO = 264, FUERA = -470;   // dónde vive el archivo
      tl.set("#fileg", { y: ARRIBA, x: 0, opacity: 1 }, 0);
      tl.set("#fill", { transformOrigin: "left center", svgOrigin: "220 532", scaleX: .12 }, 0);
      tl.set("#mouth", { svgOrigin: "468 385", scaleY: .16 }, 0);
      tl.set("#head", { svgOrigin: "468 485" }, 0);
      tl.set("#charg", { svgOrigin: "468 485" }, 0);
      tl.set("#eye0", { svgOrigin: "388 315" }, 0);
      tl.set("#eye1", { svgOrigin: "548 315" }, 0);
      tl.set("#eyew0", { svgOrigin: "388 315" }, 0);
      tl.set("#eyew1", { svgOrigin: "548 315" }, 0);
      tl.set("#xe0", { svgOrigin: "388 315" }, 0);
      tl.set("#xe1", { svgOrigin: "548 315" }, 0);
      tl.set("#brow0", { svgOrigin: "388 258" }, 0);
      tl.set("#brow1", { svgOrigin: "548 258" }, 0);
      tl.set(".tok", { x: 0, y: 0 }, 0);
      tl.set(["#q0", "#q1", "#q2"], { svgOrigin: "468 145" }, 0);

      // un gesto: cejas, tamaño de ojos y hacia dónde mira
      const cara = (t, b0y, b0r, b1y, b1r, ojo, px, py) => {
        tl.to("#brow0", { y: b0y, rotation: b0r, duration: .26, ease: "back.out(2)" }, BO + t)
          .to("#brow1", { y: b1y, rotation: b1r, duration: .26, ease: "back.out(2)" }, BO + t)
          .to(["#eyew0", "#eyew1"], { scale: ojo, duration: .26, ease: "back.out(2)" }, BO + t)
          .to(["#pup0", "#pup1"], { x: px, y: py, duration: .3, ease: "power2.out", overwrite: "auto" }, BO + t);
      };

      // una onomatopeya: aparece de golpe, empuja y se va
      const fx = (id, t, rot) => {
        tl.set(id, { opacity: 1, scale: .3, svgOrigin: "468 300", rotation: rot }, BO + t)
          .to(id, { scale: 1.12, duration: .18, ease: "back.out(3)" }, BO + t)
          .to(id, { scale: 1, duration: .12 }, BO + t + .18)
          .to(id, { opacity: 0, scale: 1.3, duration: .3, ease: "power2.in" }, BO + t + .8);
      };

      // las monedas: salen de detrás de la cabeza, giran y se apagan cayendo
      const burn = (t, n) => {
        for (let i = 0; i < n; i++) {
          const a = -2.62 + (i / (n - 1)) * 2.24;
          const d = 200 + (i % 4) * 42;
          tl.set("#tk" + i, { x: 468, y: 428, opacity: 1, scale: .3, rotation: 0 }, BO + t + i * .04)
            .to("#tk" + i, { x: 468 + Math.cos(a) * d, y: 428 + Math.sin(a) * d, scale: 1.55, rotation: 380, duration: .5, ease: "power2.out" }, BO + t + i * .04)
            .to("#tk" + i, { y: 428 + Math.sin(a) * d + 300, scale: .55, opacity: 0, rotation: 640, duration: .8, ease: "power2.in" }, BO + t + i * .04 + .5);
        }
      };

      // se lo come: abre la boca y el archivo baja hasta donde se atasca
      const come = (t, dur, hasta) => {
        tl.to("#mouth", { scaleY: 1, duration: .22, ease: "back.out(2)" }, BO + t - .2);
        tl.to(["#pup0", "#pup1"], { y: -10, duration: .18, ease: "power2.out", overwrite: "auto" }, BO + t - .2);
        tl.to(["#pup0", "#pup1"], { y: 11, duration: dur * .8, ease: "power2.in", overwrite: "auto" }, BO + t);
        tl.to("#fileg", { y: ATORADO, x: 0, rotation: 0, duration: dur, ease: "power2.in" }, BO + t);
        tl.to("#fill", { scaleX: hasta, duration: dur + .2, ease: "power1.out" }, BO + t);
      };

      // se atora: medio archivo se queda de fuera y el agente se apaga
      const atora = (t) => {
        tl.to("#mouth", { scaleY: .82, duration: .18, ease: "back.out(2)" }, BO + t);
        tl.to(["#head", "#ear0", "#ear1", "#mouth"], { stroke: AMBER, duration: .2 }, BO + t);
        tl.to(["#brow0", "#brow1"], { fill: AMBER, duration: .2 }, BO + t);
        tl.to("#fill", { fill: AMBER, duration: .2 }, BO + t);
        tl.set("#xeyes", { opacity: 1 }, BO + t);
        tl.set(["#eyew0", "#eyew1"], { opacity: 0 }, BO + t);
        tl.to("#spill", { opacity: 1, duration: .2 }, BO + t + .2);
        tl.to("#charg", { x: 10, duration: .05, yoyo: true, repeat: 7, overwrite: "auto" }, BO + t);
        tl.to("#fileg", { x: 8, duration: .06, yoyo: true, repeat: 9, overwrite: "auto" }, BO + t);   // el papel forcejea
        // las X tiemblan cada una sobre su propio ojo, no orbitando la cara
        tl.to("#xe0", { rotation: 11, duration: .45, ease: "sine.inOut", yoyo: true, repeat: 5, overwrite: "auto" }, BO + t + .1);
        tl.to("#xe1", { rotation: -11, duration: .45, ease: "sine.inOut", yoyo: true, repeat: 5, overwrite: "auto" }, BO + t + .1);
      };

      // el compact lo desatora: tira del archivo, quema monedas y le devuelve el aire
      const desatora = (t, tok) => {
        tl.to("#charg", { scaleY: .62, scaleX: 1.2, duration: .26, ease: "power3.in", overwrite: "auto" }, BO + t);
        tl.to("#fileg", { y: FUERA, x: 0, duration: .5, ease: "back.in(1.5)" }, BO + t + .12);
        tl.to("#charg", { scaleY: 1, scaleX: 1, duration: .45, ease: "elastic.out(1,.45)", overwrite: "auto" }, BO + t + .3);
        tl.to("#mouth", { scaleY: .16, duration: .2 }, BO + t + .55);
        tl.to("#fill", { scaleX: .22, duration: .4, ease: "power2.inOut" }, BO + t + .2);
        tl.to("#spill", { opacity: 0, duration: .25 }, BO + t + .2);
        if (tok) burn(t + .06, tok);
        // vuelve a la vida
        tl.set("#xeyes", { opacity: 0 }, BO + t + .5);
        tl.set(["#eyew0", "#eyew1"], { opacity: 1 }, BO + t + .5);
        tl.to(["#head", "#ear0", "#ear1", "#mouth"], { stroke: MINT, duration: .25 }, BO + t + .5);
        tl.to(["#brow0", "#brow1"], { fill: MINT, duration: .25 }, BO + t + .5);
        tl.to("#fill", { fill: MINT, duration: .25 }, BO + t + .5);
      };

      // respira y parpadea
      tl.to("#charg", { scaleY: 1.03, duration: 1.7, ease: "sine.inOut", yoyo: true, repeat: 2 }, BO);
      for (let i = 0; i < 12; i++) {
        const t = BO + 1.2 + i * 4.4;
        if (t > BO + BODY - 1) break;
        tl.to(["#eye0", "#eye1"], { scaleY: .08, duration: .07, yoyo: true, repeat: 1, ease: "none", overwrite: "auto" }, t);
      }
      tl.to("#fileg", { rotation: 2.5, svgOrigin: "468 16", duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: 2 }, BO);
      cara(0.4, -12, -4, -12, 4, 1.06, 0, -9);            // ve venir el archivote

      // 6.10 "se lo va a tragar todo": entra y entra, y no se acaba
      cara(5.9, -20, -8, -20, 8, 1.22, 0, 8);
      come(6.10, 3.6, .92);
      fx("#fx1", 6.30, -8);

      // 10.41 "se atraganta": ahí se queda, con medio archivo de fuera
      atora(10.41);
      cara(10.41, 10, 20, 10, -20, .92, 0, 0);
      fx("#fx2", 10.55, 7);
      tl.to("#spill", { rotation: 4, svgOrigin: "468 500", duration: .8, ease: "sine.inOut", yoyo: true, repeat: 9 }, BO + 10.9);
      // 12.50 "se le va a acabar el contexto"
      tl.to("#fill", { scaleX: 1, duration: 1.2, ease: "power2.out" }, BO + 12.50);
      tl.to("#barlbl", { innerHTML: "CONTEXTO LLENO", fill: AMBER, duration: .01 }, BO + 13.09);
      tl.to("#barlbl", { opacity: .25, duration: .35, yoyo: true, repeat: 11, ease: "none" }, BO + 13.2);
      // 14.65 "puede entrar en un bucle"
      tl.to("#loopg", { opacity: 1, duration: .4, ease: "power2.out" }, BO + 14.65);
      tl.from("#loopg", { scale: .82, svgOrigin: "300 300", duration: .4, ease: "back.out(1.6)", immediateRender: false }, BO + 14.65);

      // 20.27 "entra en un compact": el compact se gasta en sacárselo
      desatora(20.27, 20);
      fx("#fx3", 20.45, -5);
      // 21.77 "termina el compact": revive, y el archivo sigue ahí, enterito
      tl.to("#barlbl", { innerHTML: "CONTEXTO", fill: MUTE, opacity: 1, duration: .01 }, BO + 21.9);
      tl.to("#fileg", { y: ARRIBA, duration: .55, ease: "back.out(1.3)" }, BO + 21.9);
      cara(21.9, 0, 0, 0, 0, 1, 0, 0);
      // 23.38 "recuerda que la última tarea era leer el archivo"
      tl.to("#noteg", { opacity: 1, duration: .01 }, BO + 23.38)
        .from("#noteg", { y: -30, scale: .6, svgOrigin: "348 201", duration: .45, ease: "back.out(2)", immediateRender: false }, BO + 23.38);
      cara(23.5, -16, -12, 2, 5, 1.04, -8, -4);
      tl.to("#noteg", { y: -14, duration: .16, yoyo: true, repeat: 3, ease: "power2.out" }, BO + 24.46);

      // 26.79 "y se lo vuelve a comer": el mismo gigante, el mismo atorón
      come(26.79, 1.3, .95);
      fx("#fx4", 26.95, -6);
      atora(28.15);

      // 28.78 "y vuelve": desatorar, comer, atorarse; cada vuelta más rápida
      [[29.0, 2.7, 10], [31.7, 2.5, 8], [34.2, 2.4, 14], [36.6, 2.2, 10], [38.8, 2.0, 16], [40.8, 1.8, 10]].forEach(([t, d, n]) => {
        desatora(t, n);
        come(t + d * .44, d * .32, .95);
        atora(t + d * .82);
      });
      desatora(42.6, 12);

      // 43.90 "¿en qué me quedé?"
      cara(43.6, -18, -14, 4, 7, 1.1, 9, -11);
      tl.to("#bubbleg", { opacity: 1, duration: .01 }, BO + 43.90)
        .from("#bubbleg", { scale: .5, svgOrigin: "626 230", duration: .4, ease: "back.out(2)", immediateRender: false }, BO + 43.90);
      // 45.23 "ah, sí, estaba comiendo el archivo": el recado se lo sopla
      tl.to("#bubtxt", { innerHTML: "¡ah, sí! el archivo", duration: .01 }, BO + 45.23);
      tl.to("#noteg", { scale: 1.18, svgOrigin: "348 201", duration: .2, yoyo: true, repeat: 3, ease: "power2.out" }, BO + 45.23);
      cara(45.23, -16, -6, -16, 6, 1.14, -9, -3);
      tl.to("#bubbleg", { opacity: 0, scale: .7, svgOrigin: "626 230", duration: .35, ease: "power2.in" }, BO + 46.7);

      // 46.92 "y ahí se queda": se lo come otra vez y ahí se queda, atorado
      come(47.0, 1.1, .95);
      atora(48.15);
      // 49.13 "uno de los bucles más comunes"
      tl.to("#loopg", { scale: 1.1, svgOrigin: "300 320", duration: .5, ease: "back.out(1.6)" }, BO + 49.13);
      tl.to("#loopg", { opacity: .55, duration: .5, yoyo: true, repeat: 3, ease: "sine.inOut" }, BO + 49.4);

      // 52.62 ".md, PDF, gigantes": lo desatoran y ve la fila que le espera
      desatora(51.4, 0);
      tl.to("#fileg", { opacity: 0, duration: .3 }, BO + 52.0);
      tl.to("#loopg", { opacity: .3, duration: .4 }, BO + 52.0);
      tl.to("#queueg", { opacity: 1, duration: .01 }, BO + 52.30);
      tl.from("#q0", { y: -170, opacity: 0, duration: .45, ease: "back.out(1.6)", immediateRender: false }, BO + 52.62);
      tl.from("#q1", { y: -170, opacity: 0, duration: .45, ease: "back.out(1.6)", immediateRender: false }, BO + 54.12);
      tl.from("#q2", { y: -170, opacity: 0, duration: .45, ease: "back.out(1.6)", immediateRender: false }, BO + 55.25);
      tl.to(["#q0", "#q1", "#q2"], { rotation: 4, svgOrigin: "541 197", duration: .9, ease: "sine.inOut", yoyo: true, repeat: 3, stagger: .12 }, BO + 53.2);
      cara(52.6, -22, -10, -22, 10, 1.2, 0, -6);
      tl.to("#mouth", { scaleY: 1, duration: .25, ease: "back.out(2)" }, BO + 55.4);

      // ---- karaoke: la línea entra y la palabra en curso se realza por peso
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const at = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 22, opacity: 0, duration: .22, ease: "power3.out" }, at);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: MUTE, fontWeight: 400 }, at - .01)
            .set("#" + w.id, { color: MINT, fontWeight: 800 }, BO + w.s)
            .set("#" + w.id, { color: INK, fontWeight: 400 }, BO + w.e);
        });
      });

      // ---- cierre
      tl.from("#o1", { y: 24, opacity: 0, duration: .6, ease: "power3.out" }, OUT_IN + .1)
        .from("#o2", { scaleX: 0, duration: .5, ease: "power2.out" }, OUT_IN + .5)
        .from("#o3", { opacity: 0, duration: .4 }, OUT_IN + .65)
        .from("#o4", { y: 22, opacity: 0, duration: .5, ease: "power3.out" }, OUT_IN + .75)
        .from("#o5", { opacity: 0, duration: .45 }, OUT_IN + 1.0)
        .from("#o6", { y: 16, opacity: 0, duration: .45, ease: "back.out(1.6)" }, OUT_IN + 1.2);

      tl.set({}, {}, TOTAL);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

fs.writeFileSync(new URL("./index.html", import.meta.url), html);
console.log("index.html", html.length, "bytes ·", lines.length, "líneas · total", TOTAL, "s");
