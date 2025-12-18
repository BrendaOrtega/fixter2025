import type { Route } from "./+types/course";
import { courseServerActions } from "./course.server";

export const action = async ({ request }: Route.ActionArgs) => {
  // await getAdminOrRedirect(request); @todo move to admin api

  const formData = await request.formData();
  const intent = formData.get("intent");

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
    return await courseServerActions.admin_update_video(data);
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
    const result = await courseServerActions.get_original_video_presigned_url(request, s3Key, courseId);
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
