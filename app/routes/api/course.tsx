import { db } from "~/.server/db";
import type { Route } from "./+types/course";
import slugify from "slugify";
import { randomUUID } from "crypto";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";
import { scheduleVideoProcessing } from "~/.server/agenda";
import { getUserOrNull } from "~/.server/dbGetters";

export const action = async ({ request }: Route.ActionArgs) => {
  // await getAdminOrRedirect(request); @todo move to admin api

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "admin_update_course") {
    const data = JSON.parse(formData.get("data") as string);
    // const slug = slugify(data.title) + randomUUID();
    return await db.course.update({
      where: { id: data.id },
      data: {
        ...data,
        id: undefined,
      },
    });
  }

  if (intent === "admin_delete_video") {
    const videoId = formData.get("videoId") as string;
    
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
        
        return Response.json({ 
          success: true, 
          message: "Video y archivos eliminados exitosamente" 
        });
      } else {
        // No S3 files to delete, just delete from DB
        await db.video.delete({ where: { id: videoId } });
        return Response.json({ 
          success: true, 
          message: "Video eliminado de la base de datos" 
        });
      }
    } catch (error) {
      console.error("Error eliminando video:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al eliminar video"
      });
    }
  }

  if (intent === "admin_update_video") {
    const data = JSON.parse(formData.get("data") as string);
    const index = Number(data.index);
    const isPublic = data.isPublic === "on" ? true : undefined; // @todo validate
    
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
  }

  if (intent === "admin_add_video") {
    const data = JSON.parse(formData.get("data") as string);

    // Validación
    const errors: Record<string, string> = {};
    if (!data.title || String(data.title).trim() === "") {
      errors.title = "El título es requerido";
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ success: false, errors });
    }

    try {
      const slug = slugify(data.title) + "-" + randomUUID();
      const isPublic = data.isPublic === "on" ? true : undefined;
      const index = Number(data.index);
      const video = await db.video.create({
        data: {
          ...data,
          slug,
          index,
          isPublic,
        },
      });
      return Response.json({ success: true, video });
    } catch (error) {
      console.error("Error creando video:", error);
      return Response.json({
        success: false,
        errors: { _form: "Error al guardar el video. Intenta de nuevo." },
      });
    }
  }

  if (intent === "admin_get_videos_for_course") {
    const courseId = formData.get("courseId") as string;
    const allVideosForCourse = await db.video.findMany({
      orderBy: { index: "desc" },
      where: {
        courseIds: { has: courseId },
      },
    });
    return Response.json({ videos: allVideosForCourse });
  }

  if (intent === "videos_length") {
    const courseId = formData.get("courseId") as string;
    const videosLength = await db.video.count({
      where: {
        courseIds: { has: courseId },
      },
    });
    return Response.json({ videosLength });
  }

  if (intent === "get_top_courses") {
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
    return Response.json(courses);
  }

  // Get presigned URL for video upload
  if (intent === "get_video_upload_url") {
    const videoId = formData.get("videoId") as string;
    const fileName = decodeURIComponent(formData.get("fileName") as string);
    
    if (!videoId || !fileName) {
      return Response.json({ 
        success: false, 
        error: "videoId y fileName son requeridos" 
      });
    }

    try {
      // Get video with course relationship
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });

      if (!video || video.courses.length === 0) {
        return Response.json({ 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        });
      }

      const courseId = video.courses[0].id;

      // Generate presigned upload URL
      const uploadInfo = await Effect.runPromise(
        s3VideoService.getUploadUrl(courseId, videoId, fileName)
      );

      return Response.json({
        success: true,
        uploadUrl: uploadInfo.uploadUrl,
        key: uploadInfo.key,
        publicUrl: uploadInfo.publicUrl
      });
    } catch (error) {
      console.error("Error generando URL de upload:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL"
      });
    }
  }

  // Confirm video upload and start processing
  if (intent === "confirm_video_upload") {
    const videoId = formData.get("videoId") as string;
    const s3Key = formData.get("s3Key") as string;
    
    if (!videoId || !s3Key) {
      return Response.json({ 
        success: false, 
        error: "videoId y s3Key son requeridos" 
      });
    }

    try {
      // Get video with course
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });

      if (!video || video.courses.length === 0) {
        return Response.json({ 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        });
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

      return Response.json({
        success: true,
        message: "Video subido exitosamente. Procesamiento HLS iniciado."
      });
    } catch (error) {
      console.error("Error confirmando upload:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al confirmar upload"
      });
    }
  }

  // Get video processing status
  if (intent === "get_video_status") {
    const videoId = formData.get("videoId") as string;
    
    if (!videoId) {
      return Response.json({ success: false, error: "videoId es requerido" });
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
      return Response.json({ success: false, error: "Video no encontrado" });
    }

    let directLinkPresigned: string | undefined;
    
    // Generate presigned URL for original video if it exists and is pending/processing
    if (video.storageLink && video.courses.length > 0 && 
        (video.processingStatus === "pending" || video.processingStatus === "processing")) {
      
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
        hasStorageLink: !!video.storageLink,
        hasCourses: video.courses.length > 0,
        status: video.processingStatus,
        shouldGenerate: video.processingStatus === "pending" || video.processingStatus === "processing"
      });
    }

    return Response.json({
      success: true,
      status: video?.processingStatus || "unknown",
      error: video?.processingError,
      hasHLS: !!video?.m3u8,
      hlsUrl: video?.m3u8,
      hasDirectLink: !!video?.storageLink,
      directLink: video?.storageLink,
      directLinkPresigned
    });
  }

  // Delete only S3 files (keep video record in DB)
  if (intent === "delete_video_files") {
    const videoId = formData.get("videoId") as string;
    
    if (!videoId) {
      return Response.json({ success: false, error: "videoId es requerido" });
    }

    try {
      // Get video with course info
      const video = await db.video.findUnique({
        where: { id: videoId },
        include: { courses: { select: { id: true } } }
      });
      
      if (!video || video.courses.length === 0) {
        return Response.json({ 
          success: false, 
          error: "Video no encontrado o sin curso asociado" 
        });
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

      return Response.json({
        success: true,
        message: "Archivos S3 eliminados y enlaces limpiados"
      });
    } catch (error) {
      console.error("Error eliminando archivos S3:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al eliminar archivos"
      });
    }
  }

  // Get presigned preview URL for private video
  if (intent === "get_video_preview_url") {
    const videoId = formData.get("videoId") as string;
    
    if (!videoId) {
      return Response.json({ success: false, error: "videoId es requerido" });
    }

    try {
      // Get video's storageLink to extract S3 key
      const video = await db.video.findUnique({
        where: { id: videoId },
        select: { storageLink: true }
      });
      
      if (!video?.storageLink) {
        return Response.json({ 
          success: false, 
          error: "Video no tiene archivo asociado" 
        });
      }

      // Extract S3 key from storageLink URL
      const url = new URL(video.storageLink);
      const s3Key = url.pathname.substring(1); // Remove leading slash
      
      // Generate presigned URL
      const previewUrl = await Effect.runPromise(
        s3VideoService.getVideoPreviewUrl(s3Key, 3600) // 1 hour expiry
      );

      return Response.json({
        success: true,
        previewUrl
      });
    } catch (error) {
      console.error("Error generando preview URL:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al generar preview URL"
      });
    }
  }

  // Get presigned URL for HLS content with authentication check
  if (intent === "get_hls_presigned_url") {
    const hlsKey = formData.get("hlsKey") as string;
    const courseId = formData.get("courseId") as string;
    
    if (!hlsKey || !courseId) {
      return Response.json({ 
        success: false, 
        error: "hlsKey y courseId son requeridos" 
      });
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
        return Response.json({ 
          success: false, 
          error: "Curso no encontrado" 
        });
      }

      // Check access permissions
      const hasAccess = course.isFree || (user && user.courses.includes(courseId));
      
      if (!hasAccess) {
        return Response.json({ 
          success: false, 
          error: "Acceso denegado - curso no adquirido" 
        });
      }

      // Generate presigned URL for HLS content
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsKey, 1800) // 30 minutes
      );

      return Response.json({
        success: true,
        presignedUrl,
        expiresIn: 1800
      });

    } catch (error) {
      console.error("Error generando HLS presigned URL:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL HLS"
      });
    }
  }

  // Get presigned URL for original video content with authentication check  
  if (intent === "get_original_video_presigned_url") {
    const s3Key = formData.get("s3Key") as string;
    const courseId = formData.get("courseId") as string;
    
    if (!s3Key || !courseId) {
      return Response.json({ 
        success: false, 
        error: "s3Key y courseId son requeridos" 
      });
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
        return Response.json({ 
          success: false, 
          error: "Curso no encontrado" 
        });
      }

      // Check access permissions
      const hasAccess = course.isFree || (user && user.courses.includes(courseId));
      
      if (!hasAccess) {
        return Response.json({ 
          success: false, 
          error: "Acceso denegado - curso no adquirido" 
        });
      }

      // Generate presigned URL for original video content
      const presignedUrl = await Effect.runPromise(
        s3VideoService.getVideoPreviewUrl(s3Key, 3600) // 1 hour for original videos
      );

      return Response.json({
        success: true,
        presignedUrl,
        expiresIn: 3600
      });

    } catch (error) {
      console.error("Error generando presigned URL para video original:", error);
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : "Error al generar URL del video"
      });
    }
  }

  return Response.json(null);
};
