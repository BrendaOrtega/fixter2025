import type { Route } from "./+types/download-epub";
import { generateEpub } from "~/utils/generateEpub.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  try {
    // Generar el EPUB dinámicamente
    const epubBuffer = await generateEpub();
    
    // Devolver el archivo como descarga
    return new Response(epubBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": 'attachment; filename="dominando-claude-code.epub"',
        "Content-Length": epubBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generando EPUB:", error);
    return new Response("Error generando el archivo EPUB", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
};