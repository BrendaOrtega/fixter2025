#!/usr/bin/env node

/**
 * Document Generator Subagent
 * 
 * Subagente especializado para generar archivos EPUB y PDF del libro "Dominando Claude Code"
 * y temarios del taller Claude Code.
 * Puede ser usado con el Task tool para automatizar la generación de documentos.
 * 
 * Funciones:
 * - Regenerar archivo EPUB usando el script Python existente
 * - Generar PDF del temario del taller con información actualizada
 * - Verificar si los archivos fuente han sido modificados
 * - Validar que los archivos se generaron exitosamente
 * - Devolver información de los archivos generados (ruta y tamaño)
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

// Obtener directorio actual del archivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

interface DocumentGeneratorResult {
  success: boolean;
  message: string;
  epubPath?: string;
  pdfPath?: string;
  epubFileSize?: number;
  pdfFileSize?: number;
  generatedAt?: string;
  chaptersProcessed?: number;
  documentsGenerated?: string[];
  error?: string;
}

interface ChapterInfo {
  id: string;
  title: string;
  slug: string;
}

const CHAPTERS: ChapterInfo[] = [
  { id: "prologo", title: "Prólogo", slug: "prologo" },
  { id: "intro", title: "Introducción", slug: "introduccion" },
  { id: "01", title: "Fundamentos para administrar mejor el contexto", slug: "capitulo-01" },
  { id: "02", title: "SDK - Automatización y Scripting", slug: "capitulo-02" },
  { id: "03", title: "CLAUDE.md - La Memoria Persistente del Proyecto", slug: "capitulo-03" },
  { id: "04", title: "Comandos CLI Básicos - El Punto de Entrada", slug: "capitulo-04" },
  { id: "05", title: "Slash Commands Completos - Control de Sesión Avanzado", slug: "capitulo-05" },
  { id: "06", title: "Git Worktree - Desarrollo en paralelo", slug: "capitulo-06" },
  { id: "07", title: "Usando GitHub MCP Básicamente", slug: "capitulo-07" },
  { id: "08", title: "Usando GitHub MCP de Forma Avanzada", slug: "capitulo-08" },
  { id: "09", title: "Entendiendo los JSON MCPs", slug: "capitulo-09" },
  { id: "10", title: "Fundamentos de SubAgentes", slug: "capitulo-10" },
  { id: "11", title: "SubAgentes Avanzados", slug: "capitulo-11" },
  { id: "12", title: "El Camino Hacia Adelante", slug: "capitulo-12" },
];

class DocumentGenerator {
  private scriptsPath: string;
  private contentPath: string;
  private publicPath: string;
  private epubPath: string;
  private pdfPath: string;
  private pdfGeneratorPath: string;

  constructor() {
    this.scriptsPath = path.join(projectRoot, "app", "scripts");
    this.contentPath = path.join(projectRoot, "app", "content", "libro");
    this.publicPath = path.join(projectRoot, "public");
    this.epubPath = path.join(this.publicPath, "dominando-claude-code.epub");
    this.pdfPath = path.join(this.publicPath, "temario-claude-code.pdf");
    this.pdfGeneratorPath = path.join(projectRoot, "generate_temario_pdf.py");
  }

  /**
   * Verifica si los archivos de capítulos han sido modificados desde la última generación
   */
  async checkForModifications(): Promise<{ hasModifications: boolean; modifiedFiles: string[] }> {
    try {
      // Obtener timestamp del archivo EPUB actual
      let epubStats;
      try {
        epubStats = await fs.stat(this.epubPath);
      } catch {
        // Si el archivo no existe, considerarlo como que necesita generación
        return { hasModifications: true, modifiedFiles: ["EPUB no existe"] };
      }

      const epubModTime = epubStats.mtime;
      const modifiedFiles: string[] = [];

      // Verificar cada capítulo
      for (const chapter of CHAPTERS) {
        const chapterPath = path.join(this.contentPath, `${chapter.slug}.md`);
        
        try {
          const chapterStats = await fs.stat(chapterPath);
          
          // Si el capítulo fue modificado después del EPUB
          if (chapterStats.mtime > epubModTime) {
            modifiedFiles.push(`${chapter.slug}.md`);
          }
        } catch (error) {
          // Si no se puede leer el archivo, lo marcamos como modificado
          modifiedFiles.push(`${chapter.slug}.md (no encontrado)`);
        }
      }

      return {
        hasModifications: modifiedFiles.length > 0,
        modifiedFiles
      };
    } catch (error) {
      console.error("Error verificando modificaciones:", error);
      return { hasModifications: true, modifiedFiles: ["Error verificando archivos"] };
    }
  }

  /**
   * Genera el archivo EPUB usando el script Python existente
   */
  async generateEpub(): Promise<DocumentGeneratorResult> {
    try {
      console.log("🚀 Iniciando generación de EPUB...");
      
      // Verificar que el script Python existe
      const pythonScript = path.join(this.scriptsPath, "generate_epub.py");
      
      try {
        await fs.access(pythonScript);
      } catch {
        return {
          success: false,
          message: "Error: Script Python no encontrado",
          error: `Script no existe en: ${pythonScript}`
        };
      }

      // Ejecutar el script Python
      console.log("📝 Ejecutando script Python para generar EPUB...");
      const { stdout, stderr } = await execAsync(`python3 "${pythonScript}"`);

      // Verificar si hay errores críticos
      if (stderr && !stderr.includes("WARNING") && !stderr.includes("UserWarning")) {
        console.error("Error del script Python:", stderr);
        return {
          success: false,
          message: "Error ejecutando script Python",
          error: stderr
        };
      }

      console.log("Salida del script:", stdout);

      // Verificar que el archivo EPUB se generó correctamente
      let epubStats;
      try {
        epubStats = await fs.stat(this.epubPath);
      } catch {
        return {
          success: false,
          message: "Error: El archivo EPUB no fue generado",
          error: "Archivo no encontrado después de la ejecución del script"
        };
      }

      // Contar capítulos procesados desde la salida del script
      const processedMatches = stdout.match(/✓ Procesado:/g);
      const chaptersProcessed = processedMatches ? processedMatches.length : 0;

      console.log(`✅ EPUB generado exitosamente: ${this.epubPath}`);
      console.log(`   Tamaño: ${(epubStats.size / 1024).toFixed(2)} KB`);

      return {
        success: true,
        message: "EPUB generado exitosamente",
        epubPath: this.epubPath,
        fileSize: epubStats.size,
        generatedAt: new Date().toISOString(),
        chaptersProcessed
      };

    } catch (error) {
      console.error("Error generando EPUB:", error);
      return {
        success: false,
        message: "Error generando EPUB",
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Verifica la integridad del archivo EPUB generado
   */
  async validateEpub(): Promise<{ isValid: boolean; message: string }> {
    try {
      // Verificar que el archivo existe y tiene un tamaño razonable
      const stats = await fs.stat(this.epubPath);
      
      if (stats.size < 1000) {
        return {
          isValid: false,
          message: "El archivo EPUB es demasiado pequeño (posiblemente corrupto)"
        };
      }

      // Verificar que es un archivo ZIP válido (los EPUB son archivos ZIP)
      const buffer = await fs.readFile(this.epubPath);
      const isZip = buffer.length > 4 && 
                   buffer[0] === 0x50 && 
                   buffer[1] === 0x4B && 
                   (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
                   (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

      if (!isZip) {
        return {
          isValid: false,
          message: "El archivo EPUB no parece ser un archivo ZIP válido"
        };
      }

      return {
        isValid: true,
        message: "El archivo EPUB es válido"
      };

    } catch (error) {
      return {
        isValid: false,
        message: `Error validando EPUB: ${error instanceof Error ? error.message : "Error desconocido"}`
      };
    }
  }

  /**
   * Genera el archivo PDF del temario usando el script Python
   */
  async generatePdf(): Promise<DocumentGeneratorResult> {
    try {
      console.log("📄 Iniciando generación de PDF del temario...");
      
      // Verificar que el script Python existe
      try {
        await fs.access(this.pdfGeneratorPath);
      } catch {
        return {
          success: false,
          message: "Error: Script generador de PDF no encontrado",
          error: `Script no existe en: ${this.pdfGeneratorPath}`
        };
      }

      // Ejecutar el script Python
      console.log("📝 Ejecutando script Python para generar PDF del temario...");
      const { stdout, stderr } = await execAsync(`python3 "${this.pdfGeneratorPath}"`);

      // Verificar si hay errores críticos
      if (stderr && !stderr.includes("WARNING") && !stderr.includes("UserWarning")) {
        console.error("Error del script Python:", stderr);
        return {
          success: false,
          message: "Error ejecutando script generador de PDF",
          error: stderr
        };
      }

      console.log("Salida del script:", stdout);

      // Verificar que el archivo PDF se generó correctamente
      let pdfStats;
      try {
        pdfStats = await fs.stat(this.pdfPath);
      } catch {
        return {
          success: false,
          message: "Error: El archivo PDF no fue generado",
          error: "Archivo no encontrado después de la ejecución del script"
        };
      }

      console.log(`✅ PDF generado exitosamente: ${this.pdfPath}`);
      console.log(`   Tamaño: ${(pdfStats.size / 1024).toFixed(2)} KB`);

      return {
        success: true,
        message: "PDF del temario generado exitosamente",
        pdfPath: this.pdfPath,
        pdfFileSize: pdfStats.size,
        generatedAt: new Date().toISOString(),
        documentsGenerated: ["PDF"]
      };

    } catch (error) {
      console.error("Error generando PDF:", error);
      return {
        success: false,
        message: "Error generando PDF del temario",
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Función principal del subagente - verifica modificaciones y genera documentos según se requiera
   */
  async run(options: { forceRegenerate?: boolean; generateEpub?: boolean; generatePdf?: boolean } = {}): Promise<DocumentGeneratorResult> {
    try {
      const { forceRegenerate = false, generateEpub = true, generatePdf = false } = options;
      console.log("📚 Subagente Document Generator iniciado");
      console.log(`   - EPUB: ${generateEpub ? '✅' : '❌'}`); 
      console.log(`   - PDF: ${generatePdf ? '✅' : '❌'}`);
      
      const results: DocumentGeneratorResult = {
        success: true,
        message: "Documentos procesados exitosamente",
        documentsGenerated: [],
        generatedAt: new Date().toISOString()
      };

      // Generar EPUB si se solicita
      if (generateEpub) {
        if (!forceRegenerate) {
          // Verificar si hay modificaciones
          const { hasModifications, modifiedFiles } = await this.checkForModifications();
          
          if (!hasModifications) {
            // Validar que el archivo actual es válido
            const validation = await this.validateEpub();
            
            if (validation.isValid) {
              const stats = await fs.stat(this.epubPath);
              console.log("✅ EPUB ya está actualizado, no se requiere regeneración");
              results.epubPath = this.epubPath;
              results.epubFileSize = stats.size;
              results.chaptersProcessed = CHAPTERS.length;
              results.documentsGenerated!.push("EPUB (ya actualizado)");
            } else {
              console.log("⚠️ EPUB existente no es válido, regenerando...");
              const epubResult = await this.generateEpub();
              if (epubResult.success) {
                results.epubPath = epubResult.epubPath;
                results.epubFileSize = epubResult.fileSize;
                results.chaptersProcessed = epubResult.chaptersProcessed;
                results.documentsGenerated!.push("EPUB (regenerado)");
              } else {
                results.success = false;
                results.error = epubResult.error;
                return results;
              }
            }
          } else {
            console.log(`📝 Modificaciones detectadas en: ${modifiedFiles.join(", ")}`);
            const epubResult = await this.generateEpub();
            if (epubResult.success) {
              results.epubPath = epubResult.epubPath;
              results.epubFileSize = epubResult.fileSize;
              results.chaptersProcessed = epubResult.chaptersProcessed;
              results.documentsGenerated!.push("EPUB (actualizado)");
            } else {
              results.success = false;
              results.error = epubResult.error;
              return results;
            }
          }
        } else {
          const epubResult = await this.generateEpub();
          if (epubResult.success) {
            results.epubPath = epubResult.epubPath;
            results.epubFileSize = epubResult.fileSize;
            results.chaptersProcessed = epubResult.chaptersProcessed;
            results.documentsGenerated!.push("EPUB (forzado)");
          } else {
            results.success = false;
            results.error = epubResult.error;
            return results;
          }
        }
      }

      // Generar PDF si se solicita
      if (generatePdf) {
        const pdfResult = await this.generatePdf();
        if (pdfResult.success) {
          results.pdfPath = pdfResult.pdfPath;
          results.pdfFileSize = pdfResult.pdfFileSize;
          results.documentsGenerated!.push("PDF");
        } else {
          results.success = false;
          results.error = pdfResult.error;
          return results;
        }
      }

      // Si no se generó ningún documento
      if (results.documentsGenerated!.length === 0) {
        results.message = "No se solicitó la generación de ningún documento";
      }

      return results;

    } catch (error) {
      console.error("Error en subagente Document Generator:", error);
      return {
        success: false,
        message: "Error ejecutando subagente Document Generator",
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }
}

// CLI Interface para usar como subagente
async function main() {
  const args = process.argv.slice(2);
  const forceRegenerate = args.includes("--force") || args.includes("-f");
  const generateEpub = args.includes("--epub") || (!args.includes("--pdf") && !args.includes("--epub"));
  const generatePdf = args.includes("--pdf") || args.includes("--temario");
  const helpRequested = args.includes("--help") || args.includes("-h");

  if (helpRequested) {
    console.log(`
📚 Document Generator Subagent
Subagente especializado para generar archivos EPUB y PDF del proyecto Claude Code

Uso:
  node epub-generator.ts [opciones]

Opciones:
  --epub         Generar archivo EPUB del libro (por defecto si no se especifica nada)
  --pdf, --temario  Generar archivo PDF del temario del taller
  --force, -f    Forzar regeneración incluso si no hay cambios
  --help, -h     Mostrar esta ayuda

Ejemplos:
  node epub-generator.ts --epub          # Solo generar EPUB
  node epub-generator.ts --pdf           # Solo generar PDF
  node epub-generator.ts --epub --pdf    # Generar ambos
  node epub-generator.ts --force --pdf   # Forzar regeneración del PDF

Funciones:
  ✅ Verificar modificaciones en archivos fuente
  ✅ Generar EPUB del libro usando script Python existente
  ✅ Generar PDF del temario del taller
  ✅ Validar integridad de archivos generados
  ✅ Devolver información detallada del resultado
    `);
    process.exit(0);
  }

  const generator = new DocumentGenerator();
  const result = await generator.run({ 
    forceRegenerate, 
    generateEpub, 
    generatePdf 
  });

  // Salida estructurada para usar con Task tool
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTADO DEL SUBAGENTE DOCUMENT GENERATOR");
  console.log("=".repeat(60));
  console.log(JSON.stringify(result, null, 2));

  process.exit(result.success ? 0 : 1);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Exportar para uso programático
export { DocumentGenerator };
export type { DocumentGeneratorResult, ChapterInfo };