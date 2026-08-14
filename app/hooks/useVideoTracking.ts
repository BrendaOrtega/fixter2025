import { useRef, useEffect, useCallback } from "react";

/// Tamaño del tramo del mapa de calor, en segundos. 15 da 300 casillas para un
/// webinar de 75 minutos (~3 KB) y alcanza para señalar el momento exacto de un
/// clip, no solo para ver si abandonan al principio.
const BUCKET_SIZE = 15;

interface VideoTrackingOptions {
  videoId: string;
  videoSlug: string;
  courseId?: string;
  userId?: string;
  email?: string;
  duration?: number;
}

// ID persistente por navegador para deduplicar viewers anónimos entre sesiones
function getVisitorId(): string {
  try {
    const KEY = "fx_visitor_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Hook minimalista para tracking de visualizaciones de video.
 * Trackea: inicio, progreso (al pausar/cerrar), y completado.
 */
export function useVideoTracking(options: VideoTrackingOptions) {
  const viewIdRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef(0);
  // Una casilla por tramo de BUCKET_SIZE segundos, con las veces que se vio.
  const bucketsRef = useRef<number[]>([]);
  const ultimoSegundoRef = useRef(-1);
  const playRef = useRef(false);
  const ultimoEnvioBucketsRef = useRef(0);
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
          sessionId: getVisitorId(),
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

  /// Manda el acumulado COMPLETO de esta sentada, no un delta: el servidor
  /// guarda el máximo casilla por casilla, así que un beacon repetido o que
  /// llega tarde no puede ni duplicar ni pisar lo que ya está.
  const enviarBuckets = useCallback((usarBeacon = false) => {
    if (!viewIdRef.current || !bucketsRef.current.length) return;
    const payload = JSON.stringify({
      intent: "heatmap",
      viewId: viewIdRef.current,
      buckets: bucketsRef.current,
      bucketSize: BUCKET_SIZE,
      played: playRef.current,
      watchedSeconds: watchedSecondsRef.current,
    });
    try {
      if (usarBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/video-analytics", payload);
      } else {
        fetch("/api/video-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // perder un lote de métricas no puede romperle el video a nadie
    }
  }, []);

  /// Llamado una vez por segundo de reproducción, con la posición del video.
  /// De aquí sale el mapa de calor: qué tramos se vieron, cuáles se repitieron
  /// y cuáles nunca se tocaron.
  const trackTick = useCallback((currentTime: number) => {
    const segundo = Math.floor(currentTime);
    if (segundo === ultimoSegundoRef.current) return; // el mismo segundo no cuenta dos veces
    ultimoSegundoRef.current = segundo;

    const casilla = Math.floor(segundo / BUCKET_SIZE);
    const b = bucketsRef.current;
    // rellenar los huecos: un salto adelante deja ceros en medio, que es
    // justamente lo que queremos ver como "esto se lo brincaron"
    while (b.length <= casilla) b.push(0);
    b[casilla] += 1;

    watchedSecondsRef.current = Math.max(watchedSecondsRef.current, segundo);

    // Lotes de 10 s, como hace Mux: ni un beacon por segundo ni perderlo todo
    const now = Date.now();
    if (now - ultimoEnvioBucketsRef.current < 10000) return;
    ultimoEnvioBucketsRef.current = now;
    enviarBuckets();
  }, []);

  /// El primer play de la sentada. Separado de `trackStart`, que ocurre al
  /// llegar al reproductor: entre los dos sale cuánta gente abre y no ve.
  const trackPlay = useCallback(() => {
    playRef.current = true;
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
      enviarBuckets(true); // beacon: es lo único que sobrevive al cierre
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
      if (document.hidden) enviarBuckets();
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
    bucketsRef.current = [];
    ultimoSegundoRef.current = -1;
    playRef.current = false;
    ultimoEnvioBucketsRef.current = 0;
    lastUpdateRef.current = 0;
    hasStartedRef.current = false;
  }, [options.videoId]);

  return { trackStart, trackProgress, trackComplete, trackTick, trackPlay };
}
