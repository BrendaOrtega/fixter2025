/**
 * Ejemplo de Salida Estructurada - Basado en Documentación Oficial
 *
 * Este ejemplo demuestra cómo extraer datos estructurados de respuestas
 * de agentes usando esquemas Zod, según la API oficial de LlamaIndex.
 */

import { z } from "zod";
import { tool } from "llamaindex";
import { agent } from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";

// Ejemplo 1: Extracción de Datos del Clima (Ejemplo Oficial)
export async function ejemploClimaEstructurado() {
  console.log("🌤️ Ejemplo 1: Datos del Clima Estructurados");

  // Herramienta del clima (basada en documentación oficial)
  const weatherTool = tool({
    name: "weatherTool",
    description: "Get weather information",
    parameters: z.object({
      location: z.string(),
    }),
    execute: ({ location }) => {
      return `The weather in ${location} is sunny. The temperature is 72 degrees. The humidity is 50%. The wind speed is 10 mph.`;
    },
  });

  // Esquema de respuesta estructurada (ejemplo oficial)
  const responseSchema = z.object({
    temperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
  });

  // Crear agente del clima
  const weatherAgent = agent({
    name: "weatherAgent",
    tools: [weatherTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Ejecutar con salida estructurada
  const result = await weatherAgent.run("What's the weather in Tokyo?", {
    responseFormat: responseSchema,
  });

  console.log("Respuesta natural:", result.data.result);
  console.log("Datos estructurados:", result.data.object);

  return result;
}

// Ejemplo 2: Análisis de Producto con Datos Estructurados
export async function ejemploAnalisisProducto() {
  console.log("\n📊 Ejemplo 2: Análisis de Producto Estructurado");

  // Herramienta de análisis de producto
  const productAnalysisTool = tool({
    name: "analyzeProduct",
    description: "Analyze a product and provide detailed information",
    parameters: z.object({
      productName: z.string(),
    }),
    execute: ({ productName }) => {
      // Simulación de análisis de producto
      const productData = {
        "iPhone 15":
          "El iPhone 15 es un smartphone premium con pantalla de 6.1 pulgadas, cámara de 48MP, procesador A16 Bionic, 128GB de almacenamiento, batería de larga duración, precio de $799, disponible en 5 colores, calificación de usuarios 4.5/5.",
        "MacBook Air":
          "La MacBook Air es una laptop ultradelgada con chip M2, pantalla Retina de 13.6 pulgadas, 8GB RAM, 256GB SSD, batería de 18 horas, peso de 1.24kg, precio de $1199, disponible en 4 colores, calificación 4.7/5.",
        "AirPods Pro":
          "Los AirPods Pro son auriculares inalámbricos con cancelación activa de ruido, chip H2, batería de 6 horas (30 con estuche), resistencia al agua IPX4, precio de $249, disponibles en blanco, calificación 4.6/5.",
      };

      return (
        productData[productName as keyof typeof productData] ||
        `Análisis no disponible para ${productName}`
      );
    },
  });

  // Esquema para datos estructurados del producto
  const productSchema = z.object({
    name: z.string(),
    category: z.string(),
    price: z.number(),
    rating: z.number().min(0).max(5),
    features: z.array(z.string()),
    availability: z.boolean(),
    colors: z.array(z.string()).optional(),
  });

  // Crear agente de análisis
  const productAgent = agent({
    tools: [productAnalysisTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Analizar producto con salida estructurada
  const result = await productAgent.run("Analyze the iPhone 15 for me", {
    responseFormat: productSchema,
  });

  console.log("Análisis completo:", result.data.result);
  console.log(
    "Datos estructurados:",
    JSON.stringify(result.data.object, null, 2)
  );

  return result;
}

// Ejemplo 3: Extracción de Información de Contacto
export async function ejemploExtraccionContacto() {
  console.log("\n📇 Ejemplo 3: Extracción de Información de Contacto");

  // Herramienta de procesamiento de texto
  const textProcessorTool = tool({
    name: "processText",
    description: "Process and extract information from text",
    parameters: z.object({
      text: z.string(),
    }),
    execute: ({ text }) => {
      return `Procesando el siguiente texto: "${text}". El texto contiene información de contacto de una persona llamada María García, desarrolladora senior en TechCorp, con email maria.garcia@techcorp.com, teléfono +34 600 123 456, ubicada en Madrid, España, especializada en TypeScript y React.`;
    },
  });

  // Esquema para información de contacto
  const contactSchema = z.object({
    name: z.string(),
    position: z.string(),
    company: z.string(),
    email: z.string().email(),
    phone: z.string(),
    location: z.string(),
    skills: z.array(z.string()),
  });

  // Crear agente procesador
  const contactAgent = agent({
    tools: [textProcessorTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Procesar texto y extraer información estructurada
  const result = await contactAgent.run(
    "Extract contact information from this business card text: 'María García - Senior Developer at TechCorp - maria.garcia@techcorp.com - +34 600 123 456 - Madrid, Spain - TypeScript, React'",
    {
      responseFormat: contactSchema,
    }
  );

  console.log("Texto procesado:", result.data.result);
  console.log(
    "Información de contacto:",
    JSON.stringify(result.data.object, null, 2)
  );

  return result;
}

// Ejemplo 4: Análisis de Sentimientos Estructurado
export async function ejemploAnalisisSentimientos() {
  console.log("\n😊 Ejemplo 4: Análisis de Sentimientos Estructurado");

  // Herramienta de análisis de sentimientos
  const sentimentTool = tool({
    name: "analyzeSentiment",
    description: "Analyze the sentiment of text",
    parameters: z.object({
      text: z.string(),
    }),
    execute: ({ text }) => {
      return `Analizando sentimiento del texto: "${text}". El texto expresa una opinión muy positiva sobre el producto, con alta satisfacción del cliente, mencionando específicamente la excelente calidad, el servicio rápido y la buena relación calidad-precio. Confianza del análisis: 92%.`;
    },
  });

  // Esquema para análisis de sentimientos
  const sentimentSchema = z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1),
    emotions: z.array(z.string()),
    keywords: z.array(z.string()),
    score: z.number().min(-1).max(1),
  });

  // Crear agente de sentimientos
  const sentimentAgent = agent({
    tools: [sentimentTool],
    llm: openai({ model: "gpt-4o-mini" }),
  });

  // Analizar sentimiento con salida estructurada
  const result = await sentimentAgent.run(
    "Analyze the sentiment of this review: 'I absolutely love this product! The quality is amazing and the customer service was incredibly helpful. Great value for money!'",
    {
      responseFormat: sentimentSchema,
    }
  );

  console.log("Análisis completo:", result.data.result);
  console.log(
    "Datos de sentimiento:",
    JSON.stringify(result.data.object, null, 2)
  );

  return result;
}

// Función principal para ejecutar todos los ejemplos
export async function ejecutarEjemplosSalidaEstructurada() {
  console.log("🚀 Ejecutando Ejemplos de Salida Estructurada\n");
  console.log("=".repeat(60));

  try {
    await ejemploClimaEstructurado();
    await ejemploAnalisisProducto();
    await ejemploExtraccionContacto();
    await ejemploAnalisisSentimientos();

    console.log("\n✅ Todos los ejemplos de salida estructurada completados!");
    console.log("\n💡 Beneficios de la salida estructurada:");
    console.log("- Datos consistentes y tipados");
    console.log("- Fácil integración con aplicaciones");
    console.log("- Validación automática con Zod");
    console.log("- Procesamiento posterior simplificado");
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
  ejecutarEjemplosSalidaEstructurada();
}
