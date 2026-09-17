import fs from "node:fs";

// ---- tiempos (segundos). Declarar antes de usar.
const TOTAL = 15.0;
const T_STEP = process.env.LONG ? [0.8, 1.7, 2.6] : [1.2, 2.4, 3.6];   // fichas 1, 2, 3 se colocan
const T_KILL = process.env.LONG ? 4.1 : 5.2;               // se escribe pkill y se apaga la caja
const T_FROZEN = process.env.LONG ? 4.8 : 5.9;             // escarcha y etiqueta
const T_RESTART = process.env.LONG ? 5.5 : 9.0;            // se escribe eve dev y reencienden las lámparas
const T_STEP2 = process.env.LONG ? [7.9, 8.9, 9.9] : [10.3, 11.5, 12.7]; // fichas 4, 5, 6

const BG = "#0E1317", MINT = "#85DDCB", MINTDK = "#37AB93", GREEN = "#8DCF6E", INK = "#F2F5F4", GREY = "#7C8A8E", FROST = "#DDF4F0", OFF = "#3E5A5C";

// ficha de la mesa: x según índice 0..5 (hueco entre la 3 y la 5 para la 4)
const chipX = (n) => 1150 + [0, 66, 132, 198, 264, 330][n];
const chip = (n) => `<g class="chip" id="chip${n}"><rect x="${chipX(n - 1)}" y="500" width="56" height="56" rx="8" fill="${GREY}" stroke="${INK}" stroke-width="3"/><text x="${chipX(n - 1) + 28}" y="540" font-size="30" font-weight="900" text-anchor="middle" fill="${BG}">${n}</text></g>`;

const html = `<!doctype html>
<html lang="es" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${BG}; }
      body { font-family: ui-monospace, Menlo, monospace; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      svg text { font-family: ui-monospace, Menlo, monospace; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
      <div class="clip" id="scene" data-start="0" data-duration="${TOTAL}">
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="2.2" fill="#1C262B"/></pattern>
    <clipPath id="boxHole"><rect x="1010" y="230" width="640" height="520" rx="14"/></clipPath>
  </defs>
  <rect width="1920" height="1080" fill="${BG}"/>
  <rect width="1920" height="1080" fill="url(#dots)"/>

  <!-- ===== terminal ===== -->
  <g id="terminal">
    <rect x="140" y="260" width="720" height="560" rx="14" fill="${BG}"/>
    <rect x="128" y="248" width="720" height="560" rx="14" fill="#141C21" stroke="${INK}" stroke-width="4"/>
    <rect x="128" y="248" width="720" height="52" rx="14" fill="${INK}"/><rect x="128" y="286" width="720" height="14" fill="${INK}"/>
    <circle cx="164" cy="274" r="9" fill="${BG}"/><circle cx="192" cy="274" r="9" fill="${GREY}"/><circle cx="220" cy="274" r="9" fill="${MINT}"/>
    <text x="488" y="282" text-anchor="middle" font-size="20" font-weight="700" fill="${BG}">eve dev --no-ui</text>
    <g font-size="26" fill="${INK}">
      <text class="ln" id="ln1" x="168" y="350" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 1</tspan> · pid 96343</text>
      <text class="ln" id="ln2" x="168" y="394" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 2</tspan> · pid 96343</text>
      <text class="ln" id="ln3" x="168" y="438" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 3</tspan> · pid 96343</text>
      <text class="ln" id="lnkill" x="168" y="500" opacity="0" fill="${MINT}">$ pkill -9 -f "eve dev"</text>
      <text class="ln" id="lndead" x="168" y="544" opacity="0" fill="${GREY}">[1] killed</text>
      <text class="ln" id="lnstart" x="168" y="606" opacity="0" fill="${MINT}">$ npx eve dev --no-ui</text>
      <text class="ln" id="ln4" x="168" y="668" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 4</tspan> · pid 97510</text>
      <text class="ln" id="ln5" x="168" y="712" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 5</tspan> · pid 97510</text>
      <text class="ln" id="ln6" x="168" y="756" opacity="0">[process_batch] <tspan fill="${GREEN}">paso 6</tspan> · pid 97510</text>
    </g>
    <rect id="cursor" x="168" y="330" width="16" height="30" fill="${INK}"/>
  </g>

  <!-- ===== caja ===== -->
  <g id="box">
    <rect x="1016" y="236" width="660" height="580" rx="16" fill="${BG}"/>
    <polygon points="1000,220 1040,180 1700,180 1660,220" fill="${MINTDK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <polygon points="1660,220 1700,180 1700,760 1660,800" fill="#2C8C79" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <rect id="boxfront" x="1000" y="220" width="660" height="580" rx="16" fill="${MINT}" stroke="${INK}" stroke-width="4"/>
    <g stroke="${INK}" stroke-width="3">
      <circle class="lamp" cx="1040" cy="770" r="9" fill="${GREEN}"/><circle class="lamp" cx="1070" cy="770" r="9" fill="${GREEN}"/><circle class="lamp" cx="1100" cy="770" r="9" fill="${INK}"/>
    </g>
    <text id="boxlbl" x="1620" y="778" text-anchor="end" font-size="20" font-weight="700" fill="${BG}">sb_af93 · on</text>
    <rect x="1010" y="230" width="640" height="520" rx="14" fill="${BG}"/>
    <g clip-path="url(#boxHole)">
      <rect x="1010" y="640" width="640" height="120" fill="#1C262B"/>
      <rect x="1140" y="560" width="400" height="18" rx="4" fill="${INK}"/>
      <rect x="1160" y="578" width="14" height="80" fill="${INK}"/><rect x="1506" y="578" width="14" height="80" fill="${INK}"/>
      ${[1, 2, 3, 5, 6].map(chip).join("")}
      <!-- Ghosty: grupo limpio para GSAP (svgOrigin absoluto) -->
      <g id="ghosty"><image xlink:href="assets/ghosty.png" x="1230" y="268" width="200" height="232" preserveAspectRatio="xMidYMid meet"/></g>
      <!-- ficha en la mano: se reutiliza para 1,2,3 y 4,5,6 -->
      <g id="hand"><rect id="handrect" x="1372" y="422" width="56" height="56" rx="8" fill="${MINT}" stroke="${INK}" stroke-width="3"/><text id="handnum" x="1400" y="462" font-size="30" font-weight="900" text-anchor="middle" fill="${BG}">1</text></g>
      <!-- escarcha -->
      <g id="frost" fill="${FROST}">
        <polygon id="fr1" points="1010,230 1090,230 1060,262 1130,246 1100,290 1010,300"/>
        <polygon id="fr2" points="1650,230 1570,230 1600,268 1540,256 1580,304 1650,310"/>
        <polygon id="fr3" points="1010,750 1010,680 1050,720 1070,690 1100,750"/>
        <polygon id="fr4" points="1650,750 1650,670 1610,716 1590,690 1560,750"/>
        <g id="flakes"><circle cx="1120" cy="340" r="5"/><circle cx="1540" cy="380" r="4"/><circle cx="1480" cy="300" r="6"/><circle cx="1180" cy="440" r="4"/><circle cx="1600" cy="600" r="5"/></g>
      </g>
    </g>
    <rect x="1010" y="230" width="640" height="520" rx="14" fill="none" stroke="${INK}" stroke-width="4"/>
  </g>

  <!-- ===== etiqueta ===== -->
  <g id="label">
    <rect x="1008" y="868" width="440" height="64" rx="12" fill="${BG}"/>
    <rect x="1000" y="860" width="440" height="64" rx="12" fill="${MINT}" stroke="${INK}" stroke-width="4"/>
    <text id="labeltxt" x="1220" y="903" text-anchor="middle" font-size="30" font-weight="900" fill="${BG}">trabajando</text>
  </g>
</svg>
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const chipX = ${chipX.toString()};

      // estado inicial (fotograma 0 completo: caja encendida, Ghosty con la ficha 1 en la mano)
      tl.set("#frost polygon, #flakes circle", { scale: 0, transformOrigin: "50% 50%" }, 0);
      tl.set("#ghosty", { rotation: -6, svgOrigin: "1330 400" }, 0);
      tl.set("#hand", { rotation: 14, svgOrigin: "1400 450" }, 0);

      // Ghosty se mece mientras trabaja (bucle finito)
      tl.to("#ghosty", { rotation: 6, svgOrigin: "1330 400", duration: .6, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0);
      tl.to("#cursor", { opacity: 0, duration: .3, yoyo: true, repeat: 40, ease: "none" }, 0);

      // coloca ficha n en la mesa: la mano baja, la ficha de la mesa se pinta verde, línea en la terminal
      // la mano baja en línea recta (sólo x/y, la rotación no cambia durante el tween: sin vibración)
      const place = (n, t, yLine) => {
        tl.to("#hand", { x: chipX(n - 1) - 1372, y: 78, duration: .35, ease: "power2.in" }, t);
        tl.to("#chip" + n + " rect", { fill: "${GREEN}", duration: .15 }, t + .35);
        tl.set("#hand", { opacity: 0 }, t + .35);
        tl.set("#hand", { x: 0, y: 0 }, t + .36);
        tl.set("#handnum", { textContent: String(n + 1) }, t + .36);
        tl.to("#hand", { opacity: 1, duration: .15 }, t + .45);
        tl.to("#ln" + n, { opacity: 1, duration: .05 }, t + .35);
        tl.to("#cursor", { attr: { y: yLine }, duration: .01 }, t + .35);
      };
      place(1, ${T_STEP[0]}, 374); place(2, ${T_STEP[1]}, 418); place(3, ${T_STEP[2]}, 480);

      // kill: se escribe el comando, la caja se apaga, Ghosty queda a medio movimiento con la 4
      tl.to("#lnkill", { opacity: 1, duration: .05 }, ${T_KILL});
      tl.to("#cursor", { attr: { y: 524 }, duration: .01 }, ${T_KILL});
      tl.to("#lndead", { opacity: 1, duration: .05 }, ${T_KILL + .35}); tl.to("#cursor", { attr: { y: 580 }, duration: .01 }, ${T_KILL + .35});
      tl.to("#ghosty", { rotation: -8, svgOrigin: "1330 400", duration: .12, ease: "none", overwrite: "auto" }, ${T_KILL + .3});
      tl.to("#boxfront", { fill: "${OFF}", duration: .12 }, ${T_KILL + .4});
      tl.to(".lamp", { fill: "${GREY}", duration: .1, stagger: .06 }, ${T_KILL + .4});
      tl.set("#boxlbl", { textContent: "sb_af93 · off", fill: "${INK}" }, ${T_KILL + .5});
      tl.to("#labeltxt", { opacity: 0, duration: .1 }, ${T_KILL + .4});
      tl.set("#labeltxt", { textContent: "congelado en el paso 4" }, ${T_KILL + .5});
      tl.to("#labeltxt", { opacity: 1, duration: .1 }, ${T_FROZEN});
      tl.to("#frost polygon", { scale: 1, duration: .5, stagger: .1, ease: "power2.out" }, ${T_FROZEN});
      tl.to("#flakes circle", { scale: 1, duration: .3, stagger: .08, ease: "back.out(2)" }, ${T_FROZEN + .3});

      // reinicio: comando nuevo, lámparas, escarcha se va, Ghosty suelta la 4 y sigue
      tl.to("#lnstart", { opacity: 1, duration: .05 }, ${T_RESTART});
      tl.to("#cursor", { attr: { y: 630 }, duration: .01 }, ${T_RESTART});
      tl.to("#boxfront", { fill: "${MINT}", duration: .2 }, ${T_RESTART + .5});
      tl.to(".lamp", { fill: (i) => (i === 2 ? "${INK}" : "${GREEN}"), duration: .1, stagger: .08 }, ${T_RESTART + .5});
      tl.set("#boxlbl", { textContent: "sb_af93 · on", fill: "${BG}" }, ${T_RESTART + .6});
      tl.to("#frost polygon, #flakes circle", { scale: 0, duration: .5, stagger: .04, ease: "power2.in" }, ${T_RESTART + .6});
      tl.to("#labeltxt", { opacity: 0, duration: .1 }, ${T_RESTART + .6});
      tl.set("#labeltxt", { textContent: "sigue en el paso 4" }, ${T_RESTART + .7});
      tl.to("#labeltxt", { opacity: 1, duration: .1 }, ${T_RESTART + .8});
      tl.to("#ghosty", { rotation: 6, svgOrigin: "1330 400", duration: .6, yoyo: true, repeat: 7, ease: "sine.inOut" }, ${T_RESTART + .8});
      // fichas 4, 5, 6: la 4 va al hueco entre 3 y 5
      const place2 = (n, t, yLine) => {
        tl.to("#hand", { x: chipX(n - 1) - 1372, y: 78, duration: .35, ease: "power2.in" }, t);
        tl.to("#chip" + n + " rect", { fill: "${GREEN}", duration: .15 }, t + .35);
        tl.set("#hand", { opacity: 0 }, t + .35);
        tl.set("#hand", { x: 0, y: 0 }, t + .36);
        tl.set("#handnum", { textContent: String(n + 1) }, t + .36);
        if (n < 6) tl.to("#hand", { opacity: 1, duration: .15 }, t + .45);
        tl.to("#ln" + n, { opacity: 1, duration: .05 }, t + .35);
        tl.to("#cursor", { attr: { y: yLine }, duration: .01 }, t + .35);
      };
      place2(4, ${T_STEP2[0]}, 692); place2(5, ${T_STEP2[1]}, 736); place2(6, ${T_STEP2[2]}, 780);
      tl.to("#labeltxt", { opacity: 0, duration: .1 }, ${T_STEP2[2] + .5});
      tl.set("#labeltxt", { textContent: "6 de 6 · sin repetir" }, ${T_STEP2[2] + .6});
      tl.to("#labeltxt", { opacity: 1, duration: .1 }, ${T_STEP2[2] + .7});
      tl.set({}, {}, ${TOTAL});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>`;

// ficha 4 en la mesa (oculta hasta que se coloca)
const withChip4 = html.replace(`${chip(5)}`, `<g class="chip" id="chip4"><rect x="${chipX(3)}" y="500" width="56" height="56" rx="8" fill="${GREY}" stroke="${INK}" stroke-width="3"/><text x="${chipX(3) + 28}" y="540" font-size="30" font-weight="900" text-anchor="middle" fill="${BG}">4</text></g>${chip(5)}`);
fs.writeFileSync(new URL("./index.html", import.meta.url), withChip4);

// SFX en tiempo de la composición (se montan con ffmpeg fuera del render)
const sfx = {
  "chip-place": [T_STEP[0] + .35, T_STEP[1] + .35, T_STEP[2] + .35, T_STEP2[0] + .35, T_STEP2[1] + .35, T_STEP2[2] + .35],
  "key-type": [T_KILL, T_RESTART],
  "power-down": [T_KILL + .4],
  "frost-crack": [T_FROZEN],
  "power-up": [T_RESTART + .5],
  "melt-whoosh": [T_RESTART + .6],
  "pop": [T_STEP2[2] + .7],
};
fs.writeFileSync(new URL("./sfx.json", import.meta.url), JSON.stringify(sfx, null, 2));
console.log("index.html", withChip4.length, "bytes · total", TOTAL, "s");
