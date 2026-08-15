// Una terminal de escritorio: el cursor parpadea, las líneas se escriben solas
// y una flecha de ciclo da vueltas alrededor del prompt — el bucle que corre
// cada vez que toca mandar el siguiente correo.
export function TerminalIllustration({
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
        .trm-caret { animation: trm-blink 1.05s steps(1,end) infinite; }
        .trm-line  { animation: trm-type 5.4s cubic-bezier(.7,0,.3,1) infinite;
                     transform-origin: left center; }
        .trm-line--2 { animation-delay: .7s; }
        .trm-line--3 { animation-delay: 1.4s; }
        .trm-line--4 { animation-delay: 2.1s; }
        .trm-loop  { animation: trm-spin 5.4s linear infinite;
                     transform-origin: 196px 132px; }
        .trm-dot   { animation: trm-pulse 5.4s ease-in-out infinite; }
        .trm-dot--2 { animation-delay: .25s; }
        .trm-dot--3 { animation-delay: .5s; }
        @keyframes trm-blink { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
        @keyframes trm-type {
          0%       { transform: scaleX(0); opacity: 0; }
          6%       { opacity: 1; }
          22%, 82% { transform: scaleX(1); opacity: 1; }
          94%,100% { transform: scaleX(1); opacity: 0; }
        }
        @keyframes trm-spin { to { transform: rotate(360deg); } }
        @keyframes trm-pulse {
          0%,100% { opacity:.45 } 40% { opacity:1 }
        }
        @media (prefers-reduced-motion: reduce) {
          .trm-caret, .trm-line, .trm-loop, .trm-dot { animation: none; }
        }
      `}</style>

      <radialGradient id="trm-glow" cx="50%" cy="48%" r="55%">
        <stop offset="0%" stopColor="#85DDCB" stopOpacity=".2" />
        <stop offset="100%" stopColor="#85DDCB" stopOpacity="0" />
      </radialGradient>
      <circle cx="118" cy="88" r="86" fill="url(#trm-glow)" />

      {/* base del monitor */}
      <path
        d="M104 148h32M120 136v12"
        stroke="#2C3944"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* chasis */}
      <rect
        x="30"
        y="30"
        width="180"
        height="108"
        rx="12"
        fill="#0E1317"
        stroke="#85DDCB"
        strokeWidth="4"
      />
      {/* barra de título con los tres botones */}
      <path d="M30 52h180" stroke="#2C3944" strokeWidth="3" />
      <g>
        <circle className="trm-dot" cx="46" cy="41" r="4" fill="#F2777A" />
        <circle
          className="trm-dot trm-dot--2"
          cx="60"
          cy="41"
          r="4"
          fill="#FFC46B"
        />
        <circle
          className="trm-dot trm-dot--3"
          cx="74"
          cy="41"
          r="4"
          fill="#8DCF6E"
        />
      </g>

      {/* prompts: cada línea se escribe de izquierda a derecha */}
      <g strokeLinecap="round">
        <path d="M44 68l8 7-8 7" stroke="#8DCF6E" strokeWidth="3" fill="none" />
        <path
          className="trm-line"
          d="M62 75h72"
          stroke="#85DDCB"
          strokeWidth="4"
        />
        <path
          className="trm-line trm-line--2"
          d="M62 92h96"
          stroke="#B7B9BA"
          strokeWidth="4"
          opacity=".65"
        />
        <path
          className="trm-line trm-line--3"
          d="M62 109h52"
          stroke="#B7B9BA"
          strokeWidth="4"
          opacity=".65"
        />
        <path
          d="M44 122l8 7-8 7"
          stroke="#8DCF6E"
          strokeWidth="3"
          fill="none"
        />
        <path
          className="trm-line trm-line--4"
          d="M62 129h34"
          stroke="#FFC46B"
          strokeWidth="4"
        />
      </g>

      {/* el cursor que parpadea al final de la última línea */}
      <rect
        className="trm-caret"
        x="102"
        y="121"
        width="9"
        height="16"
        rx="2"
        fill="#85DDCB"
      />

      {/* la flecha del bucle, girando fuera del chasis */}
      <g className="trm-loop">
        <path
          d="M196 110a22 22 0 11-19 11"
          fill="none"
          stroke="#8DCF6E"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M188 104l9 6-6 9"
          fill="none"
          stroke="#8DCF6E"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
