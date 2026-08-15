// Un buzón de calle con su banderita: caen tres cartas, una tras otra, la
// puertita se abre para tragárselas y la bandera sube cuando la última entra.
export function MailboxIllustration({
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
        .mbx-letter  { animation: mbx-drop 6s cubic-bezier(.5,0,.6,1) infinite; }
        .mbx-letter--2 { animation-delay: 1.6s; }
        .mbx-letter--3 { animation-delay: 3.2s; }
        .mbx-door    { animation: mbx-door 6s ease-in-out infinite;
                       transform-origin: 176px 92px; }
        .mbx-flag    { animation: mbx-flag 6s cubic-bezier(.3,1.3,.5,1) infinite;
                       transform-origin: 62px 96px; }
        .mbx-post    { animation: mbx-tap 6s ease-in-out infinite;
                       transform-origin: 120px 160px; }
        @keyframes mbx-drop {
          0%       { opacity: 0; transform: translate(0,-70px) rotate(-14deg); }
          6%       { opacity: 1; }
          22%      { transform: translate(0,-4px) rotate(0deg); }
          28%      { opacity: 1; transform: translate(14px,2px) rotate(0deg); }
          34%,100% { opacity: 0; transform: translate(30px,2px) rotate(0deg); }
        }
        @keyframes mbx-door {
          0%, 12%   { transform: rotate(0deg); }
          20%, 30%  { transform: rotate(-58deg); }
          40%, 100% { transform: rotate(0deg); }
        }
        @keyframes mbx-flag {
          0%, 62%   { transform: rotate(72deg); }
          72%, 96%  { transform: rotate(0deg); }
          100%      { transform: rotate(72deg); }
        }
        @keyframes mbx-tap {
          0%, 16%, 100% { transform: translateY(0); }
          22%           { transform: translateY(2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mbx-letter, .mbx-door, .mbx-flag, .mbx-post { animation: none; }
        }
      `}</style>

      <radialGradient id="mbx-glow" cx="52%" cy="55%" r="55%">
        <stop offset="0%" stopColor="#8DCF6E" stopOpacity=".2" />
        <stop offset="100%" stopColor="#8DCF6E" stopOpacity="0" />
      </radialGradient>
      <circle cx="120" cy="98" r="88" fill="url(#mbx-glow)" />

      {/* cartas que caen y entran por la boca */}
      <g>
        {[0, 1, 2].map((i) => (
          <g
            key={i}
            className={`mbx-letter${i ? ` mbx-letter--${i + 1}` : ""}`}
          >
            <rect
              x="116"
              y="52"
              width="34"
              height="24"
              rx="4"
              fill="#182128"
              stroke="#FFC46B"
              strokeWidth="3"
            />
            <path
              d="M116 56l15 11a4 4 0 004 0l15-11"
              fill="none"
              stroke="#FFC46B"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>

      <g className="mbx-post">
        {/* poste y base */}
        <path
          d="M120 118v42"
          stroke="#2C3944"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M92 164h56"
          stroke="#B7B9BA"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* caja: cuerpo de túnel */}
        <path
          d="M74 116V92a46 26 0 0192 0v24z"
          fill="#0E1317"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* remaches del costado, detalle de más */}
        <g fill="#2C3944">
          <circle cx="88" cy="106" r="3" />
          <circle cx="88" cy="94" r="3" />
          <circle cx="100" cy="112" r="3" />
        </g>
        {/* ranura */}
        <path
          d="M96 100h44"
          stroke="#2C3944"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* puertita del frente, con bisagra abajo */}
        <g className="mbx-door">
          <path
            d="M166 116V92a46 26 0 00-12-18v42z"
            fill="#182128"
            stroke="#85DDCB"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="160" cy="98" r="3.5" fill="#85DDCB" />
        </g>

        {/* banderita */}
        <g className="mbx-flag">
          <path
            d="M62 96V64"
            stroke="#B7B9BA"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M62 66h22l-7 8 7 8H62z"
            fill="#F2777A"
            stroke="#F2777A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
