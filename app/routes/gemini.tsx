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
      "Aprende a usar Gemini CLI como un power user: comandos avanzados, automatización y flujos de trabajo optimizados. Webinar gratuito y taller modular desde $999 MXN",
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
            "gemini_webinar_septiembre",
            "newsletter",
            `level-${experienceLevel}`,
            `context-${contextObjective}`,
          ],
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "gemini_2025",
            webinarDate: "2025-09-12T19:00:00-06:00",
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: ["gemini_webinar_septiembre"] },
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "gemini_2025",
            webinarDate: "2025-09-12T19:00:00-06:00",
          },
        },
      });

      // Send confirmation email
      await sendWebinarCongrats({
        to: email,
        webinarTitle: "Domina Gemini CLI: Webinar Gratuito",
        webinarDate: "Jueves 12 de Septiembre, 7:00 PM (CDMX)",
        userName: name,
      });

      return data({
        success: true,
        type: "webinar",
        message: "Registro exitoso para el webinar gratuito",
      });
    } catch (error) {
      console.error("Error registering for gemini workshop:", error);
      return data({
        success: false,
        error: "Error en el registro. Intenta nuevamente.",
      });
    }
  }

  if (intent === "direct_checkout") {
    const selectedModules = JSON.parse(String(formData.get("selectedModules")));
    const totalPrice = Number(formData.get("totalPrice"));

    try {
      // Create Stripe checkout session with dynamic pricing directly
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
          selectedModules: JSON.stringify(selectedModules),
          totalPrice: String(totalPrice),
          type: "gemini-workshop-direct",
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: `Taller Gemini CLI - ${selectedModules.length} sesiones${
                  selectedModules.length === 3 ? " + Acceso Perpetuo" : ""
                }`,
                description: `${
                  selectedModules.length === 3
                    ? "Paquete completo con ACCESO PERPETUO a futuras sesiones incluido. "
                    : ""
                }Sesiones seleccionadas: ${selectedModules
                  .map((id) => {
                    const modules = [
                      { id: 1, title: "Introducción y Configuración Avanzada" },
                      { id: 2, title: "Automatización y Scripting" },
                      { id: 3, title: "Integración con Herramientas y APIs" },
                    ];
                    return modules.find((m) => m.id === id)?.title;
                  })
                  .filter(Boolean)
                  .join(", ")}${
                  selectedModules.length === 3
                    ? ". INCLUYE: Acceso perpetuo a todas las futuras sesiones y actualizaciones del curso"
                    : ""
                }`,
              },
              unit_amount: totalPrice * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/gemini?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/gemini?cancel=1`,
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
      console.error("Error creating direct checkout session:", error);
      return data({
        success: false,
        error: "Error al procesar el pago. Intenta nuevamente.",
      });
    }
  }

  return data({ success: false });
};

export default function GeminiLanding() {
  const [selectedModules, setSelectedModules] = useState<number[]>([1, 2, 3]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWebinarForm, setShowWebinarForm] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentCancel, setShowPaymentCancel] = useState(false);
  const fetcher = useFetcher();

  // Check for payment result in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "1") {
      setShowPaymentSuccess(true);
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setShowPaymentSuccess(false);
      }, 8000);
      // Clean URL
      window.history.replaceState({}, "", "/gemini");
    }
    if (urlParams.get("cancel") === "1") {
      setShowPaymentCancel(true);
      setTimeout(() => setShowPaymentCancel(false), 5000);
      // Clean URL
      window.history.replaceState({}, "", "/gemini");
    }
  }, []);

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

  // Modules definition
  const modules = [
    {
      id: 1,
      title: "Sesión 1: Introducción y Configuración Avanzada",
      date: "Martes 23 Septiembre • 2 horas • 7:00 PM",
      topics: [
        "Setup completo de Gemini CLI",
        "Configuración avanzada de entornos",
        "Comandos esenciales y shortcuts",
        "Optimización del flujo de trabajo",
      ],
      price: 999,
    },
    {
      id: 2,
      title: "Sesión 2: Automatización y Scripting",
      date: "Jueves 25 Septiembre • 2 horas • 7:00 PM",
      topics: [
        "Scripts automatizados con Gemini CLI",
        "Integración con bash y zsh",
        "Pipelines y workflows complejos",
        "Casos de uso empresariales",
      ],
      price: 999,
    },
    {
      id: 3,
      title: "Sesión 3: Integración con Herramientas y APIs",
      date: "Martes 30 Septiembre • 2 horas • 7:00 PM",
      topics: [
        "Conexión con APIs externas",
        "Integración con GitHub",
        "Automatización de CI/CD",
        "Herramientas de productividad",
      ],
      price: 999,
    },
  ];

  const calculateTotalPrice = () => {
    if (selectedModules.length === 3) return 2490;
    return selectedModules.length * 999;
  };

  const toggleModule = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

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
            isSuccess ? "border-purple-500/30" : "border-purple-500/30"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isSuccess
                ? "¡Registro Exitoso!"
                : "Regístrate al Webinar Gratuito"}
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
                Te has registrado exitosamente al webinar gratuito. Te
                enviaremos los detalles por email.
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
                  className="w-full px-4 h-12 rounded-lg bg-purple-500/5 text-white border-none focus:border-purple-500 focus:ring-0 focus:outline-none"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-white mb-1 text-left">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-purple-500/5 text-white border-none focus:border-purple-500 focus:ring-0 focus:outline-none"
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
                  className="w-full px-4 h-12 rounded-lg bg-purple-500/5 text-white border-none focus:border-purple-500 focus:ring-0 focus:outline-none"
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
                    className="w-full px-2 h-12 rounded-lg bg-purple-500/5 text-white border-none focus:border-purple-500 focus:ring-0 focus:outline-none text-xs"
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
                    className="w-full px-2 h-12 rounded-lg bg-purple-500/5 text-white border-none focus:border-purple-500 focus:ring-0 focus:outline-none text-xs"
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
                className="w-full bg-gradient-to-r from-purple-500 to-blue-600 mt-10 rounded-full text-white font-bold py-4 px-8 text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Registrando...
                  </div>
                ) : (
                  "Reservar mi lugar"
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
      <NavBar />

      {/* Form Modals */}
      <AnimatePresence>
        {showWebinarForm && <WebinarForm />}
        {showPaymentSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentSuccess(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                ¡Pago Completado!
              </h3>
              <p className="text-gray-300 mb-4">
                Tu inscripción al taller ha sido confirmada exitosamente.
              </p>
              <p className="text-gray-300 mb-6">
                Te enviaremos todos los detalles por email, incluyendo enlaces
                de Zoom y material preparatorio.
              </p>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                ¡Perfecto!
              </button>
            </motion.div>
          </motion.div>
        )}
        {showPaymentCancel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentCancel(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Pago Cancelado
              </h3>
              <p className="text-gray-300 mb-4">
                No te preocupes, tu reserva sigue disponible.
              </p>
              <p className="text-gray-300 mb-6">
                Puedes completar tu inscripción cuando quieras. Los lugares se
                liberan después de 24 horas.
              </p>
              <button
                onClick={() => setShowPaymentCancel(false)}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti cuando completan el paquete */}
      {showConfetti && (
        <EmojiConfetti
          emojis={["🎉", "🎊", "✨", "🎁", "💰", "🚀", "⭐"]}
          small
        />
      )}

      {/* Hero Section con Webinar CTA */}
      <section className="relative min-h-screen text-white overflow-hidden">
        <div className="absolute inset-0 bg-stars bg-no-repeat bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-indigo-900/50"></div>

        {/* UFO animations */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{
            x: [null, 1400],
            opacity: [0, 1, 1, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
            delay: 2,
          }}
          className="absolute top-1/4 left-0 text-4xl z-10"
        >
          🛸
        </motion.div>

        <motion.div
          initial={{ x: -80, opacity: 0 }}
          animate={{
            x: [null, 1380],
            opacity: [0, 1, 1, 0],
            rotate: [0, -360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
            delay: 8,
          }}
          className="absolute top-3/4 left-0 text-3xl z-10"
        >
          🛸
        </motion.div>

        {/* Additional UFOs for more space atmosphere */}
        <motion.div
          animate={{
            y: [-30, 30, -30],
            x: [-10, 10, -10],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-1/3 right-20 text-2xl opacity-40"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            y: [40, -40, 40],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
          className="absolute top-2/3 right-1/4 text-3xl opacity-25"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            y: [-25, 25, -25],
            x: [15, -15, 15],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 10,
          }}
          className="absolute top-1/2 left-1/4 text-2xl opacity-30"
        >
          🛸
        </motion.div>

        <div className="relative container mx-auto px-4 pt-20 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge URGENTE */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-700/30 to-blue-500/30 border border-purple-500 rounded-full px-6 py-3 mb-8"
            >
              <span className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></span>
              <span className="text-base font-bold text-white">
                ⚠️ EL 62% DE DEVELOPERS TEMEN SER REEMPLAZADOS POR AI
              </span>
              <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full animate-pulse">
                TÚ PUEDES DOMINARLA
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight">
              La diferencia entre un developer jr y un senior ya no son años,
              <br />
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                son las herramientas de IA.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 font-light mb-8 max-w-4xl mx-auto leading-relaxed">
              Mientras otros developers sienten ansiedad por la revolución AI,
              tú tendrás el{" "}
              <strong className="text-white">CLI oficial de Google</strong> para
              automatizar, crear y destacar.
              <br />
              <br />
              <span className="text-yellow-400 font-medium">
                ✨ Sé parte del 10% que domina la IA en México, no del 90% que
                le teme.
              </span>
            </p>

            {/* Main CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-purple-500/20 via-blue-600/20 to-indigo-700/20 backdrop-blur border-2 border-purple-500 rounded-3xl p-10 mb-12 max-w-4xl mx-auto shadow-2xl"
            >
              {/* Badge NUEVO flotante */}
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-500 to-blue-700 text-white font-black px-6 py-3 rounded-full text-lg shadow-lg"
              >
                🆕 SEPTIEMBRE
              </motion.div>

              <h2 className="text-3xl font-black mb-6 text-white">
                🛡️ Asegura tu futuro profesional HOY
              </h2>

              <div className="bg-black/30 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <span className="text-3xl">📅</span>
                  <p className="text-white font-bold text-xl">
                    WEBINAR: Jueves 12 de Septiembre • 7:00 PM (CDMX)
                  </p>
                </div>
                <p className="text-gray-200 text-lg mb-4">
                  Los equipos tech ya están adoptando herramientas oficiales de
                  IA. Quienes dominen Gemini CLI tendrán ventaja sobre quienes
                  siguen con flujos manuales.
                  <br />
                  <br />
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg">✓</span>
                      <span className="text-gray-300 text-base">
                        Cómo ser parte del 10% que domina IA
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg">✓</span>
                      <span className="text-gray-300 text-base">
                        Cómo posicionarte como líder técnico
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg">✓</span>
                      <span className="text-gray-300 text-base">
                        Automatiza 80% de tu trabajo repetitivo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-lg">✓</span>
                      <span className="text-gray-300 text-base">
                        Casos reales y sesión de Q&A en vivo
                      </span>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWebinarForm(true)}
                  className="w-full bg-white text-purple-500 font-bold py-4 px-8 rounded-full text-lg transition-all shadow-xl relative overflow-hidden"
                >
                  <span className="relative z-10">
                    Asegurar mi lugar en el webinar gratuito
                  </span>
                </motion.button>
              </div>

              <div className="border-t border-purple-500/30 pt-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                  ⚙️ Conviértete en experto de Gemini-CLI
                </h3>
                <p className="text-gray-300 text-lg mb-4">
                  3 sesiones para transformar tu carrera + Acceso perpetuo a
                  futuras sesiones
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Por módulo</div>
                    <div className="text-lg font-bold text-white">$999 MXN</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 border border-purple-400">
                    <div className="text-xs text-yellow-400 mb-1">
                      ¡MEJOR PRECIO!
                    </div>
                    <div className="text-lg font-bold text-white">
                      $2,490 MXN
                    </div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Ahorras</div>
                    <div className="text-lg font-bold text-green-400">
                      $507 MXN
                    </div>
                  </div>
                </div>
                <a
                  href="#temario"
                  className="text-purple-400 hover:text-purple-300 font-medium underline"
                >
                  Ver temario completo del taller →
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Temario Modular */}
      <section
        id="temario"
        className="py-12 bg-background relative overflow-hidden"
      >
        {/* Floating UFOs for temario section */}
        <motion.div
          animate={{
            y: [-20, 20, -20],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-10 right-10 text-2xl opacity-30"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            y: [20, -20, 20],
            rotate: [0, -15, 15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute bottom-20 left-10 text-2xl opacity-20"
        >
          🛸
        </motion.div>
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">
              Transforma tu carrera en 3 sesiones + sesión privada
            </h2>
            <p className="text-lg text-gray-200 font-light mb-6">
              De <span className="text-red-400">temer a la IA</span> a{" "}
              <span className="text-green-400">ser el experto</span>
            </p>

            {/* Precio total dinámico */}
            {selectedModules.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto mb-8"
              >
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/20 border border-purple-500/50 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg text-white">
                      {selectedModules.length} sesión(es) seleccionada(s)
                    </span>
                    <span className="text-2xl font-bold text-white">
                      ${calculateTotalPrice()} MXN
                    </span>
                  </div>
                  {selectedModules.length === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4"
                    >
                      <p className="text-green-400 font-bold text-sm">
                        🎉 ¡Paquete completo! Ahorras $507 MXN + Acceso perpetuo
                        incluido
                      </p>
                    </motion.div>
                  )}
                  <fetcher.Form method="post" className="w-full">
                    <input
                      type="hidden"
                      name="intent"
                      value="direct_checkout"
                    />
                    <input
                      type="hidden"
                      name="selectedModules"
                      value={JSON.stringify(selectedModules)}
                    />
                    <input
                      type="hidden"
                      name="totalPrice"
                      value={calculateTotalPrice()}
                    />
                    <button
                      type="submit"
                      disabled={
                        selectedModules.length === 0 || fetcher.state !== "idle"
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fetcher.state !== "idle" ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          Procesando...
                        </div>
                      ) : selectedModules.length === 0 ? (
                        "Selecciona al menos un módulo"
                      ) : (
                        `🚀 Inscribirme ahora - $${calculateTotalPrice()} MXN`
                      )}
                    </button>
                  </fetcher.Form>
                </div>
              </motion.div>
            )}
          </div>

          {/* Módulos del taller */}
          <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto mb-8">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onClick={() => toggleModule(module.id)}
                className={`relative cursor-pointer rounded-2xl p-6 transition-all ${
                  selectedModules.includes(module.id)
                    ? "bg-gradient-to-br from-purple-500/20 to-blue-600/20 border-2 border-purple-500"
                    : "bg-gray-800/50 border border-gray-700 hover:border-purple-500/50"
                }`}
              >
                {/* Checkbox indicator */}
                <div className="absolute top-4 right-4">
                  <motion.div
                    animate={{
                      scale: selectedModules.includes(module.id)
                        ? [1, 1.2, 1]
                        : 1,
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedModules.includes(module.id)
                        ? "bg-purple-500 border-purple-500"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedModules.includes(module.id) && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </motion.div>
                </div>

                <h3 className="text-lg font-bold text-white mb-3 pr-8">
                  {module.title}
                </h3>
                <p className="text-sm text-purple-400 font-medium mb-4">
                  {module.date}
                </p>
                <ul className="space-y-2 mb-4">
                  {module.topics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span className="text-gray-300 text-sm">{topic}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xl font-bold text-white">
                    ${module.price} MXN
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bonus Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500 rounded-2xl p-8 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="text-5xl mb-4"
              >
                🎁
              </motion.div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                whileInView={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ 
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                  delay: 0.2 
                }}
                viewport={{ once: true }}
              >
                <motion.h3 
                  className="text-2xl font-bold text-white mb-4 text-center"
                  initial={{ rotateX: -15 }}
                  whileInView={{ rotateX: 0 }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 400,
                    delay: 0.4
                  }}
                >
                  🎁 BONUS EXCLUSIVO DEL PAQUETE COMPLETO
                </motion.h3>
                <motion.p 
                  className="text-gray-200 mb-8 text-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{
                    type: "spring",
                    damping: 30,
                    stiffness: 200,
                    delay: 0.6
                  }}
                >
                  Al inscribirte a las 3 sesiones, estos beneficios premium son tuyos:
                </motion.p>
              </motion.div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -100, rotateY: -25 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ 
                    type: "spring",
                    damping: 25,
                    stiffness: 200,
                    delay: 0.3 
                  }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.03, 
                    y: -8,
                    rotateY: 2,
                    transition: {
                      type: "spring",
                      damping: 15,
                      stiffness: 400
                    }
                  }}
                  className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 8,
                      stiffness: 100,
                      repeat: Infinity,
                      duration: 12
                    }}
                    whileHover={{
                      scale: 1.3,
                      rotate: 180,
                      transition: {
                        type: "spring",
                        damping: 10,
                        stiffness: 300
                      }
                    }}
                    className="text-3xl mb-4 inline-block"
                  >
                    🔄
                  </motion.div>
                  <motion.h4 
                    className="text-xl font-bold text-white mb-3 group-hover:text-blue-400"
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    Acceso Perpetuo
                  </motion.h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Acceso de por vida a todas las futuras sesiones y actualizaciones del curso. 
                    Nunca te quedarás atrás con las nuevas versiones y características de Gemini CLI.
                  </p>
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100"
                    animate={{ 
                      scale: [0.8, 1.8, 0.8],
                      opacity: [0.2, 1, 0.2]
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 6,
                      stiffness: 200,
                      repeat: Infinity,
                      duration: 3
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100"
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 300
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 100, rotateY: 25 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ 
                    type: "spring",
                    damping: 25,
                    stiffness: 200,
                    delay: 0.4 
                  }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.03, 
                    y: -8,
                    rotateY: -2,
                    transition: {
                      type: "spring",
                      damping: 15,
                      stiffness: 400
                    }
                  }}
                  className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                >
                  <motion.div
                    animate={{ 
                      y: [-4, 6, -4],
                      rotate: [-2, 2, -2],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 12,
                      stiffness: 150,
                      repeat: Infinity,
                      duration: 4
                    }}
                    whileHover={{
                      y: -6,
                      scale: 1.2,
                      rotate: 5,
                      transition: {
                        type: "spring",
                        damping: 8,
                        stiffness: 400
                      }
                    }}
                    className="text-3xl mb-4 inline-block"
                  >
                    👨‍💻
                  </motion.div>
                  <motion.h4 
                    className="text-xl font-bold text-white mb-3 group-hover:text-purple-400"
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    Sesión Privada 1:1 <span className="text-purple-400">(30 min)</span>
                  </motion.h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Sesión personalizada con el instructor para resolver dudas específicas 
                    de tu proyecto, optimizar tu flujo de trabajo o profundizar en casos de uso avanzados.
                  </p>
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100"
                    animate={{ 
                      scale: [0.8, 1.8, 0.8],
                      opacity: [0.2, 1, 0.2]
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 6,
                      stiffness: 200,
                      repeat: Infinity,
                      duration: 3,
                      delay: 0.5
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100"
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 300
                    }}
                  />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  damping: 20,
                  stiffness: 200,
                  delay: 0.5 
                }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.02,
                  y: -4,
                  transition: {
                    type: "spring",
                    damping: 12,
                    stiffness: 400
                  }
                }}
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl p-6 text-center relative overflow-hidden cursor-pointer group"
              >
                <motion.div
                  animate={{
                    opacity: [0.3, 0.9, 0.3],
                    scale: [0.98, 1.08, 0.98],
                  }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 100,
                    repeat: Infinity,
                    duration: 4
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl"
                />
                <div className="relative z-10">
                  <motion.span 
                    animate={{ 
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1],
                      y: [0, -2, 0]
                    }}
                    transition={{ 
                      type: "spring",
                      damping: 8,
                      stiffness: 200,
                      repeat: Infinity,
                      duration: 5,
                      delay: 1
                    }}
                    whileHover={{
                      rotate: [0, 360],
                      scale: 1.3,
                      transition: {
                        type: "spring",
                        damping: 10,
                        stiffness: 300,
                        duration: 1
                      }
                    }}
                    className="text-2xl inline-block mr-2"
                  >
                    💰
                  </motion.span>
                  <motion.span 
                    className="text-yellow-400 font-bold text-lg"
                    whileHover={{
                      scale: 1.05,
                      transition: {
                        type: "spring",
                        damping: 15,
                        stiffness: 400
                      }
                    }}
                  >
                    Valor total de estos bonus: $1,500 MXN
                  </motion.span>
                  <motion.p 
                    className="text-white font-semibold mt-2"
                    animate={{
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      type: "spring",
                      damping: 20,
                      stiffness: 100,
                      repeat: Infinity,
                      duration: 3,
                      delay: 2
                    }}
                  >
                    ✨ Incluidos GRATIS con tu paquete completo
                  </motion.p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Por qué Gemini CLI Section */}
      <section className="py-16 bg-background relative overflow-hidden">
        {/* UFOs for this section */}
        <motion.div
          animate={{
            y: [-15, 15, -15],
            rotate: [0, 360],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 right-5 text-2xl opacity-20"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            x: [-20, 20, -20],
            y: [10, -10, 10],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute bottom-1/4 left-5 text-3xl opacity-15"
        >
          🛸
        </motion.div>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 text-white">
              ¿Por qué Gemini CLI?
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Columna izquierda - Es para ti */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-green-500/20 border border-green-500/30 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span>🤓</span> Tu nueva realidad será... 🤖
                </h3>
                <div className="space-y-4">
                  {[
                    "Ser el developer que todos consultan sobre AI",
                    "Automatizar 80% de tu trabajo y enfocarte en crear",
                    "Tener ventaja competitiva en entrevistas de trabajo",
                    "Estar entre el 10% que domina AI en LATAM",
                    "Sentirte seguro sobre tu futuro profesional",
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                    >
                      <span className="text-green-400 text-xl">😎</span>
                      <p className="text-gray-200 font-medium">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Columna derecha - No es para ti */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-red-500/20 border border-red-500/30 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span>😰</span> Si te sientes así, es NORMAL...
                </h3>
                <div className="space-y-4">
                  {[
                    "Sientes ansiedad cuando ves noticias sobre AI",
                    "Te preocupa que tu trabajo se vuelva obsoleto",
                    "Ves que otros developers avanzan más rápido que tú",
                    "No sabes cómo empezar con herramientas de AI",
                    "Temes quedarte atrás en tu carrera tech",
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <span className="text-orange-400 text-xl">😔</span>
                      <p className="text-gray-200 font-medium">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="text-center md:text-left">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-4xl mb-4"
                  >
                    🚀
                  </motion.div>
                  <h4 className="text-2xl font-bold text-white mb-4">
                    Únete a la comunidad
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-purple-500/10 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-400">
                        8+
                      </div>
                      <div className="text-xs text-gray-300">
                        Años formando devs
                      </div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        2K+
                      </div>
                      <div className="text-xs text-gray-300">En comunidad</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowWebinarForm(true)}
                    className="w-full bg-white text-purple-500 font-bold py-3 px-6 rounded-full transition-all"
                  >
                    🎯 Empieza con el Webinar Gratuito
                  </motion.button>
                </div>

                <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex text-yellow-400">⭐⭐⭐⭐⭐</div>
                    <a
                      href="https://www.linkedin.com/in/reloadercf/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-300 hover:text-purple-400 underline transition-colors"
                    >
                      Verificado
                    </a>
                  </div>
                  <blockquote className="text-gray-200 mb-4 italic">
                    "FixterGeek siempre está a la vanguardia con las mejores
                    herramientas. El taller de Gemini CLI será imperdible."
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <img
                      src="https://i.imgur.com/UP22Uzb.jpg"
                      alt="Carlos Mendoza"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-white font-semibold">
                        Carlos Mendoza
                      </div>
                      <div className="text-xs text-gray-400">
                        Fullstack Developer
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Casos de Éxito Reales */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 text-white">
              Casos reales de automatización con Gemini CLI
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Análisis de código 10x más rápido",
                  before: "3 horas revisando PRs manualmente",
                  after: "15 minutos con scripts automatizados",
                  savings: "2.5 horas por día",
                  icon: "⚡",
                },
                {
                  title: "Generación de documentación",
                  before: "2 días escribiendo docs técnicas",
                  after: "2 horas con templates automatizados",
                  savings: "14 horas por proyecto",
                  icon: "📚",
                },
                {
                  title: "Testing automatizado",
                  before: "1 semana escribiendo tests",
                  after: "1 día con generación inteligente",
                  savings: "80% menos tiempo",
                  icon: "🧪",
                },
                {
                  title: "Refactoring masivo",
                  before: "3 días refactorizando legacy code",
                  after: "3 horas con análisis AI",
                  savings: "90% más eficiente",
                  icon: "🔧",
                },
              ].map((caso, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6"
                >
                  <div className="text-3xl mb-4">{caso.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {caso.title}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400">❌</span>
                      <div>
                        <p className="text-gray-400 text-sm">Antes:</p>
                        <p className="text-gray-300">{caso.before}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400">✅</span>
                      <div>
                        <p className="text-gray-400 text-sm">Ahora:</p>
                        <p className="text-gray-300">{caso.after}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-500/20">
                    <p className="text-yellow-400 font-bold">
                      Ahorro: {caso.savings}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparación con otras herramientas */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-white">
              ¿Por qué Gemini CLI y no otras herramientas?
            </h2>
            <p className="text-center text-gray-300 mb-12">
              La herramienta oficial de Google vs las alternativas
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="p-4 text-white font-bold">Característica</th>
                    <th className="p-4 text-center">
                      <div className="text-purple-400 font-bold">
                        Gemini CLI
                      </div>
                      <div className="text-xs text-gray-400">
                        Google Official
                      </div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="text-gray-400">ChatGPT</div>
                      <div className="text-xs text-gray-500">OpenAI</div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="text-gray-400">Claude</div>
                      <div className="text-xs text-gray-500">Anthropic</div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="text-gray-400">Copilot</div>
                      <div className="text-xs text-gray-500">GitHub</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: "CLI nativo",
                      gemini: "✅",
                      chatgpt: "❌",
                      claude: "Limitado",
                      copilot: "Parcial",
                    },
                    {
                      feature: "Integración Google Workspace",
                      gemini: "✅",
                      chatgpt: "❌",
                      claude: "❌",
                      copilot: "❌",
                    },
                    {
                      feature: "Contexto de 2M tokens",
                      gemini: "✅",
                      chatgpt: "128K",
                      claude: "200K",
                      copilot: "8K",
                    },
                    {
                      feature: "Automatización bash/zsh",
                      gemini: "✅",
                      chatgpt: "Manual",
                      claude: "Manual",
                      copilot: "❌",
                    },
                    {
                      feature: "Precio mensual",
                      gemini: "$0-20",
                      chatgpt: "$20+",
                      claude: "$20+",
                      copilot: "$10+",
                    },
                    {
                      feature: "APIs ilimitadas",
                      gemini: "✅",
                      chatgpt: "Límites",
                      claude: "Límites",
                      copilot: "❌",
                    },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">{row.feature}</td>
                      <td className="p-4 text-center">
                        <span className="text-green-400 font-bold">
                          {row.gemini}
                        </span>
                      </td>
                      <td className="p-4 text-center text-gray-500">
                        {row.chatgpt}
                      </td>
                      <td className="p-4 text-center text-gray-500">
                        {row.claude}
                      </td>
                      <td className="p-4 text-center text-gray-500">
                        {row.copilot}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl text-center">
              <p className="text-white font-bold text-lg mb-2">
                💡 Gemini CLI es la única herramienta con soporte oficial de
                Google
              </p>
              <p className="text-gray-300">
                Mientras otros usan wrappers no oficiales, tú tendrás acceso
                directo a la API más potente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 text-white">
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Necesito experiencia previa con AI o CLI?",
                  a: "No, empezamos desde cero. Si sabes usar la terminal básica es suficiente. Te enseñaremos todo lo demás paso a paso.",
                },
                {
                  q: "¿Las grabaciones estarán disponibles?",
                  a: "Sí, todas las sesiones se graban y tendrás acceso inmediato. Además, con el paquete completo obtienes acceso perpetuo a futuras actualizaciones.",
                },
                {
                  q: "¿Qué pasa si no puedo asistir en vivo?",
                  a: "No hay problema. Las grabaciones están disponibles 24/7 y puedes hacer preguntas en la comunidad privada de Discord.",
                },
                {
                  q: "¿Gemini CLI es gratis o tiene costo?",
                  a: "Gemini ofrece un tier gratuito generoso (hasta 1500 requests/día). Para uso profesional intensivo hay planes desde $20/mes.",
                },
                {
                  q: "¿Incluye soporte después del taller?",
                  a: "Sí, tendrás acceso a la comunidad privada donde podrás hacer preguntas y compartir experiencias con otros power users.",
                },
                {
                  q: "¿Hay garantía de satisfacción?",
                  a: "Absolutamente. Si en los primeros 7 días no estás satisfecho, te devolvemos el 100% de tu inversión sin preguntas.",
                },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
                >
                  <h3 className="text-lg font-bold text-white mb-3 flex items-start gap-2">
                    <span className="text-purple-400">▸</span>
                    {faq.q}
                  </h3>
                  <p className="text-gray-300 pl-6">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Beneficio Early Bird */}
      <section className="py-16 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-indigo-900/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500 rounded-3xl p-10"
            >
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Recompensa para Early Adopters
              </h3>
              <p className="text-xl text-gray-200 mb-6">
                Como agradecimiento por confiar en nosotros desde el inicio,
                <br />
                tienes acceso al mejor precio disponible.
              </p>
              <div className="bg-black/30 rounded-xl p-6 inline-block">
                <p className="text-lg text-gray-300 mb-2">
                  Precio especial para primeros inscritos:
                </p>
                <p className="text-3xl font-bold text-white">
                  <span className="line-through text-gray-500 text-2xl">
                    $3,490
                  </span>{" "}
                  <span className="text-green-400">$2,490 MXN</span>
                </p>
                <p className="text-sm text-yellow-400 mt-2">
                  Incluye acceso perpetuo + sesión 1:1
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sobre el Instructor */}
      <section className="mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto my-[160px]">
        <div className="bg-gray-900/50 rounded-3xl md:py-10 xl:py-16 md:pl-10 xl:pl-16 pt-6 px-6 w-full relative pb-64 md:pb-16 border border-purple-500/20">
          <div className="w-full md:w-[60%]">
            <span className="text-gray-400/50 font-light">
              ¿Quién es tu instructor?
            </span>
            <h3 className="text-white text-3xl font-bold mt-4">Héctor Bliss</h3>
            <div>
              <p className="text-gray-300 font-light mt-8 text-base md:text-lg">
                Con más de 10 años de experiencia como desarrollador de software
                profesional e instructor tecnológico, Héctor Bliss disfruta de
                simplificar temas complejos para que sus estudiantes puedan
                aprender de la forma más práctica, rápida y divertida. Héctor ha
                sido instructor en diferentes bootcamps internacionales, y ha
                grabado infinidad de cursos en línea. Por medio de{" "}
                <a href="" target="_blank" rel="noreferrer">
                  su canal de youtube
                </a>
                enseña los temas más actualizados de la industria tecnológica,
                acercando las herramientas que usan los profesionales a nivel
                mundial a sus estudiantes de habla hispana.
              </p>
              <p className="text-gray-300 font-light mt-4 text-base md:text-lg">
                Si no has experimentado una clase con Héctor Bliss, es tu
                momento de comprobar que aprender no tiene que ser ni difícil ni
                aburrido.
              </p>
              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-left">
                  <div className="text-2xl font-bold text-purple-400">8+</div>
                  <div className="text-xs text-gray-400/50 font-light">
                    Años enseñando
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-purple-400">2K+</div>
                  <div className="text-xs text-gray-400/50 font-light">
                    En comunidad
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-purple-400">100%</div>
                  <div className="text-xs text-gray-400/50 font-light">
                    Práctico
                  </div>
                </div>
              </div>
              {/* Cita del autor */}
              <div className="mt-8 p-6 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <p className="text-white italic">
                  "Me encanta compartir lo que aprendo en el camino. Si puedo
                  ayudarte a ahorrar tiempo y frustración mientras creces como
                  developer, mi día está completo."
                </p>
                <p className="text-gray-400 mt-3 text-sm font-light">
                  - Héctor Bliss
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-8 md:-right-16">
            <a
              href="https://www.linkedin.com/in/hectorbliss/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.span>
                <svg
                  className="text-3xl absolute -top-1 md:top-2 text-gray-400/50 w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </motion.span>
            </a>
            <a
              href="https://github.com/blissito"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.span>
                <svg
                  className="text-3xl absolute top-16 -left-12 text-gray-400/50 w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </motion.span>
            </a>
            <a
              href="https://x.com/HectorBlisS"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.span>
                <svg
                  className="text-3xl absolute -top-10 left-16 text-gray-400/50 w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </motion.span>
            </a>
            <img
              className="w-60 md:w-[320px] rounded-full"
              src="/courses/titor.png"
              alt="Héctor Bliss"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-stars bg-cover bg-center relative overflow-hidden">
        {/* Filtro de color para igualar el tema purple/blue */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800/80 via-blue-900/85 to-indigo-900/90"></div>
        {/* Final UFOs */}
        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [-20, 20, -20],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-10 left-10 text-4xl opacity-30"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            x: [20, -20, 20],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 7,
          }}
          className="absolute bottom-10 right-10 text-3xl opacity-25"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{
            y: [25, -25, 25],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 12,
          }}
          className="absolute top-1/2 right-1/3 text-2xl opacity-20"
        >
          🛸
        </motion.div>
        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              El momento es AHORA, no mañana
            </h2>
            <p className="text-xl text-gray-200 font-light mb-8 max-w-2xl mx-auto">
              Cada día que pasa, más developers se adelantan. <br />
              <span className="text-yellow-400 font-semibold">
                No seas parte del 90% que se queda atrás.
              </span>
              <br />
              <br />
              Asegura tu lugar en el 10% que domina AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowWebinarForm(true)}
                className="bg-white text-purple-500 font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">
                  Asegurar mi lugar en el webinar gratuito
                </span>
              </motion.button>
              <fetcher.Form method="post" className="inline-block">
                <input type="hidden" name="intent" value="direct_checkout" />
                <input
                  type="hidden"
                  name="selectedModules"
                  value={JSON.stringify([1, 2, 3])}
                />
                <input type="hidden" name="totalPrice" value={2490} />
                <motion.button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur border border-green-400/50 text-green-300 font-bold py-4 px-8 rounded-full text-lg transition-all hover:bg-green-500/30 hover:text-white disabled:opacity-50"
                >
                  {fetcher.state !== "idle" ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Procesando...
                    </div>
                  ) : (
                    "⚙️ ¡Inscribirme al taller ya!"
                  )}
                </motion.button>
              </fetcher.Form>
            </div>
            <div className="mt-8 text-center">
              <p className="text-red-300 text-sm font-bold mb-2">
                ⚠️ 62% de developers temen ser reemplazados por AI
              </p>
              <p className="text-green-300 text-sm font-medium">
                ✅ Pero tú puedes ser parte del 10% que la domina y se beneficia
                de ella
              </p>
              <p className="text-gray-300 text-xs mt-4">
                📅 12 Sept - Webinar GRATIS • 23, 25, 30 Sept - Transformación
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <SimpleFooter />
    </>
  );
}
