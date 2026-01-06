import type { Route } from "./+types/book-epub";
import {
  BOOK_CONFIG,
  type BookSlug,
} from "~/.server/services/book-access.server";
import { validateBookDownloadToken } from "~/utils/tokens";
import { db } from "~/.server/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Endpoint para descarga de EPUB con Magic Link
 *
 * GET /api/book-epub?book=ai-sdk&token=eyJhbG...
 *
 * El token contiene: email, bookSlug, expiración (30 días)
 * Si el token es válido, genera presigned URL y redirige a descarga
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const bookSlug = url.searchParams.get("book") as BookSlug | null;
  const token = url.searchParams.get("token");

  // Validar que el libro exista
  if (!bookSlug || !BOOK_CONFIG[bookSlug]) {
    return Response.json(
      { success: false, error: "Libro no válido" },
      { status: 400 }
    );
  }

  const config = BOOK_CONFIG[bookSlug];

  // Si no tiene EPUB en S3, no aplica
  if (!config.epubS3Key) {
    return Response.json(
      { success: false, error: "Este libro no tiene EPUB protegido" },
      { status: 400 }
    );
  }

  // Si no hay token, error
  if (!token) {
    return Response.json(
      {
        success: false,
        error: "Se requiere un enlace válido de descarga. Revisa tu email de compra."
      },
      { status: 401 }
    );
  }

  // Validar el token
  const validation = validateBookDownloadToken(token);

  if (!validation.isValid || !validation.decoded) {
    return Response.json(
      { success: false, error: validation.error || "Enlace inválido" },
      { status: 401 }
    );
  }

  const { email, bookSlug: tokenBookSlug } = validation.decoded;

  // Verificar que el bookSlug del token coincida
  if (tokenBookSlug !== bookSlug) {
    return Response.json(
      { success: false, error: "El enlace no corresponde a este libro" },
      { status: 403 }
    );
  }

  // Verificar que el usuario realmente haya comprado el libro
  const user = await db.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      books: { has: bookSlug }
    },
  });

  if (!user) {
    console.log(`[Book EPUB] Token válido pero usuario no encontrado o no compró: ${email}, ${bookSlug}`);
    return Response.json(
      {
        success: false,
        error: "No encontramos una compra asociada a este email"
      },
      { status: 403 }
    );
  }

  // Generar presigned URL para descarga
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "wild-bird-2039",
      Key: config.epubS3Key,
      ResponseContentDisposition: `attachment; filename="${config.epubFilename}"`,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hora
    });

    console.log(`[Book EPUB] Descarga autorizada: ${email} → ${bookSlug}`);

    // Redirigir a la descarga
    return Response.redirect(presignedUrl, 302);
  } catch (error) {
    console.error("[Book EPUB] Error generando presigned URL:", error);
    return Response.json(
      { success: false, error: "Error generando enlace de descarga" },
      { status: 500 }
    );
  }
}
