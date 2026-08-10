import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { FaChevronUp, FaChevronDown, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { useActiveSlide } from "~/hooks/useActiveSlide";
import { useSoundPreference } from "~/hooks/useSoundPreference";
import { StoryVideo } from "./StoryVideo";
import { StoryLockedCard, StoryOutroCard } from "./StoryCards";

export type Slide =
  | {
      kind: "video";
      emailId: string;
      videoId: string;
      slug: string;
      title: string;
      poster: string | null;
      src: string;
    }
  | {
      kind: "locked";
      emailId: string;
      title: string;
      poster: string | null;
      unlocksAt: string | null;
    }
  | { kind: "outro"; emailId: "outro"; title: string };

/**
 * Feed vertical tipo stories, mismo componente en móvil y desktop.
 *
 * El snap lo hace CSS; JS solo decide qué slide está activa y quién reproduce.
 * Se montan únicamente las slides vecinas (±1): cinco <video> vivos a la vez
 * descargan cinco buffers para ver uno.
 */
export function StoriesFeed({
  slides,
  initialIndex,
  sequenceName,
  onWatched,
}: {
  slides: Slide[];
  initialIndex: number;
  sequenceName: string;
  onWatched?: (slug: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [progress, setProgress] = useState(0);
  const watched = useRef(new Set<string>());

  const { activeIndex, goTo, registerSlide } = useActiveSlide({
    scrollerRef,
    count: slides.length,
    initialIndex,
  });

  useEffect(() => setProgress(0), [activeIndex]);

  // La URL sigue a la slide, pero con replaceState: navigate() revalidaría el
  // loader, volvería a firmar las fuentes y remontaría el feed entero.
  useEffect(() => {
    const slide = slides[activeIndex];
    if (!slide || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("v", slide.emailId);
    window.history.replaceState(null, "", url);
  }, [activeIndex, slides]);

  const handleProgress = useCallback(
    (ratio: number) => {
      setProgress(ratio);
      const slide = slides[activeIndex];
      if (ratio < 0.5 || slide?.kind !== "video") return;
      if (watched.current.has(slide.slug)) return;
      watched.current.add(slide.slug);
      onWatched?.(slide.slug);
    },
    [activeIndex, slides, onWatched]
  );

  const handleEnded = useCallback(() => {
    // Auto-avance, salvo que se haya pedido menos movimiento.
    if (reduceMotion) return;
    if (activeIndex < slides.length - 1) goTo(activeIndex + 1);
  }, [activeIndex, slides.length, goTo, reduceMotion]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowDown: 1,
      PageDown: 1,
      ArrowUp: -1,
      PageUp: -1,
    };
    if (event.key in keys) {
      event.preventDefault();
      const next = activeIndex + keys[event.key];
      if (next >= 0 && next < slides.length) goTo(next, !reduceMotion);
    } else if (event.key === "m") {
      setSoundOn(!soundOn);
    }
  };

  const canGoUp = activeIndex > 0;
  const canGoDown = activeIndex < slides.length - 1;

  return (
    <div className="relative">
      {/* 100dvh y no 100vh: con vh, la barra de Safari en iOS corta la slide. */}
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label={sequenceName}
        onKeyDown={onKeyDown}
        // El NavBar del sitio es fixed con z-200, así que el feed vive debajo
        // en vez de pelearse con él: 4rem de nav en móvil, 5rem en desktop.
        className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-7rem)] overflow-y-scroll snap-y snap-mandatory overscroll-y-contain scrollbar-hide outline-none"
      >
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const inWindow = Math.abs(index - activeIndex) <= 1;

          return (
            <section
              key={slide.emailId}
              data-index={index}
              ref={(el) => registerSlide(index, el)}
              role="group"
              aria-label={`${index + 1} de ${slides.length}: ${slide.title}`}
              aria-hidden={!isActive}
              className="h-full snap-start snap-always flex items-center justify-center px-0 md:px-4"
            >
              <div className="relative w-full h-full md:h-auto md:w-auto md:aspect-[9/16] md:max-h-[80dvh] md:rounded-2xl md:overflow-hidden md:border md:border-brand-100/10 bg-black">
                {slide.kind === "video" ? (
                  inWindow ? (
                    <StoryVideo
                      src={slide.src}
                      poster={slide.poster}
                      title={slide.title}
                      active={isActive}
                      muted={!soundOn}
                      loop={slides.length === 1 || !!reduceMotion}
                      onProgress={isActive ? handleProgress : undefined}
                      onEnded={isActive ? handleEnded : undefined}
                      onToggleSound={() => setSoundOn(true)}
                    />
                  ) : (
                    // Fuera de la ventana solo el poster: da algo que ver
                    // mientras se pasa de largo, sin descargar el video.
                    <img
                      src={slide.poster || ""}
                      alt=""
                      aria-hidden
                      className="w-full h-full object-contain"
                    />
                  )
                ) : slide.kind === "locked" ? (
                  <StoryLockedCard
                    title={slide.title}
                    poster={slide.poster}
                    unlocksAt={slide.unlocksAt}
                  />
                ) : (
                  <StoryOutroCard />
                )}

                {/* Título sobre el video, como en TikTok */}
                {slide.kind === "video" && (
                  <div className="absolute left-0 right-0 bottom-0 p-5 pb-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                    <p className="text-brand-500 text-[11px] font-bold uppercase tracking-widest mb-1">
                      {sequenceName}
                    </p>
                    <h2 className="text-white text-lg font-bold">
                      {slide.title}
                    </h2>
                  </div>
                )}

                {/* Barras y sonido van DENTRO del marco: fuera, en desktop
                    flotan sobre el fondo y se despegan del video. */}
                {isActive && (
                  <>
                    <StoryProgressBars
                      slides={slides}
                      activeIndex={activeIndex}
                      progress={progress}
                      onSelect={(i) => goTo(i, !reduceMotion)}
                      reduceMotion={!!reduceMotion}
                    />
                    <button
                      type="button"
                      onClick={() => setSoundOn(!soundOn)}
                      aria-pressed={soundOn}
                      aria-label={soundOn ? "Silenciar" : "Activar sonido"}
                      className="absolute top-6 right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur text-white text-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      {soundOn ? <FaVolumeUp /> : <FaVolumeMute />}
                    </button>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Chevrons de desktop, como TikTok web */}
      <div className="hidden md:flex flex-col gap-3 absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1, !reduceMotion)}
          disabled={!canGoUp}
          aria-label="Anterior"
          className="w-10 h-10 rounded-full bg-brand-900/80 border border-brand-100/10 text-white flex items-center justify-center disabled:opacity-30 hover:bg-brand-800 transition-colors"
        >
          <FaChevronUp />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1, !reduceMotion)}
          disabled={!canGoDown}
          aria-label="Siguiente"
          className="w-10 h-10 rounded-full bg-brand-900/80 border border-brand-100/10 text-white flex items-center justify-center disabled:opacity-30 hover:bg-brand-800 transition-colors"
        >
          <FaChevronDown />
        </button>
      </div>
    </div>
  );
}

/**
 * Barras tipo stories. El ancho lo dicta el `timeupdate` del video, nunca un
 * setInterval: un timer paralelo se desincroniza en el primer buffering.
 */
function StoryProgressBars({
  slides,
  activeIndex,
  progress,
  onSelect,
  reduceMotion,
}: {
  slides: Slide[];
  activeIndex: number;
  progress: number;
  onSelect: (index: number) => void;
  reduceMotion: boolean;
}) {
  if (slides.length < 2) return null;

  return (
    <div className="absolute top-3 left-3 right-14 z-20 flex gap-1">
      {slides.map((slide, index) => {
        const done = index < activeIndex;
        const isActive = index === activeIndex;
        const locked = slide.kind === "locked";

        return (
          <button
            key={slide.emailId}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Ir a ${slide.title}`}
            className="flex-1 min-w-[6px] h-1 rounded-full bg-white/25 overflow-hidden"
          >
            <span
              className={
                "block h-full rounded-full " +
                (locked ? "bg-white/40" : "bg-brand-500") +
                (isActive && !reduceMotion ? " transition-[width] duration-100 ease-linear" : "")
              }
              style={{
                width: done ? "100%" : isActive ? `${progress * 100}%` : "0%",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
