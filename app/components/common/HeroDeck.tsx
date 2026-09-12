import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * El hero es una presentación que se anima sola: cuatro slides que muestran
 * lo que se construye en el curso. Avanza cada 6 s, con ← → y con clic en los
 * puntos. Las siguientes slides asoman detrás, como un deck apilado.
 */
const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E";
const SLIDES = 6;
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

const Bars = () => (
  <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-14">
    <div className="flex h-36 items-end gap-2 sm:h-48 sm:gap-3">
      {[0.35, 0.6, 0.45, 0.8, 1].map((h, i) => (
        <motion.div key={i} className="w-7 rounded-t-md sm:w-10" style={{ background: i > 2 ? GREEN : MINT, height: `${h * 100}%`, transformOrigin: "bottom" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring, delay: 0.3 + i * 0.12 }} />
      ))}
    </div>
    <div className="text-center sm:text-left">
      <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: MUTE }}>05 · Presentaciones</p>
      <h2 className="mt-2 text-2xl font-extrabold sm:text-5xl" style={{ color: INK }}>Slides que<br />se animan solas</h2>
      <p className="mt-2 text-sm sm:text-base" style={{ color: MUTE }}>Como esta. Se escriben en HTML y se renderizan a video.</p>
    </div>
  </div>
);

const TOASTS = ["Componente generado", "Deck renderizado", "Card 3D lista", "Deploy en Fly.io", "Video exportado"];
const Micro = () => {
  // toasts apiladas: la nueva empuja a las anteriores hacia atrás, máximo 3 visibles
  const [list, setList] = useState<{ id: number; text: string }[]>([{ id: 0, text: TOASTS[0] }]);
  const [burst, setBurst] = useState(0);
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    let n = 1;
    const id = setInterval(() => { setList((l) => [{ id: n, text: TOASTS[n % TOASTS.length] }, ...l].slice(0, 3)); n++; }, 1500);
    const like = setInterval(() => { setLiked((v) => !v); setBurst((b) => b + 1); }, 3200);
    return () => { clearInterval(id); clearInterval(like); };
  }, []);
  const tap = () => { setLiked((v) => !v); setBurst((b) => b + 1); };
  return (
    <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-16">
      {/* la pila de toasts */}
      <div className="relative mt-6 h-20 w-56 sm:mt-0 sm:h-28 sm:w-72">
        <AnimatePresence>
          {list.map((t, k) => (
            <motion.div key={t.id} layout initial={{ y: 40, opacity: 0, scale: 1 }} animate={{ y: -k * 12, opacity: 1 - k * 0.3, scale: 1 - k * 0.06 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring} style={{ zIndex: 10 - k, background: "#141B20", borderColor: `${GREEN}66`, color: INK, transformOrigin: "top center" }} className="absolute inset-x-0 bottom-0 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.1 }} className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: GREEN, color: "#0E1317" }}>✓</motion.span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* el botón que explota */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-10">
        <button type="button" onClick={tap} aria-label="me gusta" className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 sm:h-16 sm:w-16" style={{ borderColor: liked ? GREEN : "#2f4047", background: liked ? `${GREEN}22` : "transparent" }}>
          <motion.svg key={burst} viewBox="0 0 24 24" className="h-7 w-7" initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.35, 1] }} transition={{ duration: 0.45 }} fill={liked ? GREEN : "none"} stroke={liked ? GREEN : MUTE} strokeWidth="2">
            <path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.4-9.5 9-9.5 9z" />
          </motion.svg>
          {liked && Array.from({ length: 10 }, (_, k) => {
            const a = (k / 10) * Math.PI * 2;
            return <motion.span key={`${burst}-${k}`} className="absolute h-2 w-2 rounded-full" style={{ background: k % 2 ? GREEN : MINT }} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 44, y: Math.sin(a) * 44, opacity: 0, scale: 0.2 }} transition={{ duration: 0.6, ease: "easeOut" }} />;
          })}
        </button>
        <div className="text-center sm:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: MUTE }}>06 · Micro-interacciones</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-5xl" style={{ color: INK }}>Toasts que se apilan,<br />botones que explotan</h2>
          <p className="mt-2 hidden text-sm sm:block sm:text-base" style={{ color: MUTE }}>Motion en React, con springs que se sienten reales.</p>
        </div>
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
            {i === 5 && <Micro />}
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
