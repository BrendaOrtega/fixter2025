import type { Route } from "./+types/download-epub";
import { generateEpub } from "~/utils/generateEpub.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  try {
    // Generar el EPUB
    const epubBuffer = await generateEpub();
    
    // Configurar headers para descarga
    return new Response(epubBuffer, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": 'attachment; filename="dominando-claude-code.epub"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error en endpoint de descarga EPUB:", error);
    return new Response("Error generando el archivo EPUB", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
};