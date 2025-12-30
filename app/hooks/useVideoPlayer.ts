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
}: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { interceptHLSUrl } = useSecureHLS({
    courseId,
    onError: setError,
  });

  // Client-side detection (avoids hydration mismatch)
  useEffect(() => {
    setIsMobile(
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        "ontouchstart" in window
    );
    setIsReady(true);
  }, []);

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

    const handlePlaying = () => setIsPlaying(true);
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
  }, [onPause, onEnd, updateWatchedList]);

  // Video source setup
  useEffect(() => {
    if (!isReady || !videoRef.current || !video) return;

    const el = videoRef.current;
    const hasNativeHLS = !!el.canPlayType("application/vnd.apple.mpegURL");

    const setupVideo = async () => {
      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (hasNativeHLS) {
        // Safari, iOS - native HLS
        if (video.m3u8) {
          if (isNewFormat(video.m3u8)) {
            const s3Key = extractS3Key(video.m3u8);
            if (s3Key) {
              el.src = `/api/hls-proxy?path=${encodeURIComponent(s3Key)}`;
            } else {
              el.src = await interceptHLSUrl(video.m3u8);
            }
          } else {
            el.src = video.m3u8;
          }
        } else if (video.storageLink) {
          el.src = isNewFormat(video.storageLink)
            ? await interceptHLSUrl(video.storageLink)
            : video.storageLink;
        }
      } else {
        // Chrome, Firefox - HLS.js
        if (video.m3u8) {
          const hls = new Hls();
          hlsRef.current = hls;

          if (isNewFormat(video.m3u8)) {
            const s3Key = extractS3Key(video.m3u8);
            if (s3Key) {
              hls.loadSource(`/api/hls-proxy?path=${encodeURIComponent(s3Key)}`);
            } else {
              hls.loadSource(await interceptHLSUrl(video.m3u8));
            }
          } else {
            hls.loadSource(video.m3u8);
          }

          hls.attachMedia(el);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("Error al cargar el video. Por favor intenta de nuevo.");
            }
          });
        } else if (video.storageLink) {
          el.src = isNewFormat(video.storageLink)
            ? await interceptHLSUrl(video.storageLink)
            : video.storageLink;
        }
      }
    };

    setupVideo()
      .then(() => {
        if (!videoRef.current) return;

        // Skip autoplay on mobile
        if (isMobile) {
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
  }, [video, interceptHLSUrl, isMobile, isReady]);

  return {
    videoRef,
    isPlaying,
    isEnding,
    error,
    togglePlay,
    dismissEnding,
  };
}
