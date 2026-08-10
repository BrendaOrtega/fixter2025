import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router";

export type VideoItem = {
  slug: string;
  titulo: string;
  descripcion: string;
  src: string;
  poster?: string;
  duracion: string;
};

// En Tigris, no en public/: un mp4 de 13 MB por video engordaría el bundle y el
// contenedor. Los objetos van con ACL public-read — sin él la URL directa
// devuelve 403.
const CDN = "https://wild-bird-2039.t3.storage.dev";

// Se agregan aquí conforme salen. El slug es lo que viaja en la URL, así que una
// vez publicado un enlace no debería cambiar.
export const VIDEOS: VideoItem[] = [
  {
    slug: "el-loop",
    titulo: "El loop del agente",
    descripcion:
      "El modelo no ejecuta: pide. La condicional que decide si el ciclo sigue, y por qué el historial hace que cada vuelta sea mejor que la anterior.",
    src: `${CDN}/videos/sesion-01-el-loop.mp4`,
    poster: `${CDN}/videos/sesion-01-el-loop.jpg`,
    duracion: "0:47",
  },
];

export default function VideoGaleria() {
  const [params, setParams] = useSearchParams();
  const activo = params.get("v");
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Un solo video sonando a la vez: al arrancar uno, se pausan los demás.
  const alReproducir = (slug: string) => {
    Object.entries(refs.current).forEach(([s, el]) => {
      if (s !== slug && el && !el.paused) el.pause();
    });
    if (params.get("v") !== slug) {
      const next = new URLSearchParams(params);
      next.set("v", slug);
      // replace: no queremos una entrada de historial por cada play
      setParams(next, { replace: true, preventScrollReset: true });
    }
  };

  // Enlace directo: /sistemas-agenticos?v=el-loop abre y reproduce ese video.
  useEffect(() => {
    if (!activo) return;
    const el = refs.current[activo];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // El autoplay con sonido está bloqueado por los navegadores, así que sólo
    // se intenta; si falla, el video queda listo con su cartel y controles.
    el.play().catch(() => {});
  }, [activo]);

  return (
    <section
      id="videos"
      className="relative z-10 border-t border-sistemas-line/60 bg-sistemas-surface/30"
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-20 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Los temas, <span className="text-sistemas-primary">en corto</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-sistemas-gray">
            Piezas de un minuto para que sepas de qué hablamos antes de entrar.
            El taller es en vivo y se trabaja escribiendo código: esto es
            material aparte, para orientarte sobre los temas.
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((v, i) => (
            <motion.figure
              key={v.slug}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`group overflow-hidden rounded-2xl border bg-sistemas-dark transition-colors ${
                activo === v.slug
                  ? "border-sistemas-primary/60"
                  : "border-sistemas-line hover:border-sistemas-primary/40"
              }`}
            >
              <video
                ref={(el) => {
                  refs.current[v.slug] = el;
                }}
                src={v.src}
                poster={v.poster}
                controls
                preload="metadata"
                playsInline
                onPlay={() => alReproducir(v.slug)}
                // contain y no cover: el día que una pieza no sea 9:16, cover
                // la recorta en silencio en vez de encajarla.
                className="aspect-[9/16] w-full bg-black object-contain"
              />
              <figcaption className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-bold text-zinc-100">
                    {v.titulo}
                  </h3>
                  <span className="shrink-0 font-mono text-xs text-sistemas-gray">
                    {v.duracion}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-sistemas-gray">
                  {v.descripcion}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-10 max-w-2xl text-center text-base text-sistemas-gray"
        >
          Al inscribirte llega la{" "}
          <span className="font-semibold text-zinc-200">
            secuencia de preparación
          </span>
          : cinco entregas, una cada dos días, cada una con un video como estos y
          la explicación que lo acompaña.
        </motion.p>
      </div>
    </section>
  );
}
