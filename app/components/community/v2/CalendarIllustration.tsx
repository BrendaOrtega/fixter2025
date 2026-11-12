// Calendario de pared del panel del anfitrión (12-nov-2026). Ilustración plana del rediseño:
// rellenos sólidos, borde fino y sombra suave. Anima con CSS @keyframes en bucle finito, así
// llega completa desde el HTML del servidor.
export function CalendarIllustration({ className = "" }: { className?: string }) {
  // Cuadrícula de días: 5 columnas × 3 renglones; el día marcado es el de la llamada.
  const days = Array.from({ length: 15 }, (_, i) => ({ x: 46 + (i % 5) * 26, y: 92 + Math.floor(i / 5) * 24, i }));
  const picked = 8;
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Un calendario con el día de la llamada marcado y una campana de recordatorio" className={className}>
      <style>{`
        @keyframes cal-pick { 0%,100% { transform: scale(1) } 40% { transform: scale(1.28) } 70% { transform: scale(.94) } }
        @keyframes cal-ring { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-14deg) } 40% { transform: rotate(12deg) } 60% { transform: rotate(-8deg) } 80% { transform: rotate(4deg) } }
        @keyframes cal-page { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes cal-tick { 0% { stroke-dashoffset: 22 } 100% { stroke-dashoffset: 0 } }
        .cal-page { animation: cal-page 3.2s ease-in-out 3; }
        .cal-pick { animation: cal-pick 1.6s ease-in-out .4s 4; transform-box: fill-box; transform-origin: center; }
        .cal-bell { animation: cal-ring 1.6s ease-in-out 1s 4; transform-box: fill-box; transform-origin: 50% 0%; }
        .cal-tick { stroke-dasharray: 22; animation: cal-tick .5s ease-out .3s both; }
        @media (prefers-reduced-motion: reduce) { .cal-page,.cal-pick,.cal-bell,.cal-tick { animation: none } }
      `}</style>

      {/* sombra suave en el piso */}
      <ellipse cx="112" cy="186" rx="78" ry="7" fill="#000" opacity=".22" />

      <g className="cal-page">
        {/* hoja de atrás */}
        <rect x="32" y="34" width="168" height="144" rx="14" fill="#1C252B" stroke="#232D33" strokeWidth="1.5" transform="rotate(-4 116 106)" />
        {/* hoja principal */}
        <rect x="28" y="30" width="168" height="144" rx="14" fill="#F2F5F4" stroke="#D9E0DE" strokeWidth="1.5" />
        {/* cabecera del mes */}
        <path d="M28 44 a14 14 0 0 1 14 -14 h140 a14 14 0 0 1 14 14 v26 h-168 z" fill="#85DDCB" />
        <rect x="46" y="46" width="52" height="8" rx="4" fill="#0E1317" opacity=".75" />
        <rect x="104" y="46" width="24" height="8" rx="4" fill="#0E1317" opacity=".35" />
        {/* argollas */}
        {[64, 112, 160].map((x) => (
          <g key={x}>
            <circle cx={x} cy="34" r="6" fill="#0E1317" opacity=".25" />
            <rect x={x - 3} y="18" width="6" height="22" rx="3" fill="#7C8A8E" />
          </g>
        ))}
        {/* días */}
        {days.map((d) =>
          d.i === picked ? (
            <g key={d.i} className="cal-pick">
              <circle cx={d.x + 7} cy={d.y + 7} r="12" fill="#85DDCB" />
              <path className="cal-tick" d={`M${d.x + 1} ${d.y + 7} l4.5 4.5 l8 -9`} fill="none" stroke="#0E1317" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : (
            <rect key={d.i} x={d.x} y={d.y} width="14" height="14" rx="4" fill={d.i < 3 ? "#D9E0DE" : "#C4CECB"} />
          ),
        )}
      </g>

      {/* campana del recordatorio */}
      <g className="cal-bell">
        <circle cx="198" cy="52" r="26" fill="#141B20" stroke="#232D33" strokeWidth="1.5" />
        <path d="M198 38 c-8 0 -11 6 -11 13 c0 6 -2 8 -4 10 h30 c-2 -2 -4 -4 -4 -10 c0 -7 -3 -13 -11 -13 z" fill="#8DCF6E" />
        <circle cx="198" cy="65" r="3.5" fill="#8DCF6E" />
        <circle cx="198" cy="37" r="2.5" fill="#8DCF6E" />
      </g>
    </svg>
  );
}
