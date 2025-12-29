# Fundamentos de Inteligencia Artificial con LLMs

Una guía práctica para desarrolladores TypeScript usando el AI SDK de Vercel.

---

## Introducción

Los Large Language Models (LLMs) han transformado la manera en que construimos software. Sin embargo, trabajar con ellos requiere comprender conceptos fundamentales que difieren de la programación tradicional.

Este artículo cubre los conceptos esenciales que todo desarrollador necesita dominar para construir aplicaciones con IA: desde cómo comunicarte con un modelo hasta cómo crear agentes autónomos.

Usaremos el **AI SDK de Vercel** como framework de referencia. Es agnóstico de proveedor, tiene excelente soporte para TypeScript, y simplifica patrones complejos en primitivos elegantes.

---

## 1. Mensajes: La Unidad Básica de Comunicación

Un LLM no "entiende" tu código directamente. Se comunica mediante **mensajes** estructurados que representan una conversación.

### Tipos de Mensajes

El AI SDK soporta tres tipos principales:

| Tipo | Propósito |
|------|-----------|
| `system` | Instrucciones iniciales que guían el comportamiento del modelo |
| `user` | Mensajes del usuario o tu aplicación |
| `assistant` | Respuestas generadas por el modelo |

### Ejemplo Práctico

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: '¿Qué es TypeScript?' }
  ]
});

console.log(text);
```

El modelo recibe el mensaje, lo procesa, y retorna una respuesta en `text`.

### Conversaciones Multi-turno

Los mensajes forman un historial que el modelo usa como contexto:

```typescript
const { text } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: '¿Qué es TypeScript?' },
    { role: 'assistant', content: 'TypeScript es un superset de JavaScript que añade tipos estáticos.' },
    { role: 'user', content: '¿Cuál es su principal ventaja?' }
  ]
});
```

El modelo "recuerda" el contexto anterior gracias al historial de mensajes que le proporcionas.

---

## 2. System Prompts: El Director de Orquesta

El **system prompt** es un mensaje especial que establece las reglas del juego. Define la personalidad, restricciones y comportamiento del modelo antes de cualquier interacción.

### ¿Por qué es importante?

Sin un system prompt, el modelo responde de manera genérica. Con uno bien diseñado, obtienes respuestas consistentes y alineadas con tu caso de uso.

### Ejemplo: Asistente Técnico

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: `Eres un asistente técnico especializado en TypeScript.

Reglas:
- Responde siempre en español
- Incluye ejemplos de código cuando sea relevante
- Si no sabes algo, admítelo claramente
- Mantén las respuestas concisas pero completas`,
  messages: [
    { role: 'user', content: 'Explica qué son los generics' }
  ]
});
```

### Anatomía de un Buen System Prompt

1. **Identidad**: Quién es el asistente
2. **Capacidades**: Qué puede hacer
3. **Restricciones**: Qué NO debe hacer
4. **Formato**: Cómo estructurar las respuestas

```typescript
const systemPrompt = `Eres un revisor de código senior.

CAPACIDADES:
- Analizar código TypeScript
- Identificar bugs y code smells
- Sugerir mejoras de rendimiento

RESTRICCIONES:
- No reescribas código completo, solo señala problemas
- No uses jerga innecesaria
- Máximo 3 sugerencias por revisión

FORMATO DE RESPUESTA:
1. Resumen en una línea
2. Lista de problemas encontrados
3. Sugerencia principal de mejora`;
```

---

## 3. Razonamiento: Cómo "Piensa" un LLM

Algunos modelos modernos soportan **razonamiento extendido**, donde el modelo "piensa" paso a paso antes de responder. Esto mejora significativamente la calidad en tareas complejas.

### Modelos con Razonamiento

- Claude (Anthropic) con `thinking` habilitado
- OpenAI o1 y o3
- DeepSeek R1

### Ejemplo con Claude

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text, reasoning } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  providerOptions: {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: 10000 // Tokens disponibles para "pensar"
      }
    }
  },
  messages: [
    {
      role: 'user',
      content: 'Diseña la arquitectura para un sistema de pagos con Stripe'
    }
  ]
});

console.log('Razonamiento:', reasoning);
console.log('Respuesta:', text);
```

El campo `reasoning` contiene el proceso de pensamiento del modelo, útil para debugging y para entender cómo llegó a su conclusión.

---

## 4. Tokens: La Moneda de los LLMs

Los **tokens** son las unidades fundamentales que un LLM procesa. No son palabras exactamente—son fragmentos de texto que el modelo ha aprendido a reconocer.

### ¿Qué es un Token?

- Una palabra común suele ser 1 token: `"hola"` → 1 token
- Palabras largas se dividen: `"programación"` → 2-3 tokens
- Código y caracteres especiales consumen más tokens
- Aproximación general: **1 token ≈ 4 caracteres** en inglés (en español puede variar)

### ¿Por qué Importan?

Los tokens afectan tres aspectos críticos:

| Aspecto | Impacto |
|---------|---------|
| **Costo** | Pagas por tokens procesados (input + output) |
| **Latencia** | Más tokens = más tiempo de procesamiento |
| **Límites** | Cada modelo tiene un máximo de tokens |

### Monitoreando el Uso

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text, usage } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: 'Explica qué son los tokens en 2 oraciones' }
  ]
});

console.log('Tokens de entrada:', usage.promptTokens);
console.log('Tokens de salida:', usage.completionTokens);
console.log('Total:', usage.totalTokens);
```

### Ejemplo de Salida

```
Tokens de entrada: 15
Tokens de salida: 42
Total: 57
```

---

## 5. Ventana de Contexto: La Memoria del Modelo

La **ventana de contexto** es la cantidad máxima de tokens que un modelo puede procesar en una sola llamada. Incluye todo: system prompt, historial de mensajes, y la respuesta generada.

### Límites por Modelo (2025)

| Modelo | Ventana de Contexto |
|--------|---------------------|
| GPT-4o | 128,000 tokens |
| Claude Sonnet 4 | 200,000 tokens |
| Gemini 1.5 Pro | 2,000,000 tokens |

### El Problema del Contexto Largo

Más contexto no siempre es mejor:

- **Costo**: Más tokens = más caro
- **Latencia**: El modelo tarda más en procesar
- **"Lost in the middle"**: Los modelos pueden "olvidar" información en medio de contextos muy largos

### Estrategias de Manejo

```typescript
// ❌ Malo: Enviar todo el historial siempre
const messages = conversationHistory; // Puede ser enorme

// ✅ Mejor: Limitar a los últimos N mensajes
const recentMessages = conversationHistory.slice(-10);

// ✅ Mejor: Resumir conversaciones largas
const summary = await summarizeConversation(conversationHistory);
const messages = [
  { role: 'system', content: `Contexto previo: ${summary}` },
  ...conversationHistory.slice(-5)
];
```

### Verificando Límites

```typescript
import { openai } from '@ai-sdk/openai';

// Algunos providers exponen metadata del modelo
const model = openai('gpt-4o');

// Estima tokens antes de enviar
function estimateTokens(text: string): number {
  // Aproximación: 1 token ≈ 4 caracteres
  return Math.ceil(text.length / 4);
}

const prompt = "Tu mensaje muy largo aquí...";
const estimated = estimateTokens(prompt);

if (estimated > 100000) {
  console.warn('Advertencia: Prompt cercano al límite de contexto');
}
```

---

## 6. Herramientas: Extendiendo las Capacidades del Modelo

Las **herramientas** (tools) permiten que un LLM ejecute funciones y acceda a sistemas externos. El modelo decide cuándo y qué herramienta usar basándose en el contexto.

### ¿Cómo Funcionan?

1. Defines herramientas con nombre, descripción y parámetros
2. El modelo analiza la petición del usuario
3. Si necesita información externa, "llama" a una herramienta
4. Tu código ejecuta la función
5. El resultado se envía de vuelta al modelo
6. El modelo genera la respuesta final

### Definiendo una Herramienta

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    obtenerClima: tool({
      description: 'Obtiene el clima actual de una ciudad',
      parameters: z.object({
        ciudad: z.string().describe('Nombre de la ciudad'),
        unidad: z.enum(['celsius', 'fahrenheit']).default('celsius')
      }),
      execute: async ({ ciudad, unidad }) => {
        // Aquí llamarías a una API de clima real
        const climaSimulado = {
          ciudad,
          temperatura: 22,
          unidad,
          condicion: 'soleado'
        };
        return climaSimulado;
      }
    })
  },
  messages: [
    { role: 'user', content: '¿Qué clima hace en Ciudad de México?' }
  ]
});

console.log(text);
// "El clima actual en Ciudad de México es soleado con 22°C"
```

### Múltiples Herramientas

```typescript
const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    buscarProducto: tool({
      description: 'Busca productos en el catálogo',
      parameters: z.object({
        query: z.string(),
        categoria: z.string().optional()
      }),
      execute: async ({ query, categoria }) => {
        // Búsqueda en base de datos
        return buscarEnCatalogo(query, categoria);
      }
    }),

    verificarInventario: tool({
      description: 'Verifica el stock de un producto',
      parameters: z.object({
        productoId: z.string()
      }),
      execute: async ({ productoId }) => {
        return obtenerStock(productoId);
      }
    }),

    calcularEnvio: tool({
      description: 'Calcula el costo de envío',
      parameters: z.object({
        codigoPostal: z.string(),
        peso: z.number()
      }),
      execute: async ({ codigoPostal, peso }) => {
        return calcularCostoEnvio(codigoPostal, peso);
      }
    })
  },
  messages: [
    { role: 'user', content: '¿Tienen laptops disponibles y cuánto cuesta enviar una a 06600?' }
  ]
});
```

El modelo automáticamente encadena las herramientas necesarias para responder.

### Control de Herramientas

```typescript
// Forzar uso de herramienta
const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: { /* ... */ },
  toolChoice: 'required', // Debe usar al menos una herramienta
  messages: [/* ... */]
});

// Especificar herramienta exacta
const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: { /* ... */ },
  toolChoice: { type: 'tool', toolName: 'obtenerClima' },
  messages: [/* ... */]
});
```

---

## 7. Agentes: Autonomía con Propósito

Un **agente** es un sistema donde el LLM opera en un loop, tomando decisiones sobre qué herramientas usar para completar una tarea. A diferencia de una llamada simple, el agente persiste hasta lograr su objetivo.

### Diferencia: Herramienta vs Agente

| Característica | Herramienta | Agente |
|----------------|-------------|--------|
| Ejecución | Una llamada | Loop continuo |
| Decisiones | Predefinidas | Autónomas |
| Complejidad | Tareas simples | Tareas multi-paso |
| Control | Tú controlas el flujo | El LLM controla el flujo |

### Agente Básico con maxSteps

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const { text, steps } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  maxSteps: 10, // Máximo de iteraciones del loop
  system: `Eres un asistente de investigación.
           Usa las herramientas disponibles para responder preguntas.
           Continúa investigando hasta tener información completa.`,
  tools: {
    buscarWeb: tool({
      description: 'Busca información en la web',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        // Implementación de búsqueda
        return await buscarEnWeb(query);
      }
    }),

    leerPagina: tool({
      description: 'Lee el contenido de una URL',
      parameters: z.object({ url: z.string() }),
      execute: async ({ url }) => {
        return await extraerContenido(url);
      }
    }),

    guardarNota: tool({
      description: 'Guarda información relevante',
      parameters: z.object({
        titulo: z.string(),
        contenido: z.string()
      }),
      execute: async ({ titulo, contenido }) => {
        return await guardarEnBase(titulo, contenido);
      }
    })
  },
  messages: [
    {
      role: 'user',
      content: 'Investiga las últimas tendencias en desarrollo web 2025 y guarda un resumen'
    }
  ]
});

// Ver los pasos que tomó el agente
console.log(`El agente completó en ${steps.length} pasos`);
steps.forEach((step, i) => {
  console.log(`Paso ${i + 1}:`, step.toolCalls?.map(t => t.toolName));
});
```

### Flujo del Agente

```
Usuario: "Investiga tendencias web 2025"
    ↓
Paso 1: buscarWeb("tendencias desarrollo web 2025")
    ↓
Paso 2: leerPagina("https://ejemplo.com/articulo")
    ↓
Paso 3: buscarWeb("frameworks frontend 2025")
    ↓
Paso 4: leerPagina("https://otro.com/frameworks")
    ↓
Paso 5: guardarNota("Tendencias Web 2025", "...")
    ↓
Respuesta final al usuario
```

### Agente con Estado Persistente

Para casos más complejos, puedes implementar tu propio loop:

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

interface AgentState {
  messages: Array<{ role: string; content: string }>;
  context: Record<string, unknown>;
  iteraciones: number;
}

async function runAgent(objetivo: string): Promise<string> {
  const state: AgentState = {
    messages: [{ role: 'user', content: objetivo }],
    context: {},
    iteraciones: 0
  };

  const MAX_ITERACIONES = 15;

  while (state.iteraciones < MAX_ITERACIONES) {
    const { text, toolCalls } = await generateText({
      model: openai('gpt-4o'),
      system: `Eres un agente autónomo.
               Cuando completes la tarea, responde con "TAREA_COMPLETADA:" seguido del resultado.`,
      tools: {
        // Tus herramientas aquí
      },
      messages: state.messages
    });

    state.iteraciones++;

    // Verificar si el agente terminó
    if (text.includes('TAREA_COMPLETADA:')) {
      return text.replace('TAREA_COMPLETADA:', '').trim();
    }

    // Agregar respuesta al historial
    state.messages.push({ role: 'assistant', content: text });

    // Si no hubo tool calls y no terminó, algo salió mal
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }
  }

  return 'El agente no pudo completar la tarea en el límite de iteraciones';
}
```

### Consideraciones de Seguridad

Los agentes tienen autonomía, lo que introduce riesgos:

```typescript
// ⚠️ Herramienta sensible: requiere aprobación
const ejecutarComando = tool({
  description: 'Ejecuta un comando en el sistema',
  parameters: z.object({ comando: z.string() }),
  // Esta flag indica que necesita revisión humana
  experimental_toToolResultContent: (result) => ({
    type: 'tool-result',
    content: result,
    needsApproval: true // Requiere aprobación manual
  }),
  execute: async ({ comando }) => {
    // Validación adicional
    const comandosPermitidos = ['ls', 'pwd', 'echo'];
    const base = comando.split(' ')[0];

    if (!comandosPermitidos.includes(base)) {
      throw new Error('Comando no permitido');
    }

    return ejecutarEnSandbox(comando);
  }
});
```

---

## Resumen

| Concepto | Descripción | Uso Principal |
|----------|-------------|---------------|
| **Mensajes** | Unidades de comunicación | Estructurar conversaciones |
| **System Prompt** | Instrucciones de comportamiento | Definir personalidad y reglas |
| **Razonamiento** | Pensamiento paso a paso | Tareas complejas |
| **Tokens** | Unidades de procesamiento | Controlar costos y límites |
| **Ventana de Contexto** | Memoria del modelo | Manejar historial |
| **Herramientas** | Funciones ejecutables | Acceder a sistemas externos |
| **Agentes** | Loops autónomos | Tareas multi-paso |

---

## Siguiente Paso

Estos fundamentos son el cimiento para construir aplicaciones sofisticadas con IA. El AI SDK de Vercel abstrae mucha complejidad, pero entender estos conceptos te permite:

- Optimizar costos controlando tokens
- Diseñar prompts efectivos
- Crear herramientas útiles
- Construir agentes confiables

La práctica es el mejor maestro. Comienza con llamadas simples usando `generateText`, experimenta con herramientas, y gradualmente construye hacia agentes más complejos.

---

## Recursos

- [Documentación oficial del AI SDK](https://ai-sdk.dev)
- [Ejemplos de código](https://github.com/vercel/ai/tree/main/examples)
- [Guía de prompting de Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)

---

*Artículo creado para FixterGeek - fixtergeek.com*
