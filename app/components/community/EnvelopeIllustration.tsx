/**
 * Sobre abierto del que sale la carta. Flat vector, paleta del sitio, cero
 * gradientes: el volumen es por planos.
 *
 * La animación es CSS puro dentro del SVG, no Motion: aquí los `motion.g`
 * hijos de un <svg> no llegaban a animar (ni transform inline ni animación
 * WAAPI activa, medido en el navegador), mientras que con @keyframes corre
 * siempre y sin depender de la hidratación.
 *
 * Cada bucle empieza y termina en el mismo valor y los periodos no coinciden
 * entre sí, así el reinicio cae donde ya estaba y no se nota dónde arranca.
 */
export const EnvelopeIllustration = ({
  className = "",
}: {
  className?: string;
}) => {
  const flyers = [
    { x: 248, y: 64, s: 0.42, cls: "vuela-a" },
    { x: 34, y: 100, s: 0.32, cls: "vuela-b" },
    { x: 242, y: 150, s: 0.26, cls: "vuela-c" },
  ];

  const lines = [
    { d: "M94 84h92", i: 0 },
    { d: "M94 98h80", i: 1 },
    { d: "M94 112h92", i: 2 },
    { d: "M94 126h56", i: 3 },
  ];

  const motes = [
    { x: 62, y: 92, r: 2.5, cls: "mota-a" },
    { x: 222, y: 104, r: 3, cls: "mota-b" },
    { x: 50, y: 168, r: 2, cls: "mota-c" },
  ];

  return (
    <svg
      // Un poco de aire arriba y a los lados: la carta se eleva y rota con la
      // animación, y con el viewBox justo al dibujo se recortaba contra el
      // borde en cada ciclo.
      viewBox="-16 -14 312 248"
      className={className}
      role="img"
      aria-label="Un sobre abierto con una carta saliendo"
    >
      <style>{`
        .ei * { transform-box: fill-box; }
        .ei .sobre   { transform-origin: 50% 90%;  animation: ei-sobre 1.6s ease-in-out infinite; }
        .ei .hoja    { transform-origin: 50% 70%;  animation: ei-hoja 1.5s ease-in-out infinite; }
        .ei .timbre  { transform-origin: 50% 50%;  animation: ei-timbre .9s ease-in-out infinite; }
        .ei .frente  { transform-origin: 50% 100%; animation: ei-frente 1s ease-in-out infinite; }
        .ei .renglon { animation: ei-renglon 1.2s ease-in-out infinite; }
        .ei .vuela-a { transform-origin: 50% 50%;  animation: ei-vuela 1.9s ease-out infinite; }
        .ei .vuela-b { transform-origin: 50% 50%;  animation: ei-vuela-izq 2.2s ease-out .7s infinite; }
        .ei .vuela-c { transform-origin: 50% 50%;  animation: ei-vuela 1.7s ease-out 1.3s infinite; }
        .ei .mota-a  { transform-origin: 50% 50%;  animation: ei-mota 1.6s ease-out infinite; }
        .ei .mota-b  { transform-origin: 50% 50%;  animation: ei-mota 1.9s ease-out .5s infinite; }
        .ei .mota-c  { transform-origin: 50% 50%;  animation: ei-mota 1.4s ease-out 1s infinite; }
        .ei .chispa-a{ transform-origin: 50% 50%;  animation: ei-chispa 1.3s ease-in-out infinite; }
        .ei .chispa-b{ transform-origin: 50% 50%;  animation: ei-chispa-b 1.1s ease-in-out infinite; }
        .ei .punto-a { transform-origin: 50% 50%;  animation: ei-punto 1.15s ease-in-out infinite; }
        .ei .punto-b { transform-origin: 50% 50%;  animation: ei-punto-b 1.25s ease-in-out infinite; }

        @keyframes ei-sobre {
          0%   { transform: translateY(0) scale(.95) rotate(-1.2deg); }
          45%  { transform: translateY(-4px) scale(1.06) rotate(1.2deg); }
          70%  { transform: translateY(-1px) scale(.99) rotate(0deg); }
          100% { transform: translateY(0) scale(.95) rotate(-1.2deg); }
        }
        @keyframes ei-hoja {
          0%   { transform: translate(-4px, 18px) rotate(-4deg) scale(.96); }
          22%  { transform: translate(4px, -14px) rotate(5deg) scale(1.06); }
          50%  { transform: translate(-2px, 6px) rotate(-2deg) scale(1); }
          72%  { transform: translate(3px, -9px) rotate(3deg) scale(1.04); }
          100% { transform: translate(-4px, 18px) rotate(-4deg) scale(.96); }
        }
        @keyframes ei-timbre {
          0%,100% { transform: scale(1); }
          40%     { transform: scale(1.18); }
          70%     { transform: scale(.96); }
        }
        @keyframes ei-frente {
          0%,100% { transform: scale(1, 1); }
          40%     { transform: scale(1.02, .97); }
          70%     { transform: scale(.99, 1.02); }
        }
        @keyframes ei-renglon {
          0%,100% { opacity: .3; }
          50%     { opacity: 1; }
        }
        @keyframes ei-vuela {
          0%   { transform: translate(0,0) scale(.3) rotate(0deg); opacity: 0; }
          35%  { transform: translate(6px,-14px) scale(1.15) rotate(18deg); opacity: 1; }
          100% { transform: translate(14px,-30px) scale(.6) rotate(40deg); opacity: 0; }
        }
        @keyframes ei-vuela-izq {
          0%   { transform: translate(0,0) scale(.3) rotate(0deg); opacity: 0; }
          35%  { transform: translate(-5px,-12px) scale(1.15) rotate(-18deg); opacity: 1; }
          100% { transform: translate(-12px,-26px) scale(.6) rotate(-40deg); opacity: 0; }
        }
        @keyframes ei-mota {
          0%   { transform: translateY(0) scale(.4); opacity: 0; }
          50%  { transform: translateY(-9px) scale(1.6); opacity: 1; }
          100% { transform: translateY(-14px) scale(.4); opacity: 0; }
        }
        @keyframes ei-chispa {
          0%,100% { transform: scale(.6) rotate(0deg); opacity: .25; }
          50%     { transform: scale(1.5) rotate(180deg); opacity: 1; }
        }
        @keyframes ei-chispa-b {
          0%,100% { transform: scale(1.5) rotate(0deg); opacity: 1; }
          50%     { transform: scale(.5) rotate(-180deg); opacity: .2; }
        }
        @keyframes ei-punto {
          0%,100% { transform: scale(.4); opacity: .3; }
          50%     { transform: scale(1.8); opacity: 1; }
        }
        @keyframes ei-punto-b {
          0%,100% { transform: scale(1.6); opacity: 1; }
          50%     { transform: scale(.4); opacity: .25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ei * { animation: none !important; }
        }
      `}</style>

      <defs>
        {/* la carta no puede salirse por abajo */}
        <clipPath id="dentro-del-sobre">
          <rect x="30" y="0" width="220" height="196" />
        </clipPath>
        {/* los dobleces se recortan contra el frente: si no, se salen por las
            esquinas redondeadas */}
        <clipPath id="frente-del-sobre">
          <path d="M44 198V116l96 62 96-62v82a12 12 0 0 1-12 12H56a12 12 0 0 1-12-12z" />
        </clipPath>
      </defs>

      <g className="ei">
        {/* motitas */}
        {motes.map((m, i) => (
          <circle
            key={`m${i}`}
            className={m.cls}
            cx={m.x}
            cy={m.y}
            r={m.r}
            fill="#37AB93"
          />
        ))}

        {/* el sobre entero late */}
        <g className="sobre">
          {/* panel trasero */}
          <rect x="44" y="86" width="192" height="112" rx="12" fill="#37AB93" />

          {/* el recorte va en un grupo quieto: si se moviera con la carta, no
              serviría de nada */}
          <g clipPath="url(#dentro-del-sobre)">
            <g className="hoja">
              <rect
                x="80"
                y="28"
                width="120"
                height="182"
                rx="8"
                fill="#F7FFFD"
                stroke="#19262A"
                strokeWidth="3"
              />
              {/* timbre */}
              <g className="timbre">
                <rect
                  x="164"
                  y="40"
                  width="24"
                  height="28"
                  rx="3"
                  fill="#85DDCB"
                  stroke="#19262A"
                  strokeWidth="2.5"
                />
                <path
                  d="M170 48h12M170 55h8"
                  stroke="#19262A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
              {/* encabezado */}
              <path
                d="M94 46h50M94 60h38"
                stroke="#19262A"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* renglones: ola */}
              {lines.map((l) => (
                <path
                  key={l.d}
                  className="renglon"
                  style={{ animationDelay: `${l.i * 0.14}s` }}
                  d={l.d}
                  stroke="#37AB93"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
            </g>
          </g>

          {/* frente del sobre */}
          <g className="frente">
            <path
              d="M44 198V116l96 62 96-62v82a12 12 0 0 1-12 12H56a12 12 0 0 1-12-12z"
              fill="#85DDCB"
            />
            {/* plano más claro: el lado que da la luz */}
            <path d="M44 198V116l50 32-50 50z" fill="#B6ECE0" />
            {/* dobleces, recortados contra el frente */}
            <g clipPath="url(#frente-del-sobre)">
              <path
                d="M44 198l74-48M236 198l-74-48"
                stroke="#37AB93"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>

        {/* sobrecitos que salen volando */}
        {flyers.map((f, i) => (
          <g key={`f${i}`} className={f.cls}>
            <g transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
              <rect
                x="-24"
                y="-17"
                width="48"
                height="34"
                rx="5"
                fill="#F7FFFD"
                stroke="#19262A"
                strokeWidth="4"
              />
              <path
                d="M-24-14 0 6l24-20"
                fill="none"
                stroke="#37AB93"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </g>
          </g>
        ))}

        {/* chispas */}
        <path
          className="chispa-a"
          d="M40 60v16M32 68h16"
          stroke="#85DDCB"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="chispa-b"
          d="M254 118v12M248 124h12"
          stroke="#37AB93"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle className="punto-a" cx="262" cy="88" r="4" fill="#37AB93" />
        <circle className="punto-b" cx="22" cy="140" r="3" fill="#85DDCB" />
      </g>
    </svg>
  );
};
