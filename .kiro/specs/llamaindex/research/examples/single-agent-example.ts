/**
 * Ejemplo de Agente Individual - Basado en Documentación Oficial
 *
 * Este ejemplo demuestra cómo crear un agente simple con herramientas
 * usando la API real de LlamaIndex TypeScript Agent Workflows.
 */

import { tool } from "llamaindex";
import { agent } from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";

// Ejemplo 1: Agente Simple con Herramienta Básica
export async function ejemploAgenteBasico() {
  console.log("🤖 Ejemplo 1: Agente Básico con Herramienta");

  // Definir herramienta simple (sintaxis oficial)
  const jokeTool = tool(() => "Baby Llama is called cria", {
    name: "joke",
    description: "Use this tool to get a joke",
  });

  // Crear agente individual
  const jokeAgent = agent({
    tools: [jokeTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Ejecutar el workflow
  const result = await jokeAgent.run("Tell me something funny");

  console.log("Resultado:", result.data.result);
  console.log("Mensaje completo:", result.data.message);

  return result;
}

// Ejemplo 2: Agente con Herramienta Parametrizada
export async function ejemploAgenteConParametros() {
  console.log("\n🛠️ Ejemplo 2: Agente con Herramienta Parametrizada");

  const { z } = await import("zod");

  // Herramienta con parámetros (sintaxis oficial)
  const calculatorTool = tool({
    name: "calculator",
    description: "Perform basic mathematical operations",
    parameters: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number(),
      b: z.number(),
    }),
    execute: ({ operation, a, b }) => {
      switch (operation) {
        case "add":
          return a + b;
        case "subtract":
          return a - b;
        case "multiply":
          return a * b;
        case "divide":
          return b !== 0 ? a / b : "Error: Division by zero";
        default:
          return "Error: Unknown operation";
      }
    },
  });

  // Crear agente con herramienta parametrizada
  const calculatorAgent = agent({
    tools: [calculatorTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Ejecutar cálculo
  const result = await calculatorAgent.run("What is 15 multiplied by 7?");

  console.log("Resultado del cálculo:", result.data.result);

  return result;
}

// Ejemplo 3: Agente con Múltiples Herramientas
export async function ejemploAgenteMultiplesHerramientas() {
  console.log("\n🔧 Ejemplo 3: Agente con Múltiples Herramientas");

  const { z } = await import("zod");

  // Herramienta de información del tiempo
  const weatherTool = tool({
    name: "weatherTool",
    description: "Get weather information for a location",
    parameters: z.object({
      location: z.string(),
    }),
    execute: ({ location }) => {
      // Simulación de datos del clima
      const weatherData = {
        Madrid: "Soleado, 22°C",
        Barcelona: "Nublado, 18°C",
        Valencia: "Lluvioso, 16°C",
      };

      return (
        weatherData[location as keyof typeof weatherData] ||
        `Clima no disponible para ${location}`
      );
    },
  });

  // Herramienta de chistes
  const jokeTool = tool(
    () =>
      "¿Por qué los programadores prefieren el modo oscuro? Porque la luz atrae bugs!",
    {
      name: "joke",
      description: "Get a programming joke in Spanish",
    }
  );

  // Herramienta de consejos
  const tipTool = tool(
    () =>
      "Consejo del día: Siempre comenta tu código como si la persona que lo va a mantener fuera un psicópata violento que sabe dónde vives.",
    {
      name: "tip",
      description: "Get a programming tip in Spanish",
    }
  );

  // Crear agente asistente con múltiples herramientas
  const assistantAgent = agent({
    tools: [weatherTool, jokeTool, tipTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Probar diferentes tipos de consultas
  const weatherResult = await assistantAgent.run(
    "¿Cómo está el clima en Madrid?"
  );
  console.log("Consulta del clima:", weatherResult.data.result);

  const jokeResult = await assistantAgent.run(
    "Cuéntame un chiste de programación"
  );
  console.log("Chiste:", jokeResult.data.result);

  const tipResult = await assistantAgent.run("Dame un consejo de programación");
  console.log("Consejo:", tipResult.data.result);

  return { weatherResult, jokeResult, tipResult };
}

// Función principal para ejecutar todos los ejemplos
export async function ejecutarEjemplosAgenteIndividual() {
  console.log("🚀 Ejecutando Ejemplos de Agente Individual\n");
  console.log("=".repeat(50));

  try {
    await ejemploAgenteBasico();
    await ejemploAgenteConParametros();
    await ejemploAgenteMultiplesHerramientas();

    console.log("\n✅ Todos los ejemplos completados exitosamente!");
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
  ejecutarEjemplosAgenteIndividual();
}
