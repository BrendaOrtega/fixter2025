import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { ScoreRadar } from "./ScoreRadar";
import { useFormmyVoice } from "./VoiceButton";
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
  formmyConfig: {
    publishableKey: string;
    agentId: string;
    interviewAgentId?: string;
  };
  isAnonymous?: boolean;
  credits?: { remaining: number; total: number; used: number };
}

type CoachMode = "programming" | "interview";

export function CoachInterface({
  profile,
  formmyConfig,
  isAnonymous,
  credits: initialCredits,
}: CoachInterfaceProps) {
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [credits, setCredits] = useState(initialCredits || { remaining: 0, total: 0, used: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);
  const [scores, setScores] = useState({
    algorithms: profile.algorithms,
    syntaxFluency: profile.syntaxFluency,
    systemDesign: profile.systemDesign,
    debugging: profile.debugging,
    communication: profile.communication,
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("mentoria_onboarded");
  });

  // Use interview-specific agent when in interview mode (if configured)
  const activeAgentId = mode === "interview" && formmyConfig.interviewAgentId
    ? formmyConfig.interviewAgentId
    : formmyConfig.agentId;
  const voiceDisabledForMode = mode === "interview" && !formmyConfig.interviewAgentId;
  const [voiceSystemPrompt, setVoiceSystemPrompt] = useState<string | undefined>();

  const voice = useFormmyVoice({
    agentId: activeAgentId,
    voiceId: "carlos",
    systemPrompt: voiceSystemPrompt,
  });

  // === Voice latency profiling ===
  const voiceDebugRef = useRef({ lastUserSpeech: 0, lastStatus: "", latencies: [] as number[] });
  useEffect(() => {
    const prev = voiceDebugRef.current.lastStatus;
    const now = voice.status;
    if (prev !== now) {
      console.log(`[Voice Latency] status: ${prev} → ${now} @ ${Date.now()}ms`);
      voiceDebugRef.current.lastStatus = now;
    }
  }, [voice.status]);

  const reportLatency = useCallback((latencyMs: number) => {
    voiceDebugRef.current.latencies.push(latencyMs);
    if (voiceDebugRef.current.latencies.length % 5 === 0) {
      const batch = [...voiceDebugRef.current.latencies];
      const avg = Math.round(batch.reduce((a, b) => a + b, 0) / batch.length);
      const max = Math.max(...batch);
      const min = Math.min(...batch);
      const p90 = batch.sort((a, b) => a - b)[Math.floor(batch.length * 0.9)] || max;
      console.log(`[Voice Latency] Report: avg=${avg}ms, p90=${p90}ms, min=${min}ms, max=${max}ms (n=${batch.length})`);
      fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "voice_latency_report",
          sessionId,
          metrics: { avg, p90, min, max, count: batch.length, samples: batch.slice(-10) },
        }),
      }).catch(() => {});
    }
  }, [sessionId]);

  useEffect(() => {
    if (voice.transcripts.length > 0) {
      const latest = voice.transcripts[voice.transcripts.length - 1];
      const now = Date.now();
      if (latest.role === "user" && latest.isFinal) {
        voiceDebugRef.current.lastUserSpeech = now;
      }
      if (latest.role === "assistant" && latest.isFinal) {
        const waited = voiceDebugRef.current.lastUserSpeech
          ? now - voiceDebugRef.current.lastUserSpeech
          : 0;
        if (waited > 0) reportLatency(waited);
      }
    }
  }, [voice.transcripts, reportLatency]);

  // Sync final transcripts into chat messages
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

  // Auto-connect voice when session starts
  const voiceInitialized = useRef(false);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    const v = voiceRef.current;
    if (sessionId && !voiceInitialized.current && v.status === "idle" && !voiceDisabledForMode) {
      voiceInitialized.current = true;
      v.start().catch((err) => {
        console.warn("[MentorIA Voice] auto-connect failed:", err?.message || err);
      });
    }
    if (!sessionId && voiceInitialized.current) {
      voiceInitialized.current = false;
      if (v.status !== "idle") {
        v.stop();
      }
    }
  }, [sessionId, voiceDisabledForMode]);

  // Release mic on unmount (SPA navigation)
  useEffect(() => {
    return () => {
      if (voice.status !== "idle") {
        voice.stop();
      }
    };
  }, []);

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceActive = voice.status !== "idle" && voice.status !== "error";
  const isAgentSpeaking = voice.status === "speaking";

  useEffect(() => {
    if (voice.error) setVoiceError(voice.error.message);
  }, [voice.error]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 150;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Error al iniciar modo voz.");
      } finally {
        clearTimeout(timeout);
      }
    }
  };

  const [showProfileCapture, setShowProfileCapture] = useState(false);
  const [pendingMode, setPendingMode] = useState<CoachMode | null>(null);

  // === Analytics event tracking ===
  const trackEvent = useCallback((event: string, metadata?: Record<string, unknown>) => {
    fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "track_event",
        event,
        sessionId,
        metadata,
      }),
    }).catch(() => {});
  }, [sessionId]);

  // === Select mode → optionally capture profile, then create session ===
  const handleSelectMode = async (selectedMode: CoachMode) => {
    trackEvent("mode_selected", { mode: selectedMode });
    // For interview mode, show profile capture first
    if (selectedMode === "interview") {
      setPendingMode(selectedMode);
      setShowProfileCapture(true);
      return;
    }
    await createSession(selectedMode);
  };

  const createSession = async (selectedMode: CoachMode) => {
    setMode(selectedMode);
    setShowProfileCapture(false);
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_session", mode: selectedMode }),
      });
      const data = await res.json();

      if (res.status === 403 && data.error === "daily_limit") {
        setDailyLimitHit(true);
        return;
      }
      if (res.status === 402) {
        setShowPurchase(true);
        return;
      }

      if (data.success) {
        setSessionId(data.data.sessionId);
        setVoiceSystemPrompt(data.data.systemPrompt);
        setMessages([]);
        setEndedSessionId(null);
        trackEvent("session_started", { mode: selectedMode, sessionId: data.data.sessionId });
      }
    } catch (err) {
      console.error("Error creating session:", err);
    } finally {
      setLoading(false);
    }
  };

  const [closing, setClosing] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [pendingEndSessionId, setPendingEndSessionId] = useState<string | null>(null);

  // === End session: show self-assessment first, then close ===
  const handleEndSession = async () => {
    if (!sessionId || closing) return;

    if (voice.status !== "idle") {
      voice.stop();
    }
    voiceInitialized.current = false;

    setPendingEndSessionId(sessionId);
    setShowSelfAssessment(true);
  };

  const handleSelfAssessmentSubmit = async (rating: number | null) => {
    const sid = pendingEndSessionId;
    if (!sid) return;

    setShowSelfAssessment(false);
    setClosing(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "close_session",
          sessionId: sid,
          messages,
          selfAssessment: rating,
        }),
      });
      const data = await res.json();
      if (data.credits) {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error("Error closing session:", err);
    } finally {
      setClosing(false);
    }

    trackEvent("session_completed", { sessionId: sid, messageCount: messages.length, selfAssessment: rating });
    setSessionId(null);
    setEndedSessionId(sid);
    setPendingEndSessionId(null);
  };

  // Send text to Formmy voice agent
  const sendText = (text: string) => {
    if (!text.trim() || !sessionId) return;
    voice.sendText(text);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ]);
    setInput("");
  };

  const allScoresZero = Object.values(scores).every((s) => s === 0);

  // === DAILY LIMIT REACHED ===
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

  // === ONBOARDING ===
  if (!sessionId && showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem("mentoria_onboarded", "1");
          setShowOnboarding(false);
        }}
        onSkip={() => {
          localStorage.setItem("mentoria_onboarded", "1");
          setShowOnboarding(false);
        }}
      />
    );
  }

  // === PROFILE CAPTURE (interview mode) ===
  if (showProfileCapture && pendingMode === "interview") {
    return (
      <ProfileCapture
        onSubmit={async (profileData) => {
          // Save profile data
          await fetch("/api/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: "update_profile",
              mode: "interview",
              ...profileData,
            }),
          }).catch(() => {});
          await createSession("interview");
        }}
        onSkip={() => createSession("interview")}
      />
    );
  }

  // === MODE SELECTION → starts session immediately ===
  if (!sessionId && !loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#CA9B77]/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl w-full space-y-16 text-center relative z-10"
        >
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
              className="text-lg text-zinc-500 max-w-md mx-auto leading-relaxed"
            >
              Tu coach de voz para programación y entrevistas técnicas.
            </motion.p>
          </div>

          {!isAnonymous && credits.total > 0 && (
            <p className="text-xs text-zinc-600">
              {credits.remaining}/{credits.total} sesiones
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectMode("programming")}
              disabled={loading}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm p-6 sm:p-8 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50 disabled:pointer-events-none"
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
              onClick={() => handleSelectMode("interview")}
              disabled={loading}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm p-6 sm:p-8 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50 disabled:pointer-events-none"
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
                Prepárate para tu próxima entrevista técnica
              </p>
            </motion.button>
          </div>

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

  // === LOADING (creating session) ===
  if (!sessionId && loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], filter: ["blur(8px)", "blur(0px)", "blur(8px)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl font-bold bg-gradient-to-r from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent"
        >
          MentorIA
        </motion.div>
        <p className="text-base text-zinc-400">Conectando...</p>
      </div>
    );
  }

  // === SELF ASSESSMENT MODAL ===
  if (showSelfAssessment) {
    return (
      <SelfAssessmentModal
        onSubmit={handleSelfAssessmentSubmit}
        onSkip={() => handleSelfAssessmentSubmit(null)}
      />
    );
  }

  // === ACTIVE SESSION: Voice chat ===
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Banner de construcción */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center shrink-0">
        <p className="text-xs text-amber-400">
          🚧 MentorIA está en construcción — puede comportarse raro o fallar.
          Estamos mejorándolo.
        </p>
      </div>
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">MentorIA</span>
          {mode && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {mode === "interview" ? "Entrevista" : "Programación"}
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
        </div>
        <div className="flex items-center gap-2">
          {!isAnonymous && credits.total > 0 && (
            <span className="text-xs text-zinc-500 px-2">
              {credits.remaining} sesiones
            </span>
          )}
          <button
            onClick={handleEndSession}
            disabled={closing}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {closing ? "Cerrando..." : "Terminar"}
          </button>
        </div>
      </div>

      {isAnonymous && (
        <div className="border-b border-[#CA9B77]/10 bg-[#CA9B77]/5 px-4 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-zinc-400">
            <span className="text-[#CA9B77]">Sesión de prueba</span> — Inicia sesión para más sesiones
          </p>
          <a href="/login" className="text-xs font-medium text-[#CA9B77] hover:underline">
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
            {messages.length === 0 && voiceActive && (
              <div className="flex items-center justify-center h-full">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-zinc-600 text-center"
                >
                  Habla con tu mentor — te escucha en tiempo real
                </motion.p>
              </div>
            )}
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
                      : "bg-zinc-800 text-zinc-200 prose prose-invert prose-sm max-w-none"
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
            {endedSessionId && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center py-4"
              >
                <Link
                  to={`/coach/result/${endedSessionId}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#CA9B77] to-[#845A8F] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Ver tu scorecard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
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
            <div className="flex items-center gap-3">
              {!voiceDisabledForMode && (
                <button
                  onClick={handleVoiceToggle}
                  className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
                    voiceActive
                      ? isAgentSpeaking
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
                  {isAgentSpeaking && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendText(input)
                }
                disabled={!voiceActive}
                aria-label="Escribe tu respuesta"
                placeholder={voiceActive ? "Habla o escribe aquí..." : "Inicia una sesión para chatear"}
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#CA9B77] disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {input.trim() && (
                <button
                  onClick={() => sendText(input)}
                  className="shrink-0 rounded-xl bg-[#CA9B77] px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-[#b8895f] transition"
                >
                  Enviar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel — radar only */}
        <div className="w-72 shrink-0 border-l border-zinc-800 overflow-y-auto p-4 space-y-4 hidden lg:block">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Progreso
            </h3>
            <ScoreRadar scores={scores} size={220} animated />
          </div>
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

function Onboarding({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [micStatus, setMicStatus] = useState<"unknown" | "granted" | "denied" | "requesting">("unknown");

  useEffect(() => {
    navigator.permissions?.query({ name: "microphone" as PermissionName }).then((result) => {
      if (result.state === "granted") setMicStatus("granted");
      else if (result.state === "denied") setMicStatus("denied");
    }).catch(() => {});
  }, []);

  const requestMic = async () => {
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
      setTimeout(() => setStep(2), 500);
    } catch {
      setMicStatus("denied");
    }
  };

  const totalSteps = 3;
  const effectiveStep = step === 1 && micStatus === "granted" ? 2 : step;

  const stepContent = [
    {
      icon: (
        <svg className="w-12 h-12 text-[#CA9B77]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      title: "MentorIA es tu coach de voz",
      desc: "Vas a hablar como en una sesión real de mentoría. El agente te escucha, te reta y se adapta a tu nivel.",
    },
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#CA9B77]/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-[#CA9B77]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
      ),
      title: "Necesitamos tu micrófono",
      desc: micStatus === "denied"
        ? "El micrófono está bloqueado. Ve a la configuración de tu navegador para habilitarlo."
        : "Para que la conversación fluya en tiempo real, necesitamos acceso al micrófono.",
    },
    {
      icon: (
        <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Listo, elige tu modo",
      desc: "Selecciona entre programación o entrevistas. Tu coach se adapta a cada modo.",
    },
  ];

  const current = stepContent[effectiveStep];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#CA9B77]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md w-full space-y-10 text-center relative z-10"
      >
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= effectiveStep ? "w-8 bg-[#CA9B77]" : "w-4 bg-zinc-800"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex justify-center">{current.icon}</div>
            <h2 className="text-2xl font-bold text-zinc-100">{current.title}</h2>
            <p className="text-zinc-500 leading-relaxed">{current.desc}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col items-center gap-3">
          {effectiveStep === 1 ? (
            <>
              {micStatus === "denied" ? (
                <button
                  onClick={() => setStep(2)}
                  className="rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition"
                >
                  Continuar sin micrófono
                </button>
              ) : (
                <button
                  onClick={requestMic}
                  disabled={micStatus === "requesting"}
                  className="rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition disabled:opacity-50"
                >
                  {micStatus === "requesting" ? "Solicitando..." : "Permitir micrófono"}
                </button>
              )}
            </>
          ) : effectiveStep === 2 ? (
            <button
              onClick={onComplete}
              className="rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition"
            >
              Empezar
            </button>
          ) : (
            <button
              onClick={() => setStep(1)}
              className="rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition"
            >
              Siguiente
            </button>
          )}

          <button
            onClick={onSkip}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition"
          >
            Saltar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SelfAssessmentModal({
  onSubmit,
  onSkip,
}: {
  onSubmit: (rating: number) => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            ¿Cómo sientes que te fue?
          </h2>
          <p className="text-sm text-zinc-500">
            Tu auto-evaluación se compara con el scoring del coach
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`w-14 h-14 rounded-2xl text-lg font-semibold transition-all ${
                selected === n
                  ? "bg-[#CA9B77] text-zinc-900 scale-110"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-600 px-2">
          <span>Necesito mejorar</span>
          <span>Excelente</span>
        </div>

        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
            className="rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition disabled:opacity-30 disabled:pointer-events-none"
          >
            Enviar
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition"
          >
            Saltar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileCapture({
  onSubmit,
  onSkip,
}: {
  onSubmit: (data: { targetRole?: string; seniority?: string }) => void;
  onSkip: () => void;
}) {
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            Preparemos tu sesión
          </h2>
          <p className="text-sm text-zinc-500">
            Esto ayuda al coach a hacer preguntas relevantes para ti
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm text-zinc-400">
              ¿Para qué rol te preparas?
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-[#CA9B77]"
            >
              <option value="">Selecciona...</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="fullstack">Full Stack</option>
              <option value="mobile">Mobile</option>
              <option value="devops">DevOps / SRE</option>
              <option value="data">Data / ML Engineer</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-zinc-400">
              ¿Qué nivel buscas?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["junior", "mid", "senior"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSeniority(level)}
                  className={`rounded-xl py-3 text-sm font-medium transition-all ${
                    seniority === level
                      ? "bg-[#CA9B77] text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            onClick={() => onSubmit({
              ...(targetRole ? { targetRole } : {}),
              ...(seniority ? { seniority } : {}),
            })}
            className="w-full rounded-2xl bg-[#CA9B77] px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition"
          >
            Empezar sesión
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition"
          >
            Saltar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
