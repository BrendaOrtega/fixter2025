import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView } from "motion/react";

// Secciones bajo el hero de /software-factory: primero la prueba de que esto ya pasa
// (números públicos) y luego lo que el alumno se lleva en su propio repo.

const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E", BG = "#0E1317", PANEL = "#19262A", SHADOW = "#37AB93";

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

const STROKE = { stroke: BG, strokeWidth: 3, strokeLinejoin: "round" as const };

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
    <span
      className="inline-block -rotate-2 rounded-full border-2 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.25em] sm:text-sm"
      style={{ background: MINT, borderColor: BG, color: BG, boxShadow: `3px 3px 0 ${SHADOW}` }}
    >
      {kicker}
    </span>
    <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{title}</h2>
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
            initial={{ opacity: 0, y: 40, rotate: i % 2 ? 1.5 : -1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ ...SPRING, delay: i * 0.12 }}
            whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
            className="flex flex-col rounded-3xl border-[3px] p-5"
            style={{ background: PANEL, borderColor: MINT, boxShadow: `8px 8px 0 ${SHADOW}` }}
          >
            <div className="h-28 rounded-2xl border-2 p-2" style={{ background: `${BG}aa`, borderColor: `${MINT}33` }}>
              {p.art}
            </div>
            <p className="mt-5 font-mono text-sm font-bold uppercase tracking-widest" style={{ color: MUTE }}>
              {p.who}
            </p>
            <p className="mt-1 text-4xl font-black leading-none sm:text-5xl" style={{ color: GREEN }}>
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
              className="mt-4 self-start font-mono text-xs underline underline-offset-4"
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
        className="mx-auto mt-14 max-w-2xl rounded-2xl border-2 border-dashed px-6 py-5 text-center text-lg sm:text-xl"
        style={{ borderColor: `${GREEN}88`, color: INK }}
      >
        En México todavía no hay un caso público. <strong style={{ color: GREEN }}>Tu caso puede ser de los primeros.</strong>
      </motion.p>
    </div>
  </section>
);

// ——— Sección: lo que te llevas ———

type Deliverable = { file: string; title: string; body: string; why: string };

const DELIVERABLES: Deliverable[] = [
  {
    file: "AGENTS.md",
    title: "Las reglas de tu repo, escritas para agentes",
    body: "Cómo se instala, cómo se corren las pruebas, qué convenciones sigue tu código y qué carpetas no se tocan. Lo leen Claude Code, Codex, Cursor y Antigravity antes de escribir una línea.",
    why: "La mayoría de los errores de un agente vienen de que le falta contexto.",
  },
  {
    file: "specs/",
    title: "Specs con «terminado» definido de antemano",
    body: "Una plantilla donde el criterio de aceptación se escribe antes que el código. El agente planeador la parte en issues de GitHub, uno por cambio chico y revisable.",
    why: "Si nadie dijo cómo se verifica, el agente decide solo cuándo acabó.",
  },
  {
    file: ".github/workflows/ci.yml",
    title: "Puertas que ningún agente se salta",
    body: "Tipos, linter y pruebas en cada commit (pre-commit) y en cada PR (GitHub Actions). Si un check falla, el PR no entra, lo haya escrito una persona o un agente.",
    why: "Es lo que te deja delegar sin revisar cada línea a mano.",
  },
  {
    file: ".claude/agents/",
    title: "Tres agentes con rol fijo, en paralelo",
    body: "Planeador, implementador y revisor, cada uno con sus instrucciones. Trabajan tickets distintos al mismo tiempo en worktrees separados, así que no se pisan los cambios.",
    why: "Tres tickets avanzando mientras tú revisas el cuarto.",
  },
  {
    file: "reviewer.md",
    title: "Revisa un agente distinto al que escribió",
    body: "El revisor compara cada PR contra su spec, corre la preview y te explica en español qué cambió y por qué. Tú das el merge.",
    why: "Evita que el equipo acabe aprobando código que ya nadie entiende.",
  },
  {
    file: "github.com/…/projects",
    title: "El tablero, con lo que cuesta cada ticket",
    body: "GitHub Projects con cada ticket, su agente, su PR, su preview y los tokens que gastó. Al hacer merge pasa solo a producción.",
    why: "Sabes cuánto te cuesta la fábrica antes de que llegue la factura.",
  },
];

// Árbol del repo terminado; `item` enlaza cada renglón con su entregable.
const TREE: { text: string; item: number | null }[] = [
  { text: "tu-repo/", item: null },
  { text: "├─ AGENTS.md", item: 0 },
  { text: "├─ specs/", item: 1 },
  { text: "│  └─ 012-login-passkeys.md", item: 1 },
  { text: "├─ .github/workflows/ci.yml", item: 2 },
  { text: "├─ .husky/pre-commit", item: 2 },
  { text: "├─ .claude/agents/", item: 3 },
  { text: "│  ├─ planner.md", item: 3 },
  { text: "│  ├─ builder.md", item: 3 },
  { text: "│  └─ reviewer.md", item: 4 },
  { text: "└─ ↗ tablero en GitHub Projects", item: 5 },
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
    <section className="relative px-4 py-20 sm:px-8 sm:py-28" style={{ background: `${PANEL}66` }}>
      <div ref={ref} className="mx-auto max-w-7xl">
        <SectionTitle kicker="Lo que te llevas" title="Tu repo, convertido en fábrica">
          Trabajamos sobre tu propio código. Al terminar, estas seis piezas quedan en tu repositorio: te las quedas y las puedes replicar en otros proyectos con ayuda de tu agente de código.
        </SectionTitle>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          {/* el repo terminado: se escribe renglón por renglón y marca la pieza activa */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border-[3px] p-4 sm:p-5" style={{ background: BG, borderColor: MINT, boxShadow: `10px 10px 0 ${SHADOW}` }}>
              <div className="mb-4 flex items-center gap-2">
                {[MINT, GREEN, MUTE].map((c) => (
                  <span key={c} className="h-3 w-3 rounded-full border-2" style={{ borderColor: PANEL, background: c }} />
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
                  animate={{ scale: on ? 1.02 : 1 }}
                >
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex h-full w-full flex-col rounded-2xl border-[3px] p-5 text-left"
                    style={{
                      background: on ? MINT : PANEL,
                      borderColor: on ? BG : `${MINT}55`,
                      color: on ? BG : INK,
                      boxShadow: on ? `8px 8px 0 ${SHADOW}` : `4px 4px 0 ${BG}`,
                      transition: "background-color 0.35s, color 0.35s, box-shadow 0.35s",
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-lg font-black"
                        style={{ background: on ? BG : GREEN, color: on ? MINT : BG, borderColor: BG }}
                      >
                        {i + 1}
                      </span>
                      <code className="truncate font-mono text-xs font-bold sm:text-sm" style={{ color: on ? BG : MINT }}>
                        {d.file}
                      </code>
                    </span>
                    <span className="mt-3 text-lg font-black leading-tight sm:text-xl">{d.title}</span>
                    <span className="mt-2 text-sm leading-relaxed" style={{ opacity: 0.85 }}>
                      {d.body}
                    </span>
                    <span className="mt-3 border-t-2 border-dashed pt-3 text-sm font-bold" style={{ borderColor: on ? `${BG}44` : `${MINT}33` }}>
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
