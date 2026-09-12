import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * El hero es una presentación que se anima sola: cuatro slides que muestran
 * lo que se construye en el curso. Avanza cada 6 s, con ← → y con clic en los
 * puntos. Las siguientes slides asoman detrás, como un deck apilado.
 */
const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E";
const SLIDES = 5;
const spring = { type: "spring", stiffness: 260, damping: 22 } as const;

const Title = () => {
  const words = ["Animaciones", "con", "AI"];
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-mono text-[11px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: GREEN }}>
        Nuevo curso · Octubre 2026
      </motion.p>
      <h1 className="mt-3 flex flex-wrap justify-center gap-x-[0.25em] text-[2.2rem] font-extrabold leading-[0.95] tracking-tight sm:text-7xl" style={{ color: INK }}>
        {words.map((w, wi) => (
          <span key={w} className="inline-flex overflow-hidden" style={{ color: wi === 2 ? GREEN : INK }}>
            {w.split("").map((ch, i) => (
              <motion.span key={i} initial={{ y: "110%", rotate: 8 }} animate={{ y: 0, rotate: 0 }} transition={{ ...spring, delay: 0.35 + (wi * 6 + i) * 0.035 }} className="inline-block">
                {ch}
              </motion.span>
            ))}
          </span>
        ))}
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }} className="mt-4 max-w-md text-sm sm:text-lg" style={{ color: `${INK}bb` }}>
        Construyes componentes 3D, presentaciones animadas y micro-interacciones con Motion y AI.
      </motion.p>
    </div>
  );
};

const SHORTS = [
  { src: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/omiB_ZSlWpOj", poster: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/zUBKfltTkk9E", tag: "teaser · HyperFrames" },
  { src: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/g02xtP37iK-m", poster: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/1fYbDsJEb-oL", tag: "short · plastilina" },
  { src: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/WvRbg17vKMj_", poster: "https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/ZwH1oVk6VmzA", tag: "short · morph" },
];
const Shorts = () => (
  <div className="flex w-full flex-col items-center gap-4 pt-4 sm:gap-4 sm:pt-6">
    <div className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: MUTE }}>02 · Shorts hechos con código</p>
      <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color: INK }}>Videos que se renderizan solos</h2>
    </div>
    <div className="flex w-full items-end justify-center gap-3 sm:gap-5">
      {SHORTS.map((v, k) => (
        <motion.div key={v.src} initial={{ y: 30, opacity: 0, rotate: k === 1 ? 0 : k ? 3 : -3 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: 0.15 + k * 0.12 }} className={`relative overflow-hidden rounded-xl border sm:rounded-2xl ${k === 1 ? "w-[34%] sm:w-[150px]" : "hidden w-[28%] sm:block sm:w-[120px]"}`} style={{ borderColor: "#2f4047", aspectRatio: "9/16", background: "#0E1317" }}>
          <video src={v.src} poster={v.poster} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 font-mono text-[9px] sm:text-[10px]" style={{ background: "#0E1317cc", color: MINT }}>{v.tag}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

// --- herramientas: entran en ráfaga, como una explosión desde el centro
const TOOLS = [
  ["Motion", MINT], ["GSAP", GREEN], ["Three.js", INK], ["Blender", "#f3a15a"], ["HyperFrames", MINT],
  ["Fable 5.1", GREEN], ["GPT-6 Astra", INK], ["Claude Code", MINT], ["ffmpeg", GREEN], ["React", INK],
];
const Tools = () => (
  <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
    <div className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: MUTE }}>03 · Las herramientas</p>
      <h2 className="mt-1 text-2xl font-extrabold sm:text-4xl" style={{ color: INK }}>Con Motion y AI</h2>
    </div>
    <div className="flex max-w-md flex-wrap justify-center gap-2 sm:max-w-xl sm:gap-3">
      {TOOLS.map(([name, color], k) => {
        const a = (k / TOOLS.length) * Math.PI * 2;
        return (
          <motion.span key={name} initial={{ x: Math.cos(a) * 160, y: Math.sin(a) * 90, opacity: 0, scale: 0.3, rotate: -20 }} animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.15 + k * 0.06 }} className="rounded-full border px-3 py-1.5 font-mono text-xs font-bold sm:px-4 sm:py-2 sm:text-sm" style={{ borderColor: `${color}66`, color, background: `${color}14` }}>
            {name}
          </motion.span>
        );
      })}
    </div>
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-xs sm:text-sm" style={{ color: MUTE }}>Todo lo que se usa en clase se usa en los videos de FixterGeek.</motion.p>
  </div>
);

const Cube3D = () => (
  <div className="flex flex-col items-center gap-10 sm:flex-row sm:gap-14">
    <div className="relative h-24 w-24 scale-75 sm:h-44 sm:w-44 sm:scale-100" style={{ perspective: 700 }}>
      <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} animate={{ rotateX: [0, 360], rotateY: [0, 360] }} transition={{ duration: 9, ease: "linear", repeat: Infinity }}>
        {[
          ["translateZ(64px)", MINT], ["rotateY(180deg) translateZ(64px)", "#37ab93"], ["rotateY(90deg) translateZ(64px)", GREEN],
          ["rotateY(-90deg) translateZ(64px)", "#2a7a6b"], ["rotateX(90deg) translateZ(64px)", "#C9F0E6"], ["rotateX(-90deg) translateZ(64px)", "#1f5f54"],
        ].map(([tf, bg], i) => (
          <div key={i} className="absolute inset-0 rounded-md border-2 sm:[transform:var(--tf)]" style={{ transform: tf, background: bg, borderColor: "#0E1317", opacity: 0.95 }} />
        ))}
      </motion.div>
    </div>
    <div className="text-center sm:text-left">
      <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: MUTE }}>04 · Componentes 3D</p>
      <h2 className="mt-2 text-2xl font-extrabold sm:text-5xl" style={{ color: INK }}>Cards, cubos<br />y escenas</h2>
      <p className="mt-2 text-sm sm:text-base" style={{ color: MUTE }}>Three.js y CSS 3D, generados con Astra y Fable.</p>
    </div>
  </div>
);

// --- presentación: un mini deck que se anima solo, como los shorts.
//     Tres beats en bucle con cortinilla de rebanadas diagonales entre ellos.
const BEATS = 3, BEAT_MS = 3000;
// beat 1 · karaoke: la palabra en curso brinca en menta y se queda blanca, con código tecleándose atrás
const LINE = ["Cada", "slide", "se", "escribe", "en", "HTML"];
const CODE = ["<hf-slide in=\"0\">", "  <h1 data-anim=\"pop\">", "    Animaciones con AI", "  </h1>", "</hf-slide>"];
const Karaoke = () => (
  <div className="relative flex h-full w-full flex-col items-center justify-center">
    <div className="absolute left-3 top-3 font-mono text-[10px] leading-4 sm:left-5 sm:top-4 sm:text-xs sm:leading-5" style={{ color: `${MINT}88` }}>
      {CODE.map((l, i) => (
        <motion.div key={l} initial={{ width: 0 }} animate={{ width: "auto" }} transition={{ duration: 0.35, delay: 0.1 + i * 0.28, ease: "linear" }} className="overflow-hidden whitespace-pre">{l}</motion.div>
      ))}
    </div>
    <div className="mt-16 flex max-w-[90%] flex-wrap justify-center gap-x-2 sm:mt-20">
      {LINE.map((w, i) => (
        <motion.span key={w} initial={{ y: 30, opacity: 0, scale: 1.4, color: MINT }} animate={{ y: 0, opacity: 1, scale: 1, color: INK }} transition={{ ...spring, delay: 0.3 + i * 0.22, color: { delay: 0.55 + i * 0.22, duration: 0.2 } }} className="text-2xl font-black sm:text-4xl">{w}</motion.span>
      ))}
    </div>
  </div>
);
// beat 2 · contadores que suben con un golpe al llegar, y el cubo 3D que entra ladeado
const Counter = ({ to, label, delay }: { to: number; label: string; delay: number }) => {
  const [n, setN] = useState(0);
  const [hit, setHit] = useState(false);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay * 1000;
    const step = (t: number) => { const k = Math.min(1, Math.max(0, (t - t0) / 800)); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); else setHit(true); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return (
    <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -6 }} animate={{ scale: hit ? [1, 1.18, 1] : 1, opacity: 1, rotate: 0 }} transition={hit ? { duration: 0.3 } : { ...spring, delay }} className="text-center">
      <div className="text-5xl font-black tabular-nums sm:text-7xl" style={{ color: hit ? GREEN : MINT }}>{n}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] sm:text-xs" style={{ color: MUTE }}>{label}</div>
    </motion.div>
  );
};
const MiniCube = () => (
  <div className="relative h-14 w-14 sm:h-20 sm:w-20" style={{ perspective: 400 }}>
    <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: -40, rotateY: 60, scale: 0 }} animate={{ rotateX: [-40, 380], rotateY: [60, 420], scale: 1 }} transition={{ rotateX: { duration: 2.4, ease: "easeInOut" }, rotateY: { duration: 2.4, ease: "easeInOut" }, scale: { ...spring, delay: 0.5 } }}>
      {[["translateZ(28px)", MINT], ["rotateY(180deg) translateZ(28px)", "#37ab93"], ["rotateY(90deg) translateZ(28px)", GREEN], ["rotateY(-90deg) translateZ(28px)", "#2a7a6b"], ["rotateX(90deg) translateZ(28px)", "#C9F0E6"], ["rotateX(-90deg) translateZ(28px)", "#1f5f54"]].map(([tf, bg], i) => (
        <div key={i} className="absolute inset-0 rounded-sm border" style={{ transform: tf, background: bg, borderColor: "#0E1317" }} />
      ))}
    </motion.div>
  </div>
);
const Stats = () => (
  <div className="flex items-center gap-6 sm:gap-12">
    <Counter to={31} label="videos" delay={0.2} />
    <MiniCube />
    <Counter to={60} label="líneas" delay={0.4} />
  </div>
);
// beat 3 · gráfica con golpe y el logo que aterriza con halo
const Chart = () => (
  <div className="flex items-center gap-6 sm:gap-12">
    <div className="flex h-24 items-end gap-1.5 sm:h-32 sm:gap-2.5">
      {[0.3, 0.55, 0.42, 0.78, 1].map((h, i) => (
        <motion.div key={i} className="w-5 rounded-t-md sm:w-8" style={{ background: i > 2 ? GREEN : MINT, height: `${h * 100}%`, transformOrigin: "bottom" }} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.2, 1] }} transition={{ duration: 0.45, delay: 0.2 + i * 0.09, ease: "easeOut" }} />
      ))}
    </div>
    <motion.div initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.8 }} className="flex flex-col items-center gap-2">
      <img src="/logo.png" alt="" className="w-24 sm:w-32" style={{ filter: "drop-shadow(0 0 18px rgba(133,221,203,.8))" }} />
      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="rounded-full px-3 py-1 font-mono text-[10px] font-bold sm:text-xs" style={{ background: GREEN, color: "#0E1317" }}>7 módulos · 31 lecciones</motion.span>
    </motion.div>
  </div>
);
const Bars = () => {
  const [b, setB] = useState(0);
  // el intervalo se reinicia al elegir un beat, para que se vea completo
  useEffect(() => { const id = setInterval(() => setB((v) => v + 1), BEAT_MS); return () => clearInterval(id); }, [b]);
  const k = b % BEATS;
  return (
    <div className="relative flex w-full flex-col items-center gap-3 sm:gap-4">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: MUTE }}>05 · Presentaciones</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color: INK }}>Slides que se animan solas</h2>
      </div>
      {/* el mini deck: mismo lenguaje que los shorts, cortinilla incluida */}
      <motion.div animate={{ rotate: [-1.5, 1, -1.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="relative flex h-48 w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border-4 sm:h-60" style={{ background: "#0E1317", borderColor: GREEN, boxShadow: "0 24px 60px rgba(0,0,0,.6)", backgroundImage: "radial-gradient(#85DDCB22 1.5px, transparent 1.5px)", backgroundSize: "22px 22px" }}>
        <motion.div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(133,221,203,.35), rgba(133,221,203,0) 65%)" }} animate={{ scale: [1, 1.25, 1], x: [0, 40, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div key={`bar${b}`} className="absolute left-0 top-0 z-30 h-1" style={{ background: GREEN }} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: BEAT_MS / 1000, ease: "linear" }} />
        <AnimatePresence mode="wait">
          <motion.div key={b} className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }} transition={{ duration: 0.25 }}>
            {k === 0 && <Karaoke />}
            {k === 1 && <Stats />}
            {k === 2 && <Chart />}
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-2 right-3 font-mono text-[9px]" style={{ color: MUTE }}>{k + 1} / {BEATS}</div>
      </motion.div>
    </div>
  );
};

export const HeroDeck = ({ paused = false }: { paused?: boolean }) => {
  const [i, setI] = useState(() => { if (typeof window === "undefined") return 0; const n = Number(new URLSearchParams(window.location.search).get("slide")); return n >= 1 && n <= SLIDES ? n - 1 : 0; });
  const go = (n: number) => setI(((n % SLIDES) + SLIDES) % SLIDES);

  useEffect(() => {
    if (paused) return;
    // la slide de presentaciones dura sus tres beats completos
    const ms = i === 4 ? BEATS * BEAT_MS + 400 : 6000;
    const id = setTimeout(() => setI((v) => (v + 1) % SLIDES), ms);
    return () => clearTimeout(id);
  }, [paused, i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* las siguientes slides asoman detrás */}
      <div aria-hidden className="absolute inset-x-6 -bottom-3 h-full rounded-2xl border" style={{ background: "#121b1f", borderColor: "#243036" }} />
      <div aria-hidden className="absolute inset-x-12 -bottom-6 h-full rounded-2xl border" style={{ background: "#0f1619", borderColor: "#1e2c31" }} />

      <div className="relative min-h-[480px] overflow-hidden rounded-2xl border sm:aspect-video sm:min-h-0" style={{ background: "#141B20", borderColor: "#2f4047", boxShadow: "0 40px 90px rgba(0,0,0,.55)" }}>
        {/* cabecera de la slide */}
        <div className="absolute left-4 top-3 flex items-center gap-2 font-mono text-[10px] sm:left-5 sm:top-4 sm:text-xs" style={{ color: MUTE }}>
          <span className="h-2 w-2 rounded-full" style={{ background: "#ff5f57" }} /><span className="h-2 w-2 rounded-full" style={{ background: "#febc2e" }} /><span className="h-2 w-2 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-2">animaciones-con-ai.html</span>
        </div>
        <div className="absolute right-4 top-3 font-mono text-[10px] sm:right-5 sm:top-4 sm:text-xs" style={{ color: MUTE }}>{String(i + 1).padStart(2, "0")} / {String(SLIDES).padStart(2, "0")}</div>

        <AnimatePresence mode="wait">
          <motion.div key={i} className="absolute inset-0 flex items-center justify-center px-4 pb-6 pt-12 sm:px-12 sm:pt-10" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            {i === 0 && <Title />}
            {i === 1 && <Shorts />}
            {i === 2 && <Tools />}
            {i === 3 && <Cube3D />}
            {i === 4 && <Bars />}
          </motion.div>
        </AnimatePresence>

        {/* barra de progreso de la slide en curso */}
        {!paused && <motion.div key={`p${i}`} className="absolute bottom-0 left-0 h-[3px]" style={{ background: GREEN }} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: i === 4 ? (BEATS * BEAT_MS + 400) / 1000 : 6, ease: "linear" }} />}
      </div>

      {/* puntos + flechas */}
      <div className="relative z-10 mt-10 flex items-center justify-center gap-2 sm:mt-12 sm:gap-3">
        <button type="button" onClick={() => go(i - 1)} className="px-2 font-mono text-lg" style={{ color: INK }} aria-label="anterior">←</button>
        {Array.from({ length: SLIDES }, (_, k) => (
          <button key={k} type="button" onClick={() => go(k)} aria-label={`slide ${k + 1}`} className="h-2.5 rounded-full transition-all" style={{ width: k === i ? 32 : 10, background: k === i ? GREEN : "#3a4c54" }} />
        ))}
        <button type="button" onClick={() => go(i + 1)} className="px-2 font-mono text-lg" style={{ color: INK }} aria-label="siguiente">→</button>
      </div>
    </div>
  );
};
