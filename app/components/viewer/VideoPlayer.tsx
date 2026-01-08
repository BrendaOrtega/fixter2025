import type { Video } from "~/types/models";
import { AnimatePresence, motion } from "motion/react";
import { ImPlay } from "react-icons/im";
import { IoIosClose } from "react-icons/io";
import { Link } from "react-router";
import { nanoid } from "nanoid";
import { useVideoPlayer } from "~/hooks/useVideoPlayer";

// Helper para extraer el ID de YouTube
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface VideoPlayerProps {
  video?: Partial<Video>;
  courseId?: string;
  slug: string;
  poster?: string;
  nextVideo?: Partial<Video>;
  nextVideoLink?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onClickNextVideo?: () => void;
  src?: string;
  type?: string;
  disabled?: boolean; // Bloquea autoplay cuando hay drawer
}

export const VideoPlayer = ({
  video,
  courseId,
  slug,
  poster,
  nextVideo,
  nextVideoLink = "",
  onPlay,
  onPause,
  onEnd,
  disabled,
}: VideoPlayerProps) => {
  // Detectar si es video de YouTube
  const youtubeId = video?.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : null;

  const {
    videoRef,
    isPlaying,
    isEnding,
    togglePlay,
    dismissEnding,
  } = useVideoPlayer({
    video,
    courseId,
    slug,
    onPlay,
    onPause,
    onEnd,
    disabled,
    // Skip hook logic si es YouTube
    skip: !!youtubeId,
  });

  // Render para YouTube
  if (youtubeId) {
    return (
      <section className="h-[calc(100vh-80px)] relative overflow-x-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={video?.title || "Video"}
        />
      </section>
    );
  }

  // Render para S3/HLS (comportamiento original)
  return (
    <section className="h-[calc(100vh-80px)] relative overflow-x-hidden">
      <AnimatePresence>
        {!isPlaying && (
          <motion.button
            onClick={togglePlay}
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(0px)" }}
            exit={{ backdropFilter: "blur(4px)", opacity: 0 }}
            transition={{ duration: 0.2 }}
            key="play_button"
            className="absolute inset-0 bottom-16 flex justify-center items-center cursor-pointer z-10"
          >
            <span className="bg-white/10 backdrop-blur flex items-center justify-center text-5xl text-white rounded-full w-24 h-24">
              <ImPlay />
            </span>
          </motion.button>
        )}

        {nextVideo && isEnding && (
          <Link to={nextVideoLink}>
            <motion.div
              key={nanoid()}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", bounce: 0.2 }}
              whileHover={{ scale: 1.05 }}
              exit={{ opacity: 0, filter: "blur(9px)", x: 50 }}
              initial={{ opacity: 0, filter: "blur(9px)", x: 50 }}
              animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
              className="absolute right-2 bg-gray-100 z-20 bottom-20 md:top-4 md:right-4 md:left-auto md:bottom-auto left-2 md:w-[500px] px-6 md:pt-6 pt-10 pb-6 rounded-3xl flex gap-4 shadow-sm items-end"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  dismissEnding();
                }}
                className="self-end text-4xl active:scale-95 md:hidden absolute right-4 top-1"
              >
                <IoIosClose />
              </button>
              <div>
                <p className="text-left dark:text-metal text-iron">
                  Siguiente video
                </p>
                <h4
                  className="text-2xl text-dark md:w-[280px] md:truncate text-left"
                  title={nextVideo.title}
                >
                  {nextVideo.title}
                </h4>
              </div>
              <img
                alt="poster"
                src={nextVideo.poster || "/spaceman.svg"}
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null;
                  currentTarget.src = "/spaceman.svg";
                }}
                className="aspect-video w-40 rounded-xl object-cover"
              />
            </motion.div>
          </Link>
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        poster={video?.storageLink ? poster || video.poster || undefined : "/video-blocked.png"}
        controlsList="nodownload"
        className="w-full h-full"
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    </section>
  );
};
