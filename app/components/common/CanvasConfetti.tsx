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

export const CanvasConfetti = ({ count = 160 }: { count?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.45;
    const particles: Particle[] = Array.from({ length: count }, () => {
      const theta = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 9 + Math.random() * 11;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(theta) * speed,
        vy: Math.sin(theta) * speed,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      };
    });

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;
      for (const p of particles) {
        p.vy += 0.35; // gravedad
        p.vx *= 0.99; // fricción
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
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
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
