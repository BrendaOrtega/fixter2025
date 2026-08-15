// Una libreta de espiral abierta sobre el escritorio: las hojas pasan una tras
// otra, el lápiz subraya y una marca de palomita queda tachando lo hecho.
export function NotebookIllustration({
  className = "w-full max-w-xs",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 180"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <style>{`
        .nbk-page  { animation: nbk-turn 6s cubic-bezier(.45,0,.35,1) infinite;
                     transform-origin: 120px 100px; }
        .nbk-page--2 { animation-delay: 2s; }
        .nbk-page--3 { animation-delay: 4s; }
        .nbk-pencil{ animation: nbk-write 6s ease-in-out infinite; }
        .nbk-under { animation: nbk-underline 6s ease-in-out infinite;
                     transform-origin: left center; }
        .nbk-check { animation: nbk-check 6s ease-in-out infinite; }
        @keyframes nbk-turn {
          0%       { transform: rotateY(0deg); opacity: 1; }
          58%      { transform: rotateY(0deg); opacity: 1; }
          78%      { transform: rotateY(-118deg); opacity: .35; }
          82%,100% { transform: rotateY(0deg); opacity: 1; }
        }
        @keyframes nbk-write {
          0%, 8%   { transform: translate(0,0) rotate(0deg); }
          30%      { transform: translate(46px,3px) rotate(3deg); }
          46%,100% { transform: translate(0,0) rotate(0deg); }
        }
        @keyframes nbk-underline {
          0%, 8%   { transform: scaleX(0); }
          32%, 62% { transform: scaleX(1); }
          70%,100% { transform: scaleX(0); }
        }
        @keyframes nbk-check {
          0%, 34%  { opacity: 0; transform: scale(.4); }
          44%, 64% { opacity: 1; transform: scale(1); }
          72%,100% { opacity: 0; transform: scale(.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nbk-page, .nbk-pencil, .nbk-under, .nbk-check { animation: none; }
        }
      `}</style>

      <radialGradient id="nbk-glow" cx="50%" cy="52%" r="55%">
        <stop offset="0%" stopColor="#FFC46B" stopOpacity=".16" />
        <stop offset="100%" stopColor="#FFC46B" stopOpacity="0" />
      </radialGradient>
      <circle cx="120" cy="96" r="86" fill="url(#nbk-glow)" />

      {/* tapa: la libreta cerrada que se ve por debajo */}
      <rect
        x="52"
        y="46"
        width="136"
        height="110"
        rx="10"
        fill="#182128"
        stroke="#2C3944"
        strokeWidth="4"
      />

      {/* la hoja de arriba, que gira */}
      <g style={{ perspective: "420px" }}>
        {[0, 1, 2].map((i) => (
          <g
            key={i}
            className={`nbk-page${i ? ` nbk-page--${i + 1}` : ""}`}
          >
            <rect
              x="58"
              y="40"
              width="124"
              height="108"
              rx="8"
              fill="#0E1317"
              stroke="#85DDCB"
              strokeWidth="4"
            />
            <path
              d="M76 76h88M76 94h88M76 112h56"
              stroke="#B7B9BA"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".55"
            />
            {/* el subrayado que dibuja el lápiz */}
            <path
              className="nbk-under"
              d="M76 94h64"
              stroke="#FFC46B"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* margen rojo, detalle de cuaderno de verdad */}
      <path
        d="M70 46v96"
        stroke="#F2777A"
        strokeWidth="2.5"
        opacity=".7"
        strokeLinecap="round"
      />

      {/* espiral */}
      <g stroke="#B7B9BA" strokeWidth="4" strokeLinecap="round" fill="none">
        {[54, 74, 94, 114, 134].map((y) => (
          <path key={y} d={`M48 ${y}h20a7 7 0 000-9H50`} />
        ))}
      </g>

      {/* palomita de tarea cumplida */}
      <g className="nbk-check">
        <circle cx="160" cy="112" r="13" fill="#8DCF6E" />
        <path
          d="M154 112l4 5 8-10"
          fill="none"
          stroke="#0E1317"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* lápiz que recorre el renglón */}
      <g className="nbk-pencil">
        <g transform="rotate(38 132 92)">
          <rect
            x="126"
            y="52"
            width="13"
            height="44"
            rx="3"
            fill="#FFC46B"
            stroke="#0E1317"
            strokeWidth="2.5"
          />
          <path
            d="M126 96h13l-6.5 12z"
            fill="#B7B9BA"
            stroke="#0E1317"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M126 88h13" stroke="#0E1317" strokeWidth="2.5" />
          <rect x="126" y="44" width="13" height="9" rx="3" fill="#F2777A" />
        </g>
      </g>
    </svg>
  );
}
