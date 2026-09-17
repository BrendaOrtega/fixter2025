// Genera ch0..ch7/index.html (HyperFrames, 1920×1080) a partir de marks.json y scenes.mjs.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { scenes } from "./scenes.mjs";
const marks = JSON.parse(fs.readFileSync("marks.json", "utf8"));
const TOTAL_VOICE = marks.at(-1).start + marks.at(-1).dur + 1.2;
const BG = "#0E1317", MINT = "#85DDCB", MINTDK = "#37AB93", GREEN = "#8DCF6E", INK = "#F2F5F4", GREY = "#7C8A8E", PANEL = "#141C21";
const ANIMS = fs.readFileSync("assets/_anims.css", "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// resaltado mínimo con la paleta dracula (comentarios, cadenas, palabras clave, números, funciones)
const KW = /\b(import|from|export|default|async|function|await|return|const|let|for|if|else|interface|yield|new|of|true|false|null)\b/g;
const hlCode = (l) => {
  if (/^\s*\/\//.test(l)) return `<span class="c">${esc(l)}</span>`;
  const parts = []; let rest = l;
  const re = /("[^"]*"|'[^']*'|`[^`]*`|\/\/.*$)/;
  while (rest.length) { const m = rest.match(re); if (!m) { parts.push(code(rest)); break; } parts.push(code(rest.slice(0, m.index))); parts.push(m[1].startsWith("//") ? `<span class="c">${esc(m[1])}</span>` : `<span class="s">${esc(m[1])}</span>`); rest = rest.slice(m.index + m[1].length); }
  return parts.join("");
};
const code = (t) => esc(t).replace(KW, '<span class="k">$1</span>').replace(/\b(\d+)\b/g, '<span class="n">$1</span>').replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="f">$1</span>');
const WIPE = 0.45; // cortinilla: entra al final del capítulo y sale al inicio del siguiente
// límites de capítulo: empieza 0.8 s antes de su primera frase (mitad del hueco de 1.6 s)
const chStart = (ch) => (ch === 0 ? 0 : Math.round((marks.find((m) => m.ch === ch).start - 0.8) * 30) / 30);
const chEnd = (ch) => (ch === 7 ? Math.round(TOTAL_VOICE * 30) / 30 : chStart(ch + 1));
const sceneEnd = (s, ch) => (s.to + 1 < marks.length && marks[s.to + 1].ch === ch ? marks[s.to + 1].start : chEnd(ch));

const kb = (id) => `tl.fromTo("#${id} img", { scale: 1, x: 0, y: 0 }, { scale: 1.08, x: -30, y: -18, duration: 999, ease: "none" }, 0);`;
const lines = (file) => fs.readFileSync("captures/" + file, "utf8").replace(/\n$/, "").split("\n");
const ghost = (id, t0, dur) => `<div class="ghost" id="${id}-ghost" style="animation: bounce 1.2s ${(t0 + .1).toFixed(2)}s both, jello 1.2s ${(t0 + dur / 2).toFixed(2)}s both;"><img src="assets/ghosty.png"></div>`;

function renderScene(s, ch, idx) {
  const t0 = idx === 0 ? 0 : +(marks[s.from].start - chStart(ch)).toFixed(2); const t1 = +(sceneEnd(s, ch) - chStart(ch)).toFixed(2); const dur = +(t1 - t0).toFixed(2);
  const id = `s${idx}`; const clip = (inner, cls = "") => `<div class="clip scene ${cls}" id="${id}" data-start="${t0}" data-duration="${dur}">${inner}</div>`;
  let tl = "";
  // entrada de escena: la nueva sube 40 px con rebote corto; la anterior ya se fue (data-duration)
  if (idx > 0) tl += `tl.from("#${id} > *", { y: 40, opacity: 0, duration: .38, ease: "back.out(1.4)", immediateRender: false }, ${t0});`;
  if (s.kind === "card") {
    const src = `../cards/${s.src}.preview.mp4`; const out = `assets/card-${s.src}-ch${ch}-${idx}.mp4`;
    const len = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${src}`).toString());
    if (!fs.existsSync(out)) execSync(`ffmpeg -y -loglevel error -i ${src} -vf "tpad=stop_mode=clone:stop_duration=${Math.max(0, dur - len + 1).toFixed(2)}" -an -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p ${out}`);
    return { html: `<video class="clip cardv" id="${id}v" data-start="${t0}" data-duration="${dur}" src="${out}" muted playsinline preload="auto"></video>`, tl };
  }
  if (s.kind === "broll") {
    return { html: `<video class="clip brollv" id="${id}v" data-start="${t0}" data-duration="${dur}" data-media-start="1" src="${s.src}" muted playsinline preload="auto"></video>` + (s.ghost ? clip(ghost(id, t0, dur)) : ""), tl };
  }
  if (s.kind === "web") {
    tl += kb(id);
    return { html: clip(`<div class="panel web"><img src="${s.src}"></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "term" || s.kind === "code") {
    const ls = lines(s.file); const n = ls.length; const step = Math.max(0.12, (dur - 1.2) / n);
    const rows = ls.map((l, i) => `<div class="ln${l.startsWith("$ ") ? " cmd" : ""}" id="${id}l${i}">${(s.kind === "code" ? hlCode(l) : esc(l)) || "&nbsp;"}</div>`).join("");
    if (s.kind === "term") ls.forEach((_, i) => { tl += `tl.to("#${id}l${i}", { opacity: 1, duration: .05 }, ${(t0 + 0.4 + i * step).toFixed(2)});`; });
    else {
      ls.forEach((_, i) => { tl += `tl.to("#${id}l${i}", { opacity: 1, duration: .05 }, ${(t0 + 0.2 + i * 0.06).toFixed(2)});`; });
      for (const [mk, [a, b]] of Object.entries(s.hl || {})) { const t = +(marks[+mk].start - chStart(ch)).toFixed(2); for (let i = a; i <= b; i++) tl += `tl.to("#${id}l${i}", { backgroundColor: "rgba(189,147,249,.22)", duration: .15 }, ${t});`; tl += `tl.to("#${id} .ln", { backgroundColor: "rgba(0,0,0,0)", duration: .15 }, ${t});`.replace(/\.15 \}, (\S+)\);$/, ".15 }, $1 - .01);"); }
    }
    return { html: clip(`<div class="panel term${s.kind === "code" ? " code" : ""}"><div class="bar"><i></i><i></i><i></i><b>${esc(s.title || s.file)}</b></div><div class="body">${rows}</div></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "pieces") {
    const items = [["Vercel Workflows", "estado y checkpoints", 11], ["AI Gateway", "llamadas al modelo", 12], ["Vercel Sandbox", "código aislado", 13], ["Vercel Connect", "MCP y HTTP", 14], ["Chat SDK", "Slack · Discord · WhatsApp · Telegram · Teams · cron · API", 15]];
    const rows = items.map(([a, b, mk], i) => { tl += `tl.to("#${id}p${i}", { opacity: 1, y: 0, duration: .35, ease: "back.out(1.6)" }, ${(marks[mk].start - chStart(ch)).toFixed(2)});`; return `<div class="piece" id="${id}p${i}"><span class="num">${i + 1}</span><div><b>${a}</b><small>${b}</small></div></div>`; }).join("");
    tl += `tl.to("#${id} .pieces-foot", { opacity: 1, duration: .3 }, ${(marks[16].start - chStart(ch)).toFixed(2)});`;
    return { html: clip(`<div class="panel pieces"><h2>Managed · las cinco piezas son de Vercel</h2>${rows}<div class="pieces-foot">Apache 2.0: el código se corre donde sea · Vercel cobra por operar estas cinco</div></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "tree") {
    const items = [["agent/", null], ["├─ instructions.md", 19], ["├─ tools/get_weather.ts", 20], ["├─ skills/plan_a_trip.md", 21], ["├─ channels/slack.ts", 22], ["├─ schedules/weekly_recap.ts", 23], ["├─ memory/profile.ts", 24], ["└─ agent.ts", null]];
    const rows = items.map(([a, mk], i) => { if (mk) tl += `tl.to("#${id}t${i}", { color: "${MINT}", x: 12, duration: .2 }, ${(marks[mk].start - chStart(ch)).toFixed(2)}); tl.to("#${id}t${i}", { color: "${INK}", x: 0, duration: .2 }, ${(marks[mk].start - chStart(ch) + marks[mk].dur).toFixed(2)});`; return `<div class="ln" id="${id}t${i}" style="opacity:1">${esc(a)}</div>`; }).join("");
    tl += `tl.to("#${id} .tree-foot", { opacity: 1, duration: .3 }, ${(marks[25].start - chStart(ch)).toFixed(2)});`;
    return { html: clip(`<div class="panel term tree"><div class="bar"><i></i><i></i><i></i><b>el agente es un directorio</b></div><div class="body big">${rows}<div class="tree-foot">tools/get_weather.ts  →  la tool <b>get_weather</b></div></div></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "levels") {
    [26, 27, 28].forEach((mk, i) => { tl += `tl.to("#${id}v${i}", { opacity: 1, scale: 1, duration: .4, ease: "back.out(1.5)" }, ${Math.max(0.5, marks[mk].start - chStart(ch) - 0.3).toFixed(2)});`; });
    tl += `tl.to("#${id}v2", { boxShadow: "0 0 0 8px ${GREEN}", duration: .3 }, ${(marks[29].start - chStart(ch)).toFixed(2)}); tl.to("#${id}v2 small", { opacity: 1, duration: .2 }, ${(marks[29].start - chStart(ch)).toFixed(2)});`;
    return { html: clip(`<div class="levels"><div class="lv" id="${id}v0"><b>sesión</b><em>la conversación completa · días</em><div class="lv" id="${id}v1"><b>turno</b><em>un mensaje y todo lo que dispara</em><div class="lv" id="${id}v2"><b>step</b><em>una llamada al modelo + sus tools</em><small>= checkpoint</small></div></div></div></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "newagent") {
    // el formulario "Build an agent" de eve.dev, redibujado plano (texto literal de la captura de bliss)
    const ph = "Ayúdame a clasificar mis issues en Linear y crea issues desde las alertas de Vercel y las disputas de Stripe…";
    tl += `tl.to("#${id} .typed", { text: { value: ${JSON.stringify(ph)} }, duration: 3.2, ease: "none" }, ${(t0 + .4).toFixed(2)});`;
    tl += `tl.to("#${id} .btn", { backgroundColor: "${MINT}", color: "${BG}", duration: .2 }, ${(marks[9].start - chStart(ch) + 1.2).toFixed(2)}); tl.to("#${id} .foot", { color: "${MINT}", duration: .2 }, ${(marks[9].start - chStart(ch) + 1.5).toFixed(2)});`;
    return { html: clip(`<div class="panel newagent"><h2>Construye un agente</h2><p>¿Qué debe hacer este agente?</p><div class="box"><span class="typed"></span><span class="cursor"></span><span class="btn">Continuar</span></div><div class="chips"><span>Preguntas a Notion desde Slack</span><span>Clasificar issues de Linear en Slack</span></div><div class="foot">Antes de construir, creas o entras a tu cuenta de Vercel.</div></div>${ghost(id, t0, dur)}`), tl };
  }
  if (s.kind === "hello") {
    return { html: clip(`<div class="hello"><div class="hello-ghost"><img src="assets/ghosty.png"></div><div class="hello-txt"><b>Soy Ghosty</b><span>agentes durables con eve</span></div></div>`), tl };
  }
  if (s.kind === "cta") {
    // entrada con backInUp escalonada (CSS, sin doble "from" que parpadee); sin la entrada genérica de escena
    tl = "";
    const d = (k) => `style="animation: backInUp .8s ${(t0 + .3 + k * .35).toFixed(2)}s both"`;
    return { html: clip(`<div class="cta"><img class="cta-in logo" src="assets/logo.png" ${d(0)}><h1 class="cta-in" ${d(1)}>¿Lo construimos desde cero?</h1><p class="cta-in" ${d(2)}>dímelo en los comentarios</p><p class="cta-in url" ${d(3)}>fixtergeek.com/sistemas-agenticos</p><p class="cta-in sub" ${d(4)}>suscríbete · youtube.com/@fixtergeek</p><div class="ghost big" style="animation: backInUp .8s ${(t0 + 2.1).toFixed(2)}s both, swing 1.5s ${(t0 + 3.2).toFixed(2)}s both, tada 1s ${(t0 + 6).toFixed(2)}s both"><img src="assets/ghosty.png"></div></div>`), tl };
  }
}

for (const ch of Object.keys(scenes).map(Number)) {
  const start = chStart(ch), end = chEnd(ch), TOTAL = +(end - start).toFixed(2);
  let html = "", tl = "";
  scenes[ch].forEach((s, i) => { const r = renderScene(s, ch, i); html += r.html + "\n"; tl += r.tl + "\n"; });
  // karaoke: una frase a la vez; frases largas se parten en la coma más cercana al centro
  const chunks = [];
  marks.filter((m) => m.ch === ch).forEach((m, k, arr) => {
    const t0 = m.start - start; const tEnd = Math.min((arr[k + 1] ? arr[k + 1].start : end) - start, ch < 7 ? TOTAL - 0.95 : TOTAL);
    const ws = m.text.split(" ");
    let parts = [ws];
    if (ws.length > 11) { let best = -1, bd = 99; ws.forEach((w, j) => { if (/[,.;:]$/.test(w) && j < ws.length - 2) { const d = Math.abs(j - ws.length / 2); if (d < bd) { bd = d; best = j; } } }); if (best < 0) best = Math.floor(ws.length / 2) - 1; parts = [ws.slice(0, best + 1), ws.slice(best + 1)]; }
    let off = 0, wi = 0;
    parts.forEach((pw, pi) => { const d = m.dur * pw.length / ws.length; const a = t0 + off; const b = pi === parts.length - 1 ? tEnd : a + d; chunks.push({ id: `c${m.i}_${pi}`, a, b, words: pw, w0: wi, dur: d }); off += d; wi += pw.length; });
  });
  const caps = chunks.map((c) => {
    c.words.forEach((w, j) => { const a = c.a + (c.dur * j) / c.words.length, b = c.a + (c.dur * (j + 1)) / c.words.length; tl += `tl.set("#${c.id}w${j}", { color: "${MINT}" }, ${a.toFixed(2)}); tl.set("#${c.id}w${j}", { color: "${INK}" }, ${b.toFixed(2)});`; });
    return `<div class="clip cap" data-start="${c.a.toFixed(2)}" data-duration="${(c.b - c.a).toFixed(2)}"><div class="capin">${c.words.map((w, j) => `<span class="w" id="${c.id}w${j}">${esc(w)}</span>`).join(" ")}</div></div>`;
  }).join("\n");
  // cortinilla: variante A (rebanadas diagonales, izquierda→derecha) en capítulos pares; B (barras verticales que caen) en impares.
  // Cubre por completo los últimos 0.15 s del capítulo y los primeros 0.1 s del siguiente; Ghosty sella en 3 y 6.
  const varA = (k) => { const i = k - 1; return `<polygon class="slice" points="-200,${i * 200 - 100} 2200,${i * 200 - 330} 2200,${i * 200 - 60} -200,${i * 200 + 170}" fill="${[MINT, GREEN, INK][k % 3]}"/>`; };
  const varB = (k) => `<rect class="slice" x="${k * 240}" y="-20" width="244" height="1120" fill="${[MINT, GREEN, INK][k % 3]}"/>`;
  const outVar = ch % 2 === 0 ? "A" : "B", inVar = (ch - 1) % 2 === 0 ? "A" : "B";
  const slicesOut = Array.from({ length: 8 }, (_, k) => (outVar === "A" ? varA(k) : varB(k))).join("");
  const slicesIn = Array.from({ length: 8 }, (_, k) => (inVar === "A" ? varA(k) : varB(k))).join("");
  const seal = [3, 6].includes(ch) ? `<image href="assets/ghosty.png" id="seal" x="810" y="290" width="300" height="348"/>` : "";
  const sealIn = [4, 7].includes(ch) ? `<image href="assets/ghosty.png" id="sealin" x="810" y="290" width="300" height="348"/>` : "";
  // Movimiento por traslación (no por escala): sin temblor. 0.55 s con power2.inOut; las rebanadas van escalonadas 0.035 s.
  const axisIn = inVar === "A" ? "x" : "y", offIn = inVar === "A" ? 2500 : 1200;
  const axisOut = outVar === "A" ? "x" : "y", offOut = outVar === "A" ? -2500 : -1200;
  if (ch > 0) {
    tl += ``;
    if (sealIn) tl += `tl.set("#sealin", { scale: 1, transformOrigin: "50% 50%" }, 0.001); tl.to("#sealin", { scale: 0, duration: .3, ease: "back.in(1.8)" }, 0.05);`;
    tl += `tl.to("#wipein .slice", { ${axisIn}: ${offIn}, duration: .55, stagger: .035, ease: "power2.inOut" }, 0.1); tl.set("#wipein", { opacity: 0 }, 0.95);\n`;
  } else tl += ``;
  if (ch < 7) {
    const W0 = +(TOTAL - 0.95).toFixed(2);
    tl += `tl.set("#wipeout .slice", { ${axisOut}: ${offOut} }, 0.001); tl.set("#wipeout", { opacity: 1 }, ${W0}); tl.to("#wipeout .slice", { ${axisOut}: 0, duration: .55, stagger: .035, ease: "power2.inOut" }, ${W0});`;
    if (seal) tl += `tl.set("#seal", { scale: 0, transformOrigin: "50% 50%" }, 0.001); tl.to("#seal", { scale: 1, duration: .3, ease: "back.out(2)" }, ${(W0 + .55).toFixed(2)});`;
    tl += "\n";
  } else tl += `tl.set("#wipeout", { opacity: 0 }, 0.001);\n`;
  const page = `<!doctype html>
<html lang="es" data-resolution="landscape"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1920, height=1080" />
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/TextPlugin.min.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1920px; height:1080px; overflow:hidden; background:${BG}; }
body { font-family:"Space Mono", monospace; color:${INK}; background-image: radial-gradient(#1C262B 2.2px, transparent 2.2px); background-size: 48px 48px; }
.clip { position:absolute; inset:0; }
${ANIMS}
.cardv { object-fit: contain; width:1600px; height:900px; left:160px; top:0; inset:auto; position:absolute; }
.brollv { object-fit: cover; width:1920px; height:900px; inset:auto; position:absolute; left:0; top:0; }
.panel { position:absolute; left:160px; top:40px; width:1600px; height:840px; border:5px solid ${INK}; border-radius:16px; background:${PANEL}; overflow:hidden; box-shadow: 14px 14px 0 ${BG}; }
.panel.web img { width:100%; height:100%; object-fit:cover; object-position: top; display:block; transform-origin: 50% 50%; }
.term .bar { height:52px; background:${INK}; display:flex; align-items:center; padding:0 20px; gap:12px; }
.term .bar i { width:16px; height:16px; border-radius:50%; background:${GREY}; display:block; } .term .bar i:nth-child(1){ background:${BG}; } .term .bar i:nth-child(3){ background:${MINT}; }
.term .bar b { color:${BG}; font-size:20px; margin-left:auto; margin-right:auto; }
.term .body { padding:26px 34px; font-size:25px; line-height:1.55; white-space:pre; }
.term .body.big { font-size:40px; line-height:1.5; }
.term.code .body { font-size:22px; line-height:1.38; background:#282a36; color:#f8f8f2; } .term.code .ln { color:#f8f8f2; }
.code .c { color:#6272a4; } .code .s { color:#f1fa8c; } .code .k { color:#ff79c6; } .code .n { color:#bd93f9; } .code .f { color:#50fa7b; }
.ln { opacity:0; border-radius:6px; padding:0 8px; margin:0 -8px; color:${INK}; }
.ln.cmd { color:${MINT}; }
.tree-foot, .pieces-foot { opacity:0; margin-top:28px; color:${GREY}; font-size:28px; white-space:normal; } .tree-foot b { color:${GREEN}; }
.pieces { padding:36px 70px; } .pieces h2 { font-family:"Big Shoulders Display"; font-size:52px; margin-bottom:18px; color:${INK}; }
.piece { display:flex; align-items:center; gap:24px; padding:10px 22px; margin-bottom:10px; border:4px solid ${MINT}; border-radius:12px; background:${BG}; opacity:0; transform: translateY(20px); }
.piece .num { width:56px; height:56px; border-radius:12px; background:${MINT}; color:${BG}; font-weight:700; font-size:30px; display:flex; align-items:center; justify-content:center; }
.piece b { font-size:30px; display:block; } .piece small { font-size:20px; color:${GREY}; }
.pieces-foot { font-size:22px; margin-top:10px; }
.levels { position:absolute; left:160px; top:60px; width:1600px; height:800px; display:flex; align-items:center; justify-content:center; }
.lv { border:5px solid ${MINT}; border-radius:20px; padding:30px 40px; background:${PANEL}; opacity:0; transform: scale(.9); width:100%; }
.lv > .lv { margin-top:20px; border-color:${GREEN}; } .lv > .lv > .lv { border-color:${INK}; }
.lv b { font-family:"Big Shoulders Display"; font-size:52px; display:block; } .lv em { font-style:normal; color:${GREY}; font-size:26px; } .lv small { display:block; margin-top:8px; color:${GREEN}; font-size:30px; font-weight:700; opacity:0; }
.ghost { position:absolute; left:1750px; top:700px; width:150px; height:174px; transform-origin: 50% 100%; } .ghost img { width:100%; height:100%; object-fit:contain; display:block; }
.newagent { padding:70px 90px; } .newagent h2 { font-family:"Big Shoulders Display"; font-size:72px; margin-bottom:30px; } .newagent p { font-size:34px; color:${GREY}; margin-bottom:22px; }
.newagent .box { position:relative; border:4px solid ${GREY}; border-radius:14px; height:300px; padding:28px; font-size:34px; color:${INK}; line-height:1.4; } .newagent .cursor { display:inline-block; width:4px; height:38px; background:${INK}; vertical-align:-6px; margin-left:4px; }
.newagent .btn { position:absolute; right:24px; bottom:24px; border:3px solid ${GREY}; border-radius:12px; padding:12px 30px; color:${GREY}; font-size:30px; }
.newagent .chips { margin-top:26px; display:flex; gap:16px; } .newagent .chips span { border:3px solid ${INK}; border-radius:999px; padding:10px 24px; font-size:26px; }
.newagent .foot { margin-top:40px; color:${GREY}; font-size:28px; text-align:center; }
.hello { position:absolute; left:0; top:0; width:1920px; height:900px; display:flex; align-items:center; justify-content:center; gap:80px; }
.hello-ghost { width:420px; height:487px; transform-origin: 50% 100%; animation: jello 1.4s .2s both, swing 1.4s 1.9s both; } .hello-ghost img { width:100%; height:100%; object-fit:contain; }
.hello-txt b { display:block; font-family:"Big Shoulders Display"; font-size:150px; line-height:1; color:${INK}; } .hello-txt span { font-size:40px; color:${MINT}; }
.cta { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding-bottom:180px; }
.cta .logo { width:560px; filter: drop-shadow(0 0 14px rgba(133,221,203,.9)); }
.cta h1 { font-family:"Big Shoulders Display"; font-size:84px; } .cta p { font-size:32px; color:${GREY}; } .cta .url { color:${MINT}; font-size:44px; font-weight:700; } .cta .sub { color:${GREEN}; }
.cta .ghost.big { position:absolute; left:1560px; top:560px; width:220px; height:255px; } .cta-in { animation-fill-mode: both; }
.cap { top:905px; bottom:auto; height:175px; display:flex; align-items:center; justify-content:center; padding:0 120px; z-index:20; }
.capin { font-family:"Big Shoulders Display"; font-weight:900; font-size:64px; line-height:1.05; text-align:center; text-transform:uppercase; letter-spacing:1px; text-shadow: 4px 4px 0 ${BG}; }
.w { color:${GREY}; }
.wipe { position:absolute; inset:0; z-index:50; opacity:0; } .slice { transform-box: fill-box; }
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
${html}
${caps}
<svg id="wipeout" class="wipe" width="1920" height="1080" viewBox="0 0 1920 1080">${slicesOut}${seal}</svg>
<svg id="wipein" class="wipe" style="opacity:${ch > 0 ? 1 : 0}" width="1920" height="1080" viewBox="0 0 1920 1080">${slicesIn}${sealIn}</svg>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${tl}
tl.set({}, {}, ${TOTAL});
window.__timelines["main"] = tl;
</script></body></html>`;
  fs.mkdirSync(`ch${ch}`, { recursive: true });
  fs.writeFileSync(`ch${ch}/index.html`, page);
  fs.writeFileSync(`ch${ch}/hyperframes.json`, fs.readFileSync("../cards/01-congelado/hyperframes.json"));
  fs.writeFileSync(`ch${ch}/package.json`, JSON.stringify({ name: `eve-long-ch${ch}`, private: true, type: "module" }));
  for (const d of ["assets", "captures", "broll"]) { try { fs.symlinkSync("../" + d, `ch${ch}/${d}`); } catch {} }
  console.log(`ch${ch}: ${start} → ${end} (${TOTAL} s)`);
}
