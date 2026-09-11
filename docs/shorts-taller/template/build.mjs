import fs from "node:fs";
import lines from "./build-lines.mjs";

const BO = 4.4;          // el cuerpo arranca aquí
const BODY = 35.9;       // duración del clip
const OUT_IN = BO + BODY + 0.45;
const TOTAL = 47.4;

const BG = "#0E1317";
const MINT = "#85DDCB";
const GREEN = "#8DCF6E";
const INK = "#F2F5F4";
const MUTE = "#7C8A8E";
const PANEL = "#141B20";
const LINE = "#243036";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Karaoke: una línea a la vez, palabra por palabra
const lineEls = lines
  .map((l, i) => {
    const words = l.words.map((w, j) => `<span class="w" id="w${i}_${j}">${esc(w.text)}</span>`).join(" ");
    const dur = Math.max(0.4, l.hold - l.start);
    return `<div class="clip cap" id="l${i}" data-start="${(BO + l.start).toFixed(3)}" data-duration="${dur.toFixed(3)}"><div class="capin">${words}</div></div>`;
  })
  .join("\n      ");

// Malla de puntos (determinista)
const dots = (() => {
  let s = "";
  for (let y = 0; y < 1920 + 80; y += 80)
    for (let x = 0; x < 1080 + 80; x += 80) s += `<circle cx="${x}" cy="${y}" r="3" />`;
  return s;
})();

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${BG}; }
      body { font-family: "Archivo Black", system-ui; color: ${INK}; }
      .clip { position: absolute; inset: 0; }
      .mono { font-family: "JetBrains Mono", monospace; }
      .serif { font-family: "Instrument Serif", serif; font-style: italic; }

      /* fondo: malla de puntos + halo, nunca plano */
      #dots { position: absolute; left: -80px; top: -80px; width: 1240px; height: 2080px; fill: ${MINT}; opacity: .16; }
      #halo { position: absolute; left: 140px; top: 60px; width: 800px; height: 800px; border-radius: 50%;
        background: radial-gradient(circle, rgba(133,221,203,.28) 0%, rgba(133,221,203,0) 62%); }
      #grain { position: absolute; inset: -40px; z-index: 80; pointer-events: none; opacity: .2;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.6'/></svg>"); }

      /* cabecera */
      .chip { position: absolute; top: 96px; font-family: "JetBrains Mono"; font-size: 28px; letter-spacing: .18em; padding: 14px 22px; border: 3px solid ${LINE}; border-radius: 999px; color: ${MUTE}; }
      #chipL { left: 72px; } #chipR { right: 72px; }
      #live { display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: ${GREEN}; margin-right: 14px; vertical-align: middle; }

      /* la cara: tarjeta grande, torcida, con borde vivo */
      #facewrap { position: absolute; left: 270px; top: 210px; width: 540px; height: 504px; border-radius: 40px; border: 6px solid ${GREEN};
        overflow: hidden; z-index: 30; transform: rotate(-2.5deg); box-shadow: 0 30px 80px rgba(0,0,0,.55); background: ${PANEL}; }
      #facewrap video, #facewrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
      #byline { position: absolute; left: 0; right: 0; top: 748px; text-align: center; font-family: "JetBrains Mono"; font-size: 30px; letter-spacing: .1em; color: ${MUTE}; z-index: 30; }
      #byline b { color: ${MINT}; font-weight: 700; }

      /* karaoke: una línea, grande, la palabra en curso salta */
      .cap { position: absolute; inset: auto; left: 60px; right: 60px; top: 840px; height: 300px; z-index: 40;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .capin { font-size: 96px; line-height: 1.08; letter-spacing: -.02em; }
      .w { display: inline-block; color: ${MUTE}; }

      /* escenario */
      #stage { position: absolute; left: 72px; right: 72px; top: 1180px; height: 560px; z-index: 20; perspective: 1400px; }
      .scene { position: absolute; inset: 0; border-radius: 34px; background: ${PANEL}; border: 3px solid ${LINE}; overflow: hidden; }
      .tag { position: absolute; left: 40px; top: 40px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 28px; letter-spacing: .22em; color: ${GREEN}; }
      .tag.mute { color: ${MUTE}; }
      .lbl { position: absolute; font-family: "JetBrains Mono"; font-weight: 700; font-size: 26px; letter-spacing: .18em; color: ${MUTE}; }

      /* s0: el viaje (navegador → backend → caja) */
      .node { position: absolute; top: 200px; width: 250px; height: 150px; border-radius: 24px; border: 4px solid ${LINE}; background: ${BG};
        font-family: "JetBrains Mono"; font-weight: 700; font-size: 30px; color: ${INK}; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.2; }
      #n0 { left: 40px } #n1 { left: 343px } #n2 { left: 646px; font-size: 26px }
      .thin { position: absolute; height: 5px; background: ${LINE}; left: 290px; width: 53px; }
      #t0 { top: 255px } #t1 { top: 295px }
      #t0l { left: 265px; top: 130px; font-size: 22px; } #t1l { left: 265px; top: 372px; font-size: 22px; }
      #pipe { position: absolute; left: 593px; top: 258px; width: 53px; height: 34px; background: ${GREEN}; border-radius: 8px; transform-origin: left center; }
      #ws { position: absolute; left: 560px; top: 96px; font-family: "Archivo Black"; font-size: 76px; color: ${GREEN}; letter-spacing: -.02em; opacity: 0; }
      #badge { position: absolute; left: 646px; top: 380px; width: 250px; text-align: center; font-family: "JetBrains Mono"; font-weight: 700; font-size: 26px; letter-spacing: .12em; color: ${BG}; background: ${MINT}; padding: 12px 0; border-radius: 12px; opacity: 0; }

      /* s1: la conexión */
      .end { position: absolute; top: 190px; width: 160px; height: 180px; border-radius: 24px; border: 4px solid ${LINE}; background: ${BG};
        font-family: "JetBrains Mono"; font-weight: 700; font-size: 32px; color: ${INK}; display: flex; align-items: center; justify-content: center; }
      #e0 { left: 40px } #e1 { right: 40px }
      #tube { position: absolute; left: 200px; width: 536px; top: 200px; height: 160px; border-radius: 30px; border: 4px solid ${LINE}; background: ${BG}; overflow: hidden; }
      .lane { position: absolute; left: 0; right: 0; height: 40px; background: ${LINE}; opacity: .6; transform-origin: left center; }
      #la0 { top: 12px } #la1 { top: 60px } #la2 { top: 108px }
      .pk { position: absolute; width: 60px; height: 26px; border-radius: 8px; background: ${MINT}; }
      .pk.g { background: ${GREEN}; }
      #pk0 { top: 19px; left: -70px } #pk1 { top: 67px; left: 536px } #pk2 { top: 115px; left: -70px } #pk3 { top: 19px; left: 536px } #pk4 { top: 67px; left: -70px } #pk5 { top: 115px; left: 536px }
      .chipx { position: absolute; top: 420px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 22px; letter-spacing: .12em; padding: 14px 20px; border-radius: 999px; border: 4px solid ${GREEN}; color: ${GREEN}; opacity: 0; }
      #x0 { left: 40px } #x1 { left: 300px } #x2 { right: 40px }

      /* s2: aburrido */
      #stamp { position: absolute; left: 40px; top: 120px; font-family: "Archivo Black"; font-size: 150px; letter-spacing: -.04em; color: ${INK}; opacity: 0; transform-origin: left center; }
      #codewrap { position: absolute; left: 40px; top: 320px; width: 0; overflow: hidden; white-space: nowrap; }
      #code { font-family: "JetBrains Mono"; font-size: 44px; color: ${MINT}; padding: 18px 26px; background: ${BG}; border-radius: 14px; border: 3px solid ${LINE}; display: inline-block; }
      #code b { color: ${GREEN}; font-weight: 700; }
      .app { position: absolute; top: 450px; font-family: "JetBrains Mono"; font-size: 28px; color: ${MUTE}; padding: 14px 24px; border-radius: 999px; border: 3px solid ${LINE}; opacity: 0; }
      #a0 { left: 40px } #a1 { left: 300px } #a2 { left: 500px } #a3 { left: 720px }

      /* s3: el chat */
      .bub { position: absolute; max-width: 560px; padding: 24px 32px; border-radius: 28px; font-family: "JetBrains Mono"; font-size: 30px; line-height: 1.3; opacity: 0; }
      #b0 { right: 40px; top: 110px; background: ${MINT}; color: ${BG}; border-bottom-right-radius: 6px; }
      #b1 { left: 150px; top: 250px; background: ${BG}; color: ${INK}; border: 3px solid ${LINE}; border-bottom-left-radius: 6px; }
      #av { position: absolute; left: 40px; top: 250px; width: 90px; height: 90px; border-radius: 50%; border: 4px solid ${LINE}; background: ${BG}; overflow: hidden; opacity: 0; }
      #av svg { width: 100%; height: 100%; }
      #avx { position: absolute; left: 30px; top: 290px; width: 110px; height: 8px; background: ${GREEN}; transform: rotate(-30deg); transform-origin: left center; }
      #hum { position: absolute; left: 30px; top: 350px; width: 110px; text-align: center; font-family: "JetBrains Mono"; font-size: 22px; letter-spacing: .12em; color: ${MUTE}; opacity: 0; }
      #term { position: absolute; left: 40px; top: 400px; width: 856px; height: 120px; border-radius: 18px; background: ${BG}; border: 4px solid ${GREEN}; font-family: "JetBrains Mono"; font-size: 34px; color: ${GREEN}; padding: 36px 30px; opacity: 0; }
      #term i { display: inline-block; width: 20px; height: 40px; background: ${GREEN}; vertical-align: middle; margin-left: 6px; }
      #term span { color: ${MUTE}; margin-left: 40px; font-size: 26px; letter-spacing: .18em; }
      .pill { position: absolute; top: 1110px; font-family: "JetBrains Mono"; font-weight: 700; font-size: 30px; letter-spacing: .12em; padding: 16px 28px; border-radius: 999px; color: ${BG}; z-index: 45; }
      #p1 { left: 200px; background: ${GREEN}; }

      /* transición: persianas de terminal */
      #wipe { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
      #wipe i { position: absolute; left: 0; width: 1080px; height: 242px; background: ${GREEN}; transform: scaleX(0); transform-origin: left center; }
      #wipe i:nth-child(even) { background: ${MINT}; }
      #wipe i:nth-child(1) { top: 0px; } #wipe i:nth-child(2) { top: 240px; } #wipe i:nth-child(3) { top: 480px; } #wipe i:nth-child(4) { top: 720px; } #wipe i:nth-child(5) { top: 960px; } #wipe i:nth-child(6) { top: 1200px; } #wipe i:nth-child(7) { top: 1440px; } #wipe i:nth-child(8) { top: 1680px; }

      /* portada y cierre */
      #intro, #outro { z-index: 50; background: ${BG}; }
      .k { position: absolute; left: 72px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
      <svg id="dots" viewBox="0 0 1240 2080">${dots}</svg>
      <div id="halo"></div>

      <div class="chip" id="chipL"><i id="live"></i>SESIÓN 2 · 3 SEP</div>
      <div class="chip" id="chipR">@hectorbliss</div>

      <div id="facewrap">
        <video class="clip" id="face-video" data-start="${BO}" data-duration="${BODY}" src="assets/face.mp4" muted playsinline preload="auto"></video>
      </div>
      <div id="byline">Héctorbliss · <b>taller de sistemas agénticos</b></div>

      <!-- karaoke -->
      ${lineEls}

      <!-- escenario -->
      <div id="stage">
        <div class="scene" id="s0" style="opacity:0">
          <div class="tag mute">EL VIAJE DEL MENSAJE</div>
          <div class="node" id="n0">NAVE-<br />GADOR</div>
          <div class="node" id="n1">BACKEND</div>
          <div class="node" id="n2">LA CAJA</div>
          <div class="thin" id="t0"></div><div class="thin" id="t1"></div>
          <div class="lbl" id="t0l">SSE</div><div class="lbl" id="t1l">POST</div>
          <div id="pipe"></div>
          <div id="ws">WS</div>
          <div id="badge">EasyBits</div>
        </div>
        <div class="scene" id="s1">
          <div class="tag">LA CONEXIÓN</div>
          <div class="end" id="e0">UI</div><div class="end" id="e1">CAJA</div>
          <div id="tube">
            <div class="lane" id="la0"></div><div class="lane" id="la1"></div><div class="lane" id="la2"></div>
            <div class="pk" id="pk0"></div><div class="pk g" id="pk1"></div><div class="pk" id="pk2"></div>
            <div class="pk g" id="pk3"></div><div class="pk" id="pk4"></div><div class="pk g" id="pk5"></div>
          </div>
          <div class="chipx" id="x0">PERSISTENTE</div><div class="chipx" id="x1">MULTIPLEXADA</div><div class="chipx" id="x2">DOS VÍAS</div>
        </div>
        <div class="scene" id="s2">
          <div class="tag mute">EL MISTERIO</div>
          <div id="stamp">ABURRIDO</div>
          <div id="codewrap"><div id="code"><b>new</b> WebSocket(url)</div></div>
          <div class="app" id="a0">WhatsApp</div><div class="app" id="a1">Slack</div><div class="app" id="a2">Discord</div><div class="app" id="a3">tu chat</div>
        </div>
        <div class="scene" id="s3">
          <div class="tag mute">SIGUE SIENDO UN CHAT</div>
          <div class="bub" id="b0">háblame de acp.ts, línea 247</div>
          <div id="av"><svg viewBox="0 0 90 90"><circle cx="45" cy="34" r="16" fill="${MUTE}"/><path d="M14 84 C14 58 76 58 76 84 Z" fill="${MUTE}"/></svg></div>
          <div id="avx" style="opacity:0"></div>
          <div id="hum">HUMANO</div>
          <div class="bub" id="b1">Claro: ahí se abre la sesión ACP…</div>
          <div id="term">$ ghosty<i></i><span>UN PROCESO EN LA CAJA</span></div>
        </div>
      </div>
      <div class="pill" id="p1">un proceso</div>

      <!-- portada: completa en el cuadro 0 -->
      <div class="clip" id="intro" data-start="0" data-duration="${(BO + 0.2).toFixed(2)}">
        <svg style="position:absolute;left:-80px;top:-80px;width:1240px;height:2080px;fill:${MINT};opacity:.16" viewBox="0 0 1240 2080">${dots}</svg>
        <div class="serif k" id="i1" style="top:300px;font-size:88px;color:${MINT};line-height:1">El misterio se acabó:</div>
        <div class="k" id="i2" style="top:400px;font-size:190px;line-height:.9;color:${INK};letter-spacing:-.04em">ES UN</div>
        <div class="k" id="i5" style="top:590px;font-size:118px;line-height:.92;color:${GREEN};letter-spacing:-.04em;padding:14px 30px;border:12px solid ${GREEN};border-radius:26px;transform:rotate(-5deg);transform-origin:left center">WEBSOCKET</div>
        <div class="serif k" id="i4" style="top:880px;font-size:76px;color:${MUTE};line-height:1.15;width:920px">Como cualquier chat, nada más<br />que te responde un proceso.</div>
        <div id="i3" style="position:absolute;left:60px;top:1110px;width:520px;height:16px;background:${GREEN};transform:rotate(-3deg);transform-origin:left center"></div>
        <div id="i6" style="position:absolute;right:72px;top:1230px;width:420px;height:392px;border-radius:36px;border:6px solid ${MINT};overflow:hidden;transform:rotate(3deg)"><img src="assets/face-still.png" style="width:100%;height:100%;object-fit:cover" /></div>
        <div class="mono k" id="i7" style="top:1300px;font-size:34px;line-height:1.55;color:${MUTE};width:480px">Taller de sistemas agénticos<br />Sesión 2 · 3 sep 2026<br /><span style="color:${INK}">Héctorbliss</span></div>
      </div>

      <!-- cierre -->
      <div class="clip" id="outro" data-start="${OUT_IN}" data-duration="${(TOTAL - OUT_IN).toFixed(2)}">
        <svg style="position:absolute;left:-80px;top:-80px;width:1240px;height:2080px;fill:${MINT};opacity:.16" viewBox="0 0 1240 2080">${dots}</svg>
        <div class="serif k" id="o1" style="right:72px;top:300px;font-size:66px;color:${MINT};line-height:1.15">«Es un WebSocket, como cualquier chat.<br />Nada más que en lugar de un humano,<br />te responde un proceso en la caja.»</div>
        <div id="o2" style="position:absolute;left:72px;right:72px;top:600px;height:3px;background:${LINE};transform-origin:left center"></div>
        <div class="k" style="top:680px;right:72px">
          <div id="o3" class="mono" style="font-size:34px;letter-spacing:.2em;color:${MUTE}">TALLER EN VIVO · 6 SESIONES</div>
          <div id="o4" style="margin-top:34px;font-size:118px;line-height:.94;color:${INK};letter-spacing:-.035em">SISTEMAS<br />AGÉNTICOS</div>
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
      const MINT = "${MINT}", GREEN = "${GREEN}", INK = "${INK}", MUTE = "${MUTE}", LINE = "${LINE}", BG = "${BG}";

      // ---- fondo vivo
      tl.to("#dots", { x: 80, y: 80, duration: 12, ease: "none", repeat: Math.ceil(TOTAL / 12) - 1 }, 0);
      tl.to("#halo", { scale: 1.15, duration: 3, ease: "sine.inOut", yoyo: true, repeat: Math.ceil(TOTAL / 3) }, 0);
      tl.to("#live", { opacity: .25, duration: .6, ease: "sine.inOut", yoyo: true, repeat: Math.ceil(TOTAL / .6) }, 0);

      // ---- portada: ya está completa; solo se mueve
      tl.to("#i2", { x: 18, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i5", { rotate: -3, duration: 2.6, ease: "sine.inOut" }, 0);
      tl.to("#i3", { scaleX: 1.35, duration: 2.2, ease: "power2.inOut" }, .3);
      tl.to("#i6", { rotate: 1, y: -10, duration: 2.6, ease: "sine.inOut" }, 0);

      // ---- persianas: cierran en cascada, tapan el corte y abren del otro lado
      const wipe = (t) => {
        tl.to("#wipe i", { scaleX: 1, duration: .32, stagger: .045, ease: "power3.in" }, t);
        tl.set("#wipe i", { transformOrigin: "right center" }, t + .32 + .045 * 7);
        tl.to("#wipe i", { scaleX: 0, duration: .32, stagger: .045, ease: "power3.out" }, t + .34 + .045 * 7);
      };
      wipe(3.85);
      wipe(OUT_IN - .62);

      // ---- cuerpo: la cara respira y da golpes con las palabras clave
      tl.fromTo("#facewrap", { rotate: -2.5 }, { rotate: -1, duration: 4, ease: "sine.inOut", yoyo: true, repeat: Math.ceil(BODY / 4) }, BO);
      const punch = (t) => tl.to("#facewrap", { scale: 1.06, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }, BO + t);
      [14.8, 24.0, 25.8, 34.95].forEach(punch);

      // ---- escenario
      tl.set(["#s1", "#s2", "#s3"], { opacity: 0, y: 30 }, 0).set("#p1", { opacity: 0, scale: .5 }, 0).set(".lane", { scaleX: 0 }, 0).set("#stamp", { scale: 2.4 }, 0).set("#pipe", { scaleX: 0 }, 0);
      // s0 · el viaje: backend (1.27) → se comunica (5.16) → Goose / Ghosty Light → EasyBits (11.4) → WebSocket (14.8)
      tl.to("#s0", { opacity: 1, duration: .5, ease: "power3.out" }, BO);
      tl.to("#n1", { borderColor: GREEN, duration: .3 }, BO + 1.27);
      tl.to(["#t0", "#t1"], { backgroundColor: MINT, duration: .3, stagger: .1 }, BO + 1.8);
      tl.to("#pipe", { scaleX: 1, duration: .5, ease: "power2.out" }, BO + 5.16); // "se comunica"
      tl.to("#n2", { borderColor: GREEN, duration: .3 }, BO + 5.6);
      tl.to("#n2", { textContent: "GOOSE", duration: .01 }, BO + 6.7);
      tl.to("#n2", { textContent: "GHOSTY LIGHT", duration: .01 }, BO + 8.68);
      tl.to("#badge", { opacity: 1, duration: .01 }, BO + 11.4).fromTo("#badge", { scale: .6 }, { scale: 1, duration: .4, ease: "back.out(2)" }, BO + 11.4); // "EasyBits"
      tl.to("#badge", { textContent: "Fly.io", duration: .01 }, BO + 12.6).to("#badge", { textContent: "tu VPS", duration: .01 }, BO + 13.3).to("#badge", { textContent: "cualquiera", duration: .01 }, BO + 13.9);
      tl.to("#ws", { opacity: 1, duration: .01 }, BO + 14.8).fromTo("#ws", { scale: 2, rotate: -8 }, { scale: 1, rotate: -4, duration: .4, ease: "back.out(1.8)" }, BO + 14.8); // "WebSocket"
      tl.to("#pipe", { scaleY: 1.6, duration: .15, yoyo: true, repeat: 3 }, BO + 14.8);
      // s1 · "hay una conexión" (16.6)
      const S1 = BO + 16.6;
      tl.to("#s0", { opacity: 0, y: -40, duration: .35 }, S1).to("#s1", { opacity: 1, y: 0, duration: .5, ease: "power3.out" }, S1 + .1);
      tl.to("#tube", { borderColor: GREEN, duration: .3 }, BO + 18.1); // "persistente"
      tl.to("#x0", { opacity: 1, duration: .3 }, BO + 18.1);
      tl.to(".lane", { scaleX: 1, duration: .4, stagger: .1, ease: "power2.out" }, BO + 19.05); // "multiplexada"
      tl.to("#x1", { opacity: 1, duration: .3 }, BO + 19.3);
      tl.to("#x2", { opacity: 1, duration: .3 }, BO + 20.98); // "dos vías"
      tl.to(["#pk0", "#pk2", "#pk4"], { x: 620, duration: 1.4, ease: "none", stagger: .3, repeat: 4 }, BO + 20.98);
      tl.to(["#pk1", "#pk3", "#pk5"], { x: -620, duration: 1.4, ease: "none", stagger: .3, repeat: 4 }, BO + 21.1);
      // s2 · "por eso les digo que se volvió aburrido" (23.4)
      const S2 = BO + 23.3;
      tl.to("#s1", { rotateX: 90, opacity: 0, transformOrigin: "center bottom", duration: .45, ease: "power2.in" }, S2)
        .fromTo("#s2", { rotateX: -90, transformOrigin: "center top" }, { rotateX: 0, opacity: 1, y: 0, duration: .55, ease: "back.out(1.2)" }, S2 + .4);
      tl.set("#s1", { opacity: 0 }, S2 + .5);
      tl.to("#stamp", { opacity: 1, scale: 1, duration: .3, ease: "power4.in" }, BO + 24.0); // "aburrido"
      tl.to("#s2", { x: 6, duration: .05, yoyo: true, repeat: 5 }, BO + 24.3);
      tl.to("#codewrap", { width: 760, duration: .7, ease: "steps(18)" }, BO + 25.8); // "es un WebSocket"
      tl.to(".app", { opacity: 1, duration: .25, stagger: .12 }, BO + 26.8); // "como cualquier chat"
      // s3 · "eso no deja de ser un chat" (27.9)
      const S3 = BO + 27.9;
      tl.to("#s2", { opacity: 0, y: -40, duration: .35 }, S3 + .4).to("#s3", { opacity: 1, y: 0, duration: .5, ease: "power3.out" }, S3 + .5);
      tl.to("#b0", { opacity: 1, duration: .01 }, S3 + 1.0).from("#b0", { scale: .7, x: 40, duration: .4, ease: "back.out(1.8)" }, S3 + 1.0);
      tl.to("#av", { opacity: 1, duration: .3 }, BO + 31.3); // "te responda"
      tl.to("#b1", { opacity: 1, duration: .01 }, BO + 31.5).from("#b1", { scale: .7, x: -40, duration: .4, ease: "back.out(1.8)" }, BO + 31.5);
      tl.to("#hum", { opacity: 1, duration: .25 }, BO + 32.98); // "un humano"
      tl.set("#avx", { scaleX: 0, opacity: 1 }, BO + 33.6).to("#avx", { scaleX: 1, duration: .25, ease: "power2.out" }, BO + 33.8); // "pues te responde"
      tl.to("#term", { opacity: 1, duration: .01 }, BO + 34.95).from("#term", { y: 40, duration: .4, ease: "back.out(1.6)" }, BO + 34.95); // "proceso"
      tl.to("#term i", { opacity: 0, duration: .35, yoyo: true, repeat: 6 }, BO + 35.2);
      tl.to("#p1", { opacity: 1, scale: 1, duration: .45, ease: "back.out(2)" }, BO + 34.95);

      // ---- karaoke: la línea entra, la palabra en curso salta y se pinta
      const LINES = ${JSON.stringify(lines.map((l, i) => ({ i, start: l.start, words: l.words.map((w, j) => ({ id: `w${i}_${j}`, s: w.start, e: w.end })) })))};
      LINES.forEach((l) => {
        const at = BO + l.start;
        tl.from("#l" + l.i + " .capin", { y: 26, scale: .92, opacity: 0, duration: .24, ease: "back.out(1.6)" }, at);
        l.words.forEach((w) => {
          tl.set("#" + w.id, { color: MUTE, scale: 1 }, at - .01)
            .fromTo("#" + w.id, { scale: 1.22, color: MINT }, { scale: 1, duration: .28, ease: "back.out(2)" }, BO + w.s)
            .set("#" + w.id, { color: INK }, BO + w.e);
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
