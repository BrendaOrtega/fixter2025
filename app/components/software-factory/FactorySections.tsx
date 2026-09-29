import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView } from "motion/react";

// Secciones bajo el hero de /software-factory: primero la prueba de que esto ya pasa
// (números públicos) y luego lo que el alumno se lleva en su propio repo.

const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E", BG = "#0E1317", PANEL = "#19262A";

const DISPLAY = { fontFamily: '"Bricolage Grotesque", Inter, sans-serif' };

const SPRING = { type: "spring", stiffness: 260, damping: 18 } as const;

// ——— Número que cuenta hasta su valor la primera vez que entra a la vista ———

const CountUp = ({ to, decimals = 0, prefix = "", suffix = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.8, ease: [0.16, 1, 0.3, 1], onUpdate: setValue });
    return () => controls.stop();
  }, [inView, to]);
  const text = value.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {text}
      {suffix}
    </span>
  );
};

// ——— Objetos animados de cada tarjeta (caricatura plana: contorno grueso, rellenos sólidos) ———

const STROKE = { stroke: BG, strokeWidth: 2, strokeLinejoin: "round" as const };

// PRs que caen uno sobre otro hasta formar una pila
const PullRequestStack = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="10" y="96" width="140" height="8" rx="4" fill={MUTE} {...STROKE} />
    {[0, 1, 2, 3].map((i) => (
      <motion.g
        key={i}
        variants={{ hidden: {y: -120, rotate: i % 2 ? 6 : -6, opacity: 0}, show: {y: 0, rotate: i % 2 ? 2 : -2, opacity: 1} }}
        transition={{ ...SPRING, delay: 0.2 + i * 0.28 }}
      >
        <rect x="26" y={74 - i * 20} width="108" height="20" rx="5" fill={i === 3 ? GREEN : MINT} {...STROKE} />
        {/* glifo de pull request: dos nodos y una rama */}
        <circle cx="40" cy={84 - i * 20} r="3.5" fill={BG} />
        <circle cx="54" cy={84 - i * 20} r="3.5" fill={BG} />
        <line x1="43" y1={84 - i * 20} x2="51" y2={84 - i * 20} stroke={BG} strokeWidth="2.5" />
        <rect x="64" y={81 - i * 20} width={52 - i * 6} height="6" rx="3" fill={BG} opacity="0.55" />
      </motion.g>
    ))}
  </motion.svg>
);

// un sello baja, golpea la hoja y deja «MERGED»
const MergedStamp = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="22" y="44" width="116" height="60" rx="6" fill={INK} {...STROKE} />
    {[56, 66, 76].map((y, i) => (
      <rect key={y} x="34" y={y} width={[80, 64, 72][i]} height="5" rx="2.5" fill={MUTE} opacity="0.45" />
    ))}
    <motion.g
      variants={{ hidden: {opacity: 0, scale: 1.6}, show: {opacity: 1, scale: 1} }}
      transition={{ delay: 1.05, duration: 0.18 }}
      style={{ transformOrigin: "80px 78px" }}
    >
      <g transform="rotate(-9 80 78)">
        <rect x="40" y="64" width="80" height="26" rx="4" fill="none" stroke={GREEN} strokeWidth="4" />
        <text x="80" y="83" textAnchor="middle" fontSize="16" fontWeight="900" fill={GREEN} fontFamily="ui-monospace, monospace">
          MERGED
        </text>
      </g>
    </motion.g>
    <motion.g
      variants={{ hidden: {y: -40}, show: {y: [-40, -40, 22, 22, -8]} }}
      transition={{ duration: 1.9, times: [0, 0.3, 0.52, 0.72, 1], ease: ["linear", "easeIn", "linear", "easeOut"] }}
    >
      <rect x="70" y="2" width="20" height="26" rx="8" fill={MINT} {...STROKE} />
      <rect x="54" y="26" width="52" height="14" rx="4" fill={GREEN} {...STROKE} />
    </motion.g>
  </motion.svg>
);

// monedas que caen y se apilan
const CoinStack = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="10" y="96" width="140" height="8" rx="4" fill={MUTE} {...STROKE} />
    {[0, 1, 2, 3, 4].map((i) => {
      const cy = 88 - i * 13;
      return (
        <motion.g
          key={i}
          variants={{ hidden: {y: -130, opacity: 0}, show: {y: 0, opacity: 1} }}
          transition={{ ...SPRING, stiffness: 320, delay: 0.2 + i * 0.22 }}
        >
          <rect x="52" y={cy - 1} width="56" height="12" fill={GREEN} {...STROKE} />
          <ellipse cx="80" cy={cy + 11} rx="28" ry="6" fill={GREEN} {...STROKE} />
          <ellipse cx="80" cy={cy} rx="28" ry="7" fill={MINT} {...STROKE} />
          {i === 4 && (
            <text x="80" y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill={BG}>
              $
            </text>
          )}
        </motion.g>
      );
    })}
  </motion.svg>
);

// cohete que despega con su flama
const Rocket = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="10" y="96" width="140" height="8" rx="4" fill={MUTE} {...STROKE} />
    <motion.g
      variants={{ hidden: {y: 34}, show: {y: [34, 34, -6, 0]} }}
      transition={{ duration: 1.8, times: [0, 0.25, 0.8, 1], ease: "easeOut" }}
    >
      <motion.path
        d="M72 78 L80 102 L88 78 Z"
        fill={GREEN}
        {...STROKE}
        variants={{ hidden: {scaleY: 0.2}, show: {scaleY: [0.2, 1, 0.7, 1.1, 0.8, 1]} }}
        transition={{ duration: 1.6, delay: 0.3 }}
        style={{ transformOrigin: "80px 78px" }}
      />
      <path d="M62 64 L52 80 L66 76 Z" fill={MINT} {...STROKE} />
      <path d="M98 64 L108 80 L94 76 Z" fill={MINT} {...STROKE} />
      <path d="M80 14 C94 28 98 48 96 78 L64 78 C62 48 66 28 80 14 Z" fill={INK} {...STROKE} />
      <circle cx="80" cy="46" r="8" fill={MINT} {...STROKE} />
    </motion.g>
  </motion.svg>
);

// ——— Sección: esto ya está en producción ———

type Proof = {
  who: string;
  art: ReactNode;
  number: ReactNode;
  unit: string;
  detail: string;
  source: { label: string; href: string };
};

const PROOFS: Proof[] = [
  {
    who: "Stripe",
    art: <PullRequestStack />,
    number: <CountUp to={1300} prefix="~" />,
    unit: "PRs por semana escritos por agentes",
    detail:
      "Sus «Minions» se disparan desde Slack, arrancan una máquina aislada en menos de 10 segundos, escriben el código, corren linters y CI, y dejan el PR listo. Una persona revisa cada uno.",
    source: { label: "stripe.dev", href: "https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents" },
  },
  {
    who: "Mastra",
    art: <MergedStamp />,
    number: <CountUp to={277} />,
    unit: "de 1,627 PRs fusionados los escribió su fábrica",
    detail:
      "«Shipyard», la fábrica que usan para su propio framework open source, también cerró 222 de 778 issues. Tuvieron que dejar etapas en manual: en automático total generaba más de lo que alcanzaban a revisar.",
    source: { label: "mastra.ai", href: "https://mastra.ai/blog/announcing-mastra-factory-beta" },
  },
  {
    who: "Globant",
    art: <CoinStack />,
    number: <CountUp to={52.8} decimals={1} prefix="$" suffix="M" />,
    unit: "USD de ingreso recurrente anual en AI Pods",
    detail:
      "A junio de 2026, 60% más que en marzo. Cobran por entregable, con margen 10 puntos arriba del modelo tradicional. Ya lo usan 9 de sus 20 cuentas más grandes.",
    source: { label: "Globant Q2 2026", href: "https://finance.yahoo.com/technology/ai/articles/globant-sa-glob-q2-2026-050324527.html" },
  },
  {
    who: "Factory.ai",
    art: <Rocket />,
    number: <CountUp to={4} prefix="$" suffix=" mil M" />,
    unit: "USD de valuación en julio de 2026",
    detail:
      "Duplicó sus ingresos seis meses seguidos vendiendo fábricas a Nvidia, Adobe, EY y Palo Alto Networks. Su equipo instala la fábrica en el cliente; lo que cobra es cada ticket que corre después.",
    source: { label: "Forge", href: "https://forgeglobal.com/factory-ai_ipo/" },
  },
];

const SectionTitle = ({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.5 }}
    className="max-w-3xl"
  >
    <span className="text-base font-medium" style={{ color: MINT }}>
      {kicker}
    </span>
    <h2 className="mt-2 text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl" style={DISPLAY}>{title}</h2>
    <p className="mt-4 text-lg sm:text-xl" style={{ color: `${INK}cc` }}>
      {children}
    </p>
  </motion.div>
);

export const ProofSection = () => (
  <section className="relative px-4 py-20 sm:px-8 sm:py-28">
    <div className="mx-auto max-w-7xl">
      <SectionTitle kicker="Esto ya pasa" title="Las fábricas ya están en producción">
        En 2026 las empresas que viven del software empezaron a mover parte de su trabajo a fábricas de agentes. Éstos son sus números públicos.
      </SectionTitle>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PROOFS.map((p, i) => (
          <motion.article
            key={p.who}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col rounded-3xl border p-5"
            style={{ background: PANEL, borderColor: `${MINT}1f` }}
          >
            <div className="h-28 rounded-2xl p-2" style={{ background: `${BG}99` }}>
              {p.art}
            </div>
            <p className="mt-5 text-sm font-medium" style={{ color: MUTE }}>
              {p.who}
            </p>
            <p className="mt-1 text-4xl font-bold leading-none tracking-tight sm:text-5xl" style={{ ...DISPLAY, color: GREEN }}>
              {p.number}
            </p>
            <p className="mt-2 text-base font-bold leading-snug">{p.unit}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed" style={{ color: `${INK}b3` }}>
              {p.detail}
            </p>
            <a
              href={p.source.href}
              target="_blank"
              rel="noopener"
              className="mt-4 self-start text-xs underline decoration-1 underline-offset-4"
              style={{ color: MINT }}
            >
              Fuente: {p.source.label} ↗
            </a>
          </motion.article>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mx-auto mt-14 max-w-2xl rounded-2xl border border-dashed px-6 py-5 text-center text-lg sm:text-xl"
        style={{ borderColor: `${GREEN}66`, color: INK }}
      >
        En México todavía no hay un caso público. <strong style={{ color: GREEN }}>Tu caso puede ser de los primeros.</strong>
      </motion.p>
    </div>
  </section>
);

// ——— Sección: temario, sesión por sesión ———

// laptop donde se escribe una línea de código y aparece la palomita de «publicado»
const LaptopShip = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="30" y="16" width="100" height="64" rx="6" fill={PANEL} {...STROKE} />
    <rect x="18" y="80" width="124" height="12" rx="5" fill={MUTE} {...STROKE} />
    {[0, 1, 2].map((i) => (
      <motion.rect
        key={i}
        x="42"
        y={30 + i * 13}
        height="6"
        rx="3"
        fill={i === 2 ? GREEN : MINT}
        variants={{ hidden: { width: 0 }, show: { width: [58, 44, 66][i] } }}
        transition={{ duration: 0.5, delay: 0.3 + i * 0.45, ease: "easeOut" }}
      />
    ))}
    <motion.g variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1 } }} transition={{ ...SPRING, delay: 1.8 }} style={{ transformOrigin: "128px 22px" }}>
      <circle cx="128" cy="22" r="14" fill={GREEN} {...STROKE} />
      <path d="M121 22 L126 27 L135 17" fill="none" stroke={BG} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.g>
  </motion.svg>
);

// una tarjeta de tarea entra sola al sandbox del agente y sale como PR
const TicketIntoBox = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    <rect x="10" y="96" width="140" height="8" rx="4" fill={MUTE} {...STROKE} />
    <rect x="58" y="42" width="48" height="54" rx="6" fill={MINT} {...STROKE} />
    <motion.circle
      cx="82" cy="66" r="10" fill={GREEN} {...STROKE} strokeDasharray="6 4"
      variants={{ hidden: { rotate: 0 }, show: { rotate: 360 } }}
      transition={{ duration: 1.6, delay: 0.9, ease: "easeInOut" }}
      style={{ transformOrigin: "82px 66px" }}
    />
    <motion.g variants={{ hidden: { x: -50, opacity: 0 }, show: { x: [-50, 0, 30], opacity: [0, 1, 0] } }} transition={{ duration: 1.2, delay: 0.2, times: [0, 0.5, 1] }}>
      <rect x="14" y="54" width="34" height="22" rx="4" fill={INK} {...STROKE} />
      <rect x="20" y="62" width="20" height="5" rx="2.5" fill={MUTE} />
    </motion.g>
    <motion.g variants={{ hidden: { x: -20, opacity: 0 }, show: { x: 0, opacity: 1 } }} transition={{ ...SPRING, delay: 2.4 }}>
      <rect x="114" y="54" width="36" height="22" rx="4" fill={GREEN} {...STROKE} />
      <circle cx="124" cy="65" r="3" fill={BG} />
      <circle cx="138" cy="65" r="3" fill={BG} />
      <line x1="127" y1="65" x2="135" y2="65" stroke={BG} strokeWidth="2.5" />
    </motion.g>
  </motion.svg>
);

// dos tarjetas en paralelo; la lupa del revisor pasa encima y cada una recibe su precio
const ReviewAndCost = () => (
  <motion.svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
    {[0, 1].map((i) => (
      <motion.g key={i} variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }} transition={{ ...SPRING, delay: 0.2 + i * 0.2 }}>
        <rect x={16 + i * 70} y="30" width="58" height="58" rx="6" fill={i ? MINT : INK} {...STROKE} />
        <rect x={24 + i * 70} y="42" width="40" height="5" rx="2.5" fill={MUTE} />
        <rect x={24 + i * 70} y="52" width="30" height="5" rx="2.5" fill={MUTE} />
        <motion.text
          x={45 + i * 70} y="80" textAnchor="middle" fontSize="13" fontWeight="900" fill={BG} fontFamily="ui-monospace, monospace"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} transition={{ delay: 1.6 + i * 0.5 }}
        >
          {["$0.38", "$0.61"][i]}
        </motion.text>
      </motion.g>
    ))}
    <motion.g variants={{ hidden: { x: 0, y: 0 }, show: { x: [0, 70, 70], y: [0, 0, -6] } }} transition={{ duration: 1.8, delay: 0.7, times: [0, 0.7, 1] }}>
      <circle cx="46" cy="44" r="13" fill={`${GREEN}55`} stroke={BG} strokeWidth="4" />
      <line x1="56" y1="54" x2="66" y2="64" stroke={BG} strokeWidth="6" strokeLinecap="round" />
    </motion.g>
  </motion.svg>
);

type Session = { art: ReactNode; title: string; body: string; topics: string[]; result: string };

const SESSIONS: Session[] = [
  {
    art: <LaptopShip />,
    title: "Preparar y planear",
    body: "Preparas tu repo con el patrón de Ghosty Factory: el conocimiento para agentes, los candados de CI y @plan, que propone y espera tu firma.",
    topics: [
      "El patrón de Ghosty Factory y sus números reales",
      "AGENTS.md y docs/agents/: el conocimiento vive en el repo",
      "Candados: CI, main protegido y gitleaks",
      "Preview por PR en tu hosting",
      "@plan: propone y tú firmas",
    ],
    result: "Tu repo tiene reglas, candados y un plan firmado.",
  },
  {
    art: <TicketIntoBox />,
    title: "Construir y revisar",
    body: "@build programa el plan en su sandbox y @check lo revisa con otro modelo: te dice el riesgo y qué líneas leer primero.",
    topics: [
      "@build trabaja en su sandbox de EasyBits",
      "Llaves con permisos mínimos",
      "@check con otro modelo: por qué no el mismo",
      "Tarjeta de riesgo y «Lee primero»",
      "Rúbrica de mantenibilidad (PRs de menos de 400 líneas)",
    ],
    result: "Te llega un PR que revisas en dos minutos.",
  },
  {
    art: <ReviewAndCost />,
    title: "Medir, calificar y evaluar",
    body: "@eval, un juez fijo, califica a cada rol y guarda lo que costó. Con eso eliges modelo por rol y ves si la fábrica mejora.",
    topics: [
      "@eval: un juez fijo califica a cada rol",
      "Costo real por tarea y por eval",
      "Métrica norte: % de PRs que pasan la primera revisión",
      "Elegir modelo por rol con datos",
      "Lo que la fábrica aprende vuelve a docs/agents/",
    ],
    result: "Sabes cuánto cuesta y qué tan bien sale cada PR.",
  },
];

export const SyllabusSection = () => (
  <section className="relative px-4 py-20 sm:px-8 sm:py-28" style={{ background: `${PANEL}66` }}>
    <div className="mx-auto max-w-7xl">
      <SectionTitle kicker="Temario" title="Tres sesiones en vivo">
        Cada sesión dura 2.5&nbsp;h y arma una parte de la fábrica sobre tu propio repo. Usamos GitHub, los sandboxes de EasyBits (o Fly Sprites, si ya lo usas) y el hosting que elijas: Vercel, Netlify, Fly o EasyBits.
      </SectionTitle>

      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {SESSIONS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex flex-col rounded-3xl border p-6"
            style={{ background: PANEL, borderColor: `${MINT}1f` }}
          >
            <div className="h-32 rounded-2xl p-2" style={{ background: `${BG}99` }}>
              {s.art}
            </div>
            <p className="mt-5 text-sm font-medium" style={{ color: MUTE }}>
              Sesión {i + 1}, 2.5&nbsp;h
            </p>
            <h3 className="mt-1 text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl" style={DISPLAY}>{s.title}</h3>
            <p className="mt-3 text-base leading-relaxed" style={{ color: `${INK}cc` }}>
              {s.body}
            </p>
            {/* numeración corrida entre sesiones: el temario completo va del 1 al 15 */}
            <ol className="mt-5 flex-1 space-y-2.5 border-t pt-5" style={{ borderColor: `${MINT}1f` }}>
              {s.topics.map((topic, j) => (
                <li key={topic} className="flex items-start gap-3 text-sm sm:text-base">
                  <span className="mt-px w-6 shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color: MINT }}>
                    {SESSIONS.slice(0, i).reduce((n, prev) => n + prev.topics.length, 0) + j + 1}
                  </span>
                  <span>{topic}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ background: `${GREEN}1a`, color: INK }}>
              <span className="font-semibold" style={{ color: GREEN }}>Al final:</span> {s.result}
            </p>
          </motion.li>
        ))}
      </ol>
    </div>
  </section>
);

// ——— Sección: lo que te llevas ———

type Deliverable = { file: string; title: string; body: string; why: string };

const DELIVERABLES: Deliverable[] = [
  {
    file: "AGENTS.md + docs/agents/",
    title: "El conocimiento de tu repo, escrito para agentes",
    body: "Cómo se instala, cómo se prueba, qué convenciones sigues y qué no se toca. Cada rol lo lee antes de trabajar y lo actualiza en el mismo PR cuando aprende algo.",
    why: "La fábrica aprende en tu repo, versionada y revisada por PR.",
  },
  {
    file: "plans/",
    title: "@plan propone, tú firmas",
    body: "Antes de escribir código, @plan dice qué va a cambiar y cómo se verifica. Nada se construye sin tu firma.",
    why: "Si nadie dijo cómo se verifica, el agente decide solo cuándo acabó.",
  },
  {
    file: ".github/",
    title: "Candados que ningún agente se salta",
    body: "CI con tipos, linter, pruebas y gitleaks; main protegido con CODEOWNERS y sin force-push. Si un check falla, el PR no entra.",
    why: "Es lo que te deja delegar sin revisar cada línea a mano.",
  },
  {
    file: ".agents/",
    title: "Cuatro roles con instrucciones fijas",
    body: "@plan, @build, @check y @eval, cada uno con el modelo que elijas. Funcionan con Claude Code, Codex, Cursor o Antigravity.",
    why: "Cada rol hace una cosa y se puede medir por separado.",
  },
  {
    file: "check.md",
    title: "Un PR que revisas en dos minutos",
    body: "@check usa otro modelo que @build, marca el riesgo (auth, datos, migraciones, CI) y te dice qué líneas leer primero. Tú das el merge.",
    why: "Un revisor del mismo modelo comparte los puntos ciegos del que escribió.",
  },
  {
    file: "evals/",
    title: "Evals y costo por rol",
    body: "@eval, un juez fijo, califica cada rol del 1 al 5 y guarda cuánto costó la tarea. Con eso eliges modelo por rol.",
    why: "Mides lo que importa: cuántos PRs pasan tu primera revisión.",
  },
];

// Árbol del repo terminado; `item` enlaza cada renglón con su entregable.
const TREE: { text: string; item: number | null }[] = [
  { text: "tu-repo/", item: null },
  { text: "├─ AGENTS.md", item: 0 },
  { text: "├─ docs/agents/", item: 0 },
  { text: "├─ plans/012-login-passkeys.md", item: 1 },
  { text: "├─ .github/workflows/ci.yml", item: 2 },
  { text: "├─ .github/CODEOWNERS", item: 2 },
  { text: "├─ .agents/", item: 3 },
  { text: "│  ├─ plan.md · build.md", item: 3 },
  { text: "│  ├─ check.md", item: 4 },
  { text: "│  └─ eval.md", item: 5 },
  { text: "└─ evals/resultados.md", item: 5 },
];

const CYCLE_MS = 4200;

export const DeliverablesSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-120px" });
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false);

  // recorre los entregables solo mientras se ve la sección; al elegir uno a mano, se detiene
  useEffect(() => {
    if (!inView || picked) return;
    const id = setInterval(() => setActive((a) => (a + 1) % DELIVERABLES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, picked]);

  const pick = (i: number) => {
    setPicked(true);
    setActive(i);
  };

  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div ref={ref} className="mx-auto max-w-7xl">
        <SectionTitle kicker="Lo que te llevas" title="Tu repo, convertido en fábrica">
          Trabajamos sobre tu propio código con el patrón que ya corre en Ghosty Factory. Al terminar, estas seis piezas quedan en tu repositorio y las puedes replicar en otros proyectos.
        </SectionTitle>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          {/* el repo terminado: se escribe renglón por renglón y marca la pieza activa */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border p-4 sm:p-5" style={{ background: BG, borderColor: `${MINT}2e`, boxShadow: "0 40px 80px -40px rgba(0,0,0,0.75)" }}>
              <div className="mb-4 flex items-center gap-2">
                {[MINT, GREEN, MUTE].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
                ))}
                <span className="ml-2 font-mono text-xs sm:text-sm" style={{ color: MUTE }}>
                  ~/tu-repo · después del taller
                </span>
              </div>
              <motion.ul initial="hidden" whileInView="show" viewport={{ once: true }} className="font-mono text-[13px] leading-7 sm:text-[15px]">
                {TREE.map((line, i) => {
                  const on = line.item === active;
                  return (
                    <motion.li
                      key={line.text}
                      variants={{ hidden: {opacity: 0, x: -12}, show: {opacity: 1, x: 0} }}
                      transition={{ delay: 0.15 + i * 0.09 }}
                      onClick={() => line.item !== null && pick(line.item)}
                      className="flex items-center justify-between gap-3 whitespace-pre rounded-md px-2"
                      style={{
                        cursor: line.item === null ? "default" : "pointer",
                        background: on ? MINT : "transparent",
                        color: on ? BG : line.item === null ? MUTE : INK,
                        fontWeight: on ? 800 : 400,
                        transition: "background-color 0.3s, color 0.3s",
                      }}
                    >
                      <span className="truncate">{line.text}</span>
                      {on && (
                        <motion.span initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="shrink-0">
                          ← {line.item! + 1}
                        </motion.span>
                      )}
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2">
            {DELIVERABLES.map((d, i) => {
              const on = i === active;
              return (
                <motion.li
                  key={d.file}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ ...SPRING, delay: (i % 2) * 0.1 }}
                >
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex h-full w-full flex-col rounded-2xl border p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#85DDCB]"
                    style={{
                      background: on ? `${MINT}14` : PANEL,
                      borderColor: on ? `${MINT}99` : `${MINT}1a`,
                      color: INK,
                      transition: "background-color 0.35s, border-color 0.35s",
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums"
                        style={{ background: on ? MINT : `${MINT}1f`, color: on ? BG : MINT, transition: "background-color 0.35s, color 0.35s" }}
                      >
                        {i + 1}
                      </span>
                      <code className="truncate font-mono text-xs font-bold sm:text-sm" style={{ color: MINT }}>
                        {d.file}
                      </code>
                    </span>
                    <span className="mt-3 text-lg font-bold leading-tight tracking-[-0.01em] sm:text-xl" style={DISPLAY}>{d.title}</span>
                    <span className="mt-2 text-sm leading-relaxed" style={{ opacity: 0.85 }}>
                      {d.body}
                    </span>
                    <span className="mt-3 border-t pt-3 text-sm font-semibold" style={{ borderColor: `${MINT}1f` }}>
                      Por qué importa: <span className="font-normal">{d.why}</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
