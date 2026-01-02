import { db } from "~/.server/db";
import slugify from "slugify";
import { randomUUID } from "crypto";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";
import { scheduleVideoProcessing } from "~/.server/agenda";
import { getUserOrNull } from "~/.server/dbGetters";
import { normalizeVideoUrls, normalizeVideoArray, logNormalizationChanges } from "~/.server/utils/video-url-normalizer";

export const courseServerActions = {
  admin_update_course: async (data: any) => {
    return await db.course.update({
      where: { id: data.id },
      data: {
        ...data,
        id: undefined,
      },
    });
  },

  admin_delete_video: async (videoId: string) => {
    try {
      // Get video with course info before deletion
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });
      
      if (video && video.courses.length > 0) {
        const courseId = video.courses[0].id;
        
        // Delete S3 files (original + HLS) in parallel with DB deletion
        const deleteS3Promise = Effect.runPromise(
          s3VideoService.deleteVideoFiles(courseId, videoId)
        ).catch(error => {
          console.error(`⚠️ S3 deletion failed for video ${videoId}:`, error);
          // Continue with DB deletion even if S3 fails
        });
        
        const deleteDBPromise = db.video.delete({ where: { id: videoId } });
        
        // Execute both operations
        await Promise.all([deleteS3Promise, deleteDBPromise]);
        
        return { 
          success: true, 
          message: "Video y archivos eliminados exitosamente" 
        };
      } else {
        // No S3 files to delete, just delete from DB
        await db.video.delete({ where: { id: videoId } });
        return { 
          success: true, 
          message: "Video eliminado de la base de datos" 
        };
      }
    } catch (error) {
      console.error("Error eliminando video:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al eliminar video"
      };
    }
  },

  admin_update_video: async (data: any) => {
    const index = Number(data.index);
    const isPublic = data.isPublic === "on"; // false cuando desmarcado, true cuando marcado
    
    // Retry logic for deadlock resolution
    const updateVideoWithRetry = async (retries = 3): Promise<any> => {
      try {
        return await db.video.update({
          where: { id: data.id },
          data: { 
            title: data.title,
            index, 
            isPublic, 
            duration: data.duration,
            moduleName: data.moduleName,
            description: data.description,
            authorName: data.authorName,
            photoUrl: data.photoUrl,
            accessLevel: data.accessLevel,
            // Only update video links if explicitly provided (preserve upload-generated ones)
            ...(data.storageLink && { storageLink: data.storageLink }),
            ...(data.m3u8 && { m3u8: data.m3u8 }),
          },
        });
      } catch (error: any) {
        // Check if it's a deadlock error (P2034)
        if (error.code === 'P2034' && retries > 0) {
          console.log(`Deadlock detected, retrying... (${retries} attempts left)`);
          // Wait a random amount (10-100ms) before retry
          await new Promise(resolve => setTimeout(resolve, Math.random() * 90 + 10));
          return updateVideoWithRetry(retries - 1);
        }
        throw error;
      }
    };
    
    return await updateVideoWithRetry();
  },

  admin_add_video: async (data: any) => {
    // Validación
    const errors: Record<string, string> = {};
    if (!data.title || String(data.title).trim() === "") {
      errors.title = "El título es requerido";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    try {
      const slug = slugify(data.title) + "-" + randomUUID();
      const isPublic = data.isPublic === "on";
      const index = Number(data.index);
      const video = await db.video.create({
        data: {
          ...data,
          slug,
          index,
          isPublic,
        },
      });
      return { success: true, video };
    } catch (error) {
      console.error("Error creando video:", error);
      return {
        success: false,
        errors: { _form: "Error al guardar el video. Intenta de nuevo." },
      };
    }
  },

  admin_get_videos_for_course: async (courseId: string) => {
    const allVideosForCourse = await db.video.findMany({
      orderBy: { index: "desc" },
      where: {
        courseIds: { has: courseId },
      },
    });
    
    // Normalize all video URLs and get statistics
    const { normalizedVideos, statistics } = normalizeVideoArray(allVideosForCourse);
    
    if (statistics.changed > 0) {
      console.log(`🔧 [admin_get_videos_for_course] Normalized ${statistics.changed}/${statistics.total} videos:`, {
        m3u8Fixed: statistics.m3u8Fixed,
        storageLinkFixed: statistics.storageLinkFixed
      });
    }
    
    // Update database with corrected URLs if any were changed
    const updatePromises = normalizedVideos.map(async (video) => {
      if (!video._urlsChanged) return;
      
      try {
        const updateData: { m3u8?: string; storageLink?: string } = {};
        
        if (video._changes.m3u8) {
          updateData.m3u8 = video.m3u8;
        }
        
        if (video._changes.storageLink) {
          updateData.storageLink = video.storageLink;
        }
        
        await db.video.update({
          where: { id: video.id },
          data: updateData
        });
        
        logNormalizationChanges(video, 'admin_get_videos_for_course');
        
      } catch (err) {
        console.error(`Failed to update normalized URLs for video ${video.id}:`, err);
      }
    });
    
    // Execute all updates in parallel (fire and forget to avoid blocking response)
    Promise.allSettled(updatePromises).catch(err => 
      console.error('Some video URL normalizations failed:', err)
    );
    
    // Return clean videos without normalization metadata
    const cleanVideos = normalizedVideos.map(({ _urlsChanged, _changes, ...video }) => video);
    return { videos: cleanVideos };
  },

  admin_reorder_videos: async (updates: { id: string; index: number }[]) => {
    // Actualizar índices de videos en batch
    const updatePromises = updates.map(({ id, index }) =>
      db.video.update({
        where: { id },
        data: { index },
      })
    );

    await Promise.all(updatePromises);
    return { success: true, updated: updates.length };
  },

  videos_length: async (courseId: string) => {
    const videosLength = await db.video.count({
      where: {
        courseIds: { has: courseId },
      },
    });
    return { videosLength };
  },

  get_top_courses: async () => {
    const courses = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      where: { published: true },
      take: 3,
      select: {
        id: true,
        title: true,
        icon: true,
        duration: true,
        level: true,
        slug: true,
      },
    });
    return courses;
  },

  get_video_upload_url: async (videoId: string, fileName: string) => {
    if (!videoId || !fileName) {
      return { 
        success: false, 
        error: "videoId y fileName son requeridos" 
      };
    }

    try {
      // Get video with course relationship
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });

      if (!video || video.courses.length === 0) {
        return { 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        };
      }

      const courseId = video.courses[0].id;

      // Generate presigned upload URL
      const uploadInfo = await Effect.runPromise(
        s3VideoService.getUploadUrl(courseId, videoId, fileName)
      );

      return {
        success: true,
        uploadUrl: uploadInfo.uploadUrl,
        key: uploadInfo.key,
        publicUrl: uploadInfo.publicUrl
      };
    } catch (error) {
      console.error("Error generando URL de upload:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL"
      };
    }
  },

  confirm_video_upload: async (videoId: string, s3Key: string) => {
    if (!videoId || !s3Key) {
      return { 
        success: false, 
        error: "videoId y s3Key son requeridos" 
      };
    }

    try {
      // Get video with course
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });

      if (!video || video.courses.length === 0) {
        return { 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        };
      }

      const courseId = video.courses[0].id;

      // Update video with temporary URL and mark as pending processing (no transaction to avoid deadlock)
      await db.video.update({
        where: { id: videoId },
        data: {
          storageLink: s3VideoService.getVideoUrl(s3Key),
          processingStatus: "pending",
          processingStartedAt: null, // Reset any previous processing attempt
          processingCompletedAt: null,
          processingFailedAt: null,
          processingError: null
        }
      });
      
      // Schedule job
      await scheduleVideoProcessing({
        courseId,
        videoId,
        videoS3Key: s3Key
      });

      return {
        success: true,
        message: "Video subido exitosamente. Procesamiento HLS iniciado."
      };
    } catch (error) {
      console.error("Error confirmando upload:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al confirmar upload"
      };
    }
  },

  get_video_status: async (videoId: string, skipPresigned: boolean = false) => {
    if (!videoId) {
      return { success: false, error: "videoId es requerido" };
    }

    const video = await db.video.findUnique({
      where: { id: videoId },
      select: {
        processingStatus: true,
        processingError: true,
        m3u8: true,
        storageLink: true,
        courses: {
          select: { id: true }
        }
      }
    });

    if (!video) {
      return { success: false, error: "Video no encontrado" };
    }

    let directLinkPresigned: string | undefined;
    
    // Generate presigned URL for admin preview in all cases where we have a video file
    // This ensures admin can always preview videos regardless of processing status
    if (!skipPresigned && video.storageLink && video.courses.length > 0) {
      
      try {
        const courseId = video.courses[0].id;
        
        console.log("🔍 Generating presigned URL for video:", {
          videoId,
          courseId,
          processingStatus: video.processingStatus,
          storageLink: video.storageLink
        });
        
        // Find original video files in S3 using secure method
        const videoFiles = await Effect.runPromise(
          s3VideoService.listVideoFiles(courseId, videoId)
        );
        
        console.log("📁 Found video files in S3:", videoFiles);
        
        // Look for original video file (in /original/ subfolder)
        const originalFile = videoFiles.find(file => file.includes('/original/'));
        
        console.log("🎯 Original file found:", originalFile);
        
        if (originalFile) {
          directLinkPresigned = await Effect.runPromise(
            s3VideoService.getVideoPreviewUrl(originalFile, 3600) // 1 hour expiry
          );
          
          console.log("✅ Generated presigned URL:", directLinkPresigned ? "SUCCESS" : "FAILED");
        } else {
          console.log("❌ No original file found in S3");
        }
      } catch (error) {
        console.error("❌ Error generating presigned URL for original video:", error);
        // Continue without presigned URL - don't break the response
      }
    } else {
      console.log("⏭️ Skipping presigned URL generation:", {
        skipPresigned,
        hasStorageLink: !!video.storageLink,
        hasCourses: video.courses.length > 0,
        status: video.processingStatus,
        shouldGenerate: video.processingStatus === "pending" || video.processingStatus === "processing" || video.processingStatus === "failed"
      });
    }

    // Normalize video URLs and fix any bucket duplication or endpoint issues
    const normalizedVideo = normalizeVideoUrls({ 
      m3u8: video?.m3u8, 
      storageLink: video?.storageLink,
      id: videoId 
    });
    
    let hlsUrl = normalizedVideo.m3u8;
    
    // Update database if URL was normalized
    if (normalizedVideo._urlsChanged) {
      try {
        const updateData: { m3u8?: string; storageLink?: string } = {};
        
        if (normalizedVideo._changes.m3u8) {
          updateData.m3u8 = normalizedVideo.m3u8;
        }
        
        if (normalizedVideo._changes.storageLink) {
          updateData.storageLink = normalizedVideo.storageLink;
        }
        
        await db.video.update({
          where: { id: videoId },
          data: updateData
        });
        
        logNormalizationChanges(normalizedVideo, 'get_video_status');
        
      } catch (err) {
        console.error('Failed to update normalized video URLs:', err);
      }
    }

    // Generate HLS proxy URL for secure playback
    // The proxy handles all presigning internally, solving the relative URL issue
    let hlsProxyUrl: string | undefined;

    if (!skipPresigned && hlsUrl && video.courses.length > 0) {
      try {
        // Extract HLS key from the normalized URL
        const hlsUrlParsed = new URL(hlsUrl);
        let hlsKey = hlsUrlParsed.pathname.substring(1); // Remove leading slash

        // Remove bucket name if present at start of path
        const bucketName = process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || "wild-bird-2039";
        if (hlsKey.startsWith(`${bucketName}/`)) {
          hlsKey = hlsKey.substring(bucketName.length + 1);
        }

        // Use HLS proxy endpoint that rewrites m3u8 with presigned URLs
        hlsProxyUrl = `/api/hls-proxy?path=${encodeURIComponent(hlsKey)}`;

        console.log("✅ [get_video_status] HLS proxy URL generated:", hlsProxyUrl);
      } catch (error) {
        console.error("❌ [get_video_status] Error generating HLS proxy URL:", error);
        // Continue without proxy URL - don't break the response
      }
    }

    const response = {
      success: true,
      status: video?.processingStatus || "unknown",
      error: video?.processingError,
      hasHLS: !!hlsUrl,
      hlsUrl,
      hlsProxyUrl, // URL del proxy que maneja presignado internamente
      hasDirectLink: !!video?.storageLink,
      directLink: video?.storageLink,
      directLinkPresigned
    };

    console.log(`📤 [get_video_status] Response for video ${videoId}:`, {
      status: response.status,
      hasHLS: response.hasHLS,
      hlsUrl: response.hlsUrl ? 'PRESENT' : 'MISSING',
      hlsProxyUrl: response.hlsProxyUrl ? 'PROXY' : 'MISSING',
      hasDirectLink: response.hasDirectLink,
      directLinkPresigned: response.directLinkPresigned ? 'PRESIGNED' : 'MISSING'
    });

    return response;
  },

  delete_video_files: async (videoId: string) => {
    if (!videoId) {
      return { success: false, error: "videoId es requerido" };
    }

    try {
      // Get video with course info
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });
      
      if (!video || video.courses.length === 0) {
        return { 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        };
      }

      const courseId = video.courses[0].id;

      // Delete S3 files and clear links in DB
      await Promise.all([
        Effect.runPromise(s3VideoService.deleteVideoFiles(courseId, videoId)),
        db.video.update({
          where: { id: videoId },
          data: {
            storageLink: null,
            m3u8: null,
            processingStatus: null,
            processingStartedAt: null,
            processingCompletedAt: null,
            processingFailedAt: null,
            processingError: null,
            processingMetadata: null
          }
        })
      ]);

      return {
        success: true,
        message: "Archivos S3 eliminados y enlaces limpiados"
      };
    } catch (error) {
      console.error("Error eliminando archivos S3:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al eliminar archivos"
      };
    }
  },

  get_video_preview_url: async (videoId: string) => {
    if (!videoId) {
      return { success: false, error: "videoId es requerido" };
    }

    try {
      // Get video's storageLink to extract S3 key
      const video = await db.video.findUnique({
        where: { id: videoId },
        select: { storageLink: true }
      });
      
      if (!video?.storageLink) {
        return { 
          success: false, 
          error: "Video no tiene archivo asociado" 
        };
      }

      // Extract S3 key from storageLink URL
      const url = new URL(video.storageLink);
      const s3Key = url.pathname.substring(1); // Remove leading slash
      
      // Generate presigned URL
      const previewUrl = await Effect.runPromise(
        s3VideoService.getVideoPreviewUrl(s3Key, 3600) // 1 hour expiry
      );

      return {
        success: true,
        previewUrl
      };
    } catch (error) {
      console.error("Error generando preview URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar preview URL"
      };
    }
  },

  get_hls_presigned_url: async (request: Request, hlsKey: string, courseId: string) => {
    if (!hlsKey || !courseId) {
      return { 
        success: false, 
        error: "hlsKey y courseId son requeridos" 
      };
    }

    try {
      // Get user and verify authentication
      const user = await getUserOrNull(request);
      
      // Get course to check if it's free or user has access
      const course = await db.course.findUnique({
        where: { id: courseId },
        select: { id: true, isFree: true, title: true }
      });

      if (!course) {
        return { 
          success: false, 
          error: "Curso no encontrado" 
        };
      }

      // Check access permissions - ADMIN has full access for preview purposes
      const isAdmin = user?.role === "ADMIN";
      const hasAccess = isAdmin || course.isFree || (user && user.courses.includes(courseId));
      
      if (!hasAccess) {
        return { 
          success: false, 
          error: "Acceso denegado - curso no adquirido" 
        };
      }

      // Generate presigned URL for HLS content
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsKey, 1800) // 30 minutes
      );

      return {
        success: true,
        presignedUrl,
        expiresIn: 1800
      };

    } catch (error) {
      console.error("Error generando HLS presigned URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL HLS"
      };
    }
  },

  get_original_video_presigned_url: async (request: Request, s3Key: string, courseId: string, originalUrl?: string) => {
    if (!s3Key || !courseId) {
      return {
        success: false,
        error: "s3Key y courseId son requeridos"
      };
    }

    try {
      // Get user and verify authentication
      const user = await getUserOrNull(request);

      // Get course to check if it's free or user has access
      const course = await db.course.findUnique({
        where: { id: courseId },
        select: { id: true, isFree: true, title: true }
      });

      if (!course) {
        return {
          success: false,
          error: "Curso no encontrado"
        };
      }

      // Check access permissions - ADMIN has full access for preview purposes
      const isAdmin = user?.role === "ADMIN";
      const hasAccess = isAdmin || course.isFree || (user && user.courses.includes(courseId));

      if (!hasAccess) {
        return {
          success: false,
          error: "Acceso denegado - curso no adquirido"
        };
      }

      // Generate presigned URL for original video content
      // Use dynamic endpoint detection if originalUrl is provided (supports both tigris and t3 domains)
      let presignedUrl: string;
      if (originalUrl) {
        presignedUrl = await Effect.runPromise(
          s3VideoService.getVideoPreviewUrlDynamic(originalUrl, 3600)
        );
      } else {
        // Fallback to static endpoint (for backwards compatibility)
        presignedUrl = await Effect.runPromise(
          s3VideoService.getVideoPreviewUrl(s3Key, 3600)
        );
      }

      return {
        success: true,
        presignedUrl,
        expiresIn: 3600
      };

    } catch (error) {
      console.error("Error generando presigned URL para video original:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL del video"
      };
    }
  },

  trigger_video_processing: async (videoId: string) => {
    if (!videoId) {
      return { success: false, error: "videoId es requerido" };
    }

    try {
      // Get video with course info
      const video = await db.video.findUnique({
        where: { id: videoId },
        select: {
          id: true,
          storageLink: true,
          processingStatus: true,
          courses: { select: { id: true } }
        }
      });
      
      if (!video || video.courses.length === 0) {
        return { 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        };
      }

      if (!video.storageLink) {
        return { 
          success: false, 
          error: "Video no tiene archivo subido. Sube primero el archivo MP4." 
        };
      }

      if (video.processingStatus === "processing") {
        return { 
          success: false, 
          error: "El video ya está siendo procesado" 
        };
      }

      const courseId = video.courses[0].id;

      // Extract S3 key from storage link (remove bucket name and leading slash)
      const url = new URL(video.storageLink);
      const fullPath = url.pathname.substring(1); // Remove leading slash
      
      // Remove bucket name from path if present (e.g. wild-bird-2039/)
      const s3Key = fullPath.includes('/') && !fullPath.startsWith('fixtergeek/') 
        ? fullPath.substring(fullPath.indexOf('/') + 1)
        : fullPath;

      // Reset processing status and trigger processing
      await db.video.update({
        where: { id: videoId },
        data: {
          processingStatus: "pending",
          processingStartedAt: null,
          processingCompletedAt: null,
          processingFailedAt: null,
          processingError: null
        }
      });
      
      // Schedule processing job with force=true for manual trigger
      await scheduleVideoProcessing({
        courseId,
        videoId,
        videoS3Key: s3Key,
        force: true
      });

      return {
        success: true,
        message: "Procesamiento iniciado manualmente"
      };
    } catch (error) {
      console.error("Error triggering manual video processing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al iniciar procesamiento"
      };
    }
  }
};