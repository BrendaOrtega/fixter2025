import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "react-router";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { ScoreRadar } from "./ScoreRadar";
import { ExerciseCard } from "./ExerciseCard";
import { CodeEditor } from "./CodeEditor";
import { VoiceButton, useFormmyVoice } from "./VoiceButton";
import { SessionPurchase } from "./SessionPurchase";

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
  credits?: { remaining: number; total: number; used: number };
  initialMode?: CoachMode | null;
  initialTopic?: string | null;
  initialRole?: string | null;
  initialSeniority?: string | null;
}

type CoachMode = "programming" | "interview";

const INTERVIEW_ROLES = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Full Stack" },
  { value: "mobile", label: "Mobile" },
  { value: "data", label: "Data / ML" },
  { value: "devops", label: "DevOps / SRE" },
];

const SENIORITY_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
];

const TOPICS = [
  { value: "javascript", label: "JavaScript", icon: "JS", color: "from-yellow-500/20 to-yellow-600/5" },
  { value: "react", label: "React", icon: "Re", color: "from-cyan-500/20 to-cyan-600/5" },
  { value: "node", label: "Node.js", icon: "No", color: "from-green-500/20 to-green-600/5" },
  { value: "python", label: "Python", icon: "Py", color: "from-blue-500/20 to-blue-600/5" },
  { value: "ai-ml", label: "AI / ML", icon: "AI", color: "from-purple-500/20 to-purple-600/5" },
  { value: "system-design", label: "System Design", icon: "SD", color: "from-orange-500/20 to-orange-600/5" },
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

export function CoachInterface({
  profile,
  activeSession,
  exercise,
  lastSession,
  formmyConfig,
  isAnonymous,
  credits: initialCredits,
  initialMode = null,
  initialTopic = null,
  initialRole = null,
  initialSeniority = null,
}: CoachInterfaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<CoachMode | null>(initialMode);
  const [showPurchase, setShowPurchase] = useState(false);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [credits, setCredits] = useState(initialCredits || { remaining: 0, total: 0, used: 0 });
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

  // === DEBUG: Voice latency profiling ===
  const voiceDebugRef = useRef({ lastUserSpeech: 0, lastStatus: "" });
  useEffect(() => {
    const prev = voiceDebugRef.current.lastStatus;
    const now = voice.status;
    if (prev !== now) {
      console.log(`[Voice Latency] status: ${prev} → ${now} @ ${Date.now()}ms (${new Date().toISOString()})`);
      voiceDebugRef.current.lastStatus = now;
    }
  }, [voice.status]);

  useEffect(() => {
    if (voice.transcripts.length > 0) {
      const latest = voice.transcripts[voice.transcripts.length - 1];
      const now = Date.now();
      const tag = latest.isFinal ? "FINAL" : "partial";
      console.log(`[Voice Latency] transcript ${tag} (${latest.role}): "${latest.text.slice(0, 60)}..." @ ${now}ms`);
      if (latest.role === "user" && latest.isFinal) {
        voiceDebugRef.current.lastUserSpeech = now;
        console.log(`[Voice Latency] ⏱ User finished speaking @ ${now}ms — waiting for agent response...`);
      }
      if (latest.role === "assistant") {
        const waited = voiceDebugRef.current.lastUserSpeech
          ? now - voiceDebugRef.current.lastUserSpeech
          : 0;
        console.log(`[Voice Latency] ⏱ Agent response ${tag} arrived — ${waited}ms after user speech`);
      }
    }
  }, [voice.transcripts]);

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

  // Connect voice only when there's an active session
  const voiceInitialized = useRef(false);
  useEffect(() => {
    if (sessionId && !voiceInitialized.current && voice.status === "idle") {
      voiceInitialized.current = true;
      voice.start().catch((err) => {
        console.warn("[MentorIA Voice] auto-connect failed:", err?.message || err);
      });
    }
    if (!sessionId && voiceInitialized.current) {
      voiceInitialized.current = false;
      if (voice.status !== "idle") {
        voice.stop();
      }
    }
    return () => {
      if (voiceInitialized.current) {
        voiceInitialized.current = false;
        if (voice.status !== "idle") {
          voice.stop();
        }
      }
    };
  }, [sessionId]);

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceActive = voice.status !== "idle" && voice.status !== "error";

  // Surface voice SDK errors in our UI
  useEffect(() => {
    if (voice.error) {
      setVoiceError(voice.error.message);
    }
  }, [voice.error]);

  // Sync mode/topic state → URL search params
  const updateURL = useCallback(
    (newMode: CoachMode | null, topic?: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newMode) {
          next.set("mode", newMode);
        } else {
          next.delete("mode");
        }
        if (topic) {
          next.set("topic", topic);
        } else {
          next.delete("topic");
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  // Wrap setMode to also update URL
  const handleSetMode = useCallback(
    (newMode: CoachMode | null) => {
      setMode(newMode);
      updateURL(newMode);
    },
    [updateURL]
  );

  // Auto-start session from URL params (initialTopic)
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || sessionId) return;
    if (initialMode === "interview" && initialRole && initialSeniority) {
      autoStarted.current = true;
      setMode("interview");
      startNewSession(`${initialRole}-${initialSeniority}`, "interview");
    } else if (initialMode === "programming" && initialTopic) {
      autoStarted.current = true;
      setMode("programming");
      startNewSession(initialTopic, "programming");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoiceToggle = async () => {
    console.log("[MentorIA Voice] toggle clicked, status:", voice.status, "active:", voiceActive);
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
        console.log("[MentorIA Voice] start() resolved, status:", voice.status);
      } catch (err) {
        console.error("[MentorIA Voice] start() threw:", err);
        setVoiceError(err instanceof Error ? err.message : "Error al iniciar modo voz.");
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
      const streamIntent = mode === "interview" ? "stream_interview_message" : "stream_message";
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: streamIntent,
          sessionId,
          message: text,
        }),
      });

      if (!res.ok || !res.body) {
        console.error("Stream request failed:", res.status);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error al enviar el mensaje. Intenta de nuevo.", timestamp: new Date().toISOString() },
        ]);
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
        } catch (parseErr) {
          console.warn("[MentorIA] Failed to parse stream metadata:", parseErr);
        }
      }

    } catch (err) {
      console.error("Error sending message:", err);
      setLoading(false);
    }
  };

  const startNewSession = async (topic: string, sessionMode: CoachMode = "programming") => {
    setLoading(true);
    updateURL(sessionMode, topic);
    try {
      const intent = sessionMode === "interview" ? "start_interview_session" : "start_session";
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, topic, mode: sessionMode }),
      });
      const data = await res.json();

      if (res.status === 403 && data.error === "daily_limit") {
        setDailyLimitHit(true);
        setLoading(false);
        return;
      }
      if (res.status === 402) {
        setShowPurchase(true);
        setLoading(false);
        return;
      }

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
        body: JSON.stringify({ intent: mode === "interview" ? "end_interview_session" : "end_session", sessionId }),
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
  // === DAILY LIMIT REACHED (anon, 2/day) ===
  if (dailyLimitHit) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full space-y-10 text-center"
        >
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">
              MentorIA
            </h1>
            <p className="text-xl text-zinc-300">
              Usaste tus 2 sesiones gratuitas de hoy
            </p>
          </div>
          {!allScoresZero && (
            <div className="mx-auto w-56">
              <ScoreRadar scores={scores} size={224} animated />
            </div>
          )}
          <div className="space-y-6">
            <p className="text-zinc-500 text-lg">
              Regresa mañana para más sesiones gratis, o inicia sesión para desbloquear más sesiones.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/login"
                className="inline-block rounded-2xl bg-[#CA9B77] px-10 py-4 text-base font-semibold text-zinc-900 hover:bg-[#b8895f] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // === PURCHASE SCREEN ===
  if (showPurchase) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <SessionPurchase onClose={() => setShowPurchase(false)} />
      </div>
    );
  }

  // === MODE SELECTION (before topic, when no active session) ===
  if (!sessionId && mode === null) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#CA9B77]/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl w-full space-y-16 text-center relative z-10"
        >
          {/* Hero — voice-first identity */}
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-6xl sm:text-8xl font-bold tracking-tight">
                <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">Mentor</span>
                <span className="bg-gradient-to-b from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">IA</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg text-zinc-500 max-w-sm mx-auto"
            >
              Háblale. Te escucha, te reta, y se adapta.
            </motion.p>

            {/* Voice indicator — shows it's a voice product */}
            {voiceActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 text-sm text-emerald-400/70"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Voz conectada
              </motion.div>
            )}
          </div>

          {!isAnonymous && credits.total > 0 && (
            <p className="text-xs text-zinc-600">
              {credits.remaining}/{credits.total} sesiones
            </p>
          )}

          {/* Mode cards — clean, minimal */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSetMode("programming")}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm p-6 sm:p-8 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="w-10 h-10 rounded-xl bg-[#CA9B77]/10 flex items-center justify-center mb-4 group-hover:bg-[#CA9B77]/15 transition">
                <svg className="w-5 h-5 text-[#CA9B77]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
              </div>
              <div className="text-base font-medium text-zinc-200 group-hover:text-white transition">
                Programación
              </div>
              <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                Ejercicios adaptativos, code review, system design
              </p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSetMode("interview")}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm p-6 sm:p-8 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="w-10 h-10 rounded-xl bg-[#845A8F]/10 flex items-center justify-center mb-4 group-hover:bg-[#845A8F]/15 transition">
                <svg className="w-5 h-5 text-[#845A8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <div className="text-base font-medium text-zinc-200 group-hover:text-white transition">
                Entrevistas
              </div>
              <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                Mock interviews, historias STAR, scorecard
              </p>
            </motion.button>
          </div>

          {/* Social proof whisper */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-zinc-700"
          >
            Coaching por voz en tiempo real con IA adaptativa
          </motion.p>

          {isAnonymous && <AnonCTA />}
        </motion.div>
      </div>
    );
  }

  // === INTERVIEW MODE: Role/seniority selection ===
  if (mode === "interview" && !sessionId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <InterviewSetup
          loading={loading}
          onStart={(role, seniority) => startNewSession(`${role}-${seniority}`, "interview")}
          onBack={() => handleSetMode(null)}
          isAnonymous={isAnonymous}
        />
      </div>
    );
  }

  // === TOPIC SELECTION (programming mode — new & returning users) ===
  if (!sessionId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl w-full space-y-10"
        >
          <div className="text-center space-y-4">
            <button
              onClick={() => handleSetMode(null)}
              aria-label="Volver"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition mb-2 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100">
              {isReturningUser ? "Siguiente sesión" : "Elige un tema"}
            </h1>
            <p className="text-lg text-zinc-500">
              {isReturningUser && profile.streak > 1
                ? `Racha de ${profile.streak} sesiones — ${profile.level}`
                : "Tu mentor se adapta a tu nivel en cada sesión"}
            </p>
          </div>

          {isReturningUser && !allScoresZero && (
            <div className="flex justify-center">
              <div className="w-56">
                <ScoreRadar scores={scores} size={224} animated />
              </div>
            </div>
          )}

          {lastSession?.summary && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 max-w-xl mx-auto">
              <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2">
                Última sesión {lastSession.topic ? `· ${lastSession.topic}` : ""}
              </div>
              <p className="text-base text-zinc-400 leading-relaxed">
                {lastSession.summary}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-2 border-[#CA9B77]/30 border-t-[#CA9B77] rounded-full"
              />
              <p className="text-base text-zinc-400">Preparando tu sesión...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {TOPICS.map((t, i) => (
                <motion.button
                  key={t.value}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startNewSession(t.value, "programming")}
                  className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${t.color} px-5 py-6 text-left hover:border-zinc-600 transition-all group`}
                >
                  <span className="text-sm font-mono text-zinc-600 group-hover:text-zinc-400 transition">
                    {t.icon}
                  </span>
                  <div className="text-lg font-medium text-zinc-200 mt-2 group-hover:text-white transition">
                    {t.label}
                  </div>
                </motion.button>
              ))}
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
          {!isAnonymous && credits.total > 0 && (
            <span className="text-xs text-zinc-500 px-2">
              {credits.remaining} sesiones
            </span>
          )}
          {voiceActive && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400" aria-live="polite">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Voz
            </span>
          )}
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

          {/* Input area — voice-first design */}
          <div className="border-t border-zinc-800 p-4 shrink-0">
            {voiceError && !voiceActive && (
              <div className="flex items-center gap-2 px-2 pb-2">
                <span className="text-xs text-red-400">{voiceError}</span>
                <button
                  onClick={handleVoiceToggle}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  Reintentar
                </button>
              </div>
            )}
            {/* Input area — voice + text always available */}
            <div className="flex items-center gap-3">
              {/* Voice button */}
              <button
                onClick={handleVoiceToggle}
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
                  voiceActive
                    ? voice.status === "speaking"
                      ? "bg-emerald-500/20 border-2 border-emerald-500/40"
                      : voice.status === "connecting"
                      ? "bg-amber-500/20 border-2 border-amber-500/40"
                      : "bg-emerald-500/10 border-2 border-emerald-500/30"
                    : "bg-gradient-to-br from-[#CA9B77] to-[#845A8F] hover:scale-105 active:scale-95 shadow-lg shadow-[#CA9B77]/20"
                }`}
                title={voiceActive ? "Desactivar voz" : "Hablar con MentorIA"}
              >
                {voiceActive ? (
                  voice.status === "connecting" ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full"
                    />
                  ) : (
                    <VoiceWaves color="emerald" />
                  )
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
                {/* Pulse ring when speaking */}
                {voice.status === "speaking" && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </button>
              {/* Text input — always available alongside voice */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage(input)
                }
                aria-label="Escribe tu respuesta"
                placeholder={voiceActive ? "Habla o escribe aquí..." : "Escribe aquí..."}
                disabled={loading}
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#CA9B77] disabled:opacity-50"
              />
              {input.trim() && (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading}
                  className="shrink-0 rounded-xl bg-[#CA9B77] px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-[#b8895f] transition disabled:opacity-50"
                >
                  Enviar
                </button>
              )}
            </div>
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
    <div className="rounded-2xl border border-[#CA9B77]/15 bg-gradient-to-r from-[#CA9B77]/5 to-[#845A8F]/5 px-6 py-4 flex items-center justify-between gap-6">
      <p className="text-base text-zinc-400">
        <span className="text-[#CA9B77] font-medium">Sesión de prueba.</span>{" "}
        Inicia sesión para guardar tu progreso y desbloquear más sesiones.
      </p>
      <a
        href="/login"
        className="shrink-0 rounded-xl bg-[#CA9B77] px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Iniciar sesión
      </a>
    </div>
  );
}

function VoiceWaves({ color }: { color: "emerald" | "amber" }) {
  const c = color === "emerald" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1 h-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full ${c}`}
          animate={{ height: ["8px", "20px", "8px"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function InterviewSetup({
  loading,
  onStart,
  onBack,
  isAnonymous,
}: {
  loading: boolean;
  onStart: (role: string, seniority: string) => void;
  onBack: () => void;
  isAnonymous?: boolean;
}) {
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg w-full space-y-8"
    >
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#845A8F] to-[#CA9B77] bg-clip-text text-transparent">
          Coach de Entrevistas
        </h1>
        <p className="text-zinc-400">
          Practica con mock interviews, mejora tus respuestas STAR y recibe scoring en 5 dimensiones.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-500 mb-2 block">Rol objetivo</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERVIEW_ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  role === r.value
                    ? "border-[#845A8F] bg-[#845A8F]/10 text-[#845A8F]"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-zinc-500 mb-2 block">Seniority</label>
          <div className="grid grid-cols-3 gap-2">
            {SENIORITY_LEVELS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSeniority(s.value)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  seniority === s.value
                    ? "border-[#845A8F] bg-[#845A8F]/10 text-[#845A8F]"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#845A8F]/30 border-t-[#845A8F] rounded-full"
          />
          <p className="text-sm text-zinc-400">Preparando tu entrevista...</p>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            Volver
          </button>
          <button
            onClick={() => onStart(role || "fullstack", seniority || "mid")}
            disabled={!role || !seniority}
            className="flex-1 rounded-xl bg-[#845A8F] py-3 text-sm font-medium text-white hover:bg-[#6e4a78] transition disabled:opacity-50"
          >
            Iniciar entrevista
          </button>
        </div>
      )}

      {isAnonymous && <AnonCTA />}
    </motion.div>
  );
}
