import { useRef, useState } from "react";
// Video del post: un link de YouTube se embebe con iframe; un .mp4 directo (por ejemplo un short
// vertical subido al CDN) se reproduce con <video> nativo, centrado y con alto acotado.
const YoutubeComponent = ({ url }: { url: string }) => {
  if (!url) return null;
  const videoId = getYoutubeVideoId(url);
  // Posts viejos traen aquí una imagen: no es video, no se pinta nada.
  if (!videoId && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) return null;
  // Sin id de YouTube es un archivo directo (el CDN no pone extensión en la URL)
  if (!videoId) return <DirectVideo url={url} />;
  return (
    <>
      <h3>Mira el video:</h3>{" "}
      <iframe
        title="youtube video"
        // width="560"
        width="100%"
        height="315"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </>
  );
};

// Video directo: arranca solo y en silencio (lo único que los navegadores permiten sin gesto),
// con un botón encima para activar el audio; al tocarlo se quita el mute y aparecen los controles.
const DirectVideo = ({ url }: { url: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [withAudio, setWithAudio] = useState(false);
  const enableAudio = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setWithAudio(true);
  };
  return (
    <div className="my-8 flex flex-col items-center">
      <div className="relative">
        <video
          ref={ref}
          src={url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls={withAudio}
          className="max-h-[80vh] w-auto max-w-full rounded-2xl border border-white/10 bg-black"
        />
        {!withAudio && (
          <button
            type="button"
            onClick={enableAudio}
            className="absolute inset-0 flex items-end justify-center rounded-2xl bg-transparent pb-6"
            aria-label="Activar audio"
          >
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-[#0E1317]/85 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#0E1317]">
              🔊 Activar audio
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

const getYoutubeVideoId = (url: string) => {
  if (!url) return;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default YoutubeComponent;
