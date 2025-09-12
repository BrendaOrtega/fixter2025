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
import {
  BiBrain,
  BiTargetLock,
  BiRocket,
  BiStar,
  BiChip,
  BiCode,
  BiLayer,
  BiPlay,
  BiCheckCircle,
  BiChevronRight,
  BiGroup,
  BiMouseAlt,
  BiBot,
  BiPalette,
} from "react-icons/bi";
import {
  AiOutlineEye,
  AiOutlineCamera,
  AiOutlineFileImage,
  AiOutlineRobot,
  AiOutlineCode,
} from "react-icons/ai";
import { HiSparkles, HiLightningBolt, HiOutlineSparkles } from "react-icons/hi";
import { RiRobot2Line, RiPaletteLine, RiMagicLine } from "react-icons/ri";
import "~/styles/agentes-ia.css";

export const meta = () =>
  getMetaTags({
    title: " Sin Código | Curso Completo | FixterGeek",
    description:
      "Aprende a crear agentes de IA inteligentes sin programar. Construye chatbots, asistentes virtuales y automatizaciones complejas usando herramientas visuales no-code. Curso 100% práctico.",
  });

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "early_access_registration") {
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const phone = String(formData.get("phone"));
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
            "ia_visual_early_access",
            "newsletter",
            `experience-${experience}`,
            `interest-${interest}`,
          ],
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "ia_visual_2025",
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: ["ia_visual_early_access"] },
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "ia_visual_2025",
          },
        },
      });

      await sendWebinarCongrats({
        to: email,
        webinarTitle: "Agentes de IA Visual - Acceso Anticipado",
        webinarDate: "Próximamente",
        userName: name,
      });

      return data({
        success: true,
        type: "early_access",
        message: "Registro exitoso para acceso anticipado",
      });
    } catch (error) {
      console.error("Error registering for early access:", error);
      return data({
        success: false,
        error: "Error en el registro. Intenta nuevamente.",
      });
    }
  }

  if (intent === "direct_checkout") {
    const totalPrice = 2490;

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
          type: "ia-nocode-course",
          totalPrice: String(totalPrice),
        },
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: "Curso de Agentes de IA No-Code",
                description:
                  "Curso completo: Fundamentos, Herramientas Visuales, Agentes Inteligentes y Proyectos Comerciales",
              },
              unit_amount: totalPrice * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${location}/agentes-ia?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/agentes-ia?cancel=1`,
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

export default function IAVisualLanding() {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEarlyAccessForm, setShowEarlyAccessForm] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentCancel, setShowPaymentCancel] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<{moduleIndex: number, topicIndex: number} | null>(null);
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
      window.history.replaceState({}, "", "/agentes-ia");
    }
    if (urlParams.get("cancel") === "1") {
      setShowPaymentCancel(true);
      setTimeout(() => setShowPaymentCancel(false), 5000);
      window.history.replaceState({}, "", "/agentes-ia");
    }
  }, []);

  // Handle escape key for forms
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowEarlyAccessForm(false);
      }
    };

    if (showEarlyAccessForm) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [showEarlyAccessForm]);

  // Early Access Form Component - Single modal with internal states
  const EarlyAccessForm = () => {
    const isSuccess =
      fetcher.data?.success && fetcher.data?.type === "early_access";
    const error = fetcher.data?.error;
    const isLoading = fetcher.state !== "idle";

    // Trigger confetti only once
    useEffect(() => {
      if (isSuccess && !showConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }, [isSuccess, showConfetti]);

    return (
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
          showEarlyAccessForm
            ? "opacity-100 visible pointer-events-auto z-[60]"
            : "opacity-0 invisible pointer-events-none -z-10"
        }`}
        onClick={() => {
          // Only allow closing if not loading and not success
          if (!isLoading && !isSuccess) {
            setShowEarlyAccessForm(false);
          }
        }}
      >
        <motion.div
          animate={{
            scale: showEarlyAccessForm ? 1 : 0.9,
            y: showEarlyAccessForm ? 0 : 20,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            duration: 0.3,
          }}
          className={`agentes-ia-page bg-[var(--card)] rounded-2xl p-8 max-w-md w-full border-2 text-center transition-colors duration-300 ${
            isSuccess ? "border-green-500/30" : ""
          }`}
          style={{
            borderColor: isSuccess ? "hsl(120 60% 50%)" : "var(--chart-1)",
            boxShadow: `5px 5px 0px 0px ${
              isSuccess ? "hsl(120 60% 50% / 0.5)" : "var(--chart-1)"
            }`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header that doesn't change abruptly */}
          <div className="flex justify-between items-center mb-6">
            <motion.h3
              className="text-2xl font-bold"
              style={{ color: "var(--primary)" }}
              layout
            >
              {isSuccess ? "¡Registro Exitoso!" : "Acceso Anticipado"}
            </motion.h3>
            <button
              onClick={() => {
                // Only close if not loading, or if already success
                if (!isLoading || isSuccess) {
                  setShowEarlyAccessForm(false);
                }
              }}
              disabled={isLoading && !isSuccess}
              className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              ✕
            </button>
          </div>

          {/* Content that transforms without AnimatePresence - NO JUMPS */}
          <div className="relative min-h-[500px]">
            {/* Success State */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                isSuccess ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{
                  scale: isSuccess ? 1 : 0,
                  rotate: isSuccess ? 0 : -180,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                🎉
              </motion.div>
              <p
                style={{ color: "var(--foreground)" }}
                className="mb-6 text-center"
              >
                Te has registrado exitosamente para el acceso anticipado. Te
                notificaremos en cuanto el curso esté disponible.
              </p>
              <motion.button
                onClick={() => {
                  setShowEarlyAccessForm(false);
                  setTimeout(() => {
                    if (fetcher.data) {
                      fetcher.load("/agentes-ia");
                    }
                  }, 300);
                }}
                className="w-full font-bold py-3 px-6 rounded-lg transition-all"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cerrar
              </motion.button>
            </div>

            {/* Loading State */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
                isLoading ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className="w-8 h-8 border-2 border-current/20 border-t-current rounded-full animate-spin"
                  style={{ color: "var(--primary)" }}
                ></div>
                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  Registrando...
                </span>
              </div>
              <p style={{ color: "var(--foreground)" }} className="text-center">
                Procesando tu solicitud, espera un momento...
              </p>
            </div>

            {/* Form State */}
            <div
              className={`absolute inset-0 transition-all duration-500 ${
                !isLoading && !isSuccess
                  ? "opacity-100 visible"
                  : "opacity-0 invisible"
              }`}
            >
              <fetcher.Form
                method="post"
                action="/agentes-ia"
                className="space-y-3"
              >
                <input
                  type="hidden"
                  name="intent"
                  value="early_access_registration"
                />

                <div>
                  <label
                    className="block mb-1 text-left"
                    style={{ color: "var(--primary)" }}
                  >
                    Nombre
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 h-12 rounded-lg border focus:ring-0 focus:outline-none"
                    style={{
                      backgroundColor: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 text-left"
                    style={{ color: "var(--primary)" }}
                  >
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 h-12 rounded-lg border focus:ring-0 focus:outline-none"
                    style={{
                      backgroundColor: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 text-left"
                    style={{ color: "var(--primary)" }}
                  >
                    Teléfono (opcional)
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full px-4 h-12 rounded-lg border focus:ring-0 focus:outline-none"
                    style={{
                      backgroundColor: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    placeholder="+52 1 234 567 8900"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block mb-1 text-xs text-left"
                      style={{ color: "var(--primary)" }}
                    >
                      ¿Qué te atrae más de los agentes de IA?
                    </label>
                    <select
                      name="experience"
                      required
                      className="w-full px-2 h-12 rounded-lg border focus:ring-0 focus:outline-none text-xs"
                      style={{
                        backgroundColor: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      <option value="">Selecciona...</option>
                      <option value="automate-business">
                        Automatizar mi negocio
                      </option>
                      <option value="new-revenue">
                        Generar ingresos extra
                      </option>
                      <option value="learn-ai">Aprender sobre IA</option>
                      <option value="help-clients">
                        Ayudar a mis clientes
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block mb-1 text-xs text-left"
                      style={{ color: "var(--primary)" }}
                    >
                      ¿Cuál es tu situación actual?
                    </label>
                    <select
                      name="interest"
                      required
                      className="w-full px-2 h-12 rounded-lg border focus:ring-0 focus:outline-none text-xs"
                      style={{
                        backgroundColor: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      <option value="">Selecciona...</option>
                      <option value="business-owner">Tengo un negocio</option>
                      <option value="employee">Soy empleado/a</option>
                      <option value="freelancer">Trabajo por mi cuenta</option>
                      <option value="student">Soy estudiante</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: "var(--destructive)",
                      borderColor: "var(--destructive)",
                      color: "var(--destructive)",
                    }}
                  >
                    {error}
                  </div>
                )}
                <br />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full font-bold py-4 px-8 rounded-full text-lg transition-all disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, var(--muted-foreground) 100%)",
                    color: "var(--primary-foreground)",
                    boxShadow: "3px 3px 0px 0px var(--border)",
                  }}
                >
                  Obtener Acceso Anticipado 🚀
                </button>
              </fetcher.Form>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      {/* Color Scheme Override for this page only */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .agentes-ia-page {
          --background: #2a2024;
          --foreground: #f2e9e4;
          --card: #392f35;
          --card-foreground: #f2e9e4;
          --popover: #392f35;
          --popover-foreground: #f2e9e4;
          --primary: #ff7e5f;
          --primary-foreground: #ffffff;
          --secondary: #463a41;
          --secondary-foreground: #f2e9e4;
          --muted: #392f35;
          --muted-foreground: #d7c6bc;
          --accent: #feb47b;
          --accent-foreground: #2a2024;
          --destructive: #e63946;
          --destructive-foreground: #ffffff;
          --border: #463a41;
          --input: #463a41;
          --ring: #ff7e5f;
          --chart-1: #ff7e5f;
          --chart-2: #feb47b;
          --chart-3: #ffcaa7;
          --chart-4: #ffad8f;
          --chart-5: #ce6a57;
          --sidebar: #2a2024;
          --sidebar-foreground: #f2e9e4;
          --sidebar-primary: #ff7e5f;
          --sidebar-primary-foreground: #ffffff;
          --sidebar-accent: #feb47b;
          --sidebar-accent-foreground: #2a2024;
          --sidebar-border: #463a41;
          --sidebar-ring: #ff7e5f;
        }
      `,
        }}
      />
      <div className="agentes-ia-page">
        {/* Single Modal */}
        <EarlyAccessForm />

        {/* Payment Success Modal */}
        <AnimatePresence>
          {showPaymentSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => setShowPaymentSuccess(false)}
            >
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                exit={{ y: 50 }}
                className="rounded-2xl p-8 max-w-md w-full border-2 text-center"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--chart-1)",
                  boxShadow: "5px 5px 0px 0px var(--chart-1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-6xl mb-4">🎉</div>
                <h3
                  className="text-2xl font-bold mb-4"
                  style={{ color: "var(--primary)" }}
                >
                  ¡Pago Completado!
                </h3>
                <p className="mb-6" style={{ color: "var(--foreground)" }}>
                  Tu inscripción al curso ha sido confirmada exitosamente. Te
                  enviaremos todos los detalles por email.
                </p>
                <button
                  onClick={() => setShowPaymentSuccess(false)}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-all"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => setShowPaymentCancel(false)}
            >
              <motion.div
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                exit={{ y: 50 }}
                className="rounded-2xl p-8 max-w-md w-full border-2 text-center"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--destructive)",
                  boxShadow: "5px 5px 0px 0px var(--destructive)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-6xl mb-4">⏸️</div>
                <h3
                  className="text-2xl font-bold mb-4"
                  style={{ color: "var(--destructive)" }}
                >
                  Pago Cancelado
                </h3>
                <p className="mb-6" style={{ color: "var(--foreground)" }}>
                  No te preocupes, tu lugar sigue disponible. Puedes completar
                  tu inscripción cuando quieras.
                </p>
                <button
                  onClick={() => setShowPaymentCancel(false)}
                  className="w-full font-bold py-3 px-6 rounded-lg transition-all"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Entendido
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confetti */}
        {showConfetti && (
          <EmojiConfetti
            emojis={["🤖", "👁️", "✨", "🎨", "🚀", "💡", "🎯"]}
            small
          />
        )}

        {/* Hero Section - Completely Redesigned */}
        <section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--background) 0%, var(--card) 50%, var(--muted) 100%)",
          }}
        >
          {/* Dynamic Background Pattern */}
          <div className="absolute inset-0">
            {/* Animated Grid */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, var(--chart-1) 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            ></div>

            {/* Floating Shapes */}
            <div
              className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-20 animate-pulse"
              style={{
                background:
                  "radial-gradient(circle, var(--primary)30 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute top-3/4 right-1/4 w-48 h-48 rounded-full opacity-15 animate-pulse animation-delay-2000"
              style={{
                background:
                  "radial-gradient(circle, var(--chart-2)30 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute bottom-1/4 left-1/3 w-24 h-24 rounded-full opacity-25 animate-pulse animation-delay-1000"
              style={{
                background:
                  "radial-gradient(circle, var(--chart-1)40 0%, transparent 70%)",
              }}
            ></div>
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20">
            <div className="max-w-6xl mx-auto">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
              >
                <div
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full border-2 backdrop-blur-sm"
                  style={{
                    backgroundColor: "hsl(var(--card) / 0.8)",
                    borderColor: "var(--primary)",
                    boxShadow: "0 8px 32px hsl(var(--primary) / 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--primary)" }}
                    ></div>
                    <span
                      className="font-bold text-lg"
                      style={{ color: "var(--primary)" }}
                    >
                      TALLER PREMIUM EN VIVO
                    </span>
                  </div>
                  <div
                    className="h-8 w-px"
                    style={{ backgroundColor: "var(--border)" }}
                  ></div>
                  <span
                    className="text-sm font-black px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    1ª SESIÓN GRATIS
                  </span>
                </div>
              </motion.div>

              {/* Main Hero Content */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Content */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-8">
                    <span style={{ color: "var(--foreground)" }}>Crea</span>{" "}
                    <span className="relative">
                      <span
                        style={{
                          background:
                            "linear-gradient(135deg, var(--primary), var(--chart-2))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Agentes de IA
                      </span>

                      <div
                        className="absolute -bottom-2 left-0 right-0 h-1 rounded-full opacity-60"
                        style={{
                          background:
                            "linear-gradient(90deg, var(--primary), var(--chart-2))",
                        }}
                      ></div>
                    </span>
                    <br />
                    <span style={{ color: "var(--muted-foreground)" }}>
                      Sin Código
                    </span>
                  </h1>

                  <p
                    className="text-xl lg:text-2xl font-light mb-10 leading-relaxed max-w-xl"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Domina las herramientas visuales más avanzadas para
                    construir agentes inteligentes.
                    <span
                      className="font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      {" "}
                      4 sesiones intensivas, primera completamente gratis.
                    </span>
                  </p>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-3 mb-10">
                    {[
                      { text: "🧠 GPT-5 & Claude", color: "var(--chart-1)" },
                      { text: "🔗 Integraciones API", color: "var(--chart-2)" },
                      { text: "🖥️ Servidor Incluido", color: "var(--primary)" },
                      { text: "📊 Proyectos Reales", color: "var(--chart-3)" },
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                        className="px-4 py-2 rounded-full text-sm font-semibold border"
                        style={{
                          backgroundColor: feature.color + "20",
                          borderColor: feature.color + "40",
                          color: feature.color,
                        }}
                      >
                        {feature.text}
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    onClick={() => setShowEarlyAccessForm(true)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative font-bold py-6 px-10 rounded-2xl text-xl transition-all duration-300 overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--chart-2) 100%)",
                      color: "var(--primary-foreground)",
                      boxShadow: "0 10px 30px hsl(var(--primary) / 0.4)",
                    }}
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      🚀 Reservar Mi Lugar Gratis
                      <BiChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </motion.button>

                  <p
                    className="text-sm mt-4 opacity-80"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    ⚡ Notificación instantánea • 🎯 Primera sesión gratis • 🔒
                    Sin compromiso
                  </p>
                </motion.div>

                {/* Right Content - Interactive Preview */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="relative"
                >
                  <div className="relative z-10">
                    {/* Main Dashboard Mockup */}
                    <div
                      className="rounded-2xl p-8 border-2 backdrop-blur-sm"
                      style={{
                        backgroundColor: "hsl(var(--card) / 0.9)",
                        borderColor: "var(--chart-1)",
                        boxShadow: "0 20px 40px hsl(var(--card) / 0.5)",
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: "var(--destructive)" }}
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: "var(--primary)" }}
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: "var(--chart-1)" }}
                          ></div>
                        </div>
                        <span
                          className="text-xs font-mono"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          visual-ai-builder.app
                        </span>
                      </div>

                      {/* Content */}
                      <div className="space-y-6">
                        {/* Workflow Visual */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            {
                              icon: <BiBot className="w-4 h-4" />,
                              label: "Input",
                              color: "var(--chart-1)",
                            },
                            {
                              icon: <BiBrain className="w-4 h-4" />,
                              label: "Process",
                              color: "var(--primary)",
                            },
                            {
                              icon: <BiRocket className="w-4 h-4" />,
                              label: "Output",
                              color: "var(--chart-2)",
                            },
                          ].map((node, index) => (
                            <motion.div
                              key={index}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{
                                duration: 2,
                                delay: index * 0.5,
                                repeat: Infinity,
                              }}
                              className="p-4 rounded-lg border text-center"
                              style={{
                                backgroundColor: node.color + "10",
                                borderColor: node.color + "30",
                                color: node.color,
                              }}
                            >
                              <div className="flex justify-center mb-2">
                                {node.icon}
                              </div>
                              <span className="text-xs font-semibold">
                                {node.label}
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Stats */}
                        <div
                          className="grid grid-cols-2 gap-4 pt-4 border-t"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: "var(--chart-1)" }}
                            >
                              4
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              Sesiones Vivo
                            </div>
                          </div>
                          <div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: "var(--primary)" }}
                            >
                              ∞
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              Posibilidades
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating Elements */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -top-4 -right-4 p-3 rounded-full border-2"
                      style={{
                        backgroundColor: "var(--primary)",
                        borderColor: "var(--card)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      <HiSparkles className="w-6 h-6" />
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      className="absolute -bottom-2 -left-6 p-2 rounded-lg border"
                      style={{
                        backgroundColor: "var(--chart-2)",
                        borderColor: "var(--card)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      <AiOutlineRobot className="w-4 h-4" />
                    </motion.div>
                  </div>

                  {/* Background Glow */}
                  <div
                    className="absolute inset-0 rounded-2xl blur-3xl opacity-20"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--chart-2) 100%)",
                    }}
                  ></div>
                </motion.div>
              </div>

              {/* Bottom Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto"
              >
                {[
                  {
                    number: "4",
                    label: "Sesiones Interactivas",
                    desc: "en vivo con Q&A",
                    color: "var(--chart-1)",
                  },
                  {
                    number: "1ª",
                    label: "Sesión Gratis",
                    desc: "sin compromiso",
                    color: "var(--chart-2)",
                  },
                  {
                    number: "15",
                    label: "Días Extra",
                    desc: "servidor personal",
                    color: "var(--primary)",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      rotateY: 5,
                      boxShadow: "0 20px 40px hsl(var(--primary) / 0.15)",
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        mass: 0.8
                      }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="text-center p-6 rounded-2xl border backdrop-blur-sm cursor-pointer"
                    style={{
                      backgroundColor: "hsl(var(--card) / 0.6)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      className="text-4xl font-black mb-2"
                      style={{ color: stat.color }}
                    >
                      {stat.number}
                    </div>
                    <div
                      className="text-lg font-semibold mb-1"
                      style={{ color: "var(--foreground)" }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="text-sm opacity-80"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {stat.desc}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* What You'll Build Section */}
        <section
          className="py-20 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(45deg, var(--muted) 0%, var(--card) 100%)",
          }}
        >
          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                Lo que construirás
              </h2>
              <p
                className="font-light text-lg max-w-2xl mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                Agentes inteligentes que tus clientes usarán desde el día uno
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: <RiRobot2Line className="w-8 h-8" />,
                  title: "Chatbot de Soporte Inteligente",
                  description:
                    "Asistente que responde dudas complejas y deriva casos automáticamente",
                  tech: ["GPT-5", "Base de Conocimiento", "Integraciones"],
                  color: "var(--chart-1)",
                },
                {
                  icon: <BiLayer className="w-8 h-8" />,
                  title: "Automatizador de Tareas",
                  description:
                    "Agente que gestiona procesos empresariales y toma decisiones inteligentes",
                  tech: ["Workflows", "Condicionales", "APIs"],
                  color: "var(--chart-2)",
                },
                {
                  icon: <BiChip className="w-8 h-8" />,
                  title: "Agente de Ventas IA",
                  description:
                    "Asistente que califica leads, agenda citas y hace seguimiento personalizado",
                  tech: ["CRM Integration", "Email Marketing", "Analytics"],
                  color: "var(--chart-3)",
                },
                {
                  icon: <AiOutlineFileImage className="w-8 h-8" />,
                  title: "Generador de Contenido",
                  description:
                    "Agente que crea blogs, emails y contenido para redes sociales automáticamente",
                  tech: ["GPT-5", "Templates", "Social Media APIs"],
                  color: "var(--primary)",
                },
                {
                  icon: <AiOutlineCamera className="w-8 h-8" />,
                  title: "Asistente de Investigación",
                  description:
                    "Agente que busca información, analiza datos y genera reportes completos",
                  tech: ["Web Scraping", "Data Analysis", "Report Generation"],
                  color: "var(--chart-1)",
                },
                {
                  icon: <BiMouseAlt className="w-8 h-8" />,
                  title: "Agente de Atención al Cliente",
                  description:
                    "Sistema completo que maneja tickets, responde consultas y escala problemas",
                  tech: ["Multi-Channel", "Ticket System", "Knowledge Base"],
                  color: "var(--chart-2)",
                },
              ].map((project, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.03, 
                    y: -12,
                    rotateX: 5,
                    boxShadow: "0 25px 50px hsl(var(--primary) / 0.12)",
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      mass: 0.9
                    }
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="border-2 rounded-2xl p-6 group cursor-pointer overflow-hidden relative"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {/* Hover Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  <motion.div
                    className="p-3 rounded-lg inline-block mb-4 transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: project.color + "20",
                      color: project.color,
                    }}
                    whileHover={{ 
                      rotate: [0, -10, 10, 0],
                      scale: 1.2
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "easeInOut"
                    }}
                  >
                    {project.icon}
                  </motion.div>
                  <h3
                    className="text-xl font-bold mb-3"
                    style={{ color: "var(--foreground)" }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className="mb-4"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full border"
                        style={{
                          backgroundColor: "var(--chart-3)",
                          borderColor: "hsl(var(--chart-3) / 0.3)",
                          color: "black",
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Video Demo Section */}
        <section
          className="py-20 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--card) 0%, var(--background) 100%)",
          }}
        >
          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                Demo de la herramienta
              </h2>
              <p
                className="font-light text-lg max-w-2xl mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                Descubre la plataforma visual que usaremos en el taller para crear agentes inteligentes
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative rounded-3xl overflow-hidden border-2"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--chart-1)",
                  boxShadow: "0 20px 40px hsl(var(--card) / 0.5)",
                }}
              >
                {/* Video Container */}
                <div className="relative pb-[56.25%] h-0">
                  <iframe
                    src="https://www.youtube.com/embed/yqlndqa7o8k"
                    title="Demo: Agente de IA sin código"
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Video Overlay Info */}
                <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: "var(--primary)20",
                          color: "var(--primary)",
                        }}
                      >
                        <BiPlay className="w-6 h-6" />
                      </div>
                      <div>
                        <h3
                          className="font-bold text-lg"
                          style={{ color: "var(--foreground)" }}
                        >
                          Demo de la Plataforma
                        </h3>
                        <p
                          className="text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          La herramienta visual que dominarás en el taller
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["Interfaz Visual", "Drag & Drop", "No-Code"].map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-3 py-1 rounded-full border font-semibold"
                          style={{
                            backgroundColor: "var(--chart-2)20",
                            borderColor: "var(--chart-2)30",
                            color: "var(--chart-2)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Bottom Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
              >
                {[
                  {
                    icon: <BiTargetLock className="w-6 h-6" />,
                    stat: "100%",
                    label: "Visual",
                    desc: "Sin código",
                  },
                  {
                    icon: <BiRocket className="w-6 h-6" />,
                    stat: "15min",
                    label: "Setup",
                    desc: "Primer agente",
                  },
                  {
                    icon: <BiStar className="w-6 h-6" />,
                    stat: "∞",
                    label: "Posibilidades",
                    desc: "Una vez aprendido",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="text-center p-6 rounded-2xl border backdrop-blur-sm"
                    style={{
                      backgroundColor: "hsl(var(--card) / 0.6)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      className="inline-flex items-center justify-center p-3 rounded-lg mb-3"
                      style={{
                        backgroundColor: "var(--primary)20",
                        color: "var(--primary)",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--primary)" }}
                    >
                      {item.stat}
                    </div>
                    <div
                      className="font-semibold mb-1"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-sm opacity-80"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Curriculum Section */}
        <section
          className="py-20 relative"
          style={{
            background:
              "linear-gradient(135deg, var(--background) 0%, var(--secondary) 100%)",
          }}
        >
          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                Programa del Taller
              </h2>
              <p
                className="font-light text-lg max-w-2xl mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                4 sesiones en vivo donde construirás agentes reales desde cero
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto relative">
              {/* Animated Timeline Line */}
              <div 
                className="absolute left-[52px] top-[120px] bottom-[200px] w-0.5 opacity-20"
                style={{
                  background: "linear-gradient(to bottom, transparent, var(--primary), transparent)"
                }}
              >
                <motion.div
                  className="w-full"
                  style={{
                    background: "linear-gradient(to bottom, var(--chart-1), var(--chart-2), var(--chart-3), var(--primary))"
                  }}
                  initial={{ height: 0 }}
                  whileInView={{ height: "100%" }}
                  transition={{ duration: 2, delay: 0.5 }}
                  viewport={{ once: true }}
                />
              </div>
              {[
                {
                  module: "Sesión 1 (GRATIS)",
                  title: "Tu Primer Agente en 30 Minutos",
                  icon: <BiRocket className="w-6 h-6" />,
                  badge: "🎁 GRATIS",
                  topics: [
                    {
                      title: "Instalación y configuración de tu servidor personal",
                      description: "Te guiaré paso a paso para configurar tu entorno de trabajo con acceso a herramientas profesionales de IA, completamente gratis durante el taller."
                    },
                    {
                      title: "Interfaz visual: nodos, cadenas y flujos",
                      description: "Aprenderás a usar la interfaz drag-and-drop para conectar componentes de IA sin escribir código, como si fuera un diagrama de flujo visual."
                    },
                    {
                      title: "Conectar tu primer modelo de IA (GPT, Claude, Gemini)",
                      description: "Configuraremos conexiones directas a los modelos más potentes del mercado y aprenderás cuándo usar cada uno según tu proyecto."
                    },
                    {
                      title: "Crear un chatbot funcional con memoria",
                      description: "Construirás tu primer agente que puede mantener conversaciones coherentes, recordar contexto y responder de forma natural."
                    },
                  ],
                  color: "var(--chart-1)",
                  progress: "25%",
                },
                {
                  module: "Sesión 2",
                  title: "Bases de Conocimiento y RAG",
                  icon: <BiBrain className="w-6 h-6" />,
                  badge: "📚 RAG",
                  topics: [
                    {
                      title: "Cargar y procesar documentos (PDF, Word, Web)",
                      description: "Aprenderás a subir cualquier tipo de documento y convertirlo automáticamente en conocimiento que tu agente puede usar para responder preguntas específicas."
                    },
                    {
                      title: "Crear bases de conocimiento vectoriales",
                      description: "Construiremos una base de datos inteligente que entiende el contexto y significado de tu información, no solo palabras clave."
                    },
                    {
                      title: "RAG: Agentes que responden con tu información",
                      description: "Tu agente podrá buscar y citar información exacta de tus documentos, combinando la potencia de la IA con tus datos específicos."
                    },
                    {
                      title: "Proyecto: Chatbot experto en tu restaurante/tienda",
                      description: "Construiremos un agente que conoce tu menú, precios, horarios y políticas. Podrá responder '¿Hacen entregas?', '¿Cuánto cuesta el combo familiar?' o '¿Aceptan tarjetas?' como si fuera tu empleado más informado."
                    },
                  ],
                  color: "var(--chart-2)",
                  progress: "50%",
                },
                {
                  module: "Sesión 3",
                  title: "Herramientas y Automatizaciones",
                  icon: <BiLayer className="w-6 h-6" />,
                  badge: "🔧 TOOLS",
                  topics: [
                    {
                      title: "Agentes con herramientas: búsqueda web, calculadora, APIs",
                      description: "Tu agente podrá usar herramientas externas como buscar en Google, hacer cálculos complejos o conectarse con servicios externos en tiempo real."
                    },
                    {
                      title: "Cadenas secuenciales y paralelas",
                      description: "Aprenderás a crear flujos de trabajo donde tu agente puede realizar múltiples tareas en orden o simultáneamente para resolver problemas complejos."
                    },
                    {
                      title: "Integraciones: WhatsApp, Telegram, Discord",
                      description: "Conectaremos tu agente directamente a plataformas de mensajería para que pueda interactuar con usuarios donde ellos ya están."
                    },
                    {
                      title: "Proyecto: Agente multi-herramienta para tu negocio",
                      description: "Construirás un agente versátil que combine todas las herramientas aprendidas para automatizar procesos específicos de tu industria."
                    },
                  ],
                  color: "var(--chart-3)",
                  progress: "75%",
                },
                {
                  module: "Sesión 4",
                  title: "Deployment y Monetización",
                  icon: <BiTargetLock className="w-6 h-6" />,
                  badge: "💰 LAUNCH",
                  topics: [
                    {
                      title: "Publicar tu agente: embeddings, APIs, widgets",
                      description: "Aprenderás diferentes formas de hacer tu agente accesible: desde widgets en sitios web hasta APIs que otras aplicaciones pueden usar."
                    },
                    {
                      title: "Seguridad y control de acceso",
                      description: "Implementaremos medidas de seguridad para proteger tu agente y controlar quién puede usarlo, especialmente importante para aplicaciones comerciales."
                    },
                    {
                      title: "Cómo vender agentes a empresas locales",
                      description: "Te mostraré estrategias probadas para identificar oportunidades, presentar tu servicio y cerrar ventas con pequeñas y medianas empresas."
                    },
                    {
                      title: "Casos de éxito y modelos de negocio probados",
                      description: "Analizaremos ejemplos reales de estudiantes que han monetizado sus agentes y los diferentes modelos: suscripción, por uso, o servicios personalizados."
                    },
                  ],
                  color: "var(--primary)",
                  progress: "100%",
                },
              ].map((module, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60, rotateX: -15 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: index * 0.15,
                    type: "spring",
                    stiffness: 100
                  }}
                  viewport={{ once: true }}
                  whileHover={{
                    scale: 1.02,
                    y: -12,
                    rotateY: 2,
                    boxShadow: `0 25px 60px ${module.color}25`,
                    transition: {
                      type: "spring",
                      stiffness: 250,
                      damping: 18,
                      mass: 0.8
                    }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="mb-8 group cursor-pointer"
                >
                  <div
                    className="relative rounded-3xl p-8 backdrop-blur-sm overflow-hidden"
                    style={{
                      backgroundColor: "var(--card)",
                      boxShadow: `0 8px 32px ${module.color}10`,
                      border: `1px solid ${module.color}20`,
                    }}
                  >
                    {/* Background Gradient */}
                    <motion.div 
                      className="absolute inset-0 opacity-5 group-hover:opacity-8 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${module.color}20 0%, transparent 50%)`
                      }}
                      whileHover={{
                        background: `linear-gradient(135deg, ${module.color}25 0%, ${module.color}05 70%, transparent 100%)`,
                        transition: { duration: 0.3 }
                      }}
                    />
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-800 ease-out opacity-0 group-hover:opacity-100"></div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        {/* Animated Icon */}
                        <motion.div
                          className="p-4 rounded-2xl border-2"
                          style={{
                            backgroundColor: module.color + "20",
                            borderColor: module.color + "40",
                            color: module.color,
                          }}
                          whileHover={{
                            rotate: [0, -10, 10, 0],
                            scale: 1.1,
                            transition: { duration: 0.6 }
                          }}
                        >
                          {module.icon}
                        </motion.div>
                        
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span 
                              className="font-bold text-lg"
                              style={{ color: module.color }}
                            >
                              {module.module}
                            </span>
                            <motion.span 
                              className="text-xs px-3 py-1 rounded-full font-bold border"
                              style={{
                                backgroundColor: module.color + "20",
                                borderColor: module.color + "40",
                                color: module.color,
                              }}
                              whileHover={{
                                scale: 1.1,
                                backgroundColor: module.color + "30",
                                transition: { duration: 0.2 }
                              }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {module.badge}
                            </motion.span>
                          </div>
                          <motion.h3
                            className="text-2xl font-bold group-hover:scale-105 transition-transform duration-300"
                            style={{ color: "var(--foreground)" }}
                            whileHover={{ 
                              x: 5,
                              transition: { type: "spring", stiffness: 400 }
                            }}
                          >
                            {module.title}
                          </motion.h3>
                        </div>
                      </div>
                      
                      {/* Progress Circle */}
                      <motion.div 
                        className="relative w-16 h-16"
                        whileHover={{ 
                          scale: 1.1,
                          rotate: 5,
                          transition: { type: "spring", stiffness: 300, damping: 20 }
                        }}
                      >
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
                            whileInView={{ pathLength: parseInt(module.progress) / 100 }}
                            transition={{ duration: 1.5, delay: index * 0.2 }}
                            style={{
                              pathLength: parseInt(module.progress) / 100
                            }}
                          />
                        </svg>
                        <div 
                          className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                          style={{ color: module.color }}
                        >
                          {module.progress}
                        </div>
                      </motion.div>
                    </div>

                    {/* Topics List */}
                    <ul className="space-y-3 relative z-10">
                      {module.topics.map((topic, idx) => {
                        const isSelected = selectedTopic?.moduleIndex === index && selectedTopic?.topicIndex === idx;
                        const isModuleExpanded = expandedModule === index;
                        
                        return (
                          <motion.li 
                            key={idx} 
                            className="group/item"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ 
                              duration: 0.5, 
                              delay: (index * 0.15) + (idx * 0.1) + 0.3 
                            }}
                            viewport={{ once: true }}
                          >
                            <motion.div
                              className="flex items-start gap-4 cursor-pointer p-3 rounded-xl"
                              animate={{
                                backgroundColor: isSelected ? module.color + "10" : "transparent"
                              }}
                              whileHover={{ 
                                x: 6,
                                backgroundColor: module.color + "08"
                              }}
                              whileTap={{ scale: 0.98 }}
                              transition={{
                                duration: 0.2,
                                ease: "easeOut"
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTopic(null);
                                  setExpandedModule(null);
                                } else {
                                  setSelectedTopic({ moduleIndex: index, topicIndex: idx });
                                  setExpandedModule(index);
                                }
                              }}
                            >
                              <motion.div
                                className="flex-shrink-0 mt-1"
                                whileHover={{ 
                                  rotate: 360,
                                  scale: 1.2
                                }}
                                animate={{
                                  scale: isSelected ? 1.1 : 1,
                                  rotate: isSelected ? 90 : 0
                                }}
                                transition={{
                                  duration: 0.25,
                                  ease: "easeOut"
                                }}
                              >
                                <BiCheckCircle
                                  className="w-5 h-5"
                                  style={{ color: module.color }}
                                />
                              </motion.div>
                              <span 
                                className="group-hover/item:text-white transition-colors duration-300 font-medium"
                                style={{ 
                                  color: isSelected ? module.color : "var(--muted-foreground)"
                                }}
                              >
                                {topic.title}
                              </span>
                            </motion.div>
                            
                            {/* Description Card */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  layout
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ 
                                    duration: 0.4,
                                    ease: [0.04, 0.62, 0.23, 0.98]
                                  }}
                                  className="ml-9 mt-3 overflow-hidden"
                                >
                                  <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ 
                                      duration: 0.3,
                                      delay: 0.1,
                                      ease: "easeOut"
                                    }}
                                    className="p-4 rounded-xl backdrop-blur-sm relative"
                                    style={{
                                      backgroundColor: module.color + "08",
                                      boxShadow: `0 4px 20px ${module.color}12`
                                    }}
                                  >
                                    {/* Subtle left accent */}
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                                      style={{ backgroundColor: module.color }}
                                    />
                                    
                                    <p
                                      className="text-sm leading-relaxed pl-3"
                                      style={{ color: "var(--foreground)" }}
                                    >
                                      {topic.description}
                                    </p>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Who Is This For Section - Completely Redesigned */}
        <section
          className="py-32 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--background) 0%, var(--secondary) 60%, var(--card) 100%)",
          }}
        >
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, var(--primary) 2px, transparent 2px)",
                backgroundSize: "60px 60px",
              }}
            ></div>

            {/* Floating Icons */}
            <div
              className="absolute top-20 right-20 w-16 h-16 rounded-full opacity-20 animate-pulse"
              style={{
                background:
                  "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute bottom-32 left-16 w-12 h-12 rounded-full opacity-25 animate-pulse animation-delay-2000"
              style={{
                background:
                  "radial-gradient(circle, var(--chart-3) 0%, transparent 70%)",
              }}
            ></div>
          </div>

          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <div
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8 border-2"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--accent)",
                    boxShadow: "0 8px 32px var(--accent)15",
                  }}
                >
                  <span className="text-2xl">🎯</span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: "var(--accent)" }}
                  >
                    ENCUENTRA TU PERFIL
                  </span>
                </div>

                <h2 className="text-5xl md:text-6xl font-black leading-tight mb-8">
                  <span style={{ color: "var(--foreground)" }}>
                    ¿Este taller es para{" "}
                  </span>
                  <span className="relative">
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), var(--accent))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      ti?
                    </span>
                    <div
                      className="absolute -bottom-2 left-0 right-0 h-2 rounded-full opacity-60"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--primary), var(--accent))",
                      }}
                    ></div>
                  </span>
                </h2>

                <p
                  className="text-xl md:text-2xl font-light max-w-3xl mx-auto leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Descubre si este taller se adapta a tu perfil y objetivos
                  profesionales.
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    <br />
                    Sin importar tu experiencia previa. 👶🏻
                  </span>
                </p>
              </motion.div>

              {/* Cards Grid */}
              <div className="grid md:grid-cols-2 gap-12 mb-16">
                {/* Perfect For Card */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div
                    className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl flex items-center justify-center z-10"
                    style={{ backgroundColor: "var(--chart-3)" }}
                  >
                    <span className="text-2xl">✅</span>
                  </div>

                  <div
                    className="border-2 rounded-3xl p-8 pt-12 backdrop-blur-sm"
                    style={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--chart-3)",
                      boxShadow: "0 20px 40px var(--chart-3)20",
                    }}
                  >
                    <h3
                      className="text-3xl font-bold mb-6"
                      style={{ color: "var(--foreground)" }}
                    >
                      Perfecto para ti si...
                    </h3>

                    <div className="space-y-4">
                      {[
                        {
                          text: "🚀 Quieres crear agentes de IA pero no sabes programar",
                          highlight: "crear agentes",
                        },
                        {
                          text: "🏢 Tienes una empresa y necesitas automatizar procesos",
                          highlight: "automatizar",
                        },
                        {
                          text: "💰 Buscas una nueva fuente de ingresos con IA",
                          highlight: "ingresos",
                        },
                        {
                          text: "🎯 Quieres ofrecer servicios de automatización",
                          highlight: "servicios",
                        },
                        {
                          text: "🤯 Te fascina la IA pero los cursos técnicos te abruman",
                          highlight: "te abruman",
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
                          className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105"
                          style={{ backgroundColor: "var(--secondary)" }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center mt-1"
                            style={{ backgroundColor: "var(--chart-3)" }}
                          >
                            <span
                              className="text-xs font-bold"
                              style={{ color: "#ffffff" }}
                            >
                              ✓
                            </span>
                          </div>
                          <p
                            className="text-base leading-relaxed"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.text.split(item.highlight)[0]}
                            <span
                              className="font-semibold"
                              style={{ color: "var(--chart-3)" }}
                            >
                              {item.highlight}
                            </span>
                            {item.text.split(item.highlight)[1]}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Prerequisites Card */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div
                    className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl flex items-center justify-center z-10"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    <span className="text-2xl">📋</span>
                  </div>

                  <div
                    className="border-2 rounded-3xl p-8 pt-12 backdrop-blur-sm"
                    style={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--primary)",
                      boxShadow: "0 20px 40px var(--primary)20",
                    }}
                  >
                    <h3
                      className="text-3xl font-bold mb-6"
                      style={{ color: "var(--foreground)" }}
                    >
                      Solo necesitas...
                    </h3>

                    <div className="space-y-4">
                      {[
                        {
                          text: "💻 Saber usar una computadora básicamente",
                          highlight: "básicamente",
                        },
                        {
                          text: "🧠 Ganas de aprender herramientas nuevas",
                          highlight: "aprender",
                        },
                        {
                          text: "🔬 Mentalidad de experimentación y prueba-error",
                          highlight: "experimentación",
                        },
                        {
                          text: "🌐 Acceso a internet estable",
                          highlight: "internet estable",
                        },
                        {
                          text: "🚫 NO necesitas programación ni experiencia técnica",
                          highlight: "NO necesitas",
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
                          className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105"
                          style={{ backgroundColor: "var(--secondary)" }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center mt-1"
                            style={{
                              backgroundColor:
                                index === 4
                                  ? "var(--chart-3)"
                                  : "var(--primary)",
                            }}
                          >
                            <span
                              className="text-xs font-bold"
                              style={{ color: "#ffffff" }}
                            >
                              {index === 4 ? "✗" : "✓"}
                            </span>
                          </div>
                          <p
                            className="text-base leading-relaxed"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.text.split(item.highlight)[0]}
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  index === 4
                                    ? "var(--chart-3)"
                                    : "var(--primary)",
                              }}
                            >
                              {item.highlight}
                            </span>
                            {item.text.split(item.highlight)[1]}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div
                  className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl border-2"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--accent)",
                    boxShadow: "0 20px 40px var(--accent)20",
                  }}
                >
                  <div className="text-6xl mb-2">🎯</div>

                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ color: "var(--foreground)" }}
                  >
                    ¿Te identificas con alguno de estos perfiles?
                  </h3>

                  <p
                    className="text-lg mb-6 max-w-2xl"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    No importa tu nivel actual. Este taller está diseñado para
                    llevarte desde cero hasta crear agentes funcionales en
                    tiempo récord.
                  </p>

                  <button
                    onClick={() => setShowEarlyAccessForm(true)}
                    className="font-bold py-4 px-8 rounded-2xl text-lg transition-all transform hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                      color: "var(--primary-foreground)",
                      boxShadow: "0 10px 30px var(--primary)40",
                    }}
                  >
                    🚀 ¡Quiero Mi Lugar en el Taller!
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Instructor Section */}
        <section
          className="py-20 relative"
          style={{
            background:
              "linear-gradient(45deg, var(--secondary) 0%, var(--background) 100%)",
          }}
        >
          <div className="relative container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div
                className="rounded-3xl p-8 md:p-12 border-2"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span
                      className="font-light"
                      style={{ color: "var(--chart-1)" }}
                    >
                      Tu instructor
                    </span>
                    <h3
                      className="text-3xl font-bold mt-2 mb-4"
                      style={{ color: "var(--primary)" }}
                    >
                      Héctor Bliss
                    </h3>
                    <p
                      className="mb-6"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Pionero en hacer la IA accesible para todos, con más de 8
                      años enseñando tecnología y una comunidad de más de 2,000
                      estudiantes activos.
                    </p>
                    <p
                      className="mb-6"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Especializado en enseñar herramientas complejas de forma
                      simple, Héctor te guiará paso a paso para crear agentes
                      sin código.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "var(--chart-1)" }}
                        >
                          8+
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Años enseñando
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          2K+
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Estudiantes
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "var(--primary)" }}
                        >
                          100%
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Práctico
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full blur-3xl opacity-20"
                      style={{ backgroundColor: "var(--chart-3)" }}
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
          className="relative py-32 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--background) 0%, var(--secondary) 40%, var(--card) 100%)",
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, var(--primary) 2px, transparent 2px), radial-gradient(circle at 80% 50%, var(--accent) 1px, transparent 1px)",
                backgroundSize: "100px 100px, 80px 80px",
              }}
            ></div>

            {/* Floating Elements */}
            <div
              className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-20 animate-pulse"
              style={{
                background:
                  "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute bottom-10 right-10 w-32 h-32 rounded-full opacity-15 animate-pulse animation-delay-2000"
              style={{
                background:
                  "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full opacity-25 animate-pulse animation-delay-1000"
              style={{
                background:
                  "radial-gradient(circle, var(--chart-3) 0%, transparent 70%)",
              }}
            ></div>
          </div>

          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <div
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8 border-2"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--primary)",
                    boxShadow: "0 8px 32px var(--primary)20",
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--primary)" }}
                  ></span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: "var(--primary)" }}
                  >
                    ¡ÚLTIMOS LUGARES DISPONIBLES!
                  </span>
                </div>

                <h2 className="text-5xl md:text-7xl font-black leading-tight mb-8">
                  <span style={{ color: "var(--foreground)" }}>
                    El futuro de la IA
                  </span>
                  <br />
                  <span className="relative">
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), var(--accent))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      es visual
                    </span>
                    <div
                      className="absolute -bottom-2 left-0 right-0 h-2 rounded-full opacity-60"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--primary), var(--accent))",
                      }}
                    ></div>
                  </span>
                </h2>

                <p
                  className="text-xl md:text-2xl font-light mb-12 max-w-3xl mx-auto leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No esperes más para dominar las herramientas que están
                  definiendo el futuro del trabajo.
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {" "}
                    Tu lugar te está esperando.
                  </span>
                </p>
              </motion.div>

              {/* CTA Cards Grid */}
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Free Session Card */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="relative p-8 rounded-3xl border-2 backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--chart-3)",
                    boxShadow: "0 20px 40px var(--chart-3)20",
                  }}
                >
                  <div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: "var(--chart-3)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    ✨ COMPLETAMENTE GRATIS ✨
                  </div>

                  <div className="pt-4">
                    <h3
                      className="text-2xl font-bold mb-4 text-center"
                      style={{ color: "var(--foreground)" }}
                    >
                      Primera Sesión
                    </h3>
                    <div
                      className="text-4xl font-black text-center mb-2"
                      style={{ color: "var(--chart-3)" }}
                    >
                      $0
                    </div>
                    <p
                      className="text-center mb-6 opacity-80"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Sin compromiso • Cancela cuando quieras
                    </p>

                    <ul className="space-y-3 mb-8">
                      {[
                        "Construye tu primer agente en 30 minutos",
                        "Acceso completo a tu servidor personal",
                        "Introducción a herramientas no-code",
                        "Q&A en vivo con el instructor",
                      ].map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                            style={{ backgroundColor: "var(--chart-3)" }}
                          >
                            <span
                              className="text-xs"
                              style={{ color: "#ffffff" }}
                            >
                              ✓
                            </span>
                          </div>
                          <span
                            className="text-sm"
                            style={{ color: "var(--foreground)" }}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setShowEarlyAccessForm(true)}
                      className="w-full font-bold py-4 px-6 rounded-2xl text-lg transition-all transform hover:scale-105"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--chart-3) 0%, var(--primary) 100%)",
                        color: "var(--primary-foreground)",
                        boxShadow: "0 10px 30px var(--chart-3)40",
                      }}
                    >
                      🎓 Reservar Mi Lugar Gratis
                    </button>
                  </div>
                </motion.div>

                {/* Full Course Card */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="relative p-8 rounded-3xl border-2 backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--primary)",
                    boxShadow: "0 20px 40px var(--primary)30",
                  }}
                >
                  <div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    🔥 MÁS POPULAR 🔥
                  </div>

                  <div className="pt-4">
                    <h3
                      className="text-2xl font-bold mb-4 text-center"
                      style={{ color: "var(--foreground)" }}
                    >
                      Taller Completo
                    </h3>
                    <div
                      className="text-4xl font-black text-center mb-2"
                      style={{ color: "var(--primary)" }}
                    >
                      Próximamente
                    </div>
                    <p
                      className="text-center mb-6 opacity-80"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      4 sesiones intensivas • Servidor incluido
                    </p>

                    <ul className="space-y-3 mb-8">
                      {[
                        "4 sesiones interactivas de 2 horas",
                        "Servidor personal por 15 días",
                        "Proyectos comerciales reales",
                        "Certificado de finalización",
                      ].map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                            style={{ backgroundColor: "var(--primary)" }}
                          >
                            <span
                              className="text-xs"
                              style={{ color: "#ffffff" }}
                            >
                              ✓
                            </span>
                          </div>
                          <span
                            className="text-sm"
                            style={{ color: "var(--foreground)" }}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => setShowEarlyAccessForm(true)}
                      className="w-full font-bold py-4 px-6 rounded-2xl text-lg transition-all transform hover:scale-105"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                        color: "var(--primary-foreground)",
                        boxShadow: "0 10px 30px var(--primary)40",
                      }}
                    >
                      🚀 Notificarme del Lanzamiento
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-center mt-16"
              >
                <p
                  className="text-lg"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  ⚡{" "}
                  <strong style={{ color: "var(--primary)" }}>
                    Acceso instantáneo
                  </strong>{" "}
                  • 🔒{" "}
                  <strong style={{ color: "var(--primary)" }}>
                    Datos seguros
                  </strong>{" "}
                  • 🎯{" "}
                  <strong style={{ color: "var(--primary)" }}>Sin spam</strong>
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <SimpleFooter />
      </div>
    </>
  );
}
