// Micrófono de la llamada en vivo del club (10-nov-2026). Caricatura plana de
// la casa: contorno grueso, rellenos sólidos y sombra dura. Anima con CSS
// @keyframes (como EnvelopeIllustration), así se ve completo desde el HTML del
// servidor aunque la hidratación tarde.
export function MicIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-label="Un micrófono de transmisión en vivo con ondas de sonido"
      className={className}
    >
      <style>{`
        @keyframes mic-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes mic-wave { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes mic-dot { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
        .mic-body { animation: mic-bob 3s ease-in-out infinite; transform-box: fill-box; }
        .mic-w1 { animation: mic-wave 1.6s ease-in-out infinite; }
        .mic-w2 { animation: mic-wave 1.6s ease-in-out .4s infinite; }
        .mic-live { animation: mic-dot 1.2s steps(2) infinite; }
        @media (prefers-reduced-motion: reduce) { .mic-body,.mic-w1,.mic-w2,.mic-live { animation: none } }
      `}</style>

      {/* sombra dura */}
      <ellipse cx="128" cy="214" rx="62" ry="10" fill="#000" opacity=".35" />

      {/* ondas de sonido */}
      <g fill="none" stroke="#85DDCB" strokeWidth="8" strokeLinecap="round">
        <path className="mic-w1" d="M52 70 Q36 100 52 130" />
        <path className="mic-w2" d="M30 56 Q6 100 30 144" />
        <path className="mic-w1" d="M188 70 Q204 100 188 130" />
        <path className="mic-w2" d="M210 56 Q234 100 210 144" />
      </g>

      <g className="mic-body">
        {/* base y pie */}
        <rect x="88" y="190" width="64" height="16" rx="8" fill="#7C8A8E" stroke="#F2F5F4" strokeWidth="6" />
        <rect x="113" y="150" width="14" height="44" fill="#7C8A8E" stroke="#F2F5F4" strokeWidth="6" />
        {/* horquilla */}
        <path d="M76 98 V118 Q76 156 120 156 Q164 156 164 118 V98" fill="none" stroke="#F2F5F4" strokeWidth="8" strokeLinecap="round" />
        {/* cápsula */}
        <rect x="88" y="26" width="64" height="112" rx="32" fill="#85DDCB" stroke="#F2F5F4" strokeWidth="6" />
        {/* rejilla */}
        <g stroke="#0E1317" strokeWidth="5" strokeLinecap="round">
          <line x1="104" y1="52" x2="136" y2="52" />
          <line x1="100" y1="68" x2="140" y2="68" />
          <line x1="100" y1="84" x2="140" y2="84" />
          <line x1="104" y1="100" x2="136" y2="100" />
        </g>
        {/* foco «EN VIVO» */}
        <rect x="96" y="114" width="48" height="16" rx="8" fill="#0E1317" />
        <circle className="mic-live" cx="106" cy="122" r="4" fill="#ef4444" />
        <text x="126" y="126" textAnchor="middle" fontSize="10" fontWeight="700" fill="#F2F5F4" fontFamily="system-ui, sans-serif">
          VIVO
        </text>
      </g>
    </svg>
  );
}
