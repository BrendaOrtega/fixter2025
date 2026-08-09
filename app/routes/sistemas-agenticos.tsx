import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import { FaWhatsapp } from "react-icons/fa";

// ===========================================
// Taller: Diseño de sistemas agénticos
// Cohorte en vivo · 4 sesiones de 2h · Precio de lanzamiento
// ===========================================
const PRICE = 2490; // MXN precio de lanzamiento
const PRICE_REGULAR = 3490; // MXN tachado
const COURSE_SLUG = "sistemas-agenticos";

const SESSIONS = [
  {
    number: "01",
    title: "El harness: anatomía de un agente",
    date: "Martes 8 de septiembre · 7:00 PM CDMX",
    intro:
      "Un agente es un modelo más todo lo que construyes alrededor de él. Claude Code lleva ~500,000 líneas de código y ninguna es el modelo: todas son harness. En esta sesión entiendes qué hay en esas líneas y construyes las tuyas.",
    topics: [
      "Agente = modelo + harness: system prompts, tools, skills, MCP y subagentes",
      "Patrones de arquitectura: ReAct, Plan-and-Execute y reflection — cuándo basta un solo agente",
      "Middleware y hooks: interceptar al modelo antes y después de cada llamada",
      "La curva confiabilidad vs. agencia y por qué se mueve cada mes",
    ],
    artifact: "Tu primer agente de investigación con tool calling, corriendo en tu máquina",
  },
  {
    number: "02",
    title: "Context engineering y memoria",
    date: "Martes 15 de septiembre · 7:00 PM CDMX",
    intro:
      "La ventana de contexto es el recurso más escaso del sistema. Aprendes a tratarla como lo que es: el sistema operativo del agente — qué entra, qué se resume, qué se va a disco y qué se delega.",
    topics: [
      "El filesystem como estado del arte en manejo de contexto: scratchpads, summarization y planning",
      "Diseño de tools: por qué un mal schema rompe al agente y cómo se ve uno bueno",
      "Memoria de corto plazo (checkpoints por sesión) y de largo plazo (insights que persisten)",
      "Subagentes: aislar contexto para que el agente principal no se contamine",
    ],
    artifact: "Un agente con memoria persistente entre sesiones y tools propias bien diseñadas",
  },
  {
    number: "03",
    title: "Producción: lo que rompe a los agentes",
    date: "Martes 22 de septiembre · 7:00 PM CDMX",
    intro:
      "La infraestructura estándar no está hecha para procesos que corren 40 minutos, fallan en el paso 67 de 123 y tocan APIs a nombre de tu usuario. Esta sesión cubre la capa que separa un demo de un sistema.",
    topics: [
      "Ejecución durable: checkpointing, resume desde el último paso bueno, recuperación de fallos",
      "Autenticación en 3 capas: inbound, outbound a terceros y RBAC — el problema de los 1,000 emails",
      "Human-in-the-loop: interrupciones, aprobaciones y guardrails que escalan a humano",
      "Costos y observabilidad: presupuesto por sesión, tracing y evals básicos",
    ],
    artifact: "Tu agente desplegado: sobrevive fallos, pide aprobación y no rebasa presupuesto",
  },
  {
    number: "04",
    title: "La interfaz del agente",
    date: "Martes 29 de septiembre · 7:00 PM CDMX",
    intro:
      "Casi nadie enseña esto y es donde tú tienes ventaja: un agente que corre minutos necesita una interfaz que muestre progreso, pida permiso y falle con gracia. Estudiamos los patrones agent-native de Builder.io y cómo los aplicamos en producción en Ghosty Teams y Tasks. Aquí tu experiencia en frontend y diseño vale oro.",
    topics: [
      "Streaming de progreso: qué mostrar mientras el agente trabaja y qué callar",
      "Patrones agent-native (Builder.io): humanizar cada tool call — ninguna acción del agente se esconde",
      "Caso real: el panel de turnos en vivo de Ghosty Teams — quién trabaja, en qué va, detener, qué entregó",
      "Aprobaciones en vivo desde la UI: el ciclo interrupt → review → resume en React",
    ],
    artifact: "El producto completo: tu agente con interfaz en React, streaming y aprobaciones",
  },
];

const INCLUDES = [
  "4 sesiones en vivo de 2 horas (8 horas totales), una por semana",
  "Grabaciones de todas las sesiones, para siempre",
  "El código completo de cada sesión en un repo privado",
  "Comunidad en Discord con el instructor y la cohorte",
  "Certificado de finalización",
  "Factura fiscal si tu empresa lo paga",
];

const FAQS = [
  {
    q: "¿Qué nivel necesito?",
    a: "Saber programar y haber construido producto: frontend, fullstack o diseño con código. No necesitas experiencia previa con agentes ni con IA — empezamos por la anatomía y terminamos en producción. Si nunca has usado una terminal, este taller te va a quedar grande.",
  },
  {
    q: "¿Qué herramientas usamos y cuánto cuestan aparte?",
    a: "TypeScript y React para el código, y las APIs de modelos (Anthropic u OpenAI). Necesitarás una API key propia; el gasto durante el taller ronda los $5–10 USD en llamadas al modelo. Todo lo demás es open source.",
  },
  {
    q: "¿Qué pasa si no puedo asistir a una sesión en vivo?",
    a: "Todas las sesiones se graban y quedan tuyas para siempre. Lo ideal es asistir en vivo para preguntar y trabajar el código en tiempo real, pero no pierdes nada del contenido.",
  },
  {
    q: "¿Esto es de algún framework en particular?",
    a: "Los conceptos son de diseño de sistemas y aplican con cualquier stack: el harness, la memoria, la ejecución durable y el human-in-the-loop existen igual en LangChain, en el SDK de Anthropic o en tu propio código. Usamos herramientas concretas para aterrizar, con los principios siempre por delante.",
  },
  {
    q: "¿Mi empresa puede pagarlo?",
    a: "Sí, emitimos factura fiscal. Muchos asistentes lo pasan como capacitación — escríbenos por WhatsApp y te mandamos la carta descriptiva para tu área de recursos humanos.",
  },
  {
    q: "¿Y si no me convence?",
    a: "Toma la primera sesión completa. Si no es para ti, te devolvemos el 100% sin preguntas.",
  },
];

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Diseño de sistemas agénticos | Taller en vivo | FixterGeek",
    description:
      "Tu agente funciona en tu laptop y se rompe con usuarios reales. Aprende lo que falta en medio: harness, memoria, ejecución durable, human-in-the-loop y la interfaz. 4 sesiones en vivo, $2,490 MXN.",
    url: "https://www.fixtergeek.com/sistemas-agenticos",
    image: "https://www.fixtergeek.com/cover.png",
    keywords:
      "sistemas agénticos, agentes de ia, diseño de agentes, harness, context engineering, human in the loop, taller agentes español, curso agentes ia méxico",
  });

  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": "https://www.fixtergeek.com/sistemas-agenticos#course",
        name: "Diseño de sistemas agénticos",
        description:
          "Taller en vivo sobre diseño de sistemas para agentes de IA: harness, context engineering, memoria, ejecución durable, autenticación, human-in-the-loop y diseño de la interfaz del agente.",
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
        offers: {
          "@type": "Offer",
          price: String(PRICE),
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url: "https://www.fixtergeek.com/sistemas-agenticos",
        },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: "PT8H",
          startDate: "2026-09-08",
          endDate: "2026-09-29",
        },
        inLanguage: "es",
        coursePrerequisites:
          "Experiencia construyendo producto: frontend, fullstack o diseño con código",
        educationalLevel: "Intermediate",
        teaches: [
          "Arquitectura de harness para agentes",
          "Context engineering y manejo de memoria",
          "Ejecución durable y recuperación de fallos",
          "Autenticación y guardrails para agentes",
          "Human-in-the-loop",
          "Diseño de interfaces para agentes",
        ],
      },
    ],
  };

  return [...baseMeta, { "script:ld+json": schemaOrg }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "direct_checkout") {
    try {
      const stripe = new (await import("stripe")).default(
        process.env.STRIPE_SECRET_KEY as string,
        {}
      );
      const isDev = process.env.NODE_ENV === "development";
      const location = isDev
        ? "http://localhost:3000"
        : "https://www.fixtergeek.com";

      const session = await stripe.checkout.sessions.create({
        metadata: {
          type: "sistemas-agenticos-workshop",
          courseSlug: COURSE_SLUG,
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: "Taller: Diseño de sistemas agénticos",
                description:
                  "4 sesiones en vivo · Septiembre 2026 · Grabaciones incluidas",
              },
              unit_amount: PRICE * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/sistemas-agenticos?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/sistemas-agenticos?cancel=1`,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
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

// ===========================================
// Diagrama de sistema animado (hero)
// Input → middleware → LLM ⇄ tools → Output
// ===========================================
function SystemDiagram() {
  const box =
    "rounded-lg border border-sistemas-line bg-sistemas-surface px-3 py-2 font-mono text-[11px] text-zinc-300 sm:text-xs";
  const chip =
    "rounded-md border border-sistemas-line bg-sistemas-dark px-2.5 py-1.5 font-mono text-[10px] text-sistemas-gray sm:text-[11px]";
  return (
    <div className="relative rounded-2xl border border-sistemas-line bg-sistemas-dark/80 p-6 shadow-2xl backdrop-blur sm:p-8">
      <div className="mb-5 flex items-center gap-2 border-b border-sistemas-line pb-4">
        <span className="h-3 w-3 rounded-full bg-danger/70" />
        <span className="h-3 w-3 rounded-full bg-sistemas-accent/70" />
        <span className="h-3 w-3 rounded-full bg-brand-500/70" />
        <span className="ml-2 font-mono text-xs text-sistemas-gray">
          el sistema que vas a diseñar
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* fila superior: input → middleware → LLM */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className={box}>input</div>
          <Arrow />
          <div className="flex flex-col gap-1.5">
            <div className={chip}>guardrail</div>
            <div className={chip}>planner</div>
            <div className={chip}>filesystem</div>
          </div>
          <Arrow />
          <motion.div
            className="rounded-xl border-2 border-sistemas-primary/60 bg-sistemas-primary/10 px-5 py-4 font-mono text-sm font-bold text-sistemas-primary"
            animate={{
              boxShadow: [
                "0 0 0px rgba(123,147,255,0)",
                "0 0 24px rgba(123,147,255,0.35)",
                "0 0 0px rgba(123,147,255,0)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            LLM
          </motion.div>
          <Arrow />
          <div className={box}>output</div>
        </div>

        {/* loop de tools */}
        <motion.div
          className="flex items-center gap-2 text-sistemas-gray"
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="font-mono text-lg">⇅</span>
          <span className="font-mono text-[10px] uppercase tracking-widest">
            tool loop
          </span>
          <span className="font-mono text-lg">⇅</span>
        </motion.div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {["websearch", "report", "subagents", "memoria", "human_approval"].map(
            (t) => (
              <div key={t} className={chip}>
                {t}
              </div>
            )
          )}
        </div>

        {/* capa de persistencia */}
        <div className="mt-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-sistemas-line px-4 py-2.5">
          <motion.span
            className="h-2 w-2 shrink-0 rounded-full bg-sistemas-accent"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="font-mono text-[10px] text-sistemas-gray sm:text-[11px]">
            checkpoints · si falla en el paso 67, resume desde el 66
          </span>
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <motion.span
      className="font-mono text-sistemas-gray"
      animate={{ x: [0, 3, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      →
    </motion.span>
  );
}

function CheckoutButton({
  fetcher,
  label = "Reservar mi lugar",
  className = "",
}: {
  fetcher: ReturnType<typeof useFetcher>;
  label?: string;
  className?: string;
}) {
  const isLoading = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" className={className}>
      <input type="hidden" name="intent" value="direct_checkout" />
      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="h-14 w-full rounded-xl bg-sistemas-primary px-8 text-base font-bold text-sistemas-dark transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {isLoading ? "Procesando…" : `${label} — $${PRICE.toLocaleString()} MXN`}
      </motion.button>
    </fetcher.Form>
  );
}

export default function SistemasAgenticosLanding() {
  const fetcher = useFetcher();
  const waitlistFetcher = useFetcher();
  const [showConfetti, setShowConfetti] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  return (
    <main className="relative overflow-hidden bg-sistemas-dark text-zinc-100">
      {showConfetti && <EmojiConfetti emojis={["📐", "🤖", "⚡"]} />}

      {/* grid de fondo tipo blueprint */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#7B93FF 1px, transparent 1px), linear-gradient(90deg, #7B93FF 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 90% 55% at 50% 0%, black 20%, transparent 70%)",
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
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sistemas-primary" />
          Nuevo taller en vivo · Cohorte de septiembre · Cupo limitado
        </motion.div>

        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              Diseño de{" "}
              <span className="text-sistemas-primary">sistemas agénticos</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-sistemas-gray sm:text-xl"
            >
              Tu agente funciona en tu laptop y se rompe con usuarios reales.
              Este taller cubre lo que falta en medio:{" "}
              <span className="text-zinc-100">el harness</span>,{" "}
              <span className="text-zinc-100">la memoria</span>,{" "}
              <span className="text-zinc-100">la ejecución durable</span> y una{" "}
              <span className="text-zinc-100">interfaz</span> que muestre lo que
              el agente hace — y pida permiso antes de hacerlo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3 text-sm text-sistemas-gray"
            >
              {[
                "4 sesiones en vivo · 8 horas",
                "Martes de septiembre · 7 PM CDMX",
                "TypeScript + React",
                "Grabaciones incluidas",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-sistemas-line bg-sistemas-surface px-4 py-1.5"
                >
                  {chip}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10"
            >
              <CheckoutButton fetcher={fetcher} />
              <p className="mt-3 text-sm text-sistemas-gray">
                Precio de lanzamiento —{" "}
                <s className="opacity-60">${PRICE_REGULAR.toLocaleString()}</s>{" "}
                <span className="text-sistemas-accent">
                  garantía: primera sesión o te devolvemos todo
                </span>
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
                Un taller de{" "}
                <a
                  href="https://www.hectorbliss.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 underline-offset-4 hover:text-sistemas-primary hover:underline"
                >
                  Héctorbliss
                </a>{" "}
                · +8 años enseñando, +2,000 estudiantes
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <SystemDiagram />
          </motion.div>
        </div>
      </section>

      {/* ============ EL PROBLEMA ============ */}
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
              Hacer el demo tomó una tarde.{" "}
              <span className="text-sistemas-primary">¿Y luego?</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
              Conectaste un modelo a unas tools y en dos horas tenías algo que
              parecía magia. Luego llegó el usuario real: la tarea corrió 40
              minutos, el contexto se desbordó, el agente alucinó en el paso 67 y
              hubo que empezar de cero. Nadie vio el progreso porque la UI era un
              spinner. Ese hueco entre el demo y el sistema tiene nombre: diseño
              de sistemas.
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
                text: "líneas de código tiene el harness de Claude Code. Ninguna es el modelo.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.stat}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-2xl border border-sistemas-line bg-sistemas-dark p-7"
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
        </div>
      </section>

      {/* ============ QUÉ VAS A CONSTRUIR ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sales con un sistema completo,{" "}
            <span className="text-sistemas-primary">no con apuntes</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
            A lo largo de las 4 sesiones construyes un agente de investigación
            production-ready: busca en la web, escribe reportes, recuerda a su
            usuario entre sesiones, sobrevive fallos a media tarea, pide
            aprobación humana antes de acciones sensibles y tiene una interfaz
            en React con streaming de progreso. Cada sesión termina con una
            pieza funcionando; la última las conecta todas.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SESSIONS.map((s, i) => (
            <motion.div
              key={s.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="rounded-xl border border-sistemas-line bg-sistemas-surface/60 p-5"
            >
              <span className="font-mono text-xs text-sistemas-accent">
                sesión {s.number}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {s.artifact}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ TEMARIO ============ */}
      <section className="relative z-10 border-t border-sistemas-line/60 bg-sistemas-surface/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              El temario, sesión por{" "}
              <span className="text-sistemas-primary">sesión</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
              4 martes seguidos, 2 horas cada uno, en vivo. Del harness a la
              interfaz.
            </p>
          </motion.div>

          <div className="space-y-6">
            {SESSIONS.map((session, index) => (
              <motion.div
                key={session.number}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border border-sistemas-line bg-sistemas-dark p-7 transition-colors hover:border-sistemas-primary/40 sm:p-9"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-2xl font-black text-sistemas-primary/50 transition-colors group-hover:text-sistemas-primary">
                      {session.number}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-100 sm:text-2xl">
                      {session.title}
                    </h3>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-sistemas-gray sm:text-sm">
                    {session.date}
                  </span>
                </div>

                <p className="mt-4 max-w-3xl leading-relaxed text-sistemas-gray">
                  {session.intro}
                </p>

                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {session.topics.map((topic) => (
                    <li
                      key={topic}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-300"
                    >
                      <span className="mt-0.5 text-sistemas-primary">▸</span>
                      {topic}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-sistemas-accent/25 bg-sistemas-accent/5 px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-sistemas-accent">
                    sales con
                  </span>
                  <span className="text-sm text-zinc-200">
                    {session.artifact}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
                "Estás aprendiendo a programar — este taller asume que ya construyes producto",
                "Buscas una introducción conceptual a la IA sin escribir código",
                "Quieres una herramienta no-code — aquí diseñamos el sistema, no arrastramos cajitas",
                "No tienes 2 horas a la semana para las sesiones más un rato para el código",
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
          la capa de sistemas, y eso se aprende en 4 sesiones bien dadas.
        </motion.p>
      </section>

      {/* ============ INSTRUCTOR ============ */}
      <section className="relative z-10 border-t border-sistemas-line/60 bg-sistemas-surface/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid items-center gap-10 rounded-3xl border border-sistemas-line bg-sistemas-dark p-8 sm:p-12 md:grid-cols-[1fr_auto]"
          >
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-sistemas-gray">
                Tu instructor
              </span>
              <h3 className="mt-2 text-3xl font-bold text-sistemas-primary">
                Héctor Bliss
              </h3>
              <p className="mt-4 leading-relaxed text-sistemas-gray">
                Lleva más de 8 años enseñando a programar y los últimos dos
                construyendo y desplegando agentes en producción: coaching por
                voz con speech-to-speech, automatización de WhatsApp, agentes con
                sandbox de código. Los sistemas de este taller son los mismos que
                mantiene corriendo con usuarios reales.
              </p>
              <div className="mt-6 flex flex-wrap gap-6">
                {[
                  ["8+", "años enseñando"],
                  ["2K+", "estudiantes"],
                  ["100%", "en vivo y práctico"],
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
              src="https://i.imgur.com/TaDTihr.png"
              alt="Héctor Bliss"
              className="mx-auto h-40 w-40 rounded-2xl border border-sistemas-line object-cover md:h-52 md:w-52"
            />
          </motion.div>
        </div>
      </section>

      {/* ============ PRECIO ============ */}
      <section
        id="precio"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 lg:px-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-3xl border-2 border-sistemas-primary/40 bg-sistemas-surface/60"
        >
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-12">
              <span className="rounded-full border border-sistemas-accent/40 bg-sistemas-accent/10 px-4 py-1.5 text-xs font-bold text-sistemas-accent">
                COHORTE DE SEPTIEMBRE · PRECIO DE LANZAMIENTO
              </span>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-5xl font-black text-sistemas-primary">
                  ${PRICE.toLocaleString()}
                </span>
                <span className="text-lg text-sistemas-gray">MXN</span>
                <s className="text-xl text-sistemas-gray/60">
                  ${PRICE_REGULAR.toLocaleString()}
                </s>
              </div>
              <p className="mt-2 text-sm text-sistemas-gray">
                Pago único · Factura disponible · Códigos de promoción aceptados
              </p>
              <div className="mt-8">
                <CheckoutButton fetcher={fetcher} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-sistemas-gray">
                <span className="text-sistemas-accent">Garantía:</span> toma la
                primera sesión completa y si no es para ti, te devolvemos el
                100%.
              </p>
              <p className="mt-4 text-sm text-sistemas-gray">
                ¿Dudas? Mándanos un{" "}
                <a
                  href="https://wa.me/527757609276"
                  className="text-sistemas-primary underline underline-offset-4"
                >
                  WhatsApp <FaWhatsapp className="inline" />
                </a>
              </p>
            </div>
            <div className="border-t border-sistemas-line bg-sistemas-dark/60 p-8 sm:p-12 md:border-l md:border-t-0">
              <h3 className="font-bold text-zinc-100">Incluye</h3>
              <ul className="mt-5 space-y-3.5">
                {INCLUDES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300"
                  >
                    <span className="mt-0.5 text-sistemas-primary">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
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
                    className={`ml-4 text-sistemas-gray transition-transform ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
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
              Los sistemas los diseña alguien.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sistemas-gray">
            Arrancamos el martes 8 de septiembre a las 7:00 PM (CDMX). El cupo
            es limitado porque las sesiones son en vivo y se trabaja el código
            de cada quien.
          </p>
          <div className="mt-10 flex justify-center">
            <CheckoutButton fetcher={fetcher} label="Quiero mi lugar" />
          </div>

          {/* Waitlist secundaria */}
          <div className="mx-auto mt-12 max-w-md">
            {waitlistFetcher.data?.success ? (
              <p className="rounded-xl border border-sistemas-primary/30 bg-sistemas-primary/10 px-5 py-4 text-sm text-sistemas-primary">
                ✓ Listo. Te avisamos de la próxima cohorte antes que a nadie.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-sistemas-gray">
                  ¿Esta cohorte no te acomoda? Te avisamos de la siguiente:
                </p>
                <waitlistFetcher.Form
                  method="post"
                  action="/api/waitlist"
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <input type="hidden" name="courseSlug" value={COURSE_SLUG} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="h-12 flex-1 rounded-xl border border-sistemas-line bg-sistemas-surface px-4 text-sm text-white outline-none transition focus:border-sistemas-primary"
                  />
                  <button
                    type="submit"
                    disabled={waitlistFetcher.state !== "idle"}
                    className="h-12 shrink-0 rounded-xl border border-sistemas-primary/40 bg-sistemas-primary/10 px-6 text-sm font-bold text-sistemas-primary transition hover:bg-sistemas-primary/20 disabled:opacity-60"
                  >
                    Avisarme
                  </button>
                </waitlistFetcher.Form>
              </>
            )}
          </div>
        </motion.div>
      </section>

      <SimpleFooter bgColor="bg-sistemas-dark" />
    </main>
  );
}
