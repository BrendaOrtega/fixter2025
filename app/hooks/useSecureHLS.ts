import { useCallback } from "react";

interface UseSecureHLSOptions {
  courseId?: string;
  onError?: (error: string) => void;
}

interface HLSUrlCache {
  [key: string]: {
    url: string;
    expiresAt: number;
  };
}

// Cache global para URLs presignadas
const hlsUrlCache: HLSUrlCache = {};

export const useSecureHLS = ({ courseId, onError }: UseSecureHLSOptions) => {
  
  const getPresignedUrl = useCallback(async (originalUrl: string, isHLS: boolean = true): Promise<string> => {
    try {
      // Skip if no courseId provided (backward compatibility)
      if (!courseId) {
        return originalUrl;
      }

      // Extract S3 key from the original URL
      const url = new URL(originalUrl);
      const s3Key = url.pathname.substring(1); // Remove leading slash
      
      // Check cache first
      const cached = hlsUrlCache[s3Key];
      if (cached && Date.now() < cached.expiresAt) {
        return cached.url;
      }

      // Request new presigned URL based on content type
      const formData = new FormData();
      
      if (isHLS) {
        formData.append("intent", "get_hls_presigned_url");
        formData.append("hlsKey", s3Key);
        formData.append("courseId", courseId);
      } else {
        // For original video files
        formData.append("intent", "get_original_video_presigned_url");
        formData.append("s3Key", s3Key);
        formData.append("courseId", courseId);
      }

      const response = await fetch("/api/course", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Error al obtener URL segura");
      }

      // Cache the result
      hlsUrlCache[s3Key] = {
        url: result.presignedUrl,
        expiresAt: Date.now() + ((result.expiresIn || 3600) * 1000 * 0.9), // Renew at 90% of expiry
      };

      return result.presignedUrl;
      
    } catch (error) {
      console.error("Error getting presigned HLS URL:", error);
      onError?.(error instanceof Error ? error.message : "Error de autenticación HLS");
      return originalUrl; // Fallback to original URL
    }
  }, [courseId, onError]);

  const interceptHLSUrl = useCallback(async (url: string): Promise<string> => {
    // Intercept S3 URLs from our bucket for both HLS and original videos
    if (url.includes('.s3.') && url.includes('fixtergeek/videos/')) {
      // Check if it's HLS content
      const isHLS = url.includes('/hls/') && (url.includes('.m3u8') || url.includes('.ts'));
      
      // Check if it's an original video file  
      const isOriginalVideo = url.includes('/original/') && url.includes('.mp4');
      
      if (isHLS) {
        return getPresignedUrl(url, true);
      } else if (isOriginalVideo) {
        return getPresignedUrl(url, false);
      }
    }
    return url; // Return original URL for public videos or non-S3 content
  }, [getPresignedUrl]);

  return {
    interceptHLSUrl,
  };
};