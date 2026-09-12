import { useEffect, useRef } from "react";

// Confetti dibujado a mano sobre un canvas fijo a pantalla completa. Sin
// librerías: una ráfaga desde el centro con la paleta de la casa, gravedad y
// giro por partícula. Se desmonta solo cuando todas caen fuera de cuadro.
const PALETTE = ["#85DDCB", "#8DCF6E", "#F2F5F4", "#37ab93", "#C9F0E6"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  spin: number;
  color: string;
};

// El sonido de la ráfaga, sintetizado: un "pop" grave y tres blips que suben.
// Sin archivo de audio; corre tras el submit, así que el navegador lo permite.
const playBurst = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const out = ac.createGain();
    out.gain.value = 0.35;
    out.connect(ac.destination);
    const t0 = ac.currentTime;
    // pop: seno que cae de 320 a 80 Hz en 120 ms
    const pop = ac.createOscillator();
    const pg = ac.createGain();
    pop.frequency.setValueAtTime(320, t0);
    pop.frequency.exponentialRampToValueAtTime(80, t0 + 0.12);
    pg.gain.setValueAtTime(0.9, t0);
    pg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    pop.connect(pg).connect(out);
    pop.start(t0);
    pop.stop(t0 + 0.2);
    // blips ascendentes: mi, sol, do
    [659, 784, 1047].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const t = t0 + 0.08 + i * 0.09;
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.25);
    });
    setTimeout(() => ac.close(), 800);
  } catch {
    // Sin audio no pasa nada: el confetti sigue.
  }
};

export const CanvasConfetti = ({ count = 260 }: { count?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playBurst();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = window.innerWidth, H = window.innerHeight;
    // tres cañones: dos desde las esquinas de abajo apuntando al centro, y uno central hacia arriba
    const cannons = [
      { x: 0, y: H, dir: -Math.PI / 3.2, spread: 0.55, n: Math.round(count * 0.4), delay: 0 },
      { x: W, y: H, dir: -Math.PI + Math.PI / 3.2, spread: 0.55, n: Math.round(count * 0.4), delay: 0 },
      { x: W / 2, y: H * 0.5, dir: -Math.PI / 2, spread: 1.1, n: Math.round(count * 0.5), delay: 18 },
    ];
    const particles: (Particle & { delay: number; round: boolean })[] = cannons.flatMap((c) => Array.from({ length: c.n }, () => {
      const theta = c.dir + (Math.random() - 0.5) * c.spread;
      const speed = 14 + Math.random() * 14;
      return {
        x: c.x,
        y: c.y,
        delay: c.delay + Math.floor(Math.random() * 6),
        round: Math.random() < 0.3,
        vx: Math.cos(theta) * speed,
        vy: Math.sin(theta) * speed,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      };
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;
      for (const p of particles) {
        if (p.delay > 0) { p.delay--; alive++; continue; }
        p.vy += 0.42; // gravedad
        p.vx *= 0.985; // fricción
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y < window.innerHeight + 40) alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        // el coseno simula el volteo de la tira de papel
        ctx.scale(1, Math.cos(p.angle * 2));
        ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
};
