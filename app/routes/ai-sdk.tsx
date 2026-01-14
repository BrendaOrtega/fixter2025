import { motion, AnimatePresence } from "motion/react";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher } from "react-router";
import { data, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { db } from "~/.server/db";
import {
  BiChevronRight,
  BiCheckCircle,
  BiCode,
  BiRocket,
  BiStar,
  BiLayer,
  BiTime,
} from "react-icons/bi";
import { BsGithub, BsLinkedin, BsFacebook } from "react-icons/bs";
import LiquidEther from "~/components/backgrounds/LiquidEther";

// ===========================================
// COLOR DE ACENTO DE LA LANDING
// Cambiar "emerald" por otro color de Tailwind para modificar toda la landing
// Opciones: blue, emerald, teal, cyan, green, violet, purple, pink, orange, etc.
// El verde FixterGeek (#83F3D3) es cercano a emerald
// ===========================================
const ACCENT = "emerald";

// ===========================================
// INSCRIPCIONES CERRADAS - FECHAS POR ANUNCIAR
// ===========================================
// Precios en centavos MXN para Stripe (referencia)
const TALLER_PRICE = 99900; // $999 MXN

// Countdown removido - inscripciones cerradas

export const meta = () => {
  const baseMeta = getMetaTags({
    title:
      "Taller de AI SDK | Aprende IA aplicada con TypeScript | FixterGeek",
    description:
      "Aprende a construir interfaces generativas con streaming y el AI SDK de Vercel. Talleres prácticos desde $999 MXN.",
    url: "https://www.fixtergeek.com/ai-sdk",
    image: "https://www.fixtergeek.com/courses/ai-sdk.png",
    keywords:
      "AI SDK, Vercel AI SDK, TypeScript, React, inteligencia artificial, streaming, useChat, UI generativa, curso IA, taller programación",
  });

  // Schema.org JSON-LD para LLMs y SEO
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": "https://www.fixtergeek.com/ai-sdk#course",
        name: "Taller de AI SDK - IA aplicada con TypeScript",
        description:
          "Construye interfaces generativas con streaming y el AI SDK de Vercel. Talleres prácticos.",
        url: "https://www.fixtergeek.com/ai-sdk",
        provider: {
          "@type": "Organization",
          "@id": "https://www.fixtergeek.com/#organization",
          name: "FixterGeek",
          url: "https://www.fixtergeek.com",
          logo: "https://www.fixtergeek.com/logo.png",
          sameAs: [
            "https://www.linkedin.com/company/fixtergeek",
            "https://github.com/FixterGeek",
            "https://x.com/FixterGeek",
          ],
        },
        instructor: {
          "@type": "Person",
          name: "Héctor Bliss",
          url: "https://www.linkedin.com/in/hectorbliss/",
          sameAs: ["https://github.com/blissito", "https://x.com/HectorBlisS"],
        },
        offers: {
          "@type": "Offer",
          price: "999",
          priceCurrency: "MXN",
          availability: "https://schema.org/PreOrder",
          url: "https://www.fixtergeek.com/ai-sdk",
        },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: "PT3H30M",
          instructor: {
            "@type": "Person",
            name: "Héctor Bliss",
          },
        },
        inLanguage: "es",
        coursePrerequisites: "Conocimientos básicos de JavaScript",
        educationalLevel: "Beginner",
        teaches: [
          "Streaming con AI SDK",
          "useChat hook de React",
          "UI generativa en tiempo real",
          "Doble stream para artefactos",
        ],
        image: "https://www.fixtergeek.com/courses/ai-sdk.png",
      },
      {
        "@type": "WebPage",
        "@id": "https://www.fixtergeek.com/ai-sdk#webpage",
        url: "https://www.fixtergeek.com/ai-sdk",
        name: "Taller AI SDK para Principiantes | FixterGeek",
        description:
          "Aprende a integrar inteligencia artificial en tus aplicaciones web con el AI SDK de Vercel.",
        isPartOf: {
          "@id": "https://www.fixtergeek.com/#website",
        },
        about: {
          "@id": "https://www.fixtergeek.com/ai-sdk#course",
        },
        inLanguage: "es",
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.fixtergeek.com/ai-sdk#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: "https://www.fixtergeek.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cursos",
            item: "https://www.fixtergeek.com/cursos",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "AI SDK",
            item: "https://www.fixtergeek.com/ai-sdk",
          },
        ],
      },
    ],
  };

  return [
    ...baseMeta,
    {
      "script:ld+json": schemaOrg,
    },
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

  // Lista de espera para próximas fechas
  if (intent === "waitlist") {
    const email = String(formData.get("email") || "").trim();
    const name = String(formData.get("name") || "").trim();

    // Validar email
    const emailSchema = z.string().email("Email no válido");
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      return data({ success: false, error: "Por favor ingresa un email válido" });
    }

    // Validar nombre
    if (!name || name.length < 2) {
      return data({ success: false, error: "Por favor ingresa tu nombre" });
    }

    try {
      // Agregar a lista de espera
      await db.subscriber.upsert({
        where: { email },
        create: {
          email,
          name,
          tags: ["aisdk-waitlist"],
          confirmed: true, // No requiere confirmación, solo lista de espera
        },
        update: {
          name: name || undefined,
          tags: { push: ["aisdk-waitlist"] },
        },
      });

      return data({ success: true, waitlist: true });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      return data({
        success: false,
        error: "Hubo un error. Intenta de nuevo.",
      });
    }
  }

  return data({ success: false });
};

export default function AISdkPage() {
  const fetcher = useFetcher();

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
                  Taller AI SDK · Próximamente
                </span>
              </div>

              {/* Título principal */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance leading-[1.1] mb-6 tracking-tight">
                Introducción a la{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                  IA aplicada
                </span>{" "}
                con TypeScript y{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                  React
                </span>
              </h1>

              {/* Subtítulo */}
              <h2 className="text-lg sm:text-xl lg:text-2xl font-normal text-zinc-400/90 mt-6 leading-[1.6] max-w-2xl">
                De prompt a interfaz en tiempo real. Streaming, herramientas y
                componentes dinámicos con el AI SDK de Vercel.
              </h2>
              <p className="text-base sm:text-lg text-zinc-500 mt-4 leading-relaxed max-w-2xl">
                Te mostraré cómo funciona con demos en vivo. Sin teoría
                aburrida, puro código que puedes llevar directo a tus proyectos.
              </p>

              {/* Detalles del taller */}
              <div className="flex flex-wrap gap-4 mt-10 text-sm text-zinc-400/90">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiTime className="text-emerald-400 text-base" />
                  <span>3.5 horas intensivas</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiCode className="text-emerald-400 text-base" />
                  <span>100% Online</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiLayer className="text-emerald-400 text-base" />
                  <span>Código incluido</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <BiStar className="text-emerald-400 text-base" />
                  <span className="font-semibold text-emerald-400">$999 MXN</span>
                </div>
              </div>

              {/* Preview de talleres */}
              <div className="mt-8 p-5 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">
                  Dos talleres prácticos de 3.5 horas cada uno
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                      Taller 1
                    </span>
                    <span>
                      IA aplicada con TypeScript · Streaming y useChat
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-semibold">
                      Taller 2
                    </span>
                    <span>RAG y Agentes · Herramientas avanzadas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - Lista de Espera */}
            <div className="w-full lg:w-1/2 mt-10 lg:mt-0 lg:pl-10">
              <AnimatePresence mode="wait">
                {fetcher.data?.waitlist ? (
                  <motion.div
                    key="waitlist-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-8 shadow-2xl text-center"
                  >
                    <EmojiConfetti
                      emojis={["🤖", "🎉", "⚡", "🚀", "💻", "✨"]}
                      small={true}
                    />

                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/30">
                      <BiCheckCircle className="text-emerald-400 text-4xl" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      ¡Estás en la lista!
                    </h3>
                    <p className="text-zinc-400/90 mb-6 text-sm leading-relaxed">
                      Te avisaremos cuando abramos nuevas fechas para el taller
                      de AI SDK.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                      <BiCheckCircle className="text-lg" />
                      <span className="text-sm font-medium">
                        Serás de los primeros en enterarte
                      </span>
                    </div>
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
                        Próximas fechas por anunciar
                      </h3>
                      <p className="text-sm text-zinc-400/90">
                        Únete a la lista de espera para ser notificado
                      </p>
                    </div>

                    {/* Precio referencia */}
                    <div className="mb-6 p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl text-center relative overflow-hidden">
                      <p className="text-sm text-zinc-400 mb-1">
                        Precio por taller
                      </p>
                      <p className="text-3xl font-bold text-white">
                        $999 <span className="text-lg text-zinc-500">MXN</span>
                      </p>
                    </div>

                    {/* Qué aprenderás */}
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-emerald-400 flex-shrink-0" />
                        <span>Streaming con AI SDK de Vercel</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-emerald-400 flex-shrink-0" />
                        <span>Hook useChat para interfaces de chat</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-emerald-400 flex-shrink-0" />
                        <span>Doble stream para artefactos (estilo v0)</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-300">
                        <BiCheckCircle className="text-emerald-400 flex-shrink-0" />
                        <span>RAG y agentes con herramientas</span>
                      </li>
                    </ul>

                    <fetcher.Form method="post" className="space-y-3">
                      <input type="hidden" name="intent" value="waitlist" />
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Tu nombre"
                        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                      />
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="tu@email.com"
                        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={fetcher.state === "submitting"}
                        className="w-full h-12 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                      >
                        {fetcher.state === "submitting" ? (
                          <span>Enviando...</span>
                        ) : (
                          <>
                            <span>Avisarme cuando abran fechas</span>
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
                      Sin spam. Solo te avisaremos cuando haya nuevas fechas.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Sección Conceptos Fundamentales */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Conceptos{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                Fundamentales
              </span>
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              Los pilares de IA aplicada que dominarás
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Bloque 1 - Mensajes y Prompts */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">💬</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Mensajes y Prompts</h4>
                  <p className="text-xs text-zinc-500">~10 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                Cómo estructurar mensajes para la IA. Sistema de roles: user,
                assistant y system prompts.
              </p>
            </div>

            {/* Bloque 2 - Tokens y Contexto */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">🔢</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Tokens y Contexto</h4>
                  <p className="text-xs text-zinc-500">~10 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                Qué son los tokens y por qué importan. Ventana de contexto: sus
                límites y estrategias para aprovecharla.
              </p>
            </div>

            {/* Bloque 3 - Herramientas y Agentes */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">🔧</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">
                    Herramientas y Agentes
                  </h4>
                  <p className="text-xs text-zinc-500">~15 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                Function calling básico. Cómo hacer que la IA renderice
                componentes React en tiempo real.
              </p>
            </div>

            {/* Bloque 4 - Demo en Vivo */}
            <div className="p-6 bg-gradient-to-b from-emerald-900/20 to-emerald-900/10 border-2 border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold">🎥</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Demo en Vivo</h4>
                  <p className="text-xs text-emerald-400">~10 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-300">
                UI generativa en tiempo real. Preview de lo que construirás en
                el taller práctico.
              </p>
            </div>
          </div>
        </section>

        {/* Sección Temario Taller 1 */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Temario del Taller
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              3.5 horas intensivas de código en vivo
            </p>
          </div>

          {/* Grid de Bloques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Bloque 1 */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">👋</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">
                    Setup y Fundamentos
                  </h4>
                  <p className="text-xs text-zinc-500">~30 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                Configuración del entorno, instalación del AI SDK y conceptos
                clave. Tu primer "hola mundo" con IA.
              </p>
            </div>

            {/* Bloque 2 */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">⚡</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Streaming Básico</h4>
                  <p className="text-xs text-zinc-500">~45 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                Express + vanilla JS para entender el flujo de datos en tiempo
                real. Cómo funciona el streaming por dentro.
              </p>
            </div>

            {/* Bloque 3 */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">⚛️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">Cliente React</h4>
                  <p className="text-xs text-zinc-500">~45 min</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400/90">
                El hook useChat del AI SDK para crear interfaces de chat.
                Estado, mensajes y UX fluida.
              </p>
            </div>

            {/* Bloque 4 */}
            <div className="p-6 bg-gradient-to-b from-emerald-900/20 to-emerald-900/10 border-2 border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold">🎨</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">
                    Doble Stream / Artefactos
                  </h4>
                  <p className="text-xs text-emerald-400">
                    ~1.5h · Proyecto final
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-300">
                El plato fuerte: genera UI en tiempo real estilo v0.dev. Dos
                streams simultáneos para chat y código generado.
              </p>
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
          <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto">
            {/* Video Destacado */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/10">
              <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                DESTACADO
              </div>
              <iframe
                src="https://www.youtube.com/embed/amY0p-TppHo"
                title="AI SDK Tutorial Destacado"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            {/* Videos secundarios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div>
        </section>

        {/* Sección Los Talleres - Cards lado a lado */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Los Talleres
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              Próximamente nuevas fechas · Únete a la lista de espera
            </p>
          </div>

          {/* Grid de Talleres */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Taller 1 - Próximamente */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/40 rounded-2xl relative opacity-70">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 bg-zinc-700 text-zinc-400 text-xs font-bold rounded-full">
                  PRÓXIMAMENTE
                </span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-300 mb-6 flex items-center gap-3 mt-2">
                <span className="text-3xl">🚀</span>
                Introducción a la IA aplicada con TypeScript
              </h3>

              {/* Qué construirás */}
              <h4 className="text-sm font-semibold text-zinc-500 mb-3 uppercase tracking-wide">
                Qué construirás
              </h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Tu primer chat con streaming</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Interfaz React con useChat</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Sistema de doble stream (artefactos)</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Código fuente completo</span>
                </li>
              </ul>

              {/* Precio */}
              <div className="p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl text-center mb-4">
                <p className="text-3xl font-bold text-zinc-500">
                  $999 <span className="text-lg text-zinc-600">MXN</span>
                </p>
              </div>

              <button
                disabled
                className="w-full h-12 px-4 py-2 bg-zinc-800 text-zinc-500 rounded-lg font-semibold text-base cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Fechas por anunciar</span>
              </button>
            </div>

            {/* Taller 2 - Próximamente */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/40 rounded-2xl relative opacity-70">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 bg-zinc-700 text-zinc-400 text-xs font-bold rounded-full">
                  PRÓXIMAMENTE
                </span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-300 mb-6 flex items-center gap-3 mt-2">
                <span className="text-3xl">🔥</span>
                RAG y Agentes con AI SDK
              </h3>

              {/* Preview contenido */}
              <h4 className="text-sm font-semibold text-zinc-500 mb-3 uppercase tracking-wide">
                Qué aprenderás
              </h4>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Embeddings y búsqueda semántica</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>RAG con base de datos</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Agentes con herramientas</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">•</span>
                  <span>Proyecto completo funcional</span>
                </li>
              </ul>

              {/* Precio */}
              <div className="p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl text-center mb-4">
                <p className="text-3xl font-bold text-zinc-500">
                  $999 <span className="text-lg text-zinc-600">MXN</span>
                </p>
              </div>

              <button
                disabled
                className="w-full h-12 px-4 py-2 bg-zinc-800 text-zinc-500 rounded-lg font-semibold text-base cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Fechas por anunciar</span>
              </button>
            </div>
          </div>
        </section>

        {/* Sección Cómo Funciona y Para Quién */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              No es otro curso que vas a dejar a medias
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              3.5 horas de código en vivo → resultado funcional que te llevas
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
                      Las sesiones se programan en horarios accesibles
                    </span>
                  </li>
                </ul>
              </div>
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
                  {/* Social Links */}
                  <div className="flex gap-4 mt-6">
                    <a
                      href="https://www.linkedin.com/in/hectorbliss/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      <BsLinkedin className="text-2xl" />
                    </a>
                    <a
                      href="https://github.com/blissito"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      <BsGithub className="text-2xl" />
                    </a>
                    <a
                      href="https://www.facebook.com/blissito"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      <BsFacebook className="text-2xl" />
                    </a>
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
