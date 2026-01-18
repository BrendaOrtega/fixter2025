import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useSecureHLS } from "~/hooks/useSecureHLS";
import type { Video } from "~/types/models";

interface UseVideoPlayerOptions {
  video?: Partial<Video>;
  courseId?: string;
  slug: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  disabled?: boolean; // Bloquea autoplay (ej: cuando hay drawer abierto)
  skip?: boolean; // Skip toda la lógica (ej: para videos de YouTube)
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isEnding: boolean;
  error: string | null;
  togglePlay: () => void;
  dismissEnding: () => void;
}

// Helpers
const isFullUrl = (str: string) => str.startsWith("http");

const isInternalRoute = (str: string) => str.startsWith("/");

const isS3Key = (str: string) =>
  !isFullUrl(str) &&
  !isInternalRoute(str) &&
  (str.includes("fixtergeek/") || str.endsWith(".m3u8") || str.endsWith(".mp4"));

const isNewFormat = (url: string) =>
  url.includes("fixtergeek/videos/") &&
  (url.includes(".s3.") ||
    url.includes("storage.tigris.dev") ||
    url.includes("t3.storage.dev"));

const extractS3Key = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname.substring(1);
    const parts = path.split("/");
    const bucketIdx = parts.findIndex((p) => p === "fixtergeek");
    if (bucketIdx > 0) {
      path = parts.slice(bucketIdx).join("/");
    }
    return path;
  } catch {
    return null;
  }
};

export function useVideoPlayer({
  video,
  courseId,
  slug,
  onPlay,
  onPause,
  onEnd,
  disabled = false,
  skip = false,
}: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevDisabledRef = useRef(disabled);

  const { interceptHLSUrl } = useSecureHLS({
    courseId,
    onError: setError,
  });

  // Client-side detection (avoids hydration mismatch)
  useEffect(() => {
    // Skip si es video de YouTube
    if (skip) return;

    setIsMobile(
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        "ontouchstart" in window
    );
    setIsReady(true);
  }, [skip]);

  // Auto-play cuando drawer se cierra (disabled: true → false)
  useEffect(() => {
    if (prevDisabledRef.current && !disabled && videoRef.current && !isMobile) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
    prevDisabledRef.current = disabled;
  }, [disabled, isMobile]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const controls = videoRef.current;
    if (!controls) return;

    if (controls.paused) {
      controls.play();
      onPlay?.();
    } else {
      controls.pause();
    }
    setIsPlaying(!controls.paused);
  }, [onPlay]);

  const dismissEnding = useCallback(() => setIsEnding(false), []);

  // Update watched list in localStorage
  const updateWatchedList = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("watched") || "[]";
    const list = JSON.parse(stored) as string[];
    const updated = [...new Set([...list, slug])];
    localStorage.setItem("watched", JSON.stringify(updated));
  }, [slug]);

  // Event listeners
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handlePlaying = () => {
      setIsPlaying(true);
      onPlay?.(); // Llamar onPlay cuando realmente empieza a reproducir
    };
    const handlePlay = () => {
      setTimeout(() => {
        if (el && !el.paused) setIsPlaying(true);
      }, 100);
    };
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };
    const handleEnded = () => onEnd?.();
    const handleTimeUpdate = () => {
      if (el.duration - el.currentTime < 15) {
        setIsEnding(true);
        updateWatchedList();
      } else {
        setIsEnding(false);
      }
    };
    const handleError = () => {
      const err = el.error;
      setError(`Error de video: ${err?.message || "desconocido"}`);
    };

    el.addEventListener("playing", handlePlaying);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("error", handleError);

    return () => {
      el.removeEventListener("playing", handlePlaying);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("error", handleError);
    };
  }, [onPlay, onPause, onEnd, updateWatchedList]);

  // Video source setup
  useEffect(() => {
    if (!isReady || !videoRef.current || !video) return;

    const el = videoRef.current;
    // Solo Safari/iOS tienen HLS nativo confiable. Chrome puede devolver "maybe" pero no funciona bien.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const hasNativeHLS = (isSafari || isIOS) && !!el.canPlayType("application/vnd.apple.mpegURL");

    const setupVideo = async () => {
      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      console.log("🎬 Video setup:", {
        hasNativeHLS,
        hasM3U8: !!video.m3u8,
        hasStorageLink: !!video.storageLink,
        isNewFormat: video.m3u8 ? isNewFormat(video.m3u8) : video.storageLink ? isNewFormat(video.storageLink) : false,
        isS3Key: video.storageLink ? isS3Key(video.storageLink) : false,
      });

      // Helper to resolve source URL based on format
      const resolveSource = async (source: string): Promise<string> => {
        // Case 1: Direct S3 key (new format) -> use proxy
        if (isS3Key(source)) {
          console.log("🎬 Using S3 key via proxy:", source);
          return `/api/hls-proxy?path=${encodeURIComponent(source)}`;
        }

        // Case 2: Internal route (legacy) -> use as-is
        if (isInternalRoute(source)) {
          console.log("🎬 Using internal route:", source);
          return source;
        }

        // Case 3: Full URL - check if new format needs presigned
        if (isFullUrl(source)) {
          if (isNewFormat(source)) {
            const s3Key = extractS3Key(source);
            if (s3Key) {
              console.log("🎬 Extracted S3 key from URL:", s3Key);
              return `/api/hls-proxy?path=${encodeURIComponent(s3Key)}`;
            }
            return await interceptHLSUrl(source);
          }
          return source;
        }

        return source;
      };

      if (hasNativeHLS) {
        // Safari, iOS - native HLS
        console.log("🎬 Using Native HLS (Safari/iOS)");
        if (video.m3u8) {
          el.src = await resolveSource(video.m3u8);
        } else if (video.storageLink) {
          el.src = await resolveSource(video.storageLink);
        }
      } else {
        // Chrome, Firefox - HLS.js
        console.log("🎬 Using HLS.js (Chrome/Firefox)");
        const hlsSource = video.m3u8 || (video.storageLink?.includes('.m3u8') ? video.storageLink : null);

        if (hlsSource) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(await resolveSource(hlsSource));
          hls.attachMedia(el);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("Error al cargar el video. Por favor intenta de nuevo.");
            }
          });
        } else if (video.storageLink) {
          // Non-HLS video (mp4, etc.)
          el.src = await resolveSource(video.storageLink);
        }
      }
    };

    setupVideo()
      .then(() => {
        if (!videoRef.current) return;

        // Skip autoplay on mobile or when disabled (drawer open)
        if (isMobile || disabled) {
          setIsPlaying(false);
          return;
        }

        // Desktop: try autoplay
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      })
      .catch(() => {
        setError("Error al configurar el video");
      });

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video, interceptHLSUrl, isMobile, isReady, disabled]);

  return {
    videoRef,
    isPlaying,
    isEnding,
    error,
    togglePlay,
    dismissEnding,
  };
}
