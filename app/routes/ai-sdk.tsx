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
                Integra IA en tus{" "}
                <span className="bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">
                  Proyectos
                </span>
                <br />
                con AI SDK
              </h1>

              {/* Subtítulo - Tipografía mejorada */}
              <h2 className="text-lg sm:text-xl lg:text-2xl font-normal text-zinc-400/90 mt-6 leading-[1.6] max-w-2xl">
                Aprende a construir herramientas IA altamente personalizadas con TypeScript y AI SDK v5, en solo 4 sesiones… con retrieval, memory y agents, sin GPUs ni títulos en ML
              </h2>

              {/* Detalles */}
              <div className="flex flex-wrap gap-4 mt-10 text-sm text-zinc-400/90">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg">
                  <BiLayer className="text-blue-400 text-base" />
                  <span>4 sesiones × 1.5h</span>
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
                      BM25, embeddings, RRF y query rewriting
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
                            ¿Qué te interesa más?
                          </option>
                          <option value="chatbots" className="bg-zinc-900">
                            Chatbots conversacionales
                          </option>
                          <option value="assistants" className="bg-zinc-900">
                            Asistentes con herramientas
                          </option>
                          <option value="multimodal" className="bg-zinc-900">
                            Sistemas multimodales
                          </option>
                          <option value="all" className="bg-zinc-900">
                            Todo lo anterior
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

        {/* Sección Temario - Grid mejorado */}
        <section className="max-w-7xl mx-auto border-t border-zinc-800/30 mt-24 pt-16">

          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              Lo que aprenderás
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-zinc-400/90 font-normal leading-relaxed max-w-3xl mx-auto">
              Técnicas modernas de IA aplicadas a proyectos reales
            </p>
          </div>

          {/* Grid de Sesiones - 2 columnas bien definido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                day: "Día 1",
                title: "Retrieval Systems",
                topics: ["BM25 & embeddings", "RRF & query rewriting", "Vector search patterns"],
                icon: BiNetworkChart,
              },
              {
                day: "Día 2",
                title: "Chunking & Reranking",
                topics: ["Estrategias de chunking", "Agentic reranking", "Context optimization"],
                icon: BiLayer,
              },
              {
                day: "Día 3",
                title: "Memory & Context",
                topics: ["Semantic memory", "Episodic memory", "Working memory patterns"],
                icon: BiCog,
              },
              {
                day: "Día 4",
                title: "Evals & HITL",
                topics: ["Testing frameworks", "LLM-as-judge", "Human-in-the-loop"],
                icon: BiCode,
              },
            ].map((session, index) => (
              <div
                key={index}
                className="p-6 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 hover:from-zinc-900/60 hover:to-zinc-900/30 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 rounded-lg flex-shrink-0 border border-blue-500/20 group-hover:bg-blue-500/15 transition-colors">
                    <session.icon className="text-blue-400 text-xl" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">
                      {session.day}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">
                      {session.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {session.topics.map((topic, i) => (
                        <li key={i} className="text-sm text-zinc-400/90 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
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
