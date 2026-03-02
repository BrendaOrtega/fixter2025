import { motion } from "motion/react";
import { Link } from "react-router";

interface CoachLandingProps {
  sessionCount?: number;
}

export function CoachLanding({ sessionCount = 0 }: CoachLandingProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#CA9B77]/[0.04] to-[#845A8F]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Tu coach de voz
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
                para entrevistas y programación
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed"
          >
            No es un chatbot genérico. Es un sistema adaptativo que te evalúa en 5 dimensiones,
            construye tu storybank, y sube la dificultad sesión tras sesión.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/coach?start=1"
              className="inline-block rounded-2xl bg-gradient-to-r from-[#CA9B77] to-[#b8895f] px-10 py-4 text-base font-semibold text-zinc-900 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#CA9B77]/20"
            >
              Prueba gratis — sin registro
            </Link>
            <a
              href="#como-funciona"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              Ver cómo funciona
            </a>
          </motion.div>
        </div>
      </section>

      {/* === 3 feature cards === */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ),
              title: "Speech-to-Speech",
              desc: "Hablas y el coach responde en voz real. Sin transcripción intermedia. Latencia mínima.",
              accent: "#CA9B77",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: "Scoring por LLM",
              desc: "Cada sesión es evaluada por IA. 5 dimensiones, deltas, feedback por área, siguiente paso accionable.",
              accent: "#845A8F",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              ),
              title: "Coaching adaptativo",
              desc: "El agente detecta tu área débil y ajusta las preguntas. 70% reto, 30% aliento — basado en investigación.",
              accent: "#CA9B77",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${feature.accent}15`, color: feature.accent }}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-medium text-zinc-200">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === SCORING SYSTEM — 5 dimensions with visual radar === */}
      <section id="como-funciona" className="px-6 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#845A8F]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs text-[#CA9B77] uppercase tracking-[0.2em] mb-4"
            >
              Sistema de evaluación
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold"
            >
              <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                5 dimensiones.
              </span>{" "}
              <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
                Scoring real.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 mt-4 max-w-lg mx-auto"
            >
              Después de cada sesión, un LLM analiza tu transcript completo y genera
              un scoring con deltas por dimensión, feedback específico, y pasos concretos.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: dimension cards */}
            <div className="space-y-4">
              <DimensionSection
                title="Programación"
                color="#CA9B77"
                dimensions={[
                  { name: "Algoritmos", desc: "Capacidad de descomponer problemas y elegir estructuras de datos." },
                  { name: "Sintaxis", desc: "Fluidez para escribir código sin fricción cognitiva." },
                  { name: "System Design", desc: "Pensar en escala, trade-offs, y arquitectura." },
                  { name: "Debugging", desc: "Estrategia para encontrar y resolver bugs." },
                  { name: "Comunicación", desc: "Explicar decisiones técnicas con claridad." },
                ]}
              />
              <div className="h-px bg-zinc-800/50 my-6" />
              <DimensionSection
                title="Entrevistas (STAR)"
                color="#845A8F"
                dimensions={[
                  { name: "Substance", desc: "Profundidad y datos concretos en tus respuestas." },
                  { name: "Structure", desc: "Claridad del formato Situación → Tarea → Acción → Resultado." },
                  { name: "Relevance", desc: "Qué tan relevante es tu historia para el puesto." },
                  { name: "Credibility", desc: "Detalles que solo alguien que vivió la historia sabría." },
                  { name: "Differentiation", desc: "Lo que te hace memorable frente a otros candidatos." },
                ]}
              />
            </div>

            {/* Right: scorecard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Tu Scorecard</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#845A8F]/10 text-[#845A8F] border border-[#845A8F]/20">
                  Entrevista
                </span>
              </div>

              {/* Mini radar mockup */}
              <div className="flex justify-center py-4">
                <ScorecardRadarMockup />
              </div>

              {/* Delta bars */}
              {[
                { name: "Substance", score: 72, delta: 8 },
                { name: "Structure", score: 65, delta: 5 },
                { name: "Relevance", score: 58, delta: -3 },
                { name: "Credibility", score: 80, delta: 12 },
                { name: "Differentiation", score: 45, delta: 6 },
              ].map((d, i) => (
                <motion.div
                  key={d.name}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-zinc-500 w-28 shrink-0">{d.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${d.score}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.06, duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#845A8F] to-[#CA9B77]"
                    />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${d.delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {d.delta > 0 ? "+" : ""}{d.delta}
                  </span>
                </motion.div>
              ))}

              <div className="border-t border-zinc-800/40 pt-4">
                <p className="text-xs text-zinc-600">Siguiente paso:</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Practica historias de diferenciación — tu punto más débil. Usa el "earned secret" para cerrar.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* === DRILL PROGRESSION — 8 stages === */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs text-[#845A8F] uppercase tracking-[0.2em] mb-4"
            >
              Progresión adaptativa
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold"
            >
              <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                8 niveles de dificultad.
              </span>{" "}
              <span className="bg-gradient-to-r from-[#845A8F] to-[#CA9B77] bg-clip-text text-transparent">
                Avance automático.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 mt-4 max-w-lg mx-auto"
            >
              El coach sube la dificultad cuando tu scoring promedio supera 3.5 en 3 sesiones consecutivas.
              Nunca te quedas estancado haciendo lo mismo.
            </motion.p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { stage: 1, name: "Foundation", desc: "STAR básico con historias claras", icon: "🧱" },
              { stage: 2, name: "Detail", desc: "Especificidad y métricas concretas", icon: "🔍" },
              { stage: 3, name: "Pushback", desc: "El coach reta tus respuestas", icon: "⚡" },
              { stage: 4, name: "Pivot", desc: "Cambiar de historia mid-respuesta", icon: "🔄" },
              { stage: 5, name: "Panel", desc: "Múltiples perspectivas de entrevistador", icon: "👥" },
              { stage: 6, name: "Stress", desc: "Rapid-fire bajo presión de tiempo", icon: "⏱️" },
              { stage: 7, name: "Mock", desc: "Simulación completa 4-6 preguntas", icon: "🎭" },
              { stage: 8, name: "Challenge", desc: "Profundidad senior-level", icon: "🏔️" },
            ].map((s, i) => (
              <motion.div
                key={s.stage}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-2 group hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">Stage {s.stage}</span>
                </div>
                <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition">{s.name}</p>
                <p className="text-xs text-zinc-600 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === STORYBANK === */}
      <section className="px-6 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#CA9B77]/[0.015] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-xs text-[#CA9B77] uppercase tracking-[0.2em]"
              >
                Story Bank
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-bold"
              >
                <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Tus historias,
                </span>{" "}
                <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
                  listas para usar.
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-zinc-500 leading-relaxed"
              >
                El coach extrae automáticamente historias STAR de tus sesiones de entrevista.
                Cada una con situación, tarea, acción, resultado, earned secret, y quality score.
                Edítalas, organízalas, y ten tu banco de historias listo para cualquier entrevista.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                {[
                  "Extracción automática de historias STAR",
                  "Quality score por historia (1-5)",
                  "Earned secrets — el insight que te diferencia",
                  "Mapeo a habilidades primarias y secundarias",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CA9B77]" />
                    <span className="text-sm text-zinc-400">{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Story card mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              {[
                {
                  id: "S001",
                  title: "Migración de microservicios",
                  skill: "system-design",
                  strength: 4,
                  secret: "El bottleneck no era técnico — era la falta de ownership entre equipos.",
                },
                {
                  id: "S002",
                  title: "Optimización de pipeline de datos",
                  skill: "backend",
                  strength: 5,
                  secret: "Reducir la complejidad del query fue más valioso que escalar la infra.",
                },
                {
                  id: "S003",
                  title: "Lanzamiento bajo presión",
                  skill: "leadership",
                  strength: 3,
                  secret: "Priorizar comunicación al equipo sobre resolver el bug yo mismo.",
                },
              ].map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-600">{story.id}</span>
                      <span className="text-sm font-medium text-zinc-200">{story.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#845A8F]/10 text-[#845A8F]">
                        {story.skill}
                      </span>
                      <span className="text-xs text-zinc-600">{story.strength}/5</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#CA9B77]/5 border border-[#CA9B77]/10 px-3 py-2">
                    <p className="text-xs text-[#CA9B77]/70 mb-0.5">Earned secret</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{story.secret}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* === COACHING PATTERNS — the science behind it === */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4"
            >
              Patrones de coaching
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold"
            >
              <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Diseñado con
              </span>{" "}
              <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
                ciencia cognitiva.
              </span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "El silencio es coaching",
                desc: "Después de una pregunta difícil, el coach NO llena el silencio. El \"generation effect\" dice que retienes mejor lo que generas con esfuerzo.",
                tag: "Cognitive Science",
              },
              {
                title: "70/30 Challenge Rule",
                desc: "70% reto, 30% aliento. Más aliento que eso sube la satisfacción pero baja los outcomes reales. El coach te empuja, no te apapacha.",
                tag: "Research-backed",
              },
              {
                title: "1 observación + 1 pregunta",
                desc: "En voz, una respuesta de 2 párrafos se siente como un monólogo de 45 segundos. El formato ideal: una observación precisa y una pregunta que te haga pensar.",
                tag: "Voice UX",
              },
              {
                title: "Primer turno específico",
                desc: "\"Cuéntame qué construiste que te dio problemas\" — no \"¿En qué te ayudo?\". El 40% de usuarios abandonan en los primeros 2 min si el coach no engancha con algo concreto.",
                tag: "Retention",
              },
              {
                title: "Pushback calibrado",
                desc: "\"Eso suena genérico. Dame el detalle específico: ¿qué hiciste TÚ, no el equipo?\" — El coach detecta respuestas superficiales y empuja por profundidad.",
                tag: "Interview Prep",
              },
              {
                title: "Auto-calibración",
                desc: "Tu self-assessment vs el scoring del coach se comparan sesión a sesión. Si eres over-rater o under-rater, el coaching se ajusta.",
                tag: "Self-awareness",
              },
            ].map((pattern, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5 space-y-3 hover:border-zinc-700/60 transition"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-200">{pattern.title}</h3>
                  <span className="text-[10px] text-zinc-600 px-2 py-0.5 rounded-full bg-zinc-800/50">
                    {pattern.tag}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">{pattern.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === TWO MODES side by side === */}
      <section className="px-6 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#845A8F]/[0.015] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold"
            >
              <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Dos modos.
              </span>{" "}
              <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
                Un sistema.
              </span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Programming mode */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-[#CA9B77]/20 bg-gradient-to-b from-[#CA9B77]/5 to-transparent p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#CA9B77]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#CA9B77]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-200">Programación</h3>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Practica code review, system design, debugging strategies, y comunicación técnica.
                El coach se adapta a tu nivel de directness y detecta tu dimensión más débil.
              </p>
              <div className="space-y-2 text-xs text-zinc-600">
                <p>Primer turno: <span className="text-zinc-400">"Cuéntame qué construiste esta semana que te dio problemas."</span></p>
                <p>Dimensiones: Algoritmos, Sintaxis, System Design, Debugging, Comunicación</p>
                <p>Directness: configurable 1-5</p>
              </div>
            </motion.div>

            {/* Interview mode */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-[#845A8F]/20 bg-gradient-to-b from-[#845A8F]/5 to-transparent p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#845A8F]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#845A8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-200">Entrevistas</h3>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Coaching STAR completo: situación, tarea, acción, resultado. Con pushback real,
                extracción automática de historias, y 8 niveles de dificultad progresiva.
              </p>
              <div className="space-y-2 text-xs text-zinc-600">
                <p>Primer turno: <span className="text-zinc-400">"Cuéntame de un proyecto donde tuviste que tomar una decisión técnica difícil."</span></p>
                <p>Dimensiones: Substance, Structure, Relevance, Credibility, Differentiation</p>
                <p>Drill stages: Foundation → Detail → Pushback → ... → Challenge</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* === Demo conversation === */}
      <section className="px-6 py-16">
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-center text-sm text-zinc-600 uppercase tracking-wider mb-8">
            Así se siente una sesión
          </h2>
          {[
            { role: "assistant", text: "Cuéntame de un proyecto donde tuviste que tomar una decisión técnica difícil.", delay: 0.6 },
            { role: "user", text: "Migré un monolito a microservicios en mi empresa anterior. Fue complicado porque teníamos mucho acoplamiento.", delay: 1.0 },
            { role: "assistant", text: "Eso suena genérico. Dame el detalle específico: ¿qué servicio sacaste primero y por qué ese y no otro?", delay: 1.4 },
            { role: "user", text: "El servicio de pagos. Tenía el coupling más bajo y el mayor riesgo de downtime — 3 incidentes en 2 meses.", delay: 1.8 },
            { role: "assistant", text: "Ahí hay una buena historia. ¿Cuál fue el resultado medible después de la migración?", delay: 2.2 },
          ].map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: msg.delay * 0.5, duration: 0.4 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-[#CA9B77] text-zinc-900"
                    : "bg-zinc-800 text-zinc-200"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === Social proof === */}
      {sessionCount > 0 && (
        <section className="px-6 py-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm text-zinc-600"
          >
            {sessionCount.toLocaleString()} sesiones de coaching completadas
          </motion.p>
        </section>
      )}

      {/* === FAQ === */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-center text-lg font-semibold text-zinc-300 mb-8">
            Preguntas frecuentes
          </h2>
          {[
            {
              q: "¿Cómo funciona?",
              a: "Hablas en tiempo real con un coach de IA por voz (speech-to-speech). Te hace preguntas, te reta con pushback calibrado, y al final un LLM analiza tu transcript completo para generar scoring, feedback, y next steps.",
            },
            {
              q: "¿Qué necesito?",
              a: "Solo un navegador moderno y un micrófono. No necesitas instalar nada. La primera sesión toma 30 segundos de setup.",
            },
            {
              q: "¿Es gratis?",
              a: "Tienes 2 sesiones gratis por día sin registro. Para más sesiones, hay paquetes desde $149 MXN por 5 sesiones.",
            },
            {
              q: "¿Para quién es?",
              a: "Desarrolladores que se preparan para entrevistas técnicas (behavioral, system design) o que quieren mejorar sus habilidades de programación con coaching adaptativo.",
            },
            {
              q: "¿Cómo se compara con practicar solo?",
              a: "La diferencia es el pushback: el coach no acepta respuestas genéricas, te fuerza a dar detalles específicos, y mide tu progreso en 5 dimensiones. Es la diferencia entre ensayar frente al espejo y tener un mentor real.",
            },
          ].map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-5 space-y-2"
            >
              <h3 className="text-sm font-medium text-zinc-200">{faq.q}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === Final CTA === */}
      <section className="px-6 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#CA9B77]/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold"
          >
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Tu próxima entrevista
            </span>{" "}
            <span className="bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
              merece preparación real.
            </span>
          </motion.h2>
          <Link
            to="/coach?start=1"
            className="inline-block rounded-2xl bg-gradient-to-r from-[#CA9B77] to-[#b8895f] px-10 py-4 text-base font-semibold text-zinc-900 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#CA9B77]/20"
          >
            Empieza tu primera sesión
          </Link>
          <p className="text-xs text-zinc-700">
            MentorIA por FixterGeek
          </p>
        </div>
      </section>
    </div>
  );
}

// === Sub-components ===

function DimensionSection({
  title,
  color,
  dimensions,
}: {
  title: string;
  color: string;
  dimensions: Array<{ name: string; desc: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-3"
    >
      <h3 className="text-sm font-semibold" style={{ color }}>
        {title}
      </h3>
      <div className="space-y-2">
        {dimensions.map((dim) => (
          <div key={dim.name} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
            <div>
              <span className="text-sm text-zinc-300">{dim.name}</span>
              <span className="text-sm text-zinc-600"> — {dim.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ScorecardRadarMockup() {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const dims = [72, 65, 58, 80, 45]; // substance, structure, relevance, credibility, differentiation
  const angleStep = (2 * Math.PI) / 5;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const levels = [20, 40, 60, 80, 100];
  const gridPaths = levels.map((level) => {
    const points = Array.from({ length: 5 }, (_, i) => getPoint(i, level));
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  const dataPoints = dims.map((d, i) => getPoint(i, d));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-80">
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
      ))}
      {Array.from({ length: 5 }, (_, i) => getPoint(i, 100)).map((point, i) => (
        <line key={i} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
      ))}
      <motion.path
        d={dataPath}
        fill="#845A8F"
        fillOpacity={0.2}
        stroke="#845A8F"
        strokeWidth={1.5}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
      {dataPoints.map((point, i) => (
        <circle key={i} cx={point.x} cy={point.y} r={2.5} fill="#845A8F" />
      ))}
    </svg>
  );
}
