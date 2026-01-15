import { useRef, useEffect, useCallback } from "react";

interface VideoTrackingOptions {
  videoId: string;
  videoSlug: string;
  courseId?: string;
  userId?: string;
  email?: string;
  duration?: number;
}

/**
 * Hook minimalista para tracking de visualizaciones de video.
 * Trackea: inicio, progreso (al pausar/cerrar), y completado.
 */
export function useVideoTracking(options: VideoTrackingOptions) {
  const viewIdRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const hasStartedRef = useRef(false);

  // Crear registro al iniciar reproducción
  const trackStart = useCallback(async () => {
    if (hasStartedRef.current) return; // Ya trackeado esta sesión
    hasStartedRef.current = true;

    try {
      const res = await fetch("/api/video-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "start",
          videoId: options.videoId,
          videoSlug: options.videoSlug,
          courseId: options.courseId,
          userId: options.userId,
          email: options.email,
          duration: options.duration,
        }),
      });
      const data = await res.json();
      if (data.viewId) {
        viewIdRef.current = data.viewId;
      }
    } catch (error) {
      console.error("[VideoTracking] Error tracking start:", error);
    }
  }, [options]);

  // Actualizar progreso (debounced, al pausar o periódicamente)
  const trackProgress = useCallback(async (currentTime: number) => {
    if (!viewIdRef.current) return;

    // Actualizar referencia local
    watchedSecondsRef.current = Math.max(
      watchedSecondsRef.current,
      Math.floor(currentTime)
    );

    // Solo enviar si pasaron >5 segundos desde último update
    const now = Date.now();
    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;

    try {
      await fetch("/api/video-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "progress",
          viewId: viewIdRef.current,
          watchedSeconds: watchedSecondsRef.current,
        }),
      });
    } catch (error) {
      console.error("[VideoTracking] Error tracking progress:", error);
    }
  }, []);

  // Marcar como completado
  const trackComplete = useCallback(async () => {
    if (!viewIdRef.current) return;

    try {
      await fetch("/api/video-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "complete",
          viewId: viewIdRef.current,
          watchedSeconds: watchedSecondsRef.current,
        }),
      });
    } catch (error) {
      console.error("[VideoTracking] Error tracking complete:", error);
    }
  }, []);

  // Guardar progreso al cerrar pestaña (usando sendBeacon para reliability)
  useEffect(() => {
    const handleUnload = () => {
      if (viewIdRef.current && watchedSecondsRef.current > 0) {
        navigator.sendBeacon(
          "/api/video-analytics",
          JSON.stringify({
            intent: "progress",
            viewId: viewIdRef.current,
            watchedSeconds: watchedSecondsRef.current,
          })
        );
      }
    };

    // Guardar progreso cuando la pestaña pierde foco (usuario cambia de tab)
    const handleVisibilityChange = () => {
      if (document.hidden && viewIdRef.current && watchedSecondsRef.current > 0) {
        fetch("/api/video-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "progress",
            viewId: viewIdRef.current,
            watchedSeconds: watchedSecondsRef.current,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Reset cuando cambia el video
  useEffect(() => {
    viewIdRef.current = null;
    watchedSecondsRef.current = 0;
    lastUpdateRef.current = 0;
    hasStartedRef.current = false;
  }, [options.videoId]);

  return { trackStart, trackProgress, trackComplete };
}
