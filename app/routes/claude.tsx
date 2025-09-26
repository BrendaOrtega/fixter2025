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
import { BiBrain, BiCheckCircle, BiLayer, BiPlay, BiRocket } from "react-icons/bi";
import { RiFlowChart } from "react-icons/ri";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import { FaWhatsapp } from "react-icons/fa";

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
        className="fixed inset-0 bg-claude-dark/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={() => setShowWebinarForm(false)}
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          exit={{ y: 50 }}
          className={`bg-claude-dark rounded-2xl p-8 max-w-md w-full border text-center ${
            isSuccess ? "border-claude-primary/30" : "border-claude-primary/30"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">
              {isSuccess ? "¡Registro Exitoso!" : "Regístrate al Taller"}
            </h3>
            <button
              onClick={() => setShowWebinarForm(false)}
              className="text-gray-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>

          {isSuccess ? (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-claude-gray mb-6">
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
                  className="w-full px-4 h-12 rounded-lg bg-claude-primary/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-white mb-1 text-left">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 h-12 rounded-lg bg-claude-primary/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
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
                  className="w-full px-4 h-12 rounded-lg bg-claude-primary/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none"
                  placeholder="+52 1 234 567 8900"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white mb-1 text-sm text-left">
                    Nivel
                  </label>
                  <select
                    name="experienceLevel"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-claude-primary/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
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
                  <label className="block text-white mb-1 text-sm text-left">
                    Ocupación
                  </label>
                  <select
                    name="contextObjective"
                    required
                    className="w-full px-2 h-12 rounded-lg bg-claude-primary/5 text-white border-none focus:border-brand-500 focus:ring-0 focus:outline-none text-xs"
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
                className="w-full bg-gradient-to-r from-claude-primary to-claude-secondary text-white mt-10  rounded-full font-bold py-4 px-8 text-lg transition-all disabled:opacity-50"
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
    <main className="bg-claude-dark">
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
              className="bg-claude-dark rounded-2xl p-8 max-w-md w-full border border-claude-primary/30 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                ¡Pago Completado!
              </h3>
              <p className="text-claude-gray mb-4">
                El curso de Claude te está esperando. Velo desde tu perfil.
              </p>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="w-full bg-gradient-to-r from-claude-primary to-claude-secondary text-white font-bold py-3 px-6 rounded-full transition-all"
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
            className="fixed inset-0 bg-claude-dark/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentCancel(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="bg-claude-dark rounded-2xl p-8 max-w-md w-full border border-claude-primary/30 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Pago Cancelado
              </h3>
              <p className="text-claude-gray mb-4">
                No te preocupes, puedes completar tu inscripción cuando quieras.
              </p>
              <button
                onClick={() => setShowPaymentCancel(false)}
                className="w-full bg-gradient-to-r from-claude-primary to-claude-secondary text-white font-bold py-3 px-6 rounded-full transition-all"
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
      <section className="relative min-h-screen  text-white overflow-hidden bg-claude-dark">
        <div className="relative container mx-auto px-4 pt-20 lg:pt-32 pb-16">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge URGENTE */}
            <motion.div
              className="inline-flex items-center gap-2 bg-gradient-to-r from-claude-primary/10 to-claude-secondary/10 border border-claude-secondary rounded-full px-4 py-2 mb-8"
            >
              <span className="animate-pulse h-3 w-3 bg-claude-primary rounded-full hidden lg:inline"></span>
              <span className="lg:text-sm text-xs font-bold text-[#BC84CB]">
                🎯 Curso disponible on demand  <span className="hidden lg:inline"> - Aprende a tu propio ritmo</span>
              </span>
              <span className="bg-claude-primary/10 text-white/60 text-xs font-black px-2 py-1 rounded-full">
                Acceso inmediato
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-claude-primary to-claude-secondary">
              Conviértete en Power User de Claude Code
            </h1>

            <p className="text-xl md:text-2xl text-claude-gray font-light mb-8 max-w-5xl mx-auto">
              Domina las técnicas avanzadas que el 99% de developers no conocen.
              Automatiza tu flujo de trabajo y multiplica tu productividad 10x.
            </p>
       {/* CTA Buttons */}
       <div className="flex flex-col gap-4 mt-8">
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
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-claude-primary to-claude-secondary text-white font-semibold w-fit h-14 px-6 rounded-full text-lg transition-all shadow-xl disabled:opacity-50"
                  >
                    {fetcher.state !== "idle" ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Procesando...
                      </div>
                    ) : (
                      "🚀 Comprar curso - $1,490 mxn"
                    )}
                  </motion.button>
                </fetcher.Form>
                <div className="text-center">
                  <p className="text-claude-gray text-sm mt-1">
                  📚 Aprende a tu ritmo • 💡 Próximamente nuevas sesiones en vivo
                  </p>
                </div>
              </div>
            {/* Interactive Terminal Demo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative mt-10 lg:mt-20 mb-6 lg:mb-12 max-w-6xl mx-auto"
            >

              {/* Terminal Container */}
              <div className="relative bg-claude-primary/5 rounded-2xl border border-claude-primary/20 backdrop-blur-sm shadow-2xl overflow-hidden">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-claude-secondary/5 border-b border-claude-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-claude-secondary"></div>
                      <div className="w-3 h-3 rounded-full bg-claude-tertiary"></div>
                      <div className="w-3 h-3 rounded-full bg-claude-green"></div>
                    </div>
                    <span className="text-claude-gray text-sm ml-4">Claude Code - Terminal</span>
                  </div>
                  <div className="text-claude-gray/60 text-xs">claude --version 3.5-sonnet</div>
                </div>

                {/* Terminal Content */}
                <div className="p-6 font-mono text-sm min-h-[400px] relative">
                  <div className="text-claude-primary">$ claude</div>
                  <div className="text-claude-gray mt-2">Welcome to Claude Code! 🎉</div>
                  <div className="text-claude-gray mt-1">Type your request or drag files to get started.</div>

                  <div className="text-claude-primary mt-4">$ </div>
                  <motion.span
                    className="text-claude-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    |
                  </motion.span>

                  {/* Floating Pills */}
                  <motion.div
                    className="absolute top-20 right-10 bg-gradient-to-r from-claude-primary to-claude-secondary text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, -10, 0],
                      rotate: [0, 2, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    ✨ Context Management
                  </motion.div>

                  <motion.div
                    className="absolute top-32 left-16 bg-gradient-to-r from-claude-secondary to-claude-primary text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, 15, 0],
                      rotate: [0, -2, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  >
                    🔌 MCP Integration
                  </motion.div>

                  <motion.div
                    className="absolute bottom-32 right-20 bg-gradient-to-r from-claude-green to-claude-tertiary text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, -12, 0],
                      rotate: [0, 3, 0]
                    }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                  >
                    🤖 Smart Agents
                  </motion.div>

                  <motion.div
                    className="absolute bottom-20 left-12 bg-gradient-to-r from-claude-tertiary to-claude-secondary text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, 8, 0],
                      rotate: [0, -1, 0]
                    }}
                    transition={{ duration: 2.8, repeat: Infinity, delay: 1.5 }}
                  >
                    💻 SDK & Scripting
                  </motion.div>

                  <motion.div
                    className="absolute top-40 left-32 bg-gradient-to-r from-claude-primary/80 to-claude-green text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, -8, 0],
                      rotate: [0, 1, 0]
                    }}
                    transition={{ duration: 3.2, repeat: Infinity, delay: 2 }}
                  >
                    🔥 Advanced Workflows
                  </motion.div>

                  <motion.div
                    className="absolute bottom-40 right-32 bg-gradient-to-r from-claude-secondary/80 to-claude-primary text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                    animate={{
                      y: [0, 10, 0],
                      rotate: [0, -2, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 2.5 }}
                  >
                    🎁 Pro Techniques
                  </motion.div>
                </div>

                {/* Terminal Footer */}
                <div className="px-6 py-4 bg-claude-primary/5 border-t border-claude-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="text-claude-gray text-xs">
                      Ready for input • AI-powered development
                    </div>
                    <div className="flex items-center gap-2 text-claude-gray text-xs">
                      <span className="w-2 h-2 bg-claude-green rounded-full animate-pulse"></span>
                      Connected to Claude
                    </div>
                  </div>
                </div>
              </div>

       
            </motion.div>
          </div>
        </div>
      </section>

      {/* ¿Para quién es este taller? */}
      <section className="py-10 lg:py-20  relative overflow-hidden bg-claude-dark">
        <div className="relative container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              ¿Es este taller <span className="text-claude-primary">para ti?</span>
            </h2>
            <p className="text-claude-gray font-light text-lg max-w-2xl mx-auto">
              Descubre si este programa se adapta a tu nivel y objetivos
              profesionales
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* SÍ es para ti */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl flex items-center justify-center z-10 bg-claude-primary"
              >
                <span className="text-2xl">✅</span>
              </div>

              <div
                className="border-2 rounded-3xl p-8 pt-12 border-claude-primary/30 backdrop-blur-sm bg-claude-primary/5"
                style={{
                  boxShadow: "0 8px 32px rgba(202, 155, 119, 0.2)",
                }}
              >
                <h3
                  className="text-3xl font-bold mb-6 text-white"
                >
                  SÍ es para ti si...
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      text: "🚀 Eres developer Jr/Mid con ganas de destacar",
                      highlight: "destacar",
                    },
                    {
                      text: "🔍 Ya probaste Claude pero no le sacas provecho",
                      highlight: "provecho",
                    },
                    {
                      text: "⚡ Quieres automatizar tareas repetitivas y aburridas",
                      highlight: "automatizar",
                    },
                    {
                      text: "🎯 Buscas ser más productivo sin burnout",
                      highlight: "productivo",
                    },
                    {
                      text: "🤖 Te interesa estar a la vanguardia en AI",
                      highlight: "vanguardia",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.4 + index * 0.1,
                      }}
                      viewport={{ once: true }}
                      className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 bg-claude-primary/5"
                    >
                      <div
                        className="w-6 h-6 flex items-center justify-center mt-1"
                      >
                        <span
                          className="text-xl"
                        >
                          {item.text.substring(0, 2).trim()}
                        </span>
                      </div>
                      <p
                        className="text-base leading-relaxed text-claude-gray"
                      >
                        {item.text.substring(2).split(item.highlight)[0]}
                        <span
                          className="font-semibold text-claude-primary"
                        >
                          {item.highlight}
                        </span>
                        {item.text.substring(2).split(item.highlight)[1]}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* NO es para ti */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl flex items-center justify-center z-10 bg-claude-secondary"
              >
                <span className="text-2xl">🤔</span>
              </div>

              <div
                className="border-2 rounded-3xl p-8 pt-12 border-claude-secondary/30 backdrop-blur-sm bg-claude-secondary/5"
                style={{
                  boxShadow: "0 8px 32px rgba(132, 90, 143, 0.2)",
                }}
              >
                <h3
                  className="text-3xl font-bold mb-6 text-white"
                >
                  NO es para ti si...
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      text: "💻 Nunca has usado una terminal",
                      highlight: "terminal",
                    },
                    {
                      text: "📚 Buscas una introducción básica a programación",
                      highlight: "básica",
                    },
                    {
                      text: "⏰ No tienes tiempo para practicar",
                      highlight: "practicar",
                    },
                    {
                      text: "✨ Esperas resultados mágicos sin esfuerzo",
                      highlight: "sin esfuerzo",
                    },
                    {
                      text: "🔧 No te interesa mejorar tu flujo de trabajo",
                      highlight: "mejorar",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.4 + index * 0.1,
                      }}
                      viewport={{ once: true }}
                      className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 bg-claude-secondary/5"
                    >
                      <div
                        className="w-6 h-6 flex items-center justify-center mt-1"
                      >
                        <span
                          className="text-xl"
                        >
                          {item.text.substring(0, 2).trim()}
                        </span>
                      </div>
                      <p
                        className="text-base leading-relaxed text-claude-gray"
                      >
                        {item.text.substring(2).split(item.highlight)[0]}
                        <span
                          className="font-semibold text-claude-secondary"
                        >
                          {item.highlight}
                        </span>
                        {item.text.substring(2).split(item.highlight)[1]}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>
     <div className="relative bg-claude-dark py-16 lg:py-20 px-4">
<div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Inscríbete al curso {""}
            <span className="text-claude-primary">completo</span>
            </h2>
            <p className="text-claude-gray font-light text-lg max-w-2xl mx-auto">
            Accede a todos los módulos del curso + Acceso a nuevas sesiones
            </p>
          </motion.div>
              {/* Timeline Line */}
              <div
                className="absolute lg:left-[400px] left-[52px] top-[300px] bottom-[120px] w-0.5 opacity-30"
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
                    className="relative rounded-3xl p-8 backdrop-blur-sm overflow-hidden bg-claude-secondary/5 hover:shadow-xl transition-shadow duration-300"
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
            </div>

      {/* Video Demo Section */}
      <section className="pt-0 pb-10 lg:py-20 relative bg-claude-dark">
        <div className="relative container mx-auto px-4 z-10 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Técnicas que cambiarán tu carrera para{" "}
              <span className="text-claude-primary">siempre</span>
            </h2>
            <p className="font-light text-lg max-w-2xl mx-auto text-claude-gray">
              Descubre las técnicas avanzadas que separan a los verdaderos power
              users del resto
            </p>
          </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden border-2 bg-claude-dark border-claude-primary/20"
              style={{
                boxShadow: "0 20px 40px rgba(202, 155, 119, 0.1)",
              }}
            >
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src="https://www.youtube.com/embed/EkH82XjN45w"
                  title="Claude Code Power User - Demo de Técnicas Avanzadas"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="p-6 border-t border-claude-primary/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-claude-primary/20 text-claude-primary">
                      <BiPlay className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">
                        Demo de Técnicas Exclusivas
                      </h3>
                      <p className="text-sm text-claude-gray">
                        Las técnicas que solo conocen los verdaderos power users
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {["Context Pro", "MCP Setup", "SDK Mastery", "Automation"].map(
                      (tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-3 py-1 rounded-full border font-semibold bg-claude-primary/20 border-claude-primary/30 text-claude-primary"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

        </div>
      </section>
        {/* Instructor Section */}
        <section
          className="py-20 relative overflow-hidden bg-claude-dark"
     
        >
          {/* LiquidEther Background */}
       
          <div className="relative container mx-auto px-4 z-10 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div
                className="rounded-3xl p-8 md:p-12  relative overflow-hidden bg-[#1C1B1F] "
           
              >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span
                      className="font-light text-white/50"
                    >
                      Tu instructor
                    </span>
                    <h3
                      className="text-3xl font-bold mt-2 mb-4 text-claude-primary"
                    >
                      Héctor Bliss
                    </h3>
                    <p
                      className="mb-6 text-claude-gray"
                    >
                      Pionero en hacer la IA accesible para todos, con más de 8
                      años enseñando tecnología y una comunidad de más de 2,000
                      estudiantes activos.
                    </p>
                    <p
                      className="mb-6 text-claude-gray"
                    >
                      Especializado en enseñar herramientas complejas de forma
                      simple, Héctor te guiará paso a paso para crear agentes
                      sin código.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div
                          className="text-2xl font-bold text-claude-primary"
                        
                        >
                          8+
                        </div>
                        <div
                          className="text-xs text-claude-gray"
                        >
                          Años enseñando
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-2xl font-bold text-claude-primary"
                        >
                          2K+
                        </div>
                        <div
                          className="text-xs text-claude-gray"
                        >
                          Estudiantes
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-2xl font-bold text-claude-primary"
                        >
                          100%
                        </div>
                        <div
                          className="text-xs text-claude-gray"
                        >
                          Práctico
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full blur-3xl opacity-20"
                      style={{ backgroundColor: "#B0C5E3" }}
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
       {/* Final CTA - Completely Redesigned */}
        <section
          className="relative pt-10 lg:pt-32 pb-24 overflow-hidden bg-claude-dark"
        >

          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-16 "
              >
                <h2 className="text-4xl md:text-5xl font-black leading-tight mb-8">
                  <span className="text-white">
                    Elige la mejor opción
                  </span>
                  <br />
                  <span className="relative">
                    <span
                      className="bg-clip-text text-transparent bg-gradient-to-br from-claude-primary to-claude-secondary"
                    >
                      para ti
                    </span>
                   
                  </span>
                </h2>

                <p
                  className="text-xl md:text-2xl font-light mb-12 max-w-4xl mx-auto leading-relaxed text-claude-gray"
                >
          Accede al curso completo de inmediato. Aprende a tu ritmo con contenido on demand y prepárate para las próximas sesiones en vivo.

                </p>
              </motion.div>

              {/* CTA Cards Grid */}
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Free Session Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  {/* Badge */}
                  <div
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold z-10 text-white bg-claude-primary/50"
                    style={{
                      width: "max-content",
                      boxShadow: "0 2px 8px #B0C5E330",
                    }}
                  >
                    ✨ CURSO ONLINE EN VIVO ✨
                  </div>

                  <motion.div
                    className="relative p-8 pt-10 rounded-3xl border-2 border-claude-primary/50 backdrop-blur-sm bg-claude-primary/5 h-full"
                    style={{
                      boxShadow: "0 8px 32px #B0C5E320",
                    }}
                    whileHover={{
                      y: -3,
                      boxShadow: "0 15px 40px #B0C5E325",
                      transition: { duration: 0.3, ease: "easeOut" },
                    }}
                  >
                    <div className="pt-4">
                      <h3
                        className="text-2xl font-bold mb-4 text-center text-white"
                      >
                     Taller completo
                      </h3>
                      <div
                        className="text-4xl font-black text-center mb-2 text-claude-primary"
                      >
                        $3,499.00
                      </div>
                      <p
                        className="text-center mb-6 opacity-80 text-white"

                      >
                       Curo en línea • Sesión individual o grupal
                      </p>

                      <ul className="space-y-3 mb-8">
                        {[
                          "Incluye 4 sesiones de 2hrs cada (1 sesión por semana)",
                          "Acceso completo a las grabaciones del curso",
                          "Certificado de finalización",
                          "1 sesión de 1hr de Q&A en con el instructor",
                        ].map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-claude-primary"
                            >
                              <span
                                className="text-xs text-claude-dark"
                              >
                                ✓
                              </span>
                            </div>
                            <span
                              className="text-sm text-claude-gray"
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => setShowWebinarForm(true)}
                        className="w-full font-bold h-14 px-6 rounded-full text-white text-lg transition-all bg-gradient-to-r from-claude-primary to-claude-secondary transform hover:scale-105"
                        style={{
                          boxShadow: "0 10px 30px #B0C5E340",
                        }}
                      >
                        🎓 Reservar mi lugar 
                      </button>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Full Course Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  {/* Badge */}
                  <motion.div
                    className="absolute bg-claude-secondary -top-3 left-1/4 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold z-10 text-white"
                    style={{
                      boxShadow: "0 2px 10px var(--primary)40",
                    }}
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    🔥 CURSO PREGRABADO 🔥
                  </motion.div>

                  <motion.div
                    className="relative p-8 pt-10 rounded-3xl border-2 border-claude-secondary/50 backdrop-blur-sm bg-agentes-primary/5 h-full"
                    style={{
                      boxShadow: "0 8px 32px #B0C5E320",
                    }}
                    whileHover={{
                      y: -5,
                      boxShadow: "0 20px 50px #B0C5E330",
                      transition: { duration: 0.3, ease: "easeOut" },
                    }}
                  >
                    <div className="pt-4">
                      <h3
                        className="text-2xl font-bold mb-4 text-center text-white"
                      >
                        Curso Completo
                      </h3>
                      <div
                        className="text-4xl font-black text-center mb-2 text-claude-secondary"
                      >
                        $1,490 MXN
                      </div>
                      <p
                        className="text-center mb-6 opacity-80 text-white/80"

                      >
                        Curso en línea • A tu ritmo
                      </p>

                      <ul className="space-y-3 mb-8">
                        {[
                          "Acceso a las 4 sesiones pregrabadas del taller en vivo",
                          "Acceso a los recursos del curso",
                          "Certificado de finalización",
                          "Acceso a la comunidad de Discord",
                        ].map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full bg-claude-secondary flex items-center justify-center mt-0.5"
                            >
                              <span
                                className="text-xs text-claude-dark"
                              >
                                ✓
                              </span>
                            </div>
                            <span
                              className="text-sm text-claude-gray"
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <fetcher.Form method="post" className="w-full">
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
                          className="w-full font-bold h-14 px-6 rounded-full text-white text-lg transition-all bg-gradient-to-r from-claude-primary to-claude-secondary transform hover:scale-105 shadow-lg disabled:opacity-50"
                        >
                          {fetcher.state !== "idle" ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Procesando...
                            </div>
                          ) : (
                            "Comprar curso ahora →"
                          )}
                        </button>
                      </fetcher.Form>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            <p className="text-claude-gray  text-center text-sm mt-6">¿Tienes alguna pregunta? Mandanos un <a className="text-claude-primary underline cursor-pointer " href="https://wa.me/527757609276">Whats App <FaWhatsapp className="inline text-claude-primary" />  </a></p>
          
            </div>
          </div>
        </section>

      <SimpleFooter bgColor="bg-claude-dark"/>
    </main>
  );
}
