#!/usr/bin/env node

/**
 * CLI para Gestión de Subagentes
 * 
 * Interfaz de línea de comandos para ejecutar y gestionar subagentes.
 * Facilita el descubrimiento y ejecución de subagentes para el Task tool.
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { 
  SUBAGENTS_REGISTRY, 
  SUBAGENT_CATEGORIES,
  getSubagentConfig,
  listSubagents,
  getSubagentsByCategory,
  buildSubagentCommand,
  validateSubagentDependencies
} from "./config.js";

const execAsync = promisify(exec);

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CliResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class SubagentsCli {
  
  /**
   * Listar todos los subagentes disponibles
   */
  async listSubagents(): Promise<CliResult> {
    try {
      const subagents = listSubagents();
      
      console.log("\n📋 SUBAGENTES DISPONIBLES");
      console.log("=" .repeat(50));
      
      // Agrupar por categoría
      const groupedSubagents: Record<string, typeof subagents> = {};
      
      subagents.forEach(subagent => {
        if (!groupedSubagents[subagent.category]) {
          groupedSubagents[subagent.category] = [];
        }
        groupedSubagents[subagent.category].push(subagent);
      });

      // Mostrar por categoría
      Object.entries(groupedSubagents).forEach(([category, categorySubagents]) => {
        const categoryName = SUBAGENT_CATEGORIES[category as keyof typeof SUBAGENT_CATEGORIES] || category;
        console.log(`\n📁 ${categoryName.toUpperCase()}`);
        console.log("-".repeat(30));
        
        categorySubagents.forEach(subagent => {
          console.log(`\n🔧 ${subagent.name} (${subagent.id})`);
          console.log(`   📝 ${subagent.description}`);
          console.log(`   🏃 ${subagent.commands.run}`);
          console.log(`   🔍 Capacidades: ${subagent.capabilities.length}`);
          subagent.capabilities.forEach(cap => {
            console.log(`      • ${cap}`);
          });
        });
      });

      return {
        success: true,
        message: `Se encontraron ${subagents.length} subagentes`,
        data: subagents
      };

    } catch (error) {
      return {
        success: false,
        message: "Error listando subagentes",
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Mostrar información detallada de un subagente
   */
  async showSubagentInfo(id: string): Promise<CliResult> {
    try {
      const config = getSubagentConfig(id);
      
      if (!config) {
        return {
          success: false,
          message: `Subagente '${id}' no encontrado`,
          error: "Subagent not found"
        };
      }

      console.log(`\n🔧 ${config.name}`);
      console.log("=" .repeat(40));
      console.log(`📝 Descripción: ${config.description}`);
      console.log(`🆔 ID: ${config.id}`);
      console.log(`📁 Categoría: ${SUBAGENT_CATEGORIES[config.category as keyof typeof SUBAGENT_CATEGORIES] || config.category}`);
      console.log(`📊 Versión: ${config.version}`);
      console.log(`👤 Autor: ${config.author}`);
      console.log(`📄 Archivo: ${config.filePath}`);
      console.log(`📤 Formato de salida: ${config.outputFormat}`);
      
      console.log(`\n🏃 Comandos:`);
      console.log(`   • Ejecutar: ${config.commands.run}`);
      console.log(`   • Ayuda: ${config.commands.help}`);
      if (config.commands.force) {
        console.log(`   • Forzar: ${config.commands.force}`);
      }
      
      console.log(`\n🔍 Capacidades:`);
      config.capabilities.forEach(cap => {
        console.log(`   • ${cap}`);
      });

      console.log(`\n📦 Dependencias:`);
      if (config.dependencies.length > 0) {
        config.dependencies.forEach(dep => {
          console.log(`   • ${dep}`);
        });
      } else {
        console.log("   • Sin dependencias externas");
      }

      // Validar dependencias
      const validation = await validateSubagentDependencies(id);
      console.log(`\n✅ Validación de dependencias:`);
      if (validation.valid) {
        console.log("   ✅ Todas las dependencias están disponibles");
      } else {
        console.log("   ❌ Dependencias faltantes:");
        validation.missingDependencies.forEach(dep => {
          console.log(`      • ${dep}`);
        });
      }

      return {
        success: true,
        message: "Información mostrada correctamente",
        data: config
      };

    } catch (error) {
      return {
        success: false,
        message: "Error obteniendo información del subagente",
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Ejecutar un subagente
   */
  async runSubagent(id: string, action: 'run' | 'help' | 'force' = 'run', additionalArgs: string[] = []): Promise<CliResult> {
    try {
      const config = getSubagentConfig(id);
      
      if (!config) {
        return {
          success: false,
          message: `Subagente '${id}' no encontrado`,
          error: "Subagent not found"
        };
      }

      // Validar dependencias
      const validation = await validateSubagentDependencies(id);
      if (!validation.valid) {
        return {
          success: false,
          message: "Dependencias faltantes",
          error: `Faltan dependencias: ${validation.missingDependencies.join(", ")}`
        };
      }

      // Construir comando
      const command = buildSubagentCommand(id, action, additionalArgs);
      if (!command) {
        return {
          success: false,
          message: "No se pudo construir el comando",
          error: "Failed to build command"
        };
      }

      console.log(`\n🚀 Ejecutando subagente: ${config.name}`);
      console.log(`📝 Comando: ${command}`);
      console.log("-".repeat(50));

      // Ejecutar comando
      const { stdout, stderr } = await execAsync(command, { 
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      // Mostrar salida
      if (stdout) {
        console.log(stdout);
      }
      
      if (stderr && !stderr.includes("WARNING")) {
        console.error("⚠️ Error output:", stderr);
      }

      // Intentar parsear salida JSON si es aplicable
      let parsedOutput;
      if (config.outputFormat === 'json') {
        try {
          // Buscar JSON en la salida
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedOutput = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Ignorar errores de parsing JSON
        }
      }

      return {
        success: true,
        message: `Subagente '${id}' ejecutado exitosamente`,
        data: parsedOutput || { stdout, stderr }
      };

    } catch (error) {
      return {
        success: false,
        message: `Error ejecutando subagente '${id}'`,
        error: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Mostrar ayuda general
   */
  showHelp(): void {
    console.log(`
🔧 CLI para Gestión de Subagentes - FixterGeek

Uso:
  node cli.ts <comando> [opciones]

Comandos:
  list                    Listar todos los subagentes disponibles
  info <id>              Mostrar información detallada de un subagente
  run <id> [args...]     Ejecutar un subagente
  help <id>              Mostrar ayuda de un subagente específico
  force <id> [args...]   Forzar ejecución de un subagente

Ejemplos:
  node cli.ts list
  node cli.ts info epub-generator
  node cli.ts run epub-generator
  node cli.ts force epub-generator
  node cli.ts help epub-generator

Para más información sobre un subagente específico:
  node cli.ts info <id>
    `);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const cli = new SubagentsCli();

  if (args.length === 0) {
    cli.showHelp();
    process.exit(0);
  }

  const command = args[0];
  const subagentId = args[1];
  const additionalArgs = args.slice(2);

  let result: CliResult;

  try {
    switch (command) {
      case 'list':
        result = await cli.listSubagents();
        break;
        
      case 'info':
        if (!subagentId) {
          console.error("❌ Error: Se requiere ID del subagente");
          process.exit(1);
        }
        result = await cli.showSubagentInfo(subagentId);
        break;
        
      case 'run':
        if (!subagentId) {
          console.error("❌ Error: Se requiere ID del subagente");
          process.exit(1);
        }
        result = await cli.runSubagent(subagentId, 'run', additionalArgs);
        break;
        
      case 'help':
        if (!subagentId) {
          console.error("❌ Error: Se requiere ID del subagente");
          process.exit(1);
        }
        result = await cli.runSubagent(subagentId, 'help', additionalArgs);
        break;
        
      case 'force':
        if (!subagentId) {
          console.error("❌ Error: Se requiere ID del subagente");
          process.exit(1);
        }
        result = await cli.runSubagent(subagentId, 'force', additionalArgs);
        break;
        
      default:
        console.error(`❌ Error: Comando '${command}' no reconocido`);
        cli.showHelp();
        process.exit(1);
    }

    // Mostrar resultado final
    console.log("\n" + "=".repeat(50));
    console.log("📊 RESULTADO");
    console.log("=".repeat(50));
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      if (result.error) {
        console.log(`🔍 Error: ${result.error}`);
      }
    }

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error("❌ Error ejecutando comando:", error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SubagentsCli };