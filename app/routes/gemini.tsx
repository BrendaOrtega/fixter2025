import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "~/components/common/NavBar";
import SimpleFooter from "~/components/common/SimpleFooter";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { sendWebinarCongrats } from "~/mailSenders/sendWebinarCongrats";

export const meta = () =>
  getMetaTags({
    title: "Domina Gemini CLI como un experto | FixterGeek",
    description:
      "Aprende a usar Gemini CLI como un power user: comandos avanzados, automatización y flujos de trabajo optimizados. Taller especializado desde septiembre 2025",
  });

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "webinar_registration") {
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const phone = String(formData.get("phone"));
    const experienceLevel = String(formData.get("experienceLevel"));
    const contextObjective = String(formData.get("contextObjective"));

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
            "gemini_septiembre",
            "newsletter",
            `level-${experienceLevel}`,
            `context-${contextObjective}`,
          ],
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "gemini_2025",
            webinarDate: "2025-09-15T19:00:00-06:00",
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: ["gemini_septiembre"] },
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "gemini_2025",
            webinarDate: "2025-09-15T19:00:00-06:00",
          },
        },
      });

      // Send confirmation email
      await sendWebinarCongrats({
        to: email,
        webinarTitle: "Domina Gemini CLI como un Experto",
        webinarDate: "Próximamente - Septiembre 2025",
        userName: name,
      });

      return data({
        success: true,
        type: "webinar",
        message: "Registro exitoso para el taller",
      });
    } catch (error) {
      console.error("Error registering for gemini workshop:", error);
      return data({
        success: false,
        error: "Error en el registro. Intenta nuevamente.",
      });
    }
  }

  return data({ success: false });
};

export default function GeminiLanding() {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const fetcher = useFetcher();

  // Handle escape key to close forms and block scroll
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowWebinarForm(false);
      }
    };

    if (showWebinarForm) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [showWebinarForm]);

  // Webinar Form Component
  const WebinarForm = () => {
    const isSuccess = fetcher.data?.success && fetcher.data?.type === "webinar";
    const error = fetcher.data?.error;
    const isLoading = fetcher.state !== "idle";

    // Activar confetti cuando hay éxito
    if (isSuccess && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={() => setShowWebinarForm(false)}
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          exit={{ y: 50 }}
          className={`bg-background rounded-2xl p-8 max-w-md w-full border text-center ${
            isSuccess ? "border-brand-500/30" : "border-brand-500/30"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isSuccess ? "¡Registro Exitoso!" : "Regístrate al Taller"}
            </h3>
            <button
              onClick={() => setShowWebinarForm(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {isSuccess ? (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-300 mb-6">
                Te has registrado exitosamente. Te notificaremos cuando esté
                disponible el taller de Gemini CLI.
              </p>
              <button
                onClick={() => setShowWebinarForm(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <fetcher.Form method="post" action="/gemini" className="space-y-3">
              <input type="hidden" name="intent" value="webinar_registration" />

              <div>
                <label className="block text-white mb-1 text-left">
                  Nombre
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-white mb-1 text-left">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-white mb-1 text-left">
                  Teléfono (opcional)
                </label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="+52 1 234 567 8900"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white mb-1 text-xs text-left">
                    Nivel
                  </label>
                  <select
                    name="experienceLevel"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                  >
                    <option value="">Selecciona...</option>
                    <option value="junior">Junior (0-2 años)</option>
                    <option value="mid">Mid-level (2-5 años)</option>
                    <option value="senior">Senior (5+ años)</option>
                    <option value="lead">Lead/Manager</option>
                    <option value="student">Estudiante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-1 text-xs text-left">
                    Ocupación
                  </label>
                  <select
                    name="contextObjective"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                  >
                    <option value="">Selecciona...</option>
                    <option value="empleado">Empleado en empresa</option>
                    <option value="freelancer">Freelancer independiente</option>
                    <option value="startup">Startup/Emprendimiento</option>
                    <option value="estudiante">Estudiante/Aprendiendo</option>
                    <option value="consultor">Consultor/Servicios</option>
                    <option value="team-lead">Líder de equipo</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}
              <br />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-500 mt-10 rounded-full text-brand-900 font-bold py-4 px-8 text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    Registrando...
                  </div>
                ) : (
                  "Notificarme cuando esté listo 🚀"
                )}
              </button>
            </fetcher.Form>
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Form Modal */}
      <AnimatePresence>{showWebinarForm && <WebinarForm />}</AnimatePresence>

      {/* Confetti */}
      {showConfetti && (
        <EmojiConfetti
          emojis={["🤖", "⚡", "🚀", "💎", "🎯", "✨", "🔥"]}
          small
        />
      )}

      {/* Hero Section Full Screen */}
      <section className="relative min-h-screen text-white overflow-hidden flex items-center justify-center py-20">
        <div className="absolute inset-0 bg-stars bg-no-repeat bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-indigo-900/50"></div>

        <div className="relative container mx-auto px-4 text-center max-w-6xl">
          {/* Badge PRÓXIMAMENTE */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-700/30 to-blue-500/30 border border-purple-500 rounded-full px-6 py-3 mb-8"
          >
            <span className="animate-pulse h-3 w-3 bg-purple-500 rounded-full"></span>
            <span className="text-base font-bold text-white">
              🚀 PRÓXIMAMENTE - SEPTIEMBRE 2025
            </span>
            <span className="bg-white text-black text-xs font-black px-2 py-1 rounded-full">
              EARLY ACCESS
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight"
          >
            Domina{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Gemini CLI
            </span>
            <br />
            como un Experto
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-colorParagraph font-light mb-8 max-w-4xl mx-auto"
          >
            Automatiza tu flujo de trabajo con el CLI oficial de Google Gemini.
            Aprende comandos avanzados, scripting inteligente y técnicas que
            optimizarán tu productividad.
          </motion.p>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur border border-purple-500/20 rounded-xl p-6">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                CLI Oficial
              </h3>
              <p className="text-gray-300 text-sm">
                Herramienta oficial de Google para interactuar con Gemini
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur border border-blue-500/20 rounded-xl p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Automatización
              </h3>
              <p className="text-gray-300 text-sm">
                Scripts y flujos automatizados para tareas repetitivas
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur border border-indigo-500/20 rounded-xl p-6">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Productividad
              </h3>
              <p className="text-gray-300 text-sm">
                Técnicas avanzadas para maximizar tu eficiencia
              </p>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="bg-gradient-to-r from-purple-500/20 via-blue-600/20 to-indigo-700/20 backdrop-blur border-2 border-purple-500/50 rounded-3xl p-8 max-w-2xl mx-auto"
          >
            <div className="text-4xl mb-4">💎</div>
            <h2 className="text-2xl font-bold mb-4 text-white">
              Sé el primero en acceder
            </h2>
            <p className="text-gray-200 mb-6">
              Regístrate ahora y te notificaremos cuando esté disponible el
              taller. Únete a una comunidad de desarrolladores curiosos que
              comparten la pasión por aprender nuevas tecnologías.
            </p>

            <div className="flex flex-col gap-4">
              <motion.a
                href="/cursos/domina-gemini-cli/detalle"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all shadow-xl text-center"
              >
                📚 Ver detalles del curso
              </motion.a>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowWebinarForm(true)}
                className="bg-gradient-to-r from-purple-500/20 to-blue-600/20 border-2 border-purple-500 text-white font-bold py-3 px-6 rounded-full text-base transition-all shadow-xl"
              >
                🔔 Notificarme cuando esté listo
              </motion.button>
            </div>

            <div className="text-center">
              <p className="text-purple-300 font-medium text-sm">
                📅 Septiembre 2025 • 100% Práctico • En Español
              </p>
            </div>
          </motion.div>

          {/* Course Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                💎 Lo que incluye este curso
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-purple-400 text-xl">📚</span>
                    <div>
                      <h4 className="text-white font-semibold">5 Módulos Completos</h4>
                      <p className="text-gray-300 text-sm">Desde fundamentos hasta casos profesionales avanzados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">⏱️</span>
                    <div>
                      <h4 className="text-white font-semibold">6+ Horas de Contenido</h4>
                      <p className="text-gray-300 text-sm">Material práctico y ejercicios hands-on</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-400 text-xl">🎯</span>
                    <div>
                      <h4 className="text-white font-semibold">Casos Reales</h4>
                      <p className="text-gray-300 text-sm">Ejemplos del mundo real, no teoría</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-xl">🤖</span>
                    <div>
                      <h4 className="text-white font-semibold">CLI Oficial</h4>
                      <p className="text-gray-300 text-sm">Herramienta directa de Google</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 text-xl">💰</span>
                    <div>
                      <h4 className="text-white font-semibold">Precio: $1,490 MXN</h4>
                      <p className="text-gray-300 text-sm">Inversión única, conocimiento para toda la vida</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-pink-400 text-xl">🚀</span>
                    <div>
                      <h4 className="text-white font-semibold">En Español</h4>
                      <p className="text-gray-300 text-sm">100% contenido en tu idioma nativo</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <motion.a
                  href="/cursos/domina-gemini-cli/detalle"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-block bg-white text-purple-900 font-bold py-3 px-6 rounded-full transition-all shadow-lg hover:shadow-xl"
                >
                  Ver temario completo →
                </motion.a>
              </div>
            </div>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-12 text-center"
          >
            <p className="text-gray-400 text-sm">
              🔗 Basado en:{" "}
              <a
                href="https://github.com/google-gemini/gemini-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                github.com/google-gemini/gemini-cli
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <SimpleFooter />
    </>
  );
}
