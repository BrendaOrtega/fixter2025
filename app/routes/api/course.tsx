import type { Route } from "./+types/course";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { courseServerActions } from "./course.server";

/**
 * Los intents que sólo puede tocar quien administra.
 *
 * ⚠️ Aquí había un `getAdminOrRedirect` COMENTADO con un "@todo move to admin api", así que
 * este endpoint llevaba tiempo abierto: cualquiera con un POST multipart podía crear, editar
 * y **borrar** vídeos y cursos, o disparar el pipeline de subida.
 *
 * El guard no puede ser global: el reproductor normal entra por aquí para pedir sus URLs
 * firmadas (`get_hls_presigned_url`, `get_original_video_presigned_url` vía `useSecureHLS`) y
 * el catálogo cuenta vídeos (`videos_length` vía `useVideosLength`). Esos comprueban el acceso
 * por su cuenta y reciben el `request`. Por eso la puerta es una LISTA, y es cerrada: un
 * intent nuevo no queda protegido por accidente, pero tampoco se cuela — hay que decidirlo.
 */
const SOLO_ADMIN = new Set([
  "admin_update_course",
  "admin_delete_video",
  "admin_update_video",
  "admin_add_video",
  "admin_get_videos_for_course",
  "admin_reorder_videos",
  "get_video_upload_url",
  "confirm_video_upload",
  "get_video_status",
  "delete_video_files",
  "trigger_video_processing",
]);

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (typeof intent === "string" && SOLO_ADMIN.has(intent)) {
    await getAdminOrRedirect(request);
  }

  if (intent === "admin_update_course") {
    const data = JSON.parse(formData.get("data") as string);
    return await courseServerActions.admin_update_course(data);
  }

  if (intent === "admin_delete_video") {
    const videoId = formData.get("videoId") as string;
    const result = await courseServerActions.admin_delete_video(videoId);
    return Response.json(result);
  }

  if (intent === "admin_update_video") {
    const data = JSON.parse(formData.get("data") as string);
    const video = await courseServerActions.admin_update_video(data);
    return Response.json({ success: true, video });
  }

  if (intent === "admin_add_video") {
    const data = JSON.parse(formData.get("data") as string);
    const result = await courseServerActions.admin_add_video(data);
    return Response.json(result);
  }

  if (intent === "admin_get_videos_for_course") {
    const courseId = formData.get("courseId") as string;
    const result = await courseServerActions.admin_get_videos_for_course(courseId);
    return Response.json(result);
  }

  if (intent === "admin_reorder_videos") {
    const updates = JSON.parse(formData.get("updates") as string);
    const result = await courseServerActions.admin_reorder_videos(updates);
    return Response.json(result);
  }

  if (intent === "videos_length") {
    const courseId = formData.get("courseId") as string;
    const result = await courseServerActions.videos_length(courseId);
    return Response.json(result);
  }

  if (intent === "get_top_courses") {
    const courses = await courseServerActions.get_top_courses();
    return Response.json(courses);
  }

  // Get presigned URL for video upload
  if (intent === "get_video_upload_url") {
    const videoId = formData.get("videoId") as string;
    const fileName = decodeURIComponent(formData.get("fileName") as string);
    const result = await courseServerActions.get_video_upload_url(videoId, fileName);
    return Response.json(result);
  }

  // Confirm video upload and start processing
  if (intent === "confirm_video_upload") {
    const videoId = formData.get("videoId") as string;
    const s3Key = formData.get("s3Key") as string;
    const result = await courseServerActions.confirm_video_upload(videoId, s3Key);
    return Response.json(result);
  }

  // Get video processing status
  if (intent === "get_video_status") {
    const videoId = formData.get("videoId") as string;
    const skipPresigned = formData.get("skipPresigned") === "true";
    const result = await courseServerActions.get_video_status(videoId, skipPresigned);
    return Response.json(result);
  }

  // Delete only S3 files (keep video record in DB)
  if (intent === "delete_video_files") {
    const videoId = formData.get("videoId") as string;
    const result = await courseServerActions.delete_video_files(videoId);
    return Response.json(result);
  }

  // Get presigned preview URL for private video
  if (intent === "get_video_preview_url") {
    const videoId = formData.get("videoId") as string;
    const result = await courseServerActions.get_video_preview_url(videoId);
    return Response.json(result);
  }

  // Get presigned URL for HLS content with authentication check
  if (intent === "get_hls_presigned_url") {
    const hlsKey = formData.get("hlsKey") as string;
    const courseId = formData.get("courseId") as string;
    const result = await courseServerActions.get_hls_presigned_url(request, hlsKey, courseId);
    return Response.json(result);
  }

  // Get presigned URL for original video content with authentication check
  if (intent === "get_original_video_presigned_url") {
    const s3Key = formData.get("s3Key") as string;
    const courseId = formData.get("courseId") as string;
    const originalUrl = formData.get("originalUrl") as string | undefined;
    const result = await courseServerActions.get_original_video_presigned_url(request, s3Key, courseId, originalUrl);
    return Response.json(result);
  }

  // Trigger manual video processing for admin
  if (intent === "trigger_video_processing") {
    const videoId = formData.get("videoId") as string;
    const result = await courseServerActions.trigger_video_processing(videoId);
    return Response.json(result);
  }

  return Response.json(null);
};
