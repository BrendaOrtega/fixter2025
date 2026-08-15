// Un sobre de papel que respira: la solapa se abre apenas y la carta asoma,
// una y otra vez. El lenguaje viene del deck del webinar: trazo grueso, plano,
// paleta menta/pasto/ámbar sobre superficie oscura.
export function EnvelopeIllustration({
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
        .env-sheet   { animation: env-peek 5s cubic-bezier(.4,0,.4,1) infinite; }
        .env-flap    { animation: env-flap 5s cubic-bezier(.4,0,.4,1) infinite;
                       transform-origin: 120px 52px; }
        .env-body    { animation: env-breathe 5s ease-in-out infinite;
                       transform-origin: 120px 110px; }
        .env-seal    { animation: env-seal 5s ease-in-out infinite;
                       transform-origin: 120px 108px; }
        .env-spark   { animation: env-spark 5s ease-in-out infinite; }
        .env-spark--2{ animation-delay: .35s; }
        .env-spark--3{ animation-delay: .7s; }
        @keyframes env-peek {
          0%, 18%   { transform: translateY(0); }
          46%, 66%  { transform: translateY(-26px); }
          92%, 100% { transform: translateY(0); }
        }
        @keyframes env-flap {
          0%, 14%   { transform: rotateX(0deg); }
          40%, 70%  { transform: rotateX(-152deg); }
          94%, 100% { transform: rotateX(0deg); }
        }
        @keyframes env-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.025); }
        }
        @keyframes env-seal {
          0%, 12%   { opacity: 1; transform: scale(1); }
          34%, 78%  { opacity: 0; transform: scale(.5); }
          96%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes env-spark {
          0%, 30%  { opacity: 0; transform: translateY(4px); }
          48%      { opacity: 1; transform: translateY(-6px); }
          70%,100% { opacity: 0; transform: translateY(-14px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .env-sheet, .env-flap, .env-body, .env-seal, .env-spark {
            animation: none;
          }
        }
      `}</style>

      {/* halo tenue detrás del sobre */}
      <radialGradient id="env-glow" cx="50%" cy="52%" r="52%">
        <stop offset="0%" stopColor="#85DDCB" stopOpacity=".22" />
        <stop offset="100%" stopColor="#85DDCB" stopOpacity="0" />
      </radialGradient>
      <circle cx="120" cy="96" r="86" fill="url(#env-glow)" />

      {/* la carta: sube desde dentro del sobre, recortada por su boca */}
      <clipPath id="env-clip">
        <rect x="46" y="24" width="148" height="120" />
      </clipPath>
      <g clipPath="url(#env-clip)">
        <g className="env-sheet">
          <rect
            x="70"
            y="60"
            width="100"
            height="76"
            rx="6"
            fill="#182128"
            stroke="#B7B9BA"
            strokeWidth="3"
          />
          <path
            d="M84 80h72M84 94h72M84 108h44"
            stroke="#B7B9BA"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".6"
          />
          <circle cx="152" cy="108" r="7" fill="#8DCF6E" />
        </g>
      </g>

      <g className="env-body">
        {/* cuerpo del sobre */}
        <rect
          x="46"
          y="52"
          width="148"
          height="92"
          rx="10"
          fill="#0E1317"
          stroke="#85DDCB"
          strokeWidth="4"
        />
        {/* dobleces laterales del papel */}
        <path
          d="M46 144l58-46M194 144l-58-46"
          stroke="#2C3944"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* solapa */}
        <path
          className="env-flap"
          d="M46 56l70 46a8 8 0 009 0l69-46"
          fill="#0E1317"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* sello de cera */}
        <g className="env-seal">
          <circle cx="120" cy="108" r="11" fill="#FFC46B" />
          <path
            d="M115 108l4 4 7-8"
            stroke="#0E1317"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>

      {/* chispas que salen al abrirse */}
      <g fill="#8DCF6E">
        <circle className="env-spark" cx="72" cy="42" r="4" />
        <circle className="env-spark env-spark--2" cx="120" cy="28" r="3" />
        <circle className="env-spark env-spark--3" cx="170" cy="44" r="4" />
      </g>
    </svg>
  );
}
