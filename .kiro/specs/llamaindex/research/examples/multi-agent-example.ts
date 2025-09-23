/**
 * Ejemplo de Workflow Multi-Agente - Basado en Documentación Oficial
 *
 * Este ejemplo demuestra cómo orquestar múltiples agentes especializados
 * con delegación de tareas, según la API oficial de LlamaIndex.
 */

import { tool } from "llamaindex";
import { agent, multiAgent } from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";
import { z } from "zod";

// Ejemplo 1: Sistema Multi-Agente Básico (Basado en Documentación Oficial)
export async function ejemploMultiAgenteBasico() {
  console.log("🤝 Ejemplo 1: Sistema Multi-Agente Básico");

  // Herramienta del clima (ejemplo oficial)
  const weatherTool = tool({
    name: "fetchWeather",
    description: "Get weather information for a city",
    parameters: z.object({
      city: z.string(),
    }),
    execute: ({ city }) => `The weather in ${city} is sunny`,
  });

  // Herramienta de chistes (ejemplo oficial)
  const jokeTool = tool(() => "Baby Llama is called cria", {
    name: "joke",
    description: "Use this tool to get a joke",
  });

  // Crear agente del clima (sintaxis oficial)
  const weatherAgent = agent({
    name: "WeatherAgent",
    description: "Provides weather information for any city",
    tools: [weatherTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Crear agente de chistes con capacidad de delegación (sintaxis oficial)
  const jokeAgent = agent({
    name: "JokeAgent",
    description: "Tells jokes and funny stories",
    tools: [jokeTool],
    llm: openai({ model: "gpt-4o-mini" }),
    canHandoffTo: [weatherAgent], // Puede delegar al agente del clima
  });

  // Crear workflow multi-agente (sintaxis oficial)
  const agents = multiAgent({
    agents: [jokeAgent, weatherAgent],
    rootAgent: jokeAgent, // Agente inicial
  });

  // Ejecutar consulta que requiere ambos agentes
  const result = await agents.run(
    "Give me a morning greeting with a joke and the weather in San Francisco"
  );

  console.log("Resultado del sistema multi-agente:");
  console.log(result.data.result);

  return result;
}

// Ejemplo 2: Sistema de Soporte Técnico Multi-Agente
export async function ejemploSoporteTecnico() {
  console.log("\n🛠️ Ejemplo 2: Sistema de Soporte Técnico Multi-Agente");

  // Herramientas especializadas
  const diagnosticTool = tool({
    name: "runDiagnostic",
    description: "Run system diagnostic checks",
    parameters: z.object({
      system: z.string(),
      issue: z.string(),
    }),
    execute: ({ system, issue }) => {
      const diagnostics = {
        network: `Diagnóstico de red: Conectividad OK, latencia 45ms, ancho de banda 100Mbps. Issue "${issue}" identificado como problema de DNS.`,
        database: `Diagnóstico de BD: Conexiones activas 25/100, memoria 60% utilizada, consultas lentas detectadas. Issue "${issue}" relacionado con índices faltantes.`,
        server: `Diagnóstico de servidor: CPU 30%, RAM 45%, disco 70%. Issue "${issue}" causado por proceso zombie.`,
      };
      return (
        diagnostics[system as keyof typeof diagnostics] ||
        `Diagnóstico no disponible para ${system}`
      );
    },
  });

  const fixTool = tool({
    name: "applyFix",
    description: "Apply a fix to resolve an issue",
    parameters: z.object({
      issue: z.string(),
      solution: z.string(),
    }),
    execute: ({ issue, solution }) => {
      return `Aplicando solución "${solution}" para el problema "${issue}". Fix aplicado exitosamente. Sistema funcionando normalmente.`;
    },
  });

  const escalationTool = tool({
    name: "escalateIssue",
    description: "Escalate complex issues to senior support",
    parameters: z.object({
      issue: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
    }),
    execute: ({ issue, priority }) => {
      return `Issue "${issue}" escalado con prioridad ${priority}. Ticket #${Math.floor(
        Math.random() * 10000
      )} creado para equipo senior.`;
    },
  });

  // Agente de diagnóstico
  const diagnosticAgent = agent({
    name: "DiagnosticAgent",
    description: "Specializes in system diagnostics and problem identification",
    tools: [diagnosticTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Agente de soluciones
  const fixAgent = agent({
    name: "FixAgent",
    description: "Applies fixes and solutions to identified problems",
    tools: [fixTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Agente de escalación
  const escalationAgent = agent({
    name: "EscalationAgent",
    description: "Handles complex issues that require senior support",
    tools: [escalationTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Agente coordinador con acceso a todos los demás
  const supportCoordinator = agent({
    name: "SupportCoordinator",
    description:
      "Coordinates technical support requests and delegates to specialized agents",
    tools: [], // Sin herramientas propias, solo coordina
    llm: openai({ model: "gpt-4o-mini" }),
    canHandoffTo: [diagnosticAgent, fixAgent, escalationAgent],
  });

  // Sistema multi-agente de soporte
  const supportSystem = multiAgent({
    agents: [supportCoordinator, diagnosticAgent, fixAgent, escalationAgent],
    rootAgent: supportCoordinator,
  });

  // Procesar solicitud de soporte
  const result = await supportSystem.run(
    "I'm having network connectivity issues. The internet is very slow and some websites won't load. Can you help diagnose and fix this?"
  );

  console.log("Respuesta del sistema de soporte:");
  console.log(result.data.result);

  return result;
}

// Ejemplo 3: Sistema de Análisis de Datos Multi-Agente
export async function ejemploAnalisisDatos() {
  console.log("\n📊 Ejemplo 3: Sistema de Análisis de Datos Multi-Agente");

  // Herramientas de análisis
  const dataCollectionTool = tool({
    name: "collectData",
    description: "Collect data from various sources",
    parameters: z.object({
      source: z.string(),
      timeframe: z.string(),
    }),
    execute: ({ source, timeframe }) => {
      return `Datos recopilados de ${source} para el período ${timeframe}: 10,000 registros, 15 columnas, calidad de datos 95%. Incluye métricas de ventas, usuarios activos, y engagement.`;
    },
  });

  const statisticalAnalysisTool = tool({
    name: "performStatistics",
    description: "Perform statistical analysis on data",
    parameters: z.object({
      data: z.string(),
      analysisType: z.string(),
    }),
    execute: ({ data, analysisType }) => {
      return `Análisis estadístico ${analysisType} completado: Media 45.2, mediana 42.1, desviación estándar 12.8. Correlación significativa encontrada (r=0.73). Tendencia ascendente del 15% detectada.`;
    },
  });

  const visualizationTool = tool({
    name: "createVisualization",
    description: "Create data visualizations and charts",
    parameters: z.object({
      dataType: z.string(),
      chartType: z.string(),
    }),
    execute: ({ dataType, chartType }) => {
      return `Visualización ${chartType} creada para ${dataType}: Gráfico interactivo con 3 series de datos, filtros dinámicos, y exportación a PDF. Dashboard actualizado con nuevos insights.`;
    },
  });

  const reportTool = tool({
    name: "generateReport",
    description: "Generate comprehensive analysis reports",
    parameters: z.object({
      findings: z.string(),
      format: z.string(),
    }),
    execute: ({ findings, format }) => {
      return `Reporte ${format} generado con hallazgos: "${findings}". Incluye resumen ejecutivo, metodología, resultados detallados, y recomendaciones. 25 páginas con 12 gráficos.`;
    },
  });

  // Agentes especializados
  const dataCollectorAgent = agent({
    name: "DataCollector",
    description: "Specializes in gathering data from multiple sources",
    tools: [dataCollectionTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  const statisticianAgent = agent({
    name: "Statistician",
    description: "Performs statistical analysis and identifies patterns",
    tools: [statisticalAnalysisTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  const visualizationAgent = agent({
    name: "VisualizationSpecialist",
    description: "Creates charts, graphs, and visual representations of data",
    tools: [visualizationTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  const reporterAgent = agent({
    name: "ReportGenerator",
    description: "Compiles findings into comprehensive reports",
    tools: [reportTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Agente analista principal
  const leadAnalyst = agent({
    name: "LeadAnalyst",
    description:
      "Coordinates data analysis projects and manages the analysis workflow",
    tools: [],
    llm: openai({ model: "gpt-4o-mini" }),
    canHandoffTo: [
      dataCollectorAgent,
      statisticianAgent,
      visualizationAgent,
      reporterAgent,
    ],
  });

  // Sistema de análisis multi-agente
  const analysisSystem = multiAgent({
    agents: [
      leadAnalyst,
      dataCollectorAgent,
      statisticianAgent,
      visualizationAgent,
      reporterAgent,
    ],
    rootAgent: leadAnalyst,
  });

  // Ejecutar análisis completo
  const result = await analysisSystem.run(
    "I need a comprehensive analysis of our Q4 sales performance. Please collect the data, perform statistical analysis, create visualizations, and generate a detailed report."
  );

  console.log("Resultado del análisis multi-agente:");
  console.log(result.data.result);

  return result;
}

// Ejemplo 4: Sistema de E-commerce Multi-Agente
export async function ejemploEcommerce() {
  console.log("\n🛒 Ejemplo 4: Sistema de E-commerce Multi-Agente");

  // Herramientas de e-commerce
  const inventoryTool = tool({
    name: "checkInventory",
    description: "Check product inventory and availability",
    parameters: z.object({
      productId: z.string(),
    }),
    execute: ({ productId }) => {
      const inventory = {
        "laptop-001":
          "En stock: 15 unidades, precio $999, descuento 10% disponible",
        "phone-002": "Stock bajo: 3 unidades, precio $699, sin descuentos",
        "tablet-003": "Agotado, restock esperado en 5 días, precio $399",
      };
      return (
        inventory[productId as keyof typeof inventory] ||
        `Producto ${productId} no encontrado`
      );
    },
  });

  const pricingTool = tool({
    name: "calculatePricing",
    description: "Calculate pricing with discounts and promotions",
    parameters: z.object({
      productId: z.string(),
      quantity: z.number(),
      customerType: z.string(),
    }),
    execute: ({ productId, quantity, customerType }) => {
      const basePrice = 999;
      const discount = customerType === "premium" ? 0.15 : 0.05;
      const total = basePrice * quantity * (1 - discount);
      return `Precio calculado para ${quantity}x ${productId}: $${total.toFixed(
        2
      )} (descuento ${customerType}: ${discount * 100}%)`;
    },
  });

  const shippingTool = tool({
    name: "calculateShipping",
    description: "Calculate shipping costs and delivery times",
    parameters: z.object({
      destination: z.string(),
      weight: z.number(),
      priority: z.string(),
    }),
    execute: ({ destination, weight, priority }) => {
      const baseCost = weight * 2;
      const priorityCost = priority === "express" ? 15 : 0;
      const total = baseCost + priorityCost;
      const days = priority === "express" ? 1 : 3;
      return `Envío a ${destination}: $${total}, entrega en ${days} días hábiles`;
    },
  });

  // Agentes especializados
  const inventoryAgent = agent({
    name: "InventoryManager",
    description: "Manages product inventory and stock levels",
    tools: [inventoryTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  const pricingAgent = agent({
    name: "PricingSpecialist",
    description: "Handles pricing calculations and discount applications",
    tools: [pricingTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  const shippingAgent = agent({
    name: "ShippingCoordinator",
    description: "Manages shipping calculations and logistics",
    tools: [shippingTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Agente de ventas principal
  const salesAgent = agent({
    name: "SalesAssistant",
    description:
      "Handles customer inquiries and coordinates with specialized agents",
    tools: [],
    llm: openai({ model: "gpt-4o-mini" }),
    canHandoffTo: [inventoryAgent, pricingAgent, shippingAgent],
  });

  // Sistema de e-commerce
  const ecommerceSystem = multiAgent({
    agents: [salesAgent, inventoryAgent, pricingAgent, shippingAgent],
    rootAgent: salesAgent,
  });

  // Procesar consulta de cliente
  const result = await ecommerceSystem.run(
    "I'm interested in buying 2 laptops (laptop-001). I'm a premium customer and need them shipped to Madrid with express delivery. Can you give me the total cost including shipping?"
  );

  console.log("Respuesta del sistema de e-commerce:");
  console.log(result.data.result);

  return result;
}

// Función principal para ejecutar todos los ejemplos
export async function ejecutarEjemplosMultiAgente() {
  console.log("🚀 Ejecutando Ejemplos de Workflow Multi-Agente\n");
  console.log("=".repeat(70));

  try {
    await ejemploMultiAgenteBasico();
    await ejemploSoporteTecnico();
    await ejemploAnalisisDatos();
    await ejemploEcommerce();

    console.log("\n✅ Todos los ejemplos multi-agente completados!");
    console.log("\n💡 Beneficios de los Sistemas Multi-Agente:");
    console.log("- Especialización: Cada agente maneja su dominio específico");
    console.log("- Escalabilidad: Fácil agregar nuevos agentes especializados");
    console.log("- Mantenibilidad: Lógica separada por responsabilidades");
    console.log(
      "- Flexibilidad: Delegación inteligente basada en descripciones"
    );
    console.log(
      "- Reutilización: Agentes pueden ser reutilizados en diferentes workflows"
    );
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
  ejecutarEjemplosMultiAgente();
}
