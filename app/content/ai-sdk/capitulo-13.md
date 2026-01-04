# Capítulo 13: Multi-Provider — Usando Diferentes Modelos

Una gran ventaja del AI SDK: el mismo código funciona con OpenAI, Anthropic, Google, Mistral y más. Solo cambias una línea.

## Mismo Código, Diferentes Modelos

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const prompt = 'Explica qué es una función recursiva en una oración.';

// OpenAI
const { text: r1 } = await generateText({
  model: openai('gpt-4o-mini'),
  prompt,
});
console.log('OpenAI:', r1);

// Anthropic (Claude)
const { text: r2 } = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt,
});
console.log('Claude:', r2);

// Google (Gemini)
const { text: r3 } = await generateText({
  model: google('gemini-2.0-flash'),
  prompt,
});
console.log('Gemini:', r3);
```

Salida:

```
OpenAI: Una función recursiva es aquella que se llama a sí misma para resolver
un problema dividiéndolo en casos más pequeños hasta llegar a un caso base.

Claude: Una función recursiva es una función que se invoca a sí misma dentro
de su propia definición para resolver problemas descomponiéndolos en instancias
más simples del mismo problema.

Gemini: Una función recursiva es aquella que se llama a sí misma para resolver
un problema reduciéndolo a versiones más pequeñas hasta alcanzar un caso base.
```

El mismo código, la misma estructura. Solo cambia el modelo.

## Instalación

```bash
npm install @ai-sdk/openai      # OpenAI
npm install @ai-sdk/anthropic   # Claude
npm install @ai-sdk/google      # Gemini
npm install @ai-sdk/mistral     # Mistral
npm install @ai-sdk/groq        # Groq (modelos open source rápidos)
```

## Variables de Entorno

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
```

Los providers leen automáticamente estas variables.

## Catálogo de Modelos

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

// Chat
openai('gpt-4o')              // Más capaz, multimodal
openai('gpt-4o-mini')         // Rápido y económico
openai('o1')                  // Razonamiento avanzado
openai('o3-mini')             // Razonamiento económico

// Embeddings
openai.embedding('text-embedding-3-small')
openai.embedding('text-embedding-3-large')

// Audio
openai.transcription('whisper-1')
openai.speech('tts-1')
```

### Anthropic (Claude)

```typescript
import { anthropic } from '@ai-sdk/anthropic';

anthropic('claude-sonnet-4-20250514')   // Balance ideal
anthropic('claude-opus-4-20250514')     // Más capaz
anthropic('claude-haiku-3-20250514')    // Rápido y económico

// Claude tiene contexto de 200K tokens
```

### Google (Gemini)

```typescript
import { google } from '@ai-sdk/google';

google('gemini-2.0-flash')      // Rápido, última versión
google('gemini-2.0-pro')        // Más capaz
google('gemini-1.5-pro')        // Contexto de 1M tokens

// Embeddings
google.textEmbeddingModel('text-embedding-004')
```

### Mistral

```typescript
import { mistral } from '@ai-sdk/mistral';

mistral('mistral-large-latest')   // Más capaz
mistral('mistral-small-latest')   // Económico
mistral('codestral-latest')       // Especializado en código
```

### Groq (Modelos Open Source)

```typescript
import { groq } from '@ai-sdk/groq';

// Groq ejecuta modelos open source con hardware optimizado
groq('llama-3.3-70b-versatile')   // Llama 3.3 70B
groq('llama-3.1-8b-instant')      // Muy rápido
groq('mixtral-8x7b-32768')        // Mixtral
```

## Guía de Selección

| Necesidad | Modelo recomendado |
|-----------|-------------------|
| Chat general económico | `gpt-4o-mini` |
| Código de alta calidad | `claude-sonnet-4` |
| Máxima velocidad | `llama-3.3-70b` (Groq) |
| Documentos muy largos | `gemini-1.5-pro` (1M tokens) |
| Razonamiento complejo | `o3-mini` |
| Balance calidad/precio | `claude-sonnet-4` |
| Sin internet / privacidad | Ollama + llama3.3 |

## Selección Dinámica

```typescript
type TipoTarea = 'chat' | 'codigo' | 'documento_largo' | 'razonamiento' | 'rapido';

function seleccionarModelo(tipo: TipoTarea) {
  switch (tipo) {
    case 'chat':
      return openai('gpt-4o-mini');
    case 'codigo':
      return anthropic('claude-sonnet-4-20250514');
    case 'documento_largo':
      return google('gemini-1.5-pro');
    case 'razonamiento':
      return openai('o3-mini');
    case 'rapido':
      return groq('llama-3.3-70b-versatile');
    default:
      return openai('gpt-4o-mini');
  }
}

// Uso
const { text } = await generateText({
  model: seleccionarModelo('codigo'),
  prompt: 'Escribe una función para validar RFC mexicano',
});
```

## Fallback entre Proveedores

Cuando un proveedor falla, usa otro:

```typescript
import { generateText, APICallError } from 'ai';

async function generarConFallback(
  prompt: string,
  modelos: LanguageModel[]
): Promise<string> {
  for (let i = 0; i < modelos.length; i++) {
    try {
      const { text } = await generateText({
        model: modelos[i],
        prompt,
      });
      return text;
    } catch (error) {
      console.error(`Modelo ${i + 1} falló:`, error);

      // Rate limit: esperar antes del siguiente
      if (error instanceof APICallError && error.statusCode === 429) {
        await new Promise(r => setTimeout(r, 1000));
      }

      // Si es el último, propagar error
      if (i === modelos.length - 1) throw error;
    }
  }
  throw new Error('Todos los modelos fallaron');
}

// Uso
const respuesta = await generarConFallback(
  '¿Cuál es la capital de México?',
  [
    openai('gpt-4o-mini'),
    anthropic('claude-haiku-3-20250514'),
    google('gemini-2.0-flash'),
  ]
);
```

## Provider Options

Cada proveedor tiene opciones específicas:

```typescript
// OpenAI
await generateText({
  model: openai('gpt-4o-mini'),
  prompt: '...',
  providerOptions: {
    openai: {
      parallelToolCalls: false,
      strictToolCalling: true,
    },
  },
});

// Anthropic - caché de prompts
await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: '...',
  providerOptions: {
    anthropic: {
      cacheControl: true,
    },
  },
});

// Google - safety settings
await generateText({
  model: google('gemini-2.0-flash'),
  prompt: '...',
  providerOptions: {
    google: {
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    },
  },
});
```

## Modelos Locales con Ollama

Para privacidad total y sin costos:

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo
ollama pull llama3.3
ollama pull codellama
```

```typescript
import { ollama } from 'ollama-ai-provider';

const { text } = await generateText({
  model: ollama('llama3.3'),
  prompt: '¿Cuál es la capital de México?',
});
```

**Ventajas**: Sin costos, sin límites, privacidad total, funciona offline.
**Desventajas**: Requiere GPU, modelos menos capaces.

## Manejo de Errores

```typescript
import { APICallError } from 'ai';

try {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt: 'Hola',
  });
} catch (error) {
  if (error instanceof APICallError) {
    switch (error.statusCode) {
      case 401: console.error('API key inválida'); break;
      case 429: console.error('Rate limit'); break;
      case 500: console.error('Error del servidor'); break;
      case 503: console.error('Servicio no disponible'); break;
    }
  }
}
```

## Costos Aproximados (USD por 1M tokens)

| Modelo | Input | Output |
|--------|-------|--------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |
| claude-sonnet-4 | $3.00 | $15.00 |
| claude-haiku-3 | $0.25 | $1.25 |
| gemini-2.0-flash | $0.10 | $0.40 |
| gemini-1.5-pro | $1.25 | $5.00 |
| llama-3.3-70b (Groq) | $0.59 | $0.79 |

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| **Providers** | OpenAI, Anthropic, Google, Mistral, Groq, Ollama |
| **Misma API** | Cambiar modelo = cambiar una línea |
| **Selección dinámica** | Elegir modelo según la tarea |
| **Fallbacks** | Si un proveedor falla, usar otro |
| **Provider options** | Configuración específica por proveedor |
| **Modelos locales** | Ollama para privacidad |

El AI SDK te da flexibilidad total. Puedes empezar con un proveedor y cambiar según necesidades de costo, velocidad, o capacidad sin reescribir tu código.

---

## Conclusión del Libro

A lo largo de estos 13 capítulos construiste una base sólida:

1. **Fundamentos**: Streams, tokens, context window
2. **React**: useChat para interfaces de chat
3. **Backend**: Streaming HTTP con React Router v7
4. **Structured Output**: Datos tipados con Zod
5. **Tools**: El modelo ejecuta acciones
6. **Agentes**: ToolLoopAgent para sistemas autónomos
7. **Imágenes**: Generación visual
8. **Embeddings**: Búsqueda semántica
9. **RAG**: Chatbots con conocimiento
10. **Agentic RAG**: Agentes que deciden qué buscar
11. **Audio**: Voz a texto y texto a voz
12. **Multi-Provider**: Flexibilidad entre modelos

El AI SDK abstrae la complejidad. El mismo patrón aplica para chat, agentes, o RAG. El mismo código funciona con diferentes proveedores.

**El siguiente paso es tuyo**: toma estos conceptos y construye algo. Un asistente para tu negocio, un chatbot para tu sitio, una herramienta de productividad. La IA ya no es magia reservada para expertos. Es TypeScript. Es tu stack.

*¡Éxito!*

*— Héctorbliss, FixterGeek*
