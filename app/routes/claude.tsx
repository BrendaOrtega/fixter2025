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
import { BsGithub, BsLinkedin, BsTwitter } from "react-icons/bs";

export const meta = () =>
  getMetaTags({
    title: "Conviértete en Power User de Claude Code | FixterGeek",
    description:
      "Domina Claude Code como un experto: SDK, MCP, GitHub integration, subagentes y trucos avanzados. Webinar gratis y taller modular desde $999 MXN",
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
    const urgencyTimeline = String(formData.get("urgencyTimeline"));

    try {
      await db.user.upsert({
        where: { email },
        create: {
          email,
          username: name || email.split("@")[0], // Usar name o parte del email como username
          displayName: name,
          phoneNumber: phone || undefined,
          courses: [], // Array vacío requerido
          editions: [], // Array vacío requerido
          roles: [], // Array vacío requerido
          tags: [
            "webinar_agosto",
            "newsletter",
            `level-${experienceLevel}`,
            `context-${contextObjective}`,
            `urgency-${urgencyTimeline}`,
          ],
          webinar: {
            experienceLevel,
            contextObjective,
            urgencyTimeline,
            registeredAt: new Date().toISOString(),
            webinarType: "agosto_2025",
            webinarDate: "2025-08-14T19:00:00-06:00", // Jueves 14 de Agosto, 7:00 PM CDMX
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: "webinar_agosto" },
          webinar: {
            experienceLevel,
            contextObjective,
            urgencyTimeline,
            registeredAt: new Date().toISOString(),
            webinarType: "agosto_2025",
            webinarDate: "2025-08-14T19:00:00-06:00", // Jueves 14 de Agosto, 7:00 PM CDMX
          },
        },
      });

      // Send confirmation email
      await sendWebinarCongrats({
        to: email,
        webinarTitle: "De Junior a Senior con Claude Code",
        webinarDate: "Jueves 14 de Agosto, 7:00 PM (CDMX)",
        userName: name,
      });

      return data({
        success: true,
        type: "webinar",
        message: "Registro exitoso para el webinar",
      });
    } catch (error) {
      console.error("Error registering for webinar:", error);
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
          type: "claude-workshop-direct",
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: `Taller Claude Code - ${selectedModules.length} sesiones`,
                description: `Sesiones seleccionadas: ${selectedModules
                  .map((id) => {
                    const modules = [
                      { id: 1, title: "Fundamentos y Context Management" },
                      { id: 2, title: "MCP y Automatización" },
                      { id: 3, title: "SDK, Subagentes y Scripting" },
                      { id: 4, title: "BONUS: Sesión Privada Individual" },
                    ];
                    return modules.find((m) => m.id === id)?.title;
                  })
                  .filter(Boolean)
                  .join(", ")}`,
              },
              unit_amount: totalPrice * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/claude?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/claude?cancel=1`,
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

export default function ClaudeLanding() {
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
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
      window.history.replaceState({}, "", "/claude");
    }
    if (urlParams.get("cancel") === "1") {
      setShowPaymentCancel(true);
      setTimeout(() => setShowPaymentCancel(false), 5000);
      // Clean URL
      window.history.replaceState({}, "", "/claude");
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
      // Block body scroll when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      // Restore scroll on cleanup
      document.body.style.overflow = "unset";
    };
  }, [showWebinarForm]);

  const modules = [
    {
      id: 1,
      title: "Sesión 1: Fundamentos y Context Management",
      date: "Martes 19 Agosto • 2 horas • 7:00 PM",
      topics: [
        "Setup profesional de Claude Code",
        "Arquitectura de prompts efectivos",
        "Gestión avanzada de contexto y /resume",
        "Optimización de tokens y memoria",
      ],
      price: 999,
    },
    {
      id: 2,
      title: "Sesión 2: SDK, Subagentes y Scripting",
      date: "Jueves 21 Agosto • 2 horas • 7:00 PM",
      topics: [
        "Claude SDK para Python/TypeScript",
        "Subagentes y delegación de tareas",
        "Scripting con TypeScript y Python",
        "Pipelines CI/CD y casos empresariales",
      ],
      price: 999,
    },
    {
      id: 3,
      title: "Sesión 3: MCP y Automatización",
      date: "Martes 26 Agosto • 2 horas • 7:00 PM",
      topics: [
        "MCP con JSON (sin programar)",
        "GitHub MCP: explora miles de repos",
        "Automatización de GitHub Actions",
        "Conectar bases de datos y APIs",
      ],
      price: 999,
    },
    {
      id: 4,
      title: "BONUS: Sesión Privada Individual",
      date: "A programar contigo • 2 horas",
      topics: [
        "Sesión 1:1 personalizada solo para ti",
        "Review de TU proyecto específico con Claude Code",
        "Resolución de tus dudas particulares",
        "Estrategias adaptadas a tu flujo de trabajo",
      ],
      price: 999,
      isBonus: true,
    },
  ];

  const toggleModule = (id: number) => {
    // No permitir seleccionar directamente el BONUS
    if (id === 4) return;

    setSelectedModules((prev) => {
      const newSelection = prev.includes(id)
        ? prev.filter((m) => m !== id)
        : [...prev, id];

      // Auto-agregar BONUS cuando seleccionan las 3 principales
      const mainSessions = newSelection.filter((id) => id <= 3).length;
      const previousMainSessions = prev.filter((id) => id <= 3).length;

      if (mainSessions === 3 && previousMainSessions !== 3) {
        // Activar confetti cuando desbloquean el BONUS
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        return [...newSelection, 4]; // Auto-agregar el BONUS
      }

      if (mainSessions < 3 && previousMainSessions === 3) {
        // Remover BONUS si ya no tienen las 3 principales
        return newSelection.filter((id) => id !== 4);
      }

      return newSelection;
    });
  };

  const calculatePrice = () => {
    if (selectedModules.length === 0) return 0;

    const mainSessions = selectedModules.filter((id) => id <= 3).length;
    const hasBonus = selectedModules.includes(4);

    // Precio base de las principales
    let total = mainSessions * 999;

    // Descuento si toman las 3 sesiones principales
    if (mainSessions === 3) {
      total = 2490; // Precio especial paquete de 3
    }

    // El BONUS siempre está incluido gratis cuando tienen las 3 principales
    // No se suma nada adicional

    return total;
  };

  const getPriceMessage = () => {
    const count = selectedModules.length;
    const mainSessions = selectedModules.filter((id) => id <= 3).length;
    const hasBonus = selectedModules.includes(4);

    if (mainSessions === 3 && hasBonus) {
      return (
        <div>
          <div className="text-2xl font-bold text-yellow-500 mb-2">
            🎉 ¡PAQUETE COMPLETO! 🎉
          </div>
          <div className="text-lg">
            Ahorro total de $507 MXN + Sesión privada 1:1 incluida
          </div>
        </div>
      );
    }
    if (mainSessions === 3 && !hasBonus) {
      return (
        <div>
          <div className="text-xl font-bold text-green-400 mb-2">
            ✅ ¡Paquete de 3 sesiones de 2h cada una!
          </div>
          <div className="text-sm text-gray-400 font-light">Ahorro de $507 MXN</div>
        </div>
      );
    }
    if (mainSessions === 2) {
      return (
        <div className="animate-pulse text-brand-500">
          ⚡ ¡Una más para completar las 3 sesiones con descuento!
        </div>
      );
    }
    return "";
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
          isSuccess 
            ? 'border-brand-500/30' 
            : 'border-brand-500/30'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">
            {isSuccess ? '¡Registro Exitoso!' : 'Regístrate al Webinar'}
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
              Te has registrado exitosamente al webinar. Te enviaremos los detalles por email.
            </p>
            <button
              onClick={() => setShowWebinarForm(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <fetcher.Form method="post" action="/claude" className="space-y-3">
            <input type="hidden" name="intent" value="webinar_registration" />
            
            <div>
              <label className="block text-white mb-1 text-left">Nombre</label>
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
              <label className="block text-white mb-1 text-left">Teléfono (opcional)</label>
              <input
                name="phone"
                type="tel"
                className="w-full px-4 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                placeholder="+52 1 234 567 8900"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-white mb-1 text-xs text-left">Nivel</label>
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
                <label className="block text-white mb-1 text-xs text-left">Ocupación</label>
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
              
              <div>
                <label className="block text-white mb-1 text-xs text-left">Implementación AI</label>
                <select
                  name="urgencyTimeline"
                  className="w-full px-2 h-12 rounded-lg bg-brand-500/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
                >
                  <option value="">Selecciona...</option>
                  <option value="inmediato">🔥 Inmediato</option>
                  <option value="proximas-semanas">⚡ Próximas semanas</option>
                  <option value="proximos-meses">📅 Próximos meses</option>
                  <option value="largo-plazo">🌱 Largo plazo</option>
                </select>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            <br/>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 mt-10  rounded-full text-brand-900 font-bold py-4 px-8 text-lg transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  Registrando...
                </div>
              ) : (
                "Confirmar mi lugar 🎯"
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
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-brand-500/30 text-center"
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
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
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
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-brand-500/30 text-center"
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
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
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
      <section className="relative min-h-screen  text-white overflow-hidden">
        <div className="absolute inset-0 bg-stars bg-no-repeat bg-cover bg-center"></div>

        <div className="relative container mx-auto px-4 pt-20 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge URGENTE */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-700/30 to-brand-500/30 border border-brand-500 rounded-full px-6 py-3 mb-8"
            >
              <span className="animate-pulse h-3 w-3 bg-red-500 rounded-full"></span>
              <span className="text-base font-bold text-white">
                ⏰ WEBINAR GRATIS - Jueves 14 de Agosto - 7:00 PM
              </span>
              <span className="bg-white text-black text-xs font-black px-2 py-1 rounded-full">
                CUPO LIMITADO
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-brand-100">
              Conviértete en Power User de Claude Code
            </h1>

            <p className="text-xl md:text-2xl text-colorParagraph font-light mb-8 max-w-3xl mx-auto">
              Domina las técnicas avanzadas que el 99% de developers no conocen.
              Automatiza tu flujo de trabajo y multiplica tu productividad 10x.
            </p>

            {/* Webinar CTA Principal MEJORADO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative mt-20 bg-gradient-to-r from-brand-500/20 via-brand-600/20 to-brand-700/20 backdrop-blur border-2 border-brand-500 rounded-3xl p-10 mb-12 max-w-3xl mx-auto shadow-2xl"
            >
              {/* Badge GRATIS flotante */}
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-brand-500 to-brand-700 text-white font-black px-6 py-3 rounded-full text-lg shadow-lg"
              >
                100% GRATIS
              </motion.div>

              <h2 className="text-3xl font-black mb-3  text-white">
                🔥 Webinar GRATUITO: "De Junior a Senior con Claude Code"
              </h2>
              <div className="text-brand-300 font-bold text-lg mb-4">
                Sin tarjeta de crédito • Sin compromiso • Sin spam
              </div>
              <p className="text-gray-200 mb-6 text-lg text-left">
                Una sesión de 60 minutos donde te muestro todas las herramientas
                geniales del ecosistema Claude Code.
                <span className="text-brand-500 font-bold">
                  {" "}
                  Verás EN VIVO demos y ejemplos prácticos
                </span>{" "}
                de lo que podrás dominar en el taller completo (3 sesiones de 2h
                cada una + bonus).
              </p>

              <div className="bg-black/30 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎯</span>
                  <p className="text-white font-bold text-lg">
                    Lo que descubrirás en el webinar:
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-brand-500 text-xl flex-shrink-0 mt-0.5">
                        ✨
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          Tour Completo Claude Code
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Funciones avanzadas que el 99% no conoce
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-400 text-xl flex-shrink-0 mt-0.5">
                        🔌
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          MCP y Automatización
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Por qué cambiará tu forma de trabajar para siempre
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-purple-400 text-xl flex-shrink-0 mt-0.5">
                        🤖
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          Subagentes Inteligentes
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Cómo automatizar tareas complejas sin esfuerzo
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-orange-400 text-xl flex-shrink-0 mt-0.5">
                        💻
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          SDK y Scripting
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Integra Claude en tus aplicaciones Python/TS
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400 text-xl flex-shrink-0 mt-0.5">
                        🎁
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          Preview Taller Completo
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Temario de las 3 sesiones + bonus individual
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-xl flex-shrink-0 mt-0.5">
                        🔥
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          Demos EN VIVO
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Casos reales y ejemplos prácticos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWebinarForm(true)}
                  className="bg-brand-500 text-brand-900  font-black py-5 px-10 rounded-full text-xl transition-all shadow-xl"
                >
                  🎯 SÍ, QUIERO MI LUGAR GRATIS
                </motion.button>
                <div className="text-center">
                  <p className="text-[#EEC85A] font-bold text-lg">
                    📅 Jueves 14 de Agosto • 7:00 PM (CDMX)
                  </p>
                  <p className="text-white text-sm mt-1">⚠️ Pocos lugares</p>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  8+ horas
                </div>
                <div className="text-gray-300">de contenido práctico</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  3+1 sesiones
                </div>
                <div className="text-gray-300">
                  2h cada una + sesión privada
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  $999 MXN
                </div>
                <div className="text-gray-300">por sesión individual</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ¿Para quién es este taller? */}
      <section className="py-20  relative overflow-hidden">
      
        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              ¿Es este taller para ti?
            </h2>
            <p className="text-colorParagraph font-light text-lg max-w-2xl mx-auto">
              Descubre si este programa se adapta a tu nivel y objetivos
              profesionales
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* SÍ es para ti */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-grass/10 via-grass/5 to-grass/20 border border-grass/30 rounded-2xl p-8 backdrop-blur-sm hover:border-grass/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="text-3xl"
                >
                  ✅
                </motion.div>
                <h3 className="text-2xl font-bold text-white">
                  SÍ es para ti si...
                </h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: "🚀",
                    text: "Eres developer Jr/Mid con ganas de destacar",
                    delay: 0.1,
                  },
                  {
                    icon: "🔍",
                    text: "Ya probaste Claude pero sientes que no le sacas provecho",
                    delay: 0.2,
                  },
                  {
                    icon: "⚡",
                    text: "Quieres automatizar tareas repetitivas",
                    delay: 0.3,
                  },
                  {
                    icon: "🎯",
                    text: "Buscas ser más productivo sin burnout",
                    delay: 0.4,
                  },
                  {
                    icon: "🤖",
                    text: "Te interesa estar a la vanguardia en AI",
                    delay: 0.5,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: item.delay }}
                    viewport={{ once: true }}
                    whileHover={{
                      scale: 1.02,
                      x: 5,
                      transition: { duration: 0.2 },
                    }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-grass/5 border border-grass/20 hover:border-grass/40 hover:bg-grass/10 transition-all duration-300 cursor-pointer group"
                  >
                    <motion.span
                      className="text-2xl flex-shrink-0"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.icon}
                    </motion.span>
                    <p className="text-gray-200 group-hover:text-white transition-colors duration-300 font-medium leading-relaxed">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* NO es para ti */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-danger/10 via-danger/5 to-danger/20 border border-danger/30 rounded-2xl p-8 backdrop-blur-sm hover:border-danger/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 4,
                  }}
                  className="text-3xl"
                >
                  ❌
                </motion.div>
                <h3 className="text-2xl font-bold text-white">
                  NO es para ti si...
                </h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: "💻",
                    text: "Nunca has usado una terminal",
                    delay: 0.1,
                  },
                  {
                    icon: "📚",
                    text: "Buscas una introducción básica a programación",
                    delay: 0.2,
                  },
                  {
                    icon: "⏰",
                    text: "No tienes tiempo para practicar",
                    delay: 0.3,
                  },
                  {
                    icon: "✨",
                    text: "Esperas resultados mágicos sin esfuerzo",
                    delay: 0.4,
                  },
                  {
                    icon: "🔧",
                    text: "No te interesa mejorar tu flujo de trabajo",
                    delay: 0.5,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: item.delay }}
                    viewport={{ once: true }}
                    whileHover={{
                      scale: 1.02,
                      x: -5,
                      transition: { duration: 0.2 },
                    }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-danger/5 border border-danger/20 hover:border-danger/40 hover:bg-danger/10 transition-all duration-300 cursor-pointer group"
                  >
                    <motion.span
                      className="text-2xl flex-shrink-0 grayscale group-hover:grayscale-0 transition-all duration-300"
                      whileHover={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.icon}
                    </motion.span>
                    <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 font-medium leading-relaxed">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Call to action adicional */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="bg-gradient-to-r from-brand-500/10 to-brand-600/10 border border-brand-500/30 rounded-2xl p-8 max-w-2xl mx-auto">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-4xl mb-4"
              >
                🎯
              </motion.div>
              <h4 className="text-xl font-bold text-white mb-3">
                ¿Aún no estás seguro(a)?
              </h4>
              <p className="text-gray-300 mb-4">
                Asiste al webinar gratuito y descubre si este programa es lo que
                necesitas para tu carrera
              </p>
              <button
                onClick={() => setShowWebinarForm(true)}
                className="bg-brand-500 text-brand-900 font-medium  py-3 px-6 rounded-full transition-all transform hover:scale-105"
              >
                Reservar mi lugar gratuito →
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Temario Modular */}
      <section className="py-12 bg-background relative">
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">
              Inscríbete al taller
            </h2>
            <p className="text-lg text-colorParagraph font-light mb-6">
              Toma las sesiones que necesites o el paquete completo para desbloquear el BONUS
            </p>

            {/* Progress indicator */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-colorParagraph font-light">
                  Sesiones seleccionadas
                </span>
                <span className="text-xs font-light text-colorParagraph">
                  {selectedModules.length}/4
                </span>
              </div>
              <div className="h-2 bg-gray-700/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-700"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(selectedModules.length / 4) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              {selectedModules.filter((id) => id <= 3).length === 2 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-brand-300 mt-1 animate-pulse"
                >
                  ¡Una sesión más para el descuento! 💰
                </motion.p>
              )}
              {selectedModules.filter((id) => id <= 3).length === 3 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-yellow-300 mt-1 font-light"
                >
                  ¡Descuento de $507 activado! 🎉
                </motion.p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto mb-8">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.15, ease: "easeOut" },
                }}
                whileTap={{
                  scale: 0.97,
                  transition: { duration: 0.1 },
                }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => toggleModule(module.id)}
                className={`border rounded-xl p-4 transition-all duration-150 h-full ${
                  module.isBonus
                    ? selectedModules.includes(module.id)
                      ? "border-yellow-500 bg-gradient-to-br from-yellow-400/10 to-yellow-500/5 shadow-xl shadow-yellow-500/20"
                      : "border-brand-600/30 bg-gradient-to-br from-brand-700/10 to-brand-600/10 opacity-60"
                    : selectedModules.includes(module.id)
                    ? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-brand-600/10 shadow-xl shadow-brand-500/20 cursor-pointer"
                    : "border-none bg-brand-600 hover:border-brand-400 hover:bg-brand-600/50 cursor-pointer"
                } ${module.isBonus ? "" : "cursor-pointer"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <motion.div
                        animate={
                          selectedModules.includes(module.id)
                            ? { rotate: [0, -5, 5, -5, 0] }
                            : {}
                        }
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <span
                          className={`text-2xl font-bold text-brand-500`}
                        >
                          {module.isBonus ? "🎁" : module.id}
                        </span>
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {module.isBonus
                            ? module.title
                            : module.title.split(":")[1].trim()}
                        </h3>
                        {module.isBonus && (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-brand-900 font-bold px-2 py-0.5 rounded-full">
                              {selectedModules.includes(module.id)
                                ? "DESBLOQUEADO"
                                : "SE DESBLOQUEA"}
                            </span>
                      
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-xs mt-1 font-light ${
                        module.isBonus ? "text-colorParagraph" : "text-colorParagraph"
                      }`}
                    >
                      {module.date}
                    </p>
                  </div>
                  {module.isBonus ? (
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedModules.includes(module.id)
                          ? "bg-gradient-to-r from-brand-500 to-brand-600 border-brand-500"
                          : "border-brand-600/50 bg-brand-600/10"
                      }`}
                    >
                      {selectedModules.includes(module.id) ? (
                        <span className="text-white text-sm">🎁</span>
                      ) : (
                        <span className="text-brand-700 text-xs">🔒</span>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      animate={
                        selectedModules.includes(module.id)
                          ? { rotate: 360 }
                          : { rotate: 0 }
                      }
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedModules.includes(module.id)
                          ? "bg-gradient-to-r from-brand-500 to-brand-700 border-brand-500"
                          : "border-gray-500 hover:border-brand-400"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {selectedModules.includes(module.id) && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
                <ul className="space-y-2">
                  {module.topics.map((topic, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + idx * 0.02 }}
                      className={`flex items-start ${
                        selectedModules.includes(module.id)
                          ? "text-gray-200 text-base"
                          : "text-gray-400 font-light text-base"
                      }`}
                    >
                      <span
                        className={`mr-2 text-base ${
                          selectedModules.includes(module.id)
                            ? "text-brand-300"
                            : "text-brand-400"
                        }`}
                      >
                        {selectedModules.includes(module.id) ? "✓" : "•"}
                      </span>
                      <span className="leading-relaxed">{topic}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Precio dinámico */}
          {selectedModules.length > 0 && (
            <div className="bg-gradient-to-r from-brand-500/10 to-brand-600/10 border border-brand-500/30 rounded-2xl p-8 max-w-2xl mx-auto text-center">
              <div className="text-sm text-colorParagraph font-light mb-2">Tu inversión:</div>
              <div className="text-5xl font-bold text-white mb-2">
                ${calculatePrice().toLocaleString()} MXN
              </div>
              <div className="text-brand-300 text-colorParagraph font-light mb-6">{getPriceMessage()}</div>

              {/* Cupón para estudiantes previos */}
              <div className="bg-brand-400/10 border border-white/30 rounded-lg p-4 mb-6 w-max mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💰</span>
                  <h4 className="text-white font-bold">
                    ¿Ya has tomado un curso con nosotros?
                  </h4>
                </div>
                <p className="text-colorParagraph text-sm text-left">
                  Si ya eres parte de la familia FixterGeek,
                  <br /> pídele tu cupón del 20% de descuento a{" "}
                  <span className="text-brand-300 font-semibold">Brendi</span>
                </p>
              </div>

              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="direct_checkout" />
                <input
                  type="hidden"
                  name="selectedModules"
                  value={JSON.stringify(selectedModules)}
                />
                <input
                  type="hidden"
                  name="totalPrice"
                  value={calculatePrice()}
                />
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  className="bg-brand-500  text-brand-900 font-medium h-12 px-8 rounded-full  transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                >
                  {fetcher.state !== "idle" ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Procesando...
                    </div>
                  ) : (
                    <>
                      Reservar mis {selectedModules.length}{" "}
                      {selectedModules.length === 1 ? "sesión" : "sesiones"} →
                    </>
                  )}
                </button>
              </fetcher.Form>
            </div>
          )}
        </div>
      </section>

      {/* Lo que NO encontrarás en YouTube */}
      <section className="py-20  relative overflow-hidden">
        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.span
                animate={{
                  rotate: [0, -10, 10, -5, 0],
                  scale: [1, 1.1, 1.05, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatDelay: 6,
                  ease: "easeInOut",
                }}
                className="text-5xl"
              >
                🚫
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Lo que NO encontrarás en YouTube
              </h2>
            </div>
            <p className="text-gray-400 font-light text-lg max-w-3xl mx-auto">
              Contenido exclusivo, técnicas avanzadas y secretos que solo
              conocen los
                <span className="text-brand-300 font-semibold">
                {" "}
                verdaderos power users
              </span>
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: "🧠",
                title: "Context Management Pro",
                description:
                  "Mantén sesiones de días sin perder contexto. Trucos para optimizar tokens y dominar /resume como un experto.",
                gradient: "from-blue-500/10 to-blue-600/20",
                border: "border-blue-500/30",
                color: "text-blue-400",
                delay: 0.1,
                skills: [
                  "Gestión avanzada de memoria",
                  "Optimización de tokens",
                  "Sesiones persistentes",
                ],
              },
              {
                icon: "🔌",
                title: "MCP Sin Código",
                description:
                  "Configura MCPs con JSON (sin programar). Explora repositorios masivos y automatiza GitHub Actions.",
                gradient: "from-purple-500/10 to-purple-600/20",
                border: "border-purple-500/30",
                color: "text-purple-400",
                delay: 0.2,
                skills: [
                  "JSON MCP Setup",
                  "GitHub integration",
                  "Actions automation",
                ],
              },
              {
                icon: "🤖",
                title: "Subagentes & SDK",
                description:
                  "Automatiza flujos complejos con subagentes inteligentes. Integra Claude en aplicaciones Python/TS.",
                gradient: "from-teal-500/10 to-teal-600/20",
                border: "border-teal-500/30",
                color: "text-teal-400",
                delay: 0.3,
                skills: [
                  "Delegación inteligente",
                  "SDK integration",
                  "Workflow automation",
                ],
              },
              {
                icon: "🚀",
                title: "Scripting Avanzado",
                description:
                  "Crea pipelines CI/CD y scripts reutilizables. Automatización que va más allá de lo básico.",
                gradient: "from-amber-500/10 to-amber-600/20",
                border: "border-amber-500/30",
                color: "text-amber-400",
                delay: 0.4,
                skills: [
                  "CI/CD pipelines",
                  "Script automation",
                  "TypeScript/Python",
                ],
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: feature.delay }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  y: -5,
                  transition: { duration: 0.3 },
                }}
                className={`bg-gradient-to-br ${feature.gradient} ${feature.border} border backdrop-blur-sm rounded-2xl p-6 relative overflow-hidden group hover:border-opacity-60 transition-all duration-300 cursor-pointer`}
              >
                {/* Background glow effect */}
                <motion.div
                  className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                />

                <div className="relative">
                  {/* Icon with animation */}
                  <motion.div
                    whileHover={{
                      rotate: [0, -10, 10, -5, 0],
                      scale: [1, 1.2, 1.1],
                    }}
                    transition={{ duration: 0.5 }}
                    className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300"
                  >
                    {feature.icon}
                  </motion.div>

                  {/* Title with gradient text */}
                  <h3
                    className={`text-xl font-bold text-white mb-3 group-hover:${feature.color} transition-colors duration-300`}
                  >
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 font-light group-hover:text-gray-300 transition-colors duration-300 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-2">
                    {feature.skills.map((skill, skillIndex) => (
                      <motion.span
                        key={skillIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: feature.delay + skillIndex * 0.1 + 0.3,
                        }}
                        viewport={{ once: true }}
                        className={`text-xs px-2 py-1 rounded-full bg-white/5 ${feature.color} border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>

                  {/* Hover indicator */}
                  <motion.div
                    className={`absolute bottom-4 right-4 w-8 h-8 rounded-full ${feature.gradient} border ${feature.border} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-white text-sm">→</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Call to action section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="bg-gradient-to-r from-brand-700/10 via-brand-500/10 to-brand-400/10 border border-brand-500/30 rounded-2xl p-8 max-w-4xl mx-auto">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-4xl mb-4"
              >
                ⚡
              </motion.div>
              <h4 className="text-2xl font-bold text-white mb-4">
                Técnicas que cambiarán tu carrera para siempre
              </h4>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Estos conocimientos avanzados te separarán del 99% de
                developers. No los encontrarás en tutoriales gratuitos ni cursos
                básicos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowWebinarForm(true)}
                  className="bg-brand-500  text-brand-900 font-medium h-12 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
                >
                  Ver estas técnicas EN VIVO →
                </button>
                <div className="flex items-center justify-center gap-2 text-gray-400 font-light">
                  <span className="text-brand-300">✓</span>
                  <span>Webinar gratuito - Sin compromiso</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sobre el Instructor */}
   <section className="mt-32 w-full px-8 md:px-[5%] xl:px-0 max-w-7xl mx-auto my-[160px]  ">
        <div className="bg-backface rounded-3xl md:py-10 xl:py-16 md:pl-10 xl:pl-16 pt-6 px-6 w-full relative pb-64 md:pb-16 ">
          <div className="w-full md:w-[60%]">
            <span className="text-colorParagraph/50 font-light">
              ¿Quien es tu instructor?
            </span>
            <h3 className="text-white text-3xl font-bold mt-4">
 Héctor Bliss
            </h3>{" "}
              <div>
                {" "}
                <p className="text-colorParagraph font-light mt-8 text-base md:text-lg">
                  Con más de 10 años de experiencia como desarrollador de software
                  profesional e instructor tecnológico, Héctor Bliss disfruta de
                  simplificar temas complejos para que sus estudiantes
                  puedan aprender de la forma más práctica, rápida y
                  divertida. Héctor ha sido instructor en diferentes bootcamps
                  internacionales, y ha grabado infinidad de cursos en línea. Por
                  medio de su canal de youtube enseña los temas más actualizados
                  de la industria tecnológica, acercando las herramientas que usan
                  los profesionales a nivel mundial a sus estudiantes de habla
                  hispana.
                </p>
                <p className="text-colorParagraph font-light mt-4 text-base md:text-lg">
                  Si no has experimentado una clase con Héctor Bliss, es tu
                  momento de comprobar que aprender no tiene que ser ni díficil ni
                  aburrido.
                </p>
                
                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="text-left">
                    <div className="text-2xl font-bold text-brand-500">10+</div>
                    <div className="text-xs text-colorParagraph/50 font-light">
                      Años de experiencia
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-brand-500">50+</div>
                    <div className="text-xs text-colorParagraph/50 font-light">
                      Cursos impartidos
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-brand-500">20K+</div>
                    <div className="text-xs text-colorParagraph/50 font-light">
                      Estudiantes
                    </div>
                  </div>
                </div>
                
                {/* Cita del autor */}
                <div className="mt-8 p-6 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                  <p className="text-white italic">
                    "Me encanta compartir lo que aprendo en el camino. Si puedo ayudarte a ahorrar tiempo y frustración mientras creces como developer, mi día está completo."
                  </p>
                  <p className="text-colorParagraph mt-3 text-sm font-light">
                    - Héctor Bliss
                  </p>
                </div>
              </div>
          
          </div>
          <div className=" absolute -bottom-16 -right-8 md:-right-16">
            <a
              href={
                "https://www.linkedin.com/in/hectorbliss/"
              }
              target="_blank"
            >
              <motion.span>
                <BsLinkedin className="text-3xl absolute -top-1 md:top-2 text-colorCaption/50" />
              </motion.span>
            </a>
            <a
              href={
                "https://github.com/blissito"
           
              }
              target="_blank"
            >
              <motion.span style={{}}>
                <BsGithub className="text-3xl absolute top-16 -left-12 text-colorCaption/50" />
              </motion.span>
            </a>
            <a
              href={
                "https://x.com/HectorBlisS"
            
              }
              target="_blank"
            >
              <motion.span>
                <BsTwitter className="text-3xl absolute -top-10 left-16 text-colorCaption/50" />
              </motion.span>
            </a>
            <img
              className="w-60 md:w-[320px] rounded-full"
              src={
                "/courses/titor.png"
              }
              alt={"Héctor Bliss"}
            />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-stars bg-cover bg-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800/80 to-brand-900/90"></div>
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Empieza con el webinar GRATIS
          </h2>
          <p className="text-xl text-colorParagraph font-light mb-8 max-w-2xl mx-auto">
            No te comprometas a nada. Ven al webinar, conoce el método, y decide
            si quieres profundizar con el taller completo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowWebinarForm(true)}
              className="bg-white text-brand-900 font-medium py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Quiero mi lugar en el webinar →
            </button>
            <a
              href="/temario-claude-code.pdf"
              download="Temario-Claude-Code-Power-User.pdf"
              className="inline-block bg-transparent border-2 border-brand-500 text-brand-500 hover:bg-brand-500/5  font-medium py-4 px-8 rounded-full text-lg transition-all text-center"
            >
              📄 Descargar temario completo
            </a>
          </div>
          <p className="text-sm text-gray-400 font-light mt-6">
            💡 Tip: Si compras el paquete completo, incluye sesión privada
            individual GRATIS
          </p>
        </div>
      </section>

      <SimpleFooter />
    </>
  );
}
