import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData, Link } from "react-router";
import { motion } from "motion/react";
import { getSessionScorecard } from "~/.server/services/coach.server";
import { ScoreRadar } from "~/components/coach/ScoreRadar";

export const meta: MetaFunction<typeof loader> = ({ data: loaderData }) => {
  if (!loaderData?.scorecard) {
    return [{ title: "Sesión no encontrada | MentorIA" }];
  }
  const sc = loaderData.scorecard;
  const modeLabel = sc.mode === "interview" ? "Entrevista" : "Programación";
  return [
    { title: `Scorecard — ${modeLabel} | MentorIA` },
    { name: "description", content: sc.summary?.slice(0, 155) || "Resultados de tu sesión de coaching con MentorIA" },
    { property: "og:title", content: `MentorIA Scorecard — ${modeLabel}` },
    { property: "og:description", content: sc.summary?.slice(0, 155) || "Resultados de coaching con IA" },
  ];
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { sessionId } = params;
  if (!sessionId) throw new Response("Not found", { status: 404 });

  const scorecard = await getSessionScorecard(sessionId);
  if (!scorecard) throw new Response("Not found", { status: 404 });

  return data({ scorecard });
};

const PROGRAMMING_DIMS = [
  { key: "algorithms", label: "Algoritmos", icon: "🧮" },
  { key: "syntaxFluency", label: "Sintaxis", icon: "⌨️" },
  { key: "systemDesign", label: "Diseño de Sistemas", icon: "🏗️" },
  { key: "debugging", label: "Debugging", icon: "🐛" },
  { key: "communication", label: "Comunicación", icon: "💬" },
];

const INTERVIEW_DIMS = [
  { key: "substance", label: "Substance", icon: "📊" },
  { key: "structure", label: "Structure", icon: "🧱" },
  { key: "relevance", label: "Relevance", icon: "🎯" },
  { key: "credibility", label: "Credibility", icon: "✅" },
  { key: "differentiation", label: "Differentiation", icon: "⭐" },
];

export default function ScorecardPage() {
  const { scorecard } = useLoaderData<typeof loader>();
  const isInterview = scorecard.mode === "interview";
  const dims = isInterview ? INTERVIEW_DIMS : PROGRAMMING_DIMS;
  const deltas = (scorecard.scoreDeltas || {}) as Record<string, number>;
  const scores = scorecard.scores as unknown as Record<string, number>;

  const duration = scorecard.startedAt && scorecard.endedAt
    ? Math.round(
        (new Date(scorecard.endedAt).getTime() - new Date(scorecard.startedAt).getTime()) / 60000
      )
    : null;

  const date = scorecard.endedAt
    ? new Date(scorecard.endedAt).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isInterview
                ? "bg-[#845A8F]/10 text-[#845A8F] border border-[#845A8F]/20"
                : "bg-[#CA9B77]/10 text-[#CA9B77] border border-[#CA9B77]/20"
            }`}>
              {isInterview ? "Entrevista" : "Programación"}
            </span>
            {scorecard.topic && (
              <span className="text-zinc-600">· {scorecard.topic}</span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">Tu </span>
            <span className="bg-gradient-to-b from-[#CA9B77] to-[#845A8F] bg-clip-text text-transparent">Scorecard</span>
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
            {date && <span>{date}</span>}
            {duration !== null && <span>{duration} min</span>}
            {scorecard.messageCount > 0 && (
              <span>{scorecard.messageCount} mensajes</span>
            )}
          </div>
        </motion.div>

        {/* Radar chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          {isInterview ? (
            <InterviewRadar scores={scores} />
          ) : (
            <ScoreRadar scores={scores} size={260} animated />
          )}
        </motion.div>

        {/* Dimension deltas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 gap-3"
        >
          {dims.map((dim, i) => {
            const score = scores[dim.key] || 0;
            const delta = deltas[dim.key] || 0;
            const maxScore = isInterview ? 5 : 100;
            const pct = (score / maxScore) * 100;

            return (
              <motion.div
                key={dim.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="flex items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
              >
                <span className="text-lg">{dim.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{dim.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">
                        {score}{isInterview ? "/5" : "/100"}
                      </span>
                      {delta !== 0 && (
                        <span className={`text-xs font-medium ${
                          delta > 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        isInterview
                          ? "bg-gradient-to-r from-[#845A8F] to-[#CA9B77]"
                          : "bg-gradient-to-r from-[#CA9B77] to-[#845A8F]"
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* AI Summary */}
        {scorecard.summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-3"
          >
            <h2 className="text-sm text-zinc-500 uppercase tracking-wider">
              Resumen de la sesión
            </h2>
            <p className="text-base text-zinc-300 leading-relaxed whitespace-pre-line">
              {scorecard.summary}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
        >
          <Link
            to="/coach"
            className="rounded-2xl bg-gradient-to-r from-[#CA9B77] to-[#845A8F] px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Nueva sesión
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "Mi Scorecard — MentorIA",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="rounded-2xl border border-zinc-700 px-8 py-3.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition"
          >
            Compartir
          </button>
        </motion.div>

        {/* Branding */}
        <p className="text-center text-xs text-zinc-700">
          MentorIA por FixterGeek
        </p>
      </div>
    </div>
  );
}

/** Simple radar for interview dims (5-point scale) */
function InterviewRadar({ scores }: { scores: Record<string, number> }) {
  // Reuse ScoreRadar but scale 1-5 → 0-100
  const scaled: Record<string, number> = {};
  for (const dim of INTERVIEW_DIMS) {
    scaled[dim.key] = ((scores[dim.key] || 0) / 5) * 100;
  }

  return (
    <div className="relative">
      <InterviewRadarSVG scores={scores} size={260} />
    </div>
  );
}

function InterviewRadarSVG({ scores, size = 260 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = [1, 2, 3, 4, 5];
  const dims = INTERVIEW_DIMS;
  const angleStep = (2 * Math.PI) / dims.length;

  const getPoint = (index: number, value: number, maxVal: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const dist = (value / maxVal) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const gridPaths = levels.map((level) => {
    const points = dims.map((_, i) => getPoint(i, level, 5));
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  const axes = dims.map((_, i) => getPoint(i, 5, 5));
  const dataPoints = dims.map((d, i) => getPoint(i, scores[d.key] || 0, 5));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const labelPoints = dims.map((_, i) => getPoint(i, 6.2, 5));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
      ))}
      {axes.map((point, i) => (
        <line key={i} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
      ))}
      <motion.path
        d={dataPath}
        fill="#845A8F"
        fillOpacity={0.25}
        stroke="#845A8F"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1, d: dataPath }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {dataPoints.map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={3}
          fill="#845A8F"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
        />
      ))}
      {dims.map((dim, i) => (
        <text
          key={dim.key}
          x={labelPoints[i].x}
          y={labelPoints[i].y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-current text-[9px] opacity-60"
        >
          {dim.label}
        </text>
      ))}
    </svg>
  );
}
