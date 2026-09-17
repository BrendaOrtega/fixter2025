import fs from "node:fs";
// Short-trailer 9:16 (~23 s). Ghosty presenta el tutorial de eve. Tiempos de voz de voice/marks.txt.
const TOTAL = 27.2;
const V = [0, 3.7, 8.1, 10.95, 15.41, 18.35, 22.12];  // la frase 4 va en dos subtítulos           // inicio de cada frase
const D = [3.20, 3.90, 2.05, 3.86, 2.85, 3.27, 3.78];          // duración de cada frase
const LINES = [
  "Soy Ghosty, y te hice un video sobre agentes durables.",
  "Este agente lleva un registro de cada paso que termina, en Postgres.",
  "Le corto la luz en el paso tres.",
  "Cuando vuelve, lee el registro y sigue en el cuatro. No repite nada.",
  "En el video lo armamos con eve, el framework de Vercel.",
  "Con Postgres y Docker, corriendo en una caja de EasyBits.",
  "Está completo en YouTube. Fixtergeek. Sale hoy, no te lo pierdas.",
];
const BG = "#0E1317", MINT = "#85DDCB", MINTDK = "#37AB93", GREEN = "#8DCF6E", INK = "#F2F5F4", GREY = "#7C8A8E", FROST = "#DDF4F0", OFF = "#3E5A5C";
const ANIMS = fs.readFileSync(new URL("../cards/_anims.css", import.meta.url), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// karaoke: una línea a la vez, palabra en curso en menta, dichas en tinta, por decir en gris
const caps = LINES.map((l, i) => {
  const words = l.split(" ").map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w)}</span>`).join(" ");
  return `<div class="clip cap" id="cap${i}" data-start="${V[i]}" data-duration="${(i === 3 ? V[4] - 0.75 - V[3] : i < 6 ? V[i + 1] - V[i] : TOTAL - V[i]).toFixed(2)}"><div class="capin">${words}</div></div>`;
}).join("\n");
const chip = (n, x) => `<g class="chip" id="chip${n}"><rect x="${x}" y="1010" width="72" height="72" rx="10" fill="${GREY}" stroke="${INK}" stroke-width="4"/><text x="${x + 36}" y="1062" font-size="40" font-weight="900" text-anchor="middle" fill="${BG}">${n}</text></g>`;
// resultado del paso: papelito que vuela de la ficha a la lista de guardado
const receipt = (n) => `<g class="receipt" id="rc${n}" opacity="0"><rect x="0" y="0" width="70" height="40" rx="6" fill="${INK}" stroke="${BG}" stroke-width="3"/><text x="35" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="${BG}">${n} ✓</text></g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=Space+Mono:wght@700&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1080px; height:1920px; overflow:hidden; background:${BG}; }
body { font-family:"Space Mono", monospace; color:${INK}; }
.clip { position:absolute; inset:0; }
${ANIMS}
.anim { transform-box: fill-box; transform-origin: 50% 100%; animation-fill-mode: both; }
#ghosty { animation: jello 1.3s .1s both, bounce 1.1s 3.8s both, headshake 1s 8.2s both, tada 1s 11.5s both, bounce 1.2s 22.2s both; transform-box: fill-box; transform-origin: 50% 100%; }
#stack { animation: bounce 1.1s 3.9s both; transform-box: fill-box; transform-origin: 50% 100%; }
#ic1 { animation: bounce 1s 17.3s both; } #ic2 { animation: bounce 1s 18.5s both; } #ic3 { animation: bounce 1s 19.7s both; }
#ic1,#ic2,#ic3 { transform-box: fill-box; transform-origin: 50% 100%; }
#box, #pieces, #cta { transform: translate(150px,-25px) scale(.86); transform-origin: 0 0; } #cable { transform: translateY(-345px); }
.slice { transform-box: fill-box; transform-origin: 0% 50%; }
#journal { animation: swing 1s 3.8s both; transform-box: fill-box; transform-origin: 50% 0%; }
#logo { animation: tada 1s 23.1s both; transform-box: fill-box; transform-origin: 50% 50%; }
.cap { top:1215px; bottom:auto; height:200px; display:flex; align-items:center; justify-content:center; padding:0 70px; z-index:20; }
.capin { font-family:"Big Shoulders Display", sans-serif; font-weight:900; font-size:72px; line-height:1.05; text-align:center; text-transform:uppercase; letter-spacing:1px; }
.w { color:${GREY}; display:inline-block; }
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
<div class="clip" id="scene" data-start="0" data-duration="${TOTAL}">
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs><pattern id="dots" width="54" height="54" patternUnits="userSpaceOnUse"><circle cx="27" cy="27" r="2.5" fill="#1C262B"/></pattern>
  <clipPath id="hole"><rect x="150" y="620" width="780" height="560" rx="16"/></clipPath></defs>
  <rect width="1080" height="1920" fill="${BG}"/><rect width="1080" height="1920" fill="url(#dots)"/>

  <!-- título arriba (zona segura: desde y 260) -->
  <g id="title">
    <text x="540" y="360" text-anchor="middle" font-family="Big Shoulders Display" font-size="96" font-weight="900" fill="${INK}">AGENTES DURABLES</text>
    <text x="540" y="430" text-anchor="middle" font-size="34" font-weight="700" fill="${MINT}">tutorial · eve self-hosted</text>
  </g>

  <!-- la caja con Ghosty adentro -->
  <g id="box">
    <rect x="150" y="620" width="780" height="620" rx="18" fill="${BG}" transform="translate(16,16)"/>
    <polygon points="140,610 180,570 960,570 920,610" fill="${MINTDK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect id="boxfront" x="140" y="610" width="780" height="640" rx="18" fill="${MINT}" stroke="${INK}" stroke-width="5"/>
    <rect x="150" y="620" width="780" height="560" rx="16" fill="${BG}"/>
    <g clip-path="url(#hole)">
      <rect x="150" y="1100" width="780" height="80" fill="#1C262B"/>
      <g id="stack">
        <rect x="200" y="1094" width="680" height="16" rx="4" fill="${INK}"/>
        ${[1,2,3,4,5,6].map((n, i) => chip(n, 180 + i * 84)).join("")}
      </g>
      <g id="ghosty"><image xlink:href="assets/ghosty.png" x="330" y="660" width="300" height="348" preserveAspectRatio="xMidYMid meet"/></g>
      <!-- los checkpoints: aquí queda el resultado de cada paso terminado -->
      <g id="journal"><rect x="700" y="700" width="190" height="270" rx="10" fill="${INK}" stroke="${BG}" stroke-width="4"/><line x1="732" y1="700" x2="732" y2="970" stroke="#D9D3C4" stroke-width="4"/>
        <text x="810" y="745" text-anchor="middle" font-size="24" font-weight="700" fill="${GREY}">registro</text>
        ${[1,2,3,4,5,6].map((n) => `<text class="jl" id="jl${n}" x="750" y="${745 + n * 36}" font-size="26" font-weight="700" fill="${BG}" opacity="0">paso ${n} ✓</text>`).join("")}
      </g>
      ${[1,2,3,4,5,6].map(receipt).join("")}
      <g id="frost" fill="${FROST}" style="opacity:0">
        <polygon id="fr1" points="150,620 260,620 220,660 300,650 260,710 150,720"/>
        <polygon id="fr2" points="930,620 820,620 860,665 790,655 830,715 930,720"/>
        <polygon id="fr3" points="150,1180 150,1080 200,1140 230,1100 270,1180"/>
        <polygon id="fr4" points="930,1180 930,1070 880,1130 850,1100 810,1180"/>
      </g>
    </g>
    <g stroke="${INK}" stroke-width="3"><circle class="lamp" cx="190" cy="1215" r="11" fill="${GREEN}"/><circle class="lamp" cx="226" cy="1215" r="11" fill="${GREEN}"/><circle class="lamp" cx="262" cy="1215" r="11" fill="${INK}"/></g>
    <text id="boxlbl" x="900" y="1224" text-anchor="end" font-size="24" font-weight="700" fill="${BG}">sb_af93 · on</text>
  </g>

  <!-- el enchufe: placa en la pared con dos ranuras; la clavija entra por la derecha; el cable sube a la caja -->
  <g id="cable">
    <g id="outlet"><rect x="30" y="1290" width="120" height="150" rx="14" fill="${INK}" stroke="${BG}" stroke-width="4"/><rect x="62" y="1330" width="14" height="40" rx="4" fill="${BG}"/><rect x="104" y="1330" width="14" height="40" rx="4" fill="${BG}"/><circle cx="90" cy="1312" r="5" fill="${GREY}"/><circle cx="90" cy="1418" r="5" fill="${GREY}"/></g>
    <g id="plug"><rect x="150" y="1318" width="80" height="64" rx="12" fill="${MINT}" stroke="${BG}" stroke-width="4"/><rect x="132" y="1332" width="22" height="12" rx="3" fill="${GREY}"/><rect x="132" y="1356" width="22" height="12" rx="3" fill="${GREY}"/></g>
    <path id="cord" d="M230,1350 C250,1350 255,1350 272,1350" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  </g>

  <!-- tres piezas del tutorial (aparecen sobre la caja en el beat 5) -->
  <g id="pieces" opacity="0">
    <rect x="150" y="620" width="780" height="560" rx="16" fill="${BG}"/>
    <g id="ic1"><rect x="220" y="760" width="180" height="230" rx="10" fill="${INK}" stroke="${BG}" stroke-width="4"/><line x1="255" y1="760" x2="255" y2="990" stroke="#D9D3C4" stroke-width="4"/><text x="320" y="830" text-anchor="middle" font-size="28" font-weight="700" fill="${BG}">paso 3 ✓</text><text x="320" y="1040" text-anchor="middle" font-size="30" font-weight="700" fill="${MINT}">journal</text></g>
    <g id="ic2"><rect x="450" y="790" width="180" height="170" fill="${MINTDK}" stroke="${INK}" stroke-width="4"/><ellipse cx="540" cy="960" rx="90" ry="26" fill="${MINTDK}" stroke="${INK}" stroke-width="4"/><ellipse cx="540" cy="790" rx="90" ry="26" fill="${MINT}" stroke="${INK}" stroke-width="4"/><text x="540" y="1040" text-anchor="middle" font-size="30" font-weight="700" fill="${MINT}">Postgres</text></g>
    <g id="ic3"><rect x="680" y="790" width="190" height="180" rx="8" fill="${MINTDK}" stroke="${INK}" stroke-width="4"/><g stroke="#2C8C79" stroke-width="10"><line x1="710" y1="800" x2="710" y2="960"/><line x1="740" y1="800" x2="740" y2="960"/><line x1="810" y1="800" x2="810" y2="960"/><line x1="840" y1="800" x2="840" y2="960"/></g><text x="775" y="1040" text-anchor="middle" font-size="30" font-weight="700" fill="${MINT}">tu caja</text></g>
  </g>

  <!-- cierre: logo + CTA (dentro de zona segura, y < 1400) -->
  <g id="cta" opacity="0">
    <rect x="150" y="620" width="780" height="560" rx="16" fill="${BG}"/>
    <g id="logo"><image xlink:href="assets/logo.png" x="290" y="700" width="500" height="150" preserveAspectRatio="xMidYMid meet" style="filter: drop-shadow(0 0 14px rgba(133,221,203,.9))"/></g>
    <text x="540" y="940" text-anchor="middle" font-family="Big Shoulders Display" font-size="70" font-weight="900" fill="${INK}">MÍRALO EN YOUTUBE</text>
    <text x="540" y="1010" text-anchor="middle" font-size="40" font-weight="700" fill="${MINT}">youtube.com/@fixtergeek</text>
    <text x="540" y="1090" text-anchor="middle" font-size="36" font-weight="700" fill="${GREEN}">sale hoy · 17 sep 2026</text>
  </g>
  <!-- cortinilla: rebanadas sesgadas que barren y sellan el corte (encima de todo) -->
  <g id="wipe" opacity="0">${Array.from({length: 12}, (_, k) => { const i = k - 1; return `<polygon class="slice" points="-200,${i*220-200} 1300,${i*220-420} 1300,${i*220-120} -200,${i*220+100}" fill="${[MINT, GREEN, INK][k % 3]}"/>`; }).join("")}</g>
</svg>
</div>
${caps}
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
const V = ${JSON.stringify(V)}, D = ${JSON.stringify(D)}, GREY = "${GREY}", INK = "${INK}", MINT = "${MINT}";
tl.set("#frost polygon", { scale: 0, transformOrigin: "50% 50%" }, 0.01); tl.set("#frost", { opacity: 1 }, V[2] + 1.25);
// vida continua: Ghosty flota en bucle finito; lámpara blanca parpadea; recibos de la libreta se mecen con ella
// flota sólo mientras hay luz: se detiene en seco al apagarse y vuelve al reencender
const KILL = V[2] + 1.2, BACK = V[3] + .4;
tl.to("#ghosty image", { y: -14, duration: .8, yoyo: true, repeat: Math.floor(KILL / .8) - 1, ease: "sine.inOut" }, 0);
tl.to("#ghosty image", { y: -14, duration: .8, yoyo: true, repeat: 31, ease: "sine.inOut" }, BACK);
tl.to(".lamp:nth-of-type(3)", { opacity: .3, duration: .4, yoyo: true, repeat: Math.floor(KILL / .4) - 1, ease: "none" }, 0);
tl.set(".lamp:nth-of-type(3)", { opacity: 1 }, KILL);
tl.to(".lamp:nth-of-type(3)", { opacity: .3, duration: .4, yoyo: true, repeat: 60, ease: "none" }, BACK);
tl.to(".chip", { y: -4, duration: .5, yoyo: true, repeat: 6, stagger: .08, ease: "sine.inOut" }, .3);
// recibo: la ficha se pinta verde y un papelito vuela a la libreta, donde queda la línea
const done = (n, t) => {
  const x = 180 + (n - 1) * 84;
  tl.to("#chip" + n + " rect", { fill: "${GREEN}", duration: .15 }, t);
  tl.set("#rc" + n, { x: x, y: 1000, opacity: 1 }, t + .05);
  tl.to("#rc" + n, { x: 740, y: 700 + n * 36 - 20, duration: .45, ease: "power2.inOut" }, t + .05);
  tl.set("#rc" + n, { opacity: 0 }, t + .5);
  tl.to("#jl" + n, { opacity: 1, duration: .1 }, t + .5);
};
done(1, V[1] + .9); done(2, V[1] + 1.7); done(3, V[1] + 2.5);
// beat 3: Ghosty jala el cable → el cable se desprende, la caja se apaga, escarcha
tl.to("#plug", { x: 90, y: 30, rotation: 35, transformOrigin: "50% 50%", duration: .3, ease: "power2.in" }, V[2] + .9);
tl.to("#cord", { attr: { d: "M300,1400 C330,1400 290,1360 272,1350" }, duration: .3, ease: "power2.in" }, V[2] + .9);
tl.to("#boxfront", { fill: "${OFF}", duration: .12 }, V[2] + 1.2);
tl.to(".lamp", { fill: GREY, duration: .1, stagger: .05 }, V[2] + 1.2);
tl.set("#boxlbl", { textContent: "sb_af93 · off", fill: INK }, V[2] + 1.25);
tl.to("#frost polygon", { scale: 1, duration: .45, stagger: .08, ease: "power2.out" }, V[2] + 1.3);
// beat 4: enchufa, reencienden, se derrite; lee los recibos (parpadean) y sigue con 4-6
tl.to("#plug", { x: 0, y: 0, rotation: 0, duration: .3, ease: "power2.out" }, V[3]);
tl.to("#cord", { attr: { d: "M230,1350 C250,1350 255,1350 272,1350" }, duration: .3, ease: "power2.out" }, V[3]);
tl.to("#boxfront", { fill: MINT, duration: .2 }, V[3] + .3);
tl.to(".lamp", { fill: (i) => (i === 2 ? INK : "${GREEN}"), duration: .1, stagger: .06 }, V[3] + .3);
tl.set("#boxlbl", { textContent: "sb_af93 · on", fill: "${BG}" }, V[3] + .4);
tl.to("#frost polygon", { scale: 0, duration: .4, stagger: .04, ease: "power2.in" }, V[3] + .4);
tl.to("#jl1, #jl2, #jl3", { fill: MINT, duration: .15, stagger: .15, yoyo: true, repeat: 1 }, V[3] + .8);
done(4, V[3] + 1.7); done(5, V[3] + 2.4); done(6, V[3] + 3.1);
// beat 5: cortinilla en el silencio previo a la frase 4; las piezas ya están cuando entra el subtítulo
const W = V[4] - 0.75;
tl.set("#wipe", { opacity: 1 }, W);
tl.set(".slice", { scaleX: 0 }, 0.01);
tl.to(".slice", { scaleX: 1, duration: .22, stagger: .02, ease: "back.out(1.4)" }, W);
tl.to(".slice", { scaleX: 0, transformOrigin: "100% 50%", duration: .2, stagger: .02, ease: "power2.in" }, W + .38);
tl.set("#wipe", { opacity: 0 }, W + .8);
// beat 5: las tres piezas tapan la caja
tl.set("#pieces", { opacity: 1 }, V[4] - .45);
tl.set("#pieces", { opacity: 0 }, V[6] + .2);  // se apaga cuando el CTA ya está encima: sin flash de la caja
// beat 6: CTA
tl.set("#cta", { opacity: 1 }, V[6]); tl.from("#cta", { y: 40, duration: .35, ease: "back.out(1.6)", immediateRender: false }, V[6]);
// karaoke: reparto uniforme de palabras por frase
${LINES.map((l, i) => { const ws = l.split(" "); return ws.map((w, j) => { const t0 = V[i] + (D[i] * j) / ws.length; return `tl.set("#w${i}_${j}", { color: MINT, scale: 1.08 }, ${t0.toFixed(2)}); tl.set("#w${i}_${j}", { color: INK, scale: 1 }, ${(V[i] + (D[i] * (j + 1)) / ws.length).toFixed(2)});`; }).join(" "); }).join("\n")}
tl.set({}, {}, ${TOTAL});
window.__timelines["main"] = tl;
</script>
</body></html>`;
fs.writeFileSync(new URL("./index.html", import.meta.url), html);
const sfx = { "boing": [0.1], "paper": [V[1]+.95, V[1]+1.75, V[1]+2.55, V[3]+1.75, V[3]+2.45, V[3]+3.15], "cable-yank": [V[2]+.9], "power-down": [V[2]+1.2], "frost": [V[2]+1.3], "power-up": [V[3]+.3], "melt": [V[3]+.4], "tick": [V[3]+.8, V[3]+.95, V[3]+1.1], "riser": [V[4]-.75], "hit": [V[4]-.5], "pop": [17.3, 18.5, 19.7], "stamp": [V[6]], "tada": [23.1] };
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx, null, 2));
console.log("index.html", html.length, "bytes · total", TOTAL);
