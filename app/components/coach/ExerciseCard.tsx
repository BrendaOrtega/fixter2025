import { useState } from "react";

interface ExerciseCardProps {
  exercise: {
    prompt: string;
    difficulty: number;
    dimension: string;
    hints: string[];
    topic: string;
  } | null;
}

const DIMENSION_LABELS: Record<string, string> = {
  algorithms: "Algoritmos",
  syntaxFluency: "Fluidez Sintáctica",
  systemDesign: "Diseño de Sistemas",
  debugging: "Debugging",
  communication: "Comunicación",
};

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const [hintsShown, setHintsShown] = useState(0);

  if (!exercise) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{DIMENSION_LABELS[exercise.dimension] || exercise.dimension}</span>
        <span className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={i < exercise.difficulty ? "text-amber-500" : "text-zinc-700"}
            >
              ●
            </span>
          ))}
        </span>
      </div>

      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
        {exercise.prompt}
      </p>

      {exercise.hints.length > 0 && (
        <div className="space-y-2">
          {exercise.hints.slice(0, hintsShown).map((hint, i) => (
            <div key={i} className="text-xs text-amber-400/70 bg-amber-500/5 rounded-lg px-3 py-2">
              💡 Pista {i + 1}: {hint}
            </div>
          ))}
          {hintsShown < exercise.hints.length && (
            <button
              onClick={() => setHintsShown((h) => h + 1)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Mostrar pista ({hintsShown + 1}/{exercise.hints.length})
            </button>
          )}
        </div>
      )}

      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
        {exercise.topic}
      </div>
    </div>
  );
}
