/* ghosty-rig — gestos de Ghosty sobre una timeline GSAP pausada (HyperFrames).
 *
 * Uso:
 *   const rig = GhostyRig.create(tl, { root: "#stage", shadow: "#gShadow", floorY: 600 });
 *   rig.place(640, 600, 1.5);          // pie (base de los olanes) en x, y; escala
 *   rig.idle(0, 6).blink(0.3).look(0.6, "left").hop(2).happy(2).proud(3).shy(4).wave(5).exit(5.5);
 *   rig.finalize(6.7);                 // agrega el driver; SIEMPRE al final
 *   window.__sfxCues = rig.cues;
 *
 * Todo es determinista: la pose del cuerpo es función pura del tiempo (un driver ease:"none" con onUpdate),
 * y ojos/accesorios son tweens dentro de la misma timeline. Nada de rAF, Date, Math.random ni repeat:-1.
 * Las piezas se buscan por id DENTRO de `root`, así que dos Ghostys en la misma página pueden convivir si cada
 * uno vive en su propio <svg> (pasa ese <svg> como root).
 */
(function (G) {
  "use strict";
  // pivotes en coordenadas del vector oficial (viewBox 48 22 160 190)
  const BASE = [128, 208], EYES = [128, 76], EYE_L = [108, 76], EYE_R = [157, 76], RIG_C = [128, 117];
  // escala alrededor de un punto, como atributo transform (no depende del <svg> que lo contiene)
  const about = ([ox, oy], sx, sy) => `translate(${ox} ${oy}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-ox} ${-oy})`;
  const DIRS = {
    center: [0, 0], left: [-7, 0], right: [7, 0], up: [0, -6], down: [0, 7],
    upLeft: [-6, -5], upRight: [6, -5], downLeft: [-7, 6], downRight: [7, 6],
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const EASES = {
    inOut: (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1)),
    in: (u) => clamp(u, 0, 1) ** 2,            // caída con gravedad
    out: (u) => 1 - (1 - clamp(u, 0, 1)) ** 2, // despegue
  };
  // envolvente: sube en a, se sostiene hasta d, baja en b
  const env = (t, t0, d, a, b) => {
    if (t < t0 || t > t0 + d + b) return 0;
    if (t < t0 + a) return smooth((t - t0) / a);
    if (t < t0 + d) return 1;
    return 1 - smooth((t - t0 - d) / b);
  };

  let RIG_UID = 0;
  // punto de un camino [[x, y], …] en u ∈ [0, 1] (Catmull-Rom uniforme; tramos de igual tiempo)
  const pathAt = (pts, u) => {
    if (pts.length === 1) return pts[0].slice();
    const n = pts.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), w = f - i;
    const P = (k) => pts[clamp(k, 0, n)], p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * w + (2 * a - 5 * b + 4 * c - d) * w * w + (-a + 3 * b - 3 * c + d) * w * w * w);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };

  function create(tl, opts = {}) {
    const q = (s) => (typeof s === "string" ? document.querySelector(s) : s);
    const root = q(opts.root || document);
    const $ = (id) => root.querySelector("#" + id);
    const el = {
      hop: $("gHop"), sq: $("gSq"), rig: $("gRig"), body: $("gBody"), eyes: $("gEyes"), pup: $("gPup"),
      eyeL: $("eyeL"), eyeR: $("eyeR"), happyL: $("gHappyL"), happyR: $("gHappyR"), gl: $("gGl"),
    };
    for (const k in el) if (!el[k]) throw new Error("ghosty-rig: falta la pieza " + k);
    const shadow = opts.shadow ? q(opts.shadow) : null;
    const floorY = opts.floorY ?? null;

    const SEGS = [], HOPS = [], IMPACTS = [], CROUCH = [], FLOATS = [], ROCKS = [], POSES = [], EXCITE = [];
    const cues = [];
    let home = { x: 0, y: 0, s: 1 };
    const cue = (t, sfx, gesture) => cues.push({ t: +t.toFixed(3), sfx, gesture });

    // ---- trayectoria base (sólo SEGS + HOPS): de aquí sale la velocidad ----
    let ready = false;
    const at = (t, x, y, s) => SEGS.push({ t0: t, t1: t, to: { x, y, s }, arc: 0, ease: "inOut" });
    const resolve = () => {
      SEGS.sort((a, b) => a.t0 - b.t0);
      let prev = null;
      for (const g of SEGS) {
        if (prev && g.t0 < prev.cut) prev.cut = g.t0;
        g.cut = g.t1;
        g.from = prev ? segAt(prev, Math.min(g.t0, prev.cut)) : { ...g.to };
        prev = g;
      }
      ready = true;
    };
    const segAt = (g, t) => {
      if (g.t1 <= g.t0 || t >= g.t1) return { ...g.to };
      const u = (t - g.t0) / (g.t1 - g.t0), e = EASES[g.ease](u), f = g.from;
      return {
        x: f.x + (g.to.x - f.x) * e,
        y: f.y + (g.to.y - f.y) * e - g.arc * Math.sin(Math.PI * u),
        s: f.s + (g.to.s - f.s) * e,
      };
    };
    const motion = (t) => {
      let g = SEGS[0];
      for (const x of SEGS) { if (x.t0 <= t) g = x; else break; }
      const st = segAt(g, Math.min(t, g.cut));
      for (const h of HOPS) if (t > h.t && t < h.t + h.dur) { const v = (t - h.t) / h.dur; st.y -= h.h * 4 * v * (1 - v); }
      return st;
    };
    const vel = (t) => { const a = motion(t - 1 / 60), b = motion(t + 1 / 60); return { x: (b.x - a.x) * 30, y: (b.y - a.y) * 30 }; };

    // ---- olanes: se mecen desde su unión; la forma oficial no cambia (amp 0 = trazo oficial exacto) ----
    const D = el.body.getAttribute("d");
    const TOK = D.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
    const hem = (dx, t, amp, droop = 0) => {
      const out = []; let cmd = "", buf = [];
      for (const k of TOK) {
        if (/[A-Za-z]/.test(k)) { cmd = k; out.push(k); continue; }
        if (cmd === "H") { out.push((+k).toFixed(3)); continue; }
        buf.push(+k);
        if (buf.length === 2) {
          const [x, y] = buf; buf = [];
          const i = x > 156 ? 0 : x > 120 ? 1 : 2, ph = 2 * Math.PI * 0.9 * t - i * 1.15;
          const w = smooth((y - 184) / 22);
          out.push((x + dx * smooth((y - 120) / 88) + amp * Math.sin(ph) * w).toFixed(3) + " " + (droop ? y + amp * 0.45 * Math.cos(ph) * w + droop * w : y + amp * 0.45 * Math.cos(ph) * w).toFixed(3));
        }
      }
      return out.join(" ");
    };

    const render = (t) => {
      if (!ready) resolve();
      const m = motion(t), v = vel(t), lag = vel(t - 0.09);
      const sp = Math.hypot(v.x, v.y), spLag = Math.hypot(lag.x, lag.y);
      let x = m.x, y = m.y, s = m.s, r = 0, idleAmp = 0;
      // flotación finita, se apaga si vuela
      const calm = 1 - Math.min(1, sp / 500);
      for (const f of FLOATS) if (t > f.t0 && t < f.t1) {
        const e = smooth((t - f.t0) / 0.4) * smooth((f.t1 - t) / 0.4) * calm, w = (2 * Math.PI * (t - f.t0)) / f.period;
        y += f.amp * Math.sin(w) * e; x += f.amp * 0.35 * Math.sin(w / 1.5) * e; idleAmp += 0.8 * e;
      }
      for (const p of POSES) { const e = env(t, p.t, p.d, p.a, p.b); r += p.r * e; s *= 1 + (p.s - 1) * e; y += p.dy * e; }
      for (const k of ROCKS) if (t > k.t && t < k.t + k.d) { const u = (t - k.t) / k.d; r += k.deg * Math.sin(2 * Math.PI * k.times * u) * Math.sin(Math.PI * u); }
      r += clamp(lag.x * 0.006, -9, 9); // se inclina con la velocidad, con retraso
      // v2: poses extra (microemociones). Sin gestos v2, XP está vacío y nada de esto corre.
      let xp = null, xl = null;
      if (XP.length) { xp = extra(t); xl = extra(t - 0.09); x += xp.dx; y += xp.dy; r += xp.r; s *= xp.s; }
      el.hop.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-BASE[0]} ${-BASE[1]})`);
      // estirón A LO LARGO del movimiento, área constante, máximo 6 %
      const k = 1 + Math.min(0.06, sp * 0.00004), a = (Math.atan2(v.y, v.x) * 180) / Math.PI;
      el.rig.setAttribute("transform", `translate(${RIG_C[0]} ${RIG_C[1]}) rotate(${a.toFixed(2)}) scale(${k.toFixed(4)} ${(1 / k).toFixed(4)}) rotate(${(-a).toFixed(2)}) translate(${-RIG_C[0]} ${-RIG_C[1]})`);
      // squash: anticipación (se agacha) + contacto (aplasta y rebota amortiguado)
      let c = 0;
      for (const cr of CROUCH) if (t > cr.t && t < cr.t + cr.d) c += cr.k * Math.sin((Math.PI / 2) * ((t - cr.t) / cr.d));
      for (const im of IMPACTS) if (t > im.t && t < im.t + 0.7) { const d = t - im.t; c += im.k * Math.exp(-d / 0.12) * Math.cos((2 * Math.PI * d) / 0.34); }
      let sx = 1;
      if (xp) { c += xp.c; sx = xp.sx; }
      el.sq.setAttribute("transform", `translate(${BASE[0]} ${BASE[1]}) scale(${(sx / (1 - c)).toFixed(4)} ${(1 - c).toFixed(4)}) translate(${-BASE[0]} ${-BASE[1]})`);
      // los lentes llegan tarde (follow-through vertical)
      const glY = clamp(-lag.y * 0.006, -5, 5) + c * 40 + (xp ? clamp((xl.dy - xp.dy) * 0.5, -4, 4) : 0);
      el.gl.setAttribute("transform", `translate(0 ${glY.toFixed(2)})`);
      // sombra del piso: se encoge con la altura
      if (shadow && floorY !== null) {
        const h = Math.max(0, floorY - y), sc = 1 - clamp(h / 420, 0, 0.6);
        shadow.setAttribute("transform", `translate(${x.toFixed(2)} ${floorY}) scale(${(sc * s * (1 / (1 - c))).toFixed(4)} ${(sc * s).toFixed(4)})`);
        shadow.setAttribute("opacity", (h > 700 ? 0 : 1).toString());
      }
      // olanes
      let ex = 0;
      for (const e of EXCITE) if (t > e.t && t < e.t + e.d) ex += e.k * Math.sin((Math.PI * (t - e.t)) / e.d);
      const drag = clamp(-lag.x * 0.007, -10, 10);
      if (xp) {
        // v2: los olanes llegan tarde a las poses nuevas (overlap) y se apagan si está triste
        const xd = clamp(drag + (xl.dx - xp.dx) * 0.45 + (xl.r - xp.r) * 0.35, -10, 10);
        const amp = (1.2 + idleAmp + Math.min(2, spLag * 0.0015) + ex * 1.5 + xp.amp) * (1 - clamp(xp.limp, 0, 0.85));
        el.body.setAttribute("d", hem(xd, t, amp, xp.droop));
      } else el.body.setAttribute("d", hem(drag, t, 1.2 + idleAmp + Math.min(2, spLag * 0.0015) + ex * 1.5));
    };

    // ---- cara y accesorios: GSAP anima objetos proxy y applyFace escribe los atributos transform ----
    // (svgOrigin de GSAP se mide en el <svg> raíz: con Ghosty movido dentro de un escenario, el pivote se corre)
    // v2: kL/kR escala del ojo, tL/tR giro del ojo (°), uL/uR párpado superior (0–1), wL/wR inferior, aL/aR inclinación del superior (°)
    const face = { blink: 1, lidL: 1, lidR: 1, px: 0, py: 0, kL: 1, kR: 1, tL: 0, tR: 0, uL: 0, uR: 0, wL: 0, wR: 0, aL: 0, aR: 0 }, acc = {};
    const eyeT = (P, k, ly, tilt) => (k === 1 && tilt === 0 ? about(P, 1, ly)
      : `translate(${P[0]} ${P[1]}) rotate(${tilt.toFixed(2)}) scale(${k.toFixed(4)} ${(k * ly).toFixed(4)}) translate(${-P[0]} ${-P[1]})`);
    let LIDS = null; // párpados extra (capas del color del cuerpo), se crean al primer gesto que los pide
    const applyFace = () => {
      el.eyes.setAttribute("transform", about(EYES, 1, face.blink));
      el.eyeL.setAttribute("transform", eyeT(EYE_L, face.kL, face.lidL, face.tL));
      el.eyeR.setAttribute("transform", eyeT(EYE_R, face.kR, face.lidR, face.tR));
      if (LIDS) for (const S of ["L", "R"]) {
        const b = LIDS[S];
        b.up.setAttribute("transform", `translate(0 ${(face["u" + S] * b.h).toFixed(2)}) rotate(${face["a" + S].toFixed(2)} ${b.cx} ${b.top})`);
        b.lo.setAttribute("transform", `translate(0 ${(-face["w" + S] * b.h).toFixed(2)})`);
      }
      el.pup.setAttribute("transform", `translate(${face.px.toFixed(2)} ${face.py.toFixed(2)})`);
      for (const id in acc) acc[id].el.setAttribute("transform", about(acc[id].o, acc[id].k, acc[id].k));
    };
    const lids = (t, v, d = 0.22) => tl.to(face, { lidL: v, lidR: v, duration: d, ease: "power2.out", onUpdate: applyFace }, t);
    const gaze = (t, dir, d = 0.22) => {
      const [x, y] = Array.isArray(dir) ? dir : DIRS[dir] || DIRS.center;
      tl.to(face, { px: x, py: y, duration: d, ease: "sine.inOut", onUpdate: applyFace }, t);
    };

    // ================= v2 (aditivo, 20 oct 2026): microemociones y gestos estándar =================
    // Nada de lo de arriba cambia si no se llama un gesto v2: XP vacío, LIDS null, kL/kR = 1, tL/tR = 0.
    const XP = []; // poses extra: { t0, t1, f(t) -> {dx, dy, r, s, c, sx, amp, limp, droop} }
    const MUL = { s: 1, sx: 1 };
    const extra = (t) => {
      const o = { dx: 0, dy: 0, r: 0, s: 1, c: 0, sx: 1, amp: 0, limp: 0, droop: 0 };
      for (const p of XP) if (t > p.t0 && t < p.t1) { const v = p.f(t); for (const k in v) { if (k in MUL) o[k] *= v[k]; else o[k] += v[k]; } }
      return o;
    };
    // back.out(s) a mano: pasa de 1 en 1/(s+1) del tramo y regresa (overshoot)
    const backOut = (u, k) => { u = clamp(u, 0, 1) - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
    // pose sostenida: sube en a (con overshoot ov), se queda hasta d, baja en b
    const pose = (t, d, a, b, v, ov = 0) => {
      XP.push({ t0: t, t1: t + d + b + 1e-3, f: (tt) => {
        let e;
        if (tt < t + a) e = ov ? backOut((tt - t) / a, ov) : smooth((tt - t) / a);
        else if (tt < t + d) e = 1; else e = 1 - smooth((tt - t - d) / b);
        const out = {}; for (const k in v) out[k] = k in MUL ? 1 + (v[k] - 1) * e : v[k] * e; return out;
      } });
    };
    // movimiento libre: f(u, tt) con u en [0, 1] dentro de [t, t+d]
    const motionFn = (t, d, f) => XP.push({ t0: t, t1: t + d, f: (tt) => f((tt - t) / d, tt) });
    // la cara como función del tiempo (proxy lineal; fn devuelve campos de face)
    const faceFn = (t, d, fn) => {
      const pr = { u: 0 };
      tl.fromTo(pr, { u: 0 }, { u: 1, duration: d, ease: "none", immediateRender: false, onUpdate: () => { Object.assign(face, fn(pr.u, t + pr.u * d)); applyFace(); } }, t);
    };
    const faceTo = (t, v, d = 0.22, ease = "power2.out") => tl.to(face, { ...v, duration: d, ease, onUpdate: applyFace }, t);
    // ruido determinista para el temblor (12 fps = cambia cada 2 cuadros a 24, «a dos»)
    const noise = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return 2 * (x - Math.floor(x)) - 1; };
    const happyEyes = (t, hold) => {
      [el.eyeL, el.eyeR].forEach((e) => { tl.set(e, { visibility: "hidden" }, t); tl.set(e, { visibility: "visible" }, t + hold); });
      [el.happyL, el.happyR].forEach((e) => { tl.set(e, { visibility: "visible" }, t); tl.set(e, { visibility: "hidden" }, t + hold); });
    };
    const slowBlink = (t, d = 0.16) => tl.fromTo(face, { blink: 1 }, { blink: 0.08, duration: d, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false, onUpdate: applyFace }, t);
    // párpados extra: capas del color del cuerpo dentro de cada ojo, recortadas a la silueta del ojo
    const ensureLids = () => {
      if (LIDS) return;
      const NS = "http://www.w3.org/2000/svg", fill = el.body.getAttribute("fill") || "#9A99EA";
      const uid = "gLidClip" + (++RIG_UID); // id único por rig en la página
      const BOX = { L: { cx: 105, top: 50.4, bot: 102.4 }, R: { cx: 157, top: 52.2, bot: 97.8 } };
      LIDS = {};
      for (const S of ["L", "R"]) {
        const eye = S === "L" ? el.eyeL : el.eyeR, B = BOX[S], h = B.bot - B.top;
        const cp = document.createElementNS(NS, "clipPath"); cp.setAttribute("id", uid + S);
        for (const p of eye.querySelectorAll("path")) { const c = document.createElementNS(NS, "path"); c.setAttribute("d", p.getAttribute("d")); cp.appendChild(c); }
        const g = document.createElementNS(NS, "g"); g.setAttribute("id", "gLids" + S); g.setAttribute("clip-path", `url(#${uid + S})`);
        const mk = (y) => { const r = document.createElementNS(NS, "rect"); r.setAttribute("x", B.cx - 45); r.setAttribute("y", y); r.setAttribute("width", 90); r.setAttribute("height", 70); r.setAttribute("fill", fill); g.appendChild(r); return r; };
        const up = mk(B.top - 70), lo = mk(B.bot);
        eye.appendChild(cp); eye.appendChild(g);
        LIDS[S] = { up, lo, h, cx: B.cx, top: B.top };
      }
    };
    // dónde están los ojos en el lienzo a la hora t (para follow)
    const eyeAt = (t) => { if (!ready) resolve(); const m = motion(t); return { x: m.x, y: m.y - (BASE[1] - EYES[1]) * m.s, s: m.s }; };

    const api = {
      cues,
      /** Pie de Ghosty (base de los olanes) en (x, y) del lienzo, escala s. Llamar primero. */
      place(x, y, s = 1) { home = { x, y, s }; at(0, x, y, s); return api; },
      /** Vuela a (x, y) entre t y t+dur, en arco. */
      moveTo(t, x, y, { dur = 0.6, s = home.s, arc = null, ease = "inOut" } = {}) {
        SEGS.push({ t0: t, t1: t + dur, to: { x, y, s }, arc: arc ?? 60, ease });
        IMPACTS.push({ t: t + dur, k: 0.03 }); cue(t, "whoosh", "moveTo"); return api;
      },
      /** Entra cayendo desde `from` (default: arriba) hasta `to` (default: place) y aterriza con squash. */
      enter(t, { from = null, to = null, dur = 0.42 } = {}) {
        const dst = to || home, src = from || [dst.x, -260];
        at(t, src[0], src[1], dst.s);
        SEGS.push({ t0: t + 1e-4, t1: t + dur, to: { x: dst.x, y: dst.y, s: dst.s }, arc: 0, ease: "in" });
        IMPACTS.push({ t: t + dur, k: 0.11 }); EXCITE.push({ t: t + dur, d: 0.8, k: 1 });
        cue(t, "whoosh", "enter"); cue(t + dur, "thud", "enter"); return api;
      },
      /** Se agacha (anticipación) y sale disparado hacia `to` (default: arriba). */
      exit(t, { to = null, dur = 0.4, anticip = 0.14 } = {}) {
        const dst = to || [home.x, -320];
        CROUCH.push({ t, d: anticip, k: 0.1 });
        SEGS.push({ t0: t + anticip, t1: t + anticip + dur, to: { x: dst[0], y: dst[1], s: home.s }, arc: 0, ease: "out" });
        cue(t + anticip, "whoosh", "exit"); return api;
      },
      /** Brinco: se agacha, parábola de h px y aterriza con squash amortiguado. */
      hop(t, { h = 80, dur = 0.5, anticip = 0.1 } = {}) {
        CROUCH.push({ t, d: anticip, k: 0.08 });
        HOPS.push({ t: t + anticip, h, dur });
        IMPACTS.push({ t: t + anticip + dur, k: 0.07 }); EXCITE.push({ t: t + anticip, d: 0.9, k: 1.2 });
        cue(t + anticip, "whoosh", "hop"); cue(t + anticip + dur, "thud", "hop"); return api;
      },
      /** Parpadeo: ojos completos (párpado + pupila). double = dos seguidos. */
      blink(t, { double = false } = {}) {
        tl.fromTo(face, { blink: 1 }, { blink: 0.08, duration: 0.06, yoyo: true, repeat: double ? 3 : 1, ease: "power1.inOut", immediateRender: false, onUpdate: applyFace }, t);
        cue(t, "tick", "blink");
        return api;
      },
      /** Guiño: un ojo pasa a ^ un momento. side "L" | "R" (del lienzo). */
      wink(t, { side = "R", hold = 0.4 } = {}) {
        const e = side === "L" ? el.eyeL : el.eyeR, h = side === "L" ? el.happyL : el.happyR;
        tl.set(e, { visibility: "hidden" }, t); tl.set(h, { visibility: "visible" }, t);
        tl.set(e, { visibility: "visible" }, t + hold); tl.set(h, { visibility: "hidden" }, t + hold);
        POSES.push({ t, d: hold, a: 0.1, b: 0.15, r: side === "L" ? -3 : 3, s: 1, dy: 0 });
        cue(t, "tick", "wink"); return api;
      },
      /** Mira: "left" | "right" | "up" | "down" | "upLeft" … | "center" | [x, y] (px del vector, máx ~8). */
      look(t, dir = "center", { dur = 0.22 } = {}) { gaze(t, dir, dur); return api; },
      /** Contento: ojitos ^^, olanes animados y un rebote mínimo. */
      happy(t, { hold = 0.8 } = {}) {
        [el.eyeL, el.eyeR].forEach((e) => { tl.set(e, { visibility: "hidden" }, t); tl.set(e, { visibility: "visible" }, t + hold); });
        [el.happyL, el.happyR].forEach((e) => { tl.set(e, { visibility: "visible" }, t); tl.set(e, { visibility: "hidden" }, t + hold); });
        POSES.push({ t, d: hold - 0.15, a: 0.12, b: 0.2, r: 0, s: 1.02, dy: -6 });
        EXCITE.push({ t, d: hold, k: 1 }); cue(t, "sparkle", "happy"); return api;
      },
      /** Orgulloso: se infla parejo, mira arriba con ojos entrecerrados y luego baja la vista a su gafete. */
      proud(t, { hold = 0.9 } = {}) {
        POSES.push({ t, d: hold, a: 0.25, b: 0.3, r: 0, s: 1.05, dy: -4 });
        gaze(t, [3, -5], 0.25); lids(t + 0.05, 0.72, 0.25);
        gaze(t + hold * 0.55, "down", 0.3); lids(t + hold * 0.55, 1, 0.2);
        gaze(t + hold, "center", 0.25);
        EXCITE.push({ t, d: hold, k: 0.6 }); cue(t, "swell", "proud"); return api;
      },
      /** Apenado: se ladea y se encoge, baja la mirada de lado, entrecierra, te mira un instante y vuelve a desviar. */
      shy(t, { hold = 0.9 } = {}) {
        POSES.push({ t, d: hold, a: 0.3, b: 0.3, r: -6, s: 0.96, dy: 6 });
        gaze(t + 0.05, "downLeft", 0.3); lids(t + 0.15, 0.62, 0.25);
        gaze(t + hold * 0.45, [-1, 2], 0.18); lids(t + hold * 0.45, 1, 0.15);
        gaze(t + hold * 0.7, "downLeft", 0.25); lids(t + hold * 0.72, 0.7, 0.2);
        gaze(t + hold, "center", 0.25); lids(t + hold, 1, 0.2);
        cue(t, "aww", "shy"); return api;
      },
      /** Saluda con el cuerpo (Ghosty no tiene manos): balanceo desde la base + olanes. */
      wave(t, { dur = 0.6, times = 2, deg = 7 } = {}) {
        ROCKS.push({ t, d: dur, times, deg }); EXCITE.push({ t, d: dur + 0.2, k: 1 });
        cue(t, "swish", "wave"); return api;
      },
      /** Flotación en reposo entre t0 y t1 (finita; entra y sale suave). */
      idle(t0, t1, { amp = 8, period = 1.6 } = {}) { FLOATS.push({ t0, t1, amp, period }); return api; },
      /** Accesorio (capa aparte: "gBadge", "gHat", o uno tuyo dentro de #gAcc con data-origin). */
      accessory(id, t, { show = true, dur = 0.34 } = {}) {
        const a = $(id); if (!a) throw new Error("ghosty-rig: no existe el accesorio " + id);
        const st = (acc[id] ||= { el: a, o: (a.getAttribute("data-origin") || "128 117").split(/[ ,]+/).map(Number), k: 1 });
        if (show) {
          tl.set(a, { visibility: "visible" }, t);
          tl.fromTo(st, { k: 0.2 }, { k: 1, duration: dur, ease: "back.out(2.4)", immediateRender: false, onUpdate: applyFace }, t);
          cue(t + dur / 3.4, "pop", "accessory"); // back.out(2.4): el golpe va en 1/(s+1) del tween
        } else {
          tl.to(st, { k: 0.2, duration: dur * 0.7, ease: "power2.in", onUpdate: applyFace }, t);
          tl.set(a, { visibility: "hidden" }, t + dur * 0.7);
        }
        return api;
      },
      /** Agrega el driver del cuerpo. Llamar UNA vez, después de todos los gestos. */
      finalize(duration) {
        cues.sort((a, b) => a.t - b.t);
        const drv = { t: 0 };
        tl.fromTo(drv, { t: 0 }, { t: duration, duration, ease: "none", immediateRender: false, onUpdate: () => { render(drv.t); applyFace(); } }, 0);
        render(0); applyFace();
        return tl;
      },

      // ================= v2 (aditivo): microemociones =================
      /** Sorpresa: se agacha un instante (anticipación), respinga hacia atrás y arriba, ojos grandes con overshoot. */
      surprise(t, { hold = 0.7 } = {}) {
        const t1 = t + 0.08;
        pose(t, 0.06, 0.06, 0.04, { c: 0.05, dy: 3 });
        pose(t1, hold, 0.2, 0.35, { dy: -16, s: 0.97, r: -3, c: -0.03 }, 2.2);
        faceTo(t1, { kL: 1.22, kR: 1.22, px: 0, py: -1, lidL: 1, lidR: 1 }, 0.2, "back.out(3)");
        faceTo(t1 + hold, { kL: 1, kR: 1, py: 0 }, 0.3, "power2.inOut");
        EXCITE.push({ t: t1, d: 0.6, k: 1.1 }); cue(t1, "gasp", "surprise"); return api;
      },
      /** Confundido: se ladea, un ojo se entrecierra con el párpado inclinado y las pupilas buscan. side = ojo que se entrecierra. */
      confused(t, { hold = 1.3, side = "R" } = {}) {
        const S = side === "L" ? "L" : "R", O = S === "L" ? "R" : "L", sg = S === "R" ? 1 : -1;
        ensureLids();
        pose(t, hold, 0.3, 0.35, { r: 8 * sg, dx: 4 * sg, dy: 2 }, 1.4);
        faceTo(t + 0.1, { ["u" + S]: 0.42, ["w" + S]: 0.18, ["a" + S]: -8 * sg, ["k" + O]: 1.08 }, 0.25);
        gaze(t + 0.15, "upLeft", 0.25); gaze(t + 0.55, "upRight", 0.3); gaze(t + 0.95, [-3, -4], 0.22);
        gaze(t + hold, "center", 0.25);
        faceTo(t + hold, { ["u" + S]: 0, ["w" + S]: 0, ["a" + S]: 0, ["k" + O]: 1 }, 0.3);
        EXCITE.push({ t, d: 0.5, k: 0.5 }); cue(t, "hmm", "confused"); return api;
      },
      /** Pensando: mirada arriba-lado, sube y flota lento, párpados relajados, parpadeo lento. */
      think(t, { hold = 1.5, dir = "upRight" } = {}) {
        ensureLids();
        const sg = /Left/.test(dir) ? -1 : 1;
        gaze(t, dir, 0.4);
        faceTo(t + 0.05, { uL: 0.2, uR: 0.2 }, 0.4, "sine.inOut");
        pose(t, hold, 0.55, 0.45, { dy: -8, r: 3 * sg });
        motionFn(t, hold + 0.45, (u) => ({ dy: -2.5 * Math.sin(2 * Math.PI * 1.5 * u) * Math.sin(Math.PI * u) }));
        slowBlink(t + hold * 0.55, 0.18);
        gaze(t + hold, "center", 0.3); faceTo(t + hold, { uL: 0, uR: 0 }, 0.3, "sine.inOut");
        cue(t, "bubble", "think"); return api;
      },
      /** Triste: se encoge despacio, párpados caídos hacia afuera, mirada abajo y olanes sin vida. */
      sad(t, { hold = 1.3 } = {}) {
        ensureLids();
        pose(t, hold, 0.5, 0.45, { s: 0.95, dy: 9, c: 0.035, limp: 0.8, droop: 1.6 });
        faceTo(t + 0.1, { uL: 0.42, uR: 0.42, aL: -24, aR: 24, tL: -6, tR: 6, px: 0, py: 5 }, 0.45, "sine.inOut");
        faceTo(t + hold, { uL: 0, uR: 0, aL: 0, aR: 0, tL: 0, tR: 0, py: 0 }, 0.4, "sine.inOut");
        cue(t, "deflate", "sad"); return api;
      },
      /** Asustado: se encoge hacia atrás, ojos chicos y temblor corto a 12 fps. */
      scared(t, { hold = 0.9 } = {}) {
        pose(t, hold, 0.12, 0.3, { s: 0.95, c: 0.05, dy: 6, dx: -5 });
        motionFn(t + 0.06, hold, (u, tt) => {
          const n = Math.floor(tt * 12), e = Math.sqrt(Math.sin(Math.PI * u));
          return { dx: 3.2 * noise(n) * e, r: 1.6 * noise(n + 57) * e, amp: 1.5 * e };
        });
        faceTo(t, { kL: 0.7, kR: 0.7, px: 0, py: 0, lidL: 1, lidR: 1 }, 0.1, "power3.out");
        faceTo(t + hold, { kL: 1, kR: 1 }, 0.25);
        cue(t, "shiver", "scared"); return api;
      },
      /** Risa: ojitos ^^ y sacudidas rítmicas (rebote + vaivén), olanes animados. */
      laugh(t, { hold = 1.1, beats = 4 } = {}) {
        happyEyes(t, hold);
        motionFn(t, hold, (u) => {
          const e = Math.min(1, u / 0.1) * Math.min(1, (1 - u) / 0.15), ph = Math.PI * beats * u, a = Math.abs(Math.sin(ph));
          return { dy: -7 * a * e, r: 3.5 * Math.sin(ph) * e, c: 0.04 * (1 - a) * e, amp: 1.2 * e };
        });
        pose(t, hold, 0.1, 0.2, { s: 1.02 });
        EXCITE.push({ t, d: hold, k: 1.3 }); cue(t, "giggle", "laugh"); return api;
      },
      /** Doble toma: mira, regresa como si nada y vuelve a mirar de golpe (ojos grandes + respingo hacia allá). */
      doubleTake(t, dir = "right", { hold = 0.5 } = {}) {
        const sg = /left|Left/.test(dir) ? -1 : 1, t2 = t + 0.72;
        gaze(t, dir, 0.16); gaze(t + 0.42, "center", 0.14);
        pose(t2 - 0.06, 0.04, 0.05, 0.05, { c: 0.04 });
        pose(t2, hold, 0.12, 0.3, { dx: 10 * sg, r: 5 * sg, dy: -8 }, 2.5);
        gaze(t2, dir, 0.07);
        faceTo(t2, { kL: 1.15, kR: 1.15 }, 0.12, "back.out(3)");
        faceTo(t2 + hold, { kL: 1, kR: 1 }, 0.25); gaze(t2 + hold, "center", 0.25);
        EXCITE.push({ t: t2, d: 0.5, k: 0.8 }); cue(t, "tick", "doubleTake"); cue(t2, "zip", "doubleTake"); return api;
      },

      // ================= v2 (aditivo): gestos estándar =================
      /** Brinco con anticipación marcada: mira arriba, se concentra, se agacha más hondo, brinca y vuelve a verte. */
      hopAnticipated(t, { h = 90, dur = 0.5, anticip = 0.22 } = {}) {
        gaze(t, "up", 0.14); lids(t, 0.85, 0.12);
        CROUCH.push({ t, d: anticip, k: 0.12 });
        pose(t, anticip * 0.9, anticip * 0.85, 0.08, { dy: 4 });
        HOPS.push({ t: t + anticip, h, dur });
        IMPACTS.push({ t: t + anticip + dur, k: 0.09 }); EXCITE.push({ t: t + anticip, d: 0.9, k: 1.3 });
        gaze(t + anticip, "center", 0.2); lids(t + anticip, 1, 0.12);
        cue(t + anticip, "whoosh", "hopAnticipated"); cue(t + anticip + dur, "thud", "hopAnticipated"); return api;
      },
      /** Sí con la cabeza (todo el cuerpo): baja y sube `times` veces; las pupilas llegan tarde. Parte de mirada al centro. */
      nod(t, { times = 2, dur = 0.7 } = {}) {
        motionFn(t, dur, (u) => { const b = Math.sin(Math.PI * times * u) ** 2; return { dy: 6 * b, c: 0.025 * b }; });
        faceFn(t, dur + 0.06, (u, tt) => { const v = (tt - t - 0.05) / dur; return { py: v <= 0 || v >= 1 ? 0 : 4 * Math.sin(Math.PI * times * v) ** 2 }; });
        cue(t, "tock", "nod"); return api;
      },
      /** No: vaivén lateral; las pupilas se quedan contigo (contra-giro con retraso) y los olanes llegan tarde. */
      shake(t, { times = 3, dur = 0.8, deg = 5 } = {}) {
        motionFn(t, dur, (u) => { const w = Math.sin(Math.PI * u), q = Math.sin(2 * Math.PI * times * u); return { r: deg * q * w, dx: 6 * q * w }; });
        faceFn(t, dur + 0.1, (u, tt) => { const v = (tt - t - 0.06) / dur; return { px: v <= 0 || v >= 1 ? 0 : -4.5 * Math.sin(2 * Math.PI * times * v) * Math.sin(Math.PI * v) }; });
        EXCITE.push({ t, d: dur, k: 0.8 }); cue(t, "wobble", "shake"); return api;
      },
      /** Se inclina hacia algo para señalarlo (sin manos): contra-movimiento, se ladea con overshoot y lo mira. */
      lean(t, dir = "right", { hold = 0.9, deg = 9, dx = 18 } = {}) {
        const sg = typeof dir === "number" ? Math.sign(dir) || 1 : /left|Left/.test(dir) ? -1 : 1, t1 = t + 0.08;
        pose(t, 0.06, 0.08, 0.06, { r: -2 * sg, dx: -3 * sg });
        pose(t1, hold, 0.3, 0.32, { r: deg * sg, dx: dx * sg, dy: -2 }, 1.5);
        gaze(t1 + 0.04, [7 * sg, 1], 0.2); gaze(t1 + hold, "center", 0.25);
        EXCITE.push({ t: t1, d: 0.6, k: 0.6 }); cue(t1, "slide", "lean"); return api;
      },
      /** Festejo: vuelta sugerida (se angosta y las pupilas barren, nunca 360°), dos brincos y aterrizaje con squash. */
      celebrate(t, { h1 = 70, h2 = 100 } = {}) {
        motionFn(t, 0.36, (u) => ({ sx: 1 - 0.24 * Math.sin(Math.PI * u), dy: -5 * Math.sin(Math.PI * u), r: -4 * Math.sin(2 * Math.PI * u), amp: 1.5 * Math.sin(Math.PI * u) }));
        faceFn(t, 0.36, (u) => ({ px: 7 * Math.sin(2 * Math.PI * u) }));
        CROUCH.push({ t: t + 0.36, d: 0.08, k: 0.07 }); HOPS.push({ t: t + 0.44, h: h1, dur: 0.4 }); IMPACTS.push({ t: t + 0.84, k: 0.06 });
        CROUCH.push({ t: t + 0.84, d: 0.08, k: 0.08 }); HOPS.push({ t: t + 0.92, h: h2, dur: 0.48 }); IMPACTS.push({ t: t + 1.4, k: 0.14 });
        EXCITE.push({ t: t + 0.36, d: 1.5, k: 1.4 });
        happyEyes(t + 0.3, 1.45);
        cue(t, "twirl", "celebrate"); cue(t + 0.44, "whoosh", "celebrate"); cue(t + 0.84, "thud", "celebrate");
        cue(t + 0.92, "whoosh", "celebrate"); cue(t + 1.4, "thud", "celebrate"); cue(t + 1.46, "tada", "celebrate"); return api;
      },
      /** Aterrizaje: squash amortiguado + olanes y lentes que llegan tarde. Úsalo al final de un moveTo o una caída propia. */
      land(t, { k = 0.11 } = {}) {
        IMPACTS.push({ t, k }); EXCITE.push({ t, d: 0.8, k: 1 }); cue(t, "thud", "land"); return api;
      },
      /** Dormido entre t0 y t1 (finito): cierra los ojos despacio, flota lento, respira, olanes flojos; despierta al final. */
      sleep(t0, t1, { amp = 5, period = 3 } = {}) {
        const D = t1 - t0;
        FLOATS.push({ t0, t1, amp, period });
        faceTo(t0, { lidL: 0.1, lidR: 0.1, px: 0, py: 3 }, 0.6, "sine.inOut");
        motionFn(t0, D, (u, tt) => {
          const e = smooth((u * D) / 0.5) * smooth(((1 - u) * D) / 0.4), b = Math.sin((2 * Math.PI * (tt - t0)) / 2.4);
          return { s: 1 + 0.018 * b * e, dy: 5 * e, limp: 0.4 * e };
        });
        faceTo(t1 - 0.35, { lidL: 1, lidR: 1, py: 0 }, 0.3, "power2.out");
        cue(t0 + 0.3, "snooze", "sleep"); cue(t1 - 0.35, "tick", "sleep"); return api;
      },
      /** Esperando entre t0 y t1 (finito): flota lento, ojos relajados, mira a un lado y al otro, parpadeo lento. */
      wait(t0, t1, { amp = 4, period = 2.4 } = {}) {
        const D = t1 - t0;
        FLOATS.push({ t0, t1, amp, period }); lids(t0, 0.88, 0.4);
        gaze(t0 + 0.25 * D, "left", 0.35); gaze(t0 + 0.5 * D, "right", 0.4); gaze(t0 + 0.78 * D, "center", 0.3);
        slowBlink(t0 + 0.4 * D);
        motionFn(t0, D, (u) => ({ r: 2.5 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u) }));
        lids(t1 - 0.25, 1, 0.2);
        cue(t0, "ticktock", "wait"); return api;
      },
      /** Trabajando: lee `lines` renglones de izquierda a derecha (pupilas), se acerca y el cuerpo acompaña la lectura. */
      work(t, { lines = 3, lineDur = 0.55 } = {}) {
        const D = lines * lineDur;
        pose(t, D, 0.25, 0.3, { dy: 4, s: 0.99 }); lids(t, 0.82, 0.2);
        for (let i = 0; i < lines; i++) {
          const ti = t + i * lineDur;
          faceTo(ti, { px: -6, py: 1.5 + i * 2 }, 0.1, "power3.out");
          faceTo(ti + 0.1, { px: 6 }, lineDur - 0.14, "sine.inOut");
        }
        motionFn(t, D, (u) => { const f = u * lines, w = f - Math.floor(f), k = w < 0.82 ? w / 0.82 : 1 - (w - 0.82) / 0.18; return { dx: 2.5 * (2 * k - 1) * Math.sin(Math.PI * u) }; });
        faceTo(t + D, { px: 0, py: 0 }, 0.25); lids(t + D, 1, 0.2);
        cue(t, "keys", "work"); return api;
      },
      /** Las pupilas siguen un camino entre t0 y t1. path = [[x, y], …] del lienzo (o función u → [x, y]); space "eye" = px del vector. */
      follow(t0, t1, path, { space = "canvas", reach = 7 } = {}) {
        const P = typeof path === "function" ? path : (u) => pathAt(path, u), D = t1 - t0;
        const toGaze = (pt, tt) => {
          if (space === "eye") return pt;
          const e = eyeAt(tt), dx = (pt[0] - e.x) / e.s, dy = (pt[1] - e.y) / e.s, d = Math.hypot(dx, dy) || 1, k = Math.min(reach, d / 14) / d;
          return [dx * k, clamp(dy * k, -7, 7)];
        };
        const ta = Math.max(0, t0 - 0.15);
        tl.to(face, { px: () => toGaze(P(0), t0)[0], py: () => toGaze(P(0), t0)[1], duration: t0 - ta || 0.01, ease: "sine.out", onUpdate: applyFace }, ta);
        faceFn(t0, D, (u, tt) => { const g = toGaze(P(u), tt); return { px: g[0], py: g[1] }; });
        motionFn(t0, D, (u, tt) => { const g = toGaze(P(u), tt), e = smooth((u * D) / 0.3) * smooth(((1 - u) * D) / 0.3); return { r: g[0] * 0.35 * e, dx: g[0] * 0.5 * e }; });
        cue(t0, "glance", "follow"); return api;
      },
      render,
    };
    return api;
  }
  G.GhostyRig = { create, DIRS, pathAt };
})(window);
