import { useEffect, useRef, useState } from "react";
import { data, useFetcher, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { db } from "~/.server/db";
import { checkSignupRequest, claimEmailSend } from "~/.server/signup-guard";
import { sendFactoryWaitlistWelcome } from "~/mailSenders/sendFactoryWaitlistWelcome";
import { validateWaitlistConfirmToken } from "~/utils/tokens";
import { recordOrigin } from "~/.server/origen";
import { CanvasConfetti } from "~/components/common/CanvasConfetti";
import getMetaTags from "~/utils/getMetaTags";

// ===========================================
// Lista de espera: Taller Software Factory
// Sólo mide interés: una pantalla, sin scroll, un correo.
// ===========================================

/// Quien se apunta queda con este tag en `Subscriber.tags`
/// (mismo formato `${slug}-waitlist` que lee `audienceTagsFor`).
const WAITLIST_TAG = "software-factory-waitlist";

const PAGE_URL = "https://www.fixtergeek.com/software-factory";
const OG_IMAGE = "https://www.fixtergeek.com/courses/software-factory-og-v2.png";

const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E", BG = "#0E1317", PANEL = "#19262A", SHADOW = "#37AB93";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Software Factory: taller de agentes en paralelo | FixterGeek",
    description:
      "Próximamente: taller en vivo para pasar de una spec a producción con agentes de código trabajando en paralelo, con tu editor y tu stack. Apúntate a la lista de espera.",
    url: PAGE_URL,
    // imagen propia con sus medidas reales (WhatsApp descarta la vista previa si no cuadran)
    image: OG_IMAGE,
    imageWidth: 1200,
    imageHeight: 630,
    keywords:
      "software factory, fábrica de software, agentes de código, claude code, codex, antigravity, cursor, agentes en paralelo, spec driven development, taller en vivo",
  });

  // Sin `offers` ni fechas: el taller aún no tiene precio ni calendario, y un dato falso es peor que nada.
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${PAGE_URL}#course`,
        name: "Software Factory",
        alternateName: "Fábrica de software agéntica",
        description:
          "Taller en vivo para montar una fábrica de software: de una spec a producción con agentes de código trabajando en paralelo, verificación en cada PR y deploy, con el editor y el stack que ya usas.",
        url: PAGE_URL,
        image: OG_IMAGE,
        inLanguage: "es",
        provider: {
          "@type": "Organization",
          name: "FixterGeek",
          url: "https://www.fixtergeek.com",
          logo: "https://www.fixtergeek.com/logo.png",
        },
        instructor: { "@type": "Person", name: "Héctor Bliss", url: "https://www.hectorbliss.com" },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online" },
        educationalLevel: "Intermediate",
        teaches: [
          "Escribir specs que un agente de código puede ejecutar",
          "Partir una spec en tickets y repartirlos entre agentes en paralelo",
          "Verificar el trabajo de los agentes con PRs, checks y revisión",
          "Desplegar a producción desde el tablero",
          "Poner puertas deterministas (tests, tipos, CI) que el agente no se puede saltar",
          "Separar al agente que genera del que valida",
          "Medir el costo en tokens y la calidad de cada ticket",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "Software Factory: taller de agentes en paralelo | FixterGeek",
        description: "Lista de espera del taller Software Factory de FixterGeek.",
        isPartOf: { "@id": "https://www.fixtergeek.com/#website" },
        about: { "@id": `${PAGE_URL}#course` },
        inLanguage: "es",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${PAGE_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.fixtergeek.com" },
          { "@type": "ListItem", position: 2, name: "Software Factory", item: PAGE_URL },
        ],
      },
    ],
  };

  return [...baseMeta, { "script:ld+json": schemaOrg }];
};

// Las defensas (honeypot, tiempo, IP, desechables, lista negra, una bienvenida por correo y tope
// diario) viven en `~/.server/signup-guard`, compartidas con las demás landings.
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const guard = await checkSignupRequest(request, formData, { email, label: "software-factory" });
  if (!guard.ok) {
    return guard.fake ? data({ ok: true }) : data({ ok: false, error: guard.error }, { status: 400 });
  }

  const existing = await db.subscriber.findUnique({ where: { email }, select: { id: true, tags: true, confirmed: true } });
  const isNew = !existing?.tags.includes(WAITLIST_TAG);
  if (!existing) {
    await db.subscriber.create({ data: { email, tags: [WAITLIST_TAG], confirmed: false } });
  } else if (isNew) {
    await db.subscriber.update({ where: { id: existing.id }, data: { tags: { push: WAITLIST_TAG } } });
  }

  await recordOrigin(email, request);

  // bienvenida con doble opt-in: sólo la primera vez que el correo entra a ESTA lista
  if (isNew && (await claimEmailSend(email, `welcome:${WAITLIST_TAG}`, guard.ip, "once"))) {
    await sendFactoryWaitlistWelcome(email, WAITLIST_TAG).catch((e) =>
      console.error("[software-factory] no salió la bienvenida", e),
    );
  }

  return data({ ok: true });
};

// El link del correo trae `?confirmar=<token>`: confirma al subscriber y la página lo celebra.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("confirmar");
  if (!token) return { confirmed: false };
  const decoded = validateWaitlistConfirmToken(token);
  if (!decoded) return { confirmed: false };
  await db.subscriber.updateMany({
    where: { email: decoded.email },
    data: { confirmed: true, confirmedAt: new Date() },
  });
  return { confirmed: true };
};

// ——— El tablero de la fábrica: tickets que avanzan solos de spec a producción ———

const COLUMNS = [
  { title: "Spec", color: INK },
  { title: "Agentes", color: MINT },
  { title: "PR", color: MUTE },
  { title: "Producción", color: GREEN },
];

// Backlog del que salen los tickets; al desplegarse uno, entra el siguiente.
const BACKLOG = [
  "Agente de soporte con IA", "Chat con tus PDFs (RAG)", "Login con passkeys", "Bot de WhatsApp", "Servidor MCP propio",
  "Dashboard en tiempo real", "Búsqueda semántica", "Checkout con Stripe", "Transcripción de juntas", "Editor tipo Notion",
  "Recomendaciones con IA", "Suscripciones y planes", "Voz a texto en vivo", "Colaboración en vivo", "Workflows con agentes",
  "Facturas CFDI 4.0", "Generador de imágenes", "Onboarding con IA", "Integración con Slack", "Agenda con Google Calendar",
  "Traducción automática", "Feature flags", "API pública + webhooks", "Portal de clientes", "Analítica de producto",
  "OCR de tickets", "Firma electrónica", "App móvil (PWA)", "Modo offline", "Resúmenes automáticos",
  "Tablero kanban", "Notificaciones push", "SSO empresarial", "Chatbot para tu web", "Multi-tenant",
  "Scraper de precios", "Video con subtítulos IA", "Pruebas A/B", "Roles y permisos", "Modo oscuro",
];

type Ticket = { id: number; label: string; agent: string; col: number; age: number; dwell: number; cost: string };

// lo que costó el ticket en tokens: se enseña desde PR, porque medirlo es parte del taller
const rollCost = () => `$${(0.12 + Math.random() * 0.8).toFixed(2)}`;

// quién toma cada ticket; Ghosty aparece seguido a propósito
const AGENTS = ["👾 Ghosty", "🤖 Claude Code", "🤖 Codex", "👾 Ghosty", "🤖 Cursor", "🤖 Antigravity", "👾 Ghosty"];

const BADGES = [["📝", "por hacer"], ["⚙", "trabajando"], ["🔍", "revisando"], ["🚀", "en vivo"]];

const TICK_MS = 1500;
const LIVE = COLUMNS.length - 1;

// Medidas del tablero según su ancho real: todas las posiciones salen de aquí.
const boardLayout = (width: number) => {
  const compact = width < 420;
  return {
    compact,
    height: compact ? 168 : 348,
    header: compact ? 22 : 38,
    cardH: compact ? 44 : 92,
    gap: compact ? 5 : 10,
    pad: compact ? 4 : 8,
    colW: (width - 3 * (compact ? 5 : 10)) / 4,
  };
};

type FactoryState = { tickets: Ticket[]; shipped: Ticket[]; movingId: number | null; deploys: number; nextId: number };

// cuántos turnos se queda un ticket en cada columna antes de poder avanzar:
// en Agentes se tardan, así que ahí conviven hasta 3 trabajando en paralelo
const DWELL = [1, 7, 3]; // promedio; cada ticket sortea el suyo al entrar a la columna
const rollDwell = (col: number) => Math.max(1, DWELL[col] + Math.round((Math.random() - 0.5) * DWELL[col]));
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

// siguiente ticket del backlog: al azar, sin repetir lo que ya está a la vista
const newTicket = (id: number, onBoard: Ticket[]): Ticket => {
  const visible = new Set(onBoard.map((t) => t.label));
  return { id, label: pick(BACKLOG.filter((l) => !visible.has(l))), agent: pick(AGENTS), col: 0, age: 0, dwell: rollDwell(0), cost: rollCost() };
};
const MAX_PER_COLUMN = [3, 3, 2]; // tope de tarjetas en Spec, Agentes y PR

const INITIAL_FACTORY: FactoryState = {
  tickets: [
    { id: 0, label: BACKLOG[0], agent: AGENTS[0], col: 2, age: 0, dwell: 3, cost: "$0.38" },
    { id: 1, label: BACKLOG[1], agent: AGENTS[1], col: 1, age: 3, dwell: 7, cost: "$0.61" },
    { id: 2, label: BACKLOG[2], agent: AGENTS[2], col: 1, age: 1, dwell: 6, cost: "$0.24" },
    { id: 3, label: BACKLOG[3], agent: AGENTS[3], col: 0, age: 1, dwell: 1, cost: "$0.47" },
    { id: 4, label: BACKLOG[4], agent: AGENTS[4], col: 0, age: 0, dwell: 1, cost: "$0.19" },
  ],
  shipped: [],
  movingId: null,
  deploys: 12,
  nextId: 5,
};

// Un turno de la línea: todos envejecen y avanza UNO — el más adelantado que ya cumplió su tiempo
// (y que tenga lugar: a Agentes no entra un cuarto). Si sale de PR, sube a la pila de producción
// y entra el siguiente del backlog en Spec.
const stepFactory = (f: FactoryState): FactoryState => {
  const aged = f.tickets.map((t) => ({ ...t, age: t.age + 1 }));
  const count = (col: number, list: Ticket[]) => list.filter((t) => t.col === col).length;
  // puede moverse si hay lugar adelante (a producción siempre hay). Primero los que ya cumplieron
  // su tiempo (el más adelantado); si ninguno, el que más lleva esperando: nunca hay turno quieto.
  const movable = aged.filter((t) => t.col === LIVE - 1 || count(t.col + 1, aged) < MAX_PER_COLUMN[t.col + 1]);
  const ready = movable.filter((t) => t.age >= t.dwell).sort((x, y) => y.col - x.col || y.age - x.age);
  const t = ready[0] ?? [...movable].sort((x, y) => y.age / y.dwell - x.age / x.dwell)[0];

  let tickets = aged;
  let shipped = f.shipped;
  let deploys = f.deploys;
  if (t && t.col < LIVE - 1) {
    tickets = aged.map((o) => (o.id === t.id ? { ...o, col: o.col + 1, age: 0, dwell: rollDwell(o.col + 1) } : o));
  } else if (t) {
    tickets = aged.filter((o) => o.id !== t.id);
    shipped = [{ ...t, col: LIVE, age: 0 }, ...f.shipped].slice(0, 6);
    deploys += 1;
  }
  // Spec se rellena del backlog cuando le queda uno o nada (nunca pasa de 3)
  let nextId = f.nextId;
  if (count(0, tickets) < 2) {
    tickets = [...tickets, newTicket(nextId, [...tickets, ...shipped])];
    nextId += 1;
  }
  return { tickets, shipped, deploys, nextId, movingId: t?.id ?? null };
};

const FactoryBoard = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!boxRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  // tickets activos (Spec→Agentes→PR) y la pila de producción; por turno se mueve UNO.
  // Todo en un solo estado y con un paso PURO: en StrictMode el updater corre dos veces, y con
  // efectos adentro cada despliegue se duplicaba (misma key → la tarjeta renacía en Spec).
  const [factory, setFactory] = useState<FactoryState>(INITIAL_FACTORY);
  useEffect(() => {
    // ritmo irregular para que no se sienta un ciclo: cada turno espera entre 1.1 y 2.1 s
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setFactory(stepFactory);
      timer = setTimeout(tick, TICK_MS - 400 + Math.random() * 1000);
    };
    timer = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timer);
  }, []);

  const { tickets, shipped, movingId, deploys } = factory;
  const L = boardLayout(width);
  // posición de cada tarjeta: activas por orden de llegada en su columna; producción por lugar en la pila
  const placed = [
    ...tickets.map((t) => ({ t, row: tickets.filter((o) => o.col === t.col && o.id < t.id).length })),
    ...shipped.map((t, i) => ({ t, row: i })),
  ];

  return (
    <div
      className="w-full rounded-3xl border-[3px] p-3 sm:p-5 lg:p-6"
      style={{ background: PANEL, borderColor: MINT, boxShadow: `10px 10px 0 ${SHADOW}` }}
    >
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        {[MINT, GREEN, MUTE].map((c) => (
          <span key={c} className="h-3 w-3 rounded-full border-2 lg:h-3.5 lg:w-3.5" style={{ borderColor: BG, background: c }} />
        ))}
        <span className="ml-2 truncate font-mono text-xs sm:text-sm lg:text-base" style={{ color: MUTE }}>
          tablero · 3 agentes
        </span>
        {/* contador de despliegues: salta cada vez que un ticket llega a producción */}
        <span className="ml-auto flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-mono text-xs font-bold sm:text-sm" style={{ borderColor: GREEN, color: GREEN }}>
          🚀
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={deploys} initial={{ y: -14, opacity: 0, scale: 1.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
              {deploys}
            </motion.span>
          </AnimatePresence>
          <span className="hidden sm:inline">deploys</span>
        </span>
      </div>

      {/* Alto fijo y overflow oculto: lo que baja de más en Producción se sale por abajo y desaparece */}
      <div ref={boxRef} className="relative overflow-hidden rounded-xl" style={{ height: L.height }}>
        <div className="absolute inset-0 grid grid-cols-4" style={{ columnGap: L.gap }}>
          {COLUMNS.map((column) => (
            <div key={column.title} className="rounded-xl" style={{ background: `${BG}aa` }}>
              <p
                className="truncate font-mono font-bold uppercase tracking-wider"
                style={{ color: column.color, fontSize: L.compact ? 10 : 14, padding: L.compact ? "5px 5px 0" : "10px 10px 0" }}
              >
                {column.title}
              </p>
            </div>
          ))}
        </div>

        {width > 0 &&
          placed.map(({ t, row }) => {
            const moving = t.id === movingId;
            const [icon, text] = BADGES[t.col];
            return (
              <motion.div
                key={t.id}
                // nunca se desmonta al cambiar de columna: sólo cambia x/y, así que no parpadea ni se duplica
                initial={{ x: L.pad, y: L.header, scale: 0.5, opacity: 0 }}
                animate={{
                  x: t.col * (L.colW + L.gap) + L.pad,
                  y: L.header + row * (L.cardH + L.gap),
                  scale: moving ? [1, 1.08, 1] : 1,
                  rotate: moving ? [0, -3, 0] : 0,
                  opacity: 1,
                }}
                transition={{ x: { type: "spring", stiffness: 170, damping: 22 }, y: { type: "spring", stiffness: 170, damping: 22 }, default: { duration: 0.6, ease: "backOut" } }}
                className="absolute left-0 top-0 overflow-hidden rounded-lg border-2 text-left"
                style={{
                  width: L.colW - 2 * L.pad,
                  height: L.cardH,
                  padding: L.compact ? "4px 5px" : "9px 11px",
                  background: COLUMNS[t.col].color,
                  borderColor: BG,
                  color: BG,
                  boxShadow: `${moving ? 6 : 3}px ${moving ? 6 : 3}px 0 ${BG}`,
                  zIndex: moving ? 20 : 10,
                  transition: "background-color 0.45s",
                }}
              >
                <p className="line-clamp-2 font-extrabold leading-tight" style={{ fontSize: L.compact ? 10 : 15 }}>{t.label}</p>
                {!L.compact && <p className="mt-1 truncate font-mono text-[11px]">{t.agent}</p>}
                <p className="mt-0.5 truncate font-mono" style={{ fontSize: L.compact ? 9 : 11 }}>
                  {t.col === 1 ? (
                    <motion.span className="inline-block" animate={{ rotate: 360 }} transition={{ duration: 2, ease: "linear", repeat: Infinity }}>
                      {icon}
                    </motion.span>
                  ) : (
                    icon
                  )}
                  {/* desde PR la tarjeta enseña lo que costó; el icono ya dice el estado */}
                  {t.col >= 2 && !L.compact ? ` ${t.cost}` : L.colW > 150 && ` ${text}`}
                </p>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};

// El título alterna entre inglés y español. Cada renglón es una ventana de 1em
// con overflow oculto: la palabra nueva sube y la vieja sale, sin mover el layout.
const TITLES = [
  ["Software", "Factory"],
  // "agéntica" la separa del outsourcing, que es lo que "fábrica de software" significa en México
  ["Fábrica", "agéntica"],
];

const OscillatingTitle = () => {
  const [lang, setLang] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLang((l) => (l + 1) % TITLES.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="mt-3 whitespace-nowrap text-[clamp(2.6rem,6.1vw,6.5rem)] font-black leading-[0.95] tracking-tight sm:mt-5">
      <span className="sr-only">Software Factory · Fábrica agéntica</span>
      {TITLES[lang].map((word, line) => (
        <span key={line} aria-hidden className="relative block h-[1.02em] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${lang}-${line}`}
              initial={{ y: "105%", rotate: 4 }}
              animate={{ y: 0, rotate: 0 }}
              exit={{ y: "-105%", rotate: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: line * 0.08 }}
              className="block origin-left"
              style={{ color: line ? MINT : INK }}
            >
              {word}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </h1>
  );
};

// Lugares desde donde Ghosty se asoma por detrás del tablero. Empieza escondido DENTRO del
// rectángulo del tablero (que lo tapa) y sale por el borde; los laterales sólo en pantallas anchas,
// porque en móvil el tablero toca el margen y se cortaría.
const PEEKS = [
  { style: { top: 0, right: "12%" }, axis: "y", out: "-70%", tilt: -10, wide: false },
  { style: { top: "38%", right: 0 }, axis: "x", out: "72%", tilt: 18, wide: true },
  { style: { top: 0, left: "14%" }, axis: "y", out: "-70%", tilt: 10, wide: false },
  { style: { top: "58%", left: 0 }, axis: "x", out: "-72%", tilt: -18, wide: true },
] as const;
const PEEK_EVERY_MS = 9000;

const GhostyPeek = () => {
  const [turn, setTurn] = useState(0);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setWide(mq.matches);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    const id = setInterval(() => setTurn((t) => t + 1), PEEK_EVERY_MS);
    return () => {
      mq.removeEventListener("change", onChange);
      clearInterval(id);
    };
  }, []);

  const spots = PEEKS.filter((p) => wide || !p.wide);
  const spot = spots[turn % spots.length];
  const hidden = spot.axis === "y" ? "60%" : "0%";
  const peek = spot.out;
  const back = spot.axis === "y" ? "-60%" : spot.out.startsWith("-") ? "-62%" : "62%";

  return (
    // key por turno: cada aparición arranca escondida detrás del tablero, en su nuevo lugar
    <motion.img
      key={turn}
      src="https://formmy.app/logo.png"
      alt=""
      aria-hidden
      className="pointer-events-none absolute z-0 w-16 sm:w-24"
      style={spot.style}
      initial={{ [spot.axis]: hidden, rotate: 0 }}
      animate={{
        [spot.axis]: [hidden, hidden, peek, back, peek, back, hidden],
        rotate: [0, 0, spot.tilt, -spot.tilt * 0.6, spot.tilt * 0.8, 0, 0],
      }}
      transition={{ duration: 3.4, times: [0, 0.1, 0.3, 0.45, 0.6, 0.75, 1], ease: "easeInOut", delay: 1.5 }}
    />
  );
};

// Pulso de atención compartido por «Próximamente» y el botón: mismos tiempos = mismo instante.
const ATTENTION = { duration: 1.1, times: [0, 0.2, 0.4, 0.6, 0.8, 1], repeat: Infinity, repeatDelay: 21 };

const POINTS = ["Sobre tu propio repo", "Agentes en paralelo con revisión", "Mides costo y calidad por ticket", "Descuento para grupos"];

export default function Route() {
  const fetcher = useFetcher<typeof action>();
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = fetcher.state !== "idle";
  const { confirmed } = useLoaderData<typeof loader>();
  const done = fetcher.data?.ok === true || confirmed;
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), []);
  const error = fetcher.data && "error" in fetcher.data && typeof fetcher.data.error === "string" ? fetcher.data.error : null;

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  return (
    // una sola pantalla: alto del viewport y sin desborde; la navbar es fixed y se compensa con pt
    <main className="relative flex h-[100dvh] flex-col overflow-hidden px-4 pb-4 pt-16 sm:px-8 sm:pt-20" style={{ background: BG, color: INK }}>
      {done && <CanvasConfetti />}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(242,245,244,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-5 md:flex-row md:items-center md:gap-10 lg:gap-12">
        <div className="flex flex-col items-start md:w-[42%]">
          <motion.span
            initial={{ opacity: 0, y: -10, rotate: -4 }}
            // entra y luego, cada ~22 s, brinca y se sacude (a la par del botón)
            animate={{ opacity: 1, y: [0, 0, -10, 0, -4, 0], rotate: [-2, -2, -8, 5, -5, -2], scale: [1, 1, 1.15, 1, 1.05, 1] }}
            transition={{ opacity: { duration: 0.4 }, default: ATTENTION }}
            className="rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] sm:text-sm lg:px-4 lg:py-1.5 lg:text-base"
            style={{ background: GREEN, borderColor: BG, color: BG, boxShadow: `3px 3px 0 ${SHADOW}` }}
          >
            Próximamente · Taller en vivo
          </motion.span>

          <OscillatingTitle />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 max-w-xl text-base sm:mt-5 sm:text-xl lg:text-2xl" style={{ color: `${INK}cc` }}>
            Monta tu fábrica de software sobre tu propio repo: agentes de código que toman tickets, abren PRs y despliegan. Tú apruebas.
          </motion.p>
          {/* "software factory" hoy se usa para vender outsourcing y para prometer agentes que programan solos */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-2 hidden max-w-xl text-sm sm:block lg:text-base" style={{ color: MUTE }}>
            No es outsourcing, y los agentes no programan solos: aprendes el sistema que hace confiable lo que generan.
          </motion.p>

          <ul className="mt-5 hidden flex-wrap gap-2.5 sm:flex">
            {/* el chip que más importa: no hay que cambiar de herramienta */}
            <li
              // emoji y texto en columnas: si el texto baja de renglón, arranca alineado (sangría francesa)
              className="flex items-start gap-2 rounded-2xl border-2 px-4 py-1.5 text-sm font-bold lg:text-base"
              style={{ background: MINT, borderColor: BG, color: BG, boxShadow: `3px 3px 0 ${SHADOW}` }}
            >
              <span aria-hidden>🤖</span>
              <span>Con el agente que ya usas:<br />Claude Code · Codex · Antigravity · Cursor · Ghosty</span>
            </li>
            {POINTS.map((p) => (
              <li key={p} className="rounded-full border-2 px-4 py-1.5 text-sm lg:text-base" style={{ borderColor: `${MINT}55`, color: MINT }}>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-6 w-full max-w-xl lg:mt-8">
            {done ? (
              <motion.div
                role="status"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="rounded-2xl border-2 px-5 py-4"
                style={{ background: MINT, borderColor: BG, color: BG, boxShadow: `6px 6px 0 ${SHADOW}` }}
              >
                <p className="text-2xl font-black lg:text-3xl">¡Listo, estás dentro! 🏭</p>
                <p className="mt-1 text-base lg:text-lg">Serás de los primeros en saber fechas y precio de lanzamiento del taller.</p>
              </motion.div>
            ) : (
              <fetcher.Form method="post" className="flex w-full flex-col gap-2.5 sm:flex-row">
                {/* honeypot: un humano no lo ve ni lo llena */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                <input type="hidden" name="t" value={startedAt} />
                <label htmlFor="email" className="sr-only">Correo</label>
                <input
                  ref={inputRef}
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  aria-invalid={!!error}
                  className="h-14 w-full flex-1 rounded-xl border-2 bg-transparent px-5 text-lg lg:h-16 lg:text-xl placeholder:text-[#F2F5F4]/35 focus:outline-none"
                  style={{ borderColor: `${INK}33`, color: INK }}
                />
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  // mismo pulso que «Próximamente», en el mismo instante
                  animate={{ scale: [1, 1, 1.12, 0.96, 1.04, 1], rotate: [0, 0, -3, 3, -1, 0] }}
                  transition={ATTENTION}
                  whileHover={{ x: -2, y: -2 }}
                  whileTap={{ x: 3, y: 3 }}
                  className="h-14 shrink-0 rounded-xl border-2 px-6 text-lg font-extrabold lg:h-16 lg:px-8 lg:text-xl disabled:opacity-60"
                  style={{ background: GREEN, borderColor: BG, color: BG, boxShadow: `4px 4px 0 ${SHADOW}` }}
                >
                  {isLoading ? "Enviando…" : "Quiero enterarme"}
                </motion.button>
              </fetcher.Form>
            )}
            {error && <p role="alert" className="mt-2 text-sm" style={{ color: GREEN }}>{error}</p>}
            {!done && <p className="mt-3 text-sm" style={{ color: MUTE }}>Sin spam. Sólo te avisamos cuando abra · hay descuento para grupos.</p>}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          className="relative w-full md:w-[58%]"
        >
          <GhostyPeek />
          <div className="relative z-10">
            <FactoryBoard />
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 hidden text-center sm:block text-[11px] sm:text-xs" style={{ color: `${INK}70` }}>
        Por <a href="https://www.hectorbliss.com" target="_blank" rel="noopener" className="underline underline-offset-4">Héctorbliss</a> · FixterGeek
      </footer>
    </main>
  );
}
