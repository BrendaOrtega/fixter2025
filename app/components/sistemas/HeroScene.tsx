import { useEffect, useState, type ReactNode } from "react";

// ===========================================
// El hero de Sistemas Agénticos como caricatura plana: Ghosty vive en una caja
// (el sandbox), y alrededor se le arma el sistema pieza por pieza — pantalla,
// libreta, mano en alto, cable — hasta que contesta por WhatsApp y se vuelve
// a dormir. Referencia: el hero de Fly.io ("Computers for agents"), con la
// paleta y el personaje de la casa.
//
// Reglas de la casa: Ghosty oficial sin repintar y sin boca (la emoción va en
// los adornos de alrededor), colores sólidos, contorno de tinta, sombra dura.
//
// Todo se anima con transiciones CSS sobre <g>: los transforms de motion en
// SVG salían con el origen roto y las piezas se quedaban a medio camino.
// ===========================================

const INK = "#0E1317";
const TEAL = "#85DDCB";
const TEAL_DARK = "#37AB93";
const GRASS = "#8DCF6E";
const AMBER = "#fbbf24";
const PAPER = "#F3EFE4";
const PAPER_SHADE = "#D9D3C4";
const GREY = "#6B7A80";
const WA = "#25D366";
const POP = "cubic-bezier(.34,1.56,.64,1)";

type Phase =
  | "sleep"
  | "message"
  | "send"
  | "wake"
  | "screen"
  | "memory"
  | "permission"
  | "cable"
  | "whatsapp"
  | "off";

const TIMELINE: { phase: Phase; ms: number }[] = [
  { phase: "sleep", ms: 1400 },
  { phase: "message", ms: 1500 }, // la burbuja se queda quieta para leerse
  { phase: "send", ms: 800 }, // y luego viaja a la caja
  { phase: "wake", ms: 900 },
  { phase: "screen", ms: 900 },
  { phase: "memory", ms: 900 },
  { phase: "permission", ms: 1300 },
  { phase: "cable", ms: 900 },
  { phase: "whatsapp", ms: 2000 },
  { phase: "off", ms: 900 },
];
const ORDER = TIMELINE.map((t) => t.phase);
const since = (p: Phase, target: Phase) =>
  ORDER.indexOf(p) >= ORDER.indexOf(target);

const mono = "ui-monospace, Menlo, monospace";
const sans = "system-ui, sans-serif";

/// Etiqueta de tinta con fondo papel, para nombrar cada pieza
function Tag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 7.2 + 18;
  return (
    <g>
      <rect x={x + 3} y={y + 3} width={w} height={22} fill={INK} />
      <rect
        x={x}
        y={y}
        width={w}
        height={22}
        fill={PAPER}
        stroke={INK}
        strokeWidth={2.5}
      />
      <text
        x={x + w / 2}
        y={y + 15.5}
        textAnchor="middle"
        fontFamily={mono}
        fontSize={12}
        fontWeight={700}
        fill={INK}
      >
        {text}
      </text>
    </g>
  );
}

/// Pieza que se enchufa al sistema: entra con rebote y se queda
function Piece({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <g
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(26px)",
        transition: show
          ? `opacity .3s, transform .5s ${POP}`
          : "opacity .2s, transform .2s",
      }}
    >
      {children}
    </g>
  );
}

export default function HeroScene() {
  const [step, setStep] = useState(0);
  const phase = TIMELINE[step].phase;

  useEffect(() => {
    const id = setTimeout(
      () => setStep((s) => (s + 1) % TIMELINE.length),
      TIMELINE[step].ms,
    );
    return () => clearTimeout(id);
  }, [step]);

  const awake = since(phase, "wake") && phase !== "off";
  const asleep = phase === "sleep" || phase === "off";

  return (
    <svg
      viewBox="0 0 640 480"
      className="h-auto w-full"
      role="img"
      aria-label="Un agente que vive en una caja remota, con su interfaz, su memoria y el permiso humano alrededor"
    >
      <style>{`
        @keyframes hero-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        @keyframes hero-zzz { 0% { opacity: 0; transform: translateY(0) } 30% { opacity: 1 } 100% { opacity: 0; transform: translateY(-14px) } }
        @keyframes hero-bang { 0% { transform: scale(0) } 100% { transform: scale(1) } }
      `}</style>

      {/* Tarjeta de papel con sombra dura: la tinta no se ve sobre el fondo oscuro */}
      <rect x={18} y={18} width={612} height={452} rx={18} fill={INK} />
      <rect
        x={8}
        y={8}
        width={612}
        height={452}
        rx={18}
        fill={PAPER}
        stroke={INK}
        strokeWidth={3}
      />
      <ellipse cx={330} cy={432} rx={250} ry={16} fill={PAPER_SHADE} />

      {/* ===== Laptop del alumno ===== */}
      <g>
        <rect x={52} y={352} width={130} height={12} rx={3} fill={INK} />
        <rect x={62} y={280} width={110} height={74} rx={4} fill={INK} />
        <rect
          x={68}
          y={286}
          width={98}
          height={62}
          rx={2}
          fill={awake ? TEAL : GREY}
          style={{ transition: "fill .3s" }}
        />
        <text
          x={117}
          y={322}
          textAnchor="middle"
          fontFamily={mono}
          fontSize={11}
          fontWeight={700}
          fill={INK}
        >
          {awake ? "tu UI" : "· · ·"}
        </text>
      </g>

      {/* Mensaje: aparece junto a la laptop, se lee, y luego viaja a la caja */}
      <g
        style={{
          opacity: phase === "message" || phase === "send" ? 1 : 0,
          transform:
            phase === "send"
              ? "translate(150px, -110px)"
              : phase === "message"
                ? "translate(0, 0)"
                : "translate(0, 8px)",
          transition:
            phase === "send"
              ? "opacity .2s, transform .7s ease-in-out"
              : phase === "message"
                ? `opacity .25s, transform .4s ${POP}`
                : "opacity .15s",
        }}
      >
        <rect
          x={132}
          y={262}
          width={94}
          height={30}
          rx={8}
          fill={PAPER}
          stroke={INK}
          strokeWidth={2.5}
        />
        <path
          d="M140 292 l-8 10 l16 -6z"
          fill={PAPER}
          stroke={INK}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <text
          x={179}
          y={282}
          textAnchor="middle"
          fontFamily={sans}
          fontSize={13}
          fontWeight={700}
          fill={INK}
        >
          arregla el test
        </text>
      </g>

      {/* ===== La caja: un servidor de caricatura ===== */}
      <g>
        <rect x={276} y={186} width={124} height={236} fill={INK} />
        <polygon
          points="386,164 410,146 410,382 386,400"
          fill={TEAL_DARK}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <polygon
          points="266,164 290,146 410,146 386,164"
          fill={TEAL}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <rect
          x={266}
          y={164}
          width={120}
          height={236}
          fill={TEAL}
          stroke={INK}
          strokeWidth={3}
        />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={284}
            y={318 + i * 18}
            width={84}
            height={7}
            rx={2}
            fill={INK}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={292 + i * 18}
            cy={300}
            r={5}
            stroke={INK}
            strokeWidth={2.5}
            fill={awake ? (i === 2 ? AMBER : GRASS) : GREY}
            style={{ transition: `fill .3s ${i * 0.1}s` }}
          />
        ))}
        <text
          x={326}
          y={392}
          textAnchor="middle"
          fontFamily={mono}
          fontSize={11}
          fontWeight={700}
          fill={INK}
        >
          sb_af93 · {awake ? "on" : "zz"}
        </text>
        {/* hueco por donde asoma Ghosty */}
        <rect x={284} y={178} width={84} height={104} rx={6} fill={INK} />
      </g>

      {/* ===== Ghosty: dormido hundido en la caja, despierto asomado y flotando ===== */}
      <clipPath id="hero-box-hole">
        <rect x={284} y={100} width={84} height={182} rx={6} />
      </clipPath>
      <g clipPath="url(#hero-box-hole)">
        <g
          style={{
            transform: asleep ? "translateY(52px)" : "translateY(0)",
            transition: `transform .6s ${POP}`,
          }}
        >
          <g
            style={{
              animation: asleep
                ? "none"
                : "hero-float 1.6s ease-in-out infinite",
            }}
          >
            <image
              href="/ghosty-oficial.png"
              x={288}
              y={168}
              width={76}
              height={88}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </g>
      </g>

      {/* Adornos de emoción: zzz al dormir, ! al despertar (nunca sobre el cuerpo) */}
      <g style={{ opacity: asleep ? 1 : 0, transition: "opacity .3s" }}>
        {[0, 1, 2].map((i) => (
          <text
            key={i}
            x={376 + i * 14}
            y={188 - i * 14}
            fontFamily={sans}
            fontSize={16 + i * 4}
            fontWeight={900}
            fill={INK}
            style={{ animation: `hero-zzz 1.8s ease-out ${i * 0.4}s infinite` }}
          >
            z
          </text>
        ))}
      </g>
      <text
        x={380}
        y={160}
        fontFamily={sans}
        fontSize={34}
        fontWeight={900}
        fill={AMBER}
        stroke={INK}
        strokeWidth={1.5}
        style={{
          opacity: phase === "wake" ? 1 : 0,
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: phase === "wake" ? `hero-bang .4s ${POP}` : "none",
          transition: "opacity .2s",
        }}
      >
        !
      </text>

      {/* ===== Las piezas del sistema, una por una ===== */}
      {/* Pantalla: la interfaz */}
      <Piece show={since(phase, "screen") && !asleep}>
        <path
          d="M442 150 L410 200"
          stroke={INK}
          strokeWidth={3}
          strokeDasharray="6 5"
        />
        <rect x={448} y={110} width={126} height={84} rx={6} fill={INK} />
        <rect
          x={442}
          y={104}
          width={126}
          height={84}
          rx={6}
          fill={PAPER}
          stroke={INK}
          strokeWidth={3}
        />
        <rect x={452} y={116} width={70} height={9} rx={2} fill={TEAL} />
        <rect
          x={452}
          y={132}
          width={104}
          height={9}
          rx={2}
          fill={PAPER_SHADE}
        />
        <rect x={452} y={148} width={90} height={9} rx={2} fill={PAPER_SHADE} />
        <rect x={452} y={164} width={50} height={12} rx={3} fill={GRASS} />
        <Tag x={452} y={196} text="interfaz" />
      </Piece>

      {/* Libreta: la memoria */}
      <Piece show={since(phase, "memory") && !asleep}>
        <path
          d="M222 190 L266 210"
          stroke={INK}
          strokeWidth={3}
          strokeDasharray="6 5"
        />
        <rect x={132} y={124} width={96} height={116} rx={4} fill={INK} />
        <rect
          x={126}
          y={118}
          width={96}
          height={116}
          rx={4}
          fill={PAPER}
          stroke={INK}
          strokeWidth={3}
        />
        <rect
          x={126}
          y={118}
          width={14}
          height={116}
          fill={AMBER}
          stroke={INK}
          strokeWidth={3}
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={150}
            y={134 + i * 18}
            width={58 - (i % 2) * 18}
            height={6}
            rx={2}
            fill={PAPER_SHADE}
          />
        ))}
        <Tag x={130} y={244} text="memoria" />
      </Piece>

      {/* Mano en alto: el permiso humano */}
      <Piece show={since(phase, "permission") && !asleep}>
        <path
          d="M470 294 L410 280"
          stroke={INK}
          strokeWidth={3}
          strokeDasharray="6 5"
        />
        <circle cx={520} cy={300} r={44} fill={INK} />
        <circle
          cx={514}
          cy={294}
          r={44}
          fill={AMBER}
          stroke={INK}
          strokeWidth={3}
        />
        <path
          d="M500 312 v-26 a5 5 0 0 1 10 0 v-8 a5 5 0 0 1 10 0 v8 a5 5 0 0 1 10 0 v10 a5 5 0 0 1 8 4 l-4 18 a14 14 0 0 1 -14 12 h-8 a14 14 0 0 1 -12 -8z"
          fill={PAPER}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Tag
          x={468}
          y={346}
          text={since(phase, "cable") ? "✓ permitido" : "¿permiso?"}
        />
      </Piece>

      {/* Cable: MCP y extensiones */}
      <Piece show={since(phase, "cable") && !asleep}>
        <path
          d="M266 372 C 220 372, 210 330, 170 330"
          fill="none"
          stroke={INK}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d="M266 372 C 220 372, 210 330, 170 330"
          fill="none"
          stroke={TEAL}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <rect
          x={140}
          y={318}
          width={34}
          height={24}
          rx={4}
          fill={PAPER}
          stroke={INK}
          strokeWidth={3}
        />
        <rect x={148} y={324} width={6} height={12} fill={INK} />
        <rect x={160} y={324} width={6} height={12} fill={INK} />
        <Tag x={98} y={352} text="MCP" />
      </Piece>

      {/* ===== WhatsApp: la salida al mundo ===== */}
      <Piece show={phase === "whatsapp"}>
        <rect x={478} y={392} width={104} height={44} rx={10} fill={INK} />
        <rect
          x={472}
          y={386}
          width={104}
          height={44}
          rx={10}
          fill={WA}
          stroke={INK}
          strokeWidth={3}
        />
        <path
          d="M486 430 l-10 12 l20 -8z"
          fill={WA}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <text
          x={524}
          y={406}
          textAnchor="middle"
          fontFamily={sans}
          fontSize={13}
          fontWeight={800}
          fill={INK}
        >
          ✓ test arreglado
        </text>
        <text
          x={524}
          y={422}
          textAnchor="middle"
          fontFamily={sans}
          fontSize={11}
          fontWeight={700}
          fill={INK}
        >
          ¿abro el PR?
        </text>
      </Piece>
    </svg>
  );
}
