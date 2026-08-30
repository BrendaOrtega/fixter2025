import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher, useLoaderData } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import getMetaTags from "~/utils/getMetaTags";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import SimpleFooter from "~/components/common/SimpleFooter";
import VideoGaleria from "~/components/sistemas/VideoGaleria";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import { FaWhatsapp } from "react-icons/fa";
import {
  getWebinarSlot,
  proximoWebinar,
  webinarsDisponibles,
} from "~/utils/webinarDates";

// Secuencias de recordatorio por fecha (scripts/create-webinar-sequences.ts)
const WEBINAR_SEQUENCES: Record<string, string> = {
  "2026-08-13": "6a790a151d99ed94a4258d63",
  "2026-08-20": "6a790a151d99ed94a4258d67",
  "2026-08-27": "6a790a151d99ed94a4258d6b",
};

// ===========================================
// Taller: Diseño de sistemas agénticos
// Primera edición · 5 sesiones en vivo de 2h + 1 sesión personal · Septiembre 2026
// ===========================================
const PRICE = 2490; // MXN precio de lanzamiento
const PRICE_REGULAR = 3490; // MXN tachado
const COURSE_SLUG = "sistemas-agenticos";
const MINUTOS_A_TEXTO = (m: string | null) => {
  const n = Number(m ?? 0);
  if (!n) return "";
  return n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, "0")}` : `${n} min`;
};

const SESSIONS = [
  {
    number: "01",
    title: "La caja",
    date: "Martes 1 de septiembre · 8:00 PM CDMX",
    intro:
      "Empezamos donde ya estás: el agente corriendo en tu laptop. Lo abrimos, vemos qué trae y qué tools tiene, y en la misma sesión lo mandamos a un sandbox remoto. Ahí es donde deja de ser un juguete local y empieza a comportarse como infraestructura.",
    topics: [
      "Conocemos al agente en tu máquina: qué trae de fábrica y qué tools ya tiene",
      "Lo metemos en un sandbox remoto de EasyBits",
      "Correr on-demand y dormir: por qué no pagas por un servidor prendido todo el día",
      "Cuánto cuesta de verdad una corrida, con números de tu propio agente",
    ],
    artifact: "Tu agente viviendo fuera de tu compu, despertando cuando lo llamas",
  },
  {
    number: "02",
    title: "La interfaz",
    date: "Jueves 3 de septiembre · 8:00 PM CDMX",
    intro:
      "Un agente sin interfaz es un proceso que no puedes ver. Escribimos juntos la capa que lo vuelve producto: el protocolo por el que habla, el hook que lo escucha y la pantalla donde el chat y el artefacto crecen en paralelo. Esta UI es la que vas a modificar el resto del taller.",
    topics: [
      "ACP sobre WebSocket: el core del protocolo, evento por evento",
      "Escribimos el hook juntos: un stream, dos destinos — chat y artefacto",
      "Streaming de progreso y tool calls visibles: ninguna acción del agente se esconde",
      "Por qué escribes este hook y no instalas un paquete que ya lo trae",
    ],
    artifact: "Tu agente con UI propia, mostrando lo que hace mientras lo hace",
  },
  {
    number: "03",
    title: "Memoria y estado",
    date: "Martes 8 de septiembre · 8:00 PM CDMX",
    intro:
      "La caja duerme y a veces muere. Esta sesión es sobre lo que sobrevive: dónde guardas cada cosa, cómo retomas una tarea de 40 minutos que se cayó en el paso 67, y por qué el mismo registro que usas para saber qué pasó te sirve para que el agente recuerde.",
    topics: [
      "Qué sobrevive cuando la caja muere y qué se pierde sin que te enteres",
      "Los tres almacenes de EasyBits: base de datos, S3 y disco — cuál para qué",
      "Checkpoints: correr 40 minutos y retomar desde el paso que falló",
      "El mismo stream que guardas para la traza es el material de la memoria",
      "Memoria de corto plazo y de largo plazo, y dónde vive cada una",
    ],
    artifact: "Un agente que matas a media tarea y revive justo donde iba",
  },
  {
    number: "04",
    title: "Human in the loop",
    date: "Jueves 10 de septiembre · 8:00 PM CDMX",
    intro:
      "Un agente con permiso de mandar un correo un día manda mil. La salida no es quitarle permisos, es ponerte a ti en medio: interrumpir, revisar, corregir y dejarlo seguir. Cerramos poniéndolo en línea: tu agente contestando por WhatsApp y pidiéndote permiso desde ahí.",
    topics: [
      "Interrumpir al agente a media corrida sin tirar el trabajo hecho",
      "Aprobar, corregir y reanudar desde tu propia UI",
      "Streams paralelos: lanzar un segundo modelo dentro del mismo turno",
      "Conectarlo a WhatsApp — la integración va dada, ustedes la conectan",
    ],
    artifact: "Tu agente contestando por WhatsApp y pidiéndote permiso desde ahí",
  },
  {
    number: "05",
    title: "Refuerzo",
    date: "Lunes 14 de septiembre · 8:00 PM CDMX",
    intro:
      "Una sesión de colchón, a propósito. Cerramos lo que quedó a medias y le ponemos al agente lo que casi ningún curso enseña: cómo sabes que sigue funcionando después de que le moviste. Con las corridas ya guardadas, medir sale casi gratis.",
    topics: [
      "Lo que quedó a medias de las sesiones anteriores, en el código de cada quien",
      "Evals: cómo sabes que no lo empeoraste al tocar un prompt",
      "Observabilidad sobre lo que ya guardaste — comparar corridas, no adivinar",
      "Dudas del grupo, con pantalla compartida",
    ],
    artifact: "Todo sólido, corriendo, y con una forma de saber si se rompe",
  },
  {
    number: "06",
    title: "Tu caso",
    date: "Agendada contigo · 1-a-1",
    intro:
      "Una sesión privada contigo y con tu código. Aquí el agente del taller se convierte en el agente de tu trabajo: las tools de tu dominio, tus datos, tu flujo. Es la parte que no se puede dar en grupo, y por eso va aparte.",
    topics: [
      "Las tools de tu dominio, diseñadas para tu caso",
      "Prospección, soporte, research o lo que traigas",
      "Ajustes sobre tu propio agente, en vivo",
      "Qué le falta a tu sistema para aguantar usuarios reales",
    ],
    artifact: "Tu agente haciendo lo tuyo, no el ejercicio del taller",
  },
];

const INCLUDES = [
  "5 sesiones en vivo de 2 horas (10 horas totales) en 3 semanas: martes, jueves y el lunes de cierre",
  "Una sesión personal 1-a-1 sobre tu propio caso, agendada contigo",
  "Los tokens de DeepSeek incluidos: no pagas ninguna API aparte",
  "Secuencia de preparación: 6 entregas con video, una cada 2 días, antes de empezar",
  "Grabaciones de todas las sesiones, para siempre",
  "El código completo de cada sesión en un repo privado",
  "Comunidad en Ghosty Teams con el instructor y el grupo",
  "Certificado de finalización",
  "Factura fiscal si tu empresa lo paga",
];

const FAQS = [
  {
    q: "¿Qué nivel necesito?",
    a: "Saber programar y haber construido producto: frontend, fullstack o diseño con código. No necesitas experiencia previa con agentes ni con IA — el arnés lo eliges ya hecho y arrancamos por meterlo en una caja remota. Si nunca has usado una terminal, este taller te va a quedar grande.",
  },
  {
    q: "¿Qué herramientas usamos y cuánto cuestan aparte?",
    a: "El arnés lo eliges tú: GhostyCode (el nuestro, open source, y el que recomendamos porque es el que podemos arreglar en vivo), Goose, OpenHands o Aider. Los cuatro son binarios que se instalan en un minuto y los cuatro caben en la caja, así que las sesiones no se ramifican por lo que elijas. Para el código, TypeScript y React. Como modelo, DeepSeek v4 Pro con los tokens incluidos: te damos una API key de EasyBits con crédito de sobra para todo el taller, así que no pagas ninguna API aparte.",
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
    a: "Martes 1, jueves 3, martes 8, jueves 10 y lunes 14 de septiembre de 2026, de 8:00 a 10:00 PM (CDMX). La sexta sesión es personal y la agendamos contigo cuando te acomode. Todas las grupales se graban, así que si un día no puedes, no pierdes nada.",
  },
];

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Diseño de sistemas agénticos | Taller en vivo | FixterGeek",
    description:
      "Tu agente funciona en tu laptop y se rompe con usuarios reales. Aprende lo que falta en medio: la caja remota, la interfaz, la memoria, los checkpoints y el permiso humano. 5 sesiones en vivo más una personal, $2,490 MXN.",
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

/**
 * Las grabaciones que ya se pueden ver, leídas del programa.
 *
 * Antes era una constante con el slug del primer webinar escrita a mano. Funcionó
 * exactamente hasta que hubo un segundo: la landing siguió ofreciendo la grabación de
 * agosto 13 a quien acababa de perderse la del 20, y se veía impecable haciéndolo. Nadie
 * avisa de eso — no hay test que compare una constante con la base.
 *
 * El filtro es el mismo que decide si una pieza se puede ver: `isPublic` y que tenga
 * vídeo. Una pieza preparada antes del evento existe en el programa desde días antes, y
 * enlazarla entonces lleva a un reproductor vacío.
 */
export const loader = async () => {
  const { db } = await import("~/.server/db");
  const course = await db.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { videoIds: true },
  });
  const grabaciones = await db.video.findMany({
    where: {
      id: { in: course?.videoIds ?? [] },
      kind: "webinar",
      isPublic: true,
      m3u8: { not: null },
    },
    orderBy: { eventDate: "asc" },
    select: { slug: true, title: true, duration: true, poster: true },
  });
  return { grabaciones };
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
    // La fecha viaja en un formulario público: que el <select> ya solo muestre
    // las que faltan no impide que llegue un POST con una que ya pasó.
    if (!webinarsDisponibles().some((s) => s.id === slot.id)) {
      return data({ error: "Ese webinar ya pasó, elige otra fecha" });
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
            // `confirmed` NO se fabrica aquí. Registrarse a un webinar prueba
            // interés, no que el buzón sea tuyo — y este flag es global: en
            // cuanto se pone, cualquier alta posterior en cualquier secuencia se
            // salta el doble opt-in (ver s.$id.tsx, "ya confirmado → enrolar
            // directo"). Un formulario abierto no puede tener esa llave.
            //
            // La confirmación llega con el correo de bienvenida al webinar, que
            // es donde la persona demuestra el buzón sin fricción extra.
            data: { email, name: name || undefined, confirmed: false, tags },
          });

      const { recordOrigin } = await import("~/.server/origen");
      await recordOrigin(email, request);

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
                  "5 sesiones en vivo + 1 personal · Septiembre 2026 · Grabaciones incluidas",
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
  const { grabaciones } = useLoaderData<typeof loader>();
  // La más reciente: es la que se ofrece cuando el copy habla de UNA sola.
  const ultima = grabaciones.at(-1);
  const webinarFetcher = useFetcher<{
    success?: boolean;
    error?: string;
    slotId?: string;
  }>();
  const isLoading = webinarFetcher.state !== "idle";
  const done = webinarFetcher.data?.success;
  const confirmedSlot = getWebinarSlot(webinarFetcher.data?.slotId);
  // Solo las fechas que faltan. El <select> listaba las tres y arrancaba en la
  // primera, así que días después del primer webinar seguía inscribiendo gente
  // a uno que ya había pasado.
  const disponibles = webinarsDisponibles();
  const proximo = disponibles[0];

  // Ya pasaron todos: en vez de un formulario a ninguna parte, la grabación.
  if (!proximo) {
    return (
      <section
        id="webinar"
        className="relative z-10 scroll-mt-24 border-y border-sistemas-line/60 bg-sistemas-surface/40"
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-20 text-center lg:px-10">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Esta serie de webinars ya terminó
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
            {grabaciones.length > 1
              ? `Pero las ${grabaciones.length} grabaciones están completas y son gratis.`
              : "Pero la grabación está completa y es gratis."}
          </p>

          {/* Una tira de miniaturas en vez de un solo botón: el título dice de
              qué es cada una y cada tarjeta abre su propio video en el visor. */}
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {grabaciones.map((g, i) => (
              <motion.a
                key={g.slug}
                href={`/cursos/sistemas-agenticos/${g.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group overflow-hidden rounded-xl border border-sistemas-line bg-sistemas-dark text-left transition-colors hover:border-sistemas-accent/50"
              >
                <div className="relative aspect-video overflow-hidden bg-sistemas-surface">
                  {g.poster ? (
                    <img
                      src={g.poster}
                      alt={g.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                    {MINUTOS_A_TEXTO(g.duration)}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-sistemas-accent">
                    {g.title}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>

          <a
            href={`/cursos/sistemas-agenticos/${ultima?.slug ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-xl bg-sistemas-accent px-6 py-3.5 text-sm font-bold text-sistemas-dark transition hover:brightness-110"
          >
            {grabaciones.length > 1
              ? "Míralas completas, gratis →"
              : "Mira el webinar completo, gratis →"}
          </a>
        </div>
      </section>
    );
  }

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
            <span className="text-sistemas-primary">{proximo.title}</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-sistemas-gray">
            {proximo.blurb}
          </p>
          <ul className="mt-6 space-y-2.5">
            {proximo.bullets.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-zinc-300"
              >
                <span className="mt-0.5 text-sistemas-accent">▸</span>
                {item}
              </li>
            ))}
          </ul>

          {/* Las que ya pasaron y quedaron grabadas. Van aquí, junto al formulario
              de la que falta: quien llega tarde no se queda sin nada.

              ⚠️ Salen del programa, no de una lista escrita a mano. Con la lista fija,
              el día que se publicó la segunda grabación esta tarjeta siguió ofreciendo
              la primera —y se veía impecable haciéndolo. */}
          {grabaciones.length > 0 && (
            <div className="mt-8 rounded-2xl border border-sistemas-primary/40 bg-sistemas-primary/5 p-5">
              <p className="text-sm font-bold text-zinc-100">
                {grabaciones.length > 1
                  ? "¿Te perdiste alguno? Míralos completos"
                  : "¿Te perdiste el primero? Míralo completo"}
              </p>
              <p className="mt-0.5 text-xs text-sistemas-gray">
                Sin editar · gratis, solo pide tu correo
              </p>
              <ul className="mt-3 space-y-1">
                {grabaciones.map((g) => (
                  <li key={g.slug}>
                    <a
                      href={`/cursos/sistemas-agenticos/${g.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-sistemas-primary/10"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sistemas-primary/20 text-sm text-sistemas-primary transition group-hover:bg-sistemas-primary/30">
                        ▶
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                        «{g.title}»
                      </span>
                      <span className="shrink-0 text-xs text-sistemas-gray">
                        {MINUTOS_A_TEXTO(g.duration)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </motion.div>

        {/* En móvil el formulario va primero: apilado, quien llega por
            `#webinar` —casi todos desde un short— caía frente a mil doscientos
            píxeles de texto y el formulario fuera de pantalla. En `lg` vuelve a
            su columna de la derecha. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="order-first rounded-2xl border border-sistemas-line bg-sistemas-dark p-7 sm:p-8 lg:order-none"
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
              {/* Solo en móvil: aquí el formulario va antes que el título de
                  la sección, así que sin esto no se sabe a qué te apuntas. */}
              <p className="mb-3 text-sm font-bold text-sistemas-accent lg:hidden">
                Webinar gratuito · {proximo.title}
              </p>
              <h3 className="text-lg font-bold text-zinc-100">
                Aparta tu lugar
              </h3>
              <p className="mt-1.5 text-sm text-sistemas-gray">
                {disponibles.length === 1
                  ? `Gratis, el ${proximo.short.toLowerCase()}. Solo necesito saber a dónde mandarte el link.`
                  : "Gratis. Solo necesito saber a dónde mandarte el link."}
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
                {/* Con una sola fecha el selector es fricción: la fecha ya se
                    dijo arriba y aquí solo viaja. */}
                {disponibles.length === 1 ? (
                  <input type="hidden" name="webinarDate" value={proximo.id} />
                ) : (
                  <select
                    name="webinarDate"
                    required
                    defaultValue={proximo.id}
                    className="h-12 w-full rounded-xl border border-sistemas-line bg-sistemas-surface px-4 text-sm text-white outline-none transition focus:border-sistemas-primary"
                  >
                    {disponibles.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.short}
                      </option>
                    ))}
                  </select>
                )}
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
  const { grabaciones } = useLoaderData<typeof loader>();
  // La más reciente: es la que se ofrece cuando el copy habla de UNA sola.
  const ultima = grabaciones.at(-1);
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

  /**
   * Bajar al ancla cuando se llega con `#webinar` desde otra página.
   *
   * El navegador solo resuelve el hash en una carga completa. Al llegar por un
   * `<Link>` —como el de la banda de la home— React Router cambia la URL sin
   * recargar y nadie hace el scroll: la página se quedaba hasta arriba, con el
   * formulario 2,300px más abajo.
   *
   * Se repite con `setTimeout` en vez de `requestAnimationFrame`: la página
   * monta un canvas WebGL y varias imágenes, así que el primer intento cae
   * sobre un layout que todavía se está acomodando y el salto queda corto. Y
   * rAF no corre mientras la pestaña no está al frente —entrar por un link con
   * la ventana en segundo plano es justo el caso de alguien que llega de un
   * short—, así que ahí nunca dispararía.
   */
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // `scrollIntoView` respeta el `scroll-mt-24` de la sección, así que el
    // destino no queda debajo de la navbar.
    const irAlAncla = () =>
      document.querySelector(hash)?.scrollIntoView({ block: "start" });
    irAlAncla();
    const reintentos = [80, 300, 800].map((ms) => setTimeout(irAlAncla, ms));
    return () => reintentos.forEach(clearTimeout);
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
              Este taller cubre lo que falta en medio: sacarlo de tu compu,
              darle memoria e interfaz, y ponerte a ti a aprobar antes de que
              actúe.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3 text-sm text-sistemas-gray"
            >
              {[
                "5 sesiones en vivo + 1 personal",
                "Del 1 al 14 de septiembre · 8 PM CDMX",
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
              className="mt-4 text-sm font-medium text-sistemas-accent"
            >
              🎁 Incluye GhostyCode y todos los tokens de DeepSeek que necesites
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8"
            >
              <div className="flex flex-wrap items-center gap-3">
                <CheckoutButton fetcher={fetcher} />
                <a
                  href="#temario"
                  className="rounded-full border border-sistemas-line bg-sistemas-surface px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-sistemas-primary/50 hover:text-sistemas-primary"
                >
                  Ver el temario ↓
                </a>
              </div>
              <p className="mt-3 text-sm text-sistemas-gray">
                <span className="text-sistemas-accent">
                  Precio de primera edición
                </span>{" "}
                — <s className="opacity-60">${PRICE_REGULAR.toLocaleString()}</s>{" "}
                en siguientes ediciones
              </p>
              {/* La fecha sale de los datos: escrita a mano seguía invitando al webinar
                  del 13 al día siguiente de darlo. Ya que pasaron todos, una sola
                  línea a las grabaciones; el detalle de cuántas y cuánto duran
                  sobraba aquí. */}
              <p className="mt-4 text-sm text-sistemas-gray">
                ¿Prefieres verlo antes?{" "}
                {proximo ? (
                  <a
                    href="#webinar"
                    className="font-semibold text-sistemas-accent underline underline-offset-4 hover:brightness-110"
                  >
                    Webinar gratis el {proximo.short.split(" ·")[0].toLowerCase()} →
                  </a>
                ) : (
                  <a
                    href={`/cursos/sistemas-agenticos/${ultima?.slug ?? ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sistemas-accent underline underline-offset-4 hover:brightness-110"
                  >
                    {grabaciones.length > 1
                      ? `Mira los ${grabaciones.length} webinars completos, gratis →`
                      : "Mira el webinar completo, gratis →"}
                  </a>
                )}
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
              A lo largo del taller construyes tu agente personal
              production-ready: vive en una caja remota que despierta cuando la
              llamas, tiene su propia interfaz, recuerda entre sesiones,
              sobrevive fallos a media tarea y te pide aprobación antes de
              acciones sensibles. En la 1 lo sacas de tu laptop; en la 2 le
              escribes la UI; en la 3 le das memoria y checkpoints; en la 4 te
              pones en medio con el permiso humano y lo conectas a WhatsApp; en
              la 5 lo dejas sólido y medido. La 6 es contigo a solas, sobre tu
              caso. Te llevas el repo completo, corriendo con los tokens de
              DeepSeek que van incluidos.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <section
        id="temario"
        className="relative z-10 scroll-mt-24 border-t border-sistemas-line/60 bg-sistemas-surface/30"
      >
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
              3 semanas: martes, jueves y el lunes de cierre, 2 horas en vivo
              cada sesión. Más una sexta sesión, contigo a solas.
            </p>
          </motion.div>

          {/* Qué SÍ y qué NO — la exclusión antes de la introducción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mx-auto mb-14 max-w-3xl rounded-2xl border border-sistemas-line bg-sistemas-dark p-7 sm:p-9"
          >
            <h3 className="font-mono text-xs uppercase tracking-widest text-sistemas-accent">
              De qué se trata
            </h3>
            <p className="mt-4 leading-relaxed text-sistemas-gray">
              El arnés lo eliges ya hecho y lo instalas antes de la primera
              sesión. Cómo se arma uno por dentro está en el video gratuito;
              aquí armamos lo que va alrededor: la caja remota, la interfaz, la
              memoria, los checkpoints y el permiso humano. Recomendamos{" "}
              <strong className="text-zinc-200">GhostyCode</strong> —el nuestro,
              open source, y el que podemos arreglar en vivo— o{" "}
              <strong className="text-zinc-200">Goose</strong>: los dos están
              escritos en Rust y viajan como un binario suelto que copias a la
              caja y corre, mientras que{" "}
              <strong className="text-zinc-200">Aider</strong> y{" "}
              <strong className="text-zinc-200">OpenHands</strong>, en Python,
              te obligan a hornear el intérprete y sus dependencias en la
              imagen. Con Codex CLI pasó lo mismo: se mudó de TypeScript a Rust
              cuando el arnés empezó a arrancar dentro de cajas efímeras. Los
              cuatro funcionan y, elijas el que elijas, en clase seguimos los
              mismos pasos.
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

          <p className="mt-8 text-center font-mono text-xs text-sistemas-gray/70">
            Temario revisado el 28 de agosto de 2026
          </p>
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
          la capa de sistemas, y eso se aprende en seis sesiones bien dadas.
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
            note="Pídele algo y, si responde, ya estás listo para la sesión 1. --yolo lo deja ejecutar sin pedirte permiso en cada paso; el idioma se cambia desde la configuración de Ghosty."
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
