import { useEffect, useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";

/**
 * El <video> de una slide.
 *
 * No usa `useVideoPlayer` a propósito: ese hook reproduce al montar y crea una
 * instancia de hls.js por llamada, así que en un feed sonarían todas las
 * slides a la vez. Aquí la reproducción la manda `active`, y nada más.
 */
export function StoryVideo({
  src,
  poster,
  title,
  active,
  muted,
  loop,
  onProgress,
  onEnded,
  onToggleSound,
}: {
  src: string;
  poster?: string | null;
  title: string;
  active: boolean;
  muted: boolean;
  loop: boolean;
  onProgress?: (ratio: number) => void;
  onEnded?: () => void;
  onToggleSound?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!active) {
      el.pause();
      el.currentTime = 0; // la slide se reencuentra desde el principio
      setPaused(false);
      return;
    }

    // El .catch() no es opcional: al scrollear rápido se pausa un video que
    // aún está arrancando y la promesa se rechaza con AbortError.
    el.play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  }, [active, src]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setBlocked(true));
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-label={title}
        className="w-full h-full object-contain bg-black"
        onTimeUpdate={(event) => {
          const el = event.currentTarget;
          if (el.duration) onProgress?.(el.currentTime / el.duration);
        }}
        onEnded={onEnded}
        onClick={() => {
          // El primer toque desmutea; a partir de ahí es play/pausa. Un toque
          // ambiguo es mejor que un toque perdido cuando el video está mudo.
          if (muted && onToggleSound) onToggleSound();
          else togglePlay();
        }}
      />

      {(blocked || paused) && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <span className="w-16 h-16 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white text-2xl pl-1">
            <FaPlay />
          </span>
        </button>
      )}
    </div>
  );
}
