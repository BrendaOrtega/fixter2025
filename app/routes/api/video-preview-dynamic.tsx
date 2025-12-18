import type { Route } from "./+types/video-preview-dynamic";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";

export const action = async ({ request }: Route.ActionArgs) => {
  try {
    const { originalUrl, expiresIn } = await request.json();

    if (!originalUrl) {
      return Response.json({ 
        success: false, 
        error: "originalUrl is required" 
      });
    }

    // Use dynamic presigned URL generation
    const presignedUrl = await Effect.runPromise(
      s3VideoService.getVideoPreviewUrlDynamic(originalUrl, expiresIn || 3600)
    );

    return Response.json({
      success: true,
      presignedUrl
    });

  } catch (error) {
    console.error("Error generating dynamic presigned URL:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate presigned URL"
    });
  }
};