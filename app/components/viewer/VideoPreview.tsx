import { useEffect, useRef, useState, useMemo } from "react";
import Hls from "hls.js";
import { useSecureHLS } from "~/hooks/useSecureHLS";

interface VideoPreviewProps {
  video: {
    m3u8?: string;
    storageLink?: string;
  };
  courseId?: string;
  className?: string;
  videoId?: string;
}

// Mini reproductor para preview en admin
export const VideoPreview = ({ video, courseId, className = "", videoId }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const videoUrls = useMemo(() => ({
    m3u8: video?.m3u8,
    storageLink: video?.storageLink
  }), [video?.m3u8, video?.storageLink]);

  const secureHLSOptions = useMemo(() => ({
    courseId,
    onError: setError,
  }), [courseId]);

  const { interceptHLSUrl } = useSecureHLS(secureHLSOptions);

  const handleReprocess = async () => {
    if (!videoId) return;
    setIsReprocessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("intent", "trigger_video_processing");
      formData.append("videoId", videoId);
      const response = await fetch("/api/course", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.success) {
        setError(`Error al reprocesar: ${result.error}`);
      }
    } catch {
      setError("Error al solicitar reprocesamiento");
    } finally {
      setIsReprocessing(false);
    }
  };

  useEffect(() => {
    if (!videoRef.current || (!videoUrls.m3u8 && !videoUrls.storageLink) || isInitialized) return;

    const setupPreview = async () => {
      const videoElement = videoRef.current!;

      console.log("🎬 VideoPreview - Setting up:", {
        m3u8: videoUrls.m3u8,
        storageLink: videoUrls.storageLink,
        courseId
      });

      // Helper to check URL types
      const isProxyUrl = (url: string) => url.startsWith('/api/hls-proxy');
      const isStorageUrl = (url: string) =>
        url.includes('fixtergeek/videos/') &&
        (url.includes('.s3.') || url.includes('storage.tigris.dev'));

      if (videoUrls.m3u8) {
        if (isProxyUrl(videoUrls.m3u8)) {
          // PROXY URL - server handles all presigning
          console.info("🎬 [PREVIEW] Using HLS proxy URL 🔄");
          const hls = new Hls();
          hls.loadSource(videoUrls.m3u8);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error('🚨 [PREVIEW] HLS error:', data);
            if (data.fatal) {
              hls.destroy();
              if (videoUrls.storageLink) {
                videoElement.src = videoUrls.storageLink;
              } else {
                setError(`Error HLS: ${data.details || 'Unknown'}`);
              }
            }
          });
        } else if (isStorageUrl(videoUrls.m3u8)) {
          // STORAGE URL - need presigning (fallback path)
          console.info("🎬 [PREVIEW] Using presigned HLS 🔐");
          const hls = new Hls();
          const secureUrl = await interceptHLSUrl(videoUrls.m3u8);
          hls.loadSource(secureUrl);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error('🚨 [PREVIEW] HLS error:', data);
            if (data.fatal) {
              hls.destroy();
              // Fallback to direct video
              if (videoUrls.storageLink) {
                interceptHLSUrl(videoUrls.storageLink).then(url => {
                  videoElement.src = url;
                }).catch(() => {
                  setError("Error al cargar video");
                });
              } else {
                setError(`Error HLS: ${data.details || 'Unknown'}`);
              }
            }
          });
        } else {
          // LEGACY URL - use directly
          console.info("🎬 [PREVIEW] Using legacy HLS 📺");
          const hls = new Hls();
          hls.loadSource(videoUrls.m3u8);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              hls.destroy();
              if (videoUrls.storageLink) {
                videoElement.src = videoUrls.storageLink;
              } else {
                setError(`Error HLS: ${data.details || 'Unknown'}`);
              }
            }
          });
        }
      } else if (videoUrls.storageLink) {
        // Direct video only (no HLS)
        if (isStorageUrl(videoUrls.storageLink)) {
          const finalUrl = await interceptHLSUrl(videoUrls.storageLink);
          videoElement.src = finalUrl;
          console.info("🎬 [PREVIEW] Using presigned direct link ⚡");
        } else {
          videoElement.src = videoUrls.storageLink;
          console.info("🎬 [PREVIEW] Using direct link 🔗");
        }
      }
    };

    setupPreview()
      .then(() => {
        setIsInitialized(true);
        console.log("🎬 [PREVIEW] Initialized");
      })
      .catch(err => {
        console.error("Error setting up video preview:", err);
        setError("Error al configurar preview");
      });
  }, [videoUrls.m3u8, videoUrls.storageLink, isInitialized, courseId, interceptHLSUrl]);

  if (!videoUrls.m3u8 && !videoUrls.storageLink) {
    return (
      <div className={className}>
        <div className="text-gray-400 text-xs p-2 bg-gray-800/50 rounded border border-gray-600">
          📹 No hay video disponible para preview
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="text-red-400 text-xs mb-2 p-2 bg-red-900/20 rounded">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            {error.includes("HLS") && videoId && (
              <button
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs rounded"
              >
                {isReprocessing ? "Procesando..." : "🚀 Procesar"}
              </button>
            )}
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        className="w-full max-w-md rounded border border-gray-600"
        style={{ maxHeight: "200px" }}
      >
        <track kind="captions" />
      </video>
    </div>
  );
};
