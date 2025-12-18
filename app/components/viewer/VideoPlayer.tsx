import type { Video } from "~/types/models";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ImPlay } from "react-icons/im";
import { IoIosClose } from "react-icons/io";
import { Link } from "react-router";
import { nanoid } from "nanoid";
import Hls from "hls.js";
import { useSecureHLS } from "~/hooks/useSecureHLS";

export const VideoPlayer = ({
  src,
  video,
  courseId,
  type = "video/mov",
  onPlay,
  onPause,
  onClickNextVideo,
  poster,
  onEnd,
  nextVideo,
  slug,
  nextVideoLink = "",
}: {
  nextVideoLink?: string;
  video?: Partial<Video>;
  courseId?: string;
  slug: string;
  nextVideo?: Partial<Video>;
  poster?: string;
  onClickNextVideo?: () => void;
  onEnd?: () => void;
  type?: string;
  src?: string;
  onPlay?: () => void;
  onPause?: () => void;
}) => {
  const containerRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook for secure HLS URLs (only works when courseId is provided)
  const { interceptHLSUrl } = useSecureHLS({
    courseId,
    onError: setError,
  });

  const togglePlay = () => {
    const controls = videoRef.current || null;
    if (!controls) return;
    // main action
    if (controls.paused) {
      controls.play();
      onPlay?.();
    } else {
      controls.pause();
    }
    setIsPlaying(!controls.paused);
  };

  // Setup video event listeners
  useEffect(() => {
    const controls = videoRef.current;
    if (!controls) return;

    const handlePlaying = () => setIsPlaying(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };
    const handleEnded = () => onEnd?.();
    const handleTimeUpdate = () => {
      if (controls.duration - controls.currentTime < 15) {
        setIsEnding(true);
        updateWatchedList();
      } else {
        setIsEnding(false);
      }
    };

    controls.addEventListener('playing', handlePlaying);
    controls.addEventListener('play', handlePlay);
    controls.addEventListener('pause', handlePause);
    controls.addEventListener('ended', handleEnded);
    controls.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      controls.removeEventListener('playing', handlePlaying);
      controls.removeEventListener('play', handlePlay);
      controls.removeEventListener('pause', handlePause);
      controls.removeEventListener('ended', handleEnded);
      controls.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onPause, onEnd, slug]);

  const updateWatchedList = () => {
    if (typeof window === "undefined") return;
    let list: string | string[] = localStorage.getItem("watched") || "[]";
    list = JSON.parse(list);
    list = [...new Set([...list, slug])];
    localStorage.setItem("watched", JSON.stringify(list));
  };

  useEffect(() => {
    if (!videoRef.current || !video) return;

    const setupVideo = async () => {
      const videoElement = videoRef.current!;
      
      // detecting HLS support
      const hlsSupport = (videoNode: HTMLVideoElement) =>
        videoNode.canPlayType("application/vnd.apple.mpegURL");
      
      console.info(
        hlsSupport(videoElement)
          ? `::NATIVE_HLS_SUPPORTED::✅:: ${hlsSupport(videoElement)}`
          : "::HLS_NOT_SUPPORTED 📵::"
      );

      // Helper to check if URL is new format (needs presigned) or legacy (use direct)
      const isNewFormat = (url: string) => url.includes('fixtergeek/videos/') && (url.includes('.s3.') || url.includes('storage.tigris.dev'));

      // Helper to extract S3 key from URL for HLS proxy
      const extractS3Key = (url: string): string | null => {
        try {
          const urlObj = new URL(url);
          let path = urlObj.pathname.substring(1); // Remove leading slash
          // Handle bucket name prefix (e.g., /wild-bird-2039/fixtergeek/... -> fixtergeek/...)
          const parts = path.split('/');
          const bucketIdx = parts.findIndex(p => p === 'fixtergeek');
          if (bucketIdx > 0) {
            path = parts.slice(bucketIdx).join('/');
          }
          return path;
        } catch {
          return null;
        }
      };

      if (hlsSupport(videoElement)) {
        // Native HLS support (Safari)
        if (video.m3u8) {
          if (isNewFormat(video.m3u8)) {
            // New format: use HLS proxy to rewrite relative URLs
            const s3Key = extractS3Key(video.m3u8);
            if (s3Key) {
              const proxyUrl = `/api/hls-proxy?path=${encodeURIComponent(s3Key)}`;
              videoElement.src = proxyUrl;
              console.info("::USING_NATIVE_HLS_WITH_PROXY::🔄::", s3Key);
            } else {
              // Fallback to presigned if key extraction fails
              const finalUrl = await interceptHLSUrl(video.m3u8);
              videoElement.src = finalUrl;
              console.info("::USING_NATIVE_HLS:: PRESIGNED_FALLBACK⚠️");
            }
          } else {
            // Legacy format: use direct URL
            videoElement.src = video.m3u8;
            console.info("::USING_NATIVE_HLS:: LEGACY_DIRECT🔗");
          }
        } else if (video.storageLink) {
          const finalUrl = isNewFormat(video.storageLink)
            ? await interceptHLSUrl(video.storageLink)
            : video.storageLink;
          videoElement.src = finalUrl;
          console.info("::USING_DIRECT_LINK::", isNewFormat(video.storageLink) ? "PRESIGNED⚡" : "LEGACY_DIRECT🔗");
        }
      } else {
        // HLS.js fallback (Chrome, Firefox, etc.)
        if (video.m3u8) {
          const hls = new Hls();

          if (isNewFormat(video.m3u8)) {
            // New format: use HLS proxy to rewrite all URLs
            const s3Key = extractS3Key(video.m3u8);
            if (s3Key) {
              const proxyUrl = `/api/hls-proxy?path=${encodeURIComponent(s3Key)}`;
              hls.loadSource(proxyUrl);
              console.info("::USING_HLS.JS_WITH_PROXY::🔄::", s3Key);
            } else {
              // Fallback to direct presigned if key extraction fails
              const secureUrl = await interceptHLSUrl(video.m3u8);
              hls.loadSource(secureUrl);
              console.info("::USING_HLS.JS_PRESIGNED_FALLBACK::⚠️::");
            }
          } else {
            // Legacy format - use direct URLs
            hls.loadSource(video.m3u8);
            console.info("::USING_HLS.JS_LEGACY_DIRECT::📺::");
          }

          hls.attachMedia(videoElement);

          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              setError("Error al cargar el video. Por favor intenta de nuevo.");
            }
          });
        } else if (video.storageLink) {
          const finalUrl = isNewFormat(video.storageLink)
            ? await interceptHLSUrl(video.storageLink)
            : video.storageLink;
          videoElement.src = finalUrl;
          console.info("::FALLBACK_TO_DIRECT_LINK::", isNewFormat(video.storageLink) ? "PRESIGNED⚽" : "LEGACY_DIRECT🔗");
        }
      }
    };

    setupVideo().then(() => {
      // Autoplay after video is set up
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          // Autoplay blocked by browser policy - user will need to click play
          console.info("::AUTOPLAY_BLOCKED::", err.message);
        });
      }
    }).catch(err => {
      console.error("Error setting up video:", err);
      setError("Error al configurar el video");
    });
  }, [video, interceptHLSUrl]);

  return (
    <section
      className="h-[calc(100vh-80px)] relative overflow-x-hidden"
      ref={containerRef}
    >
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
              // onClick={onClickNextVideo}
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
                onClick={() => setIsEnding(false)}
                className="self-end text-4xl active:scale-95 md:hidden absolute right-4 top-1"
              >
                <IoIosClose />
              </button>
              <div>
                <p className="text-left dark:text-metal text-iron">
                  Siguiente video
                </p>
                <h4 className="text-2xl text-dark md:w-[280px] md:truncate text-left">
                  {nextVideo.title}
                </h4>
              </div>
              <img
                alt="poster"
                src={nextVideo.poster || "/spaceman.svg"}
                onError={({ currentTarget }) => {
                  console.log("WTF?");
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
        poster={
          video?.storageLink ? poster || video.poster || undefined : "/video-blocked.png"
        }
        controlsList="nodownload"
        ref={videoRef}
        className="w-full h-full"
        controls
      >
        <track kind="captions" />
        <source src={src} type={type} />
      </video>
    </section>
  );
};
