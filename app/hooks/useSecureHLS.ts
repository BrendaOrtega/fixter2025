import { useCallback, useMemo } from "react";

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
  
  // Memorizar las opciones para evitar recreaciones innecesarias
  const options = useMemo(() => ({ courseId, onError }), [courseId, onError]);
  
  const getPresignedUrl = useCallback(async (originalUrl: string, isHLS: boolean = true): Promise<string> => {
    try {
      // Skip if no courseId provided (backward compatibility) - but try dynamic for storage URLs
      if (!options.courseId) {
        // For storage URLs, try dynamic presigned URL generation
        if (originalUrl.includes('storage') && originalUrl.includes('fixtergeek/videos/')) {
          try {
            // Use dynamic function via direct API call (temporary solution)
            const response = await fetch('/api/video-preview-dynamic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ originalUrl, expiresIn: 3600 })
            });
            const result = await response.json();
            if (result.success) {
              return result.presignedUrl;
            }
          } catch (err) {
            console.warn('Dynamic presigned URL failed, using original:', err);
          }
        }
        return originalUrl;
      }

      // Extract S3 key from the original URL
      const url = new URL(originalUrl);
      let s3Key = url.pathname.substring(1); // Remove leading slash
      
      // Fix: Remove bucket name prefix if it's duplicated in the path
      // (handles URLs like https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/fixtergeek/...)
      const bucketName = s3Key.split('/')[0];
      if (s3Key.startsWith(`${bucketName}/${bucketName}/`)) {
        s3Key = s3Key.substring(bucketName.length + 1); // Remove first bucket name + slash
        console.log(`🔧 [useSecureHLS] Fixed duplicated bucket name: ${bucketName}/${bucketName}/ -> corrected s3Key: ${s3Key}`);
      }
      
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
        formData.append("courseId", options.courseId);
      } else {
        // For original video files
        formData.append("intent", "get_original_video_presigned_url");
        formData.append("s3Key", s3Key);
        formData.append("courseId", options.courseId);
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
      options.onError?.(error instanceof Error ? error.message : "Error de autenticación HLS");
      return originalUrl; // Fallback to original URL
    }
  }, [options]);

  const interceptHLSUrl = useCallback(async (url: string): Promise<string> => {
    // Check if it's a storage URL that needs presigned access
    const isStorageUrl = (
      url.includes('.s3.') || 
      url.includes('storage.tigris.dev') || 
      url.includes('t3.storage.dev')
    ) && url.includes('fixtergeek/videos/');
    
    if (isStorageUrl) {
      // Check if it's HLS content
      const isHLS = url.includes('/hls/') && (url.includes('.m3u8') || url.includes('.ts'));
      
      // Check if it's an original video file  
      const isOriginalVideo = url.includes('/original/') && (url.includes('.mp4') || url.includes('.mov'));
      
      if (isHLS) {
        return getPresignedUrl(url, true);
      } else if (isOriginalVideo) {
        return getPresignedUrl(url, false);
      }
    }
    return url; // Return original URL for public videos or non-storage content
  }, [getPresignedUrl]);

  return {
    interceptHLSUrl,
  };
};