# Capítulo 13: Multi-Provider — Usando Diferentes Modelos

Una de las grandes ventajas del AI SDK es su abstracción sobre proveedores. El mismo código funciona con OpenAI, Anthropic, Google, Mistral, y muchos más. Solo cambias una línea.

En este capítulo aprenderás a:

- Usar diferentes proveedores con la misma API
- Cambiar entre modelos dinámicamente
- Elegir el mejor modelo para cada tarea
- Implementar fallbacks cuando un proveedor falla

## Código Primero: Mismo Código, Diferentes Modelos

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const prompt = 'Explica qué es una función recursiva en una oración.';

// OpenAI
const { text: respuestaOpenAI } = await generateText({
  model: openai('gpt-4o-mini'),
  prompt,
});
console.log('OpenAI:', respuestaOpenAI);

// Anthropic (Claude)
const { text: respuestaAnthropic } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt,
});
console.log('Claude:', respuestaAnthropic);

// Google (Gemini)
const { text: respuestaGoogle } = await generateText({
  model: google('gemini-1.5-flash'),
  prompt,
});
console.log('Gemini:', respuestaGoogle);
```

Salida:

```
OpenAI: Una función recursiva es aquella que se llama a sí misma para resolver un problema dividiéndolo en subproblemas más pequeños.

Claude: Una función recursiva es una función que se llama a sí misma dentro de su propia definición para resolver problemas que pueden descomponerse en casos más simples del mismo problema.

Gemini: Una función recursiva es aquella que se invoca a sí misma para resolver un problema reduciéndolo a instancias más pequeñas hasta alcanzar un caso base.
```

## Instalación de Proveedores

```bash
# OpenAI
npm install @ai-sdk/openai

# Anthropic (Claude)
npm install @ai-sdk/anthropic

# Google (Gemini)
npm install @ai-sdk/google

# Mistral
npm install @ai-sdk/mistral

# Groq (modelos open source rápidos)
npm install @ai-sdk/groq

# Amazon Bedrock
npm install @ai-sdk/amazon-bedrock

# Azure OpenAI
npm install @ai-sdk/azure
```

## Variables de Entorno

Cada proveedor necesita su API key:

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
```

Los providers del AI SDK leen automáticamente estas variables.

## Catálogo de Modelos por Proveedor

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

// Modelos de chat
openai('gpt-4o')           // Más capaz, multimodal
openai('gpt-4o-mini')      // Rápido y económico
openai('gpt-4-turbo')      // Balance velocidad/capacidad
openai('o1')               // Razonamiento avanzado
openai('o1-mini')          // Razonamiento económico

// Embeddings
openai.embedding('text-embedding-3-small')  // Rápido
openai.embedding('text-embedding-3-large')  // Más preciso

// Transcripción
openai.transcription('whisper-1')

// Text-to-Speech
openai.speech('tts-1')
openai.speech('tts-1-hd')

// Generación de imágenes
openai.image('dall-e-3')
```

### Anthropic (Claude)

```typescript
import { anthropic } from '@ai-sdk/anthropic';

// Modelos de chat
anthropic('claude-3-5-sonnet-20241022')  // Balance ideal
anthropic('claude-3-5-haiku-20241022')   // Rápido y económico
anthropic('claude-3-opus-20240229')      // Más capaz

// Claude tiene contexto muy largo (200K tokens)
```

### Google (Gemini)

```typescript
import { google } from '@ai-sdk/google';

// Modelos de chat
google('gemini-1.5-pro')    // Más capaz, contexto 1M tokens
google('gemini-1.5-flash')  // Rápido y económico
google('gemini-2.0-flash')  // Última versión

// Embeddings
google.textEmbeddingModel('text-embedding-004')
```

### Mistral

```typescript
import { mistral } from '@ai-sdk/mistral';

mistral('mistral-large-latest')   // Más capaz
mistral('mistral-small-latest')   // Económico
mistral('codestral-latest')       // Especializado en código
mistral('open-mistral-nemo')      // Open source
```

### Groq (Modelos Open Source)

```typescript
import { groq } from '@ai-sdk/groq';

// Groq ejecuta modelos open source con hardware optimizado
groq('llama-3.1-70b-versatile')   // Llama 3.1 70B
groq('llama-3.1-8b-instant')      // Llama 3.1 8B (muy rápido)
groq('mixtral-8x7b-32768')        // Mixtral
groq('gemma2-9b-it')              // Gemma 2
```

## Comparativa de Modelos

| Proveedor | Modelo | Velocidad | Costo | Contexto | Ideal para |
|-----------|--------|-----------|-------|----------|------------|
| OpenAI | gpt-4o-mini | Rápida | Bajo | 128K | Uso general |
| OpenAI | gpt-4o | Media | Alto | 128K | Tareas complejas |
| OpenAI | o1 | Lenta | Muy alto | 128K | Razonamiento |
| Anthropic | claude-3-5-sonnet | Rápida | Medio | 200K | Balance ideal |
| Anthropic | claude-3-5-haiku | Muy rápida | Bajo | 200K | Alto volumen |
| Google | gemini-1.5-flash | Muy rápida | Bajo | 1M | Documentos largos |
| Google | gemini-1.5-pro | Media | Medio | 1M | Contexto extenso |
| Groq | llama-3.1-8b | Extrema | Muy bajo | 8K | Latencia crítica |

## Selección Dinámica de Modelo

### Por Tipo de Tarea

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

type TipoTarea =
  | 'chat_simple'
  | 'codigo'
  | 'analisis_documento_largo'
  | 'razonamiento'
  | 'alta_velocidad';

function seleccionarModelo(tipo: TipoTarea) {
  switch (tipo) {
    case 'chat_simple':
      return openai('gpt-4o-mini');

    case 'codigo':
      return anthropic('claude-3-5-sonnet-20241022');

    case 'analisis_documento_largo':
      return google('gemini-1.5-pro'); // 1M tokens de contexto

    case 'razonamiento':
      return openai('o1-mini');

    case 'alta_velocidad':
      return groq('llama-3.1-8b-instant');

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

### Por Características del Input

```typescript
function seleccionarModeloPorInput(input: string): LanguageModel {
  const tokens = estimarTokens(input);

  // Documentos muy largos -> Gemini (1M contexto)
  if (tokens > 100000) {
    return google('gemini-1.5-pro');
  }

  // Documentos largos -> Claude (200K contexto)
  if (tokens > 50000) {
    return anthropic('claude-3-5-sonnet-20241022');
  }

  // Contenido normal -> GPT-4o-mini (económico)
  return openai('gpt-4o-mini');
}

function estimarTokens(texto: string): number {
  // Aproximación: 1 token ≈ 4 caracteres en español
  return Math.ceil(texto.length / 4);
}
```

### Por Presupuesto

```typescript
interface PresupuestoConfig {
  maxCostoPorRequest: number; // en USD
  prioridad: 'calidad' | 'velocidad' | 'economico';
}

function seleccionarModeloPorPresupuesto(
  config: PresupuestoConfig,
  tokensEstimados: number
) {
  // Costos aproximados por 1M tokens (input + output promedio)
  const costos = {
    'gpt-4o': 15,
    'gpt-4o-mini': 0.6,
    'claude-3-5-sonnet': 9,
    'claude-3-5-haiku': 1,
    'gemini-1.5-pro': 7,
    'gemini-1.5-flash': 0.35,
    'llama-3.1-8b': 0.05,
  };

  // Calcular costo estimado
  const costoEstimado = (modelo: string) =>
    (tokensEstimados / 1000000) * costos[modelo as keyof typeof costos];

  if (config.prioridad === 'economico') {
    if (costoEstimado('llama-3.1-8b') <= config.maxCostoPorRequest) {
      return groq('llama-3.1-8b-instant');
    }
    if (costoEstimado('gemini-1.5-flash') <= config.maxCostoPorRequest) {
      return google('gemini-1.5-flash');
    }
    return openai('gpt-4o-mini');
  }

  if (config.prioridad === 'velocidad') {
    return groq('llama-3.1-8b-instant');
  }

  // Prioridad calidad
  if (costoEstimado('gpt-4o') <= config.maxCostoPorRequest) {
    return openai('gpt-4o');
  }
  return anthropic('claude-3-5-sonnet-20241022');
}
```

## Fallback entre Proveedores

Cuando un proveedor falla, usa otro:

```typescript
import { generateText, APICallError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

interface ModeloConFallback {
  primario: LanguageModel;
  fallbacks: LanguageModel[];
}

async function generateTextConFallback(
  config: ModeloConFallback,
  opciones: { prompt: string; system?: string }
): Promise<string> {
  const modelos = [config.primario, ...config.fallbacks];

  for (let i = 0; i < modelos.length; i++) {
    const modelo = modelos[i];

    try {
      const { text } = await generateText({
        model: modelo,
        ...opciones,
      });

      if (i > 0) {
        console.log(`Fallback exitoso: usando modelo ${i + 1}`);
      }

      return text;
    } catch (error) {
      console.error(`Error con modelo ${i + 1}:`, error);

      // Si es el último modelo, propagar el error
      if (i === modelos.length - 1) {
        throw error;
      }

      // Si es rate limit, esperar antes del siguiente intento
      if (error instanceof APICallError && error.statusCode === 429) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw new Error('Todos los modelos fallaron');
}

// Uso
const respuesta = await generateTextConFallback(
  {
    primario: openai('gpt-4o-mini'),
    fallbacks: [
      anthropic('claude-3-5-haiku-20241022'),
      google('gemini-1.5-flash'),
    ],
  },
  {
    prompt: '¿Cuál es la capital de México?',
  }
);
```

## Router de Modelos

Un patrón más sofisticado: un router que elige el modelo basado en la consulta:

```typescript
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Esquema para clasificar la consulta
const clasificacionSchema = z.object({
  categoria: z.enum([
    'codigo',
    'creativo',
    'analisis',
    'factual',
    'conversacion',
  ]),
  complejidad: z.enum(['baja', 'media', 'alta']),
  requiereRazonamiento: z.boolean(),
});

async function clasificarConsulta(prompt: string) {
  const { object } = await generateText({
    model: openai('gpt-4o-mini'), // Modelo rápido para clasificar
    output: Output.object({ schema: clasificacionSchema }),
    prompt: `Clasifica esta consulta:

"${prompt}"

- categoria: tipo principal de tarea
- complejidad: qué tan difícil es
- requiereRazonamiento: si necesita pensar paso a paso`,
  });

  return object;
}

function elegirModelo(clasificacion: z.infer<typeof clasificacionSchema>) {
  // Razonamiento complejo -> o1
  if (clasificacion.requiereRazonamiento && clasificacion.complejidad === 'alta') {
    return openai('o1-mini');
  }

  // Código -> Claude (excelente en código)
  if (clasificacion.categoria === 'codigo') {
    return clasificacion.complejidad === 'alta'
      ? anthropic('claude-3-5-sonnet-20241022')
      : openai('gpt-4o-mini');
  }

  // Creativo -> Claude (bueno en escritura)
  if (clasificacion.categoria === 'creativo') {
    return anthropic('claude-3-5-sonnet-20241022');
  }

  // Análisis largo -> Gemini (contexto largo)
  if (clasificacion.categoria === 'analisis') {
    return google('gemini-1.5-pro');
  }

  // Conversación simple -> modelo rápido
  if (clasificacion.categoria === 'conversacion' || clasificacion.complejidad === 'baja') {
    return openai('gpt-4o-mini');
  }

  // Default
  return openai('gpt-4o-mini');
}

// Router completo
async function routerModelos(prompt: string, system?: string) {
  // 1. Clasificar la consulta
  const clasificacion = await clasificarConsulta(prompt);
  console.log('Clasificación:', clasificacion);

  // 2. Elegir modelo
  const modelo = elegirModelo(clasificacion);
  console.log('Modelo elegido:', modelo.modelId);

  // 3. Generar respuesta
  const { text } = await generateText({
    model: modelo,
    system,
    prompt,
  });

  return {
    respuesta: text,
    modelo: modelo.modelId,
    clasificacion,
  };
}

// Uso
const resultado = await routerModelos(
  'Escribe una función en TypeScript que valide un CURP mexicano'
);
// Clasificación: { categoria: 'codigo', complejidad: 'media', requiereRazonamiento: false }
// Modelo elegido: gpt-4o-mini
```

## Configuración por Ambiente

```typescript
// lib/ai-config.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

type Ambiente = 'development' | 'staging' | 'production';

const ambiente = (process.env.NODE_ENV || 'development') as Ambiente;

export const modelosPorAmbiente = {
  development: {
    // En desarrollo, usar modelos económicos
    chat: openai('gpt-4o-mini'),
    codigo: openai('gpt-4o-mini'),
    embeddings: openai.embedding('text-embedding-3-small'),
  },

  staging: {
    // En staging, probar modelos de producción
    chat: anthropic('claude-3-5-sonnet-20241022'),
    codigo: anthropic('claude-3-5-sonnet-20241022'),
    embeddings: openai.embedding('text-embedding-3-small'),
  },

  production: {
    // En producción, los mejores modelos
    chat: anthropic('claude-3-5-sonnet-20241022'),
    codigo: anthropic('claude-3-5-sonnet-20241022'),
    embeddings: openai.embedding('text-embedding-3-large'),
  },
};

export const modelos = modelosPorAmbiente[ambiente];

// Uso en cualquier parte
import { modelos } from '~/lib/ai-config';

const { text } = await generateText({
  model: modelos.chat,
  prompt: 'Hola',
});
```

## Modelos Locales con Ollama

Puedes usar modelos locales con el provider de Ollama:

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Descargar un modelo
ollama pull llama3.1
ollama pull codellama
ollama pull mistral
```

```typescript
import { ollama } from 'ollama-ai-provider';

// Usar modelo local
const { text } = await generateText({
  model: ollama('llama3.1'),
  prompt: '¿Cuál es la capital de México?',
});

// Streaming también funciona
const result = streamText({
  model: ollama('llama3.1'),
  prompt: 'Escribe un poema sobre la lluvia',
});
```

Ventajas de modelos locales:
- Sin costos por token
- Sin límites de rate
- Privacidad total
- Funciona sin internet

Desventajas:
- Requiere hardware potente (GPU recomendada)
- Modelos menos capaces que los comerciales
- Configuración inicial más compleja

## A/B Testing de Modelos

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

interface ResultadoABTest {
  modelo: string;
  respuesta: string;
  latenciaMs: number;
  tokens: number;
}

async function abTestModelos(
  prompt: string,
  modelos: Array<{ nombre: string; modelo: LanguageModel }>
): Promise<ResultadoABTest[]> {
  const resultados: ResultadoABTest[] = [];

  for (const { nombre, modelo } of modelos) {
    const inicio = Date.now();

    const { text, usage } = await generateText({
      model: modelo,
      prompt,
    });

    resultados.push({
      modelo: nombre,
      respuesta: text,
      latenciaMs: Date.now() - inicio,
      tokens: usage.totalTokens,
    });
  }

  return resultados;
}

// Ejecutar A/B test
const resultados = await abTestModelos(
  'Explica el patrón MVC en 2 oraciones',
  [
    { nombre: 'GPT-4o-mini', modelo: openai('gpt-4o-mini') },
    { nombre: 'Claude Haiku', modelo: anthropic('claude-3-5-haiku-20241022') },
    { nombre: 'Claude Sonnet', modelo: anthropic('claude-3-5-sonnet-20241022') },
  ]
);

console.table(resultados.map(r => ({
  modelo: r.modelo,
  latencia: `${r.latenciaMs}ms`,
  tokens: r.tokens,
})));

// ┌─────────────────┬──────────┬────────┐
// │ modelo          │ latencia │ tokens │
// ├─────────────────┼──────────┼────────┤
// │ GPT-4o-mini     │ 823ms    │ 67     │
// │ Claude Haiku    │ 456ms    │ 58     │
// │ Claude Sonnet   │ 1204ms   │ 72     │
// └─────────────────┴──────────┴────────┘
```

## Provider Options Específicas

Cada proveedor tiene opciones únicas:

```typescript
// OpenAI - función calling estricto
await generateText({
  model: openai('gpt-4o-mini'),
  prompt: '...',
  providerOptions: {
    openai: {
      parallelToolCalls: false,    // Tools secuenciales
      strictToolCalling: true,     // Validación estricta
    },
  },
});

// Anthropic - caché de prompts
await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: '...',
  providerOptions: {
    anthropic: {
      cacheControl: true,          // Habilitar caché
    },
  },
});

// Google - safety settings
await generateText({
  model: google('gemini-1.5-pro'),
  prompt: '...',
  providerOptions: {
    google: {
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    },
  },
});
```

## Manejo de Errores por Proveedor

```typescript
import { APICallError } from 'ai';

try {
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt: 'Hola',
  });
} catch (error) {
  if (error instanceof APICallError) {
    switch (error.statusCode) {
      case 401:
        console.error('API key inválida');
        break;
      case 429:
        console.error('Rate limit excedido');
        // Esperar y reintentar, o usar fallback
        break;
      case 500:
        console.error('Error del servidor del proveedor');
        // Usar fallback
        break;
      case 503:
        console.error('Servicio no disponible');
        // Usar fallback
        break;
      default:
        console.error(`Error HTTP ${error.statusCode}`);
    }

    // Información adicional del error
    console.error('Proveedor:', error.url);
    console.error('Request ID:', error.requestId);
  }
}
```

## Ejemplo: Servicio Multi-Modelo

```typescript
// lib/ai-service.ts
import { generateText, streamText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export class AIService {
  // Método principal con selección automática
  async generate(
    prompt: string,
    options: {
      tipo?: 'rapido' | 'calidad' | 'economico';
      maxTokens?: number;
    } = {}
  ) {
    const modelo = this.seleccionarModelo(options.tipo || 'rapido');

    return generateText({
      model: modelo,
      prompt,
      maxTokens: options.maxTokens,
    });
  }

  // Streaming con fallback
  stream(prompt: string) {
    return streamText({
      model: this.seleccionarModelo('rapido'),
      prompt,
    });
  }

  // Embeddings (siempre OpenAI - mejor relación calidad/precio)
  async embed(text: string) {
    return embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
  }

  // Para código específicamente
  async generateCodigo(prompt: string) {
    return generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: 'Eres un experto programador. Responde solo con código, sin explicaciones.',
      prompt,
    });
  }

  // Para documentos largos
  async analizarDocumento(documento: string, pregunta: string) {
    return generateText({
      model: google('gemini-1.5-pro'), // 1M de contexto
      prompt: `Documento:\n${documento}\n\nPregunta: ${pregunta}`,
    });
  }

  private seleccionarModelo(tipo: 'rapido' | 'calidad' | 'economico') {
    switch (tipo) {
      case 'rapido':
        return groq('llama-3.1-8b-instant');
      case 'calidad':
        return anthropic('claude-3-5-sonnet-20241022');
      case 'economico':
        return openai('gpt-4o-mini');
    }
  }
}

// Singleton para usar en toda la app
export const ai = new AIService();
```

```typescript
// Uso
import { ai } from '~/lib/ai-service';

// Respuesta rápida
const { text: rapida } = await ai.generate('¿Qué hora es?', { tipo: 'rapido' });

// Alta calidad
const { text: calidad } = await ai.generate('Escribe un ensayo sobre IA', { tipo: 'calidad' });

// Código
const { text: codigo } = await ai.generateCodigo('Función para validar email');

// Documento largo
const { text: analisis } = await ai.analizarDocumento(documentoLargo, '¿Cuáles son los puntos principales?');
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| **Providers** | OpenAI, Anthropic, Google, Mistral, Groq, Ollama |
| **Misma API** | Cambiar modelo = cambiar una línea |
| **Selección dinámica** | Elegir modelo según tarea, input, o presupuesto |
| **Fallbacks** | Si un proveedor falla, usar otro |
| **Router** | Clasificar consulta y elegir modelo automáticamente |
| **A/B Testing** | Comparar modelos en latencia, calidad, costo |
| **Provider options** | Configuración específica por proveedor |
| **Modelos locales** | Ollama para privacidad y sin costos |

### Guía Rápida de Selección

| Necesidad | Modelo recomendado |
|-----------|-------------------|
| Chat general económico | `gpt-4o-mini` |
| Código de alta calidad | `claude-3-5-sonnet` |
| Máxima velocidad | `llama-3.1-8b` (Groq) |
| Documentos muy largos | `gemini-1.5-pro` |
| Razonamiento complejo | `o1-mini` |
| Balance calidad/precio | `claude-3-5-sonnet` |
| Sin internet / privacidad | Ollama + llama3.1 |

### Costos Aproximados (USD por 1M tokens)

| Modelo | Input | Output |
|--------|-------|--------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $5.00 | $15.00 |
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.25 | $1.25 |
| gemini-1.5-flash | $0.075 | $0.30 |
| gemini-1.5-pro | $1.25 | $5.00 |
| llama-3.1-8b (Groq) | $0.05 | $0.08 |

---

## Conclusión del Libro

A lo largo de estos 13 capítulos, has construido una base sólida para integrar IA en tus aplicaciones TypeScript:

1. **Fundamentos**: Streams, tokens, context window
2. **React**: Hooks especializados para UI de chat
3. **Backend**: Streaming HTTP y React Router v7
4. **Structured Output**: Datos tipados con Zod
5. **Tools**: El modelo ejecuta acciones
6. **Agentes**: Sistemas autónomos con loops
7. **Imágenes**: Generación visual con código
8. **Embeddings**: Búsqueda semántica
9. **RAG**: Chatbots con conocimiento
10. **Agentic RAG**: Agentes que deciden qué buscar
11. **Audio**: Voz a texto y texto a voz
12. **Multi-Provider**: Flexibilidad entre modelos

El AI SDK te da una abstracción poderosa sobre toda esta complejidad. El mismo código funciona con diferentes proveedores, el mismo patrón aplica para chat, agentes, o RAG.

**El siguiente paso es tuyo**: toma estos conceptos y construye algo. Un asistente para tu negocio, un chatbot para tu sitio, una herramienta de productividad. La IA ya no es magia reservada para expertos en Python y machine learning. Es TypeScript. Es tu stack. Es hora de construir.

*¡Éxito!*

*— Héctorbliss, FixterGeek*
