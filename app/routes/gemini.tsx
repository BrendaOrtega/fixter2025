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
                name: `Taller Gemini CLI - ${selectedModules.length} sesiones${selectedModules.length === 3 ? ' + Bonus 1:1' : ''}`,
                description: `${selectedModules.length === 3 ? 'Paquete completo con BONUS 1:1 de 30min incluido. ' : ''}Sesiones seleccionadas: ${selectedModules
                  .map((id) => {
                    const modules = [
                      { id: 1, title: "Introducción y Configuración Avanzada" },
                      { id: 2, title: "Automatización y Scripting" },
                      { id: 3, title: "Integración con Herramientas y APIs" },
                    ];
                    return modules.find((m) => m.id === id)?.title;
                  })
                  .filter(Boolean)
                  .join(", ")}${selectedModules.length === 3 ? '. INCLUYE: Sesión privada 1:1 de 30 minutos (valor $1,500 MXN)' : ''}`,
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
        "Integración con GitHub y GitLab",
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
              {isSuccess ? "¡Registro Exitoso!" : "Regístrate al Webinar Gratuito"}
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
                Te has registrado exitosamente al webinar gratuito. Te enviaremos
                los detalles por email.
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
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "linear",
            delay: 2
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
            rotate: [0, -360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear",
            delay: 8
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
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-1/3 right-20 text-2xl opacity-40"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{ 
            y: [40, -40, 40],
            rotate: [0, -180, -360]
          }}
          transition={{ 
            duration: 14, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute top-2/3 right-1/4 text-3xl opacity-25"
        >
          🛸
        </motion.div>

        <motion.div
          animate={{ 
            y: [-25, 25, -25],
            x: [15, -15, 15]
          }}
          transition={{ 
            duration: 16, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 10
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
              No esperes a que{" "}
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                AI te reemplace
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent text-5xl md:text-7xl">
                Domínala primero
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-200 font-light mb-8 max-w-4xl mx-auto leading-relaxed">
              Mientras otros developers sienten ansiedad por la revolución AI, tú tendrás el <strong className="text-white">CLI oficial de Google</strong> para automatizar, crear y destacar. 
              <br /><br />
              <span className="text-yellow-400 font-medium">✨ Sé parte del 10% que domina AI en México, no del 90% que la teme.</span>
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
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📅</span>
                  <p className="text-white font-bold text-lg">
                    Jueves 12 de Septiembre • 7:00 PM (CDMX)
                  </p>
                </div>
                <p className="text-gray-200 mb-4">
                  <strong className="text-yellow-400">CONTEXTO:</strong> Los equipos tech ya están adoptando herramientas oficiales de AI. Quienes dominen Gemini CLI tendrán ventaja sobre quienes siguen con flujos manuales. 
                  <br /><br />
                  En este webinar descubrirás cómo posicionarte como el developer que aporta <strong>eficiencia AI-powered</strong> a cualquier proyecto.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 text-sm">
                        Cómo ser parte del 10% que domina AI
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 text-sm">
                        Estrategias para posicionarte como líder técnico
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 text-sm">
                        Automatiza 80% de tu trabajo repetitivo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 text-sm">
                        Casos reales y sesión de Q&A en vivo
                      </span>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWebinarForm(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all shadow-xl relative overflow-hidden"
                >
                  <span className="relative z-10">Asegurar mi clase de prueba gratis</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                </motion.button>
              </div>

              <div className="border-t border-purple-500/30 pt-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  ⚙️ Conviértete en AI-Powered Developer
                </h3>
                <p className="text-gray-300 mb-4">
                  3 sesiones para transformar tu carrera + Sesión privada 1:1 para acelerar tu crecimiento
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Por módulo</div>
                    <div className="text-lg font-bold text-white">$999 MXN</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 border border-purple-400">
                    <div className="text-xs text-yellow-400 mb-1">¡MEJOR PRECIO!</div>
                    <div className="text-lg font-bold text-white">$2,490 MXN</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Ahorras</div>
                    <div className="text-lg font-bold text-green-400">$507 MXN</div>
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
      <section id="temario" className="py-12 bg-background relative overflow-hidden">
        {/* Floating UFOs for temario section */}
        <motion.div
          animate={{ 
            y: [-20, 20, -20],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          className="absolute top-10 right-10 text-2xl opacity-30"
        >
          🛸
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [20, -20, 20],
            rotate: [0, -15, 15, 0]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 3
          }}
          className="absolute bottom-20 left-10 text-2xl opacity-20"
        >
          🛸
        </motion.div>
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">
              Transforma tu carrera en 30 días
            </h2>
            <p className="text-lg text-gray-200 font-light mb-6">
              De <span className="text-red-400">vulnerable a la automatización</span> a <span className="text-green-400">indispensable en tu equipo</span>
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
                        🎉 ¡Paquete completo! Ahorras $507 MXN + Bonus 1:1 incluido
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
                      disabled={selectedModules.length === 0 || fetcher.state !== "idle"}
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
                      scale: selectedModules.includes(module.id) ? [1, 1.2, 1] : 1,
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
              <h3 className="text-2xl font-bold text-white mb-4">
                BONUS EXCLUSIVO: Sesión 1:1 Privada
              </h3>
              <p className="text-gray-200 mb-6">
                Al inscribirte al paquete completo (3 módulos), recibes una sesión privada
                de 30 minutos donde resolveremos tus dudas específicas y trabajaremos
                en tu proyecto personal con Gemini CLI.
              </p>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-yellow-400 font-bold">
                  Valor: $1,500 MXN • Incluido GRATIS con el paquete completo
                </p>
              </div>
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
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          className="absolute top-1/4 right-5 text-2xl opacity-20"
        >
          🛸
        </motion.div>
        
        <motion.div
          animate={{ 
            x: [-20, 20, -20],
            y: [10, -10, 10]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 4
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
                  <span>🎆</span> Tu nueva realidad será...
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
                      <span className="text-green-400 text-xl">🎆</span>
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
                      <div className="text-2xl font-bold text-purple-400">8+</div>
                      <div className="text-xs text-gray-300">
                        Años formando devs
                      </div>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">2K+</div>
                      <div className="text-xs text-gray-300">En comunidad</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowWebinarForm(true)}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all"
                  >
                    🎯 Empieza con el Webinar Gratuito
                  </motion.button>
                </div>

                <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex text-yellow-400">⭐⭐⭐⭐⭐</div>
                    <span className="text-sm text-gray-300">Verificado</span>
                  </div>
                  <blockquote className="text-gray-200 mb-4 italic">
                    "FixterGeek siempre está a la vanguardia con las mejores
                    herramientas. El taller de Gemini CLI será imperdible."
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop&crop=face"
                      alt="Developer"
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

      {/* Final CTA */}
      <section className="py-20 bg-stars bg-cover bg-center relative overflow-hidden">
        {/* Filtro de color para igualar el tema purple/blue */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800/80 via-blue-900/85 to-indigo-900/90"></div>
        {/* Final UFOs */}
        <motion.div
          animate={{ 
            x: [-30, 30, -30],
            y: [-20, 20, -20],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear"
          }}
          className="absolute top-10 left-10 text-4xl opacity-30"
        >
          🛸
        </motion.div>
        
        <motion.div
          animate={{ 
            x: [20, -20, 20],
            rotate: [0, -180, -360]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 7
          }}
          className="absolute bottom-10 right-10 text-3xl opacity-25"
        >
          🛸
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [25, -25, 25],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 22, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 12
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
              Cada día que pasa, más developers se adelantan. <br/>
              <span className="text-yellow-400 font-semibold">No seas parte del 90% que se queda atrás.</span>
              <br/><br/>
              Asegura tu lugar en el 10% que domina AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowWebinarForm(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-xl relative overflow-hidden"
              >
                <span className="relative z-10">Asegurar mi clase de prueba gratis</span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </motion.button>
              <fetcher.Form method="post" className="inline-block">
                <input type="hidden" name="intent" value="direct_checkout" />
                <input type="hidden" name="selectedModules" value={JSON.stringify([1, 2, 3])} />
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
                    "⚙️ Convertirme en AI Expert"
                  )}
                </motion.button>
              </fetcher.Form>
            </div>
            <div className="mt-8 text-center">
              <p className="text-red-300 text-sm font-bold mb-2">
                ⚠️ 62% de developers temen ser reemplazados por AI
              </p>
              <p className="text-green-300 text-sm font-medium">
                ✅ Pero tú puedes ser parte del 10% que la domina y se beneficia de ella
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