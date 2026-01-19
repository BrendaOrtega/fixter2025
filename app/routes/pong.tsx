import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetcher, Link } from "react-router";
import { data, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import getMetaTags from "~/utils/getMetaTags";
import {
  BiPlay,
  BiCheckCircle,
  BiCode,
  BiJoystick,
  BiTime,
  BiGroup,
} from "react-icons/bi";
import { BsLinkedin, BsGithub, BsFacebook } from "react-icons/bs";
import { SiJavascript } from "react-icons/si";
import LiquidEther from "~/components/backgrounds/LiquidEther";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "Pong con Vanilla JS | Curso Gratis | FixterGeek",
    description:
      "Aprende JavaScript construyendo el clásico Pong desde cero. Sin frameworks, sin librerías - solo tú, JavaScript y el Canvas API. Curso gratuito con +800 estudiantes.",
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "subscribe") {
    const email = String(formData.get("email"));
    const name = String(formData.get("name") || "");

    if (!email || !email.includes("@")) {
      return data({
        success: false,
        error: "Email inválido",
      });
    }

    try {
      await db.user.upsert({
        where: { email },
        create: {
          email,
          username: name || email.split("@")[0],
          displayName: name || undefined,
          courses: [],
          editions: [],
          roles: [],
          tags: ["pong-course", "newsletter", "subscriber"],
          confirmed: true,
          role: "GUEST",
        },
        update: {
          displayName: name || undefined,
          tags: { push: ["pong-course"] },
          confirmed: true,
        },
      });

      return data({
        success: true,
        message: "¡Listo! Ya tienes acceso al curso",
      });
    } catch (error) {
      console.error("Error subscribing:", error);
      return data({
        success: false,
        error: "Error al registrarte. Intenta de nuevo.",
      });
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

export default function PongLanding() {
  const [showSuccess, setShowSuccess] = useState(false);
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);

  const isSuccess = fetcher.data?.success;
  const error = fetcher.data?.error;
  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      formRef.current?.reset();
    }
  }, [isSuccess]);

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
              Aprende JavaScript de verdad construyendo el juego que inició todo.
              Sin React. Sin frameworks. Solo tú, JavaScript y el poder del Canvas API.
            </p>

            <div className="flex flex-wrap gap-4 mb-8 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-800/50 rounded">
                <BiGroup className="text-green-400" />
                <span>+800 estudiantes</span>
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

            {/* CTA - Subscription Form */}
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
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
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <fetcher.Form ref={formRef} method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="subscribe" />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        name="name"
                        placeholder="Tu nombre (opcional)"
                        className="flex-1 px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700"
                      />
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="tu@email.com"
                        className="flex-1 px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                          />
                          PROCESANDO...
                        </>
                      ) : (
                        <>
                          <BiPlay className="text-xl" />
                          OBTENER ACCESO GRATIS
                        </>
                      )}
                    </button>

                    {error && (
                      <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <p className="text-green-700 text-xs">
                      Solo usamos tu email para darte acceso. Sin spam.
                    </p>
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

              {/* Left paddle */}
              <motion.div
                className="absolute left-4 w-3 h-20 bg-green-400 rounded shadow-[0_0_10px_#4ade80]"
                animate={{ y: [40, 120, 40] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Right paddle */}
              <motion.div
                className="absolute right-4 w-3 h-20 bg-green-400 rounded shadow-[0_0_10px_#4ade80]"
                animate={{ y: [100, 40, 100] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Ball - rebote realista de Pong */}
              <motion.div
                className="absolute w-4 h-4 bg-green-400 rounded shadow-[0_0_15px_#4ade80]"
                animate={{
                  // Rebote horizontal de paleta a paleta (20px a 350px aprox)
                  x: [24, 350, 24, 350, 24],
                  // Rebote vertical en bordes superior (10px) e inferior (180px)
                  y: [90, 10, 170, 50, 90],
                }}
                transition={{
                  duration: 4,
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
              [ Esto es lo que vas a construir ]
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
            Regístrate gratis y empieza a construir Pong ahora mismo.
          </p>

          {!showSuccess && (
            <fetcher.Form method="post" className="max-w-md mx-auto space-y-4">
              <input type="hidden" name="intent" value="subscribe" />
              <input
                type="email"
                name="email"
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-black border-2 border-green-700 rounded focus:border-green-400 focus:outline-none text-green-300 placeholder-green-700 text-center"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-all disabled:opacity-50"
              >
                {isLoading ? "PROCESANDO..." : "COMENZAR GRATIS"}
              </button>
            </fetcher.Form>
          )}

          {showSuccess && (
            <Link
              to="/cursos/pong-vanilla-js/viewer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-black font-bold text-lg rounded hover:bg-green-400 transition-colors"
            >
              <BiPlay className="text-xl" />
              IR AL CURSO
            </Link>
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
