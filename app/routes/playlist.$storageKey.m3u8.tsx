import type { LoaderFunctionArgs } from "react-router";

// Genera el master playlist dinámicamente para videos de animaciones
// Los chunks están en S3: animaciones/chunks/{storageKey}/
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const storageKey = params.storageKey;
  if (!storageKey) {
    throw new Response("Not found", { status: 404 });
  }

  // Calidades disponibles (hardcoded por ahora, igual que la app original)
  const sizes = ["360p", "480p", "720p", "1080p"];

  let content = "#EXTM3U\n";
  if (sizes.includes("360p")) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=150000,RESOLUTION=640x360\n/playlist/${storageKey}/360p.m3u8\n`;
  }
  if (sizes.includes("480p")) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=240000,RESOLUTION=854x480\n/playlist/${storageKey}/480p.m3u8\n`;
  }
  if (sizes.includes("720p")) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=440000,RESOLUTION=1280x720\n/playlist/${storageKey}/720p.m3u8\n`;
  }
  if (sizes.includes("1080p")) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=640000,RESOLUTION=1920x1080\n/playlist/${storageKey}/1080p.m3u8`;
  }

  return new Response(content, {
    headers: {
      "Content-Type": "application/x-mpegURL",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
