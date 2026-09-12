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
const BEATS = 3, BEAT_MS = 2600;
const Wipe = ({ k }: { k: number }) => (
  <div key={k} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    {Array.from({ length: 6 }, (_, i) => (
      <motion.div key={i} className="absolute -left-1/2 h-[22%] w-[200%]" style={{ top: `${i * 18 - 4}%`, background: i % 2 ? GREEN : MINT, rotate: -12, transformOrigin: i % 2 ? "right center" : "left center" }} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1, 0] }} transition={{ duration: 0.7, times: [0, 0.4, 0.55, 1], ease: ["backOut", "linear", "backIn"], delay: i * 0.04 }} />
    ))}
  </div>
);
const Kinetic = () => (
  <div className="flex flex-col items-center leading-none">
    {[["DIEZ", INK, -6], ["AÑOS", GREEN, 4], ["ENSEÑANDO", INK, -3]].map(([w, c, r], i) => (
      <motion.span key={w as string} initial={{ y: 60, opacity: 0, rotate: (r as number) * 3, scale: 1.6 }} animate={{ y: 0, opacity: 1, rotate: r as number, scale: 1 }} transition={{ ...spring, delay: 0.25 + i * 0.16 }} className="text-4xl font-black tracking-tight sm:text-7xl" style={{ color: c as string }}>
        {w as string}
      </motion.span>
    ))}
  </div>
);
const Counter = ({ to, label, delay }: { to: number; label: string; delay: number }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay * 1000;
    const step = (t: number) => { const k = Math.min(1, Math.max(0, (t - t0) / 900)); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return (
    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay }} className="text-center">
      <div className="text-5xl font-black tabular-nums sm:text-8xl" style={{ color: GREEN }}>{n}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] sm:text-xs" style={{ color: MUTE }}>{label}</div>
    </motion.div>
  );
};
const Stats = () => (
  <div className="flex items-center gap-8 sm:gap-16">
    <Counter to={31} label="videos" delay={0.25} />
    <Counter to={60} label="líneas por card" delay={0.45} />
  </div>
);
const Chart = () => (
  <div className="flex flex-col items-center gap-3">
    <div className="flex h-28 items-end gap-2 sm:h-40 sm:gap-3">
      {[0.3, 0.55, 0.42, 0.78, 1].map((h, i) => (
        <motion.div key={i} className="w-7 rounded-t-md sm:w-11" style={{ background: i > 2 ? GREEN : MINT, height: `${h * 100}%`, transformOrigin: "bottom" }} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.15, 1] }} transition={{ duration: 0.5, delay: 0.25 + i * 0.1, ease: "easeOut" }} />
      ))}
    </div>
    <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...spring, delay: 0.9 }} className="rounded-full px-4 py-1.5 font-mono text-xs font-bold sm:text-sm" style={{ background: GREEN, color: "#0E1317" }}>7 módulos · 31 lecciones</motion.div>
  </div>
);
const Bars = () => {
  const [b, setB] = useState(0);
  useEffect(() => { const id = setInterval(() => setB((v) => v + 1), BEAT_MS); return () => clearInterval(id); }, []);
  const k = b % BEATS;
  return (
    <div className="relative flex w-full flex-col items-center gap-3 sm:gap-4">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: MUTE }}>05 · Presentaciones</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color: INK }}>Slides que se animan solas</h2>
      </div>
      {/* el mini deck: mismo lenguaje que los shorts, cortinilla incluida */}
      <div className="relative flex h-44 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border sm:h-56" style={{ background: "#0E1317", borderColor: "#2f4047" }}>
        <AnimatePresence mode="wait">
          <motion.div key={b} className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
            {k === 0 && <Kinetic />}
            {k === 1 && <Stats />}
            {k === 2 && <Chart />}
          </motion.div>
        </AnimatePresence>
        <Wipe key={`w${b}`} k={b} />
        <div className="absolute bottom-2 right-3 font-mono text-[9px]" style={{ color: MUTE }}>{k + 1} / {BEATS}</div>
      </div>
    </div>
  );
};

export const HeroDeck = ({ paused = false }: { paused?: boolean }) => {
  const [i, setI] = useState(() => { if (typeof window === "undefined") return 0; const n = Number(new URLSearchParams(window.location.search).get("slide")); return n >= 1 && n <= SLIDES ? n - 1 : 0; });
  const go = (n: number) => setI(((n % SLIDES) + SLIDES) % SLIDES);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((v) => (v + 1) % SLIDES), 6000);
    return () => clearInterval(id);
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
          <motion.div key={i} className="absolute inset-0 flex items-center justify-center px-4 pb-6 pt-12 sm:px-12 sm:pt-10" initial={{ x: 80, opacity: 0, rotateY: -12 }} animate={{ x: 0, opacity: 1, rotateY: 0 }} exit={{ x: -80, opacity: 0, rotateY: 12 }} transition={{ ...spring, damping: 26 }}>
            {i === 0 && <Title />}
            {i === 1 && <Shorts />}
            {i === 2 && <Tools />}
            {i === 3 && <Cube3D />}
            {i === 4 && <Bars />}
          </motion.div>
        </AnimatePresence>

        {/* barra de progreso de la slide en curso */}
        {!paused && <motion.div key={`p${i}`} className="absolute bottom-0 left-0 h-[3px]" style={{ background: GREEN }} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 6, ease: "linear" }} />}
      </div>

      {/* puntos + flechas */}
      <div className="mt-6 flex items-center justify-center gap-2 sm:mt-8 sm:gap-3">
        <button type="button" onClick={() => go(i - 1)} className="font-mono text-sm" style={{ color: MUTE }} aria-label="anterior">←</button>
        {Array.from({ length: SLIDES }, (_, k) => (
          <button key={k} type="button" onClick={() => go(k)} aria-label={`slide ${k + 1}`} className="h-2 rounded-full transition-all" style={{ width: k === i ? 28 : 8, background: k === i ? GREEN : "#2f4047" }} />
        ))}
        <button type="button" onClick={() => go(i + 1)} className="font-mono text-sm" style={{ color: MUTE }} aria-label="siguiente">→</button>
      </div>
    </div>
  );
};
