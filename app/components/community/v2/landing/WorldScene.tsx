import type { ReactNode } from "react";

// Escena del Mundo para la landing: las mismas naves, pilotos y cristales que dibuja el Mundo
// del club (app/components/community/v2/world/engine.ts: drawShip, drawPilot, flame, drawGem),
// portados a SVG igual que en docs/comunidad/og-club/build.py. Si allá cambian las formas, se
// actualizan aquí. Plano: rellenos sólidos y borde fino, sin gradientes ni brillo.
//
// ⚠️ Todo se ve desde el HTML del servidor: las naves sólo se mecen con CSS (transform).

const BG = "#0E1317";
const PANEL = "#141B20";
const LINE = "#232D33";
const MINT = "#85DDCB";
const GREEN = "#8DCF6E";
const INK = "#F2F5F4";
const GRAY = "#7C8A8E";
const SUIT = "#D1DEDB";
const SUIT_LINE = "#9AA9A6";
const COLORS = { mint: { fill: MINT, dark: "#357265" }, green: { fill: GREEN, dark: "#4C7A39" } } as const;

const W = 1200;
const H = 420;
// Proporción del asset oficial de Ghosty (public/ghosty-oficial.png), que no se repinta.
const GHOSTY_RATIO = 512 / 592;

type ShipModel = "rocket" | "saucer" | "pod" | "dart";
type ShipColor = keyof typeof COLORS;
type PilotKind = "ghosty" | "alien" | "astro";

/** Estrellas fijas: un generador con semilla da el mismo cielo en el servidor y en el navegador. */
const STARS = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const tones = [INK, INK, GRAY, MINT];
  return Array.from({ length: 64 }, () => ({
    x: Math.round(20 + next() * (W - 40)),
    y: Math.round(14 + next() * (H - 28)),
    r: [1.2, 1.6, 2, 2.6][Math.floor(next() * 4)],
    fill: tones[Math.floor(next() * tones.length)],
  }));
})();

function Flame({ x, y, length, half }: { x: number; y: number; length: number; half: number }) {
  const l = length;
  return (
    <>
      <path d={`M${x} ${y - half} Q${x - l * 0.5} ${y - half * 0.5} ${x - l} ${y} Q${x - l * 0.5} ${y + half * 0.5} ${x} ${y + half} Z`} fill={MINT} />
      <path d={`M${x} ${y - half * 0.45} Q${x - l * 0.3} ${y} ${x - l * 0.5} ${y} Q${x - l * 0.3} ${y} ${x} ${y + half * 0.45} Z`} fill={INK} />
    </>
  );
}

/** El piloto va derecho (cabeza arriba) aunque la nave gire, igual que en el Mundo. */
function Pilot({ kind, x, y, r, id }: { kind: PilotKind; x: number; y: number; r: number; id: string }) {
  let inner: ReactNode;
  if (kind === "ghosty") {
    const h = r * 1.72;
    const w = h * GHOSTY_RATIO;
    inner = <image href="/ghosty-oficial.png" x={x - w / 2} y={y - h / 2 + r * 0.1} width={w} height={h} />;
  } else if (kind === "alien") {
    inner = (
      <>
        <path
          d={`M${x - r * 0.3} ${y - r * 0.5} L${x - r * 0.5} ${y - r * 0.86} M${x + r * 0.3} ${y - r * 0.5} L${x + r * 0.5} ${y - r * 0.86}`}
          stroke={GREEN}
          strokeWidth={r * 0.12}
          strokeLinecap="round"
        />
        <ellipse cx={x} cy={y + r * 0.12} rx={r * 0.66} ry={r * 0.7} fill={GREEN} />
        <ellipse cx={x - r * 0.27} cy={y + r * 0.08} rx={r * 0.19} ry={r * 0.31} fill={BG} transform={`rotate(-28.6 ${x - r * 0.27} ${y + r * 0.08})`} />
        <ellipse cx={x + r * 0.27} cy={y + r * 0.08} rx={r * 0.19} ry={r * 0.31} fill={BG} transform={`rotate(28.6 ${x + r * 0.27} ${y + r * 0.08})`} />
      </>
    );
  } else {
    // astronauta: casco claro con visor oscuro
    inner = (
      <>
        <circle cx={x} cy={y + r * 0.06} r={r * 0.82} fill={SUIT} />
        <rect x={x - r * 0.56} y={y - r * 0.34} width={r * 1.12} height={r * 0.78} rx={r * 0.34} fill={BG} />
        <circle cx={x + r * 0.24} cy={y - r * 0.1} r={r * 0.12} fill={MINT} />
      </>
    );
  }
  return (
    <>
      <clipPath id={id}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill={BG} />
      <g clipPath={`url(#${id})`}>{inner}</g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={SUIT} strokeWidth={Math.max(1, r * 0.14)} />
    </>
  );
}

/** Nave de ~56 unidades apuntando a +x (mismas coordenadas que drawShip). */
function Ship({
  model, color, pilot, x, y, deg, size, id, delay,
}: {
  model: ShipModel; color: ShipColor; pilot: PilotKind; x: number; y: number; deg: number; size: number; id: string; delay: number;
}) {
  const { fill, dark } = COLORS[color];
  const k = size / 56;
  // Borde fino: el grosor no crece con la escala de la nave.
  const edge = { strokeWidth: 3, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round" } as const;
  let cockpitX = 0;
  let cockpitR = 9;
  let angle = deg;
  let body: ReactNode;
  if (model === "saucer") {
    cockpitR = 11;
    angle = 0;
    body = (
      <>
        <circle r={25} fill={fill} stroke={dark} {...edge} />
        <circle r={16.5} fill={dark} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * Math.PI * 2) / 6 + 0.5;
          return <circle key={i} cx={(Math.cos(a) * 20.8).toFixed(2)} cy={(Math.sin(a) * 20.8).toFixed(2)} r={2} fill={INK} />;
        })}
      </>
    );
  } else if (model === "rocket") {
    cockpitX = -1;
    body = (
      <>
        <Flame x={-24} y={0} length={22} half={5.5} />
        {[-1, 1].map((s) => (
          <path key={s} d={`M-10 ${s * 9} L-27 ${s * 21} Q-25 ${s * 12} -22 ${s * 8} Z`} fill={fill} stroke={dark} {...edge} />
        ))}
        <path d="M-22 -10.5 L8 -10.5 Q27 -9 31 0 Q27 9 8 10.5 L-22 10.5 Q-25 0 -22 -10.5 Z" fill={INK} stroke={SUIT_LINE} {...edge} />
        <path d="M14 -9.6 Q27 -8 30.3 0 Q27 8 14 9.6 Z" fill={fill} />
        <rect x={-19} y={-9.8} width={4} height={19.6} fill={fill} />
      </>
    );
  } else if (model === "pod") {
    cockpitX = -1;
    cockpitR = 10;
    body = (
      <>
        <Flame x={-24} y={-14} length={16} half={3.5} />
        <Flame x={-24} y={14} length={16} half={3.5} />
        {[-1, 1].map((s) => (
          <rect key={s} x={-25} y={s * 14 - 5} width={20} height={10} rx={4} fill={fill} stroke={dark} {...edge} />
        ))}
        <rect x={-18} y={-16} width={40} height={32} rx={14} fill={INK} stroke={SUIT_LINE} {...edge} />
        <rect x={14} y={-9} width={6} height={18} rx={3} fill={fill} />
      </>
    );
  } else {
    // dardo
    cockpitX = -1;
    cockpitR = 8;
    body = (
      <>
        <Flame x={-13} y={0} length={22} half={5} />
        <path d="M31 0 L-23 -21 Q-14 -8 -13 0 Q-14 8 -23 21 Z" fill={fill} stroke={dark} {...edge} />
        <path d="M27 0 L-11 -8.5 L-11 8.5 Z" fill={INK} />
      </>
    );
  }
  const rad = (angle * Math.PI) / 180;
  const px = x + Math.cos(rad) * cockpitX * k;
  const py = y + Math.sin(rad) * cockpitX * k;
  return (
    <g className="club-landing-bob" style={{ animationDelay: `${delay}s` }}>
      <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${k})`}>{body}</g>
      <Pilot kind={pilot} x={px} y={py} r={cockpitR * k} id={id} />
    </g>
  );
}

/** Cristal plano de tres facetas (drawGem). */
function Gem({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M0 -15 L9 -3 L0 15 L-9 -3 Z" fill={MINT} />
      <path d="M0 -15 L0 -3 L-9 -3 Z" fill="#BDEEE3" />
      <path d="M9 -3 L0 15 L0 -3 Z" fill="#4FA896" />
      <path d="M0 -15 L9 -3 L0 15 L-9 -3 Z" fill="none" stroke="#357265" strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

/**
 * La escena se recorta a los lados en pantallas angostas (`slice`): las tres naves principales
 * viven en la franja central (x 300–900) y lo de las orillas es de relleno.
 */
export function WorldScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="El Mundo del club: naves con Ghosty, un alien y un astronauta volando entre cristales"
      className={className}
    >
      <style>{`
        @keyframes club-landing-bob { from { transform: translateY(-7px) } to { transform: translateY(7px) } }
        .club-landing-bob { animation: club-landing-bob 3.2s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .club-landing-bob { animation: none } }
      `}</style>
      <rect width={W} height={H} fill={BG} />
      {/* cielo: bandas planas y órbita, para que el fondo no sea liso */}
      <circle cx={600} cy={620} r={560} fill={PANEL} />
      <circle cx={600} cy={620} r={400} fill="#18222A" />
      <ellipse cx={600} cy={430} rx={540} ry={210} fill="none" stroke={LINE} strokeWidth={3} strokeDasharray="3 16" strokeLinecap="round" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} />
      ))}
      {/* planeta al que se llega */}
      <circle cx={600} cy={640} r={290} fill={INK} />
      <circle cx={500} cy={392} r={15} fill="#D9E3E0" />
      <circle cx={690} cy={400} r={10} fill="#D9E3E0" />
      <circle cx={610} cy={376} r={6} fill="#D9E3E0" />

      <Gem x={600} y={196} k={1.9} />
      <Gem x={352} y={318} k={1.3} />
      <Gem x={84} y={84} k={1.5} />
      <Gem x={1120} y={300} k={1.6} />

      <Ship model="rocket" color="mint" pilot="ghosty" x={420} y={150} deg={-14} size={170} id="club-landing-pilot-1" delay={0} />
      <Ship model="saucer" color="green" pilot="alien" x={800} y={130} deg={0} size={132} id="club-landing-pilot-2" delay={-1.1} />
      <Ship model="pod" color="mint" pilot="astro" x={836} y={300} deg={196} size={116} id="club-landing-pilot-3" delay={-2.2} />
      <Ship model="dart" color="green" pilot="astro" x={150} y={300} deg={-30} size={96} id="club-landing-pilot-4" delay={-0.6} />
      <Ship model="dart" color="mint" pilot="alien" x={1060} y={110} deg={205} size={84} id="club-landing-pilot-5" delay={-1.7} />
    </svg>
  );
}
