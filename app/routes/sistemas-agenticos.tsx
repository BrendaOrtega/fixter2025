import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher, useLoaderData } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import VideoGaleria from "~/components/sistemas/VideoGaleria";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import HeroScene from "~/components/sistemas/HeroScene";
import { FaWhatsapp } from "react-icons/fa";

// ===========================================
// Programa: Diseño de sistemas agénticos
// On-demand desde septiembre 2026 · dos niveles
// ===========================================
const COURSE_SLUG = "sistemas-agenticos";

/// Los dos niveles. `key` es el `Product.key` que resuelve el webhook
/// (`fulfillment.server.ts`); el precio de verdad se lee del Product en el
/// action y estos números solo pintan la landing.
const TIERS = {
  programa: {
    key: "sistemas-agenticos-workshop",
    name: "Programa completo",
    price: 3490,
    stripeName: "Diseño de sistemas agénticos — Programa completo",
    stripeDescription:
      "17 h de video · repos y materiales · comunidad · acceso de por vida",
  },
  "tu-caso": {
    key: "sistemas-agenticos-tu-caso",
    name: "Programa + Tu caso",
    price: 4990,
    stripeName: "Diseño de sistemas agénticos — Programa + sesión 1-a-1",
    stripeDescription:
      "Todo el programa + una sesión privada de 60 min sobre tu agente",
  },
} as const;
type TierId = keyof typeof TIERS;
const isTier = (t: unknown): t is TierId => t === "programa" || t === "tu-caso";

const MINUTES_TO_TEXT = (m: number | string | null) => {
  const n = Math.round(Number(m ?? 0));
  if (!n) return "";
  return n >= 60
    ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, "0")}`
    : `${n} min`;
};

/// Orden de los bloques en la landing. Coincide con `Video.moduleName`.
const MODULE_ORDER = [
  "Preparación",
  "Webinars",
  "Las sesiones",
  "ACP desde cero",
] as const;
const MODULE_BLURB: Record<string, string> = {
  Preparación:
    "Cuatro lecciones para llegar con el arnés entendido: el loop, la interfaz, el SDK y la memoria. Todo desde cero, en tu máquina.",
  Webinars:
    "Las tres sesiones abiertas con las que arrancó el programa. Son gratis con tu correo, y aquí quedan integradas al resto.",
  "Las sesiones":
    "El taller en vivo, completo: cinco sesiones de dos horas donde el agente sale de tu laptop y termina pidiéndote permiso por WhatsApp.",
  "ACP desde cero":
    "El protocolo por el que tu interfaz habla con el agente, trama por trama, con el cable grabado para leerlo.",
};
/// Piezas que todavía no están en la base pero ya tienen fecha
const UPCOMING: Record<
  string,
  { title: string; note: string; minutes: number; slugPrefix: string }[]
> = {
  "Las sesiones": [
    {
      title: "Sesión 5 · Refuerzo: evals y observabilidad",
      note: "Se graba el lunes 14 de septiembre y se sube al día siguiente",
      minutes: 120, // lo que dura una sesión; se sustituye por el real al subirla
      // En cuanto exista un video con este prefijo de slug, la entrada se retira
      // sola: nadie tiene que volver a editar esta lista.
      slugPrefix: "sesion-5",
    },
  ],
};

/// Lo que construyes, en el orden en que se construye
const BUILD_STEPS = [
  {
    n: "01",
    title: "Vive en una caja remota",
    text: "Sale de tu laptop a un sandbox de EasyBits que despierta cuando lo llamas y duerme cuando termina. Pagas por corrida, no por servidor.",
  },
  {
    n: "02",
    title: "Tiene interfaz propia",
    text: "ACP sobre WebSocket, un hook que escuchas tú, y una pantalla donde el chat y el artefacto crecen en paralelo. Cada tool call se ve.",
  },
  {
    n: "03",
    title: "Recuerda",
    text: "Cuatro tipos de memoria en tres almacenes. Matas la caja a media tarea y el agente revive justo donde iba.",
  },
  {
    n: "04",
    title: "Pide permiso",
    text: "Interrumpir, revisar, corregir y dejarlo seguir desde tu UI. Extensiones por MCP con su costo en el prompt medido.",
  },
  {
    n: "05",
    title: "Sale al mundo",
    text: "Contesta por WhatsApp, y tú sabes si sigue funcionando después de tocar un prompt: evals y observabilidad sobre lo que ya guardaste.",
  },
];

const INCLUDES_BASE = [
  "Todo el contenido en video, para siempre",
  "Repos con el código de cada pieza, tag por lección",
  "Slides y PDFs de cada sesión",
  "GhostyCode, nuestro agente de terminal open source, con el trial de EasyBits para las cajas y el modelo",
  "Comunidad en Ghosty Teams con el instructor y el grupo",
  "Factura fiscal si tu empresa lo paga",
];
const INCLUDES_TU_CASO = [
  "Sesión privada de 60 min sobre tu propio agente",
  "Revisión de tu repo antes de la sesión",
  "Las tools de tu dominio, diseñadas contigo",
];

/// Testimonios en video de quienes tomaron el taller. Se llenan conforme se
/// suban a Tigris (mismo CDN que VideoGaleria); mientras la lista está vacía la
/// sección muestra los espacios.
type Testimonial = {
  name: string;
  role: string;
  src: string;
  poster?: string;
  quote: string;
};
const TESTIMONIALS: Testimonial[] = [];

const FAQS = [
  {
    q: "¿Qué nivel necesito?",
    a: "Saber programar y haber construido producto: frontend, fullstack o diseño con código. No necesitas experiencia previa con agentes ni con IA — el arnés lo eliges ya hecho y arrancamos por meterlo en una caja remota. Si nunca has usado una terminal, este programa te va a quedar grande.",
  },
  {
    q: "¿Es en vivo o grabado?",
    a: "Ya está grabado completo: los webinars, las cinco sesiones del taller y las lecciones cortas. Lo ves a tu ritmo desde el visor de FixterGeek. La comunidad en Ghosty Teams sigue abierta y ahí se resuelven dudas.",
  },
  {
    q: "¿Qué herramientas usamos y cuánto cuestan aparte?",
    a: "El arnés lo eliges tú: GhostyCode (el nuestro, open source), Goose, OpenHands o Aider. Los cuatro caben en la caja. Para el código, TypeScript y React. Como modelo, DeepSeek v4 Pro a través de EasyBits: con el trial de tu cuenta alcanza para seguir el programa, y después pagas solo lo que uses. Los tokens incluidos fueron parte de la primera edición en vivo.",
  },
  {
    q: "¿Cómo funciona la sesión 1-a-1?",
    a: "Es del nivel «Programa + Tu caso». Cuando tengas tu agente corriendo me escribes por WhatsApp con el link a tu repo; lo reviso antes y agendamos 60 minutos a solas para adaptarlo a tu dominio: tus tools, tus datos, tu flujo.",
  },
  {
    q: "¿Esto es de algún framework en particular?",
    a: "Los conceptos son de diseño de sistemas y aplican con cualquier stack: el harness, la memoria, la ejecución durable y el human-in-the-loop existen igual en LangChain, en el SDK de Anthropic o en tu propio código. Usamos herramientas concretas para aterrizar, con los principios siempre por delante.",
  },
  {
    q: "¿Mi empresa puede pagarlo?",
    a: "Sí, emitimos factura fiscal. Muchos lo pasan como capacitación — escríbenos por WhatsApp y te mandamos la carta descriptiva para tu área de recursos humanos.",
  },
];

export const meta = ({
  data: loaderData,
}: {
  data?: { totals?: { hours: number; lessons: number } };
}) => {
  const hours = loaderData?.totals?.hours ?? 17;
  const baseMeta = getMetaTags({
    title: "Diseño de sistemas agénticos | Programa completo | FixterGeek",
    description: `Tu agente funciona en tu laptop y se rompe con usuarios reales. ${hours} horas de video, repos y materiales: la caja remota, la interfaz, la memoria y el permiso humano. Desde $${TIERS.programa.price.toLocaleString()} MXN.`,
    url: "https://www.fixtergeek.com/sistemas-agenticos",
    image: "https://www.fixtergeek.com/cover.png",
    keywords:
      "sistemas agénticos, agentes de ia, diseño de agentes, harness, context engineering, human in the loop, curso agentes español, curso agentes ia méxico, acp, mcp",
  });

  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": "https://www.fixtergeek.com/sistemas-agenticos#course",
        name: "Diseño de sistemas agénticos",
        description:
          "Programa on-demand sobre diseño de sistemas para agentes de IA: harness, sandbox remoto, interfaz por ACP, memoria, human-in-the-loop, MCP y evals.",
        url: "https://www.fixtergeek.com/sistemas-agenticos",
        provider: {
          "@type": "Organization",
          "@id": "https://www.fixtergeek.com/#organization",
          name: "FixterGeek",
          url: "https://www.fixtergeek.com",
          logo: "https://www.fixtergeek.com/logo.png",
        },
        instructor: {
          "@type": "Person",
          name: "Héctor Bliss",
          url: "https://www.linkedin.com/in/hectorbliss/",
          sameAs: ["https://github.com/blissito", "https://x.com/HectorBlisS"],
        },
        offers: [
          {
            "@type": "Offer",
            name: TIERS.programa.name,
            price: String(TIERS.programa.price),
            priceCurrency: "MXN",
            availability: "https://schema.org/InStock",
            url: "https://www.fixtergeek.com/sistemas-agenticos#precio",
          },
          {
            "@type": "Offer",
            name: TIERS["tu-caso"].name,
            price: String(TIERS["tu-caso"].price),
            priceCurrency: "MXN",
            availability: "https://schema.org/InStock",
            url: "https://www.fixtergeek.com/sistemas-agenticos#precio",
          },
        ],
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: `PT${hours}H`,
        },
        inLanguage: "es",
        coursePrerequisites:
          "Experiencia construyendo producto: frontend, fullstack o diseño con código",
        educationalLevel: "Intermediate",
        teaches: [
          "Arquitectura de harness para agentes",
          "Sandboxes remotos y ejecución on-demand",
          "Interfaz de agente por Agent Client Protocol",
          "Memoria y recuperación de fallos",
          "Human-in-the-loop y permisos",
          "Extensiones por MCP, evals y observabilidad",
        ],
      },
    ],
  };

  return [...baseMeta, { "script:ld+json": schemaOrg }];
};

/// Primera oración de la descripción, sin markdown: es lo que cabe en una fila
const firstSentence = (md: string | null) => {
  const line = (md ?? "")
    .split("\n")[0]
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return line.length > 150 ? `${line.slice(0, 147)}…` : line;
};

/**
 * Todo el contenido sale del programa, no de una lista escrita a mano: cada
 * pieza que se sube aparece aquí sola, con sus materiales y su duración. Las
 * constantes que tenía esta landing se quedaron viejas dos veces.
 */
export const loader = async () => {
  const { db } = await import("~/.server/db");
  const course = await db.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true },
  });
  const videos = await db.video.findMany({
    where: {
      // Por `courseIds` y no por `course.videoIds`: la sesión 1 se subió sin
      // apuntarla en la lista del curso y desaparecía de aquí en silencio.
      courseIds: { has: course?.id ?? "" },
      isPublic: true,
      m3u8: { not: null },
    },
    orderBy: { index: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      duration: true,
      description: true,
      moduleName: true,
      accessLevel: true,
      kind: true,
    },
  });
  const resources = await db.resource.findMany({
    where: { videoId: { in: videos.map((v) => v.id) } },
    select: { videoId: true, slug: true, title: true, kind: true },
  });

  const modules = MODULE_ORDER.map((name) => {
    const items = videos
      .filter((v) => v.moduleName === name)
      .map((v) => ({
        slug: v.slug,
        title: v.title,
        minutes: Number(v.duration ?? 0),
        blurb: firstSentence(v.description),
        free: v.accessLevel === "subscriber" || v.accessLevel === "public",
        materials: resources
          .filter((r) => r.videoId === v.id)
          .map((r) => ({ title: r.title, kind: r.kind, slug: r.slug })),
      }));
    const pending = (UPCOMING[name] ?? []).filter(
      (u) => !items.some((i) => i.slug.startsWith(u.slugPrefix)),
    );
    return {
      name,
      blurb: MODULE_BLURB[name] ?? "",
      // Lo que falta cuenta con su duración estimada: el programa se vende
      // completo y la hora total no puede bajar por una pieza en cola.
      minutes:
        items.reduce((n, i) => n + i.minutes, 0) +
        pending.reduce((n, u) => n + u.minutes, 0),
      items,
      upcoming: pending,
    };
  }).filter((m) => m.items.length > 0 || m.upcoming.length > 0);

  const minutes = modules.reduce((n, m) => n + m.minutes, 0);
  const totals = {
    hours: Math.round(minutes / 60),
    lessons: modules.reduce(
      (n, m) => n + m.items.length + m.upcoming.length,
      0,
    ),
    materials: resources.length,
  };
  return { modules, totals };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "direct_checkout") {
    const tierId = formData.get("tier");
    const tier = TIERS[isTier(tierId) ? tierId : "programa"];
    try {
      const stripe = new (await import("stripe")).default(
        process.env.STRIPE_SECRET_KEY as string,
        {},
      );
      const isDev = process.env.NODE_ENV === "development";
      const location = isDev
        ? "http://localhost:3000"
        : "https://www.fixtergeek.com";

      // El precio manda desde el Product: la landing puede quedarse vieja, el
      // cobro no.
      const { db } = await import("~/.server/db");
      const product = await db.product.findUnique({
        where: { key: tier.key },
        select: { priceMxn: true },
      });
      const priceMxn = product?.priceMxn ?? tier.price;

      const session = await stripe.checkout.sessions.create({
        metadata: {
          type: tier.key,
          courseSlug: COURSE_SLUG,
          tier: tierId as string,
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: tier.stripeName,
                description: tier.stripeDescription,
              },
              unit_amount: priceMxn * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/sistemas-agenticos?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/sistemas-agenticos?cancel=1`,
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
        payment_method_options: { card: { installments: { enabled: true } } },
      });

      if (!session.url) throw new Error("Failed to create checkout session");
      return redirect(session.url);
    } catch (error) {
      console.error("[sistemas-agenticos] checkout error:", error);
      return data({
        success: false,
        error: "Error al procesar el pago. Intenta nuevamente.",
      });
    }
  }

  return data({ success: false });
};
// Paso de instalación con bloque de código copiable
function InstallStep({
  step,
  title,
  command,
  note,
}: {
  step: string;
  title: string;
  command: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="rounded-2xl border border-sistemas-line bg-sistemas-dark p-5 sm:p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xl font-black text-sistemas-primary/50">
          {step}
        </span>
        <h3 className="font-bold text-zinc-100">{title}</h3>
      </div>
      <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl border border-sistemas-line bg-zinc-950/80">
        <pre className="flex-1 overflow-x-auto whitespace-pre px-4 py-3 font-mono text-xs text-sistemas-primary sm:text-sm">
          {command}
        </pre>
        <button
          onClick={copy}
          className="mr-2 shrink-0 rounded-lg border border-sistemas-line px-3 py-1.5 text-xs font-bold text-sistemas-gray transition hover:border-sistemas-primary hover:text-sistemas-primary"
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      {note && (
        <p className="mt-3 text-sm leading-relaxed text-sistemas-gray">
          {note}
        </p>
      )}
    </div>
  );
}

function CheckoutButton({
  fetcher,
  tier = "programa",
  label,
  variant = "primary",
  className = "",
}: {
  fetcher: ReturnType<typeof useFetcher>;
  tier?: TierId;
  label?: string;
  variant?: "primary" | "outline";
  className?: string;
}) {
  const isLoading =
    fetcher.state !== "idle" && fetcher.formData?.get("tier") === tier;
  const t = TIERS[tier];
  const styles =
    variant === "primary"
      ? "bg-sistemas-primary text-sistemas-dark hover:brightness-110"
      : "border border-sistemas-primary/50 bg-sistemas-primary/10 text-sistemas-primary hover:bg-sistemas-primary/20";
  return (
    <fetcher.Form method="post" className={className}>
      <input type="hidden" name="intent" value="direct_checkout" />
      <input type="hidden" name="tier" value={tier} />
      <motion.button
        type="submit"
        disabled={fetcher.state !== "idle"}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`h-14 w-full rounded-xl px-6 text-base font-bold transition disabled:opacity-60 sm:w-auto ${styles}`}
      >
        {isLoading
          ? "Procesando…"
          : `${label ?? t.name} — $${t.price.toLocaleString()} MXN`}
      </motion.button>
    </fetcher.Form>
  );
}

const MATERIAL_ICON: Record<string, string> = {
  repo: "⌥",
  slides: "▤",
  pdf: "▣",
  link: "↗",
};

export default function SistemasAgenticosLanding() {
  const { modules, totals } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showConfetti, setShowConfetti] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Todos abiertos de entrada: la sección existe para que se vea todo el
  // contenido, y un acordeón cerrado lo esconde.
  const [closedModules, setClosedModules] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
      window.history.replaceState({}, "", "/sistemas-agenticos");
    }
    if (params.get("cancel") === "1") {
      window.history.replaceState({}, "", "/sistemas-agenticos");
    }
  }, []);

  // Bajar al ancla al llegar con `#precio` o `#instalar` desde otra página:
  // el router cambia la URL sin recargar y nadie hace el scroll. Se reintenta
  // porque el canvas WebGL y las imágenes mueven el layout al montar.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const goToAnchor = () =>
      document.querySelector(hash)?.scrollIntoView({ block: "start" });
    goToAnchor();
    const retries = [80, 300, 800].map((ms) => setTimeout(goToAnchor, ms));
    return () => retries.forEach(clearTimeout);
  }, []);

  const stats = [
    [`${totals.hours} h`, "de video"],
    [String(totals.lessons), "lecciones"],
    [String(totals.materials), "materiales"],
    ["∞", "acceso de por vida"],
  ];

  return (
    <main className="relative overflow-hidden bg-sistemas-dark text-zinc-100">
      {showConfetti && <EmojiConfetti emojis={["📐", "🤖", "⚡"]} />}

      {/* grid de fondo con drift animado */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(#85DDCB 1px, transparent 1px), linear-gradient(90deg, #85DDCB 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 90% 55% at 50% 0%, black 20%, transparent 70%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "44px 44px"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-sistemas-primary/25 blur-[120px]"
        animate={{
          x: [0, 80, -30, 0],
          y: [0, 50, -40, 0],
          scale: [1, 1.2, 0.92, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-[30rem] h-[24rem] w-[24rem] rounded-full bg-brand-700/20 blur-[120px]"
        animate={{
          x: [0, -70, 40, 0],
          y: [0, -50, 40, 0],
          scale: [1, 0.88, 1.25, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* ============ HERO ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-28 lg:px-10 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-sistemas-primary/30 bg-sistemas-primary/10 px-5 py-2 text-sm font-medium text-sistemas-primary"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-sistemas-primary" />
          Programa completo · On-demand · Acceso inmediato
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.02] xl:text-[6.5rem]"
        >
          Diseño de{" "}
          <span className="text-sistemas-primary">sistemas agénticos</span>
        </motion.h1>

        <div className="mt-10 grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-xl text-lg leading-relaxed text-sistemas-gray sm:text-xl"
            >
              Tu agente funciona en tu laptop y se rompe con usuarios reales.
              Aquí construyes lo que falta en medio: la caja remota, la
              interfaz, la memoria, los permisos y tú en el loop.
            </motion.p>

            {/* Datos duros: salen de la base, no de un copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {stats.map(([n, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-sistemas-line bg-sistemas-surface px-4 py-3"
                >
                  <div className="text-2xl font-black text-sistemas-primary">
                    {n}
                  </div>
                  <div className="text-xs text-sistemas-gray">{label}</div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-4 text-sm font-medium text-sistemas-accent"
            >
              🎁 Incluye GhostyCode y el trial de EasyBits para arrancar
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <CheckoutButton
                  fetcher={fetcher}
                  tier="programa"
                  label="Quiero el programa"
                />
                <CheckoutButton
                  fetcher={fetcher}
                  tier="tu-caso"
                  label="Con sesión 1-a-1"
                  variant="outline"
                />
              </div>
              <p className="mt-3 text-sm text-sistemas-gray">
                3 y 6 meses sin intereses · Factura disponible ·{" "}
                <a
                  href="#contenido"
                  className="text-sistemas-primary underline underline-offset-4"
                >
                  Ver todo el contenido ↓
                </a>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-8 flex items-center gap-3"
            >
              <img
                src="https://i.imgur.com/TaDTihr.png"
                alt="Héctorbliss"
                className="h-10 w-10 rounded-full border border-sistemas-line object-cover"
              />
              <p className="text-sm text-sistemas-gray">
                Un programa de{" "}
                <a
                  href="https://www.hectorbliss.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 underline-offset-4 hover:text-sistemas-primary hover:underline"
                >
                  Héctorbliss
                </a>{" "}
                · 10 años enseñando, +2,000 estudiantes
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <HeroScene />
          </motion.div>
        </div>
      </section>

      {/* ============ QUÉ CONSTRUYES ============ */}
      <section className="relative z-10 border-t border-sistemas-line/60 bg-sistemas-surface/30">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sales con un agente completo,{" "}
              <span className="text-sistemas-primary">no con apuntes</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
              Un agente personal listo para usuarios reales. Se construye en
              este orden, y cada paso deja algo corriendo.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {BUILD_STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-xl border border-sistemas-line bg-sistemas-dark p-5"
              >
                <span className="font-mono text-xs text-sistemas-accent">
                  {s.n}
                </span>
                <h3 className="mt-2 font-bold text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sistemas-gray">
                  {s.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ EL PROBLEMA ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que se rompe con{" "}
            <span className="text-sistemas-primary">usuarios reales</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
            Una tarea de 40 minutos que muere en el paso 67 y toca empezar de
            cero. Un contexto que se desborda a media investigación. Un agente
            con permiso de mandar un correo que un día manda mil. Una interfaz
            que solo muestra un spinner mientras todo eso pasa. Los cuatro
            problemas se arreglan con diseño — checkpoints, manejo de contexto,
            guardrails, streaming — y esas son las piezas que construyes aquí.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              stat: "11%",
              text: "de las empresas tienen agentes corriendo en producción. El resto se quedó en el demo.",
            },
            {
              stat: "88%",
              text: "de los pilotos con agentes nunca llegan a usuarios reales.",
            },
            {
              stat: "500,000",
              text: "líneas de ingeniería rodean al modelo en Claude Code: contexto, tools, guardrails e interfaz.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.stat}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="rounded-2xl border border-sistemas-line bg-sistemas-surface/60 p-7"
            >
              <div className="text-4xl font-black text-sistemas-accent">
                {item.stat}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-sistemas-gray">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ CONTENIDO COMPLETO ============ */}
      <section
        id="contenido"
        className="relative z-10 scroll-mt-24 border-t border-sistemas-line/60 bg-sistemas-surface/30"
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Todo el contenido,{" "}
              <span className="text-sistemas-primary">pieza por pieza</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
              {totals.hours} horas de video en {modules.length} bloques, con el
              repo, las slides y el material de cada uno. Lo ves en el orden que
              quieras, para siempre.
            </p>
          </motion.div>

          <div className="space-y-4">
            {modules.map((m, index) => {
              const open = !closedModules.includes(m.name);
              return (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="overflow-hidden rounded-2xl border border-sistemas-line bg-sistemas-dark"
                >
                  <button
                    onClick={() =>
                      setClosedModules((c) =>
                        open ? [...c, m.name] : c.filter((n) => n !== m.name),
                      )
                    }
                    className="flex w-full items-start justify-between gap-4 p-6 text-left sm:p-8"
                  >
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-mono text-xs text-sistemas-accent">
                          bloque {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-xl font-bold text-zinc-100 sm:text-2xl">
                          {m.name}
                        </h3>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sistemas-gray">
                        {m.blurb}
                      </p>
                      <p className="mt-2 font-mono text-xs text-sistemas-gray">
                        {m.items.length + m.upcoming.length} piezas ·{" "}
                        {MINUTES_TO_TEXT(m.minutes)}
                      </p>
                    </div>
                    <span
                      className={`mt-1 shrink-0 text-xl text-sistemas-gray transition-transform ${open ? "rotate-45" : ""}`}
                    >
                      +
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <ul className="divide-y divide-sistemas-line border-t border-sistemas-line">
                          {m.items.map((item, i) => (
                            <li key={item.slug} className="px-6 py-4 sm:px-8">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-sistemas-primary/60">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <p className="font-semibold text-zinc-100">
                                      {item.title}
                                    </p>
                                    <span className="font-mono text-xs text-sistemas-gray">
                                      {MINUTES_TO_TEXT(item.minutes)}
                                    </span>
                                    {item.free && (
                                      <a
                                        href={`/cursos/${COURSE_SLUG}/${item.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full border border-sistemas-accent/40 bg-sistemas-accent/10 px-2 py-0.5 text-[11px] font-bold text-sistemas-accent hover:bg-sistemas-accent/20"
                                      >
                                        gratis ▶
                                      </a>
                                    )}
                                  </div>
                                  {item.blurb && (
                                    <p className="mt-1 text-sm leading-relaxed text-sistemas-gray">
                                      {item.blurb}
                                    </p>
                                  )}
                                  {item.materials.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {item.materials.map((r) => (
                                        <span
                                          key={r.slug}
                                          className="inline-flex items-center gap-1 rounded-md border border-sistemas-line bg-sistemas-surface px-2 py-0.5 text-[11px] text-zinc-300"
                                        >
                                          <span className="text-sistemas-primary">
                                            {MATERIAL_ICON[r.kind] ?? "•"}
                                          </span>
                                          {r.title}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                          {m.upcoming.map((u) => (
                            <li key={u.title} className="px-6 py-4 sm:px-8">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-amber-300/70">
                                  {String(m.items.length + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <p className="font-semibold text-zinc-100">
                                    {u.title}
                                  </p>
                                  <p className="mt-1 text-sm text-amber-300/80">
                                    {u.note}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Repos",
                "acp-agent-ui, acp-desde-cero y el código de cada entrega, con un tag por lección",
              ],
              [
                "Slides y PDFs",
                "Las diapositivas de cada webinar y sesión, y el PDF de las seis piezas",
              ],
              [
                "Comunidad",
                "Ghosty Teams, con el instructor y el grupo del taller",
              ],
              [
                "GhostyCode + EasyBits",
                "El agente de terminal open source y el trial de EasyBits para cajas y modelo",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-xl border border-sistemas-line bg-sistemas-dark p-5"
              >
                <h3 className="font-bold text-sistemas-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sistemas-gray">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VideoGaleria />

      {/* ============ PARA QUIÉN ============ */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Es para <span className="text-sistemas-primary">ti</span>?
          </h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-brand-500/25 bg-brand-500/5 p-8"
          >
            <h3 className="text-xl font-bold text-brand-500">Sí, si…</h3>
            <ul className="mt-5 space-y-3.5">
              {[
                "Vienes de frontend o fullstack y quieres la capa de sistemas que los agentes exigen",
                "Eres diseñador que programa y ves que casi nadie sabe diseñar la interfaz de un agente",
                "Ya conectaste un modelo a unas tools y sabes que eso todavía no es un producto",
                "Quieres construir con criterio propio, con principios que sobreviven al framework de moda",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 leading-relaxed text-zinc-300"
                >
                  <span className="mt-0.5 text-brand-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl border border-danger/25 bg-danger/5 p-8"
          >
            <h3 className="text-xl font-bold text-danger">Todavía no, si…</h3>
            <ul className="mt-5 space-y-3.5">
              {[
                "Estás aprendiendo a programar — este programa asume que ya construyes producto",
                "Buscas una introducción conceptual a la IA sin escribir código",
                "Quieres una herramienta no-code — aquí diseñamos el sistema, no arrastramos cajitas",
                "No vas a sentarte a escribir código: aquí todo se construye",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 leading-relaxed text-zinc-300"
                >
                  <span className="mt-0.5 text-danger">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-10 max-w-3xl text-center text-lg leading-relaxed text-sistemas-gray"
        >
          Los cursos gringos de agentes están llenos de gente de backend
          aprendiendo a hacer interfaces. Tú ya sabes hacer producto — te falta
          la capa de sistemas, y eso es lo que hay aquí, pieza por pieza.
        </motion.p>
      </section>

      {/* ============ TESTIMONIOS ============ */}
      <section
        id="testimonios"
        className="relative z-10 scroll-mt-24 border-t border-sistemas-line/60 bg-sistemas-surface/30"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Quienes ya lo{" "}
              <span className="text-sistemas-primary">tomaron</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
              La primera edición fue en vivo, en septiembre de 2026. Esto es lo
              que construyeron y cómo les fue.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.length > 0
              ? TESTIMONIALS.map((t, i) => (
                  <motion.figure
                    key={t.src}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.08 }}
                    className="overflow-hidden rounded-2xl border border-sistemas-line bg-sistemas-dark"
                  >
                    <video
                      src={t.src}
                      poster={t.poster}
                      controls
                      playsInline
                      preload="none"
                      className="aspect-[9/16] w-full bg-black object-cover sm:aspect-video"
                    />
                    <figcaption className="p-5">
                      <p className="text-sm leading-relaxed text-zinc-200">
                        «{t.quote}»
                      </p>
                      <p className="mt-3 text-sm font-semibold text-zinc-100">
                        {t.name}
                      </p>
                      <p className="text-xs text-sistemas-gray">{t.role}</p>
                    </figcaption>
                  </motion.figure>
                ))
              : [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-sistemas-line bg-sistemas-dark/60 p-6 text-center"
                  >
                    <p className="text-sm text-sistemas-gray">
                      <span className="block text-2xl">🎥</span>
                      Testimonio en video
                      <span className="block text-xs">se sube esta semana</span>
                    </p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ============ INSTALA GHOSTYCODE ============ */}
      <section
        id="instalar"
        className="relative z-10 mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-20 lg:px-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Prepara tu entorno en{" "}
            <span className="text-sistemas-primary">2 minutos</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
            El programa corre sobre GhostyCode, nuestro agente de código en
            terminal (open source). Los tokens del modelo y las sandboxes salen
            de tu cuenta de EasyBits.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <InstallStep
            step="01"
            title="Borra los ghostys viejos"
            command={"rm -f ~/.local/bin/ghosty\nrm -rf ~/.ghosty"}
            note="Si ya lo habías instalado en otro taller, esa versión arranca en lugar de la nueva. Confirma con which -a ghosty: no debe imprimir nada."
          />
          <InstallStep
            step="02"
            title="Instala GhostyCode"
            command="curl -fsSL https://formmy.app/ghosty/install.sh | sh"
            note="Binario precompilado — no necesitas Node ni Rust. También disponible con npm install -g ghostycode."
          />
          <InstallStep
            step="03"
            title="Conecta tu key de EasyBits"
            command="ghosty auth set --provider easybits --api-key TU_KEY"
            note="La key la creas en tu cuenta de EasyBits, en el panel de desarrollador. Queda guardada en tu configuración, así que sobrevive a cerrar la terminal."
          />
          <InstallStep
            step="04"
            title="Conecta las sandboxes"
            command={
              'ghosty mcp add easybits --url "https://www.easybits.cloud/api/mcp/sandbox"\nghosty mcp login easybits'
            }
            note="Son las cajas donde corre el agente. login abre el navegador y autorizas con tu cuenta."
          />
          <InstallStep
            step="05"
            title="Arranca"
            command="ghosty --yolo"
            note="Pídele algo y, si responde, ya estás listo para la primera lección. --yolo lo deja ejecutar sin pedirte permiso en cada paso; el idioma se cambia desde la configuración de Ghosty."
          />
        </motion.div>
      </section>

      {/* ============ INSTRUCTOR ============ */}
      <section className="relative z-10 overflow-hidden border-t border-sistemas-line/60 bg-sistemas-surface/30">
        {/* Fondo animado */}
        <div className="absolute inset-0 z-0">
          <LiquidEther
            colors={["#85DDCB", "#37AB93", "#186656"]}
            mouseForce={50}
            cursorSize={150}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.3}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.3}
            autoIntensity={1.5}
            takeoverDuration={0.1}
            autoResumeDelay={2000}
            autoRampDuration={0.3}
          />
        </div>
        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-5xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pointer-events-auto grid items-center gap-10 rounded-3xl border border-sistemas-line bg-sistemas-dark/90 p-8 backdrop-blur-sm sm:p-12 md:grid-cols-[1fr_auto]"
          >
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-sistemas-gray">
                Tu instructor
              </span>
              <h3 className="mt-2 text-3xl font-bold text-sistemas-primary">
                Héctor Bliss
              </h3>
              <p className="mt-4 leading-relaxed text-sistemas-gray">
                Llevo 10 años enseñando a programar. Últimamente me la paso
                construyendo agentes y viendo qué se rompe cuando ya están en
                manos de usuarios. Lo que sé lo aprendí ahí, y eso es lo que
                enseño en este programa.
              </p>
              <div className="mt-6 flex flex-wrap gap-6">
                {[
                  ["10", "años enseñando"],
                  ["2K+", "estudiantes"],
                  ["100%", "código real, sin slides de relleno"],
                ].map(([stat, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-black text-sistemas-accent">
                      {stat}
                    </div>
                    <div className="text-xs text-sistemas-gray">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <img
              src="/courses/titor.png"
              alt="Héctor Bliss"
              className="mx-auto w-56 rounded-2xl object-cover md:w-72"
            />
          </motion.div>
        </div>
      </section>

      {/* ============ PRECIO ============ */}
      <section
        id="precio"
        className="relative z-10 mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-20 lg:px-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Dos formas de <span className="text-sistemas-primary">entrar</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
            Las dos traen todo el contenido. La diferencia es si quieres una
            sesión a solas sobre tu propio agente.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Programa completo */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col rounded-3xl border border-sistemas-line bg-sistemas-surface/60 p-8 sm:p-10"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-sistemas-gray">
              {TIERS.programa.name}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black text-zinc-100">
                ${TIERS.programa.price.toLocaleString()}
              </span>
              <span className="text-lg text-sistemas-gray">MXN</span>
            </div>
            <p className="mt-2 text-sm text-sistemas-gray">
              {totals.hours} h de video · {totals.materials} materiales · acceso
              de por vida
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {INCLUDES_BASE.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300"
                >
                  <span className="mt-0.5 text-sistemas-primary">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CheckoutButton
                fetcher={fetcher}
                tier="programa"
                label="Quiero el programa"
                variant="outline"
                className="[&_button]:w-full"
              />
            </div>
          </motion.div>

          {/* Programa + Tu caso */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex flex-col rounded-3xl border-2 border-sistemas-primary/50 bg-sistemas-surface/80 p-8 sm:p-10"
          >
            <span className="absolute -top-3 left-8 rounded-full bg-sistemas-primary px-3 py-1 text-xs font-bold text-sistemas-dark">
              Con acompañamiento
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-sistemas-primary">
              {TIERS["tu-caso"].name}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black text-sistemas-primary">
                ${TIERS["tu-caso"].price.toLocaleString()}
              </span>
              <span className="text-lg text-sistemas-gray">MXN</span>
            </div>
            <p className="mt-2 text-sm text-sistemas-gray">
              Todo el programa + 60 min a solas sobre tu agente
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              <li className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300">
                <span className="mt-0.5 text-sistemas-primary">✓</span>
                Todo lo del programa completo
              </li>
              {INCLUDES_TU_CASO.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-zinc-100"
                >
                  <span className="mt-0.5 text-sistemas-accent">★</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CheckoutButton
                fetcher={fetcher}
                tier="tu-caso"
                label="Programa + Tu caso"
                className="[&_button]:w-full"
              />
            </div>
          </motion.div>
        </div>

        <p className="mt-6 text-center text-sm text-sistemas-gray">
          3 y 6 meses sin intereses con tarjetas participantes · Factura
          disponible · ¿Dudas?{" "}
          <a
            href="https://wa.me/527712412825"
            target="_blank"
            rel="noopener"
            className="text-sistemas-primary underline underline-offset-4"
          >
            WhatsApp <FaWhatsapp className="inline" />
          </a>
        </p>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative z-10 border-t border-sistemas-line/60 bg-sistemas-surface/30">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 lg:px-10">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Preguntas <span className="text-sistemas-primary">frecuentes</span>
          </motion.h2>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className="overflow-hidden rounded-xl border border-sistemas-line bg-sistemas-dark"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-zinc-100 transition hover:text-sistemas-primary"
                >
                  {faq.q}
                  <span
                    className={`ml-4 text-sistemas-gray transition-transform ${openFaq === i ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-sistemas-gray">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-24 text-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
            Los agentes ya llegaron.
            <br />
            <span className="text-sistemas-primary">
              Conviértete en agentic system thinker.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sistemas-gray">
            {totals.hours} horas de video, el código de cada pieza y el trial de
            EasyBits para construir el tuyo. Empiezas hoy mismo.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CheckoutButton
              fetcher={fetcher}
              tier="programa"
              label="Quiero el programa"
            />
            <CheckoutButton
              fetcher={fetcher}
              tier="tu-caso"
              label="Con sesión 1-a-1"
              variant="outline"
            />
          </div>

          <div className="mx-auto mt-12 max-w-md">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img
                src="https://i.imgur.com/TaDTihr.png"
                alt="Héctorbliss"
                className="h-9 w-9 rounded-full border border-sistemas-line object-cover"
              />
              <p className="text-left text-sm text-sistemas-gray">
                ¿Tienes dudas o quieres charlar conmigo de los detalles?
                <br />
                Escríbeme directo —{" "}
                <span className="text-zinc-200">Héctorbliss</span>
              </p>
            </div>
            <a
              href="https://wa.me/527712412825?text=Hola%20H%C3%A9ctorbliss%2C%20tengo%20dudas%20sobre%20el%20programa%20de%20Dise%C3%B1o%20de%20sistemas%20ag%C3%A9nticos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-sistemas-primary/40 bg-sistemas-primary/10 px-6 text-sm font-bold text-sistemas-primary transition hover:bg-sistemas-primary/20 sm:w-auto"
            >
              <FaWhatsapp className="text-lg" /> Mándame un WhatsApp
            </a>
          </div>
        </motion.div>
      </section>

      <SimpleFooter bgColor="bg-sistemas-dark" />
    </main>
  );
}
