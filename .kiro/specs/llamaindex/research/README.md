# Investigación de Agent Workflows de LlamaIndex

Este directorio contiene investigación exhaustiva y ejemplos funcionales para Agent Workflows de LlamaIndex TypeScript, basados en la documentación oficial.

## 📁 Estructura del Directorio

```
research/
├── agent-workflows-research.md     # Investigación basada en documentación oficial
├── examples/                       # Ejemplos funcionales validados
│   ├── single-agent-example.ts     # Agentes individuales con herramientas
│   ├── structured-output-example.ts # Extracción de datos estructurados
│   ├── event-streaming-example.ts  # Streaming de eventos en tiempo real
│   ├── multi-agent-example.ts      # Sistemas multi-agente
│   ├── index.ts                    # Ejecutor completo de ejemplos
│   └── package.json               # Dependencias oficiales
└── README.md                       # Este archivo
```

## 🎯 Fuente de Investigación

**Documentación Oficial**: https://developers.llamaindex.ai/typescript/framework/modules/agents/agent_workflow/

Esta investigación está basada completamente en la documentación oficial de LlamaIndex TypeScript, asegurando precisión técnica y ejemplos funcionales.

## 📚 Conceptos Fundamentales Investigados

### Definición Oficial

> "Agent Workflows are a powerful system that enables you to create and orchestrate one or multiple agents with tools to perform specific tasks. It's built on top of the base Workflow system and provides a streamlined interface for agent interactions."

### Componentes Principales

1. **Función `agent()`**: Crea agentes individuales con herramientas específicas
2. **Función `multiAgent()`**: Orquesta múltiples agentes especializados
3. **Función `tool()`**: Define herramientas que los agentes pueden usar
4. **Sistema de Eventos**: Streaming unificado para seguimiento en tiempo real
5. **Salida Estructurada**: Extracción de datos usando esquemas Zod

## 🚀 Ejecutar los Ejemplos

### Prerrequisitos

```bash
cd examples/
npm install
```

### Variables de Entorno Requeridas

```bash
export OPENAI_API_KEY="tu-api-key-aqui"
```

### Ejecutar Todos los Ejemplos

```bash
npm run dev
```

### Ejecutar Ejemplos Específicos

```bash
npm run single-agent        # Agentes individuales
npm run structured-output   # Salida estructurada
npm run event-streaming     # Streaming de eventos
npm run multi-agent         # Sistemas multi-agente
```

### Scripts Disponibles

```bash
npm run build              # Compilar TypeScript
npm run test               # Ejecutar tests
npm run lint               # Verificar código
```

## 📖 Ejemplos Basados en Documentación Oficial

### 1. Agente Individual (`single-agent-example.ts`)

**Basado en**: Ejemplo oficial de "Single Agent Workflow"

Demuestra:

- Creación de agentes con herramientas simples
- Herramientas parametrizadas con Zod
- Agentes con múltiples herramientas especializadas

```typescript
// Ejemplo oficial de la documentación
const jokeTool = tool(() => "Baby Llama is called cria", {
  name: "joke",
  description: "Use this tool to get a joke",
});

const jokeAgent = agent({
  tools: [jokeTool],
  llm: openai({ model: "gpt-4o-mini" }),
});
```

### 2. Salida Estructurada (`structured-output-example.ts`)

**Basado en**: Ejemplo oficial de "Structured Output"

Demuestra:

- Extracción de datos estructurados con Zod
- Procesamiento de respuestas en formatos específicos
- Validación automática de datos

```typescript
// Ejemplo oficial de la documentación
const responseSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
});

const result = await weatherAgent.run("What's the weather in Tokyo?", {
  responseFormat: responseSchema,
});
```

### 3. Streaming de Eventos (`event-streaming-example.ts`)

**Basado en**: Ejemplo oficial de "Event Streaming"

Demuestra:

- Sistema unificado de eventos
- Seguimiento en tiempo real de ejecución
- Manejo de diferentes tipos de eventos

```typescript
// Ejemplo oficial de la documentación
const events = jokeAgent.runStream("Tell me something funny");

for await (const event of events) {
  if (agentToolCallEvent.include(event)) {
    console.log(`Tool being called: ${event.data.toolName}`);
  }
  if (agentStreamEvent.include(event)) {
    process.stdout.write(event.data.delta);
  }
}
```

### 4. Workflow Multi-Agente (`multi-agent-example.ts`)

**Basado en**: Ejemplo oficial de "Multi-Agent Workflow"

Demuestra:

- Coordinación de múltiples agentes especializados
- Delegación inteligente de tareas
- Sistemas complejos con agentes especializados

```typescript
// Ejemplo oficial de la documentación
const agents = multiAgent({
  agents: [jokeAgent, weatherAgent],
  rootAgent: jokeAgent,
});
```

## 🔍 API Real Documentada

### Importaciones Oficiales

```typescript
import { tool } from "llamaindex";
import { agent, multiAgent } from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";
import { agentToolCallEvent, agentStreamEvent } from "@llamaindex/workflow";
import { z } from "zod";
```

### Dependencias Requeridas

```json
{
  "llamaindex": "^0.3.0",
  "@llamaindex/workflow": "^0.1.0",
  "@llamaindex/openai": "^0.1.0",
  "zod": "^3.22.0"
}
```

## 📊 Casos de Uso Validados

### 1. Asistentes Especializados

- Agentes con herramientas específicas para dominios particulares
- Respuestas directas y contextualizadas

### 2. Extracción de Datos

- Conversión de texto no estructurado a datos tipados
- Validación automática con esquemas Zod

### 3. Sistemas Complejos

- Coordinación de múltiples agentes especializados
- Delegación automática basada en descripciones

### 4. Aplicaciones en Tiempo Real

- Streaming de respuestas para mejor UX
- Seguimiento detallado de ejecución

## 🎓 Valor para el Libro

### Estructura Recomendada

1. **Capítulo 1**: Conceptos básicos y primer agente (basado en `single-agent-example.ts`)
2. **Capítulo 2**: Herramientas y configuración avanzada
3. **Capítulo 3**: Salida estructurada (basado en `structured-output-example.ts`)
4. **Capítulo 4**: Streaming y eventos (basado en `event-streaming-example.ts`)
5. **Capítulo 5**: Sistemas multi-agente (basado en `multi-agent-example.ts`)
6. **Capítulo 6**: Patrones avanzados y mejores prácticas

### Enfoque Pedagógico

- **Progresión Validada**: Ejemplos basados en documentación oficial
- **Código Funcional**: Todos los ejemplos probados y validados
- **API Real**: Sintaxis exacta de LlamaIndex TypeScript
- **Casos Prácticos**: Aplicaciones del mundo real

## ✅ Estado de la Investigación

### Completado

- ✅ Análisis completo de documentación oficial
- ✅ Extracción de API real y sintaxis exacta
- ✅ Ejemplos funcionales basados en documentación
- ✅ Identificación de patrones oficiales
- ✅ Validación de casos de uso

### Listo para Implementación

La investigación proporciona una base sólida y técnicamente correcta para crear el libro sobre Agent Workflows de LlamaIndex TypeScript, con ejemplos reales que funcionan y patrones oficialmente documentados.

## 🔗 Referencias

- **Documentación Oficial**: https://developers.llamaindex.ai/typescript/framework/modules/agents/agent_workflow/
- **Repositorio LlamaIndex**: https://github.com/run-llama/LlamaIndexTS
- **Documentación Zod**: https://zod.dev/
- **OpenAI API**: https://platform.openai.com/docs

## 🤝 Contribución

Esta investigación sirve como base técnica para el libro de Agent Workflows de LlamaIndex TypeScript. Todos los ejemplos están basados en la documentación oficial y han sido validados para asegurar precisión técnica.
