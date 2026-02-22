import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher, Link } from "react-router";
import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import getMetaTags from "~/utils/getMetaTags";
import {
  BiPlay,
  BiCheckCircle,
  BiCode,
  BiJoystick,
  BiTime,
  BiGroup,
  BiStar,
} from "react-icons/bi";
import type { Route } from "./+types/pong";
import { BsLinkedin, BsGithub, BsFacebook } from "react-icons/bs";
import { SiJavascript } from "react-icons/si";
import LiquidEther from "~/components/backgrounds/LiquidEther";
import { sendVerificationCode } from "~/mailSenders/sendVerificationCode";

// Cookie name - mismo que usa book-access.server.ts
const SUBSCRIBER_COOKIE = "fixtergeek_subscriber";
const PONG_TAG = "pong-course";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Pong con Vanilla JS | Curso Gratis | FixterGeek",
    description:
      "Vamos a construir juntos el juego que inició todo — y de paso, vas a entender JavaScript de verdad. Sin React. Sin frameworks. Solo tú, yo, y el poder del Canvas API. Curso gratuito con +800 estudiantes.",
    url: "https://www.fixtergeek.com/pong",
    image: "https://www.fixtergeek.com/courses/pong-banner.png",
    keywords:
      "pong javascript, canvas api, vanilla js, juego javascript, curso gratis javascript, aprender javascript, game development, curso canvas",
  });

  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": "https://www.fixtergeek.com/pong#course",
        name: "Pong con Vanilla JavaScript",
        description:
          "Curso gratuito para aprender JavaScript construyendo el clásico juego Pong desde cero usando Canvas API. Sin frameworks ni librerías.",
        url: "https://www.fixtergeek.com/pong",
        provider: {
          "@type": "Organization",
          name: "FixterGeek",
          url: "https://www.fixtergeek.com",
        },
        instructor: {
          "@type": "Person",
          name: "Héctor Bliss",
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
        },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
        },
        inLanguage: "es",
        educationalLevel: "Beginner",
        isAccessibleForFree: true,
      },
    ],
  };

  return [
    ...baseMeta,
    {
      "script:ld+json": schemaOrg,
    },
  ];
};

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    href: "/courses/pong.png",
    type: "image/png",
  },
  {
    rel: "apple-touch-icon",
    href: "/courses/pong.png",
  },
];

// Helper para extraer email del cookie
function getSubscriberEmailFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${SUBSCRIBER_COOKIE}=`));
  if (!match) return null;
  const encoded = match.split("=")[1];
  return encoded ? decodeURIComponent(encoded) : null;
}

// Loader para verificar si ya tiene acceso
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const subscriberEmail = getSubscriberEmailFromCookie(request);

  if (subscriberEmail) {
    // Verificar si tiene el tag de pong-course
    const subscriber = await db.subscriber.findUnique({
      where: { email: subscriberEmail },
    });

    if (subscriber?.confirmed && subscriber.tags.includes(PONG_TAG)) {
      return { hasAccess: true, email: subscriberEmail };
    }
  }

  return { hasAccess: false, email: null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // PASO 1: Enviar código OTP
  if (intent === "send-code") {
    const email = String(formData.get("email")).toLowerCase().trim();
    const name = String(formData.get("name") || "").trim();

    if (!email || !email.includes("@")) {
      return data({ success: false, error: "Email inválido" });
    }

    try {
      // Verificar si ya está suscrito y confirmado con el tag
      const existingSubscriber = await db.subscriber.findUnique({
        where: { email },
      });

      if (existingSubscriber?.confirmed && existingSubscriber.tags.includes(PONG_TAG)) {
        // Ya tiene acceso - setear cookie y retornar
        const headers = new Headers();
        headers.append(
          "Set-Cookie",
          `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
        );
        return data({ success: true, alreadyVerified: true }, { headers });
      }

      // Crear o actualizar subscriber
      await db.subscriber.upsert({
        where: { email },
        create: {
          email,
          name: name || undefined,
          confirmed: false,
          tags: [PONG_TAG, "newsletter"],
        },
        update: {
          name: name || existingSubscriber?.name || undefined,
          tags: existingSubscriber?.tags.includes(PONG_TAG)
            ? existingSubscriber.tags
            : [...(existingSubscriber?.tags || []), PONG_TAG],
        },
      });

      // Generar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Guardar código en DB
      await db.subscriber.update({
        where: { email },
        data: { verificationCode: code },
      });

      // Enviar email con código
      await sendVerificationCode(email, code);

      return data({ success: true, codeSent: true });
    } catch (error) {
      console.error("Error sending code:", error);
      return data({ success: false, error: "Error al enviar código. Intenta de nuevo." });
    }
  }

  // PASO 2: Verificar código OTP
  if (intent === "verify-code") {
    const email = String(formData.get("email")).toLowerCase().trim();
    const code = String(formData.get("code")).trim();

    if (!email || !code) {
      return data({ success: false, error: "Email y código requeridos" });
    }

    try {
      const subscriber = await db.subscriber.findUnique({
        where: { email },
      });

      if (!subscriber || subscriber.verificationCode !== code) {
        return data({ success: false, error: "Código inválido" });
      }

      // Confirmar suscripción y agregar tag
      const newTags = subscriber.tags.includes(PONG_TAG)
        ? subscriber.tags
        : [...subscriber.tags, PONG_TAG];

      await db.subscriber.update({
        where: { email },
        data: {
          confirmed: true,
          verificationCode: null,
          tags: newTags,
        },
      });

      // También crear/actualizar en User para consistencia
      await db.user.upsert({
        where: { email },
        create: {
          email,
          username: email.split("@")[0],
          courses: [],
          editions: [],
          roles: [],
          tags: [PONG_TAG, "newsletter", "subscriber"],
          confirmed: true,
          role: "GUEST",
        },
        update: {
          tags: { push: [PONG_TAG] },
          confirmed: true,
        },
      });

      // Setear cookie de acceso
      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        `${SUBSCRIBER_COOKIE}=${encodeURIComponent(email)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
      );

      return data({ success: true, verified: true }, { headers });
    } catch (error) {
      console.error("Error verifying code:", error);
      return data({ success: false, error: "Error al verificar. Intenta de nuevo." });
    }
  }

  return data({ success: false });
};

// Animated Pong ball component
const PongBall = () => {
  return (
    <motion.div
      className="absolute w-4 h-4 bg-green-400 rounded-sm shadow-[0_0_20px_#4ade80]"
      animate={{
        x: [0, 200, 200, 0, 0],
        y: [0, 80, 160, 80, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

// Retro terminal text effect
const RetroText = ({ children, delay = 0 }: { children: string; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayed(children.slice(0, index + 1));
        index++;
        if (index >= children.length) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [children, delay]);

  return (
    <span>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-3 h-6 bg-green-400 ml-1 align-middle"
      />
    </span>
  );
};

export default function PongLanding({ loaderData }: Route.ComponentProps) {
  const { hasAccess } = loaderData || {};
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">(hasAccess ? "success" : "email");
  const fetcher = useFetcher();
  const codeInputRef = useRef<HTMLInputElement>(null);

  const error = fetcher.data?.error;
  const isLoading = fetcher.state !== "idle";

  // Detectar respuesta del server
  useEffect(() => {
    if (fetcher.data?.codeSent) {
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
    if (fetcher.data?.verified || fetcher.data?.alreadyVerified) {
      setStep("success");
    }
  }, [fetcher.data]);

  const handleResendCode = () => {
    setCode("");
    fetcher.submit(
      { intent: "send-code", email, name },
      { method: "POST" }
    );
  };

  const topics = [
    "Intro a Canvas - configuración inicial",
    "Agregando listeners para las teclas",
    "Mejorando movimiento con física",
    "Detallando a nuestro player",
    "Dibujando la cancha completa",
    "Agregando sistema de colisiones",
    "Metiendo gol - puntuación",
    "Agregando soniditos",
    "Modo Multiplayer local",
  ];

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden">
      {/* CRT scan lines effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-10"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      {/* Vignette effect */}
      <div
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-30 border-b border-green-900/50 bg-black/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-green-400 hover:text-green-300 transition-colors">
            <span className="text-xl">&lt;FixterGeek/&gt;</span>
          </Link>
          <div className="flex gap-6 text-sm">
            <Link to="/cursos" className="hover:text-green-300 transition-colors">
              [CURSOS]
            </Link>
            <Link to="/blog" className="hover:text-green-300 transition-colors">
              [BLOG]
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-20 min-h-[80vh] flex items-center">
        <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-green-700 rounded text-sm bg-green-950/30">
              <BiJoystick className="text-lg" />
              <span>CURSO CLÁSICO • GRATIS</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-green-300">PONG</span>
              <br />
              <span className="text-green-500">con Vanilla JS</span>
            </h1>

            <p className="text-green-300/80 text-lg mb-8 max-w-xl leading-relaxed">
              Vamos a construir juntos el juego que inició todo — y de paso, vas a
              entender JavaScript de verdad. Sin React. Sin frameworks. Solo tú, yo,
              y el poder del Canvas API.
            </p>

            <div className="flex flex-wrap gap-4 mb-8 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-800/50 rounded">
                <BiGroup className="text-green-400" />
                <span>+800 estudiantes</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-800/50 rounded">
                <BiStar className="text-yellow-400" />
                <span>4.8 ★</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-800/50 rounded">
                <BiTime className="text-green-400" />
                <span>~1 hora</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-800/50 rounded">
                <SiJavascript className="text-yellow-400" />
                <span>100% JavaScript</span>
              </div>
            </div>

            {/* CTA - Subscription Form con OTP */}
            <AnimatePresence mode="wait">
              {step === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 border-2 border-green-500 bg-green-950/30 rounded-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <BiCheckCircle className="text-3xl text-green-400" />
                    <span className="text-xl text-green-300">¡ACCESO CONCEDIDO!</span>
                  </div>
                  <p className="text-green-400/80 mb-4">
                    Ya puedes ver el curso completo. ¡Que comience el juego!
                  </p>
                  <Link
                    to="/cursos/pong-vanilla-js/viewer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-bold rounded hover:bg-green-400 transition-colors"
                  >
                    <BiPlay className="text-xl" />
                    INICIAR CURSO
                  </Link>
                </motion.div>
              ) : step === "email" ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <fetcher.Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="send-code" />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre (opcional)"
                        className="flex-1 px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700"
                      />
                      <input
                        type="email"
                        name="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="flex-1 px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !email.includes("@")}
                      className="w-full sm:w-auto px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                          />
                          ENVIANDO CÓDIGO...
                        </>
                      ) : (
                        <>
                          <BiPlay className="text-xl" />
                          OBTENER ACCESO GRATIS
                        </>
                      )}
                    </button>

                    {error && step === "email" && (
                      <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <p className="text-green-700 text-xs">
                      Te enviaremos un código de verificación. Sin spam.
                    </p>
                  </fetcher.Form>
                </motion.div>
              ) : (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <fetcher.Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="verify-code" />
                    <input type="hidden" name="email" value={email} />

                    <p className="text-green-300 text-sm mb-2">
                      Enviamos un código de 6 dígitos a{" "}
                      <span className="text-green-400 font-semibold">{email}</span>
                    </p>

                    <input
                      ref={codeInputRef}
                      type="text"
                      name="code"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700 text-center text-2xl tracking-[0.5em] font-mono"
                    />

                    <button
                      type="submit"
                      disabled={isLoading || code.length !== 6}
                      className="w-full sm:w-auto px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                          />
                          VERIFICANDO...
                        </>
                      ) : (
                        <>
                          <BiCheckCircle className="text-xl" />
                          VERIFICAR CÓDIGO
                        </>
                      )}
                    </button>

                    {error && step === "code" && (
                      <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setCode("");
                        }}
                        className="text-green-600 hover:text-green-400 transition-colors"
                      >
                        ← Cambiar email
                      </button>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="text-green-600 hover:text-green-400 transition-colors disabled:opacity-50"
                      >
                        Reenviar código
                      </button>
                    </div>
                  </fetcher.Form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Animated Pong */}
          <div className="hidden lg:block">
            <div className="relative aspect-[4/3] border-4 border-green-700 rounded-lg bg-black overflow-hidden shadow-[0_0_60px_rgba(74,222,128,0.2)]">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 border-l-4 border-dashed border-green-700/50" />

              {/* Left paddle - pegado al borde */}
              <motion.div
                className="absolute left-2 w-2 h-16 bg-green-400 rounded-sm shadow-[0_0_10px_#4ade80]"
                animate={{ top: ["20%", "60%", "20%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Right paddle - pegado al borde */}
              <motion.div
                className="absolute right-2 w-2 h-16 bg-green-400 rounded-sm shadow-[0_0_10px_#4ade80]"
                animate={{ top: ["50%", "15%", "50%"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Ball - rebote realista de Pong usando porcentajes */}
              <motion.div
                className="absolute w-3 h-3 bg-green-400 rounded-sm shadow-[0_0_15px_#4ade80]"
                animate={{
                  left: ["5%", "92%", "5%", "92%", "5%"],
                  top: ["35%", "5%", "85%", "25%", "35%"],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "linear",
                  times: [0, 0.25, 0.5, 0.75, 1],
                }}
              />

              {/* Score */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-16 text-4xl font-bold text-green-500">
                <span>3</span>
                <span>2</span>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/10 to-transparent pointer-events-none" />
            </div>

            <p className="text-center text-green-600 text-sm mt-4">
              [ Construiremos algo similar ]
            </p>
          </div>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="relative z-20 py-20 border-t border-green-900/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-2 text-center">
            <span className="text-green-500">&gt;</span> LO QUE VAS A APRENDER
          </h2>
          <p className="text-green-600 text-center mb-12">
            Conceptos fundamentales de JavaScript aplicados a un proyecto real
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {topics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-3 p-4 border border-green-800/50 rounded bg-green-950/20 hover:bg-green-950/40 transition-colors"
              >
                <BiCheckCircle className="text-green-400 text-xl flex-shrink-0 mt-0.5" />
                <span className="text-green-300">{topic}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Vanilla JS */}
      <section className="relative z-20 py-20 border-t border-green-900/30 bg-green-950/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">
            <span className="text-green-500">&gt;</span> ¿POR QUÉ VANILLA JS?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 border border-green-800/50 rounded bg-black/50">
              <BiCode className="text-4xl text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-green-300 mb-2">Fundamentos sólidos</h3>
              <p className="text-green-500/80 text-sm">
                Entender JavaScript puro te hace mejor en cualquier framework después.
              </p>
            </div>

            <div className="p-6 border border-green-800/50 rounded bg-black/50">
              <BiJoystick className="text-4xl text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-green-300 mb-2">Proyecto divertido</h3>
              <p className="text-green-500/80 text-sm">
                Aprender construyendo un juego es más motivante que ejemplos aburridos.
              </p>
            </div>

            <div className="p-6 border border-green-800/50 rounded bg-black/50">
              <SiJavascript className="text-4xl text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold text-green-300 mb-2">Cero dependencias</h3>
              <p className="text-green-500/80 text-sm">
                Sin npm install, sin node_modules, sin configuración. Solo código.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Section - con LiquidEther */}
      <section className="py-10 lg:py-20 relative overflow-hidden bg-black">
        {/* LiquidEther Background */}
        <div className="absolute inset-0 z-0">
          <LiquidEther
            colors={["#4ade80", "#22c55e", "#16a34a"]}
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
            <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden bg-black/90 backdrop-blur-sm border border-green-800/30">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="font-light text-green-300">Tu instructor</span>
                  <h3 className="text-3xl font-bold mt-2 mb-4 text-green-400">
                    Héctor Bliss
                  </h3>
                  <p className="mb-6 text-green-300/80">
                    Pionero en hacer la programación accesible para todos, con más de 10
                    años enseñando tecnología y una comunidad de más de 15,000
                    estudiantes.
                  </p>
                  <p className="mb-6 text-green-300/80">
                    Creo que la mejor forma de aprender es construyendo cosas que te emocionen.
                    Por eso creé este curso de Pong.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        10+
                      </div>
                      <div className="text-xs text-green-500/80">
                        Años enseñando
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        15K+
                      </div>
                      <div className="text-xs text-green-500/80">
                        Estudiantes
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        100%
                      </div>
                      <div className="text-xs text-green-500/80">Práctico</div>
                    </div>
                  </div>
                  {/* Social Links */}
                  <div className="flex gap-4 mt-6">
                    <a
                      href="https://www.linkedin.com/in/hectorbliss/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-400 transition-colors"
                    >
                      <BsLinkedin className="text-2xl" />
                    </a>
                    <a
                      href="https://github.com/blissito"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-400 transition-colors"
                    >
                      <BsGithub className="text-2xl" />
                    </a>
                    <a
                      href="https://www.facebook.com/blissito"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-400 transition-colors"
                    >
                      <BsFacebook className="text-2xl" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: "#4ade80" }}
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

      {/* Final CTA */}
      <section className="relative z-20 py-20 border-t border-green-900/30">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-green-400">¿LISTO PARA JUGAR?</span>
          </h2>
          <p className="text-green-500 mb-8 text-lg">
            {step === "success"
              ? "Ya tienes acceso. ¡Que comience el juego!"
              : "Regístrate gratis y empieza a construir Pong ahora mismo."}
          </p>

          {step === "success" ? (
            <Link
              to="/cursos/pong-vanilla-js/viewer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-colors"
            >
              <BiPlay className="text-xl" />
              IR AL CURSO
            </Link>
          ) : step === "email" ? (
            <fetcher.Form method="post" className="max-w-md mx-auto space-y-4">
              <input type="hidden" name="intent" value="send-code" />
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700 text-center"
              />
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700 text-center"
              />
              <button
                type="submit"
                disabled={isLoading || !email.includes("@")}
                className="w-full px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50"
              >
                {isLoading ? "ENVIANDO CÓDIGO..." : "COMENZAR GRATIS"}
              </button>
            </fetcher.Form>
          ) : (
            <fetcher.Form method="post" className="max-w-md mx-auto space-y-4">
              <input type="hidden" name="intent" value="verify-code" />
              <input type="hidden" name="email" value={email} />
              <p className="text-green-300 text-sm">
                Código enviado a <span className="text-green-400 font-semibold">{email}</span>
              </p>
              <input
                type="text"
                name="code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700 text-center text-2xl tracking-[0.5em] font-mono"
              />
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50"
              >
                {isLoading ? "VERIFICANDO..." : "VERIFICAR CÓDIGO"}
              </button>
              <div className="flex justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setCode(""); }}
                  className="text-green-600 hover:text-green-400"
                >
                  ← Cambiar email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-green-600 hover:text-green-400 disabled:opacity-50"
                >
                  Reenviar código
                </button>
              </div>
            </fetcher.Form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 py-8 border-t border-green-900/30 bg-black/80">
        <div className="max-w-6xl mx-auto px-4 text-center text-green-700 text-sm">
          <p>&copy; {new Date().getFullYear()} FixterGeek. Todos los derechos reservados.</p>
          <p className="mt-2 font-mono text-xs">
            {">"} Hecho con JavaScript y amor por los clásicos {"<"}
          </p>
        </div>
      </footer>
    </div>
  );
}
