import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { ScoreRadar } from "./ScoreRadar";
import { ExerciseCard } from "./ExerciseCard";
import { CodeEditor } from "./CodeEditor";
import { VoiceButton, useFormmyVoice } from "./VoiceButton";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CoachInterfaceProps {
  profile: {
    id: string;
    algorithms: number;
    syntaxFluency: number;
    systemDesign: number;
    debugging: number;
    communication: number;
    level: string;
    streak: number;
    directnessLevel: number;
    currentTopic: string | null;
    totalSessions: number;
  };
  activeSession: {
    id: string;
    phase: string;
    topic: string | null;
    messages: Message[];
    exerciseId: string | null;
  } | null;
  exercise: {
    prompt: string;
    difficulty: number;
    dimension: string;
    hints: string[];
    topic: string;
  } | null;
  lastSession: {
    summary: string | null;
    topic: string | null;
    endedAt: string | null;
  } | null;
  formmyConfig: {
    publishableKey: string;
    agentId: string;
  };
  isAnonymous?: boolean;
}

const TOPICS = [
  { value: "javascript", label: "JavaScript", icon: "JS" },
  { value: "react", label: "React", icon: "Re" },
  { value: "node", label: "Node.js", icon: "No" },
  { value: "python", label: "Python", icon: "Py" },
  { value: "ai-ml", label: "AI / ML", icon: "AI" },
  { value: "system-design", label: "System Design", icon: "SD" },
];

const PHASE_SUGGESTIONS: Record<string, string[]> = {
  KICKOFF: [
    "Evalúa mi nivel desde cero",
    "Ponme un reto directo",
    "Empecemos con algo básico",
    "Quiero algo avanzado",
  ],
  ASSESSMENT: [
    "Creo que es fácil, sube la dificultad",
    "No estoy seguro, dame una pista",
    "Explícame con un ejemplo",
    "Siguiente pregunta",
  ],
  PRACTICE: [
    "Dame una pista",
    "No entiendo el ejercicio",
    "¿Puedo ver un ejemplo similar?",
    "Ya terminé, revisa mi código",
  ],
  REVIEW: [
    "¿Cómo lo puedo mejorar?",
    "Ponme otro ejercicio",
    "Explícame qué hice mal",
    "Quiero seguir practicando",
  ],
  SUMMARY: [
    "¿Qué debería repasar?",
    "Dame un plan de estudio",
    "Quiero otra sesión",
  ],
};

const TOPIC_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  KICKOFF: {
    _default: PHASE_SUGGESTIONS.KICKOFF,
  },
  ASSESSMENT: {
    _default: PHASE_SUGGESTIONS.ASSESSMENT,
  },
  PRACTICE: {
    _default: PHASE_SUGGESTIONS.PRACTICE,
    javascript: [
      "Dame una pista",
      "¿Puedo usar arrow functions aquí?",
      "¿Esto se puede resolver con reduce?",
      "¿Debería usar destructuring?",
      "Ya terminé, revisa mi código",
    ],
    react: [
      "Dame una pista",
      "¿Debería usar useState o useReducer?",
      "¿Esto se resuelve con un useEffect?",
      "¿Necesito un custom hook?",
      "Ya terminé, revisa mi código",
    ],
    node: [
      "Dame una pista",
      "¿Debo usar async/await aquí?",
      "¿Esto se puede hacer con streams?",
      "¿Cómo manejo el error handling?",
      "Ya terminé, revisa mi código",
    ],
    python: [
      "Dame una pista",
      "¿Puedo usar list comprehension?",
      "¿Esto se resuelve con un dict?",
      "¿Debería usar una clase aquí?",
      "Ya terminé, revisa mi código",
    ],
    "ai-ml": [
      "Dame una pista",
      "¿Qué modelo es mejor para esto?",
      "¿Debo normalizar los datos primero?",
      "¿Cómo evalúo el resultado?",
      "Ya terminé, revisa mi código",
    ],
    "system-design": [
      "Dame una pista",
      "¿Cómo escalo este componente?",
      "¿Necesito un load balancer?",
      "¿Qué base de datos me conviene?",
      "Ya terminé, revisa mi código",
    ],
  },
  REVIEW: {
    _default: PHASE_SUGGESTIONS.REVIEW,
  },
  SUMMARY: {
    _default: PHASE_SUGGESTIONS.SUMMARY,
  },
};

const PHASE_LABELS: Record<string, string> = {
  KICKOFF: "Kickoff",
  ASSESSMENT: "Assessment",
  PRACTICE: "Practice",
  REVIEW: "Review",
  SUMMARY: "Summary",
};

const DIMENSIONS = [
  { key: "algorithms", label: "Algoritmos", desc: "Estructuras de datos y complejidad" },
  { key: "syntaxFluency", label: "Fluidez Sintáctica", desc: "Dominio del lenguaje" },
  { key: "systemDesign", label: "Diseño de Sistemas", desc: "Arquitectura y escalabilidad" },
  { key: "debugging", label: "Debugging", desc: "Diagnóstico y troubleshooting" },
  { key: "communication", label: "Comunicación", desc: "Explicar conceptos técnicos" },
];

export function CoachInterface({
  profile,
  activeSession,
  exercise,
  lastSession,
  formmyConfig,
  isAnonymous,
}: CoachInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    (activeSession?.messages as Message[]) || []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(activeSession?.id || null);
  const [currentPhase, setCurrentPhase] = useState(activeSession?.phase || "KICKOFF");
  const [currentExercise, setCurrentExercise] = useState(exercise);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState({
    algorithms: profile.algorithms,
    syntaxFluency: profile.syntaxFluency,
    systemDesign: profile.systemDesign,
    debugging: profile.debugging,
    communication: profile.communication,
  });
  const voice = useFormmyVoice({
    agentId: formmyConfig.agentId,
    voiceId: "carlos",
  });

  // Sync final transcripts into chat messages — track by total length, not filtered
  const lastTranscriptLen = useRef(0);
  useEffect(() => {
    const all = voice.transcripts;
    if (all.length === lastTranscriptLen.current) return;
    const newOnes = all.slice(lastTranscriptLen.current).filter((t) => t.isFinal);
    if (newOnes.length > 0) {
      setMessages((prev) => [
        ...prev,
        ...newOnes.map((t) => ({
          role: t.role as "user" | "assistant",
          content: t.text,
          timestamp: new Date().toISOString(),
        })),
      ]);
    }
    lastTranscriptLen.current = all.length;
  }, [voice.transcripts]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      if (voice.status !== "idle") {
        voice.stop();
      }
    };
  }, []);

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceActive = voice.status !== "idle" && voice.status !== "error";

  const handleVoiceToggle = async () => {
    setVoiceError(null);
    if (voiceActive) {
      voice.stop();
    } else {
      const timeout = setTimeout(() => {
        if (voice.status === "connecting") {
          voice.stop();
          setVoiceError("No se pudo conectar. Intenta de nuevo.");
        }
      }, 10_000);
      try {
        await voice.start();
      } catch {
        setVoiceError("Error al iniciar modo voz.");
      } finally {
        clearTimeout(timeout);
      }
    }
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Smart auto-scroll: only when near bottom
  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !sessionId) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "stream_message",
          sessionId,
          message: text,
        }),
      });

      if (!res.ok || !res.body) {
        console.error("Stream request failed:", res.status);
        setLoading(false);
        return;
      }

      // Add empty assistant message that we'll stream into
      const assistantMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Check for metadata marker
        const metaIdx = fullText.indexOf("\n__META__");
        const displayText = metaIdx >= 0 ? fullText.slice(0, metaIdx) : fullText;

        // Update the last assistant message in place
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], content: displayText };
          }
          return updated;
        });
      }

      // Parse metadata if present
      const metaIdx = fullText.indexOf("\n__META__");
      if (metaIdx >= 0) {
        try {
          const meta = JSON.parse(fullText.slice(metaIdx + 8));
          if (meta.phase) setCurrentPhase(meta.phase);
          if (meta.updatedScores) setScores(meta.updatedScores);
          if (meta.evaluation) {
            const evalMsg: Message = {
              role: "assistant",
              content: `Evaluación (${meta.evaluation.score}/10): ${meta.evaluation.feedback}`,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, evalMsg]);
          }
        } catch {}
      }

    } catch (err) {
      console.error("Error sending message:", err);
      setLoading(false);
    }
  };

  const startNewSession = async (topic: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "start_session", topic }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.data.session.id);
        setCurrentExercise(data.data.exercise);
        setCurrentPhase(data.data.session.phase || "KICKOFF");

        // Messages already include the coach greeting from the server
        const sessionMessages = (data.data.session.messages as Message[]) || [];
        setMessages(sessionMessages);
      }
    } catch (err) {
      console.error("Error starting session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "end_session", sessionId }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Resumen de sesión:\n${data.data.summary}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setSessionId(null);
        setCurrentPhase("SUMMARY");
      }
    } catch (err) {
      console.error("Error ending session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = (code: string) => {
    sendMessage("```\n" + code + "\n```");
  };

  const isNewUser = profile.totalSessions === 0 && !sessionId;
  const isReturningUser = profile.totalSessions > 0 && !sessionId;
  const allScoresZero = Object.values(scores).every((s) => s === 0);

  // === ONBOARDING: New user, no session ===
  if (isNewUser && !sessionId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full space-y-8"
        >
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
              MentorIA
            </h1>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              Tu coach de programación adaptativo. Te hace preguntas, te reta
              con ejercicios, y se adapta a tu nivel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DIMENSIONS.map((dim, i) => (
              <motion.div
                key={dim.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="text-sm font-medium text-zinc-200">{dim.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{dim.desc}</div>
              </motion.div>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-[#CA9B77]/30 border-t-[#CA9B77] rounded-full"
              />
              <p className="text-sm text-zinc-400">Preparando tu sesión...</p>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-zinc-500">Elige un tema para empezar:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOPICS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => startNewSession(t.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 hover:border-[#CA9B77] hover:text-[#CA9B77] transition flex items-center justify-center gap-2"
                  >
                    <span className="text-xs font-mono text-zinc-500">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAnonymous && <AnonCTA />}
        </motion.div>
      </div>
    );
  }

  // === RETURNING USER: Has history, no active session ===
  if (isReturningUser && !sessionId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full space-y-8 text-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">MentorIA</h1>
            <p className="mt-2 text-zinc-400">
              {profile.streak > 1
                ? `Racha de ${profile.streak} sesiones`
                : "Bienvenido de vuelta"}
            </p>
          </div>

          <div className="mx-auto w-56">
            <ScoreRadar scores={scores} size={224} />
          </div>

          <div className="text-xs text-zinc-500">
            {profile.level} · {profile.totalSessions} sesiones
          </div>

          {lastSession?.summary && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Última sesión {lastSession.topic ? `· ${lastSession.topic}` : ""}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {lastSession.summary}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-[#CA9B77]/30 border-t-[#CA9B77] rounded-full"
              />
              <p className="text-sm text-zinc-400">Preparando tu sesión...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">Elige un tema:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOPICS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => startNewSession(t.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 hover:border-[#CA9B77] hover:text-[#CA9B77] transition flex items-center justify-center gap-2"
                  >
                    <span className="text-xs font-mono text-zinc-500">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAnonymous && <AnonCTA />}
        </motion.div>
      </div>
    );
  }

  // === ACTIVE SESSION: Chat interface ===
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header with phase indicator */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">MentorIA</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPhase}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs px-2 py-0.5 rounded-full bg-[#CA9B77]/10 text-[#CA9B77] border border-[#CA9B77]/20"
            >
              {PHASE_LABELS[currentPhase] || currentPhase}
            </motion.span>
          </AnimatePresence>
          {activeSession?.topic && (
            <span className="text-xs text-zinc-600">{activeSession.topic}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <VoiceButton status={voice.status} onToggle={handleVoiceToggle} />
          <button
            onClick={handleEndSession}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition disabled:opacity-50"
          >
            Terminar
          </button>
        </div>
      </div>

      {isAnonymous && (
        <div className="border-b border-[#CA9B77]/10 bg-[#CA9B77]/5 px-4 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-zinc-400">
            <span className="text-[#CA9B77]">Sesión de prueba</span> — Inicia sesión para más sesiones
          </p>
          <a
            href="/login"
            className="text-xs font-medium text-[#CA9B77] hover:underline"
          >
            Iniciar sesión
          </a>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 p-4"
          >
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#CA9B77] text-zinc-900 whitespace-pre-wrap"
                      : "bg-zinc-800 text-zinc-200 prose prose-invert prose-lg max-w-none [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1 [&_ol]:my-1"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Streamdown plugins={{ code }} shikiTheme={["dracula", "dracula"]}>{msg.content}</Streamdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
            {/* Quick reply suggestions — always show when last message is from assistant */}
            {(() => {
              if (loading || messages.length === 0 || messages[messages.length - 1].role !== "assistant") return null;
              const topic = activeSession?.topic || currentExercise?.topic || "";
              const phaseMap = TOPIC_SUGGESTIONS[currentPhase] || TOPIC_SUGGESTIONS.KICKOFF;
              const raw = phaseMap[topic] || phaseMap._default || PHASE_SUGGESTIONS[currentPhase] || PHASE_SUGGESTIONS.KICKOFF;
              const filtered = raw.filter((s) => !usedSuggestions.has(s));
              if (filtered.length === 0) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 px-2"
                >
                  {filtered.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setUsedSuggestions((prev) => new Set(prev).add(suggestion));
                        sendMessage(suggestion);
                      }}
                      className="text-sm px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#CA9B77] hover:text-[#CA9B77] transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              );
            })()}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-4 py-3 text-base text-zinc-400">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Pensando...
                  </motion.span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-zinc-800 p-4 shrink-0">
            {voiceError && !voiceActive ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <span className="text-sm text-red-400">{voiceError}</span>
              </div>
          ) : voiceActive ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${voice.status === "connecting" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${voice.status === "connecting" ? "bg-amber-500" : "bg-emerald-500"}`} />
                </span>
                <span className="text-sm text-zinc-400">
                  {voice.status === "connecting"
                    ? "Conectando micrófono..."
                    : voice.status === "speaking"
                    ? "MentorIA está hablando — puedes interrumpir"
                    : "Modo voz activo — habla cuando quieras"}
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <MicButton
                  onTranscript={(text) => setInput((prev) => prev + text)}
                />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage(input)
                  }
                  placeholder="Escribe tu respuesta..."
                  disabled={loading}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#CA9B77] disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-[#CA9B77] px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-[#b8895f] transition disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-zinc-800 overflow-y-auto p-4 space-y-4 hidden lg:block">
          {/* Radar */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Progreso
            </h3>
            <ScoreRadar scores={scores} size={220} animated />
          </div>

          {/* Exercise card */}
          <ExerciseCard exercise={currentExercise} />

          {/* Code editor - only in PRACTICE phase */}
          {currentPhase === "PRACTICE" && (
            <CodeEditor
              onSubmit={handleCodeSubmit}
              language={currentExercise?.topic || "javascript"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===

function AnonCTA() {
  return (
    <div className="rounded-xl border border-[#CA9B77]/20 bg-[#CA9B77]/5 px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-zinc-400">
        <span className="text-[#CA9B77] font-medium">Sesión de prueba.</span>{" "}
        Inicia sesión para guardar tu progreso y desbloquear más sesiones.
      </p>
      <a
        href="/login"
        className="shrink-0 rounded-lg bg-[#CA9B77] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-[#b8895f] transition"
      >
        Iniciar sesión
      </a>
    </div>
  );
}

function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // Check if speech recognition is available
  const isAvailable =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!isAvailable) return null;

  return (
    <button
      onClick={toggleListening}
      className={`rounded-xl px-3 py-3 transition ${
        listening
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
      }`}
      title={listening ? "Detener" : "Hablar"}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    </button>
  );
}

function clamp(val: number) {
  return Math.max(0, Math.min(100, val));
}
