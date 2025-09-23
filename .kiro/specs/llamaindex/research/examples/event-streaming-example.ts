/**
 * Ejemplo de Streaming de Eventos - Basado en Documentación Oficial
 *
 * Este ejemplo demuestra el sistema unificado de streaming de eventos
 * para seguimiento en tiempo real de la ejecución de Agent Workflows.
 */

import { tool } from "llamaindex";
import {
  agent,
  agentToolCallEvent,
  agentStreamEvent,
} from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";
import { z } from "zod";

// Ejemplo 1: Streaming Básico (Basado en Documentación Oficial)
export async function ejemploStreamingBasico() {
  console.log("🌊 Ejemplo 1: Streaming Básico de Eventos");

  // Crear herramienta simple (ejemplo oficial)
  const jokeTool = tool(() => "Baby Llama is called cria", {
    name: "joke",
    description: "Use this tool to get a joke",
  });

  // Crear agente
  const jokeAgent = agent({
    tools: [jokeTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Obtener contexto de streaming (sintaxis oficial)
  const events = jokeAgent.runStream("Tell me something funny");

  console.log("Iniciando streaming...\n");

  // Procesar eventos en tiempo real (ejemplo oficial)
  for await (const event of events) {
    if (agentToolCallEvent.include(event)) {
      console.log(`🔧 Herramienta llamada: ${event.data.toolName}`);
    }
    if (agentStreamEvent.include(event)) {
      process.stdout.write(event.data.delta);
    }
  }

  console.log("\n\n✅ Streaming completado");
}

// Ejemplo 2: Streaming con Múltiples Herramientas
export async function ejemploStreamingMultiplesHerramientas() {
  console.log("\n🛠️ Ejemplo 2: Streaming con Múltiples Herramientas");

  // Herramienta de búsqueda
  const searchTool = tool({
    name: "search",
    description: "Search for information on a topic",
    parameters: z.object({
      query: z.string(),
    }),
    execute: ({ query }) => {
      // Simular búsqueda con delay
      return `Resultados de búsqueda para "${query}": Encontrados 5 artículos relevantes sobre TypeScript y Agent Workflows. Los artículos cubren conceptos básicos, patrones avanzados, mejores prácticas, casos de uso reales y optimización de rendimiento.`;
    },
  });

  // Herramienta de análisis
  const analysisTool = tool({
    name: "analyze",
    description: "Analyze and summarize information",
    parameters: z.object({
      content: z.string(),
    }),
    execute: ({ content }) => {
      return `Análisis del contenido: "${content.substring(
        0,
        50
      )}...". El contenido es técnico, bien estructurado y proporciona información valiosa sobre desarrollo con TypeScript. Nivel de complejidad: intermedio. Recomendado para desarrolladores con experiencia básica.`;
    },
  });

  // Crear agente con múltiples herramientas
  const researchAgent = agent({
    tools: [searchTool, analysisTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Streaming con seguimiento detallado
  const events = researchAgent.runStream(
    "Search for information about TypeScript Agent Workflows and analyze the results"
  );

  console.log("Iniciando investigación con streaming...\n");

  let toolCallCount = 0;
  let streamContent = "";

  for await (const event of events) {
    if (agentToolCallEvent.include(event)) {
      toolCallCount++;
      console.log(
        `\n🔧 [${toolCallCount}] Ejecutando herramienta: ${event.data.toolName}`
      );
      console.log("⏳ Procesando...");
    }

    if (agentStreamEvent.include(event)) {
      process.stdout.write(event.data.delta);
      streamContent += event.data.delta;
    }
  }

  console.log(`\n\n📊 Resumen del streaming:`);
  console.log(`- Herramientas ejecutadas: ${toolCallCount}`);
  console.log(`- Caracteres transmitidos: ${streamContent.length}`);
  console.log("✅ Investigación completada");
}

// Ejemplo 3: Streaming con Manejo de Errores
export async function ejemploStreamingConErrores() {
  console.log("\n⚠️ Ejemplo 3: Streaming con Manejo de Errores");

  // Herramienta que puede fallar
  const unreliableTool = tool({
    name: "unreliable",
    description: "A tool that sometimes fails",
    parameters: z.object({
      action: z.string(),
    }),
    execute: ({ action }) => {
      // Simular fallo ocasional
      if (Math.random() < 0.3) {
        throw new Error(`Fallo simulado ejecutando: ${action}`);
      }
      return `Acción "${action}" ejecutada exitosamente. Resultado: operación completada sin problemas.`;
    },
  });

  // Herramienta de respaldo
  const backupTool = tool({
    name: "backup",
    description: "Backup tool that always works",
    execute: () => {
      return "Herramienta de respaldo ejecutada. Proporcionando resultado alternativo confiable.";
    },
  });

  // Crear agente con herramientas
  const resilientAgent = agent({
    tools: [unreliableTool, backupTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  try {
    const events = resilientAgent.runStream(
      "Try to perform an action, and use backup if needed"
    );

    console.log("Iniciando operación con posibles fallos...\n");

    for await (const event of events) {
      if (agentToolCallEvent.include(event)) {
        console.log(`🔧 Intentando herramienta: ${event.data.toolName}`);
      }

      if (agentStreamEvent.include(event)) {
        process.stdout.write(event.data.delta);
      }
    }

    console.log("\n✅ Operación completada (con o sin respaldo)");
  } catch (error) {
    console.log(`\n❌ Error en streaming: ${error}`);
    console.log("💡 En producción, implementar manejo robusto de errores");
  }
}

// Ejemplo 4: Streaming con Métricas de Rendimiento
export async function ejemploStreamingConMetricas() {
  console.log("\n📈 Ejemplo 4: Streaming con Métricas de Rendimiento");

  // Herramienta de procesamiento intensivo
  const heavyProcessingTool = tool({
    name: "heavyProcessing",
    description: "Perform intensive data processing",
    parameters: z.object({
      dataSize: z.string(),
    }),
    execute: async ({ dataSize }) => {
      // Simular procesamiento con delay
      const delay =
        dataSize === "large" ? 2000 : dataSize === "medium" ? 1000 : 500;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return `Procesamiento de datos ${dataSize} completado. Se procesaron 1000 registros, se aplicaron 5 transformaciones, y se generaron 3 reportes de análisis.`;
    },
  });

  // Crear agente de procesamiento
  const processingAgent = agent({
    tools: [heavyProcessingTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Métricas de rendimiento
  const startTime = Date.now();
  let firstToolCall = 0;
  let firstStreamData = 0;
  let toolCalls = 0;
  let streamChunks = 0;

  const events = processingAgent.runStream(
    "Process a large dataset and provide detailed analysis"
  );

  console.log("Iniciando procesamiento con métricas...\n");

  for await (const event of events) {
    if (agentToolCallEvent.include(event)) {
      toolCalls++;
      if (firstToolCall === 0) {
        firstToolCall = Date.now() - startTime;
      }
      console.log(
        `🔧 [${toolCalls}] Herramienta: ${event.data.toolName} (${
          Date.now() - startTime
        }ms)`
      );
    }

    if (agentStreamEvent.include(event)) {
      streamChunks++;
      if (firstStreamData === 0) {
        firstStreamData = Date.now() - startTime;
      }
      process.stdout.write(event.data.delta);
    }
  }

  const totalTime = Date.now() - startTime;

  console.log(`\n\n📊 Métricas de Rendimiento:`);
  console.log(`- Tiempo total: ${totalTime}ms`);
  console.log(`- Tiempo hasta primera herramienta: ${firstToolCall}ms`);
  console.log(`- Tiempo hasta primer stream: ${firstStreamData}ms`);
  console.log(`- Total de herramientas ejecutadas: ${toolCalls}`);
  console.log(`- Total de chunks de stream: ${streamChunks}`);
  console.log(
    `- Chunks por segundo: ${(streamChunks / (totalTime / 1000)).toFixed(2)}`
  );
}

// Función principal para ejecutar todos los ejemplos
export async function ejecutarEjemplosEventStreaming() {
  console.log("🚀 Ejecutando Ejemplos de Event Streaming\n");
  console.log("=".repeat(60));

  try {
    await ejemploStreamingBasico();
    await ejemploStreamingMultiplesHerramientas();
    await ejemploStreamingConErrores();
    await ejemploStreamingConMetricas();

    console.log("\n✅ Todos los ejemplos de streaming completados!");
    console.log("\n💡 Beneficios del Event Streaming:");
    console.log("- Seguimiento en tiempo real de la ejecución");
    console.log("- Mejor experiencia de usuario con feedback inmediato");
    console.log("- Capacidad de monitoreo y debugging");
    console.log("- Métricas de rendimiento detalladas");
    console.log("- Manejo de operaciones de larga duración");
  } catch (error) {
    console.error("❌ Error ejecutando ejemplos:", error);
    console.log("\n💡 Nota: Estos ejemplos requieren:");
    console.log(
      "- npm install llamaindex @llamaindex/workflow @llamaindex/openai zod"
    );
    console.log("- Variable de entorno OPENAI_API_KEY configurada");
  }
}

// Ejecutar si el archivo se ejecuta directamente
if (require.main === module) {
  ejecutarEjemplosEventStreaming();
}
