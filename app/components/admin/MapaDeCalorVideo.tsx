/**
 * El mapa de calor de una grabación: cuánta gente seguía viendo en cada tramo
 * y cuánta lo repitió.
 *
 * Se lee de un vistazo: donde el área cae, ahí se fueron; donde asoma la banda
 * ámbar, ahí rebobinaron. Lo primero dice qué recortar del siguiente webinar;
 * lo segundo, qué tramo merece un short.
 *
 * SVG a mano y no una librería de gráficas: son dos series sobre un eje de
 * tiempo, y meter una dependencia de 100 KB para dibujar dos polígonos sería
 * pagar de más.
 */

type Props = {
  audiencia: number[];
  repeticiones: number[];
  personas: number;
  bucketSize: number;
};

const reloj = (segundos: number) => {
  const m = Math.floor(segundos / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}` : `${m} min`;
};

const W = 1000;
const H = 160;

export const MapaDeCalorVideo = ({
  audiencia,
  repeticiones,
  personas,
  bucketSize,
}: Props) => {
  const tramos = audiencia.length;
  if (!tramos || !personas) return null;

  const x = (i: number) => (i / Math.max(1, tramos - 1)) * W;
  const y = (v: number) => H - (v / personas) * H;

  // El área de audiencia se cierra contra la base para poder rellenarla.
  const area =
    `M 0 ${H} ` +
    audiencia.map((v, i) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ") +
    ` L ${W} ${H} Z`;

  const linea = audiencia
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  const duracion = tramos * bucketSize;
  // Una marca cada cuarto: más que eso satura y menos no ubica.
  const marcas = [0, 0.25, 0.5, 0.75, 1];

  const picoRepeticion = Math.max(...repeticiones, 0);

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs uppercase tracking-wide text-gray-500">
          Quién seguía viendo
        </h4>
        {picoRepeticion > 0 && (
          <span className="text-xs text-amber-300/80">
            ▨ tramos repetidos
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-28"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Retención de ${personas} personas a lo largo de ${reloj(duracion)}`}
      >
        <defs>
          <linearGradient id="calor-audiencia" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* mitad de la audiencia, para leer la caída sin contar cuadros */}
        <line
          x1="0"
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="4 6"
        />

        <path d={area} fill="url(#calor-audiencia)" />
        <path d={linea} fill="none" stroke="#a855f7" strokeWidth="2" />

        {/* los repetidos van como marcas de suelo: no compiten con la curva */}
        {repeticiones.map((r, i) =>
          r > 0 ? (
            <rect
              key={i}
              x={x(i)}
              y={H - 8 - (r / personas) * 26}
              width={Math.max(2, W / tramos - 1)}
              height={8 + (r / personas) * 26}
              fill="#f59e0b"
              opacity={0.25 + (r / personas) * 0.6}
            />
          ) : null,
        )}
      </svg>

      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
        {marcas.map((m) => (
          <span key={m}>{reloj(duracion * m)}</span>
        ))}
      </div>
    </div>
  );
};
