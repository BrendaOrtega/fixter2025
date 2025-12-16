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
  
  const getPresignedUrl = useCallback(async (originalUrl: string): Promise<string> => {
    try {
      // Skip if no courseId provided (backward compatibility)
      if (!courseId) {
        return originalUrl;
      }

      // Extract S3 key from the original URL
      const url = new URL(originalUrl);
      const hlsKey = url.pathname.substring(1); // Remove leading slash
      
      // Check cache first
      const cached = hlsUrlCache[hlsKey];
      if (cached && Date.now() < cached.expiresAt) {
        return cached.url;
      }

      // Request new presigned URL
      const formData = new FormData();
      formData.append("intent", "get_hls_presigned_url");
      formData.append("hlsKey", hlsKey);
      formData.append("courseId", courseId);

      const response = await fetch("/api/course", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Error al obtener URL HLS");
      }

      // Cache the result
      hlsUrlCache[hlsKey] = {
        url: result.presignedUrl,
        expiresAt: Date.now() + (result.expiresIn * 1000 * 0.9), // Renew at 90% of expiry
      };

      return result.presignedUrl;
      
    } catch (error) {
      console.error("Error getting presigned HLS URL:", error);
      onError?.(error instanceof Error ? error.message : "Error de autenticación HLS");
      return originalUrl; // Fallback to original URL
    }
  }, [courseId, onError]);

  const interceptHLSUrl = useCallback(async (url: string): Promise<string> => {
    // Only intercept HLS URLs from our S3 bucket that are in the /hls/ path
    // This way we don't break existing public videos
    if (url.includes('.s3.') && url.includes('/hls/') && (url.includes('.m3u8') || url.includes('.ts'))) {
      return getPresignedUrl(url);
    }
    return url; // Return original URL for public videos or non-HLS content
  }, [getPresignedUrl]);

  return {
    interceptHLSUrl,
  };
};