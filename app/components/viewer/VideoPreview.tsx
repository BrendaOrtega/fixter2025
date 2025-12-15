import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface VideoPreviewProps {
  video: {
    m3u8?: string;
    storageLink?: string;
  };
  className?: string;
}

// Mini reproductor para preview en admin que usa la misma lógica que el VideoPlayer principal
export const VideoPreview = ({ video, className = "" }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !video) return;

    // Misma lógica que VideoPlayer: HLS primero, luego directo
    const hlsSupport = (videoNode: HTMLVideoElement) =>
      videoNode.canPlayType("application/vnd.apple.mpegURL");
    
    if (hlsSupport(videoRef.current)) {
      // Navegador soporta HLS nativo
      if (video.m3u8) {
        videoRef.current.src = video.m3u8;
        console.info("🎬 [PREVIEW] Using native HLS:", video.m3u8);
      } else if (video.storageLink) {
        videoRef.current.src = video.storageLink;
        console.info("🎬 [PREVIEW] Using direct link:", video.storageLink);
      }
    } else {
      // Usar HLS.js para navegadores que no soportan HLS nativo
      if (video.m3u8) {
        const hls = new Hls();
        hls.loadSource(video.m3u8);
        hls.attachMedia(videoRef.current);
        console.info("🎬 [PREVIEW] Using HLS.js:", video.m3u8);
      } else if (video.storageLink) {
        videoRef.current.src = video.storageLink;
        console.info("🎬 [PREVIEW] Using direct link fallback:", video.storageLink);
      }
    }
  }, [video]);

  return (
    <video
      ref={videoRef}
      controls
      className={`w-full max-w-md rounded border border-gray-600 ${className}`}
      style={{ maxHeight: "200px" }}
    >
      <track kind="captions" />
    </video>
  );
};