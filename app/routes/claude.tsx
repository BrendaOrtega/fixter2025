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
import { BiBrain, BiCheckCircle, BiLayer, BiRocket } from "react-icons/bi";
import { RiFlowChart } from "react-icons/ri";

export const meta = () =>
  getMetaTags({
    title: "Conviértete en Power User de Claude Code | FixterGeek",
    description:
      "Domina Claude Code como un experto: SDK, MCP, GitHub integration, subagentes y trucos avanzados. Webinar gratis y taller modular desde $1,490 MXN",
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
          username: name || email.split("@")[0], // Usar name o parte del email como username
          displayName: name,
          phoneNumber: phone || undefined,
          courses: [], // Array vacío requerido
          editions: [], // Array vacío requerido
          roles: [], // Array vacío requerido
          tags: [
            "webinar_agosto",
            "claude_septiembre",
            "newsletter",
            `level-${experienceLevel}`,
            `context-${contextObjective}`,
          ],
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "agosto_2025",
            webinarDate: "2025-08-15T19:00:00-06:00", // Viernes 15 de Agosto, 7:00 PM CDMX
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: ["webinar_agosto", "claude_septiembre"] },
          webinar: {
            experienceLevel,
            contextObjective,
            registeredAt: new Date().toISOString(),
            webinarType: "agosto_2025",
            webinarDate: "2025-08-15T19:00:00-06:00", // Viernes 15 de Agosto, 7:00 PM CDMX
          },
        },
      });

      // Send confirmation email
      await sendWebinarCongrats({
        to: email,
        webinarTitle: "De Junior a Senior con Claude Code",
        webinarDate: "Viernes 15 de Agosto, 7:00 PM (CDMX)",
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
  const [selectedModules, setSelectedModules] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]); // Todos seleccionados por defecto
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
      price: 1490,
    },
    {
      id: 2,
      title: "Sesión 2: SDK, Subagentes y Scripting",
      date: "Jueves 21 Agosto • 2 horas • 7:00 PM",
      topics: [
        "Claude SDK para Python/TypeScript",
        "Subagentes y delegación de tareas",
        "Nano y Banana: los agentes que cambiarán tu forma de trabajar",
        "Scripting con TypeScript y Python",
        "Pipelines CI/CD y casos empresariales",
      ],
      price: 1490,
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
      price: 1490,
    },
    {
      id: 4,
      title: "🆕 Sesión 4: Orquestación de Agentes",
      date: "Fecha por confirmar - Septiembre 2025 • 2 horas • 7:00 PM",
      topics: [
        "Arquitectura de sistemas multi-agente",
        "Coordinación y comunicación entre agentes",
        "Patrones avanzados de orquestación y flujos de trabajo",
      ],
      price: 1490,
      isFuture: true,
    },
  ];

  const toggleModule = (id: number) => {
    // No permitir deseleccionar módulos - todos incluidos en el precio
    return;
  };

  const calculatePrice = () => {
    // Precio único de $1,490 para todo el curso completo
    return 1490;
  };

  const getPriceMessage = () => {
    return (
      <div>
        <div className="text-2xl font-bold text-yellow-500 mb-2">
          🎉 ¡OFERTA ESPECIAL! 🎉
        </div>
        <div className="text-lg">
          Curso completo con 4 módulos + <s>Sesión privada 1:1 incluida</s>
        </div>
      </div>
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
            isSuccess ? "border-brand-500/30" : "border-brand-500/30"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isSuccess ? "¡Registro Exitoso!" : "Regístrate al Webinar"}
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
                Te has registrado exitosamente al webinar. Te enviaremos los
                detalles por email.
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
  const [selectedTopic, setSelectedTopic] = useState<{
    moduleIndex: number;
    topicIndex: number;
  } | null>({
    moduleIndex: 0,
    topicIndex: 0,
  });
  return (
    <>
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
              <span className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></span>
              <span className="text-base font-bold text-white">
                🎯 CURSO DISPONIBLE ON DEMAND - Aprende a tu propio ritmo
              </span>
              <span className="bg-white text-black text-xs font-black px-2 py-1 rounded-full">
                ACCESO INMEDIATO
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-brand-100">
              Conviértete en Power User de Claude Code
            </h1>

            <p className="text-xl md:text-2xl text-colorParagraph font-light mb-8 max-w-3xl mx-auto">
              Domina las técnicas avanzadas que el 99% de developers no conocen.
              Automatiza tu flujo de trabajo y multiplica tu productividad 10x.
            </p>

            {/* Video Trailer CTA Principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative mt-20 bg-gradient-to-r from-brand-500/20 via-brand-600/20 to-brand-700/20 backdrop-blur border-2 border-brand-500 rounded-3xl p-10 mb-12 max-w-4xl mx-auto shadow-2xl"
            >
              {/* Badge NUEVO flotante */}
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-brand-500 to-brand-700 text-white font-black px-6 py-3 rounded-full text-lg shadow-lg"
              >
                🎬 VER TRAILER
              </motion.div>

              <h2 className="text-3xl font-black mb-6  text-white">
                🚀 Descubre el poder de Claude Code en acción
              </h2>

              {/* Video de YouTube responsive */}
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  src="https://www.youtube.com/embed/dtQg_TmD6nI?si=v323WcC4L4OcwJPU"
                  title="Claude Code - Trailer del Curso"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>

              <p className="text-gray-200 mt-6 text-lg text-center">
                Domina las técnicas avanzadas que el 99% de developers no
                conocen.
                <span className="text-brand-500 font-bold">
                  {" "}
                  Automatiza tu flujo de trabajo y multiplica tu productividad
                  10x
                </span>
              </p>

              <div className="bg-black/30 rounded-xl p-6 mt-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎯</span>
                  <p className="text-white font-bold text-lg">
                    Lo que aprenderás en este curso:
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
                          Contenido Completo
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          3 módulos completos + acceso a futuras sesiones
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-red-400 text-xl flex-shrink-0 mt-0.5">
                        🔥
                      </span>
                      <div>
                        <h4 className="text-white font-semibold mb-1 text-left">
                          Ejemplos Prácticos
                        </h4>
                        <p className="text-gray-300 text-sm text-left">
                          Casos reales que puedes aplicar de inmediato
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="direct_checkout" />
                  <input
                    type="hidden"
                    name="selectedModules"
                    value={JSON.stringify([1, 2, 3, 4, 5])}
                  />
                  <input type="hidden" name="totalPrice" value={1490} />
                  <motion.button
                    type="submit"
                    disabled={fetcher.state !== "idle"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-brand-500 text-brand-900 font-black py-5 px-10 rounded-full text-xl transition-all shadow-xl disabled:opacity-50 w-full"
                  >
                    {fetcher.state !== "idle" ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Procesando...
                      </div>
                    ) : (
                      "🚀 COMPRAR CURSO AHORA - $1,490 MXN"
                    )}
                  </motion.button>
                </fetcher.Form>
                <div className="text-center">
                  <p className="text-[#EEC85A] font-bold text-lg">
                    📚 Acceso inmediato • Aprende a tu ritmo
                  </p>
                  <p className="text-white text-sm mt-1">
                    💡 Próximamente nuevas sesiones en vivo
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  6+ horas
                </div>
                <div className="text-gray-300">de contenido práctico</div>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  4+<s>1 sesiones</s>
                </div>
                <div className="text-gray-300">
                  2h cada una + <s>sesión privada</s>
                </div>
                <p className="text-[8px]">
                  La sesión privada solo está disponible si el taller se toma en
                  vivo.
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="text-3xl font-bold text-brand-500">
                  $1,490 MXN
                </div>
                <div className="text-gray-300">por todo el curso completo</div>
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

        </div>
      </section>
     <div className="max-w-5xl mx-auto relative">
              {/* Timeline Line */}
              <div
                className="absolute left-[52px] top-[120px] bottom-[200px] w-0.5 opacity-20"
                style={{
                  background:
                    "linear-gradient(to bottom, #CA9B77, #845A8F, #E08236, #7CE5B8)",
                }}
              ></div>
              {[
                {
                  module: "Sesión 1",
                  title: "Fundamentos y Context Management",
                  icon: <BiRocket className="w-6 h-6" />,
                  badge: "🎁 GRATIS",
                  topics: [
                    {
                      title:
                        "Setup profesional de Claude Code",
                      description:
                        "Te guiaré paso a paso para configurar tu entorno de trabajo con acceso a herramientas profesionales de IA, completamente gratis durante el taller.",
                    },
                    {
                      title: "Arquitectura de prompts efectivos",
                      description:
                        "Aprenderás a usar la interfaz drag-and-drop para conectar componentes de IA sin escribir código, como si fuera un diagrama de flujo visual.",
                    },
                    {
                      title:
                        "Gestión avanzada de contexto y /resume",
                      description:
                        "Configuraremos conexiones directas a los modelos más potentes del mercado y aprenderás cuándo usar cada uno según tu proyecto.",
                    },
                    {
                      title: "Optimización de tokens y memoria",
                      description:
                        "Construirás tu primer agente que puede mantener conversaciones coherentes, recordar contexto y responder de forma natural.",
                    },
                  ],
                  color: "#CA9B77",
                  progress: "25%",
                },
                {
                  module: "Sesión 2",
                  title: "SDK, Subagentes y Scripting",
                  icon: <BiLayer className="w-6 h-6" />,
                  badge: "🔧 TOOLS",
                  topics: [
                    {
                      title:
                        "Claude SDK para Python/TypeScript",
                      description:
                        "Tu agente podrá usar herramientas externas como hacer cálculos complejos, consultar disponibilidad de citas o conectarse con servicios externos en tiempo real.",
                    },
                    {
                      title: "Subagentes y delegación de tareas",
                      description:
                        "Aprenderás a crear flujos de trabajo donde tu agente puede realizar múltiples tareas en orden o simultáneamente para resolver problemas complejos.",
                    },
                    {
                      title: "Nano y Banana: los agentes que cambiarán tu forma de trabajar",
                      description:
                        "Diseñarás agentes que toman decisiones inteligentes según el contexto, usando condicionales y lógica para elegir qué herramientas usar en cada situación.",
                    },
                    {
                      title: "Scripting con TypeScript y Python",
                      description:
                        "Construirás un agente que consulta menús, calcula precios con descuentos, agenda reservas y maneja pedidos. Como tener un empleado que nunca se equivoca y trabaja 24/7.",
                    },
                    {
                      title: "Pipelines CI/CD y casos empresariales",
                      description:
                        "Construirás un agente que consulta menús, calcula precios con descuentos, agenda reservas y maneja pedidos. Como tener un empleado que nunca se equivoca y trabaja 24/7.",
                    },
                  ],
                  color: "#CA9B77",
                  progress: "50%",
                },
                {
                  module: "Sesión 3",
                  title: "MCP y Automatización",
                  icon: <RiFlowChart />                  ,
                  badge: "📸 STUDIO",
                  topics: [
                    {
                      title: "MCP con JSON (sin programar)",
                      description:
                        "Tu agente analizará automáticamente productos (forma, colores, estilo) y modelos (pose, expresión, iluminación) para crear prompts perfectos.",
                    },
                    {
                      title: "GitHub MCP: explora miles de repos",
                      description:
                        "El sistema combinará inteligentemente las características del producto y modelo para generar prompts optimizados que produzcan resultados profesionales.",
                    },
                    {
                      title: "Automatización de GitHub Actions",
                      description:
                        "Crea 3+ variantes simultáneas con diferentes poses y estilos, plus un sistema de refinamiento que mejora automáticamente los resultados.",
                    },
                    {
                      title: "Conectar bases de datos y APIs",
                      description:
                        "Construirás un agente que toma imagen de producto + modelo y genera múltiples fotos profesionales. Perfecto para tiendas online que necesitan variedad sin fotógrafo.",
                    },
                  ],
                  color: "#CA9B77",
                  progress: "75%",
                },
                {
                  module: "Sesión 4",
                  title: "Orquestación de Agentes",
                  icon: <BiBrain className="w-6 h-6" />,
                  badge: "🧠 RAG",
                  topics: [
                    {
                      title:
                        "Arquitectura de sistemas multi-agente",
                      description:
                        "Tu agente procesará cientos de documentos corporativos automáticamente: manuales, políticas, contratos, reportes. Usando splitters inteligentes para fragmentar información de manera óptima.",
                    },
                    {
                      title: "Coordinación y comunicación entre agentes",
                      description:
                        "Construirás un cerebro digital que entiende contexto, relaciones y significados profundos entre documentos, no solo búsquedas por palabras clave.",
                    },
                    {
                      title: "Patrones avanzados de orquestación y flujos de trabajo",
                      description:
                        "Tu agente responderá preguntas complejas citando documentos específicos, páginas exactas y secciones relevantes. Transparencia total en cada respuesta.",
                    },
                    {
                      title: "Proyecto: Cerebro Maestro Corporativo",
                      description:
                        "El gran finale: un super-agente que domina toda la información de tu empresa. Responde desde 'política de vacaciones' hasta 'análisis financiero Q3' con precisión absoluta.",
                    },
                  ],
                  color: "#845A8F",
                  progress: "100%",
                },
              ].map((module, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: "easeOut",
                  }}
                  viewport={{ once: true }}
                  className="mb-8 group"
                >
                  <div
                    className="relative rounded-3xl p-8 backdrop-blur-sm overflow-hidden bg-agentes-primary/5 hover:shadow-xl transition-shadow duration-300"
                    style={{
                  backgroundColor: module.color + "10",
                      boxShadow: `0 8px 32px ${module.color}10`,
                      border: `1px solid ${module.color}20`,
                    }}
                  >
                    {/* Hover Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>

                    {/* Glow Effect Background */}
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                      backgroundImage: `linear-gradient(to bottom right, ${module.color}05, ${module.color}10)`
                    }}></div>


                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        {/* Animated Icon */}
                        <div
                          className="p-4 rounded-2xl border-2"
                          style={{
                            backgroundColor: module.color + "20",
                            borderColor: module.color + "40",
                            color: module.color,
                          }}
                        >
                          {module.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="font-bold text-lg"
                              style={{ color: module.color }}
                            >
                              {module.module}
                            </span>
                            <span
                              className="text-xs px-3 py-1 rounded-full font-bold border"
                              style={{
                                backgroundColor: module.color + "20",
                                borderColor: module.color + "40",
                                color: module.color,
                              }}
                            >
                              {module.badge}
                            </span>
                          </div>
                          <h3
                            className="text-2xl font-bold text-white"
                          >
                            {module.title}
                          </h3>
                        </div>
                      </div>

                      {/* Progress Circle */}
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="var(--border)"
                            strokeWidth="3"
                            fill="none"
                            opacity="0.3"
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke={module.color}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            whileInView={{
                              pathLength: parseInt(module.progress) / 100,
                            }}
                            transition={{ duration: 1.0, delay: index * 0.1, ease: "easeOut" }}
                            viewport={{ once: true }}
                            style={{
                              pathLength: parseInt(module.progress) / 100,
                            }}
                          />
                        </svg>
                        <div
                          className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                          style={{ color: module.color }}
                        >
                          {module.progress}
                        </div>
                      </div>
                    </div>

                    {/* Topics List */}
                    <ul className="space-y-3 relative z-10">
                      {module.topics.map((topic, idx) => {
                        const isSelected =
                          selectedTopic?.moduleIndex === index &&
                          selectedTopic?.topicIndex === idx;

                        return (
                          <motion.li
                            key={idx}
                            className="group/item"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: idx * 0.05,
                              ease: "easeOut",
                            }}
                            viewport={{ once: true }}
                          >
                            <div
                              className={`flex items-start gap-4 cursor-pointer p-3 rounded-xl pointer-events-auto transition-colors duration-150 ease-out ${
                                isSelected ? "bg-opacity-10" : ""
                              }`}
                              style={{
                                backgroundColor: isSelected
                                  ? `${module.color}20`
                                  : "transparent"
                              }}
                              onClick={() => {
                                setSelectedTopic(isSelected ? null : {
                                  moduleIndex: index,
                                  topicIndex: idx,
                                });
                              }}
                            >
                              <div className="flex-shrink-0 mt-1">
                                <BiCheckCircle
                                  className={`w-5 h-5 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}
                                  style={{ color: module.color }}
                                />
                              </div>
                              <span
                                className="font-medium transition-colors duration-150"
                                style={{
                                  color: isSelected
                                    ? module.color
                                    : "#cccccc",
                                }}
                              >
                                {topic.title}
                              </span>
                            </div>

                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>

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
            <div className="bg-gradient-to-r from-brand-700/10 via-brand-500/10 to-brand-400/10 border border-brand-500/30 rounded-2xl p-8 max-w-5xl mx-auto">
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
              <p className="text-gray-300 mb-6 max-w-3xl mx-auto">
                Estos conocimientos avanzados te separarán del 99% de
                developers. No los encontrarás en tutoriales gratuitos ni cursos
                básicos.
              </p>

              {/* Video Demo */}
              <div className="bg-gradient-to-r from-brand-500/20 to-brand-600/20 border border-brand-500/50 rounded-2xl p-6 mb-8">
                <h5 className="text-xl font-bold text-white mb-4 text-center">
                  🎬 Mira el demo completo - Técnicas exclusivas en acción
                </h5>
                <div
                  className="relative w-full rounded-xl overflow-hidden max-w-4xl mx-auto"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/EkH82XjN45w"
                    title="Claude Code Power User - Demo de Técnicas Avanzadas"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-colorParagraph text-sm mt-4 font-light text-center">
                  💡 Ve en tiempo real cómo estas técnicas transforman tu flujo
                  de trabajo
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="direct_checkout" />
                  <input
                    type="hidden"
                    name="selectedModules"
                    value={JSON.stringify([1, 2, 3, 4, 5])}
                  />
                  <input type="hidden" name="totalPrice" value={1490} />
                  <button
                    type="submit"
                    disabled={fetcher.state !== "idle"}
                    className="bg-brand-500 text-brand-900 font-medium h-12 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center disabled:opacity-50"
                  >
                    {fetcher.state !== "idle" ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Procesando...
                      </div>
                    ) : (
                      "Dominar estas técnicas ahora →"
                    )}
                  </button>
                </fetcher.Form>
                <div className="flex items-center justify-center gap-2 text-gray-400 font-light">
                  <span className="text-brand-300">✓</span>
                  <span>Acceso inmediato - Garantía de satisfacción</span>
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
            <h3 className="text-white text-3xl font-bold mt-4">Héctor Bliss</h3>{" "}
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
                  <div className="text-2xl font-bold text-brand-500">8+</div>
                  <div className="text-xs text-colorParagraph/50 font-light">
                    Años enseñando
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-brand-500">2K+</div>
                  <div className="text-xs text-colorParagraph/50 font-light">
                    En comunidad
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-brand-500">100%</div>
                  <div className="text-xs text-colorParagraph/50 font-light">
                    Práctico
                  </div>
                </div>
              </div>
              {/* Cita del autor */}
              <div className="mt-8 p-6 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                <p className="text-white italic">
                  "Me encanta compartir lo que aprendo en el camino. Si puedo
                  ayudarte a ahorrar tiempo y frustración mientras creces como
                  developer, mi día está completo."
                </p>
                <p className="text-colorParagraph mt-3 text-sm font-light">
                  - Héctor Bliss
                </p>
              </div>
            </div>
          </div>
          <div className=" absolute -bottom-16 -right-8 md:-right-16">
            <a
              href={"https://www.linkedin.com/in/hectorbliss/"}
              target="_blank"
            >
              <motion.span>
                <BsLinkedin className="text-3xl absolute -top-1 md:top-2 text-colorCaption/50" />
              </motion.span>
            </a>
            <a href={"https://github.com/blissito"} target="_blank">
              <motion.span style={{}}>
                <BsGithub className="text-3xl absolute top-16 -left-12 text-colorCaption/50" />
              </motion.span>
            </a>
            <a href={"https://x.com/HectorBlisS"} target="_blank">
              <motion.span>
                <BsTwitter className="text-3xl absolute -top-10 left-16 text-colorCaption/50" />
              </motion.span>
            </a>
            <img
              className="w-60 md:w-[320px] rounded-full"
              src={"/courses/titor.png"}
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
            Comienza tu transformación hoy mismo
          </h2>
          <p className="text-xl text-colorParagraph font-light mb-8 max-w-2xl mx-auto">
            Accede al curso completo de inmediato. Aprende a tu ritmo con
            contenido on demand y prepárate para las próximas sesiones en vivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <fetcher.Form method="post" className="inline-block">
              <input type="hidden" name="intent" value="direct_checkout" />
              <input
                type="hidden"
                name="selectedModules"
                value={JSON.stringify([1, 2, 3, 4, 5])}
              />
              <input type="hidden" name="totalPrice" value={1490} />
              <button
                type="submit"
                disabled={fetcher.state !== "idle"}
                className="bg-white text-brand-900 font-medium py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
              >
                {fetcher.state !== "idle" ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-900/20 border-t-brand-900 rounded-full animate-spin"></div>
                    Procesando...
                  </div>
                ) : (
                  "Comprar curso ahora →"
                )}
              </button>
            </fetcher.Form>
            <a
              href="/temario-claude-workshop.pdf"
              download="Temario-Claude-Code-Power-User.pdf"
              className="inline-block bg-transparent border-2 border-brand-500 text-brand-500 hover:bg-brand-500/5  font-medium py-4 px-8 rounded-full text-lg transition-all text-center"
            >
              📄 Descargar temario completo
            </a>
          </div>
          <div className="mt-8 p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl max-w-md mx-auto">
            <p className="text-sm text-brand-300 font-medium mb-2">
              🔔 ¿Prefieres sesiones en vivo?
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Regístrate para recibir notificaciones de las próximas fechas
            </p>
            <button
              onClick={() => setShowWebinarForm(true)}
              className="bg-brand-500/20 border border-brand-500/50 text-brand-300 py-2 px-4 rounded-full text-sm hover:bg-brand-500/30 transition-all"
            >
              Notificarme de próximas sesiones
            </button>
          </div>
          <p className="text-sm text-gray-400 font-light mt-6">
            💡 Tip: Si compras el paquete completo,{" "}
            <s>incluye sesión privada individual GRATIS</s>
          </p>
        </div>
      </section>

      <SimpleFooter />
    </>
  );
}
