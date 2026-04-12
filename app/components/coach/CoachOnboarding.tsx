import { useState } from "react";
import { motion } from "motion/react";

type Mode = "programming" | "interview";

interface Props {
  mode: Mode;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  profile: {
    level: string;
    currentTopic: string | null;
    totalSessions: number;
    algorithms: number;
    syntaxFluency: number;
    systemDesign: number;
    debugging: number;
    communication: number;
  };
  onStart: (focus: string) => void;
  onBack: () => void;
}

const CHIPS: Record<Mode, string[]> = {
  programming: ["Debugging", "Arquitectura", "Code review", "Algoritmos", "System design", "No estoy seguro aún"],
  interview: ["FAANG senior", "Startup mid", "Behavioral STAR", "System design", "Negociación", "No estoy seguro aún"],
};

const DIMENSIONS: Record<Mode, string[]> = {
  programming: ["Algoritmos", "Fluidez de sintaxis", "System design", "Debugging", "Comunicación"],
  interview: ["Situación", "Tarea", "Acción", "Resultado", "Comunicación"],
};

const accent = (mode: Mode) => (mode === "programming" ? "#CA9B77" : "#845A8F");

export function CoachOnboarding({ mode, displayName, photoURL, isAnonymous, profile, onStart, onBack }: Props) {
  const [focus, setFocus] = useState<string | null>(null);
  const color = accent(mode);
  const isNew = profile.totalSessions === 0;

  // lowest dimension (programming)
  const dims = { algorithms: profile.algorithms, syntaxFluency: profile.syntaxFluency, systemDesign: profile.systemDesign, debugging: profile.debugging, communication: profile.communication };
  const weakest = Object.entries(dims).sort((a, b) => a[1] - b[1])[0];
  const weakestLabel: Record<string, string> = {
    algorithms: "Algoritmos",
    syntaxFluency: "Sintaxis",
    systemDesign: "System design",
    debugging: "Debugging",
    communication: "Comunicación",
  };

  return (
    <div className="min-h-[80vh] px-6 py-10 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid lg:grid-cols-[1fr_280px] gap-8"
      >
        {/* Main column */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: `${color}1a`, color }}
            >
              M
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-zinc-200">
                {mode === "programming" ? "Coach de programación" : "Coach de entrevistas"}
              </span>
              <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Beta
              </span>
            </div>
            <span className="text-xs text-zinc-600 ml-auto">Powered by Formmy</span>
          </div>

          {/* Greeting */}
          <p className="text-zinc-300 leading-relaxed">
            👋 {isAnonymous ? "Bienvenido" : `Hola${displayName ? `, ${displayName}` : ""}`}. Soy MentorIA, tu coach de voz.
            {isNew
              ? " Es tu primera sesión — en 30 segundos arrancamos."
              : " Revisé tu perfil y te preparé algo específico para hoy — puedes confirmar o ajustar antes de empezar."}
          </p>

          {/* Profile card */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <div className="flex items-start gap-4">
              {photoURL ? (
                <img src={photoURL} alt="" className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
                  {(displayName || "T")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-200">
                  {displayName || (isAnonymous ? "Invitado" : "Tú")}
                </div>
                <div className="text-xs text-zinc-500 mb-4">
                  {mode === "programming" ? "Perfil de programación" : "Perfil de entrevista"}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {mode === "programming" ? (
                    <>
                      <Field label="Nivel" value={profile.level || "—"} />
                      <Field label="Tema actual" value={profile.currentTopic || "No definido"} />
                      <Field label="Área sugerida" value={isNew ? "—" : weakestLabel[weakest[0]]} />
                      <Field label="Sesiones" value={String(profile.totalSessions)} />
                    </>
                  ) : (
                    <>
                      <Field label="Rol objetivo" value="—" />
                      <Field label="Seniority" value="—" />
                      <Field label="Enfoque" value="Behavioral STAR" />
                      <Field label="Sesiones" value={String(profile.totalSessions)} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Focus chips */}
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              ¿En qué quieres enfocarte hoy? <span className="text-zinc-600">Elige uno.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CHIPS[mode].map((chip) => {
                const active = focus === chip;
                return (
                  <button
                    key={chip}
                    onClick={() => setFocus(chip)}
                    className="rounded-full px-4 py-1.5 text-sm transition-all border"
                    style={{
                      background: active ? `${color}26` : "rgba(24,24,27,0.6)",
                      borderColor: active ? color : "rgb(39,39,42)",
                      color: active ? color : "rgb(161,161,170)",
                    }}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => focus && onStart(focus)}
              disabled={!focus}
              className="rounded-2xl px-6 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: color, color: "#18181b" }}
            >
              Empezar sesión
            </button>
            <button
              onClick={onBack}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              ← Cambiar modo
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 h-fit lg:sticky lg:top-24">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Lo que vamos a cubrir</h3>
          <ul className="space-y-2.5 mb-5">
            {DIMENSIONS[mode].map((d) => (
              <li key={d} className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {d}
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-xs text-zinc-600 border-t border-zinc-800 pt-4">
            <p>⏱ Duración ~15 min</p>
            <p>🎙 Puedes interrumpir o cambiar de tema cuando quieras</p>
            <p>🚧 En beta — las respuestas pueden tardar</p>
          </div>
        </aside>
      </motion.div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="text-zinc-300 truncate">{value}</div>
    </div>
  );
}
