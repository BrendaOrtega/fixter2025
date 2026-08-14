import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import VideoGaleria from "~/components/sistemas/VideoGaleria";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import { FaWhatsapp } from "react-icons/fa";
import {
  WEBINAR_SLOTS,
  WEBINAR_SUBTITLE,
  WEBINAR_TITLE,
  getWebinarSlot,
  proximoWebinar,
} from "~/utils/webinarDates";

// Secuencias de recordatorio por fecha (scripts/create-webinar-sequences.ts)
const WEBINAR_SEQUENCES: Record<string, string> = {
  "2026-08-13": "6a790a151d99ed94a4258d63",
  "2026-08-20": "6a790a151d99ed94a4258d67",
  "2026-08-27": "6a790a151d99ed94a4258d6b",
};

// ===========================================
// Taller: Diseño de sistemas agénticos
// Primera edición · 4 sesiones en vivo de 2h · Septiembre 2026
// ===========================================
const PRICE = 2490; // MXN precio de lanzamiento
const PRICE_REGULAR = 3490; // MXN tachado
const COURSE_SLUG = "sistemas-agenticos";
// Grabación del webinar del 13-ago-2026, publicada como video del curso.
// El slug viaja en la URL del viewer: una vez repartido el enlace, no cambia.
const WEBINAR_RECORDING_SLUG = "primer-webinar-anatomia-de-un-sistema-agentico";

const SESSIONS = [
  {
    number: "01",
    title: "El harness: anatomía de un agente",
    date: "Martes 1 de septiembre · 8:00 PM CDMX",
    intro:
      "Un agente es un modelo más todo lo que construyes alrededor de él. Claude Code lleva ~500,000 líneas de código y ninguna es el modelo: todas son harness. En esta sesión entiendes qué hay en esas líneas y construyes las tuyas.",
    topics: [
      "Agente = modelo + harness: system prompts, tools, skills, MCP y subagentes",
      "Patrones de arquitectura: ReAct, Plan-and-Execute y reflection — cuándo basta un solo agente",
      "Middleware y hooks: interceptar al modelo antes y después de cada llamada",
      "La curva confiabilidad vs. agencia y por qué se mueve cada mes",
    ],
    artifact:
      "Tu agente personal con sus primeras tools, respondiendo en la UI inicial que te damos",
  },
  {
    number: "02",
    title: "Context engineering y memoria",
    date: "Jueves 3 de septiembre · 8:00 PM CDMX",
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
    date: "Martes 8 de septiembre · 8:00 PM CDMX",
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
    date: "Jueves 10 de septiembre · 8:00 PM CDMX",
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
  "4 sesiones en vivo de 2 horas (8 horas totales) en 2 semanas intensivas: martes y jueves",
  "La UI inicial de tu agente, lista desde la primera sesión",
  "Secuencia de preparación: 5 entregas con video, una cada 2 días, antes de empezar",
  "Grabaciones de todas las sesiones, para siempre",
  "El código completo de cada sesión en un repo privado",
  "Comunidad en Ghosty Teams con el instructor y el grupo",
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
    a: "TypeScript y React para el código, y DeepSeek v4 Pro como modelo — con los tokens incluidos: te damos una API key de EasyBits con crédito de sobra para construir el agente completo del curso, así que no pagas ninguna API aparte. La misma key funciona en GhostyCode, nuestro agente de terminal open source. Todo lo demás también es open source.",
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
    q: "¿Cuándo son las sesiones?",
    a: "Martes 1, jueves 3, martes 8 y jueves 10 de septiembre de 2026, de 8:00 a 10:00 PM (CDMX). 2 semanas intensivas. Todas se graban, así que si un día no puedes, no pierdes nada.",
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
          startDate: "2026-09-01",
          endDate: "2026-09-10",
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

  // Registro al webinar gratuito de venta (13, 20 o 27 de agosto)
  if (intent === "webinar_registration") {
    const email = String(formData.get("email") || "")
      .toLowerCase()
      .trim();
    const name = String(formData.get("name") || "").trim();
    const slot = getWebinarSlot(String(formData.get("webinarDate") || ""));

    if (!email.includes("@")) {
      return data({ error: "Necesitamos un correo válido" });
    }
    if (!slot) {
      return data({ error: "Elige una fecha para el webinar" });
    }

    try {
      const { db } = await import("~/.server/db");
      const { checkSignupEmail } = await import("~/.server/anti-bot");
      // Anti-bot: finge éxito para no darle señal al bot
      if (checkSignupEmail(email).blocked) {
        return data({ success: true, type: "webinar", slotId: slot.id });
      }

      const tags = ["webinar-sistemas-agenticos", `webinar-${slot.id}`];
      const existing = await db.subscriber.findUnique({ where: { email } });
      const subscriber = existing
        ? await db.subscriber.update({
            where: { email },
            data: {
              name: name || existing.name || undefined,
              tags: {
                push: tags.filter((t) => !(existing.tags || []).includes(t)),
              },
            },
          })
        : await db.subscriber.create({
            data: { email, name: name || undefined, confirmed: true, tags },
          });

      // Recordatorios: si ya pasó el "día anterior", arranca más adelante para
      // no mandar un "mañana nos vemos" el mismo día del webinar.
      const { enrollSubscriberInSequence } = await import("~/.server/sequences");
      const webinarStart = new Date(`${slot.id}T20:00:00-06:00`).getTime();
      const now = Date.now();
      const startAtIndex =
        now > webinarStart ? 2 : now > webinarStart - 20 * 60 * 60 * 1000 ? 1 : 0;

      try {
        await enrollSubscriberInSequence(
          WEBINAR_SEQUENCES[slot.id],
          subscriber.id,
          { startAtIndex }
        );
      } catch (error) {
        console.error("[webinar] error al inscribir a recordatorios:", error);
      }

      try {
        const { sendSistemasWebinarConfirmation } = await import(
          "~/mailSenders/sendSistemasWebinarConfirmation"
        );
        await sendSistemasWebinarConfirmation({
          to: email,
          userName: name || subscriber.name,
          slot,
        });
      } catch (error) {
        console.error("[webinar] error al enviar confirmación:", error);
      }

      return data({ success: true, type: "webinar", slotId: slot.id });
    } catch (error) {
      console.error("[webinar] error en registro:", error);
      return data({ error: "Algo falló al registrarte. Intenta de nuevo." });
    }
  }

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

      // Cupón de primera edición: el checkout muestra $3,490 tachado → $2,490
      const COUPON_ID = "primera-edicion-sistemas";
      try {
        await stripe.coupons.create({
          id: COUPON_ID,
          amount_off: (PRICE_REGULAR - PRICE) * 100,
          currency: "mxn",
          duration: "once",
          name: "Primera edición",
        });
      } catch (e: any) {
        if (e?.code !== "resource_already_exists") throw e;
      }

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
              unit_amount: PRICE_REGULAR * 100,
            },
            quantity: 1,
          },
        ],
        discounts: [{ coupon: COUPON_ID }],
        success_url: `${location}/sistemas-agenticos?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/sistemas-agenticos?cancel=1`,
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
        payment_method_options: {
          card: { installments: { enabled: true } },
        },
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
// Traza de un agente en vivo (hero): se tipea
// a mano → pausa → se borra rapidísimo → reinicia
// ===========================================
const TRACE_TOKENS: { t: string; c: string }[] = [
  { t: "$ ", c: "text-sistemas-primary" },
  {
    t: 'mi-agente "investiga a la competencia\n            y arma un reporte"\n\n',
    c: "text-zinc-100",
  },
  { t: "⏺ ", c: "text-sistemas-primary" },
  { t: "plan escrito → plan.md (3 pasos)\n", c: "" },
  { t: "⏺ ", c: "text-sistemas-primary" },
  { t: 'tool: web_search("competencia saas mx")\n', c: "" },
  { t: "⏺ ", c: "text-sistemas-primary" },
  { t: "tool: fetch → 12 páginas leídas\n", c: "" },
  { t: "⚠ contexto al 91% → resumen a disco\n", c: "text-amber-300" },
  { t: "⏺ ", c: "text-sistemas-primary" },
  { t: "checkpoint #67 guardado\n", c: "" },
  { t: "⏸ interrupt(): ¿envío el reporte por correo?\n", c: "text-amber-300" },
  { t: "✓ aprobado por el humano → resume\n", c: "text-sistemas-accent" },
  { t: "⏺ ", c: "text-sistemas-primary" },
  { t: "reporte.pdf → streaming a la UI\n\n", c: "" },
  {
    t: "// checkpoints, contexto, aprobación humana y una\n// UI que muestra todo: eso es un sistema agéntico",
    c: "text-zinc-600",
  },
];

function AgentTrace() {
  const total = TRACE_TOKENS.reduce((n, t) => n + t.t.length, 0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (count < total) id = setTimeout(() => setCount((c) => c + 1), 18);
      else id = setTimeout(() => setPhase("deleting"), 3200);
    } else {
      if (count > 0) id = setTimeout(() => setCount((c) => c - 1), 4);
      else id = setTimeout(() => setPhase("typing"), 150);
    }
    return () => clearTimeout(id);
  }, [count, phase, total]);

  let remaining = count;
  const out: ReactNode[] = [];
  for (let i = 0; i < TRACE_TOKENS.length && remaining > 0; i++) {
    out.push(
      <span key={i} className={TRACE_TOKENS[i].c || "text-zinc-300"}>
        {TRACE_TOKENS[i].t.slice(0, remaining)}
      </span>
    );
    remaining -= TRACE_TOKENS[i].t.length;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sistemas-line bg-zinc-950/80 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-sistemas-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-danger/70" />
        <span className="h-3 w-3 rounded-full bg-amber-300/70" />
        <span className="h-3 w-3 rounded-full bg-sistemas-primary/70" />
        <span className="ml-2 font-mono text-sm text-sistemas-gray">
          tu agente personal, corriendo en producción
        </span>
      </div>
      <pre className="min-h-[21rem] overflow-hidden whitespace-pre-wrap p-6 font-mono text-xs leading-relaxed lg:min-h-[23rem] lg:text-sm">
        {out}
        <span
          className="ml-px inline-block w-[7px] animate-pulse bg-sistemas-primary align-middle"
          style={{ height: "1.05em" }}
        />
      </pre>
    </div>
  );
}

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
        <p className="mt-3 text-sm leading-relaxed text-sistemas-gray">{note}</p>
      )}
    </div>
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

// Registro al webinar gratuito — visible (no modal) para que el anuncio de
// Meta pueda apuntar directo a /sistemas-agenticos#webinar
function WebinarSection() {
  const webinarFetcher = useFetcher<{
    success?: boolean;
    error?: string;
    slotId?: string;
  }>();
  const isLoading = webinarFetcher.state !== "idle";
  const done = webinarFetcher.data?.success;
  const confirmedSlot = getWebinarSlot(webinarFetcher.data?.slotId);

  return (
    <section
      id="webinar"
      className="relative z-10 scroll-mt-24 border-y border-sistemas-line/60 bg-sistemas-surface/40"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2.5 rounded-full border border-sistemas-accent/40 bg-sistemas-accent/10 px-4 py-1.5 text-sm font-bold text-sistemas-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sistemas-accent" />
            Webinar gratuito · 45 min + Q&amp;A
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Prefieres verlo antes?{" "}
            <span className="text-sistemas-primary">{WEBINAR_TITLE}</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
            {WEBINAR_SUBTITLE}. Desarmamos en vivo las seis piezas que separan
            un agente que funciona en una demo de uno que aguanta usuarios
            reales, con sistemas nuestros que hoy corren en producción por
            dentro. Tres demos sobre un mismo agente y Q&amp;A al final.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "La ecuación: agente = modelo + harness (y por qué el harness es tuyo)",
              "Contexto, ejecución durable, memoria y autenticación",
              "La interfaz: la única pieza que el usuario ve",
              "🎁 Al minuto 30, el PDF de las seis piezas — gratis, compres o no",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-zinc-300"
              >
                <span className="mt-0.5 text-sistemas-accent">▸</span>
                {item}
              </li>
            ))}
          </ul>

          {/* El primero ya pasó y quedó grabado. Va aquí, junto al formulario
              de los que faltan: quien llega tarde no se queda sin nada. */}
          <a
            href={`/cursos/sistemas-agenticos/viewer?videoSlug=${WEBINAR_RECORDING_SLUG}`}
            className="group mt-8 flex items-center gap-4 rounded-2xl border border-sistemas-primary/40 bg-sistemas-primary/5 p-5 transition hover:border-sistemas-primary hover:bg-sistemas-primary/10"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sistemas-primary/20 text-xl text-sistemas-primary transition group-hover:bg-sistemas-primary/30">
              ▶
            </span>
            <span>
              <span className="block text-sm font-bold text-zinc-100">
                ¿Te perdiste el primero? Míralo completo
              </span>
              <span className="mt-0.5 block text-sm text-sistemas-gray">
                «Anatomía de un sistema agéntico» · 1h15 sin editar · gratis,
                solo pide tu correo
              </span>
            </span>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl border border-sistemas-line bg-sistemas-dark p-7 sm:p-8"
        >
          {done ? (
            <div className="text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-4 text-xl font-bold text-zinc-100">
                Tu lugar está apartado
              </h3>
              <p className="mt-3 leading-relaxed text-sistemas-gray">
                {confirmedSlot
                  ? `Nos vemos el ${confirmedSlot.short}.`
                  : "Nos vemos pronto."}{" "}
                Te mandé un correo con el link de la sala y te recordaré antes
                de que empiece.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-zinc-100">
                Aparta tu lugar
              </h3>
              <p className="mt-1.5 text-sm text-sistemas-gray">
                Gratis. Solo necesito saber a dónde mandarte el link.
              </p>
              <webinarFetcher.Form method="post" className="mt-5 space-y-3">
                <input
                  type="hidden"
                  name="intent"
                  value="webinar_registration"
                />
                <input
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  className="h-12 w-full rounded-xl border border-sistemas-line bg-sistemas-surface px-4 text-sm text-white outline-none transition focus:border-sistemas-primary"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="h-12 w-full rounded-xl border border-sistemas-line bg-sistemas-surface px-4 text-sm text-white outline-none transition focus:border-sistemas-primary"
                />
                <select
                  name="webinarDate"
                  required
                  defaultValue={WEBINAR_SLOTS[0].id}
                  className="h-12 w-full rounded-xl border border-sistemas-line bg-sistemas-surface px-4 text-sm text-white outline-none transition focus:border-sistemas-primary"
                >
                  {WEBINAR_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.short}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl bg-sistemas-accent px-6 text-sm font-bold text-sistemas-dark transition hover:brightness-110 disabled:opacity-60"
                >
                  {isLoading ? "Apartando…" : "Apartar mi lugar gratis"}
                </button>
                {webinarFetcher.data?.error && (
                  <p className="text-xs text-danger">
                    {webinarFetcher.data.error}
                  </p>
                )}
                <p className="text-center text-xs text-sistemas-gray">
                  Sin costo · Te aviso antes de que empiece · Nada de spam
                </p>
              </webinarFetcher.Form>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default function SistemasAgenticosLanding() {
  const fetcher = useFetcher();
  // El siguiente webinar que no ha pasado. `undefined` cuando ya se dieron los tres.
  const proximo = proximoWebinar();
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
      {/* blobs de glow flotando */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-sistemas-primary/25 blur-[120px]"
        animate={{ x: [0, 80, -30, 0], y: [0, 50, -40, 0], scale: [1, 1.2, 0.92, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-[30rem] h-[24rem] w-[24rem] rounded-full bg-brand-700/20 blur-[120px]"
        animate={{ x: [0, -70, 40, 0], y: [0, -50, 40, 0], scale: [1, 0.88, 1.25, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
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
          Nuevo taller en vivo · Primera edición · Septiembre 2026
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
                "Del 1 al 10 de septiembre · 8 PM CDMX",
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
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-6 inline-block rounded-2xl border border-sistemas-accent/40 bg-sistemas-accent/10 px-4 py-2.5 text-sm font-semibold leading-relaxed text-sistemas-accent"
            >
              <span className="block">
                🎁 Incluye agente de código (GhostyCode)
              </span>
              <span className="block">
                + todos los tokens de DeepSeek v4 Pro que vas a necesitar
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8"
            >
              <CheckoutButton fetcher={fetcher} />
              <p className="mt-3 text-sm text-sistemas-gray">
                <span className="text-sistemas-accent">
                  Precio de primera edición
                </span>{" "}
                — <s className="opacity-60">${PRICE_REGULAR.toLocaleString()}</s>{" "}
                en siguientes ediciones
              </p>
              {/* La fecha sale de los datos: escrita a mano seguía invitando al webinar
                  del 13 al día siguiente de darlo. Y si ya pasaron todos, se ofrece la
                  grabación en vez de un enlace a nada. */}
              <p className="mt-4 text-sm text-sistemas-gray">
                {proximo ? (
                  <>
                    ¿Prefieres verlo antes?{" "}
                    <a
                      href="#webinar"
                      className="font-semibold text-sistemas-accent underline underline-offset-4 hover:brightness-110"
                    >
                      Webinar gratis el {proximo.short.split(" ·")[0].toLowerCase()} →
                    </a>
                  </>
                ) : (
                  <>
                    ¿Prefieres verlo antes?{" "}
                    <a
                      href={`/cursos/sistemas-agenticos/viewer?videoSlug=${WEBINAR_RECORDING_SLUG}`}
                      className="font-semibold text-sistemas-accent underline underline-offset-4 hover:brightness-110"
                    >
                      Mira el webinar completo, gratis →
                    </a>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-sistemas-gray/70">
                Y el primero ya está grabado:{" "}
                <a
                  href={`/cursos/sistemas-agenticos/viewer?videoSlug=${WEBINAR_RECORDING_SLUG}`}
                  className="underline underline-offset-2 hover:text-sistemas-accent"
                >
                  «Anatomía de un sistema agéntico», 1h15
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
                Un taller de{" "}
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
            <AgentTrace />
          </motion.div>
        </div>
      </section>

      {/* ============ QUÉ VAS A CONSTRUIR ============ */}
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
              Sales con un sistema completo,{" "}
              <span className="text-sistemas-primary">no con apuntes</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
              A lo largo de las 4 sesiones construyes tu agente personal
              production-ready: investiga en la web, redacta reportes, recuerda
              tus preferencias entre sesiones, sobrevive fallos a media tarea y
              te pide aprobación antes de acciones sensibles. Desde la primera
              sesión trabajas sobre una UI inicial que te damos — tu agente se
              ve y se usa como producto desde el arranque. Ahí le das sus
              primeras tools; en la 2, memoria; en la 3 lo despliegas con
              checkpoints y aprobaciones; en la 4 vuelves esa UI agent-native:
              streaming, estados y aprobaciones en vivo. Te llevas el repo completo,
              corriendo con los tokens de DeepSeek que van incluidos.
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
                className="rounded-xl border border-sistemas-line bg-sistemas-dark p-5"
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
            guardrails, streaming — y esas son exactamente las piezas que
            construyes en este taller.
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

      {/* ============ WEBINAR GRATUITO ============ */}
      <WebinarSection />

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
              2 semanas intensivas: martes y jueves, 2 horas en vivo cada
              sesión. Del harness a la interfaz.
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
            El taller corre sobre GhostyCode, nuestro agente de código en
            terminal (open source). La key con tus tokens te la regalamos al
            inscribirte.
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
            title="Instala GhostyCode"
            command="curl -fsSL https://formmy.app/ghosty/install.sh | sh"
            note="Binario precompilado — no necesitas Node ni Rust. También disponible con npm install -g ghostycode."
          />
          <InstallStep
            step="02"
            title="Conecta tu key de EasyBits"
            command="ghosty auth set --provider easybits --api-key TU_KEY"
            note="La key te llega por correo al inscribirte, cargada con todos los tokens de DeepSeek v4 Pro del taller. La misma sirve para el modelo y las tools."
          />
          <InstallStep
            step="03"
            title="Verifica y arranca"
            command="ghosty doctor"
            note="Si sale en verde, corre `ghosty` y pídele algo. Ya estás listo para la sesión 1."
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
                Lleva 10 años enseñando a programar y los últimos dos
                construyendo y desplegando agentes en producción: coaching por
                voz con speech-to-speech, automatización de WhatsApp, agentes con
                sandbox de código. Los sistemas de este taller son los mismos que
                mantiene corriendo con usuarios reales.
              </p>
              <div className="mt-6 flex flex-wrap gap-6">
                {[
                  ["10", "años enseñando"],
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
                PRIMERA EDICIÓN · SEPTIEMBRE 2026
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
                3 y 6 meses sin intereses con tarjetas participantes · Factura
                disponible · Descuento de primera edición aplicado
                automáticamente
              </p>
              <div className="mt-8">
                <CheckoutButton fetcher={fetcher} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-sistemas-gray">
                Precio exclusivo de la primera edición — en siguientes
                ediciones sube a ${PRICE_REGULAR.toLocaleString()}.
              </p>
              <p className="mt-4 text-sm text-sistemas-gray">
                ¿Dudas? Mándanos un{" "}
                <a
                  href="https://wa.me/527712412825"
                  className="text-sistemas-primary underline underline-offset-4"
                >
                  WhatsApp <FaWhatsapp className="inline" />
                </a>
              </p>
            </div>
            <div className="border-t border-sistemas-line bg-sistemas-dark/60 p-8 sm:p-12 md:border-l md:border-t-0">
              <h3 className="font-bold text-zinc-100">Incluye</h3>
              <div className="mt-4 rounded-xl border border-sistemas-accent/40 bg-sistemas-accent/10 px-4 py-3.5">
                <p className="text-sm font-semibold leading-relaxed text-sistemas-accent">
                  🎁 GhostyCode, nuestro agente de código en terminal, con todos
                  los tokens de DeepSeek v4 Pro que vas a necesitar — sin pagar
                  API aparte
                </p>
              </div>
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
              Conviértete en agentic system thinker.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sistemas-gray">
            Arrancamos el martes 1 de septiembre a las 8:00 PM (CDMX). El cupo
            es limitado porque las sesiones son en vivo y se trabaja el código
            de cada quien.
          </p>
          <div className="mt-10 flex justify-center">
            <CheckoutButton fetcher={fetcher} label="Quiero mi lugar" />
          </div>

          {/* Contacto directo con el instructor */}
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
              href="https://wa.me/527712412825?text=Hola%20H%C3%A9ctorbliss%2C%20tengo%20dudas%20sobre%20el%20taller%20de%20Dise%C3%B1o%20de%20sistemas%20ag%C3%A9nticos"
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
