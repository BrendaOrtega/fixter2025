import { useEffect, useRef, useState } from "react";

// Reproductor de una grabación del club. Pide la URL firmada al abrirse (sólo miembros) y la
// carga con hls.js; Safari reproduce HLS nativo.
export function ClubVideo({ srcUrl, poster }: { srcUrl: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const res = await fetch(srcUrl);
      if (!res.ok) return setError("No pudimos abrir esta grabación.");
      const { src } = (await res.json()) as { src: string };
      const video = ref.current;
      if (!video || cancelled) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        return;
      }
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) return setError("Tu navegador no reproduce este video.");
      const h = new Hls();
      h.loadSource(src);
      h.attachMedia(video);
      hls = h;
    })().catch(() => setError("No pudimos abrir esta grabación."));
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [srcUrl]);

  if (error) return <p className="mt-4 text-sm text-brand-500">{error}</p>;
  return (
    <video
      ref={ref}
      controls
      autoPlay
      playsInline
      poster={poster ?? undefined}
      className="mt-4 aspect-video w-full rounded-2xl border border-zinc-800 bg-black"
    />
  );
}
