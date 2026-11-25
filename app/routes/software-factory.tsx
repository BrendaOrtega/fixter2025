import { useEffect, useRef, useState } from "react";
import { data, useFetcher, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { db } from "~/.server/db";
import { recordPageVisit } from "~/.server/page-visit.server";
import { getUserOrNull } from "~/.server/dbGetters";
import { validateWaitlistConfirmToken } from "~/utils/tokens";
import {
  isAntiFactoryRegistered,
  isClubMember,
  registerAntiFactory,
} from "~/.server/services/anti-factory.server";
import { CanvasConfetti } from "~/components/common/CanvasConfetti";
import { GoogleLoginLink } from "~/components/GoogleLoginLink";
import { useBotTrap } from "~/hooks/useBotTrap";
import { LAYER } from "~/utils/layers";
import getMetaTags from "~/utils/getMetaTags";

// Títulos en Bricolage Grotesque: grotesca con carácter de taller, sin el peso bruto de antes
export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" },
];

// ===========================================
// Ghosty Anti-Factory: taller gratis en vivo (1 y 3 de dic), por YouTube y en la llamada del club.
// Hasta el 25-nov se cobraba con Stripe; desde entonces la página es un registro gratis.
// Antes fue la lista de espera del taller «Software Factory». Esta misma página se sirve en
// /software-factory (ahí apunta el anuncio de Meta) y en /anti-factory (correo, deck y evento de
// Facebook): un solo componente, canonical en /anti-factory, y la URL conserva sus UTM y fbclid.
// Una pantalla, sin scroll.
// ===========================================

/// Se repite aquí y no se importa del `.server`: el componente corre en el navegador.
const ANTI_FACTORY_PATH = "/anti-factory";
const PAGE_URL = `https://www.fixtergeek.com${ANTI_FACTORY_PATH}`;
/// Portada del evento (la misma del evento de Facebook), en 1200×628.
const OG_IMAGE = "https://www.fixtergeek.com/anti-factory-taller-og.jpg";

// sombra suave en lugar de la dura: el panel flota, no está pegado con cinta
const SOFT_SHADOW = "0 40px 80px -40px rgba(0,0,0,0.75)";
const DISPLAY = { fontFamily: '"Bricolage Grotesque", Inter, sans-serif' };

const MINT = "#85DDCB", GREEN = "#8DCF6E", INK = "#F2F5F4", MUTE = "#7C8A8E", BG = "#0E1317", PANEL = "#19262A";

export const meta = () =>
  getMetaTags({
    title: "Ghosty Anti-Factory | Taller gratis en vivo | FixterGeek",
    description:
      "Hay formas más simples y efectivas de desarrollar que una fábrica. Taller gratis en vivo el martes 1 y el jueves 3 de diciembre de 2026, de 7 a 9 pm (CDMX), por YouTube y en la llamada del Club de Agentes de IA. Regístrate gratis: te avisamos de las dos sesiones y te llevas 3 meses del Club de Agentes de IA.",
    // canonical: las dos rutas sirven esta página y la buena es /anti-factory
    url: PAGE_URL,
    image: OG_IMAGE,
    imageWidth: 1200,
    imageHeight: 628,
    keywords:
      "ghosty anti-factory, ghosty-dev, agentes de código, revisor con contexto limpio, claude code, codex, club de agentes de ia, taller gratis, taller en vivo",
  });

/// A dónde regresa el login del modal (Google o magic link): el loader termina el registro con el
/// correo ya verificado.
const REGISTER_NEXT = `${ANTI_FACTORY_PATH}?registro=1`;
const REGISTER_TAG = "anti-factory-registro-dic26"; // = ANTI_FACTORY_REGISTER_TAG del .server

const CTA_CLASS =
  "h-11 w-full rounded-xl px-4 text-lg font-semibold transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#85DDCB] disabled:opacity-60 sm:w-auto sm:px-8 lg:h-14 lg:text-xl";

/// La grabación del webinar gratis del 18-nov en el club (CommunityRecording 6afe4a7bac008b86643afe8b).
/// Las grabaciones normales del club sólo las reproducen los miembros: los 3 meses del registro la abren.
const WEBINAR_RECORDING_URL = "/comunidad/club-de-agentes?tab=recs&grabacion=6afe4a7bac008b86643afe8b";

/// Navegadores dentro de apps (anuncios de Meta, TikTok, LinkedIn…): Google rechaza ahí el OAuth con
/// «403 disallowed_useragent», así que el modal no ofrece Google y deja la liga por correo.
const IN_APP_UA = /Instagram|FBAN|FBAV|FB_IAB|FB4A|musical_ly|TikTok|BytedanceWebview|LinkedInApp|Line\/|Threads|Twitter|; wv\)/i;
const inAppBrowser = (ua: string) =>
  IN_APP_UA.test(ua) ? (/Android/i.test(ua) ? ("android" as const) : ("ios" as const)) : null;

const displayName = (u: { displayName?: string | null; username?: string | null }) => u.displayName || u.username || null;

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("intent") !== "register") return data({ error: null });
  // Sin sesión no hay registro: primero el login del modal, que verifica el correo.
  const user = await getUserOrNull(request);
  if (!user) return data({ error: "Inicia sesión para registrarte." }, { status: 401 });
  try {
    const { gift } = await registerAntiFactory({ id: user.id, email: user.email, name: displayName(user) });
    return data({ ok: true as const, gift });
  } catch (error) {
    console.error("[anti-factory] register error:", error);
    return data({ error: "No pudimos registrarte. Intenta de nuevo en un momento." }, { status: 500 });
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  recordPageVisit(request); // analítica por UTM, sin cookies
  const params = new URL(request.url).searchParams;

  // Correos viejos de la lista de espera traen `?confirmar=<token>`: se sigue confirmando.
  const token = params.get("confirmar");
  const decoded = token ? validateWaitlistConfirmToken(token) : null;
  if (decoded) {
    await db.subscriber.updateMany({
      where: { email: decoded.email },
      data: { confirmed: true, confirmedAt: new Date() },
    });
  }

  const user = await getUserOrNull(request);
  // De regreso del login (`?registro=1`): se registra una sola vez; recargar no repite nada.
  const fresh =
    user && params.get("registro") === "1"
      ? await registerAntiFactory({ id: user.id, email: user.email, name: displayName(user) })
      : null;
  return {
    inApp: inAppBrowser(request.headers.get("user-agent") ?? ""),
    userEmail: user?.email ?? null,
    // Quien ya se registró (o compró antes) ve directo su confirmación.
    registered: user ? await isAntiFactoryRegistered(user.email) : false,
    justRegistered: !!fresh && !fresh.already,
    // El confeti sale en cada registro que se completa, aunque esa cuenta ya estuviera registrada.
    celebrate: !!fresh,
    gift: fresh?.gift ?? null,
    isMember: user ? await isClubMember(user) : false,
    confirmed: !!decoded,
  };
};

// ——— El tablero de tu repo: pendientes que avanzan solos hasta tu merge ———
// Sin línea de roles: un escritor por pendiente (varios pendientes a la vez), un revisor con
// contexto limpio y tú decides el merge.

const COLUMNS = [
  { title: "Pendientes", color: INK },
  { title: "Escribe", color: MINT },
  { title: "Revisa", color: MUTE },
  { title: "Tu merge", color: GREEN },
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

// lo que costó el ticket en tokens (el tablero lo guarda, ya no lo enseña)
const rollCost = () => `$${(0.12 + Math.random() * 0.8).toFixed(2)}`;

// quién escribe cada pendiente: ghosty-dev funciona con Claude Code o Codex (su README)
const AGENTS = ["🤖 Claude Code", "🤖 Codex"];

const BADGES = [["📝", "en cola"], ["⚙", "escribiendo"], ["🔍", "contexto limpio"], ["✅", "con evidencia"]];

const TICK_MS = 1500;
const LIVE = COLUMNS.length - 1;

// Medidas del tablero según su ancho real: todas las posiciones salen de aquí.
const boardLayout = (width: number, mini = false) => {
  // miniatura del celular: 4 columnas, 2 tarjetas por columna y sólo el título de cada una
  if (mini) {
    return { compact: true, mini, height: 92, header: 16, cardH: 34, gap: 4, pad: 3, colW: (width - 3 * 4) / 4 };
  }
  const compact = width < 420;
  return {
    compact,
    mini,
    height: compact ? 150 : 348,
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

const FactoryBoard = ({ mini = false }: { mini?: boolean }) => {
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
  const L = boardLayout(width, mini);
  // posición de cada tarjeta: activas por orden de llegada en su columna; producción por lugar en la pila
  const placed = [
    ...tickets.map((t) => ({ t, row: tickets.filter((o) => o.col === t.col && o.id < t.id).length })),
    ...shipped.map((t, i) => ({ t, row: i })),
  ];

  return (
    <div
      className={mini ? "w-full rounded-2xl border px-2 pb-2 pt-1.5" : "w-full rounded-3xl border p-2.5 sm:p-5 lg:p-6"}
      style={{ background: PANEL, borderColor: `${MINT}2e`, boxShadow: SOFT_SHADOW }}
    >
      {mini ? (
        // en la miniatura la barra es una sola línea chiquita
        <div className="mb-1 flex items-center gap-1 font-mono text-[10px] leading-none" style={{ color: MUTE }}>
          {[MINT, GREEN, MUTE].map((c) => (
            <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
          ))}
          <span className="ml-1">tu repo</span>
          <span className="ml-auto font-semibold tabular-nums" style={{ color: GREEN }}>✅ {deploys} listos</span>
        </div>
      ) : (
      <div className="mb-2 flex items-center gap-2 sm:mb-4">
        {[MINT, GREEN, MUTE].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full lg:h-3 lg:w-3" style={{ background: c, opacity: 0.8 }} />
        ))}
        <span className="ml-2 truncate font-mono text-xs sm:text-sm lg:text-base" style={{ color: MUTE }}>
          pendientes · tu repo
        </span>
        {/* contador de despliegues: salta cada vez que un ticket llega a producción */}
        <span className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums sm:text-sm" style={{ background: `${GREEN}1f`, color: GREEN }}>
          ✅
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={deploys} className="inline-block" initial={{ y: -14, opacity: 0, scale: 1.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
              {deploys}
            </motion.span>
          </AnimatePresence>
          <span className="hidden sm:inline">listos para tu merge</span>
        </span>
      </div>
      )}

      {/* Alto fijo y overflow oculto: lo que baja de más en Producción se sale por abajo y desaparece */}
      <div ref={boxRef} className="relative overflow-hidden rounded-xl" style={{ height: L.height }}>
        <div className="absolute inset-0 grid grid-cols-4" style={{ columnGap: L.gap }}>
          {COLUMNS.map((column) => (
            <div key={column.title} className="rounded-xl" style={{ background: `${BG}aa` }}>
              <p
                className="truncate font-semibold"
                style={{ color: column.color, fontSize: L.mini ? 9 : L.compact ? 10 : 14, padding: L.mini ? "3px 4px 0" : L.compact ? "5px 5px 0" : "10px 10px 0" }}
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
                  opacity: 1,
                }}
                transition={{ x: { type: "spring", stiffness: 170, damping: 22 }, y: { type: "spring", stiffness: 170, damping: 22 }, default: { duration: 0.6, ease: "backOut" } }}
                className="absolute left-0 top-0 overflow-hidden rounded-lg text-left"
                style={{
                  width: L.colW - 2 * L.pad,
                  height: L.cardH,
                  padding: L.mini ? "3px 4px" : L.compact ? "4px 5px" : "9px 11px",
                  background: COLUMNS[t.col].color,
                  borderColor: BG,
                  color: BG,
                  boxShadow: moving ? "0 14px 28px -10px rgba(0,0,0,0.7)" : "0 4px 10px -4px rgba(0,0,0,0.5)",
                  zIndex: moving ? 20 : 10,
                  transition: "background-color 0.45s",
                }}
              >
                {/* en la miniatura una palabra larga se parte con guion en vez de cortarse */}
                <p lang="es" className="line-clamp-2 font-extrabold leading-tight" style={{ fontSize: L.mini ? 9 : L.compact ? 10 : 15, ...(L.mini ? { hyphens: "auto", overflowWrap: "anywhere" } : {}) }}>{t.label}</p>
                {!L.compact && <p className="mt-1 truncate font-mono text-[11px]">{t.agent}</p>}
                {!L.mini && (
                <p className="mt-0.5 truncate font-mono" style={{ fontSize: L.compact ? 9 : 11 }}>
                  {t.col === 1 ? (
                    <motion.span className="inline-block" animate={{ rotate: 360 }} transition={{ duration: 2, ease: "linear", repeat: Infinity }}>
                      {icon}
                    </motion.span>
                  ) : (
                    icon
                  )}
                  {L.colW > 150 && ` ${text}`}
                </p>
                )}
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};

// El título alterna entre inglés y español. Cada renglón es una ventana de 1em
// con overflow oculto: la palabra nueva sube y la vieja sale, sin mover el layout.

const TITLES = [["Ghosty", "Anti\u2011Factory"]];

const OscillatingTitle = () => {
  const [lang, setLang] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLang((l) => (l + 1) % TITLES.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="mt-1 flex flex-row gap-x-[0.25em] whitespace-nowrap text-[1.75rem] font-bold sm:flex-col leading-[0.95] tracking-[-0.035em] sm:mt-3 sm:text-[clamp(2.3rem,5vw,5.25rem)]" style={DISPLAY}>
      <span className="sr-only">Ghosty Anti-Factory</span>
      {/* la ventana crece 0.15em arriba y abajo (acentos y la cola de la g) y el margen negativo lo devuelve: el renglón ocupa lo mismo. El h1 es flex para que esos márgenes no se colapsen */}
      {TITLES[lang].map((word, line) => (
        <span key={line} aria-hidden className="relative -my-[0.15em] block h-[1.32em] overflow-hidden py-[0.15em]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${lang}-${line}`}
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "-110%" }}
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
      className="pointer-events-none absolute z-0 hidden w-16 sm:w-24 md:block"
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

// ——— Registro sin salir de la página ———
// El login de siempre en un modal: Google (sale a su pantalla y regresa a `?registro=1`) o la liga
// por correo de `/api/user` (`magic_link`, con el tag del taller y el mismo `next`). En el celular es
// una hoja que sube desde abajo; en escritorio, un modal centrado. Cierra con X, Esc o tocando fuera.
/// Android: la misma página en Chrome (los navegadores de apps no dejan entrar con Google).
const chromeIntent = () => {
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
};

const RegisterSheet = ({ open, onClose, inApp }: { open: boolean; onClose: () => void; inApp: "android" | "ios" | null }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher<{ sent?: true }>();
  const { trap } = useBotTrap();
  const sending = fetcher.state !== "idle";
  const sent = !!fetcher.data?.sent;
  const sentTo = String(fetcher.formData?.get("email") ?? "") || null;
  const [email, setEmail] = useState("");

  // Esc cierra y Tab no sale del panel; el foco arranca en el primer control.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("button, input:not([type=hidden]):not([tabindex='-1']), a[href]") ?? []).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => focusables()[1]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6" style={{ zIndex: LAYER.dialog }}>
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "rgba(14,19,23,0.72)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative w-full rounded-t-3xl border px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-md sm:rounded-3xl sm:p-7"
            style={{ background: PANEL, borderColor: `${MINT}2e`, color: INK, boxShadow: SOFT_SHADOW }}
          >
            {/* asa de la hoja: sólo en el celular */}
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full sm:hidden" style={{ background: `${MUTE}88` }} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition-colors hover:bg-white/10"
              style={{ color: MUTE }}
            >
              ×
            </button>

            {sent ? (
              <div role="status" className="py-2 text-center">
                <p className="text-4xl">📬</p>
                <p id="register-title" className="mt-2 text-2xl font-bold" style={DISPLAY}>Revisa tu correo</p>
                <p className="mt-2 text-[15px]" style={{ color: `${INK}cc` }}>
                  Te mandamos la liga{sentTo ? <> a <span className="font-semibold" style={{ color: MINT }}>{sentTo}</span></> : null}. Ábrela y quedas registrado; si no la ves, revisa el spam.
                </p>
                <button type="button" onClick={onClose} className="mt-5 h-12 w-full rounded-xl text-lg font-semibold" style={{ background: GREEN, color: BG }}>
                  Listo
                </button>
              </div>
            ) : (
              <>
                <p id="register-title" className="pr-8 text-2xl font-bold sm:text-3xl" style={DISPLAY}>Regístrate gratis</p>
                <p className="mt-1 text-[14px] leading-snug sm:text-[15px]" style={{ color: `${INK}cc` }}>
                  Te avisamos de las dos sesiones y te llevas 3 meses del Club de Agentes de IA.
                </p>
                {inApp ? (
                  // Dentro de Instagram, Facebook, TikTok…: Google no deja entrar, la liga por correo sí.
                  <div className="h-4" />
                ) : (
                  <>
                    <GoogleLoginLink
                      next={REGISTER_NEXT}
                      label="Continuar con Google"
                      className="my-0 mt-4 h-12 rounded-xl bg-white text-[17px] text-[#0E1317] shadow-none hover:bg-white/90"
                    />
                    <div className="my-4 flex items-center gap-3 text-[13px]" style={{ color: MUTE }}>
                      <span className="h-px flex-1" style={{ background: `${MINT}2e` }} />o con tu correo<span className="h-px flex-1" style={{ background: `${MINT}2e` }} />
                    </div>
                  </>
                )}
                <fetcher.Form method="post" action="/api/user" className="grid gap-2">
                  {trap}
                  <input type="hidden" name="intent" value="magic_link" />
                  <input type="hidden" name="inline" value="1" />
                  <input type="hidden" name="next" value={REGISTER_NEXT} />
                  <input type="hidden" name="tags" value={REGISTER_TAG} />
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="tu@correo.com"
                    aria-label="Tu correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border bg-transparent px-4 text-base outline-none placeholder:text-[#7C8A8E] focus:border-[#85DDCB]"
                    style={{ borderColor: `${MINT}55`, color: INK }}
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="h-12 w-full rounded-xl text-lg font-semibold transition-[filter] hover:brightness-110 disabled:opacity-60"
                    style={{ background: GREEN, color: BG }}
                  >
                    {sending ? "Mandando…" : "Mandarme la liga"}
                  </button>
                </fetcher.Form>
                {inApp && (
                  <p className="mt-3 text-[13px] leading-snug" style={{ color: MUTE }}>
                    ¿Prefieres Google?{" "}
                    {inApp === "android" ? (
                      <a href={chromeIntent()} className="font-semibold underline underline-offset-4" style={{ color: MINT }}>
                        Ábrelo en Chrome
                      </a>
                    ) : (
                      <>Toca <span className="font-semibold" style={{ color: INK }}>•••</span> → <span className="font-semibold" style={{ color: INK }}>Abrir en el navegador</span>.</>
                    )}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Lo que te llega al registrarte; `short` es la versión que cabe en el celular
const POINTS = [
  { short: "Avisos de las dos sesiones", long: "Avisos de las dos sesiones para tu calendario" },
  { short: "3 meses del club gratis", long: "3 meses gratis del Club de Agentes de IA" },
  { short: "Preguntas en vivo", long: "Preguntas en vivo en la llamada del club" },
  { short: "Quiz en vivo", long: "Quiz en vivo: el premio es revisar tu repo en vivo y mención en pantalla" },
];

type Gift = "granted" | "member" | "used" | null;

/// Qué le decimos según cómo quedó su regalo del club.
const giftLine = (gift: Gift, isMember: boolean) =>
  gift === "granted"
    ? "Tus 3 meses del Club de Agentes de IA ya están activos."
    : gift === "member" || (!gift && isMember)
      ? "Ya eres miembro del club, así que ya estás dentro."
      : "Tienes pase a la llamada del club esos dos días.";

export default function Route() {
  const fetcher = useFetcher<typeof action>();
  const { inApp, userEmail, registered, justRegistered: justBack, celebrate: backCelebrate, gift: backGift, isMember, confirmed } = useLoaderData<typeof loader>();
  const busy = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const justPosted = !!(fetcher.data && "ok" in fetcher.data);
  const justRegistered = justBack || justPosted;
  const celebrate = backCelebrate || justPosted;
  const gift: Gift = (fetcher.data && "gift" in fetcher.data ? fetcher.data.gift : null) ?? backGift;
  const done = registered || justPosted;
  const [sheetOpen, setSheetOpen] = useState(false);
  // Con sesión se registra con un clic; sin sesión, el modal del login.
  const startRegister = () =>
    userEmail ? fetcher.submit({ intent: "register" }, { method: "post", action: ANTI_FACTORY_PATH }) : setSheetOpen(true);

  // De regreso del login se quita `?registro=1` (los UTM se quedan) para que recargar no lo repita.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("registro")) return;
    url.searchParams.delete("registro");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);

  // Confeti de EasyBits en cada registro, además del de la casa; sólo en el cliente.
  useEffect(() => {
    if (!celebrate) return;
    import("@easybits.cloud/confetti").then(({ confetti }) => {
      confetti({ colors: ["#85DDCB", "#8DCF6E", "#F2F5F4"], outline: "#0E1317" });
    });
  }, [celebrate]);

  return (
    // una sola pantalla: alto del viewport y sin desborde; la navbar es fixed y se compensa con pt
    <main style={{ background: BG, color: INK }}>
      {(celebrate || confirmed) && <CanvasConfetti />}
      <RegisterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} inApp={inApp} />
      <div className="relative flex h-[100dvh] flex-col overflow-hidden px-4 pb-3 pt-[4.5rem] sm:px-8 sm:pb-4 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(242,245,244,0.10) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col justify-[safe_center] gap-3 md:flex-row md:items-center md:gap-10 lg:gap-12">
        <div className="flex flex-col items-start md:w-[46%]">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium sm:flex lg:text-base"
            style={{ borderColor: `${GREEN}40`, color: GREEN }}
          >
            {/* punto que late: el taller es lo siguiente */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden" style={{ background: GREEN }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN }} />
            </span>
            Taller gratis en vivo · martes 1 y jueves 3 de diciembre
          </motion.span>

          <OscillatingTitle />

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-1 max-w-xl text-[14px] leading-snug sm:mt-3 sm:text-xl" style={{ color: `${INK}cc` }}>
            <span className="sm:hidden">Más simple y efectivo que una fábrica.</span>
            <span className="hidden sm:inline">Hay formas más simples y efectivas de desarrollar que una fábrica.</span>
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-2 hidden max-w-xl text-sm sm:block lg:text-base" style={{ color: MUTE }}>
            Un agente escribe, otro agente revisa con contexto limpio y tú decides el merge. Funciona con Claude Code o Codex.
          </motion.p>

          {/* En el celular el tablero va en miniatura, con la misma animación */}
          <div className="relative mt-2 w-full sm:hidden">
            <motion.img
              src="https://formmy.app/logo.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-5 right-6 z-0 w-7"
              animate={{ y: [14, 14, 0, 6, 0, 14, 14] }}
              transition={{ duration: 3.4, times: [0, 0.1, 0.3, 0.45, 0.6, 0.75, 1], ease: "easeInOut", repeat: 3, repeatDelay: 5.6, delay: 1.5 }}
            />
            <div className="relative z-10">
              <FactoryBoard mini />
            </div>
          </div>

          {/* Cuándo y dónde, y lo que te llega al registrarte */}
          <ol className="mt-2 w-full max-w-xl space-y-1.5 sm:mt-4 sm:space-y-2">
            <li className="rounded-2xl border px-3 py-1.5 sm:px-4 sm:py-2.5" style={{ background: `${MINT}14`, borderColor: `${MINT}40` }}>
              <span className="text-[13px] sm:text-sm lg:text-base">
                <span className="font-semibold" style={{ color: MINT }}>Gratis en vivo</span>{" "}
                <span className="sm:hidden" style={{ color: `${INK}cc` }}>1 y 3 de dic · 7 a 9 pm (CDMX)</span>
                <span className="hidden sm:inline" style={{ color: `${INK}cc` }}>mar 1 y jue 3 de dic · 7 a 9 pm (CDMX) · por YouTube y en la llamada del Club de Agentes de IA</span>
              </span>
            </li>
            <li className="rounded-2xl border px-3 py-1.5 sm:px-4 sm:py-2.5" style={{ borderColor: `${MINT}2e` }}>
              <span className="text-[12px] sm:text-sm lg:text-base">
                <span className="font-semibold" style={{ color: GREEN }}>Al registrarte te llega</span>
              </span>
              <ul className="mt-1 flex flex-wrap gap-1 sm:mt-1.5 sm:gap-1.5">
                {POINTS.map((p) => (
                  <li key={p.short} className="rounded-full border px-2 py-px text-[11px] sm:px-2.5 sm:py-0.5 sm:text-[13px]" style={{ borderColor: `${MINT}2e`, color: `${INK}cc` }}>
                    <span className="sm:hidden">{p.short}</span>
                    <span className="hidden sm:inline">{p.long}</span>
                  </li>
                ))}
              </ul>
            </li>
          </ol>

          <div className="mt-2 w-full max-w-xl sm:mt-2.5 lg:mt-4">
            {done ? (
              <motion.div
                role="status"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="rounded-2xl border px-4 py-3 sm:px-5 sm:py-4"
                style={{ background: `${MINT}14`, borderColor: `${MINT}55`, color: INK }}
              >
                <p className="text-xl font-bold sm:text-2xl lg:text-3xl" style={DISPLAY}>¡Listo, estás registrado! 👻</p>
                <p className="mt-1 text-[13px] sm:text-[14px] lg:text-lg">
                  {justRegistered ? "Te mandamos" : "Ya te mandamos"} un correo a <span className="font-semibold">{userEmail}</span> con las dos fechas para tu calendario. {giftLine(gift, isMember)}
                </p>
              </motion.div>
            ) : (
              <>
                {/* con sesión se registra aquí mismo; sin sesión, el modal con el login de siempre (Google o liga) */}
                {userEmail ? (
                  <fetcher.Form method="post" action={ANTI_FACTORY_PATH}>
                    <input type="hidden" name="intent" value="register" />
                    <motion.button
                      type="submit"
                      disabled={busy}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={CTA_CLASS}
                      style={{ background: GREEN, color: BG }}
                    >
                      {busy ? "Registrando…" : "Regístrate gratis"}
                    </motion.button>
                  </fetcher.Form>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className={CTA_CLASS}
                    style={{ background: GREEN, color: BG }}
                  >
                    Regístrate gratis
                  </motion.button>
                )}
                <div className="mt-1 text-[12px] leading-snug sm:mt-2 sm:text-sm" style={{ color: MUTE }}>
                  {error ? (
                    <p role="alert" style={{ color: GREEN }}>{error}</p>
                  ) : (
                    <>
                      <p className="sm:hidden">Te avisamos de las dos sesiones y te llevas 3 meses del club.</p>
                      <p className="hidden sm:block">Regístrate gratis: te avisamos de las dos sesiones y te llevas 3 meses del Club de Agentes de IA.</p>
                    </>
                  )}
                </div>
              </>
            )}
            {/* Renglón secundario: la grabación del webinar del 18-nov; sin membresía, es gancho al registro */}
            {(isMember || !done) && (
              <p className="mt-1.5 truncate text-[12px] sm:mt-2 sm:text-sm" style={{ color: MUTE }}>
                {isMember ? (
                  <a href={WEBINAR_RECORDING_URL} className="underline-offset-4 hover:underline">
                    ¿Te perdiste el webinar del 18 de noviembre? <span style={{ color: MINT }}>Míralo en el club →</span>
                  </a>
                ) : (
                  <button type="button" onClick={startRegister} className="truncate underline-offset-4 hover:underline">
                    <span className="sm:hidden">¿Te perdiste el webinar del 18-nov? <span style={{ color: MINT }}>Regístrate y míralo</span></span>
                    <span className="hidden sm:inline">¿Te perdiste el webinar del 18 de noviembre? <span style={{ color: MINT }}>Regístrate y podrás verlo</span></span>
                  </button>
                )}
              </p>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          className="relative hidden w-full sm:block md:w-[54%]"
        >
          <GhostyPeek />
          <div className="relative z-10">
            <FactoryBoard />
          </div>
        </motion.div>
      </section>
      </div>
    </main>
  );
}
