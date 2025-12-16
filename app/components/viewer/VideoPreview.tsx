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
}

// Mini reproductor para preview en admin que usa la misma lógica que el VideoPlayer principal
export const VideoPreview = ({ video, courseId, className = "" }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Memorizar las URLs del video para evitar re-renders innecesarios
  const videoUrls = useMemo(() => ({
    m3u8: video?.m3u8,
    storageLink: video?.storageLink
  }), [video?.m3u8, video?.storageLink]);
  
  // Hook for secure HLS URLs (backward compatible)
  const { interceptHLSUrl } = useSecureHLS({
    courseId,
    onError: setError,
  });

  useEffect(() => {
    if (!videoRef.current || !videoUrls.m3u8 && !videoUrls.storageLink) return;

    const setupPreview = async () => {
      const videoElement = videoRef.current!;
      
      // Debug: log received video data
      console.log("🎬 VideoPreview - Setting up video with URLs:", {
        m3u8: videoUrls.m3u8,
        storageLink: videoUrls.storageLink,
        courseId
      });
      
      // Misma lógica que VideoPlayer: HLS primero, luego directo
      const hlsSupport = (videoNode: HTMLVideoElement) =>
        videoNode.canPlayType("application/vnd.apple.mpegURL");
      
      if (hlsSupport(videoElement)) {
        // Navegador soporta HLS nativo
        if (videoUrls.m3u8) {
          const secureUrl = await interceptHLSUrl(videoUrls.m3u8);
          videoElement.src = secureUrl;
          console.info("🎬 [PREVIEW] Using native HLS with presigned:", secureUrl !== videoUrls.m3u8 ? 'PRESIGNED' : 'PUBLIC');
        } else if (videoUrls.storageLink) {
          const secureUrl = await interceptHLSUrl(videoUrls.storageLink);
          videoElement.src = secureUrl;
          console.info("🎬 [PREVIEW] Using direct link with presigned:", secureUrl !== videoUrls.storageLink ? 'PRESIGNED' : 'PUBLIC');
        }
      } else {
        // Usar HLS.js para navegadores que no soportan HLS nativo
        if (videoUrls.m3u8) {
          const hls = new Hls({
            xhrSetup: async (xhr, url) => {
              // Intercept all HLS requests to use presigned URLs
              const secureUrl = await interceptHLSUrl(url);
              xhr.open('GET', secureUrl, true);
            }
          });
          
          const secureUrl = await interceptHLSUrl(videoUrls.m3u8);
          hls.loadSource(secureUrl);
          hls.attachMedia(videoElement);
          console.info("🎬 [PREVIEW] Using HLS.js with presigned:", secureUrl !== videoUrls.m3u8 ? 'PRESIGNED' : 'PUBLIC');
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error in preview:', data);
            if (data.fatal) {
              setError("Error al cargar preview del video");
            }
          });
        } else if (videoUrls.storageLink) {
          const secureUrl = await interceptHLSUrl(videoUrls.storageLink);
          videoElement.src = secureUrl;
          console.info("🎬 [PREVIEW] Using direct link fallback with presigned:", secureUrl !== videoUrls.storageLink ? 'PRESIGNED' : 'PUBLIC');
        }
      }
    };

    setupPreview().catch(err => {
      console.error("Error setting up video preview:", err);
      setError("Error al configurar preview");
    });
  }, [videoUrls, courseId]); // Removemos interceptHLSUrl de las dependencias

  return (
    <div className={className}>
      {error && (
        <div className="text-red-400 text-xs mb-2 p-2 bg-red-900/20 rounded">
          {error}
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