import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaFacebook, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { BsLinkedin, BsYoutube } from "react-icons/bs";
import { AiFillInstagram } from "react-icons/ai";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { sendWebinarRegistration } from "~/mailSenders/sendWebinarRegistration";
import {
  BiBrain,
  BiTargetLock,
  BiRocket,
  BiStar,
  BiLayer,
  BiPlay,
  BiCheckCircle,
  BiChevronRight,
  BiBot,
} from "react-icons/bi";
import {
  AiOutlineFileImage,
  AiOutlineRobot,
} from "react-icons/ai";
import { HiSparkles } from "react-icons/hi";
import { RiRobot2Line } from "react-icons/ri";
import "~/styles/agentes-ia.css";

export const meta = () =>
  getMetaTags({
    title: "Agentes de IA Sin Código | Taller Completo | FixterGeek",
    description:
      "Aprende a crear agentes de IA inteligentes sin programar. Construye chatbots, asistentes virtuales y automatizaciones complejas usando herramientas visuales no-code. Taller 100% práctico.",
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

      // Verificar si el usuario está confirmado
      const user = await db.user.findUnique({
        where: { email },
        select: { confirmed: true }
      });

      await sendWebinarRegistration({
        to: email,
        webinarTitle: "Agentes de IA Visual - Acceso Anticipado",
        webinarDate: "Próximamente",
        userName: name,
        isConfirmed: user?.confirmed || false
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
    const totalPrice = 4900;

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
        success_url: `${location}/agentes?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${location}/agentes?cancel=1`,
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
  const [selectedTopic, setSelectedTopic] = useState<{
    moduleIndex: number;
    topicIndex: number;
  } | null>({
    moduleIndex: 0,
    topicIndex: 0,
  });
  const fetcher = useFetcher();

  // PERFORMANCE: Refs for timeout cleanup to prevent memory leaks
  const paymentSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentCancelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const confettiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for payment result in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "1") {
      setShowPaymentSuccess(true);
      setShowConfetti(true);
      paymentSuccessTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
        setShowPaymentSuccess(false);
      }, 8000);
      window.history.replaceState({}, "", "/agentes");
    }
    if (urlParams.get("cancel") === "1") {
      setShowPaymentCancel(true);
      paymentCancelTimeoutRef.current = setTimeout(() => setShowPaymentCancel(false), 5000);
      window.history.replaceState({}, "", "/agentes");
    }

    // Cleanup timeouts on unmount
    return () => {
      if (paymentSuccessTimeoutRef.current) {
        clearTimeout(paymentSuccessTimeoutRef.current);
      }
      if (paymentCancelTimeoutRef.current) {
        clearTimeout(paymentCancelTimeoutRef.current);
      }
    };
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
        confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 5000);
      }

      return () => {
        if (confettiTimeoutRef.current) {
          clearTimeout(confettiTimeoutRef.current);
        }
      };
    }, [isSuccess, showConfetti]);

    return (
      <div
        className={`fixed inset-0 bg-agentes-dark/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
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
          className={`agentes-ia-page bg-agentes-dark rounded-2xl px-8 pt-8 max-w-md w-full border-2 text-center transition-colors duration-300 ${
            isSuccess ? "border-green-500/30" : ""
          }`}
          style={{
            borderColor: isSuccess ? "#8ADAB1" : "#B0CCF2",
            boxShadow: `5px 5px 0px 0px ${
              isSuccess ? "#8ADAB1" : "#B0CCF2"
            }`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header that doesn't change abruptly */}
          <div className="flex justify-between items-center mb-6">
            <motion.h3
              className="text-2xl font-bold text-white"
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
                  // Use requestAnimationFrame instead of setTimeout for better performance
                  requestAnimationFrame(() => {
                    if (fetcher.data) {
                      fetcher.load("/agentes");
                    }
                  });
                }}
                className="w-full font-bold py-3 px-6 rounded-full transition-all bg-gradient-to-r from-agentes-primary to-agentes-secondary text-agentes-dark"
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
                action="/agentes"
                className="space-y-3"
              >
                <input
                  type="hidden"
                  name="intent"
                  value="early_access_registration"
                />

                <div>
                  <label
                    className="block mb-1 text-left text-agentes-tertiary"
                  >
                    Nombre
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 h-12 rounded-lg border border-agentes-gray bg-agentes-dark/50 text-white focus:ring-2 focus:ring-agentes-secondary focus:border-agentes-primary focus:outline-none transition-all duration-200"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 text-left text-agentes-tertiary"
                  >
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 h-12 rounded-lg border border-agentes-gray bg-agentes-dark/50 text-white focus:ring-2 focus:ring-agentes-secondary focus:border-agentes-primary focus:outline-none transition-all duration-200"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 text-left text-agentes-tertiary"
                  >
                    Teléfono (opcional)
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full px-4 h-12 rounded-lg border border-agentes-gray bg-agentes-dark/50 text-white focus:ring-2 focus:ring-agentes-secondary focus:border-agentes-primary focus:outline-none transition-all duration-200"
                    placeholder="+52 1 234 567 8900"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block mb-1 text-xs text-left text-agentes-tertiary"
                    >
                      ¿Qué te atrae más de los agentes de IA?
                    </label>
                    <select
                      name="experience"
                      required
                      className="w-full px-2 h-12 rounded-lg border border-agentes-gray bg-agentes-dark/50 text-white focus:ring-2 focus:ring-agentes-secondary focus:border-agentes-primary focus:outline-none text-xs transition-all duration-200"
                      style={{
                        color: "white",
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
                      className="block mb-1 text-xs text-left text-agentes-tertiary"
                    >
                      ¿Qué rol/situación te describe mejor?
                    </label>
                    <select
                      name="interest"
                      required
                      className="w-full px-2 h-12 rounded-lg border border-agentes-gray bg-agentes-dark/50 text-white focus:ring-2 focus:ring-agentes-secondary focus:border-agentes-primary focus:outline-none text-xs transition-all duration-200"
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
                    className="p-3 rounded-lg text-sm bg-red-500/20 border border-red-500/30 text-red-400"
                  >
                    {error}
                  </div>
                )}
                <br />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full font-bold py-4 px-8 rounded-full text-agentes-dark text-lg bg-gradient-to-r from-agentes-primary to-agentes-secondary transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: "0 10px 30px rgba(176, 204, 242, 0.3)",
                  }}
                >
                  Reservar mi lugar 🚀
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
          --background: #141619;
          --foreground: #f2e9e4;
          --card: #B0CCF2;
          --card-foreground: #f2e9e4;
          --popover: #392f35;
          --popover-foreground: #f2e9e4;
          --primary: #B0CCF2;
          --primary-foreground: #ffffff;
          --secondary: #B0C5E3;
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

        {/* Confetti - Temporarily disabled to fix WebGL contexts */}
        {false && showConfetti && (
          <EmojiConfetti
            emojis={["🤖", "👁️", "✨", "🎨", "🚀", "💡", "🎯"]}
            small
          />
        )}

        {/* Hero Section - Completely Redesigned */}
        <section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
       
        >
          {/* Pixel Blast Background */}
          <div className="absolute inset-0">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @keyframes pixel-float {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.08; }
                    50% { transform: translateY(-20px) scale(1.1); opacity: 0.15; }
                  }

                  .pixel-float {
                    position: absolute;
                    background: linear-gradient(135deg, #B0CCF2, #B0C5E3);
                    animation: pixel-float ease-in-out infinite;
                    border-radius: 10%;
                  }
                `,
              }}
            />

            {/* Generate floating pixels */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => {
                const size = 25 + Math.random() * 40;
                const duration = 8 + Math.random() * 12;
                const left = Math.random() * 100;
                const top = Math.random() * 100;

                return (
                  <div
                    key={`pixel-float-${i}`}
                    className="pixel-float"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDuration: `${duration}s`,
                      animationDelay: `${i * 0.4}s`,
                      filter: 'blur(1px)',
                      opacity: 0.12,
                    }}
                  />
                );
              })}
            </div>

            {/* Overlay gradient for better text readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(42, 32, 36, 0.2) 0%,
                    rgba(42, 32, 36, 0.1) 40%,
                    rgba(42, 32, 36, 0.3) 100%
                  )
                `,
              }}
            />

            {/* Accent gradient shapes */}
            <div
              className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full opacity-8"
              style={{
                background:
                  "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                filter: 'blur(40px)',
              }}
            ></div>
            <div
              className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-6"
              style={{
                background:
                  "radial-gradient(circle, #B0C5E3 0%, transparent 70%)",
                filter: 'blur(50px)',
              }}
            ></div>
          </div>
        
          {/* Content layer - z-index: 2, pointer-events: none on container, auto on interactive elements */}
          <div className="relative z-[2] container mx-auto px-4 py-32 lg:py-52 pointer-events-none">
            <div className="max-w-7xl mx-auto">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-left mb-6"
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full border backdrop-blur-sm bg-agentes-primary/20"
                  style={{

                    borderColor: "var(--primary)",
                    boxShadow: "0 8px 32px hsl(var(--primary) / 0.2)",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--primary)" }}
                  ></div>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--primary)" }}
                  >
                    Taller premium en vivo
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full bg-agentes-primary/30"
                    style={{
                      color: "var(--primary-foreground)",
                    }}
                  >
                    1ª SESIÓN GRATIS
                  </span>
                </div>
              </motion.div>

              {/* Main Hero Content */}
              <div className="grid lg:grid-cols-2  items-center">
                {/* Left Content */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-4">
                   
                    <span className="relative">
                      <span
                        className="text-agentes-primary"
                      >
                        Crea agentes de IA sin código
                      </span>

                    </span>
                
                  </h1>

                  <p
                    className="text-xl lg:text-2xl !font-light mb-4 leading-relaxed max-w-xl text-agentes-tertiary"
                  >
                    Construye agentes de IA profesionales con herramientas
                    visuales, drag-and-drop y open source.
                    <span
                      className="font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      {" "}
                      4 sesiones intensivas, la primera completamente gratis.
                    </span>
                  </p>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-3 mb-6 lg:mb-16">
                    {[
                      "🧠 GPT-5 & Claude",
                      "🔗 Integraciones API",
                      "🖥️ Servidor Incluido",
                    
                    ].map((text, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                        className="px-4 py-2 rounded-full text-sm font-semibold border"
                        style={{
                          backgroundColor: "#B0C5E320",
                          borderColor: "#B0C5E340",
                          color: "#B0C5E3",
                        }}
                      >
                        {text}
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
                    className="group relative font-bold h-12 px-4 lg:px-10 rounded-full text-base lg:text-lg transition-all duration-300 overflow-hidden pointer-events-auto bg-gradient-to-r from-agentes-primary to-agentes-secondary text-agentes-dark"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      🚀 Reservar mi lugar gratis
                      <BiChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </motion.button>

                  <p
                    className="text-sm mt-4 opacity-80 text-agentes-tertiary"
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
                  className="relative mt-10 md:mt-0"
                >
                  <div className="relative z-10">
                    {/* Main Dashboard Mockup */}
                    <div
                      className="rounded-2xl p-8 border-2 backdrop-blur-sm border bg-agentes-onix border-agentes-gray"
                      style={{
                        boxShadow: "0 20px 40px hsl(var(--card) / 0.5)",
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full bg-red-400"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full bg-green-500"
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full bg-yellow-400"
                          ></div>
                        </div>
                        <span
                          className="text-xs font-mono"
                          style={{ color: "var(--muted-foreground)"}}
                        >
                          visual-ai-builder.app
                        </span>
                      </div>

                      {/* Content */}
                      <div className="space-y-6">
                        {/* Workflow Automation Visual */}
                        <div className="relative h-64">
                          {/* Absolute SVG overlay for all connections */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 256">
                            {/* Left diagonal line from Update prompt to AI action */}
                            <path
                              d="M 100 56 L 200 128"
                              stroke="#B0C5E3"
                              strokeWidth="2"
                              strokeDasharray="6 3"
                              fill="none"
                            />
                            {/* Right diagonal line from Update database to AI action */}
                            <path
                              d="M 300 56 L 200 128"
                              stroke="#B0C5E3"
                              strokeWidth="2"
                              strokeDasharray="6 3"
                              fill="none"
                            />
                            {/* Vertical line from AI action to result */}
                            <path
                              d="M 200 144 L 200 176"
                              stroke="#B0C5E3"
                              strokeWidth="2"
                              strokeDasharray="6 3"
                              fill="none"
                            />
                          </svg>

                          {/* Top Row */}
                          <div className="absolute top-0 left-0 right-0 grid grid-cols-2 gap-8">
                            {/* Update Input */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              viewport={{ once: true }}
                              className="bg-white/5 backdrop-blur-sm p-3 w-fit ml-1 lg:ml-20 rounded-xl border border-agentes-secondary/20"
                            >
                              <div className="flex items-center gap-2">
                              <div className="!w-6 !h-6 bg-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">👄</span>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-300">System prompt</div>
                                </div>
                              </div>
                            </motion.div>

                            {/* Update Database */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                              viewport={{ once: true }}
                              className="bg-white/5 backdrop-blur-sm p-3 w-fit ml-0 lg:ml-10 rounded-xl border border-agentes-secondary/20"
                            >
                              <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">💾</span>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-300">Vector database</div>
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          {/* AI Action Center */}
                          <div className="absolute top-24 left-0 right-0 flex justify-center">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.8, delay: 0.4, ease: "backOut" }}
                              viewport={{ once: true }}
                              className="bg-gradient-to-r from-agentes-primary to-agentes-secondary px-4 py-2 rounded-full"
                            >
                              <div className="flex items-center gap-2 text-white">
                                <span className="text-sm">⚡</span>
                                <span className="font-bold text-xs text-agentes-dark">AI Agent</span>
                              </div>
                            </motion.div>
                          </div>

                          {/* Result */}
                          <div className="absolute top-44 left-0 right-0 flex justify-center">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                              viewport={{ once: true }}
                              className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-gray-400/20"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✨</span>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-300">Agent deployed</div>
                                </div>
                              </div>
                            </motion.div>
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
                        backgroundColor: "var(--primary)",
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
                        "linear-gradient(135deg, var(--primary) 0%, #B0C5E3 100%)",
                    }}
                  ></div>
                </motion.div>
              </div>

     
            </div>
          </div>
        </section>

        {/* What You'll Build Section */}
        <section
          className="pt-0 pb-10 lg:py-20 relative overflow-hidden bg-agentes-dark"
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
                className="text-4xl md:text-5xl font-bold mb-4 text-white"
              >
                Lo que construirás
              </h2>
              <p
                className="font-light text-lg max-w-2xl mx-auto text-agentes-tertiary"
              >
                Agentes inteligentes que tú o tus clientes usarán desde el día uno
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: <span className="text-2xl">🤖</span>,
                  title: "Tu Primer Chatbot con Memoria",
                  description:
                    "Agente conversacional que recuerda el contexto y mantiene conversaciones coherentes",
                  tech: ["GPT/Claude", "Memoria", "Interfaz Visual"],
                  color: "var(--chart-1)",
                },
                {
                  icon: <span className="text-2xl">🍽️</span>,
                  title: "Asistente de Restaurante Inteligente",
                  description:
                    "Agente que consulta menús, calcula precios, agenda reservas y maneja pedidos automáticamente",
                  tech: ["Herramientas", "Cálculos", "Automatización"],
                  color: "#B0C5E3",
                },
                {
                  icon: <span className="text-2xl">📸</span>,
                  title: "Estudio Fotográfico Automático",
                  description:
                    "Toma producto + modelo, genera 3+ variantes profesionales con poses perfectas usando nano-banana",
                  tech: ["Nano-banana", "Multi-Input", "E-commerce"],
                  color: "#B0C5E3",
                },
                {
                  icon: <span className="text-2xl">🧠</span>,
                  title: "Cerebro Maestro Empresarial",
                  description:
                    "RAG supremo que domina todos tus documentos, políticas y conocimiento corporativo",
                  tech: ["RAG", "Documentos", "Omnisciente"],
                  color: "var(--primary)",
                },
                {
                  icon: <span className="text-2xl opacity-50">🎬</span>,
                  title: "Generación de Video Avanzada",
                  description:
                    "Próximamente: Agentes que crean contenido audiovisual automático con IA",
                  tech: ["Próximamente", "Q2 2025", "Por Anunciar"],
                  color: "var(--muted-foreground)",
                  disabled: true,
                },
                {
                  icon: <span className="text-2xl opacity-50">📅</span>,
                  title: "Asistente Personal Inteligente",
                  description:
                    "Próximamente: Agente que gestiona tu calendario, emails y tareas automáticamente",
                  tech: ["Próximamente", "Q3 2025", "Productividad"],
                  color: "var(--muted-foreground)",
                  disabled: true,
                },
              ].map((project, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={
                    project.disabled
                      ? {}
                      : index === 2
                      ? {
                          scale: 1.05,
                          y: -15,
                          rotateX: 8,
                          boxShadow: "0 30px 60px rgba(255, 193, 7, 0.4)",
                          backgroundColor: "#FFF59D",
                          borderColor: "#465169",
                          color: "#1A1A1A",
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                            mass: 0.8,
                          },
                        }
                      : {
                          y: -5,
                          boxShadow: "0 20px 50px #B0C5E330",
                          transition: { duration: 0.3, ease: "easeOut" },
                        }
                  }
                  whileTap={project.disabled ? {} : { scale: 0.98 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`border border-agentes-gray/30 rounded-3xl p-8 backdrop-blur-sm bg-agentes-primary/5 group overflow-hidden relative ${
                    project.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                  style={{
                    boxShadow: "0 8px 32px #B0C5E320",
                    borderStyle: project.disabled ? "dashed" : "solid",
                  }}
                >
                  {index === 2 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                          @keyframes confetti-float {
                            0% { opacity: 0; transform: translateY(0) scale(0) rotate(0deg); }
                            25% { opacity: 1; transform: translateY(-20px) scale(1.2) rotate(90deg); }
                            50% { opacity: 1; transform: translateY(-40px) scale(1) rotate(180deg); }
                            75% { opacity: 1; transform: translateY(-60px) scale(1) rotate(270deg); }
                            100% { opacity: 0; transform: translateY(-80px) scale(0) rotate(360deg); }
                          }
                          .confetti-emoji {
                            animation: confetti-float 2s ease-out infinite;
                            animation-fill-mode: both;
                            animation-play-state: paused;
                          }
                          .group:hover .confetti-emoji {
                            animation-play-state: running;
                          }
                        `,
                        }}
                      />
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={`confetti-${i}`}
                          className="absolute text-lg confetti-emoji"
                          style={{
                            left: `${15 + (i % 4) * 20}%`,
                            top: `${20 + Math.floor(i / 4) * 40}%`,
                            animationDelay: `${i * 0.2}s`,
                          }}
                        >
                          {["🍌", "🎨", "✨", "🌟", "🎯", "💫", "🚀", "🔥"][i]}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hover Shine Effect - for non-disabled cards */}
                  {!project.disabled && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                  )}

                  <div className="relative mb-4">
                    <div
                      className="w-12 h-12 grid place-items-center rounded-lg inline-block transition-all duration-300"
                      style={{
                        backgroundColor: "#B0C5E320",
                        color: project.disabled ? "var(--muted-foreground)" : "#B0C5E3",
                      }}
                    >
                      {project.icon}
                    </div>
                    {project.disabled && (
                      <span className="absolute -top-2 -right-2 bg-agentes-secondary text-agentes-dark text-xs px-2 py-1 rounded-full font-bold">
                        PRÓXIMAMENTE
                      </span>
                    )}
                  </div>
                  <h3
                    className={`text-xl font-bold mb-3 transition-colors duration-300 ${
                      index === 2 ? "group-hover:!text-gray-900" : ""
                    }`}
                    style={{ color: "var(--foreground)" }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className={`mb-4 transition-colors duration-300 text-agentes-tertiary ${
                      index === 2 ? "group-hover:!text-gray-800" : ""
                    }`}
    
                  >
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 bg-white/5 text-white/50 ${
                          index === 2 ? "group-hover:!bg-yellow-400 group-hover:!text-gray-900" : "group-hover:bg-agentes-primary/20 group-hover:text-white/70"
                        }`}
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

     
        <section
          className="py-10 lg:py-20 relative overflow-hidden bg-agentes-dark"
        >
         
          <div className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{
                  x: [0, 30, -20, 0],
                  y: [0, -30, 20, 0],
                  scale: [1, 1.1, 0.9, 1],
                  rotate: [0, 120, 240, 360],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  position: 'absolute',
                  width: '400px',
                  height: '400px',
                  background: `linear-gradient(135deg, #B0C5E3, transparent)`,
                  left: '10%',
                  top: '20%',
                  opacity: 0.15,
                  filter: 'blur(40px)',
                  borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                }}
              />
              <motion.div
                animate={{
                  x: [0, -30, 20, 0],
                  y: [0, 30, -20, 0],
                  scale: [1, 0.9, 1.1, 1],
                  rotate: [360, 240, 120, 0],
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 5,
                }}
                style={{
                  position: 'absolute',
                  width: '350px',
                  height: '350px',
                  background: `linear-gradient(45deg, #B0C5E3, transparent)`,
                  right: '15%',
                  bottom: '25%',
                  opacity: 0.12,
                  filter: 'blur(40px)',
                  borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
                }}
              />
              <motion.div
                animate={{
                  x: [0, 20, -30, 0],
                  y: [0, -20, 30, 0],
                  scale: [1, 1.05, 0.95, 1],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{
                  duration: 35,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 10,
                }}
                style={{
                  position: 'absolute',
                  width: '300px',
                  height: '300px',
                  background: `linear-gradient(90deg, #B0C5E3, transparent)`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.14,
                  filter: 'blur(40px)',
                  borderRadius: '50% 60% 60% 50% / 40% 50% 60% 50%',
                }}
              />
              
              {[...Array(5)].map((_, i) => {
                const size = 150 + Math.random() * 200;
                const duration = 20 + Math.random() * 20;
                const delay = Math.random() * 10;
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const colors = [
                  `linear-gradient(135deg, #B0C5E380, transparent)`,
                  `linear-gradient(45deg, #B0C5E380, transparent)`,
                  `linear-gradient(90deg, #B0C5E380, transparent)`,
                ];
                const shapes = [
                  '60% 40% 30% 70% / 60% 30% 70% 40%',
                  '30% 60% 70% 40% / 50% 60% 30% 60%',
                  '50% 60% 60% 50% / 40% 50% 60% 50%',
                  '40% 50% 50% 60% / 60% 40% 50% 60%',
                  '70% 30% 30% 70% / 60% 40% 60% 40%',
                ];
                
                return (
                  <motion.div
                    key={`ether-${i}`}
                    animate={{
                      x: [0, 25 - i * 5, -(20 - i * 3), 0],
                      y: [0, -(25 - i * 5), 20 - i * 3, 0],
                      scale: [1, 1 + i * 0.02, 1 - i * 0.02, 1],
                    }}
                    transition={{
                      duration: duration,
                      repeat: Infinity,
                      ease: "linear",
                      delay: delay,
                    }}
                    style={{
                      position: 'absolute',
                      width: `${size}px`,
                      height: `${size}px`,
                      background: colors[i % colors.length],
                      left: `${left}%`,
                      top: `${top}%`,
                      opacity: 0.06 + Math.random() * 0.08,
                      filter: 'blur(35px)',
                      borderRadius: shapes[i % shapes.length],
                    }}
                  />
                );
              })}
            </div>
            
        
       
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-8 lg:mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold mb-6 text-white"
              >
                Qué opinan <span className="text-agentes-primary">nuestros estudiantes</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-lg md:text-xl max-w-3xl mx-auto text-agentes-tertiary font-light"
              >
                Profesionales que ya dominan el sistema visual de agentes IA
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="  rounded-3xl p-8 relative group transition-all  overflow-hidden hover:shadow-2xl transition-all duration-500"
              >


                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden  border-2 border-agentes-secondary">
                      <img
                        src="https://www.fixtergeek.com/students/carlitos.png"
                        alt="Carlos Mendoza"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1 text-white">
                        Carlos Mendoza
                      </h4>
                      <p className="text-sm text-agentes-tertiary">
                        Fundador de Agencia Digital
                      </p>
                    </div>
                  </div>

                  <blockquote className="text-lg leading-relaxed mb-6  text-agentes-tertiary group-hover:text-white">
                    "Integré la creación de agentes visuales como nuevo servicio
                    en mi agencia. El sistema drag-and-drop me permitió escalar
                    rápidamente: <strong>añadí $50K MXN mensuales</strong> de
                    ingresos recurrentes automatizando clientes con agentes que
                    construyo en horas, no semanas."
                  </blockquote>

                  <div className="flex items-center gap-2 text-sm text-agentes-tertiary">
                    <span>⭐⭐⭐⭐⭐</span>
                  </div>
                </div>
              </motion.div>


              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className=" rounded-3xl p-8 transition-all duration-500 relative overflow-hidden group hover:shadow-2xl"
              >

                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-agentes-secondary">
                      <img
                        src="https://scontent.fmex28-1.fna.fbcdn.net/v/t1.6435-9/81327670_3045384255489837_6297581632681410560_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=eaTF71YBIOQQ7kNvwG7Y3Ss&_nc_oc=Adm8AeTFI6v5NzKB0fAAJCGC9uYSDAot61L-wORptP8kLMjMREGttWuW9QeKfHJldgQ&_nc_zt=23&_nc_ht=scontent.fmex28-1.fna&_nc_gid=4IMBwmrHbAFeeu66pQB54w&oh=00_AfZ2Ch8msyGIzUoidYDQO8vzTxw1_rXR21o2GYV8ySjFFA&oe=68FBF35D"
                        alt="Kevin James"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1 text-white">
                        Kevin James
                      </h4>
                      <p className="text-sm text-agentes-tertiary">
                        CTO, Empresa de Software
                      </p>
                    </div>
                  </div>

                  <blockquote className="text-lg leading-relaxed mb-6  text-agentes-tertiary group-hover:text-white">
                    "Adoptamos el sistema visual para automatizar soporte con
                    RAG corporativo.{" "}
                    <strong>
                      Reducimos 40% el tiempo de respuesta y aumentamos 25% la
                      satisfacción
                    </strong>{" "}
                    del cliente. Lo mejor: nuestro equipo sin experiencia
                    técnica ahora construye agentes complejos sin código."
                  </blockquote>

                  <div className="flex items-center gap-2 text-sm text-agentes-tertiary">
                    <span>⭐⭐⭐⭐⭐</span>
                  </div>
                </div>
              </motion.div>
            </div>


          
          </div>
        </section>

        {/* Video Demo Section */}
         <section className="py-10 lg:py-20 relative  bg-agentes-dark">
          <div className="relative container mx-auto px-4 z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Échale un  <span className="text-agentes-primary">vistazo al demo</span>
              </h2>
              <p className="font-light text-lg max-w-2xl mx-auto text-agentes-tertiary">
                Descubre la plataforma visual que usaremos en el taller para
                crear agentes inteligentes
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative rounded-3xl overflow-hidden border-2 bg-agentes-onix border-agentes-primary/20"
                style={{
                  boxShadow: "0 20px 40px rgba(176, 197, 227, 0.1)",
                }}
              >

                <div className="relative pb-[56.25%] h-0">
                  <iframe
                    src="https://www.youtube.com/embed/yqlndqa7o8k"
                    title="Demo: Agente de IA sin código"
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>


                <div className="p-6 border-t border-agentes-primary/20">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-agentes-primary/20 text-agentes-primary">
                        <BiPlay className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">
                          Demo de la Plataforma
                        </h3>
                        <p className="text-sm text-agentes-tertiary">
                          La herramienta visual que dominarás en el taller
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["Interfaz Visual", "Drag & Drop", "No-Code"].map(
                        (tag, index) => (
                          <span
                            key={index}
                            className="text-xs px-3 py-1 rounded-full border font-semibold bg-agentes-primary/20 border-agentes-primary/30 text-agentes-primary"
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
          </div>
        </section>

        {/* Curriculum Section */}
        <section
          className="pb-10 pt-20 lg:py-20 relative bg-agentes-dark"
        >

          <div className="relative container mx-auto px-4 z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2
                className="text-4xl md:text-5xl font-bold mb-4 text-white"

              >
                Qué <span className="text-agentes-primary">aprenderás</span> en el taller
              </h2>
              <p
                className="font-light text-lg max-w-2xl mx-auto text-agentes-tertiary"
              >
                4 sesiones en vivo donde construirás agentes reales desde cero
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto relative">
              {/* Timeline Line */}
              <div
                className="absolute left-[52px] top-[120px] bottom-[200px] w-0.5 opacity-20"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--chart-1), #B0C5E3, #B0C5E3, var(--primary))",
                }}
              ></div>
              {[
                {
                  module: "Sesión 1 (GRATIS)",
                  title: "Tu Primer Agente en 30 Minutos",
                  icon: <BiRocket className="w-6 h-6" />,
                  badge: "🎁 GRATIS",
                  topics: [
                    {
                      title:
                        "Instalación y configuración de tu servidor personal",
                      description:
                        "Te guiaré paso a paso para configurar tu entorno de trabajo con acceso a herramientas profesionales de IA, completamente gratis durante el taller.",
                    },
                    {
                      title: "Interfaz visual: nodos, cadenas y flujos",
                      description:
                        "Aprenderás a usar la interfaz drag-and-drop para conectar componentes de IA sin escribir código, como si fuera un diagrama de flujo visual.",
                    },
                    {
                      title:
                        "Conectar tu primer modelo de IA (GPT, Claude, Gemini)",
                      description:
                        "Configuraremos conexiones directas a los modelos más potentes del mercado y aprenderás cuándo usar cada uno según tu proyecto.",
                    },
                    {
                      title: "Crear un chatbot funcional con memoria",
                      description:
                        "Construirás tu primer agente que puede mantener conversaciones coherentes, recordar contexto y responder de forma natural.",
                    },
                  ],
                  color: "#B0C5E3",
                  progress: "25%",
                },
                {
                  module: "Sesión 2",
                  title: "Herramientas y Automatización",
                  icon: <BiLayer className="w-6 h-6" />,
                  badge: "🔧 TOOLS",
                  topics: [
                    {
                      title:
                        "Agentes con herramientas: calculadora, calendarios, APIs",
                      description:
                        "Tu agente podrá usar herramientas externas como hacer cálculos complejos, consultar disponibilidad de citas o conectarse con servicios externos en tiempo real.",
                    },
                    {
                      title: "Cadenas secuenciales y paralelas",
                      description:
                        "Aprenderás a crear flujos de trabajo donde tu agente puede realizar múltiples tareas en orden o simultáneamente para resolver problemas complejos.",
                    },
                    {
                      title: "Workflows complejos: decisiones y condicionales",
                      description:
                        "Diseñarás agentes que toman decisiones inteligentes según el contexto, usando condicionales y lógica para elegir qué herramientas usar en cada situación.",
                    },
                    {
                      title: "Proyecto: Asistente de Restaurante Inteligente",
                      description:
                        "Construirás un agente que consulta menús, calcula precios con descuentos, agenda reservas y maneja pedidos. Como tener un empleado que nunca se equivoca y trabaja 24/7.",
                    },
                  ],
                  color: "#B0C5E3",
                  progress: "50%",
                },
                {
                  module: "Sesión 3",
                  title: "Estudio Fotográfico Automático",
                  icon: <span className="text-xl">🍌</span>,
                  badge: "📸 STUDIO",
                  topics: [
                    {
                      title: "Multi-input: análisis de productos e imágenes",
                      description:
                        "Tu agente analizará automáticamente productos (forma, colores, estilo) y modelos (pose, expresión, iluminación) para crear prompts perfectos.",
                    },
                    {
                      title: "Prompt engineering automático con nano-banana",
                      description:
                        "El sistema combinará inteligentemente las características del producto y modelo para generar prompts optimizados que produzcan resultados profesionales.",
                    },
                    {
                      title: "Generación masiva y refinamiento iterativo",
                      description:
                        "Crea 3+ variantes simultáneas con diferentes poses y estilos, plus un sistema de refinamiento que mejora automáticamente los resultados.",
                    },
                    {
                      title: "Proyecto: Estudio Fotográfico E-commerce",
                      description:
                        "Construirás un agente que toma imagen de producto + modelo y genera múltiples fotos profesionales. Perfecto para tiendas online que necesitan variedad sin fotógrafo.",
                    },
                  ],
                  color: "#B0C5E3",
                  progress: "75%",
                },
                {
                  module: "Sesión 4",
                  title: "Cerebro Maestro Empresarial con RAG",
                  icon: <BiBrain className="w-6 h-6" />,
                  badge: "🧠 RAG",
                  topics: [
                    {
                      title:
                        "Cargar y procesar documentos masivos (PDF, Word, Web)",
                      description:
                        "Tu agente procesará cientos de documentos corporativos automáticamente: manuales, políticas, contratos, reportes. Usando splitters inteligentes para fragmentar información de manera óptima.",
                    },
                    {
                      title: "Bases de conocimiento vectoriales avanzadas",
                      description:
                        "Construirás un cerebro digital que entiende contexto, relaciones y significados profundos entre documentos, no solo búsquedas por palabras clave.",
                    },
                    {
                      title: "RAG conversacional: citando fuentes exactas",
                      description:
                        "Tu agente responderá preguntas complejas citando documentos específicos, páginas exactas y secciones relevantes. Transparencia total en cada respuesta.",
                    },
                    {
                      title: "Proyecto: Cerebro Maestro Corporativo",
                      description:
                        "El gran finale: un super-agente que domina toda la información de tu empresa. Responde desde 'política de vacaciones' hasta 'análisis financiero Q3' con precisión absoluta.",
                    },
                  ],
                  color: "#B0C5E3",
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
                          <div className="flex items-center gap-3 mb-0 lg:mb-2">
                            <span
                              className="font-bold text-lg"
                              style={{ color: module.color }}
                            >
                              {module.module}
                            </span>
                            <span
                              className="text-xs px-3 py-1 rounded-full font-bold border hidden lg:block"
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
                            className="text-xl lg:text-2xl font-bold"
                            style={{ color: "var(--foreground)" }}
                          >
                            {module.title}
                          </h3>
                        </div>
                      </div>

                      {/* Progress Circle */}
                      <div className="relative w-16 h-16 hidden lg:block">
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
                                className="font-medium transition-colors duration-150 "
                                style={{
                                  color: isSelected
                                    ? module.color
                                    : "var(--muted-foreground)",
                                }}
                              >
                                {topic.title}
                              </span>
                            </div>

                            {/* Description Card */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  className="ml-9 mt-3 overflow-hidden"
                                  initial={{ opacity: 0, height: 0, transformOrigin: "top" }}
                                  animate={{ opacity: 1, height: "auto", transformOrigin: "top" }}
                                  exit={{ opacity: 0, height: 0, transformOrigin: "top" }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                    opacity: { duration: 0.2 },
                                    height: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
                                  }}
                                >
                                  <div
                                    className="p-4 rounded-xl backdrop-blur-sm relative"
                                    style={{
                                      backgroundColor: module.color + "08",
                                      boxShadow: `0 4px 20px ${module.color}12`,
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
                                  </div>
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
          className="py-20 lg:py-32 relative overflow-hidden bg-agentes-dark"
    
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
                  "radial-gradient(circle, #B0C5E3 0%, transparent 70%)",
              }}
            ></div>
            <div
              className="absolute bottom-32 left-16 w-12 h-12 rounded-full opacity-25 animate-pulse animation-delay-2000"
              style={{
                background:
                  "radial-gradient(circle, #B0C5E3 0%, transparent 70%)",
              }}
            ></div>
          </div>

          <div className="relative z-10 container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                

                <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8">
                  <span className="text-white">
                    Este taller es{" "}
                  </span>
                  <span className="relative">
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), #B0C5E3)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      para ti
                    </span>
                  
                  </span>
                </h2>

                <p
                  className="text-xl md:text-2xl font-light max-w-3xl mx-auto leading-relaxed text-agentes-tertiary" 
  
                >
                  Deberías tomar este taller sin importar tu perfil profesional.
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    <br />
                    La IA visual es para todos. No necesitas experiencia previa.
                    🚀
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
                    className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl flex items-center justify-center z-10 bg-agentes-secondary"
                  >
                    <span className="text-2xl">✅</span>
                  </div>

                  <div
                    className="border-2 rounded-3xl p-8 pt-12 border-agentes-gray backdrop-blur-sm bg-agentes-primary/5"
                    style={{
                      boxShadow: "0 8px 32px hsl(#B0C5E3 / 0.2)",
                    }}
                  >
                    <h3
                      className="text-3xl font-bold mb-6"
                      style={{ color: "var(--foreground)" }}
                    >
                      Lo que vas a lograr
                    </h3>

                    <div className="space-y-4">
                      {[
                        {
                          text: "🚀 Crear agentes de IA sin programar una sola línea",
                          highlight: "sin programar",
                        },
                        {
                          text: "🏢 Automatizar procesos empresariales en tiempo récord",
                          highlight: "tiempo récord",
                        },
                        {
                          text: "💰 Generar una nueva fuente de ingresos con IA",
                          highlight: "nueva fuente",
                        },
                        {
                          text: "🎯 Ofrecer servicios profesionales de automatización",
                          highlight: "servicios profesionales",
                        },
                        {
                          text: "🤯 Dominar herramientas visuales intuitivas y poderosas",
                          highlight: "visuales intuitivas",
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
                          className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 bg-agentes-primary/5"
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
                            className="text-base leading-relaxed"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.text.substring(2).split(item.highlight)[0]}
                            <span
                              className="font-semibold"
                              style={{ color: "#B0C5E3" }}
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
                    style={{ backgroundColor: "#B0C5E3" }}
                  >
                    <span className="text-2xl">📋</span>
                  </div>

                  <div
                    className="border-2 rounded-3xl p-8 pt-12 border-agentes-gray backdrop-blur-sm bg-agentes-primary/5"
                    style={{
                      boxShadow: "0 8px 32px #B0C5E320",
                    }}
                  >
                    <h3
                      className="text-3xl font-bold mb-6"
                      style={{ color: "var(--foreground)" }}
                    >
                      Requisitos mínimos
                    </h3>

                    <div className="space-y-4">
                      {[
                        {
                          text: "💻 Computadora con navegador web moderno",
                          highlight: "navegador web",
                        },
                        {
                          text: "🌐 Conexión a internet estable y confiable",
                          highlight: "estable",
                        },
                        {
                          text: "🧠 Mentalidad abierta para experimentar con IA",
                          highlight: "experimentar",
                        },
                        {
                          text: "⏰ 2 horas disponibles por sesión en vivo",
                          highlight: "2 horas",
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
                          className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-105 bg-agentes-primary/5"
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
                            className="text-base leading-relaxed"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.text.substring(2).split(item.highlight)[0]}
                            <span
                              className="font-semibold"
                              style={{
                                color: "#B0C5E3",
                              }}
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

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div
                  className="inline-flex flex-col items-center gap-6 p-8 rounded-3xl  bg-agentes-primary/5"
                >
                  <div className="text-6xl mb-2">🎯</div>

                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ color: "var(--foreground)" }}
                  >
                    ¡Hora de actuar!
                  </h3>

                  <p
                    className="text-lg mb-4 max-w-2xl text-agentes-tertiary"
                  >
                    No importa tu nivel actual. Este taller está diseñado para
                    llevarte desde cero hasta crear agentes funcionales en
                    tiempo récord.
                  </p>

                  <button
                    onClick={() => setShowEarlyAccessForm(true)}
                    className="font-semibold h-12 text-agentes-dark px-8 rounded-full text-lg transition-all transform hover:scale-105 bg-gradient-to-r from-agentes-primary to-agentes-secondary"
                    style={{
                      boxShadow: "0 10px 30px var(--primary)40",
                    }}
                  >
                    🚀 ¡Quiero mi lugar en el taller!
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Instructor Section */}
        <section
          className="py-10 lg:py-20 relative overflow-hidden bg-agentes-dark"
     
        >
          {/* LiquidEther Background */}
          <div className="absolute inset-0 z-0">
            <LiquidEther
              colors={['#B0CCF2', '#B0C5E3', '#B0CCF2']}
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
              <div
                className="rounded-3xl p-8 md:p-12  relative overflow-hidden bg-agentes-onix "
           
              >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span
                      className="font-light text-white"
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
                      className="mb-6 text-agentes-tertiary"
                    >
                      Pionero en hacer la IA accesible para todos, con más de 8
                      años enseñando tecnología y una comunidad de más de 2,000
                      estudiantes activos.
                    </p>
                    <p
                      className="mb-6 text-agentes-tertiary"
                    >
                      Especializado en enseñar herramientas complejas de forma
                      simple, Héctor te guiará paso a paso para crear agentes
                      sin código.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div
                          className="text-2xl font-bold text-agentes-primary"
                        
                        >
                          8+
                        </div>
                        <div
                          className="text-xs text-agentes-tertiary"
                        >
                          Años enseñando
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-2xl font-bold text-agentes-primary"
                        >
                          2K+
                        </div>
                        <div
                          className="text-xs text-agentes-tertiary"
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
                          className="text-xs text-agentes-tertiary"
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
          className="relative py-16 lg:py-32 overflow-hidden bg-agentes-dark"
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
                <div
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full border backdrop-blur-sm bg-agentes-primary/20 mb-8"
                  style={{
                    borderColor: "var(--primary)",
                    boxShadow: "0 8px 32px hsl(var(--primary) / 0.2)",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--primary)" }}
                  ></div>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--primary)" }}
                  >
                    ¡ÚLTIMOS LUGARES DISPONIBLES!
                  </span>
                </div>

                <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8">
                  <span style={{ color: "var(--foreground)" }}>
                    El futuro de la IA
                  </span>
                  <br />
                  <span className="relative">
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--primary), #B0C5E3)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      es visual
                    </span>
                   
                  </span>
                </h2>

                <p
                  className="text-xl md:text-2xl font-light mb-12 max-w-3xl mx-auto leading-relaxed text-agentes-tertiary"
                >
                  Los que aprenden IA visual hoy serán los líderes tecnológicos
                  del mañana.
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {" "}
                    Tu transformación empieza aquí.
                  </span>
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
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold z-10 text-agentes-dark bg-agentes-secondary"
                    style={{
                      width: "max-content",
                      boxShadow: "0 2px 8px #B0C5E330",
                    }}
                  >
                    ✨ COMPLETAMENTE GRATIS ✨
                  </div>

                  <motion.div
                    className="relative p-8 pt-10 rounded-3xl border-2 border-agentes-gray backdrop-blur-sm bg-agentes-primary/5 h-full"
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
                        className="text-2xl font-bold mb-4 text-center"
                        style={{ color: "var(--foreground)" }}
                      >
                        Primera Sesión
                      </h3>
                      <div
                        className="text-4xl font-black text-center mb-2"
                        style={{ color: "#B0C5E3" }}
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
                              style={{ backgroundColor: "#B0C5E3" }}
                            >
                              <span
                                className="text-xs text-agentes-dark"
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
                        className="w-full font-bold h-14 px-6 rounded-full text-agentes-dark text-base lg:text-lg transition-all bg-gradient-to-r from-agentes-primary to-agentes-secondary transform hover:scale-105"
                        style={{
                        
                       
                          boxShadow: "0 10px 30px #B0C5E340",
                        }}
                      >
                        🎓 Reservar mi lugar gratis
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
                    className="absolute bg-agentes-secondary -top-3 left-1/3 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold z-10 text-agentes-dark"
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
                    🔥 MÁS POPULAR 🔥
                  </motion.div>

                  <motion.div
                    className="relative p-8 pt-10 rounded-3xl border-2 border-agentes-gray backdrop-blur-sm bg-agentes-primary/5 h-full"
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
                        className="text-2xl font-bold mb-4 text-center"
                        style={{ color: "var(--foreground)" }}
                      >
                        Taller Completo
                      </h3>
                      <div
                        className="text-4xl font-black text-center mb-2"
                        style={{ color: "var(--primary)" }}
                      >
                        $4,900 MXN
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
                                className="text-xs text-agentes-dark"
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
                        className="w-full font-bold h-14 px-6 bg-gradient-to-r from-agentes-primary to-agentes-secondary rounded-full text-lg transition-all transform hover:scale-105 text-agentes-dark"
                        style={{
                          boxShadow: "0 10px 30px var(--primary)40",
                        }}
                      >
                        🚀 Notificarme del lanzamiento
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

          
            </div>
          </div>
        </section>

        {/* Simple Footer with agentes colors */}
        <section className=" bg-agentes-dark py-8 pb-12">
          <div className="flex justify-center items-center gap-3">
            <a
              rel="noreferrer"
              href="https://www.facebook.com/fixterme"
              target="_blank"
            >
              <FaFacebook className="text-gray-400 text-2xl hover:opacity-40 hover:scale-95" />
            </a>
            <a
              rel="noreferrer"
              href="https://twitter.com/FixterGeek"
              target="_blank"
            >
              <FaSquareXTwitter className="text-gray-400 text-2xl hover:opacity-40 hover:scale-95" />
            </a>
            <a
              rel="noreferrer"
              href="https://www.linkedin.com/company/fixtergeek/"
              target="_blank"
            >
              <BsLinkedin className="text-gray-400 text-xl hover:opacity-40 hover:scale-95" />
            </a>
            <a
              rel="noreferrer"
              href="https://www.instagram.com/fixtergeek/"
              target="_blank"
            >
              <AiFillInstagram className="text-gray-400 text-2xl hover:opacity-40 hover:scale-95" />
            </a>
            <a
              rel="noreferrer"
              href="https://www.youtube.com/channel/UC2cNZUym14-K-yGgOEAFh6g"
              target="_blank"
            >
              <FaYoutube className="text-gray-400 text-2xl hover:opacity-40 hover:scale-95" />
            </a>
          </div>

          <p className="text-center text-gray-300 text-sm opacity-40 font-light mt-4">
            © 2016 - 2025 Fixtergeek
          </p>
        </section>
      </div>
    </>
  );
}
