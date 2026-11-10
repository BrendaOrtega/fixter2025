// Ilustración del hero de comunidades (10-nov-2026): una llamada en vivo con varias personas, globos
// del muro y miembros alrededor. Estilo oficial del sitio (menta, verde, tinta, sin glow).
// Animación sólo con CSS sobre lo que ya se ve: nada arranca invisible.

const MINT = "#85DDCB";
const GREEN = "#8DCF6E";
const INK = "#0E1317";
const PANEL = "#1A2328";
const LINE = "#2B3A40";

/** Persona simple: cabeza y hombros. */
function Person({ x, y, s = 1, skin, shirt }: { x: number; y: number; s?: number; skin: string; shirt: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 34 a26 22 0 0 1 52 0 v6 h-52 z" fill={shirt} />
      <circle cx="0" cy="0" r="15" fill={skin} />
    </g>
  );
}

export function CommunityIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 340" className={className} role="img" aria-label="Una llamada en vivo con los miembros de una comunidad">
      <style>{`
        @keyframes ci-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes ci-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        .ci-float-a { animation: ci-float 4s ease-in-out infinite; }
        .ci-float-b { animation: ci-float 4s ease-in-out 1.3s infinite; }
        .ci-float-c { animation: ci-float 4s ease-in-out 2.6s infinite; }
        .ci-dot { animation: ci-pulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ci-float-a,.ci-float-b,.ci-float-c,.ci-dot { animation: none } }
      `}</style>

      {/* sombra */}
      <ellipse cx="210" cy="318" rx="150" ry="10" fill="#000" opacity=".35" />

      {/* pantalla de la llamada */}
      <rect x="70" y="70" width="280" height="200" rx="18" fill={PANEL} stroke={LINE} strokeWidth="3" />
      <rect x="70" y="70" width="280" height="30" rx="18" fill={LINE} />
      <rect x="70" y="86" width="280" height="14" fill={LINE} />
      <circle cx="90" cy="85" r="4" fill="#7C8A8E" />
      <circle cx="104" cy="85" r="4" fill="#7C8A8E" />
      {/* «VIVO» */}
      <rect x="282" y="76" width="56" height="18" rx="9" fill={INK} />
      <circle className="ci-dot" cx="294" cy="85" r="4" fill="#E5484D" />
      <text x="302" y="89.5" fontSize="11" fontWeight="700" fill="#F2F5F4" fontFamily="system-ui, sans-serif">VIVO</text>

      {/* anfitrión grande */}
      <rect x="82" y="110" width="150" height="148" rx="12" fill={INK} />
      <Person x={157} y={176} s={1.6} skin="#F2C9A0" shirt={MINT} />
      <rect x="92" y="236" width="62" height="14" rx="7" fill={MINT} />
      <text x="99" y="246.5" fontSize="9" fontWeight="700" fill={INK} fontFamily="system-ui, sans-serif">Anfitrión</text>

      {/* miembros */}
      <rect x="240" y="110" width="98" height="70" rx="10" fill={INK} />
      <Person x={289} y={136} s={0.9} skin="#C68B59" shirt={GREEN} />
      <rect x="240" y="188" width="98" height="70" rx="10" fill={INK} />
      <Person x={289} y={214} s={0.9} skin="#8D5A3B" shirt="#F2F5F4" />

      {/* globo del muro */}
      <g className="ci-float-a">
        <rect x="8" y="40" width="112" height="44" rx="14" fill={MINT} />
        <path d="M40 84 l-6 12 l16 -12 z" fill={MINT} />
        <rect x="22" y="53" width="70" height="7" rx="3.5" fill={INK} opacity=".75" />
        <rect x="22" y="66" width="48" height="7" rx="3.5" fill={INK} opacity=".45" />
      </g>

      {/* 👍 y contador */}
      <g className="ci-float-b">
        <rect x="318" y="22" width="88" height="38" rx="19" fill={GREEN} />
        <text x="332" y="47" fontSize="17" fontFamily="system-ui, sans-serif">👍</text>
        <text x="356" y="47" fontSize="15" fontWeight="800" fill={INK} fontFamily="system-ui, sans-serif">+24</text>
      </g>

      {/* miembros que se suman */}
      <g className="ci-float-c">
        <rect x="292" y="276" width="120" height="44" rx="22" fill={PANEL} stroke={LINE} strokeWidth="2" />
        <circle cx="316" cy="298" r="12" fill="#F2C9A0" stroke={PANEL} strokeWidth="3" />
        <circle cx="334" cy="298" r="12" fill={GREEN} stroke={PANEL} strokeWidth="3" />
        <circle cx="352" cy="298" r="12" fill={MINT} stroke={PANEL} strokeWidth="3" />
        <text x="370" y="303" fontSize="13" fontWeight="800" fill="#F2F5F4" fontFamily="system-ui, sans-serif">+34</text>
      </g>

      {/* insignia */}
      <g className="ci-float-b">
        <circle cx="40" cy="250" r="26" fill={PANEL} stroke={MINT} strokeWidth="3" />
        <text x="27" y="258" fontSize="22" fontFamily="system-ui, sans-serif">🎓</text>
      </g>
    </svg>
  );
}
