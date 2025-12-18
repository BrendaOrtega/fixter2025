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
  videoId?: string; // Added for reprocessing
}

// Mini reproductor para preview en admin que usa la misma lógica que el VideoPlayer principal
export const VideoPreview = ({ video, courseId, className = "", videoId }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  
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

  // Function to trigger video reprocessing
  const handleReprocess = async () => {
    if (!videoId) return;
    
    setIsReprocessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("intent", "trigger_video_processing");
      formData.append("videoId", videoId);
      
      const response = await fetch("/api/course", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      if (!result.success) {
        setError(`Error al reprocesar: ${result.error}`);
      }
    } catch (err) {
      setError("Error al solicitar reprocesamiento");
    } finally {
      setIsReprocessing(false);
    }
  };

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
      
      // Helper functions (copy from VideoPlayer)
      const hlsSupport = (videoNode: HTMLVideoElement) =>
        videoNode.canPlayType("application/vnd.apple.mpegURL");
      const isNewFormat = (url: string) => url.includes('fixtergeek/videos/') && (url.includes('.s3.') || url.includes('storage.tigris.dev'));
      
      console.info(
        hlsSupport(videoElement)
          ? `🎬 [PREVIEW] Native HLS supported: ${hlsSupport(videoElement)}`
          : "🎬 [PREVIEW] HLS not supported, using HLS.js"
      );

      // Always use HLS.js for admin preview (more reliable than native HLS for presigned URLs)
      // Removed native HLS path to simplify and fix type issues
      {
        // HLS.js for all video playback - with proper null checks
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
            console.info("🎬 [PREVIEW] Using HLS.js with presigned URLs🪄");
            
            hls.on(Hls.Events.ERROR, (_, data) => {
              console.error('🚨 [PREVIEW] HLS error:', data);
              if (data.fatal) {
                if (data.details === 'manifestLoadError') {
                  // Fallback: intenta cargar el video original si está disponible
                  if (videoUrls.storageLink) {
                    console.log('🔄 [PREVIEW] Fallback to direct video link');
                    hls.destroy();
                    setError("HLS no encontrado, intentando video directo...");
                    
                    // Clear error after 2 seconds if video loads successfully
                    const clearErrorTimeout = setTimeout(() => {
                      if (videoElement && !videoElement.error) {
                        setError(null);
                      }
                    }, 2000);
                    
                    const setupFallback = async () => {
                      try {
                        if (isNewFormat(videoUrls.storageLink)) {
                          const finalUrl = await interceptHLSUrl(videoUrls.storageLink);
                          videoElement.src = finalUrl;
                          console.log('✅ [PREVIEW] Using presigned direct video');
                        } else {
                          videoElement.src = videoUrls.storageLink;
                          console.log('✅ [PREVIEW] Using legacy direct video');
                        }
                        
                        // Listen for successful load
                        videoElement.addEventListener('loadeddata', () => {
                          clearTimeout(clearErrorTimeout);
                          setError(null);
                          console.log('✅ [PREVIEW] Fallback video loaded successfully');
                        }, { once: true });
                        
                        // Listen for video errors
                        videoElement.addEventListener('error', () => {
                          clearTimeout(clearErrorTimeout);
                          setError("Error: No se pudo cargar ni HLS ni video directo.");
                        }, { once: true });
                        
                      } catch (err) {
                        clearTimeout(clearErrorTimeout);
                        setError("Error al cargar video directo.");
                        console.error('❌ [PREVIEW] Fallback failed:', err);
                      }
                    };
                    
                    setupFallback();
                  } else {
                    setError("HLS no disponible (archivo no encontrado). Intenta con video directo.");
                  }
                } else {
                  setError(`Error HLS: ${data.details || 'Unknown'}`);
                }
              }
            });
          } else {
            // Legacy format - use direct URLs
            const hls = new Hls();
            hls.loadSource(videoUrls.m3u8);
            hls.attachMedia(videoElement);
            console.info("🎬 [PREVIEW] Using HLS.js legacy direct📺");
            
            hls.on(Hls.Events.ERROR, (_, data) => {
              console.error('🚨 [PREVIEW] HLS error:', data);
              if (data.fatal) {
                if (data.details === 'manifestLoadError') {
                  // Fallback: intenta cargar el video original si está disponible
                  if (videoUrls.storageLink) {
                    console.log('🔄 [PREVIEW] Fallback to direct video link');
                    hls.destroy();
                    setError("HLS no encontrado, intentando video directo...");
                    
                    // Clear error after 2 seconds if video loads successfully
                    const clearErrorTimeout = setTimeout(() => {
                      if (videoElement && !videoElement.error) {
                        setError(null);
                      }
                    }, 2000);
                    
                    const setupFallback = async () => {
                      try {
                        if (isNewFormat(videoUrls.storageLink)) {
                          const finalUrl = await interceptHLSUrl(videoUrls.storageLink);
                          videoElement.src = finalUrl;
                          console.log('✅ [PREVIEW] Using presigned direct video');
                        } else {
                          videoElement.src = videoUrls.storageLink;
                          console.log('✅ [PREVIEW] Using legacy direct video');
                        }
                        
                        // Listen for successful load
                        videoElement.addEventListener('loadeddata', () => {
                          clearTimeout(clearErrorTimeout);
                          setError(null);
                          console.log('✅ [PREVIEW] Fallback video loaded successfully');
                        }, { once: true });
                        
                        // Listen for video errors
                        videoElement.addEventListener('error', () => {
                          clearTimeout(clearErrorTimeout);
                          setError("Error: No se pudo cargar ni HLS ni video directo.");
                        }, { once: true });
                        
                      } catch (err) {
                        clearTimeout(clearErrorTimeout);
                        setError("Error al cargar video directo.");
                        console.error('❌ [PREVIEW] Fallback failed:', err);
                      }
                    };
                    
                    setupFallback();
                  } else {
                    setError("HLS no disponible (archivo no encontrado). Intenta con video directo.");
                  }
                } else {
                  setError(`Error HLS: ${data.details || 'Unknown'}`);
                }
              }
            });
          }
        } else if (videoUrls.storageLink) {
          if (isNewFormat(videoUrls.storageLink)) {
            const finalUrl = await interceptHLSUrl(videoUrls.storageLink);
            videoElement.src = finalUrl;
            console.info("🎬 [PREVIEW] Using presigned direct link⚡");
          } else {
            videoElement.src = videoUrls.storageLink;
            console.info("🎬 [PREVIEW] Using legacy direct link🔗");
          }
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

  // No mostrar nada si no hay URLs válidas
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
            {/* Mostrar botón de reprocesar solo para errores HLS y si tenemos videoId */}
            {error.includes("HLS no disponible") && videoId && (
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