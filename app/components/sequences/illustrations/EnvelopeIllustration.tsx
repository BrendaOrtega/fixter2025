/**
 * Un sobre de correo que se abre y saca su carta, en bucle.
 *
 * El orden de dibujo ES la ilustración: respaldo → solapa → carta → bolsillo
 * del frente. Un sobre real tiene la carta metida entre el respaldo y el
 * bolsillo, así que si la carta se pinta encima de todo parece pegada por
 * fuera, y si se pinta debajo desaparece. En SVG no hay z: hay orden.
 *
 * La coreografía es de cuatro tiempos y no de uno: la solapa se levanta, la
 * carta sube y se queda arriba —el tiempo de leerse como carta y no como
 * rectángulo— sus líneas se escriben, y todo regresa.
 *
 * Detalle de más a propósito: estampilla con dentado, matasellos, sello de
 * cera, dobleces del papel. Paleta y trazo grueso del deck del webinar.
 */
export function EnvelopeIllustration({
  className = "w-full max-w-xs",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 210"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <style>{`
        .en-all    { animation: en-float 6s ease-in-out infinite; }
        .en-sheet  { animation: en-rise 6s cubic-bezier(.34,1.15,.4,1) infinite; }
        .en-flap   { animation: en-flap 6s cubic-bezier(.34,1.1,.4,1) infinite;
                     transform-origin: 130px 74px; }
        /* Cerrado, la solapa tapa la carta; abierto, cae por detrás. Como el
           orden de pintado no se puede animar, hay dos copias que se turnan. */
        .en-flap--front { animation: en-front 6s steps(1) infinite; }
        .en-flap--back  { animation: en-back  6s steps(1) infinite; }
        .en-seal   { animation: en-seal 6s ease-in-out infinite;
                     transform-origin: 130px 128px; }
        .en-ln     { stroke-dasharray: 76; stroke-dashoffset: 76;
                     animation: en-write 6s ease-out infinite; }
        .en-ln--2  { animation-delay: .16s; }
        .en-ln--3  { animation-delay: .32s; }
        .en-dot    { animation: en-pop 6s ease-out infinite;
                     transform-origin: 164px 116px; }
        .en-shadow { animation: en-shadow 6s ease-in-out infinite;
                     transform-origin: 130px 190px; }
        .en-spark  { animation: en-spark 6s ease-out infinite; }
        .en-spark--2 { animation-delay: .28s; }
        .en-spark--3 { animation-delay: .52s; }

        @keyframes en-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        /* la solapa cae hacia atrás y se queda abierta mientras la carta sale */
        @keyframes en-flap {
          0%, 10%   { transform: rotate(0deg); }
          26%, 74%  { transform: rotate(-180deg); }
          90%, 100% { transform: rotate(0deg); }
        }
        /* En reposo la carta está guardada: +34 la mete por debajo del borde
           superior del sobre, así que cerrado no asoma nada. */
        @keyframes en-rise {
          0%, 16%   { transform: translateY(34px); }
          40%, 70%  { transform: translateY(-46px); }
          88%, 100% { transform: translateY(34px); }
        }
        @keyframes en-write {
          0%, 34%   { stroke-dashoffset: 76; }
          52%, 70%  { stroke-dashoffset: 0; }
          80%, 100% { stroke-dashoffset: 76; }
        }
        @keyframes en-pop {
          0%, 56%   { transform: scale(0); opacity: 0; }
          64%, 72%  { transform: scale(1); opacity: 1; }
          82%, 100% { transform: scale(0); opacity: 0; }
        }
        @keyframes en-seal {
          0%, 8%    { opacity: 1; transform: scale(1) rotate(0deg); }
          22%, 76%  { opacity: 0; transform: scale(.4) rotate(-25deg); }
          92%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes en-shadow {
          0%, 100% { transform: scaleX(1); opacity: .32; }
          50%      { transform: scaleX(1.1); opacity: .18; }
        }
        @keyframes en-front {
          0%, 13%   { opacity: 1; }
          14%, 89%  { opacity: 0; }
          90%, 100% { opacity: 1; }
        }
        @keyframes en-back {
          0%, 13%   { opacity: 0; }
          14%, 89%  { opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes en-spark {
          0%, 30%   { opacity: 0; transform: translate(0, 6px) scale(.6); }
          46%       { opacity: 1; transform: translate(0, -6px) scale(1); }
          66%, 100% { opacity: 0; transform: translate(0, -18px) scale(.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          .en-all, .en-sheet, .en-flap, .en-flap--front, .en-flap--back,
          .en-seal, .en-ln, .en-dot, .en-shadow, .en-spark { animation: none; }
          .en-flap--back { opacity: 0; }
          .en-ln { stroke-dashoffset: 0; }
        }
      `}</style>

      <defs>
        <radialGradient id="en-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#85DDCB" stopOpacity=".24" />
          <stop offset="100%" stopColor="#85DDCB" stopOpacity="0" />
        </radialGradient>
        {/* La carta no puede salirse por abajo del sobre ni por los lados. */}
        <clipPath id="en-mouth">
          <rect x="34" y="0" width="192" height="166" />
        </clipPath>
      </defs>

      <circle cx="130" cy="112" r="94" fill="url(#en-glow)" />

      <ellipse
        className="en-shadow"
        cx="130"
        cy="190"
        rx="68"
        ry="7"
        fill="#000000"
        opacity=".32"
      />

      <g className="en-all">
        {/* 1. RESPALDO del sobre: la pared de atrás, contra la que se apoya todo */}
        <path
          d="M40 74h180v82a10 10 0 01-10 10H50a10 10 0 01-10-10V74z"
          fill="#0F1A20"
          stroke="#3E5760"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* 2. SOLAPA DE ATRÁS: la que se ve mientras el sobre está abierto */}
        <path
          className="en-flap en-flap--back"
          d="M40 74l84 56a10 10 0 0012 0l84-56z"
          fill="#16262E"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* 3. LA CARTA: sube desde adentro, por delante del respaldo */}
        <g clipPath="url(#en-mouth)">
          <g className="en-sheet">
            <rect
              x="78"
              y="52"
              width="104"
              height="96"
              rx="7"
              fill="#F4F7F6"
              stroke="#0E1317"
              strokeWidth="3"
            />
            <rect x="92" y="66" width="34" height="8" rx="4" fill="#85DDCB" />
            <g stroke="#7C8A93" strokeWidth="4" strokeLinecap="round">
              <path className="en-ln" d="M92 88h76" />
              <path className="en-ln en-ln--2" d="M92 102h76" />
              <path className="en-ln en-ln--3" d="M92 116h44" />
            </g>
            <circle className="en-dot" cx="164" cy="116" r="9" fill="#FFC46B" />
          </g>
        </g>

        {/* 4. BOLSILLO del frente: tapa la parte baja de la carta. Es lo que
              convierte el dibujo en un sobre y no en dos rectángulos. */}
        <path
          d="M40 156V96l52 34 38 26 38-26 52-34v60a10 10 0 01-10 10H50a10 10 0 01-10-10z"
          fill="#122027"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* dobleces del papel, que salen de las esquinas de abajo */}
        <path
          d="M40 156l54-38M220 156l-54-38"
          stroke="#22343D"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* estampilla con dentado */}
        <g>
          <rect
            x="178"
            y="118"
            width="28"
            height="32"
            rx="3"
            fill="#0E1317"
            stroke="#8DCF6E"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
          <path d="M184 141l6-9 5 6 4-5 6 8z" fill="#8DCF6E" opacity=".85" />
          <circle cx="188" cy="126" r="2.5" fill="#FFC46B" />
        </g>
        {/* matasellos */}
        <g stroke="#2C3944" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <circle cx="62" cy="134" r="12" />
          <path d="M55 130h14M55 138h14" />
        </g>

        {/* 5. SOLAPA DE ENFRENTE: el mismo trazo, pintado hasta arriba. Es la
              que se ve con el sobre cerrado, tapando la carta guardada. */}
        <path
          className="en-flap en-flap--front"
          d="M40 74l84 56a10 10 0 0012 0l84-56z"
          fill="#16262E"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* sello de cera, en la punta del bolsillo */}
        <g className="en-seal">
          <circle cx="130" cy="128" r="13" fill="#FFC46B" />
          <path
            d="M124 128l4.5 4.5L137 123"
            stroke="#0E1317"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>

      {/* chispas al abrir */}
      <g fill="#8DCF6E">
        <circle className="en-spark" cx="72" cy="40" r="4" />
        <circle className="en-spark en-spark--2" cx="130" cy="22" r="3.5" />
        <circle className="en-spark en-spark--3" cx="190" cy="42" r="4" />
      </g>
    </svg>
  );
}
