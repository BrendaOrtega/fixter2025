import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import {
  BiChevronRight,
  BiCheckCircle,
  BiCode,
  BiRocket,
  BiStar,
  BiLayer,
  BiTime,
} from "react-icons/bi";
import LiquidEther from "~/components/backgrounds/LiquidEther";

// ===========================================
// COLOR DE ACENTO DE LA LANDING
// Cambiar "emerald" por otro color de Tailwind para modificar toda la landing
// Opciones: blue, emerald, teal, cyan, green, violet, purple, pink, orange, etc.
// El verde FixterGeek (#83F3D3) es cercano a emerald
// ===========================================
const ACCENT = "emerald";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Taller AI SDK para Principiantes | TypeScript + React | FixterGeek",
    description:
      "El AI SDK es la biblioteca open source de Vercel para integrar IA en apps web. Aprende streaming, useChat, RAG y Tools en 2 sesiones prácticas.",
    url: "https://www.fixtergeek.com/ai-sdk",
    image: "https://www.fixtergeek.com/courses/ai-sdk.png",
  });

  return [
    ...baseMeta,
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
    },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "direct_checkout") {
    const totalPrice = 4990;

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
          type: "aisdk-workshop",
          totalPrice: String(totalPrice),
          courseSlug: "ai-sdk",
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: "Taller AI SDK con TypeScript",
                description:
                  "2 sesiones en vivo: 13 y 20 de diciembre 2025 (10am-1:30pm CDMX)",
              },
              unit_amount: totalPrice * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/ai-sdk?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/ai-sdk?cancel=1`,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
      });

      if (!session.url) {
        throw new Error("Failed to create checkout session");
      }

      return redirect(session.url);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return data({
        success: false,
        error: "Error al procesar el pago. Intenta nuevamente.",
      });
    }
  }

  return data({ success: false });
};

export default function AISdkPage() {
  const fetcher = useFetcher();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for payment result in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "1") {
      setShowSuccess(true);
      // Clean URL without reload
      window.history.replaceState({}, "", "/ai-sdk");
      // Auto-hide after 10 seconds
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 10000);
    }
    if (urlParams.get("cancel") === "1") {
      setShowCancel(true);
      window.history.replaceState({}, "", "/ai-sdk");
      cancelTimeoutRef.current = setTimeout(() => {
        setShowCancel(false);
      }, 5000);
    }
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Container con límite de ancho como referencia */}
      <div className="max-w-none px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        {/* Hero Section - Layout EXACTO como aihero.dev */}
        <section className="max-w-7xl mx-auto">
          <div className="flex w-full flex-col items-center justify-between lg:flex-row lg:pt-8 md:gap-10">
            {/* Columna Izquierda - Contenido */}
            <div className="w-full lg:w-1/2 mt-5 lg:mt-0">
              {/* Badge */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 rounded-full text-sm font-semibold text-emerald-400 hover:bg-emerald-600/15 transition-colors">
                  <BiRocket className="text-base" />
                  Taller Práctico
                </span>
              </div>

              {/* Título principal - Tipografía mejorada */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance leading-[1.1] mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                  Integra IA
                </span>{" "}
                en tus Proyectos web
                <br />
                con el AI SDK
              </h1>

              {/* Subtítulo - Tipografía mejorada */}
              <h2 className="text-lg sm:text-xl lg:text-2xl font-normal text-zinc-400/90 mt-6 leading-[1.6] max-w-2xl">
                El AI SDK es la biblioteca open source de Vercel que está
                revolucionando cómo los desarrolladores integran inteligencia
                artificial en aplicaciones web. Con soporte nativo para
                TypeScript, streaming en tiempo real y una API elegante, es la
                herramienta que equipos de todo el mundo eligen para construir
                experiencias de IA en producción.
              </h2>
              <p className="text-base sm:text-lg text-zinc-500 mt-4 leading-relaxed max-w-2xl">
                En este taller aprenderás paso a paso a crear tu primer chat
                inteligente, implementar respuestas en streaming que se sienten
                instantáneas, y construir tools que permiten a tu modelo
                ejecutar acciones automáticamente. Todo con código que puedes
                llevar directo a tus proyectos.
              </p>

              {/* Detalles */}
              <div className="flex flex-wrap gap-4 mt-10 text-sm text-zinc-400/90">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiLayer className="text-emerald-400 text-base" />
                  <span>2 sesiones × 3.5h</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiCode className="text-emerald-400 text-base" />
                  <span>TypeScript</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiTime className="text-emerald-400 text-base" />
                  <span>Para principiantes</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiStar className="text-emerald-400 text-base" />
                  <span className="font-semibold text-white">$4,990 MXN</span>
                </div>
              </div>

              {/* Fechas del Taller */}
              <div className="mt-8 p-5 bg-gradient-to-b from-emerald-900/20 to-emerald-900/10 border border-emerald-500/30 rounded-xl">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wide">
                  Fechas del Taller
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                      Fundamentos
                    </span>
                    <span>
                      Sábado 13 de Diciembre · 10:00 AM - 1:30 PM CDMX
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                      Avanzado
                    </span>
                    <span>
                      Sábado 20 de Diciembre · 10:00 AM - 1:30 PM CDMX
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - CTA de Compra */}
            <div className="w-full lg:w-1/2 mt-10 lg:mt-0 lg:pl-10">
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-8 shadow-2xl text-center"
                  >
                    <EmojiConfetti
                      emojis={["🤖", "🎉", "⚡", "🚀", "💻", "✨"]}
                      small={true}
                    />

                    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-500/30">
                      <BiCheckCircle className="text-green-400 text-4xl" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3">
                      ¡Pago Exitoso!
                    </h3>
                    <p className="text-zinc-400/90 mb-6 text-sm leading-relaxed">
                      Tu inscripcion al taller esta confirmada. Revisa tu email
                      para los detalles de las sesiones.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                      <BiCheckCircle className="text-lg" />
                      <span className="text-sm font-medium">
                        Nos vemos el 13 de diciembre
                      </span>
                    </div>
                  </motion.div>
                ) : showCancel ? (
                  <motion.div
                    key="cancel"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-8 shadow-2xl text-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-yellow-500/30">
                      <span className="text-4xl">🤔</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Pago cancelado
                    </h3>
                    <p className="text-zinc-400/90 mb-6 text-sm leading-relaxed">
                      No te preocupes, puedes intentar de nuevo cuando quieras.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cta"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-6 sm:p-8 shadow-2xl"
                  >
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Inscribete al Taller
                      </h3>
                      <p className="text-sm text-zinc-400/90">
                        2 sesiones en vivo con ejercicios practicos
                      </p>
                      <p className="text-sm text-zinc-400/90">
                        Si ya has tomado cursos con nosotros antes y ya eres
                        parte de la comunidad: ¡pidele tu cupon de descuento a
                        Brendi!
                      </p>
                    </div>

                    {/* Precio destacado */}
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <p className="text-sm text-emerald-400 mb-1">
                        Precio del taller
                      </p>
                      <p className="text-4xl font-bold text-white">
                        $4,990{" "}
                        <span className="text-lg text-zinc-400">MXN</span>
                      </p>
                    </div>

                    {/* Incluye */}
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-green-400 flex-shrink-0" />
                        <span>2 sesiones en vivo (3.5h cada una)</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-green-400 flex-shrink-0" />
                        <span>Sábados 13 y 20 de diciembre</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-green-400 flex-shrink-0" />
                        <span>Codigo fuente de todos los ejercicios</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-green-400 flex-shrink-0" />
                        <span>Acceso a grabaciones</span>
                      </li>
                    </ul>

                    <fetcher.Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="direct_checkout"
                      />
                      <button
                        type="submit"
                        disabled={fetcher.state === "submitting"}
                        className="w-full h-12 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                      >
                        {fetcher.state === "submitting" ? (
                          <span>Procesando...</span>
                        ) : (
                          <>
                            <span>Inscribirme Ahora</span>
                            <BiChevronRight className="text-xl" />
                          </>
                        )}
                      </button>
                    </fetcher.Form>

                    {fetcher.data?.error && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                        {fetcher.data.error}
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 text-center mt-4">
                      Pago seguro con Stripe. Aceptamos tarjetas de credito y
                      debito.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Sección Cómo Funciona y Para Quién */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Formato diferente a cursos grabados
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              Sesiones en vivo con práctica hands-on y grupos limitados
            </p>
          </div>

          {/* Grid 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Columna Izquierda: Metodología */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <BiRocket className="text-emerald-400 text-3xl" />
                Cómo funciona
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      🎥
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Sesiones en vivo
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      No videos pregrabados. Interacción real y preguntas en
                      tiempo real.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      💻
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Coding hands-on
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Cada sesión incluye ejercicios prácticos que ejecutas en
                      tu máquina.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      👥
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Grupos limitados
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Cupos reducidos para Q&A personalizado y atención
                      individual.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      📦
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Código completo
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Todos los ejemplos y proyectos descargables para tu
                      referencia.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Columna Derecha: Para Quién */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <BiStar className="text-emerald-400 text-3xl" />
                Para quien es
              </h3>

              {/* Ideal para */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <BiCheckCircle className="text-base" />
                  Ideal para
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>
                      Principiantes que quieren aprender a usar IA en sus apps
                    </span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>
                      Developers que quieren crear su primer agente inteligente
                    </span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>
                      Quieres construir un chat con IA para tu proyecto
                    </span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>
                      Valoras aprender paso a paso con ejemplos practicos
                    </span>
                  </li>
                </ul>
              </div>

              {/* Ten en cuenta */}
              <div>
                <h4 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-base">ℹ️</span>
                  Ten en cuenta
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Cubriremos lo basico de TypeScript y NodeJS</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>El enfoque es 100% practico con codigo real</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>
                      Las sesiones son sabados en la manana (10am CDMX)
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sección Videos */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Mira de qué se trata
            </h2>
            <p className="text-lg text-zinc-400/90 font-normal leading-relaxed max-w-2xl mx-auto">
              Una probadita de lo que aprenderás en el taller
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl">
              <iframe
                src="https://www.youtube.com/embed/yGHVRLhiUcQ"
                title="AI SDK para Principiantes"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl">
              <iframe
                src="https://www.youtube.com/embed/ZQrLmP11DCo"
                title="AI SDK Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Sección Temario Completo */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Temario del Taller
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              2 sesiones intensivas de 3.5 horas cada una
            </p>
          </div>

          {/* Grid de Sesiones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Sesion 1 */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                Sesión 1: Fundamentos
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Sábado 13 de Diciembre · 10:00 AM - 1:30 PM CDMX
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      👋
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Introducción
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Bienvenida, setup del entorno y conceptos clave de AI SDK
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      ⚡
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Streaming básico
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Express + vanilla JS para entender el flujo de datos
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      ⚛️
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Cliente React
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      useChat hook del AI SDK 5 para crear interfaces de chat
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      🛠️
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Tools y UI generativa
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Componentes React generados dinámicamente por la IA
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Sesion 2 */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                Sesión 2: Avanzado
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Sábado 20 de Diciembre · 10:00 AM - 1:30 PM CDMX
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      🔄
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Recap
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Repaso rápido de los conceptos de la sesión anterior
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      📁
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Subida de archivos
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Añadir contexto a tus conversaciones con documentos
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      🧠
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      RAG con Embeddings
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Búsqueda por similitud para respuestas contextuales
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg flex-shrink-0 border border-emerald-500/20 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">
                      🎯
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">
                      Cierre y recursos
                    </h4>
                    <p className="text-sm text-zinc-400/90">
                      Q&A, próximos pasos y materiales adicionales
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Instructor Section - Full width with LiquidEther background */}
      <section className="py-10 lg:py-20 relative overflow-hidden bg-zinc-950">
        {/* LiquidEther Background */}
        <div className="absolute inset-0 z-0">
          <LiquidEther
            colors={["#6EE7B7", "#34D399", "#10B981"]}
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
        <div className="relative container mx-auto px-4 z-10 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden bg-zinc-900/90 backdrop-blur-sm">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="font-light text-white">Tu instructor</span>
                  <h3 className="text-3xl font-bold mt-2 mb-4 text-emerald-400">
                    Héctor Bliss
                  </h3>
                  <p className="mb-6 text-zinc-400/90">
                    Pionero en hacer la IA accesible para todos, con más de 8
                    años enseñando tecnología y una comunidad de más de 2,000
                    estudiantes activos.
                  </p>
                  <p className="mb-6 text-zinc-400/90">
                    Especializado en enseñar herramientas complejas de forma
                    simple, Héctor te guiará paso a paso para integrar IA en tus
                    proyectos web.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">
                        8+
                      </div>
                      <div className="text-xs text-zinc-400/90">
                        Años enseñando
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">
                        2K+
                      </div>
                      <div className="text-xs text-zinc-400/90">
                        Estudiantes
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">
                        100%
                      </div>
                      <div className="text-xs text-zinc-400/90">Práctico</div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: "#6EE7B7" }}
                  ></div>
                  <img
                    className="w-full rounded-2xl relative z-10"
                    src="/courses/titor.png"
                    alt="Héctor Bliss"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Full width */}
      <div className="bg-gradient-to-b from-zinc-950 to-black px-5 sm:px-8 lg:px-10">
        <footer className="max-w-7xl mx-auto border-t border-zinc-800/30 py-12">
          <div className="text-center">
            <p className="text-sm text-zinc-500/80">
              © 2025 FixterGeek · Integra IA en tus Proyectos web con AI SDK y
              TypeScript
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
