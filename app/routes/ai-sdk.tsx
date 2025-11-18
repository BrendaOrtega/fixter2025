import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { PhoneInput } from "~/components/common/PhoneInput";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { sendWebinarCongrats } from "~/mailSenders/sendWebinarCongrats";
import {
  BiChevronRight,
  BiCheckCircle,
  BiCode,
  BiNetworkChart,
  BiCog,
  BiRocket,
  BiStar,
  BiLayer,
} from "react-icons/bi";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Integra IA en tus Proyectos con AI SDK | TypeScript | FixterGeek",
    description:
      "Domina AI SDK con TypeScript. Aprende retrieval, memory, agents y human-in-the-loop. Crea asistentes inteligentes para tus aplicaciones en 4 sesiones prácticas.",
    url: "https://www.fixtergeek.com/ai-sdk",
    image: "/ai-sdk-og.png",
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

  if (intent === "aisdk_registration") {
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const phone = String(formData.get("phone_full") || formData.get("phone"));
    const experience = String(formData.get("experience"));
    const interest = String(formData.get("interest"));

    try {
      await db.user.upsert({
        where: { email },
        create: {
          email,
          username: name || email.split("@")[0],
          displayName: name,
          phoneNumber: phone || undefined,
          courses: [],
          editions: [],
          roles: [],
          tags: [
            "aisdk_course",
            "newsletter",
            `experience-${experience}`,
            `interest-${interest}`,
          ],
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "aisdk_typescript_2025",
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: {
            push: [
              "aisdk_course",
              `experience-${experience}`,
              `interest-${interest}`,
            ]
          },
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "aisdk_typescript_2025",
          },
        },
      });

      try {
        await sendWebinarCongrats({
          to: email,
          webinarTitle: "Integra IA en tus Proyectos con AI SDK y TypeScript",
          webinarDate: "Próximamente",
          userName: name,
        });
      } catch (emailError) {
        console.error("Email send failed but registration succeeded:", emailError);
      }

      return data({
        success: true,
        type: "course_registration",
        message: "Registro exitoso para el curso",
      });
    } catch (error) {
      console.error("Error registering for course:", error);
      return data({
        success: false,
        error: "Error al procesar el registro",
      });
    }
  }

  return redirect("/ai-sdk");
};

export default function AISdkPage() {
  const fetcher = useFetcher();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccess(true);
    }
  }, [fetcher.data]);

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
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/30 rounded-full text-sm font-semibold text-blue-400 hover:bg-blue-600/15 transition-colors">
                  <BiRocket className="text-base" />
                  Taller Práctico
                </span>
              </div>

              {/* Título principal - Tipografía mejorada */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance leading-[1.1] mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">
                  Integra IA
                </span>{" "}
                en tus Proyectos
                <br />
                con el AI SDK
              </h1>

              {/* Subtítulo - Tipografía mejorada */}
              <h2 className="text-lg sm:text-xl lg:text-2xl font-normal text-zinc-400/90 mt-6 leading-[1.6] max-w-2xl">
                Aprende a construir herramientas IA altamente personalizadas con TypeScript y AI SDK v5, en solo 4 sesiones… con retrieval, memory y agents, sin GPUs ni títulos en ML
              </h2>

              {/* Detalles */}
              <div className="flex flex-wrap gap-4 mt-10 text-sm text-zinc-400/90">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiLayer className="text-blue-400 text-base" />
                  <span>4 sesiones × 2h</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiCode className="text-blue-400 text-base" />
                  <span>TypeScript</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiStar className="text-blue-400 text-base" />
                  <span className="font-semibold text-white">$3,999 MXN</span>
                </div>
              </div>

              {/* Fechas del Taller */}
              <div className="mt-8 p-5 bg-gradient-to-b from-blue-900/20 to-blue-900/10 border border-blue-500/30 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide">Fechas del Taller</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-blue-400">•</span>
                    <span>Martes 9 Dic 2025 · 7-9pm CDMX</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-blue-400">•</span>
                    <span>Jueves 11 Dic 2025 · 7-9pm CDMX</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-blue-400">•</span>
                    <span>Martes 16 Dic 2025 · 7-9pm CDMX</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-blue-400">•</span>
                    <span>Jueves 18 Dic 2025 · 7-9pm CDMX</span>
                  </div>
                </div>
              </div>

              {/* Features Cards - Grid mejorado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                <div className="flex items-start gap-3 p-5 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 hover:from-zinc-900/60 hover:to-zinc-900/30 transition-all duration-300">
                  <div className="w-11 h-11 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                    <BiNetworkChart className="text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1.5">
                      Retrieval Avanzado
                    </h3>
                    <p className="text-xs text-zinc-400/80 leading-relaxed">
                      Embeddings, búsqueda semántica y query rewriting
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-5 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 hover:from-zinc-900/60 hover:to-zinc-900/30 transition-all duration-300">
                  <div className="w-11 h-11 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                    <BiCog className="text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1.5">
                      Memory Systems
                    </h3>
                    <p className="text-xs text-zinc-400/80 leading-relaxed">
                      Semantic, episodic y working memory
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - Formulario */}
            <div className="w-full lg:w-1/2 mt-10 lg:mt-0 lg:pl-10">
              <AnimatePresence mode="wait">
                {!showSuccess ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-6 sm:p-8 shadow-2xl"
                  >
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Únete al Taller
                      </h3>
                      <p className="text-sm text-zinc-400/90">
                        Regístrate para recibir notificaciones sobre fechas
                      </p>
                    </div>

                    <fetcher.Form method="post" className="space-y-4">
                      <input
                        type="hidden"
                        name="intent"
                        value="aisdk_registration"
                      />

                      <div>
                        <input
                          type="text"
                          name="name"
                          placeholder="Tu nombre completo"
                          required
                          className="w-full h-11 px-4 py-2 bg-black/30 border border-zinc-700/60 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-zinc-600 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <input
                          type="email"
                          name="email"
                          placeholder="tu@email.com"
                          required
                          className="w-full h-11 px-4 py-2 bg-black/30 border border-zinc-700/60 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-zinc-600 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <PhoneInput
                          name="phone"
                          placeholder="Teléfono (opcional)"
                          className="w-full"
                          dark={true}
                        />
                      </div>

                      <div>
                        <select
                          name="experience"
                          required
                          className="w-full h-11 px-4 py-2 bg-black/30 border border-zinc-700/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-zinc-600 transition-all duration-200"
                        >
                          <option value="" className="bg-zinc-900">
                            Nivel de experiencia en TypeScript
                          </option>
                          <option value="beginner" className="bg-zinc-900">
                            Principiante
                          </option>
                          <option value="intermediate" className="bg-zinc-900">
                            Intermedio
                          </option>
                          <option value="advanced" className="bg-zinc-900">
                            Avanzado
                          </option>
                        </select>
                      </div>

                      <div>
                        <select
                          name="interest"
                          required
                          className="w-full h-11 px-4 py-2 bg-black/30 border border-zinc-700/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-zinc-600 transition-all duration-200"
                        >
                          <option value="" className="bg-zinc-900">
                            ¿Has integrado IA en tus apps antes?
                          </option>
                          <option value="never" className="bg-zinc-900">
                            No, será mi primera vez
                          </option>
                          <option value="basic-api" className="bg-zinc-900">
                            Sí, solo llamadas básicas a APIs
                          </option>
                          <option value="advanced" className="bg-zinc-900">
                            Sí, con RAG o agents
                          </option>
                          <option value="production" className="bg-zinc-900">
                            Sí, tengo apps en producción
                          </option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={fetcher.state === "submitting"}
                        className="w-full h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                      >
                        {fetcher.state === "submitting" ? (
                          <span>Registrando...</span>
                        ) : (
                          <>
                            <span>Registrarme Ahora</span>
                            <BiChevronRight className="text-lg" />
                          </>
                        )}
                      </button>
                    </fetcher.Form>

                    {fetcher.data?.error && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                        {fetcher.data.error}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
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
                      ¡Registro Exitoso!
                    </h3>
                    <p className="text-zinc-400/90 mb-6 text-sm leading-relaxed">
                      Te notificaremos cuando publiquemos las fechas. Revisa tu email.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                      <BiStar className="text-lg" />
                      <span className="text-sm font-medium">
                        Estás en la lista
                      </span>
                    </div>
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
                <BiRocket className="text-blue-400 text-3xl" />
                Cómo funciona
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">🎥</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">Sesiones en vivo</h4>
                    <p className="text-sm text-zinc-400/90">No videos pregrabados. Interacción real y preguntas en tiempo real.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">💻</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">Coding hands-on</h4>
                    <p className="text-sm text-zinc-400/90">Cada sesión incluye ejercicios prácticos que ejecutas en tu máquina.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">👥</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">Grupos limitados</h4>
                    <p className="text-sm text-zinc-400/90">Cupos reducidos para Q&A personalizado y atención individual.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">📦</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">Código completo</h4>
                    <p className="text-sm text-zinc-400/90">Todos los ejemplos y proyectos descargables para tu referencia.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Columna Derecha: Para Quién */}
            <div className="p-8 bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <BiStar className="text-blue-400 text-3xl" />
                Para quién es
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
                    <span>Developers que saben TypeScript y quieren integrar IA</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Quieres ir más allá de wrappers básicos de OpenAI</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Buscas técnicas avanzadas con aplicación práctica</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Valoras aprender en vivo con Q&A directo</span>
                  </li>
                </ul>
              </div>

              {/* Ten en cuenta */}
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-base">ℹ️</span>
                  Ten en cuenta
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Asumimos conocimientos de TypeScript y experiencia con APIs</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>El enfoque es práctico, no teoría académica de ML</span>
                  </li>
                  <li className="text-sm text-zinc-400/90 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Las sesiones son en vivo en horarios específicos</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* Sección Temario Completo */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">

          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Temario Completo
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              Programa intensivo de 4 días con ejercicios prácticos y proyectos reales
            </p>
          </div>

          {/* Grid de Módulos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">

            {/* Módulo 1 - Día 1 Teoría */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">01</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Retrieval: Teoría Completa</h3>
                  <p className="text-xs text-zinc-500">Día 1 · Construcción de habilidades</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Embeddings y búsqueda semántica</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Vector databases y similarity search</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Estrategias de chunking (fijo, estructural)</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Metadata y filtros personalizados</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Integración RAG con agentes</li>
              </ul>
            </div>

            {/* Módulo 2 - Día 1 Práctica */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">02</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Retrieval: Proyecto End-to-End</h3>
                  <p className="text-xs text-zinc-500">Día 1 · Aplicación práctica</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Construcción de dataset personalizado</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Generar embeddings con AI SDK</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Similarity search con vector stores</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Filtros personalizados y metadata-first</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Integración con agente AI SDK</li>
              </ul>
            </div>

            {/* Módulo 3 - Día 2 Teoría */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">03</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Memory Systems: Teoría</h3>
                  <p className="text-xs text-zinc-500">Día 2 · Construcción de habilidades</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Configuración básica de memoria</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Actualización de memorias previas</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Memoria como tool call</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Búsqueda semántica en memorias</li>
              </ul>
            </div>

            {/* Módulo 4 - Día 2 Práctica */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">04</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Memory Systems: Proyecto</h3>
                  <p className="text-xs text-zinc-500">Día 2 · Aplicación práctica</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Implementar recall semántico</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Working memory con embeddings</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Creación automática de memorias</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Memoria episódica de conversaciones</li>
              </ul>
            </div>

            {/* Módulo 5 - Día 3 Teoría */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">05</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Evaluaciones: Teoría</h3>
                  <p className="text-xs text-zinc-500">Día 3 · Construcción de habilidades</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Evaluar agentes con tool calls</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Crear datasets sintéticos</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Testing manual con inputs reales</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Métricas de performance en agentes</li>
              </ul>
            </div>

            {/* Módulo 6 - Día 3 Práctica */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">06</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Evaluaciones: Proyecto</h3>
                  <p className="text-xs text-zinc-500">Día 3 · Aplicación práctica</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Evaluar herramientas de memoria</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Crear dataset de evaluación</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Evaluar sistemas de retrieval</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>LLM-as-judge scorer</li>
              </ul>
            </div>

            {/* Módulo 7 - Día 4 Teoría */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">07</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Human-in-the-Loop: Teoría</h3>
                  <p className="text-xs text-zinc-500">Día 4 · Construcción de habilidades</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Introducción a HITL</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Iniciar solicitudes HITL</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Aprobar solicitudes HITL</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Pasar historial personalizado al LLM</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Procesar y ejecutar solicitudes</li>
              </ul>
            </div>

            {/* Módulo 8 - Día 4 Práctica */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">08</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Human-in-the-Loop: Proyecto</h3>
                  <p className="text-xs text-zinc-500">Día 4 · Aplicación práctica</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Construir herramientas destructivas</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Implementar harness HITL</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Acceso temporal a herramientas</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Testing de flujos de aprobación</li>
              </ul>
            </div>

            {/* Módulo 9 - Referencias */}
            <div className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl lg:col-span-2">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 font-bold text-sm">09</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Referencias y Recursos Avanzados</h3>
                  <p className="text-xs text-zinc-500">Material complementario</p>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-400/90">
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Stream Object & Partial Streams</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Reconciliación de IDs en Data Parts</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>Streaming manual de Text Parts</li>
                <li className="flex items-start gap-2"><span className="text-blue-400">•</span>UI Messages vs Model Messages</li>
              </ul>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto border-t border-zinc-800/30 py-12 mt-24">
          <div className="text-center">
            <p className="text-sm text-zinc-500/80">
              © 2025 FixterGeek · Integra IA en tus Proyectos con AI SDK y TypeScript
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
