import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SimpleFooter from "~/components/common/SimpleFooter";
import { EmojiConfetti } from "~/components/common/EmojiConfetti";
import { PhoneInput } from "~/components/common/PhoneInput";
import getMetaTags from "~/utils/getMetaTags";
import { useFetcher, Link } from "react-router";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import { db } from "~/.server/db";
import { sendWebinarCongrats } from "~/mailSenders/sendWebinarCongrats";
import {
  BiChevronRight,
  BiPlay,
  BiCheckCircle,
  BiCode,
  BiNetworkChart,
  BiCog,
  BiRocket,
  BiStar,
  BiBot,
  BiLayer,
} from "react-icons/bi";
import { HiSparkles } from "react-icons/hi";

export const meta = () => {
  const baseMeta = getMetaTags({
    title: "LlamaIndex Agent Workflows | Curso TypeScript | FixterGeek",
    description:
      "Domina LlamaIndex Agent Workflows en TypeScript. Aprende a crear agentes inteligentes, workflows estructurados y sistemas multi-agente. Contenido premium para principiantes.",
    url: "https://www.fixtergeek.com/llamaindex",
    image: "https://nocodestartup.io/wp-content/uploads/2025/06/LlamaIndex-e-para-que-ele-serve-1024x683.png",
  });

  return [
    ...baseMeta,
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "early_access_registration") {
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const phone = String(formData.get("phone_full") || formData.get("phone"));
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
            "llamaindex_course",
            "newsletter",
            `experience-${experience}`,
            `interest-${interest}`,
          ],
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "llamaindex_typescript_2025",
          },
          confirmed: false,
          role: "GUEST",
        },
        update: {
          displayName: name,
          phoneNumber: phone || undefined,
          tags: { push: ["llamaindex_course"] },
          webinar: {
            experienceLevel: experience,
            contextObjective: interest,
            registeredAt: new Date().toISOString(),
            webinarType: "llamaindex_typescript_2025",
          },
        },
      });

      await sendWebinarCongrats({
        to: email,
        webinarTitle: "LlamaIndex Agent Workflows en TypeScript",
        webinarDate: "Próximamente",
        userName: name,
      });

      return data({
        success: true,
        type: "course_registration",
        message: "Registro exitoso para el curso",
      });
    } catch (error) {
      console.error("Error registering for course:", error);
      return data({
        success: false,
        error: "Error al procesar el registro",
      });
    }
  }

  return redirect("/llamaindex");
};

export default function LlamaIndexPage() {
  const fetcher = useFetcher();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccess(true);
    }
  }, [fetcher.data]);

  return (
    <div className="h-screen overflow-hidden bg-slate-900 relative" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Gradient overlay más intenso */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#37D7FA]/20 via-[#3E18F9]/25 via-[#FF8DF2]/8 to-[#FF8705]/15"></div>

      {/* Overlay para profundidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>

      {/* Grid pattern sutil */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23000000' fill-opacity='1'%3e%3ccircle cx='30' cy='30' r='1.5'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
      }}></div>

      {/* Múltiples imágenes flotantes - Desktop */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`desktop-${i}`}
          className="absolute hidden lg:block"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scale: 1,
            rotate: [0, 360],
            x: [0, Math.random() * 50 - 25],
            y: [0, Math.random() * 30 - 15],
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeInOut"
          }}
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            zIndex: Math.random() > 0.5 ? 5 : 1,
          }}
        >
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${
              i % 4 === 0 ? 'from-[#37D7FA]/10 to-[#3E18F9]/10' :
              i % 4 === 1 ? 'from-[#3E18F9]/10 to-[#FF8DF2]/10' :
              i % 4 === 2 ? 'from-[#FF8DF2]/10 to-[#FF8705]/10' :
              'from-[#FF8705]/10 to-[#37D7FA]/10'
            } rounded-full blur-lg transform scale-150`}></div>
            <img
              src="/courses/new_me 1.svg"
              alt="AI Character"
              className={`relative z-10 filter ${
                i < 2 ? 'w-32 h-32' :
                i < 5 ? 'w-24 h-24' :
                i < 8 ? 'w-16 h-16' : 'w-12 h-12'
              } ${i % 2 === 0 ? 'hue-rotate-15' : i % 3 === 0 ? 'hue-rotate-30' : ''}`}
            />
          </div>
        </motion.div>
      ))}

      {/* Imágenes flotantes para móvil */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`mobile-${i}`}
          className="absolute block lg:hidden"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.05, 0.2, 0.05],
            scale: 1,
            rotate: [0, 180, 360],
            x: [0, Math.random() * 30 - 15],
            y: [0, Math.random() * 20 - 10],
          }}
          transition={{
            duration: 12 + Math.random() * 6,
            repeat: Infinity,
            delay: i * 2,
            ease: "easeInOut"
          }}
          style={{
            top: `${Math.random() * 90 + 5}%`,
            left: `${Math.random() * 90 + 5}%`,
            zIndex: 1,
          }}
        >
          <img
            src="/courses/new_me 1.svg"
            alt="AI Character"
            className={`filter ${
              i < 2 ? 'w-16 h-16' :
              i < 4 ? 'w-12 h-12' : 'w-8 h-8'
            } ${i % 2 === 0 ? 'hue-rotate-15' : ''}`}
          />
        </motion.div>
      ))}

      {/* Imagen principal más grande */}
      <motion.div
        className="absolute top-16 right-16 hidden xl:block"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 0.8,
          y: [0, -10, 0],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          duration: 2,
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          },
          rotate: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        style={{ zIndex: 6 }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#37D7FA]/30 to-[#FF8DF2]/30 rounded-full blur-2xl transform scale-125"></div>
          <img
            src="/courses/new_me 1.svg"
            alt="AI Agent Character"
            className="w-40 h-40 relative z-10 filter drop-shadow-2xl"
          />
        </div>
      </motion.div>

      {/* Container principal con altura exacta de pantalla */}
      <div className="h-screen flex flex-col relative z-10">
        {/* Contenido principal */}
        <main className="flex-1 flex items-start md:items-center justify-center px-6 py-4 pt-20 md:pt-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

            {/* Columna izquierda - Contenido */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="inline-flex items-center px-4 py-2 bg-[#37D7FA]/10 border border-[#37D7FA]/20 rounded-full text-[#37D7FA] text-sm font-medium">
                    <BiRocket className="mr-2" />
                    Curso en Desarrollo
                  </div>
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="lg:hidden"
                  >
                    <img
                      src="/courses/new_me 1.svg"
                      alt="AI Character"
                      className="w-12 h-12 opacity-80"
                    />
                  </motion.div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src="/llamaindex.png"
                    alt="LlamaIndex"
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl"
                  />
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-white">
                    <span className="bg-gradient-to-r from-[#FF8705] to-[#FF8DF2] bg-clip-text text-transparent">
                      LlamaIndex
                    </span>
                    <br />
                    <span className="text-white">Agent Workflows</span>
                  </h1>
                </div>

                <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                  Domina la creación de agentes inteligentes y workflows estructurados
                  en TypeScript. <strong className="text-white">Contenido premium desde los fundamentos hasta sistemas multi-agente.</strong>
                </p>

                {/* Link sutil al libro */}
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-slate-400">Mientras tanto,</span>
                  <Link
                    to="/libros/llamaindex"
                    className="text-[#37D7FA] hover:text-[#FF8DF2] transition-colors underline decoration-dotted underline-offset-4 hover:decoration-solid"
                  >
                    lee el libro interactivo gratuito
                  </Link>
                  <span className="text-slate-400">📖</span>
                </div>
              </div>

              {/* Características principales */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-4 p-4 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#37D7FA]/20 rounded-lg flex items-center justify-center">
                    <BiCode className="text-[#37D7FA] text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">TypeScript Nativo</h3>
                    <p className="text-slate-300 text-sm mt-1">Implementación completa en TypeScript</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#3E18F9]/20 rounded-lg flex items-center justify-center">
                    <BiNetworkChart className="text-[#3E18F9] text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Multi-Agent Systems</h3>
                    <p className="text-slate-300 text-sm mt-1">Coordinación entre múltiples agentes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#FF8DF2]/20 rounded-lg flex items-center justify-center">
                    <BiCog className="text-[#FF8DF2] text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Structured Output</h3>
                    <p className="text-slate-300 text-sm mt-1">Respuestas estructuradas con Zod</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#FF8705]/20 rounded-lg flex items-center justify-center">
                    <BiLayer className="text-[#FF8705] text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Event Streaming</h3>
                    <p className="text-slate-300 text-sm mt-1">Monitoreo en tiempo real</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Columna derecha - Registro */}
            <div className="relative">
              {/* Imagen decorativa para el formulario */}
              <motion.div
                className="absolute -top-8 -right-8 hidden lg:block z-0"
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <img
                  src="/courses/new_me 1.svg"
                  alt="AI Helper"
                  className="w-16 h-16 opacity-30"
                />
              </motion.div>

              <AnimatePresence>
                {!showSuccess ? (
                  <motion.div
                    id="registro-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 shadow-2xl relative z-10 group hover:bg-white/15 transition-all duration-300"
                    whileHover={{ y: -2 }}
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Acceso Anticipado
                      </h3>
                      <p className="text-slate-300 text-sm">
                        Regístrate para ser notificado cuando el primer video esté disponible
                      </p>
                    </div>

                    <fetcher.Form method="post" className="space-y-4">
                      <input type="hidden" name="intent" value="early_access_registration" />

                      <div>
                        <input
                          type="text"
                          name="name"
                          placeholder="Tu nombre completo"
                          required
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#37D7FA] focus:border-transparent transition-colors backdrop-blur-sm"
                        />
                      </div>

                      <div>
                        <input
                          type="email"
                          name="email"
                          placeholder="tu@email.com"
                          required
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#37D7FA] focus:border-transparent transition-colors backdrop-blur-sm"
                        />
                      </div>

                      <div>
                        <PhoneInput
                          name="phone"
                          placeholder="Teléfono (opcional)"
                          className="w-full"
                          dark={true}
                        />
                      </div>

                      <div>
                        <select
                          name="experience"
                          required
                          className="w-full px-4 py-3 bg-white border border-[#e7e7e7] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#37D7FA] focus:border-transparent transition-colors"
                        >
                          <option value="">Nivel de experiencia en TypeScript</option>
                          <option value="beginner">Principiante</option>
                          <option value="intermediate">Intermedio</option>
                          <option value="advanced">Avanzado</option>
                        </select>
                      </div>

                      <div>
                        <select
                          name="interest"
                          required
                          className="w-full px-4 py-3 bg-white border border-[#e7e7e7] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#37D7FA] focus:border-transparent transition-colors"
                        >
                          <option value="">¿Qué te interesa más?</option>
                          <option value="single_agents">Agentes individuales</option>
                          <option value="multi_agents">Sistemas multi-agente</option>
                          <option value="workflows">Workflows complejos</option>
                          <option value="all">Todo lo anterior</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={fetcher.state === "submitting"}
                        className="w-full bg-gradient-to-r from-[#FF8705] to-[#FF8DF2] hover:shadow-lg text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {fetcher.state === "submitting" ? (
                          <span>Registrando...</span>
                        ) : (
                          <>
                            <span>Registrarme</span>
                            <BiPlay className="text-lg" />
                          </>
                        )}
                      </button>
                    </fetcher.Form>

                    {fetcher.data?.error && (
                      <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm backdrop-blur-sm">
                        {fetcher.data.error}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 shadow-2xl text-center relative"
                  >
                    {/* Confetti de celebración */}
                    <EmojiConfetti emojis={["🤖", "🎉", "⚡", "🚀", "💻", "🦙", "🔥"]} small={true} />

                    {/* Celebración con imagen */}
                    <motion.div
                      className="absolute -top-4 -right-4"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    >
                      <img
                        src="/courses/new_me 1.svg"
                        alt="Success AI"
                        className="w-12 h-12 opacity-70"
                      />
                    </motion.div>

                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BiCheckCircle className="text-green-400 text-3xl" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      ¡Registro Exitoso!
                    </h3>
                    <p className="text-slate-300 mb-6 text-sm">
                      Te notificaremos cuando el primer video esté disponible.
                      Revisa tu email para más detalles.
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-[#37D7FA] mb-6">
                      <BiStar className="text-lg" />
                      <span className="text-sm font-medium">Acceso anticipado confirmado</span>
                    </div>

                    {/* Progressive Disclosure - Botón al curso */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Link
                        to="/cursos/llamaindex/detalle"
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#FF8705] to-[#FF8DF2] hover:shadow-lg text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                      >
                        <BiRocket className="text-lg" />
                        <span>Ver detalle del curso</span>
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>


        {/* Footer compacto */}
        <div className="relative z-10 py-2">
          <div className="border-t border-white/20 bg-black/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 py-3 text-center">
              <p className="text-sm text-slate-400">© 2025 FixterGeek. Curso LlamaIndex Agent Workflows.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}