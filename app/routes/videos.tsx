import { data, type LoaderFunctionArgs, redirect } from "react-router";
import { getUserOrNull } from "~/.server/dbGetters";
import { getReadURL } from "~/.server/tigrs";

// Endpoint para servir videos por storageKey
// Compatible con el formato legacy /videos?storageKey=video-XXX
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserOrNull(request);

  const url = new URL(request.url);
  const storageKey = url.searchParams.get("storageKey");

  if (!storageKey) {
    throw data("storageKey requerido", { status: 400 });
  }

  // Para videos, el storageKey tiene formato "video-{id}"
  // Necesitamos construir la ruta completa en S3
  const s3Key = `fixtergeek/videos/${storageKey}`;

  try {
    const readURL = await getReadURL(s3Key);
    return redirect(readURL);
  } catch (error) {
    console.error("Error getting video URL:", error);
    throw data("Video no encontrado", { status: 404 });
  }
};
