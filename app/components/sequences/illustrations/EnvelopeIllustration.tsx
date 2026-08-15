/**
 * Un sobre de correo que se abre y saca su carta, en bucle.
 *
 * La coreografía es de cuatro tiempos y no de uno solo: la solapa se levanta,
 * la carta sube y se queda un momento arriba —el tiempo suficiente para leerse
 * como una carta y no como un rectángulo— y luego todo regresa. Las líneas de
 * texto se escriben con `stroke-dasharray` mientras la hoja sube, que es lo
 * que le da vida: un objeto que se mueve entero se siente un gif; uno donde
 * algo pasa adentro se siente dibujado.
 *
 * Detalle de más a propósito: estampilla con su dentado, matasellos, sello de
 * cera, dobleces del papel. La paleta y el trazo grueso salen del deck del
 * webinar.
 */
export function EnvelopeIllustration({
  className = "w-full max-w-xs",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 200"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <style>{`
        .en-all    { animation: en-float 6s ease-in-out infinite; }
        .en-sheet  { animation: en-rise 6s cubic-bezier(.34,1.2,.4,1) infinite; }
        .en-flap   { animation: en-flap 6s cubic-bezier(.34,1.1,.4,1) infinite;
                     transform-origin: 130px 62px; }
        .en-seal   { animation: en-seal 6s ease-in-out infinite;
                     transform-origin: 130px 118px; }
        .en-ln     { stroke-dasharray: 78; stroke-dashoffset: 78;
                     animation: en-write 6s ease-out infinite; }
        .en-ln--2  { animation-delay: .18s; }
        .en-ln--3  { animation-delay: .36s; }
        .en-dot    { animation: en-pop 6s ease-out infinite; transform-origin: 168px 118px; }
        .en-shadow { animation: en-shadow 6s ease-in-out infinite; }
        .en-spark  { animation: en-spark 6s ease-out infinite; }
        .en-spark--2 { animation-delay: .3s; }
        .en-spark--3 { animation-delay: .55s; }

        /* el conjunto flota apenas: le quita rigidez sin distraer */
        @keyframes en-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        /* la solapa se abre y se queda abierta mientras la carta está afuera */
        @keyframes en-flap {
          0%, 10%   { transform: scaleY(1); }
          26%, 74%  { transform: scaleY(-0.92); }
          90%, 100% { transform: scaleY(1); }
        }
        /* la carta sube, se sostiene arriba y vuelve a entrar */
        @keyframes en-rise {
          0%, 16%   { transform: translateY(6px); }
          40%, 70%  { transform: translateY(-42px); }
          88%, 100% { transform: translateY(6px); }
        }
        /* las líneas se escriben cuando la hoja ya está a la vista */
        @keyframes en-write {
          0%, 34%   { stroke-dashoffset: 78; }
          52%, 70%  { stroke-dashoffset: 0; }
          80%, 100% { stroke-dashoffset: 78; }
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
        /* la sombra acompaña al flote: se abre cuando el sobre sube */
        @keyframes en-shadow {
          0%, 100% { transform: scaleX(1); opacity: .3; }
          50%      { transform: scaleX(1.1); opacity: .18; }
        }
        @keyframes en-spark {
          0%, 30%   { opacity: 0; transform: translate(0, 6px) scale(.6); }
          46%       { opacity: 1; transform: translate(0, -6px) scale(1); }
          66%, 100% { opacity: 0; transform: translate(0, -18px) scale(.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          .en-all, .en-sheet, .en-flap, .en-seal, .en-ln, .en-dot,
          .en-shadow, .en-spark { animation: none; }
          .en-ln { stroke-dashoffset: 0; }
        }
      `}</style>

      <defs>
        <radialGradient id="en-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#85DDCB" stopOpacity=".26" />
          <stop offset="100%" stopColor="#85DDCB" stopOpacity="0" />
        </radialGradient>
        {/* La boca del sobre: la carta solo existe dentro de este recorte. */}
        <clipPath id="en-mouth">
          <rect x="40" y="0" width="180" height="152" />
        </clipPath>
      </defs>

      <circle cx="130" cy="106" r="92" fill="url(#en-glow)" />

      {/* sombra en el piso */}
      <ellipse
        className="en-shadow"
        cx="130"
        cy="176"
        rx="66"
        ry="7"
        fill="#000000"
        opacity=".3"
        style={{ transformOrigin: "130px 176px" }}
      />

      <g className="en-all">
        {/* ---------- la carta ---------- */}
        <g clipPath="url(#en-mouth)">
          <g className="en-sheet">
            <rect
              x="76"
              y="62"
              width="108"
              height="84"
              rx="7"
              fill="#F4F7F6"
              stroke="#0E1317"
              strokeWidth="3"
            />
            {/* encabezado de la carta */}
            <rect x="90" y="76" width="34" height="8" rx="4" fill="#85DDCB" />
            {/* el texto se escribe */}
            <g stroke="#7C8A93" strokeWidth="4" strokeLinecap="round">
              <path className="en-ln" d="M90 98h78" />
              <path className="en-ln en-ln--2" d="M90 112h78" />
              <path className="en-ln en-ln--3" d="M90 126h46" />
            </g>
            <circle className="en-dot" cx="168" cy="118" r="9" fill="#FFC46B" />
          </g>
        </g>

        {/* ---------- el sobre ---------- */}
        {/* cuerpo */}
        <path
          d="M40 66h180v78a10 10 0 01-10 10H50a10 10 0 01-10-10V66z"
          fill="#122027"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* dobleces del papel */}
        <path
          d="M40 152l62-46M220 152l-62-46"
          stroke="#22343D"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* estampilla con dentado */}
        <g>
          <rect
            x="176"
            y="76"
            width="30"
            height="34"
            rx="3"
            fill="#0E1317"
            stroke="#8DCF6E"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
          <path
            d="M182 100l6-9 5 6 4-5 7 8z"
            fill="#8DCF6E"
            opacity=".85"
          />
          <circle cx="186" cy="84" r="2.5" fill="#FFC46B" />
        </g>
        {/* matasellos */}
        <g stroke="#2C3944" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <circle cx="60" cy="92" r="13" />
          <path d="M52 88h16M52 96h16" />
        </g>

        {/* solapa: se levanta y deja ver el interior */}
        <path
          className="en-flap"
          d="M40 66l84 56a10 10 0 0012 0l84-56z"
          fill="#16262E"
          stroke="#85DDCB"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* sello de cera sobre la solapa cerrada */}
        <g className="en-seal">
          <circle cx="130" cy="118" r="13" fill="#FFC46B" />
          <path
            d="M124 118l4.5 4.5L137 113"
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
        <circle className="en-spark" cx="74" cy="40" r="4" />
        <circle className="en-spark en-spark--2" cx="130" cy="24" r="3.5" />
        <circle className="en-spark en-spark--3" cx="188" cy="42" r="4" />
      </g>
    </svg>
  );
}
