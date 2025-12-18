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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Memorizar las URLs del video para evitar re-renders innecesarios
  const videoUrls = useMemo(() => ({
    m3u8: video?.m3u8,
    storageLink: video?.storageLink
  }), [video?.m3u8, video?.storageLink]);
  
  // Hook for secure HLS URLs (backward compatible) - memorizar con las props exactas
  const secureHLSOptions = useMemo(() => ({
    courseId,
    onError: setError,
  }), [courseId]);
  
  const { interceptHLSUrl } = useSecureHLS(secureHLSOptions);

  useEffect(() => {
    // Solo inicializar UNA VEZ - nunca volver a ejecutar este efecto
    if (!videoRef.current || !videoUrls.m3u8 && !videoUrls.storageLink || isInitialized) return;

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
      
      // Helper to check if URL is already presigned (has signature)
      const isAlreadyPresigned = (url: string) => url.includes('X-Amz-Signature');
      
      // Helper to check if URL is new format (needs presigned) or legacy (use direct)
      const isNewFormat = (url: string) => url.includes('fixtergeek/videos/') && (url.includes('.s3.') || url.includes('storage.tigris.dev'));
      
      if (hlsSupport(videoElement)) {
        // Navegador soporta HLS nativo
        if (videoUrls.m3u8) {
          let finalUrl = videoUrls.m3u8;
          if (isNewFormat(videoUrls.m3u8) && !isAlreadyPresigned(videoUrls.m3u8)) {
            finalUrl = await interceptHLSUrl(videoUrls.m3u8);
          }
          videoElement.src = finalUrl;
          console.info("🎬 [PREVIEW] Using native HLS:", isAlreadyPresigned(finalUrl) ? 'ALREADY_PRESIGNED' : isNewFormat(videoUrls.m3u8) ? 'PRESIGNED' : 'LEGACY_DIRECT');
        } else if (videoUrls.storageLink) {
          let finalUrl = videoUrls.storageLink;
          if (isNewFormat(videoUrls.storageLink) && !isAlreadyPresigned(videoUrls.storageLink)) {
            finalUrl = await interceptHLSUrl(videoUrls.storageLink);
          }
          videoElement.src = finalUrl;
          console.info("🎬 [PREVIEW] Using direct link:", isAlreadyPresigned(finalUrl) ? 'ALREADY_PRESIGNED' : isNewFormat(videoUrls.storageLink) ? 'PRESIGNED' : 'LEGACY_DIRECT');
        }
      } else {
        // Usar HLS.js para navegadores que no soportan HLS nativo
        if (videoUrls.m3u8) {
          if (isNewFormat(videoUrls.m3u8)) {
            // New format - use presigned URLs
            const hls = new Hls({
              xhrSetup: async (xhr, url) => {
                const secureUrl = await interceptHLSUrl(url);
                xhr.open('GET', secureUrl, true);
              }
            });
            
            const secureUrl = await interceptHLSUrl(videoUrls.m3u8);
            hls.loadSource(secureUrl);
            hls.attachMedia(videoElement);
            console.info("🎬 [PREVIEW] Using HLS.js with presigned URLs");
            
            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error in preview:', data);
              if (data.fatal) {
                setError("Error al cargar preview del video");
              }
            });
          } else {
            // Legacy format - use direct URLs
            const hls = new Hls();
            hls.loadSource(videoUrls.m3u8);
            hls.attachMedia(videoElement);
            console.info("🎬 [PREVIEW] Using HLS.js with legacy direct URLs");
            
            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error in preview:', data);
              if (data.fatal) {
                setError("Error al cargar preview del video");
              }
            });
          }
        } else if (videoUrls.storageLink) {
          let finalUrl = videoUrls.storageLink;
          if (isNewFormat(videoUrls.storageLink) && !isAlreadyPresigned(videoUrls.storageLink)) {
            finalUrl = await interceptHLSUrl(videoUrls.storageLink);
          }
          videoElement.src = finalUrl;
          console.info("🎬 [PREVIEW] Using direct link fallback:", isAlreadyPresigned(finalUrl) ? 'ALREADY_PRESIGNED' : isNewFormat(videoUrls.storageLink) ? 'PRESIGNED' : 'LEGACY_DIRECT');
        }
      }
    };

    setupPreview()
      .then(() => {
        setIsInitialized(true); // Marcar como inicializado para NUNCA reinicializar
        console.log("🎬 [PREVIEW] Video preview successfully initialized and locked");
      })
      .catch(err => {
        console.error("Error setting up video preview:", err);
        setError("Error al configurar preview");
      });
  }, [videoUrls.m3u8, videoUrls.storageLink, isInitialized]); // Solo depender de las URLs y el flag

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