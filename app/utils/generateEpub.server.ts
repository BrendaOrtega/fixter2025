import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function generateEpub(): Promise<Buffer> {
  try {
    // Ruta del script Python
    const scriptPath = path.join(process.cwd(), "app", "scripts", "generate_epub.py");
    
    // Ejecutar el script Python para generar el EPUB
    console.log("Ejecutando script Python para generar EPUB...");
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`);
    
    if (stderr && !stderr.includes("WARNING")) {
      console.error("Error del script Python:", stderr);
    }
    
    console.log("Salida del script:", stdout);
    
    // Leer el archivo EPUB generado
    const epubPath = path.join(process.cwd(), "public", "dominando-claude-code.epub");
    const epubBuffer = await fs.readFile(epubPath);
    
    console.log(`EPUB leído correctamente: ${epubBuffer.length} bytes`);
    
    return epubBuffer;
  } catch (error) {
    console.error("Error generando EPUB:", error);
    throw new Error("No se pudo generar el archivo EPUB");
  }
}