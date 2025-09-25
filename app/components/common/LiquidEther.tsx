import React, { useEffect, useRef, useState } from 'react';

export interface LiquidEtherProps {
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  mouseForce?: number;
  cursorSize?: number;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
}

const defaultColors = ['#aa99e6', '#74dcf4', '#f2b5e3', '#f2ddda'];

export default function LiquidEther({
  colors = defaultColors,
  style = {},
  className = '',
  mouseForce = 15,
  cursorSize = 80,
  autoDemo = true,
  autoSpeed = 0.3,
  autoIntensity = 1.8
}: LiquidEtherProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    resizeCanvas();

    // Initialize particles
    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width / devicePixelRatio,
        y: Math.random() * canvas.height / devicePixelRatio,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 60 + 40,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      mouseRef.current.vx = newX - mouseRef.current.x;
      mouseRef.current.vy = newY - mouseRef.current.y;
      mouseRef.current.x = newX;
      mouseRef.current.y = newY;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const width = canvas.width / devicePixelRatio;
      const height = canvas.height / devicePixelRatio;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Mouse interaction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const force = (150 - distance) / 150;
          particle.vx += (dx / distance) * force * 0.5;
          particle.vy += (dy / distance) * force * 0.5;
        }

        // Auto demo movement
        if (autoDemo) {
          particle.vx += (Math.random() - 0.5) * 0.1;
          particle.vy += (Math.random() - 0.5) * 0.1;
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Damping
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Boundary bounce
        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(width, particle.x));
        }
        if (particle.y < 0 || particle.y > height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(height, particle.y));
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.filter = `blur(${particle.size / 4}px)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Decay mouse velocity
      mouseRef.current.vx *= 0.9;
      mouseRef.current.vy *= 0.9;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement!);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
    };
  }, [colors, autoDemo]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        zIndex: 1,
        ...style,
      }}
    />
  );
}