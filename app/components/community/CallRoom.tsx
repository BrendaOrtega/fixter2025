// La sala de la llamada del club (iframe de room.html de la caja) con su puente de grabación y el
// panel del quiz. La usan la página `/comunidad/:slug/llamada` y la ventana de llamada de la casa v2.
//
// El botón Grabar/Detener de la sala no le pega a la caja: manda la intención al padre (`gs:rec`) y
// aquí se ejecuta contra el action de `/comunidad/:slug/llamada` con la credencial de partner.
// Nunca cruza una credencial el iframe, sólo «quiero grabar» y «se está grabando».
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { QuizPanel } from "~/components/community/QuizPanel";

type RecReply = { intent: string; recording?: boolean; error?: string; liveTargets?: string[]; watchUrls?: string[]; liveErrors?: string[] };

/**
 * `src` trae un ticket de un solo uso: el iframe NUNCA se remonta ni cambia de `src` (quien lo
 * contiene puede cambiarle el tamaño con CSS, no desmontarlo). `compact`: sin el panel del quiz.
 */
export function CallRoom({ slug, src, onLeave, compact = false }: { slug: string; src: string; onLeave: () => void; compact?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const fetcher = useFetcher<RecReply>();
  const recording = useRef(false);
  const leaveRef = useRef(onLeave);
  leaveRef.current = onLeave;
  const action = `/comunidad/${slug}/llamada`;

  const tell = (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ t: "gs:rec:state", ...msg }, "*");

  // Respuesta del servidor → al botón de dentro de la sala.
  useEffect(() => {
    const d = fetcher.data;
    if (!d || fetcher.state !== "idle") return;
    if (d.error) return tell({ recording: recording.current, error: d.error });
    const stopped = d.intent === "rec-stop";
    recording.current = !!d.recording;
    // Al detener, el enlace a las grabaciones del club: el HLS tarda unos minutos en aparecer ahí.
    tell({
      recording: recording.current,
      ...(stopped ? { url: `${window.location.origin}/comunidad/${slug}` } : {}),
      ...(d.liveTargets ? { liveTargets: d.liveTargets } : {}),
      // Al arrancar al aire: la liga pública para compartir; si un destino falló, se dice.
      ...(d.watchUrls?.length ? { watchUrl: d.watchUrls[0] } : {}),
      ...(d.liveErrors?.length ? { notice: `Se está grabando, pero no salió a: ${d.liveErrors.join("; ")}` } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data, fetcher.state]);

  // Lo que pide la sala. Se filtra por procedencia; quien decide si puede grabar es el action.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data as { t?: string; action?: string; live?: boolean };
      if (d?.t === "gs:leave") return leaveRef.current();
      if (d?.t === "gs:rec:ask") return fetcher.submit({ intent: "rec-state" }, { method: "post", action });
      if (d?.t === "gs:rec" && (d.action === "start" || d.action === "stop")) {
        // Detener cierra el MP4 y lo manda a convertir (hasta ~2 min): el botón lo dice ya.
        if (d.action === "stop") tell({ recording: false, uploading: true });
        fetcher.submit({ intent: d.action === "start" ? "rec-start" : "rec-stop", live: d.live ? "1" : "" }, { method: "post", action });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0E1317] lg:flex-row">
      {/* La sala va SIEMPRE primero y con el mismo `src`: su ticket es de un solo uso, remontarla la pierde. */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <iframe
          ref={frame}
          src={src}
          title="Llamada del club"
          className="absolute inset-0 h-full w-full border-0"
          allow="camera; microphone; display-capture; autoplay; fullscreen; speaker-selection; clipboard-write"
          allowFullScreen
        />
      </div>
      {/* Quiz en vivo: hermano de la sala, con su propia ruta y su propio fetch. Apagado, no pinta nada.
          En la ventana chica se oculta con CSS (no se desmonta: su estado sigue vivo). */}
      <div className={compact ? "hidden" : "contents"}>
        <QuizPanel slug={slug} />
      </div>
    </div>
  );
}
