import type { Route } from "./+types/video-preview-dynamic";
import { Effect } from "effect";
import { s3VideoService } from "~/.server/services/s3-video";
import { getAdminOrRedirect } from "~/.server/dbGetters";

/**
 * Firma una URL del bucket para previsualizarla en el editor de cursos.
 *
 * SOLO ADMIN. El endpoint recibe una URL cualquiera y devuelve su presigned:
 * sin esta puerta era un oráculo de firmas —cualquiera con la key de un video
 * de pago, un PDF o un respaldo obtenía el archivo completo sin sesión.
 * El único consumidor es `useSecureHLS`, que vive en el formulario del admin.
 */
export const action = async ({ request }: Route.ActionArgs) => {
  await getAdminOrRedirect(request);
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