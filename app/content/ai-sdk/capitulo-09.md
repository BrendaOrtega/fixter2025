# Capítulo 9: Embeddings — Cuando el Texto se Convierte en Números

Hasta ahora hemos generado texto, objetos estructurados e imágenes. Pero hay una capacidad fundamental que hace posible la búsqueda semántica, los sistemas de recomendación y RAG: los **embeddings**.

Un embedding convierte texto en un vector de números. Textos con significado similar producen vectores cercanos en el espacio. Esto permite buscar por *significado*, no solo por palabras exactas.

## Código Primero

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

const { embedding, usage } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'El pozole es un platillo tradicional mexicano',
});

console.log('Dimensiones:', embedding.length);
// 1536

console.log('Primeros 5 valores:', embedding.slice(0, 5));
// [0.0234, -0.0891, 0.0456, -0.0123, 0.0789]

console.log('Tokens usados:', usage.tokens);
// 9
```

Eso es todo. Un texto se convierte en 1,536 números que representan su significado.

## ¿Qué Acaba de Pasar?

1. **`embed()`** — Función del AI SDK para generar embeddings
2. **`openai.embedding('text-embedding-3-small')`** — Modelo de embedding (diferente a los de texto)
3. **`value`** — El texto a convertir
4. **`embedding`** — Array de números que representa el significado
5. **`usage.tokens`** — Tokens consumidos (para calcular costos)

El modelo procesa el texto y produce un vector de punto flotante. Cada dimensión captura algún aspecto del significado.

## ¿Por Qué 1,536 Números?

Imagina que quieres describir una película con solo 3 números:
- Qué tan de acción es (0 a 1)
- Qué tan romántica es (0 a 1)
- Qué tan de comedia es (0 a 1)

"Die Hard" sería `[0.9, 0.1, 0.2]`. "Titanic" sería `[0.3, 0.9, 0.1]`.

Los embeddings hacen lo mismo, pero con 1,536 dimensiones que capturan matices semánticos que ni siquiera podemos nombrar. El modelo aprende estas dimensiones durante su entrenamiento con millones de textos.

## Similitud de Vectores

Dos textos similares en significado producen vectores cercanos:

```typescript
import { embed, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai.embedding('text-embedding-3-small');

// Embeder tres textos sobre diferentes temas
const { embedding: e1 } = await embed({
  model,
  value: 'El pozole rojo lleva carne de cerdo y chile guajillo',
});

const { embedding: e2 } = await embed({
  model,
  value: 'La receta del pozole incluye maíz cacahuazintle y puerco',
});

const { embedding: e3 } = await embed({
  model,
  value: 'Los lenguajes de programación más populares son Python y JavaScript',
});

// Calcular similitud
console.log('Pozole vs Pozole:', cosineSimilarity(e1, e2).toFixed(3));
// 0.847 — Muy similares (hablan de lo mismo)

console.log('Pozole vs Programación:', cosineSimilarity(e1, e3).toFixed(3));
// 0.112 — Muy diferentes (temas distintos)
```

`cosineSimilarity` mide qué tan alineados están dos vectores:
- **1.0** — Idénticos en significado
- **0.0** — Sin relación semántica
- **-1.0** — Significados opuestos

La función está incluida en el AI SDK, no necesitas implementarla. Internamente calcula el coseno del ángulo entre los dos vectores en el espacio de 1,536 dimensiones.

## Modelos de Embedding Disponibles

```typescript
import { openai } from '@ai-sdk/openai';

// Modelo pequeño - 1536 dimensiones (recomendado para empezar)
const small = openai.embedding('text-embedding-3-small');

// Modelo grande - 3072 dimensiones (máxima precisión)
const large = openai.embedding('text-embedding-3-large');

// Modelo legacy - 1536 dimensiones (no usar en proyectos nuevos)
const ada = openai.embedding('text-embedding-ada-002');
```

### Comparativa de Modelos

| Modelo | Dimensiones | Costo por 1M tokens | Uso recomendado |
|--------|-------------|---------------------|-----------------|
| `text-embedding-3-small` | 1536 | ~$0.02 USD | Balance velocidad/precisión |
| `text-embedding-3-large` | 3072 | ~$0.13 USD | Máxima precisión |
| `text-embedding-ada-002` | 1536 | ~$0.10 USD | Legacy, evitar |

Para la mayoría de casos, `text-embedding-3-small` es suficiente y más económico.

## Reducir Dimensiones

A veces 1,536 dimensiones son demasiadas para tu base de datos o necesitas optimizar almacenamiento:

```typescript
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'Producto: Laptop gaming 16GB RAM',
  providerOptions: {
    openai: {
      dimensions: 512,  // Reducir de 1536 a 512
    }
  }
});

console.log('Dimensiones:', embedding.length);
// 512
```

OpenAI usa una técnica llamada "Matryoshka representation learning" que permite truncar dimensiones manteniendo la utilidad del embedding. Con 512 dimensiones pierdes algo de precisión pero reduces almacenamiento y tiempo de cálculo.

## embedMany: Procesamiento en Lote

Cuando necesitas embeder múltiples textos, usa `embedMany` en lugar de llamar `embed` en un loop:

```typescript
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

const productos = [
  'Laptop gaming con RTX 4060',
  'Teclado mecánico RGB',
  'Mouse inalámbrico ergonómico',
  'Monitor 4K 27 pulgadas',
  'Auriculares con cancelación de ruido',
];

const { embeddings, usage } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: productos,
});

console.log('Productos procesados:', embeddings.length);
// 5

console.log('Tokens totales:', usage.tokens);
// 42

// Cada embedding corresponde al producto en la misma posición
console.log(productos[0], '→', embeddings[0].length, 'dimensiones');
// "Laptop gaming con RTX 4060" → 1536 dimensiones
```

`embedMany` es más eficiente porque agrupa las solicitudes en una sola llamada a la API.

### Control de Concurrencia

Cuando procesas miles de items, controla las llamadas paralelas para no exceder límites de la API:

```typescript
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: catalogoDe10MilProductos,
  maxParallelCalls: 5,  // Máximo 5 solicitudes simultáneas
  maxRetries: 3,        // Reintentos si falla
});
```

---

## El Flujo Completo: Indexación y Búsqueda

Antes de hablar de bases de datos, entendamos el flujo completo de un sistema de búsqueda semántica. Son dos fases distintas:

### Fase 1: Indexación (se hace una vez)

```
Documentos → Chunking → Embeddings → Almacenamiento
```

1. Tomas tus documentos originales
2. Los divides en fragmentos (chunks)
3. Generas un embedding para cada chunk
4. Guardas los chunks con sus embeddings

### Fase 2: Búsqueda (se hace en cada consulta)

```
Consulta → Embedding → Similitud → Top-K → Resultados
```

1. El usuario hace una pregunta
2. Generas un embedding de la pregunta
3. Calculas similitud contra todos los chunks indexados
4. Seleccionas los K más relevantes (Top-K)
5. Devuelves los resultados

Veamos cada parte en detalle.

---

## Chunking: Dividiendo Documentos Largos

Un embedding representa un texto completo como un solo vector. Pero hay un problema: los modelos de embedding tienen límites de tokens (8,191 para text-embedding-3-small) y un documento largo pierde detalle al comprimirse en un solo vector.

La solución es **chunking**: dividir el documento en fragmentos más pequeños y embeder cada uno por separado.

### Estrategia básica: por caracteres

```typescript
function chunkByCharacters(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;  // El overlap evita cortar ideas a la mitad
  }

  return chunks;
}

// Ejemplo
const documento = `El pozole es un platillo tradicional mexicano que data de la época prehispánica.
Se prepara con maíz cacahuazintle y carne, generalmente de cerdo.
Existen variantes regionales: el pozole rojo de Jalisco usa chile guajillo,
el pozole verde de Guerrero lleva pepita y chile poblano,
y el pozole blanco se sirve sin salsa para que cada comensal lo aderece.`;

const chunks = chunkByCharacters(documento, 150, 30);

console.log('Chunks generados:', chunks.length);
chunks.forEach((chunk, i) => {
  console.log(`\n--- Chunk ${i + 1} (${chunk.length} chars) ---`);
  console.log(chunk);
});
```

Output:
```
Chunks generados: 3

--- Chunk 1 (150 chars) ---
El pozole es un platillo tradicional mexicano que data de la época prehispánica.
Se prepara con maíz cacahuazintle y carne, generalmente de cerdo.

--- Chunk 2 (150 chars) ---
e, generalmente de cerdo.
Existen variantes regionales: el pozole rojo de Jalisco usa chile guajillo,
el pozole verde de Guerrero lleva pepita y chile

--- Chunk 3 (138 chars) ---
 pepita y chile poblano,
y el pozole blanco se sirve sin salsa para que cada comensal lo aderece.
```

### ¿Por qué overlap?

El overlap (solapamiento) es crítico. Sin él, podrías cortar una oración a la mitad:

```
Chunk 1: "...el pozole rojo de Jalisco usa chi"
Chunk 2: "le guajillo, el pozole verde..."
```

Con overlap, la información del borde aparece en ambos chunks, asegurando que no se pierda contexto.

### Estrategia mejorada: por oraciones

Cortar por caracteres puede romper oraciones. Una mejor estrategia:

```typescript
function chunkBySentences(text: string, maxChunkSize: number): string[] {
  // Dividir en oraciones (simplificado)
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // Si agregar esta oración excede el límite, guardar chunk actual
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + ' ';
  }

  // No olvidar el último chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

const chunks = chunkBySentences(documento, 200);
```

### Estrategia avanzada: por secciones semánticas

Para documentos estructurados (markdown, HTML), respeta la estructura:

```typescript
function chunkByHeadings(markdown: string): Array<{ title: string; content: string }> {
  const sections = markdown.split(/^##\s+/m);

  return sections
    .filter(section => section.trim())
    .map(section => {
      const [title, ...rest] = section.split('\n');
      return {
        title: title.trim(),
        content: rest.join('\n').trim(),
      };
    });
}
```

### Metadatos en chunks

Es útil guardar contexto adicional con cada chunk:

```typescript
interface Chunk {
  id: string;
  content: string;
  metadata: {
    sourceDocument: string;
    chunkIndex: number;
    totalChunks: number;
    section?: string;
  };
  embedding?: number[];
}

function createChunks(document: string, documentId: string): Chunk[] {
  const rawChunks = chunkBySentences(document, 500);

  return rawChunks.map((content, index) => ({
    id: `${documentId}-chunk-${index}`,
    content,
    metadata: {
      sourceDocument: documentId,
      chunkIndex: index,
      totalChunks: rawChunks.length,
    },
  }));
}
```

---

## Top-K: Seleccionando los Más Relevantes

Después de calcular la similitud de tu consulta contra todos los chunks, necesitas seleccionar los mejores. Esto se llama **Top-K**: obtener los K resultados con mayor similitud.

```typescript
interface ChunkWithScore {
  chunk: Chunk;
  score: number;  // Similitud coseno (0 a 1)
}

function topK(
  chunks: ChunkWithScore[],
  k: number,
  minScore: number = 0
): ChunkWithScore[] {
  return chunks
    .filter(c => c.score >= minScore)  // Filtrar por umbral mínimo
    .sort((a, b) => b.score - a.score) // Ordenar de mayor a menor
    .slice(0, k);                       // Tomar los primeros K
}
```

### ¿Qué valor de K usar?

| K | Cuándo usarlo |
|---|---------------|
| 1-3 | Preguntas específicas con respuesta única |
| 3-5 | Preguntas generales, balance precisión/contexto |
| 5-10 | Preguntas amplias que requieren múltiples fuentes |
| 10+ | Análisis exhaustivo, resúmenes de documentos |

### Umbral de similitud

No todos los resultados son útiles. Un score de 0.3 probablemente no es relevante:

```typescript
const UMBRAL_MINIMO = 0.5;  // Ignorar resultados con score < 0.5

const resultados = topK(todosLosChunks, 5, UMBRAL_MINIMO);

if (resultados.length === 0) {
  return "No encontré información relevante sobre esa pregunta.";
}
```

---

## Sistema Completo: Sin Base de Datos

Juntemos todo en un ejemplo funcional que no requiere base de datos externa:

```typescript
// lib/semantic-search.ts
import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai.embedding('text-embedding-3-small');

// ============ TIPOS ============
interface Chunk {
  id: string;
  content: string;
  sourceId: string;
  embedding?: number[];
}

interface SearchResult {
  chunk: Chunk;
  score: number;
}

// ============ CHUNKING ============
function chunkText(text: string, maxSize: number = 500, overlap: number = 50): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxSize && current) {
      chunks.push(current.trim());
      // Mantener overlap: últimas palabras del chunk anterior
      const words = current.split(' ');
      current = words.slice(-Math.ceil(overlap / 5)).join(' ') + ' ';
    }
    current += sentence + ' ';
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ============ INDEXACIÓN ============
export async function indexDocuments(
  documents: Array<{ id: string; content: string }>
): Promise<Chunk[]> {
  const allChunks: Chunk[] = [];

  // 1. Crear chunks de todos los documentos
  for (const doc of documents) {
    const textChunks = chunkText(doc.content);

    textChunks.forEach((content, index) => {
      allChunks.push({
        id: `${doc.id}-${index}`,
        content,
        sourceId: doc.id,
      });
    });
  }

  console.log(`Creados ${allChunks.length} chunks de ${documents.length} documentos`);

  // 2. Generar embeddings en lote
  const { embeddings } = await embedMany({
    model,
    values: allChunks.map(c => c.content),
  });

  // 3. Asignar embeddings a cada chunk
  allChunks.forEach((chunk, i) => {
    chunk.embedding = embeddings[i];
  });

  console.log(`Embeddings generados para ${allChunks.length} chunks`);

  return allChunks;
}

// ============ BÚSQUEDA ============
export async function search(
  query: string,
  indexedChunks: Chunk[],
  options: { topK?: number; minScore?: number } = {}
): Promise<SearchResult[]> {
  const { topK = 3, minScore = 0.4 } = options;

  // 1. Embeder la consulta
  const { embedding: queryEmbedding } = await embed({
    model,
    value: query,
  });

  // 2. Calcular similitud con cada chunk
  const scored = indexedChunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding!),
  }));

  // 3. Filtrar, ordenar y seleccionar Top-K
  const results = scored
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}
```

### Uso del sistema

```typescript
// Documentos de ejemplo: recetas mexicanas
const documentos = [
  {
    id: 'pozole',
    content: `El pozole es un platillo tradicional mexicano que data de la época prehispánica.
    Se prepara con maíz cacahuazintle y carne, generalmente de cerdo.
    El pozole rojo de Jalisco usa chile guajillo y chile ancho.
    El pozole verde de Guerrero lleva pepita de calabaza y chile poblano.
    Se sirve con lechuga, rábanos, orégano, tostadas y limón.`
  },
  {
    id: 'mole',
    content: `El mole poblano es considerado el platillo barroco de México.
    Contiene más de 20 ingredientes incluyendo varios tipos de chile, chocolate, especias y frutos secos.
    Su preparación tradicional puede tomar varios días.
    Se sirve típicamente sobre piezas de guajolote o pollo.
    El mole negro de Oaxaca es otra variante famosa con chilhuacle negro.`
  },
  {
    id: 'tamales',
    content: `Los tamales son masa de maíz rellena envuelta en hoja de maíz o plátano.
    Existen cientos de variedades regionales en México.
    Los tamales oaxaqueños usan hoja de plátano y mole negro.
    Los tamales de rajas llevan chile poblano con queso.
    Los tamales dulces pueden llevar piña, fresa o chocolate.`
  }
];

// Fase 1: Indexar (solo una vez)
const indice = await indexDocuments(documentos);
// Output: "Creados 9 chunks de 3 documentos"
// Output: "Embeddings generados para 9 chunks"

// Fase 2: Buscar (cada consulta)
const resultados = await search(
  '¿qué platillo lleva chocolate?',
  indice,
  { topK: 3, minScore: 0.5 }
);

console.log('\n=== Resultados ===');
resultados.forEach((r, i) => {
  console.log(`\n${i + 1}. Score: ${(r.score * 100).toFixed(1)}%`);
  console.log(`   Fuente: ${r.chunk.sourceId}`);
  console.log(`   Contenido: ${r.chunk.content.slice(0, 100)}...`);
});
```

Output:
```
=== Resultados ===

1. Score: 72.3%
   Fuente: mole
   Contenido: El mole poblano es considerado el platillo barroco de México.
   Contiene más de 20 ingredientes incluy...

2. Score: 58.1%
   Fuente: tamales
   Contenido: Los tamales dulces pueden llevar piña, fresa o chocolate.
```

La búsqueda encontró que el mole lleva chocolate aunque la consulta no mencionó "mole". Eso es búsqueda semántica.

---

## De Búsqueda a RAG

Con el sistema de búsqueda funcionando, convertirlo en RAG es agregar generación de texto:

```typescript
import { generateText } from 'ai';

async function preguntarConContexto(
  pregunta: string,
  indice: Chunk[]
): Promise<string> {
  // 1. Buscar chunks relevantes
  const resultados = await search(pregunta, indice, { topK: 3 });

  if (resultados.length === 0) {
    return 'No encontré información relevante para responder esa pregunta.';
  }

  // 2. Construir contexto
  const contexto = resultados
    .map(r => `[Fuente: ${r.chunk.sourceId}]\n${r.chunk.content}`)
    .join('\n\n---\n\n');

  // 3. Generar respuesta
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Eres un experto en gastronomía mexicana.
Responde ÚNICAMENTE con información del contexto proporcionado.
Si la información no está en el contexto, di que no lo sabes.
Cita las fuentes cuando sea relevante.

CONTEXTO:
${contexto}`,
    prompt: pregunta,
  });

  return text;
}

// Uso
const respuesta = await preguntarConContexto(
  '¿Cuál es la diferencia entre el pozole rojo y el verde?',
  indice
);

console.log(respuesta);
// "El pozole rojo, típico de Jalisco, se prepara con chile guajillo y chile ancho,
// mientras que el pozole verde de Guerrero utiliza pepita de calabaza y chile poblano.
// Ambos comparten la base de maíz cacahuazintle y carne de cerdo."
```

---

## Almacenamiento: Cuándo Usar Base de Datos

El ejemplo anterior mantiene todo en memoria. Funciona para:
- Prototipos y pruebas
- Documentación pequeña (< 1000 chunks)
- Aplicaciones donde puedes re-indexar al iniciar

Para producción con datos grandes o persistentes, necesitas almacenamiento:

### MongoDB (con Atlas Vector Search)

```typescript
// Guardar chunks con embeddings
await db.chunk.createMany({
  data: indice.map(chunk => ({
    content: chunk.content,
    sourceId: chunk.sourceId,
    embedding: chunk.embedding,
  })),
});

// Buscar con Vector Search
const resultados = await db.$runCommandRaw({
  aggregate: 'chunks',
  pipeline: [
    {
      $vectorSearch: {
        index: 'embedding_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: 5,
      },
    },
    {
      $project: {
        content: 1,
        sourceId: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ],
  cursor: {},
});
```

### PostgreSQL (con pgvector)

```sql
-- Crear tabla
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  content TEXT,
  source_id TEXT,
  embedding vector(1536)
);

-- Índice para búsqueda rápida
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops);

-- Buscar Top-K
SELECT content, source_id,
       1 - (embedding <=> $1) as score
FROM chunks
WHERE 1 - (embedding <=> $1) > 0.4  -- Umbral mínimo
ORDER BY embedding <=> $1
LIMIT 5;
```

### Bases de Datos Vectoriales Especializadas

Para aplicaciones de alto volumen:

| Base de datos | Característica principal |
|---------------|-------------------------|
| **Pinecone** | Serverless, escala automática |
| **Weaviate** | Open source, búsqueda híbrida |
| **Qdrant** | Open source, alto rendimiento |
| **Milvus** | Open source, muy escalable |

---

## Costos y Optimización

### Precio por Token (OpenAI, enero 2026)

| Modelo | Precio por 1M tokens |
|--------|---------------------|
| `text-embedding-3-small` | ~$0.02 USD |
| `text-embedding-3-large` | ~$0.13 USD |

### Ejemplo de costos

```typescript
// Indexación: 100 documentos, ~500 tokens cada uno
// = 50,000 tokens × $0.02/1M = $0.001 USD

// Búsqueda: 10,000 consultas/mes, ~20 tokens cada una
// = 200,000 tokens × $0.02/1M = $0.004 USD

// Total mensual: ~$0.005 USD (~$0.10 MXN)
```

Los embeddings son extremadamente económicos.

### Estrategias de Optimización

1. **Indexar una vez** — Los embeddings de documentos no cambian
2. **Reducir dimensiones** — 512 dims suficiente para muchos casos
3. **Filtros previos** — Reduce candidatos antes de calcular similitud
4. **Cachear consultas frecuentes** — Misma pregunta = mismo embedding

---

## Otros Proveedores

### Google

```typescript
import { google } from '@ai-sdk/google';

const { embedding } = await embed({
  model: google.embedding('text-embedding-004'),
  value: 'Tu texto aquí',
});
// 768 dimensiones
```

### Mistral

```typescript
import { mistral } from '@ai-sdk/mistral';

const { embedding } = await embed({
  model: mistral.embedding('mistral-embed'),
  value: 'Tu texto aquí',
});
// 1024 dimensiones
```

---

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `embed()` | Convierte texto en vector numérico |
| `embedMany()` | Procesa múltiples textos en lote |
| `cosineSimilarity()` | Mide similitud entre vectores (0 a 1) |
| **Chunking** | Dividir documentos largos en fragmentos |
| **Overlap** | Solapamiento entre chunks para no perder contexto |
| **Top-K** | Seleccionar los K resultados más relevantes |
| **Indexación** | Fase única: documentos → chunks → embeddings |
| **Búsqueda** | Fase repetida: consulta → embedding → similitud → resultados |

### El flujo completo

```
INDEXACIÓN (una vez):
Documentos → Chunking → embedMany() → Almacenar

BÚSQUEDA (cada consulta):
Pregunta → embed() → cosineSimilarity() → Top-K → Resultados
```

### ¿Cuándo usar Embeddings?

| Usa Embeddings | NO uses Embeddings |
|----------------|-------------------|
| Búsqueda semántica | Búsqueda por palabras exactas |
| RAG / Chat con documentos | Consultas estructuradas (SQL) |
| Sistemas de recomendación | Filtros simples (precio, categoría) |
| Detección de duplicados | Comparación exacta de strings |

---

En el próximo capítulo exploraremos **RAG en Profundidad**: estrategias avanzadas de chunking, re-ranking, y cómo manejar documentos de diferentes formatos (PDF, HTML, código).
