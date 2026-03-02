import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData, Link } from "react-router";
import { motion } from "motion/react";
import { getUserOrNull, getOrCreateAnonId } from "~/.server/dbGetters";
import { getSessionHistory } from "~/.server/services/coach.server";
import { CoachNav } from "~/components/coach/CoachNav";

export const meta: MetaFunction = () => [
  { title: "Historial de sesiones | MentorIA" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);
  const { anonId } = await getOrCreateAnonId(request);
  const userId = user?.id || anonId;

  const sessions = await getSessionHistory(userId);

  return data({
    sessions: sessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      topic: s.topic,
      summary: s.summary,
      scoreDeltas: s.scoreDeltas as Record<string, number> | null,
      selfAssessment: s.selfAssessment,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() || null,
      messageCount: (s.messages as any[])?.length || 0,
    })),
  });
};

export default function CoachHistoryPage() {
  const { sessions } = useLoaderData<typeof loader>();
  const [modeFilter, setModeFilter] = useState<"all" | "programming" | "interview">("all");

  const filtered = modeFilter === "all"
    ? sessions
    : sessions.filter((s) => s.mode === modeFilter);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <CoachNav active="history" />
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Historial
            </span>
          </h1>
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900 p-1">
            {(["all", "programming", "interview"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  modeFilter === m
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m === "all" ? "Todas" : m === "programming" ? "Prog" : "Entrevista"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-zinc-500">
              {sessions.length === 0
                ? "Aún no tienes sesiones. Empieza tu primera!"
                : "No hay sesiones con este filtro."}
            </p>
            <Link
              to="/coach"
              className="inline-block rounded-2xl bg-[#CA9B77] px-8 py-3 text-sm font-semibold text-zinc-900 hover:bg-[#b8895f] transition"
            >
              Nueva sesión
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session, i) => {
              const duration = session.startedAt && session.endedAt
                ? Math.round(
                    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
                  )
                : null;

              const date = new Date(session.startedAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              });

              const deltas = (session.scoreDeltas || {}) as Record<string, number>;
              const avgDelta = Object.values(deltas).length > 0
                ? Math.round(Object.values(deltas).reduce((a, b) => a + b, 0) / Object.values(deltas).length)
                : null;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/coach/result/${session.id}`}
                    className="block rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:bg-zinc-900/60 hover:border-zinc-700 transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          session.mode === "interview"
                            ? "bg-[#845A8F]/10 text-[#845A8F]"
                            : "bg-[#CA9B77]/10 text-[#CA9B77]"
                        }`}>
                          {session.mode === "interview" ? "Entrevista" : "Prog"}
                        </span>
                        <span className="text-xs text-zinc-600">{date}</span>
                        {duration !== null && (
                          <span className="text-xs text-zinc-600">{duration} min</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {avgDelta !== null && avgDelta !== 0 && (
                          <span className={`text-xs font-medium ${
                            avgDelta > 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {avgDelta > 0 ? "+" : ""}{avgDelta}
                          </span>
                        )}
                        {session.selfAssessment && (
                          <span className="text-xs text-zinc-600">
                            Auto: {session.selfAssessment}/5
                          </span>
                        )}
                        <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {session.summary && (
                      <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                        {session.summary}
                      </p>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
