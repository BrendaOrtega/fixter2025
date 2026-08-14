import type { Video } from "~/types/models";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImPlay } from "react-icons/im";
import { IoIosClose } from "react-icons/io";
import { Link } from "react-router";
import { nanoid } from "nanoid";
import { useVideoPlayer } from "~/hooks/useVideoPlayer";
import { useVideoTracking } from "~/hooks/useVideoTracking";
import { VideoControls, type Capitulo } from "~/components/viewer/VideoControls";
import { useResumePosition } from "~/hooks/useResumePosition";

// Helper para extraer el ID de YouTube
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface VideoPlayerProps {
  video?: Partial<Video>;
  /** Segundo de arranque que venía en `?t=`. */
  startAt?: number;
  courseId?: string;
  slug: string;
  poster?: string;
  nextVideo?: Partial<Video>;
  nextVideoLink?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onClickNextVideo?: () => void;
  src?: string;
  type?: string;
  disabled?: boolean; // Bloquea autoplay cuando hay drawer
  /**
   * Piezas verticales (9:16). Sin esto el video se estira al alto de la
   * pantalla y en desktop queda una franja diminuta entre dos barras negras.
   */
  vertical?: boolean;
  // Para video tracking
  userId?: string;
  userEmail?: string;
  /** Capítulos para los marcadores de la barra y el menú. */
  chapters?: Capitulo[];
  /** VTT de subtítulos. Sin él no aparece el botón de CC. */
  captionsUrl?: string;
  /** Segundo entero en curso, para sincronizar el panel de transcripción. */
  onTimeChange?: (segundo: number) => void;
  /** Entrega el <video> hacia arriba, para que la transcripción pueda hacer seek. */
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  /** El enlace traía `?t=`: entonces manda ese momento y no se ofrece retomar. */
  arranqueForzado?: boolean;
}

export const VideoPlayer = ({
  video,
  startAt,
  courseId,
  slug,
  poster,
  nextVideo,
  nextVideoLink = "",
  onPlay,
  onPause,
  onEnd,
  disabled,
  userId,
  userEmail,
  vertical,
  chapters,
  captionsUrl,
  onTimeChange,
  onVideoRef,
  arranqueForzado,
}: VideoPlayerProps) => {
  const sectionClass = vertical
    ? "relative overflow-hidden mx-auto w-full max-w-[420px] aspect-[9/16] rounded-xl bg-black"
    : "h-[calc(100vh-80px)] relative overflow-x-hidden";
  // Detectar si es video de YouTube
  const youtubeId = video?.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : null;

  // Video tracking (solo para S3/HLS, no YouTube)
  const {
    trackStart,
    trackProgress,
    trackComplete,
    trackTick,
    trackPlay,
    trackDuration,
    identificar,
  } = useVideoTracking({
    videoId: video?.id || "",
    videoSlug: slug,
    courseId,
    userId,
    email: userEmail,
    // `Video.duration` viene en MINUTOS y como texto (ver el modelo). Mandarlo
    // crudo guardaba 75 donde iban 4500 segundos, y cualquier "cuánto vio"
    // salía en miles por ciento. La duración real la da el elemento cuando
    // carga su metadata; esto es solo el respaldo mientras llega.
    duration: video?.duration ? Number(video.duration) * 60 : undefined,
  });

  const {
    videoRef,
    hlsRef,
    isPlaying,
    isEnding,
    togglePlay,
    dismissEnding,
  } = useVideoPlayer({
    startAt,
    video,
    courseId,
    slug,
    onPlay: () => {
      if (!youtubeId) trackPlay();
      onPlay?.();
    },
    onPause: () => {
      if (!youtubeId && videoRef.current) {
        trackProgress(videoRef.current.currentTime);
      }
      onPause?.();
    },
    onEnd: () => {
      if (!youtubeId) trackComplete();
      onEnd?.();
    },
    disabled,
    // Skip hook logic si es YouTube
    skip: !!youtubeId,
  });

  const [cargando, setCargando] = useState(false);

  // La vista se registra al LLEGAR al reproductor, no al darle play. Creándola
  // en el play, toda vista tenía play por definición y el "% le dio play" del
  // admin siempre habría dicho 100%.
  useEffect(() => {
    if (!youtubeId && video?.id) trackStart();
  }, [youtubeId, video?.id, trackStart]);

  // Mucha gente empieza a ver y se identifica después, al desbloquear. Sin
  // esto la sentada quedaba anónima justo cuando ya sabemos quién es.
  useEffect(() => {
    if (!youtubeId && userEmail) identificar(userEmail);
  }, [youtubeId, userEmail, identificar]);

  // La duración exacta llega con la metadata del elemento; la del modelo está
  // en minutos enteros escritos a mano.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || youtubeId) return;
    const alCargar = () => trackDuration(el.duration);
    if (el.readyState >= 1) alCargar();
    el.addEventListener("loadedmetadata", alCargar);
    return () => el.removeEventListener("loadedmetadata", alCargar);
  }, [videoRef, youtubeId, trackDuration, video?.id]);

  const { ofrecido, continuar, empezarDeNuevo, descartar } = useResumePosition({
    videoRef,
    slug,
    desactivado: !!arranqueForzado || !!youtubeId,
  });

  // Doble toque para ±10 s: en el teléfono es la única forma cómoda de saltar, porque
  // arrastrar una barra de 6px con el pulgar no es forma de moverse en 75 minutos.
  const ultimoToqueRef = useRef<{ t: number; x: number }>({ t: 0, x: 0 });
  const alTocarVideo = (e: React.MouseEvent<HTMLVideoElement>) => {
    const ahora = Date.now();
    const anterior = ultimoToqueRef.current;
    ultimoToqueRef.current = { t: ahora, x: e.clientX };
    if (ahora - anterior.t < 300 && Math.abs(e.clientX - anterior.x) < 60) {
      const el = videoRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const haciaAtras = e.clientX - rect.left < rect.width / 2;
      el.currentTime = Math.max(0, el.currentTime + (haciaAtras ? -10 : 10));
      // Se cancela el play/pausa que iba a disparar este mismo clic.
      ultimoToqueRef.current = { t: 0, x: 0 };
      return;
    }
    togglePlay();
  };

  // El <video> se entrega hacia arriba para que la transcripción pueda hacer seek.
  // Es un efecto y no una ref compartida porque `videoRef` se llena al montar y el
  // padre necesita enterarse.
  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  }, [onVideoRef, videoRef, video?.id]);

  // Render para YouTube
  if (youtubeId) {
    return (
      <section className={`${sectionClass} bg-black`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={video?.title || "Video"}
        />
      </section>
    );
  }

  // Render para S3/HLS (comportamiento original)
  return (
    <section className={sectionClass}>
      <AnimatePresence>
        {!isPlaying && (
          <motion.button
            onClick={togglePlay}
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(0px)" }}
            exit={{ backdropFilter: "blur(4px)", opacity: 0 }}
            transition={{ duration: 0.2 }}
            key="play_button"
            className="absolute inset-0 bottom-16 flex justify-center items-center cursor-pointer z-10"
          >
            <span className="bg-white/10 backdrop-blur flex items-center justify-center text-5xl text-white rounded-full w-24 h-24">
              <ImPlay />
            </span>
          </motion.button>
        )}

        {nextVideo && isEnding && (
          <Link to={nextVideoLink}>
            <motion.div
              key={nanoid()}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", bounce: 0.2 }}
              whileHover={{ scale: 1.05 }}
              exit={{ opacity: 0, filter: "blur(9px)", x: 50 }}
              initial={{ opacity: 0, filter: "blur(9px)", x: 50 }}
              animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
              className="absolute right-2 bg-gray-100 z-20 bottom-20 md:top-4 md:right-4 md:left-auto md:bottom-auto left-2 md:w-[500px] px-6 md:pt-6 pt-10 pb-6 rounded-3xl flex gap-4 shadow-sm items-end"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  dismissEnding();
                }}
                className="self-end text-4xl active:scale-95 md:hidden absolute right-4 top-1"
              >
                <IoIosClose />
              </button>
              <div>
                <p className="text-left dark:text-metal text-iron">
                  Siguiente video
                </p>
                <h4
                  className="text-2xl text-dark md:w-[280px] md:truncate text-left"
                  title={nextVideo.title}
                >
                  {nextVideo.title}
                </h4>
              </div>
              <img
                alt="poster"
                src={nextVideo.poster || "/spaceman.svg"}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src = "/spaceman.svg";
                }}
                className="aspect-video w-40 rounded-xl object-cover"
              />
            </motion.div>
          </Link>
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        // Los videos en HLS traen `m3u8` y `storageLink` vacío: si sólo se mira
        // `storageLink`, salen con el póster de "bloqueado" aunque haya acceso.
        poster={
          video?.m3u8 || video?.storageLink
            ? poster || video.poster || undefined
            : "/video-blocked.png"
        }
        controlsList="nodownload"
        className="w-full h-full"
        // Sin `controls`: los nativos no pintan marcadores de capítulo ni dejan elegir
        // calidad. Los reemplaza <VideoControls/>, abajo.
        playsInline
        preload="metadata"
        onClick={alTocarVideo}
      >
        {captionsUrl && (
          <track
            kind="captions"
            srcLang="es"
            label="Español"
            src={captionsUrl}
            default={false}
          />
        )}
      </video>

      {/* Retomar. No salta solo: ofrece. Quien vuelve a un video puede querer repasar el
          principio, y saltarle al minuto 34 sin preguntar es peor que no hacer nada. */}
      <AnimatePresence>
        {ofrecido > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-dark/95 py-2 pl-4 pr-2 shadow-xl backdrop-blur"
          >
            <button
              type="button"
              onClick={continuar}
              className="text-sm font-medium text-white hover:text-brand-500"
            >
              Continuar desde{" "}
              {`${Math.floor(ofrecido / 60)}:${String(Math.floor(ofrecido % 60)).padStart(2, "0")}`}
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={empezarDeNuevo}
              className="text-sm text-white/60 hover:text-white"
            >
              Empezar de nuevo
            </button>
            <button
              type="button"
              onClick={descartar}
              aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-full text-xl text-white/50 hover:bg-white/10 hover:text-white"
            >
              <IoIosClose />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Girito centrado mientras carga: al saltar hay que bajar el segmento de destino
          antes de pintar nada, y sin señal el clic parece no haber hecho nada. */}
      <AnimatePresence>
        {cargando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          >
            <span className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-brand-500" />
          </motion.div>
        )}
      </AnimatePresence>

      <VideoControls
        videoRef={videoRef}
        videoSlug={slug}
        onCargandoChange={setCargando}
        hlsRef={hlsRef}
        // `duration` se guarda en MINUTOS y como texto (ver el modelo Video).
        duracionConocida={video?.duration ? Number(video.duration) * 60 : undefined}
        chapters={chapters}
        captionsUrl={captionsUrl}
        onTimeChange={(segundo) => {
          if (!youtubeId) trackTick(segundo);
          onTimeChange?.(segundo);
        }}
      />
    </section>
  );
};
