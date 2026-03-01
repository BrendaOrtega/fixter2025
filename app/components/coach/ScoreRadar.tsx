import { useState } from "react";
import { motion } from "motion/react";

const DIMENSIONS = [
  { key: "algorithms", label: "Algoritmos" },
  { key: "syntaxFluency", label: "Sintaxis" },
  { key: "systemDesign", label: "Diseño" },
  { key: "debugging", label: "Debugging" },
  { key: "communication", label: "Comunicación" },
];

interface ScoreRadarProps {
  scores: Record<string, number>;
  size?: number;
  animated?: boolean;
}

export function ScoreRadar({ scores, size = 200, animated = false }: ScoreRadarProps) {
  const [hoveredDim, setHoveredDim] = useState<string | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = [20, 40, 60, 80, 100];
  const angleStep = (2 * Math.PI) / DIMENSIONS.length;

  const allZero = DIMENSIONS.every((d) => (scores[d.key] || 0) === 0);

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  // Grid lines
  const gridPaths = levels.map((level) => {
    const points = DIMENSIONS.map((_, i) => getPoint(i, level));
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  // Axis lines
  const axes = DIMENSIONS.map((_, i) => getPoint(i, 100));

  // Data polygon
  const dataPoints = DIMENSIONS.map((d, i) => getPoint(i, scores[d.key] || 0));
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Labels
  const labelPoints = DIMENSIONS.map((_, i) => getPoint(i, 125));

  // Hover areas
  const hoverPoints = DIMENSIONS.map((_, i) => getPoint(i, 100));

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridPaths.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {axes.map((point, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={point.x}
            y2={point.y}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        {!allZero && (
          animated ? (
            <motion.path
              d={dataPath}
              fill="#CA9B77"
              fillOpacity={0.25}
              stroke="#CA9B77"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, d: dataPath }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ) : (
            <path
              d={dataPath}
              fill="#CA9B77"
              fillOpacity={0.25}
              stroke="#CA9B77"
              strokeWidth={2}
            />
          )
        )}

        {/* Data points */}
        {!allZero &&
          dataPoints.map((point, i) => (
            animated ? (
              <motion.circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="#CA9B77"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              />
            ) : (
              <circle key={i} cx={point.x} cy={point.y} r={3} fill="#CA9B77" />
            )
          ))}

        {/* Labels */}
        {DIMENSIONS.map((dim, i) => (
          <text
            key={dim.key}
            x={labelPoints[i].x}
            y={labelPoints[i].y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`fill-current text-[9px] ${
              hoveredDim === dim.key ? "opacity-100" : "opacity-60"
            } transition-opacity`}
          >
            {dim.label}
          </text>
        ))}

        {/* Invisible hover areas */}
        {DIMENSIONS.map((dim, i) => (
          <circle
            key={`hover-${dim.key}`}
            cx={hoverPoints[i].x}
            cy={hoverPoints[i].y}
            r={size * 0.08}
            fill="transparent"
            onMouseEnter={() => setHoveredDim(dim.key)}
            onMouseLeave={() => setHoveredDim(null)}
            className="cursor-pointer"
          />
        ))}

        {/* Empty state text */}
        {allZero && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-[10px] opacity-40"
          >
            Aún no evaluado
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredDim && !allZero && (
        <div className="absolute top-1 right-1 bg-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 border border-zinc-700 pointer-events-none">
          {DIMENSIONS.find((d) => d.key === hoveredDim)?.label}:{" "}
          <span className="text-[#CA9B77] font-medium">
            {scores[hoveredDim] || 0}/100
          </span>
        </div>
      )}
    </div>
  );
}
