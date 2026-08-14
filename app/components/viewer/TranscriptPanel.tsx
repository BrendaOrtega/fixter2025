import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "~/utils/cn";

/**
 * La transcripción como panel de navegación, no como muro de texto.
 *
 * Tres cosas la hacen útil y las tres son necesarias juntas: se puede hacer clic para
 * saltar, la línea que suena va marcada, y se puede buscar. Sin la primera es un
 * documento; sin la segunda te pierdes en cuanto miras el video; sin la tercera, en una
 * hora de charla no encuentras nada.
 *
 * La búsqueda cruza TODO el curso, no sólo este video: es lo que más piden los alumnos,
 * porque nadie recuerda en qué módulo se explicó algo.
 */

export type Segmento = { s: number; e: number; quien: string | null; texto: string };
export type Capitulo = { s: number; titulo: string };

type Resultado = {
  videoSlug: string;
  videoTitle: string;
  s: number;
  fragmento: string;
};

type Props = {
  segments: Segmento[];
  chapters?: Capitulo[];
  /** Segundo en curso, que llega del player. */
  currentTime: number;
  onSeek: (segundo: number) => void;
  courseId?: string;
  courseSlug: string;
  videoSlug: string;
};

const reloj = (segundos: number) => {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const dd = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${dd(m)}:${dd(s)}` : `${m}:${dd(s)}`;
};

/**
 * Parte el texto por el término para poder marcarlo. Un párrafo entero resaltado no dice
 * DÓNDE está la palabra, que es justo lo que se estaba buscando.
 */
const resaltar = (texto: string, q: string) => {
  const t = q.trim();
  if (!t) return texto;
  // Literal, no regex del usuario: buscar "¿qué?" con los especiales sin escapar revienta.
  const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return texto.split(re).map((trozo, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-brand-500/30 px-0.5 text-white">
        {trozo}
      </mark>
    ) : (
      <span key={i}>{trozo}</span>
    )
  );
};

export const TranscriptPanel = ({
  segments: segmentsProp,
  chapters: chaptersProp,
  currentTime,
  onSeek,
  courseId,
  courseSlug,
  videoSlug,
}: Props) => {
  // Los valores por omisión de los parámetros solo cubren `undefined`. Una
  // transcripción recién ingestada llega con `chapters: null` —los capítulos se
  // generan después— y un null explícito se colaba hasta reventar en `.length`.
  const segments = segmentsProp ?? [];
  const chapters = chaptersProp ?? [];
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mostrarCapitulos, setMostrarCapitulos] = useState(true);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const activoRef = useRef<HTMLButtonElement>(null);
  // Si el usuario está leyendo más adelante, el auto-scroll lo devolvería al segundo en
  // curso cada vez que avanza el video: imposible leer. Se apaga al desplazar a mano y
  // vuelve con el botón.
  const [seguirVideo, setSeguirVideo] = useState(true);

  const indiceActivo = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].s) return i;
    }
    return -1;
  }, [segments, currentTime]);

  useEffect(() => {
    if (!seguirVideo || q) return;
    activoRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [indiceActivo, seguirVideo, q]);

  // Búsqueda en todo el curso, con espera para no disparar una consulta por tecla.
  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 3 || !courseId) {
      setResultados(null);
      return;
    }
    setBuscando(true);
    const id = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: termino, courseId, videoSlug });
        const r = await fetch(`/api/course-search?${params}`);
        const data = await r.json();
        setResultados(data.resultados || []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [q, courseId, videoSlug]);

  const resultadosDeEsteVideo = resultados?.filter((r) => r.videoSlug === videoSlug) || [];
  const resultadosDeOtros = resultados?.filter((r) => r.videoSlug !== videoSlug) || [];

  /**
   * Seis resultados casi idénticos del mismo tramo no son seis respuestas: son una.
   * Se agrupan por capítulo y se muestran los primeros de cada uno, con el resto
   * contado. Así la lista dice DÓNDE se habló del tema, que es lo que se busca.
   */
  const porCapitulo = (lista: Resultado[]) => {
    const grupos = new Map<string, { titulo: string; s: number; items: Resultado[] }>();
    for (const r of lista) {
      const cap = [...chapters].reverse().find((c) => r.s >= c.s);
      const clave = `${r.videoSlug}|${cap?.s ?? -1}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          titulo: cap?.titulo || r.videoTitle,
          s: cap?.s ?? r.s,
          items: [],
        });
      }
      grupos.get(clave)!.items.push(r);
    }
    return [...grupos.values()];
  };

  const POR_GRUPO = 2;

  return (
    <div className="flex h-full flex-col">
      {/* Buscador */}
      <div className="shrink-0 pb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el curso…"
          className="w-full rounded-full border border-gray-700 bg-gray-800/60 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
        />
        {q.trim().length > 0 && q.trim().length < 3 && (
          <p className="px-2 pt-1 text-xs text-gray-500">Escribe al menos 3 letras.</p>
        )}
      </div>

      {/* Capítulos */}
      {chapters.length > 0 && !q && (
        <div className="shrink-0 pb-3">
          <button
            type="button"
            onClick={() => setMostrarCapitulos((v) => !v)}
            className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
          >
            Capítulos
            <span className="text-base leading-none">{mostrarCapitulos ? "−" : "+"}</span>
          </button>
          {mostrarCapitulos && (
            <ul className="mt-1 space-y-0.5">
              {chapters.map((c) => {
                const activo = [...chapters].reverse().find((x) => currentTime >= x.s)?.s === c.s;
                return (
                  <li key={c.s}>
                    <button
                      type="button"
                      onClick={() => onSeek(c.s)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                        activo
                          ? "bg-brand-500/15 text-brand-500"
                          : "text-gray-300 hover:bg-white/5"
                      )}
                    >
                      <span className="shrink-0 font-mono text-xs opacity-60">{reloj(c.s)}</span>
                      <span>{c.titulo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {q.trim().length >= 3 && (
        <div className="scrollbar-sutil min-h-0 flex-1 overflow-y-auto">
          {buscando && <p className="px-2 py-4 text-sm text-gray-500">Buscando…</p>}
          {!buscando && resultados?.length === 0 && (
            <p className="px-2 py-4 text-sm text-gray-500">
              Nada con «{q.trim()}» en este curso.
            </p>
          )}
          {resultadosDeEsteVideo.length > 0 && (
            <>
              <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                En este video
              </p>
              {porCapitulo(resultadosDeEsteVideo).map((grupo) => (
                <div key={grupo.s} className="mb-3">
                  {chapters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onSeek(grupo.s)}
                      className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left hover:bg-white/5"
                    >
                      <span className="shrink-0 font-mono text-xs text-brand-500">
                        {reloj(grupo.s)}
                      </span>
                      {/* Sin `truncate`: en una barra de 320px los títulos se cortaban a
                          la mitad y dejaban de decir de qué trata el capítulo. */}
                      <span className="text-sm text-gray-200">{grupo.titulo}</span>
                      <span className="ml-auto shrink-0 text-xs text-gray-500">
                        {grupo.items.length}
                      </span>
                    </button>
                  )}
                  {grupo.items.slice(0, POR_GRUPO).map((r, i) => (
                    <button
                      key={`${r.s}-${i}`}
                      type="button"
                      onClick={() => onSeek(r.s)}
                      className="block w-full rounded-lg px-2 py-1.5 pl-4 text-left text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    >
                      <span className="mr-2 font-mono text-xs text-gray-600">{reloj(r.s)}</span>
                      {resaltar(r.fragmento, q)}
                    </button>
                  ))}
                  {grupo.items.length > POR_GRUPO && (
                    <p className="px-2 pl-4 text-xs text-gray-600">
                      y {grupo.items.length - POR_GRUPO} más en este capítulo
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
          {resultadosDeOtros.length > 0 && (
            <>
              <p className="px-2 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                En otras lecciones
              </p>
              {resultadosDeOtros.map((r, i) => (
                <a
                  key={`${r.videoSlug}-${r.s}-${i}`}
                  href={`/cursos/${courseSlug}/viewer?videoSlug=${r.videoSlug}&t=${r.s}&tab=transcript`}
                  className="block rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  <span className="block truncate text-xs text-gray-500">{r.videoTitle}</span>
                  <span className="mr-2 font-mono text-xs text-brand-500">{reloj(r.s)}</span>
                  {resaltar(r.fragmento, q)}
                </a>
              ))}
            </>
          )}
        </div>
      )}

      {/* La transcripción */}
      {!q && (
        <div className="relative min-h-0 flex-1">
          <div
            ref={contenedorRef}
            onWheel={() => setSeguirVideo(false)}
            onTouchMove={() => setSeguirVideo(false)}
            className="scrollbar-sutil h-full space-y-1 overflow-y-auto pb-4"
          >
            {segments.map((seg, i) => {
              const activo = i === indiceActivo;
              return (
                <button
                  key={`${seg.s}-${i}`}
                  ref={activo ? activoRef : undefined}
                  type="button"
                  onClick={() => onSeek(seg.s)}
                  className={cn(
                    "block w-full rounded-lg px-2 py-1.5 text-left text-sm leading-relaxed transition-colors",
                    activo
                      ? "bg-brand-500/15 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 font-mono text-xs",
                      activo ? "text-brand-500" : "text-gray-600"
                    )}
                  >
                    {reloj(seg.s)}
                  </span>
                  {seg.quien && (
                    <span className="mr-1 text-xs font-semibold text-gray-500">
                      {seg.quien}:
                    </span>
                  )}
                  {seg.texto}
                </button>
              );
            })}
          </div>

          {!seguirVideo && (
            <button
              type="button"
              onClick={() => setSeguirVideo(true)}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-brand-600"
            >
              Seguir el video
            </button>
          )}
        </div>
      )}

      {/* Fondo opaco y borde: sin ellos, en ventanas bajas el aviso se leía ENCIMA de
          la última línea de la transcripción, porque no tapa nada por sí solo. */}
      <p className="shrink-0 border-t border-gray-700/50 bg-dark pt-2 text-[11px] leading-tight text-gray-600">
        Transcripción automática: puede tener errores.
      </p>
    </div>
  );
};
