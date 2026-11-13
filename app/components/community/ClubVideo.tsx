import { useEffect, useState } from "react";
import { VideoPlayer } from "~/components/viewer/VideoPlayer";

type Assets = { src: string; title?: string; captions?: string | null; storyboard?: string };

// Grabación del club con el reproductor oficial (el del visor de cursos): HLS, velocidades,
// subtítulos, miniaturas al pasar por la barra y retomar donde te quedaste. Pide las URLs
// firmadas al abrirse (sólo miembros). Sin `video.id` no hay analítica de cursos.
export function ClubVideo({ srcUrl, poster }: { srcUrl: string; poster?: string | null }) {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setAssets(null);
    fetch(srcUrl)
      .then((r) => (r.ok ? (r.json() as Promise<Assets>) : Promise.reject()))
      .then((a) => vivo && setAssets(a))
      .catch(() => vivo && setError("No pudimos abrir esta grabación."));
    return () => {
      vivo = false;
    };
  }, [srcUrl]);

  if (error) return <p className="mt-4 text-sm text-brand-500">{error}</p>;
  // Mientras llegan las URLs, el póster ocupa el lugar para que no brinque la página.
  if (!assets) {
    return (
      <div
        className="mt-4 aspect-video w-full rounded-2xl border border-zinc-800 bg-black bg-cover bg-center"
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
      />
    );
  }
  // El slug sólo sirve para recordar dónde te quedaste (localStorage) en ESTA grabación.
  const slug = `grabacion-${srcUrl.split("/").pop()}`;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
      <VideoPlayer
        video={{ m3u8: assets.src, title: assets.title }}
        slug={slug}
        poster={poster ?? undefined}
        captionsUrl={assets.captions ?? undefined}
        storyboardUrl={assets.storyboard}
      />
    </div>
  );
}
