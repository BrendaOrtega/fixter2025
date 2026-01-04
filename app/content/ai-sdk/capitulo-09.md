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

console.log('Dimensiones:', embedding.length);  // 1536
console.log('Primeros 5:', embedding.slice(0, 5));
// [0.0234, -0.0891, 0.0456, -0.0123, 0.0789]
console.log('Tokens usados:', usage.tokens);  // 9
```

Un texto se convierte en 1,536 números que representan su significado.

## ¿Por Qué 1,536 Números?

Imagina describir una película con 3 números: qué tan de acción (0-1), romántica (0-1), comedia (0-1).

"Die Hard" sería `[0.9, 0.1, 0.2]`. "Titanic" sería `[0.3, 0.9, 0.1]`.

Los embeddings hacen lo mismo, pero con 1,536 dimensiones que capturan matices semánticos que ni siquiera podemos nombrar. El modelo aprende estas dimensiones durante su entrenamiento.

## Similitud de Vectores

Dos textos similares producen vectores cercanos:

```typescript
import { embed, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai.embedding('text-embedding-3-small');

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

console.log('Pozole vs Pozole:', cosineSimilarity(e1, e2).toFixed(3));
// 0.847 — Muy similares

console.log('Pozole vs Programación:', cosineSimilarity(e1, e3).toFixed(3));
// 0.112 — Muy diferentes
```

`cosineSimilarity` mide qué tan alineados están dos vectores:
- **1.0** — Idénticos en significado
- **0.0** — Sin relación semántica
- **-1.0** — Significados opuestos

## Modelos de Embedding

```typescript
// Modelo pequeño - 1536 dimensiones (recomendado)
const small = openai.embedding('text-embedding-3-small');

// Modelo grande - 3072 dimensiones (máxima precisión)
const large = openai.embedding('text-embedding-3-large');
```

| Modelo | Dimensiones | Costo por 1M tokens | Uso |
|--------|-------------|---------------------|-----|
| `text-embedding-3-small` | 1536 | ~$0.02 USD | Balance velocidad/precisión |
| `text-embedding-3-large` | 3072 | ~$0.13 USD | Máxima precisión |

### Reducir Dimensiones

```typescript
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'Producto: Laptop gaming 16GB RAM',
  providerOptions: {
    openai: { dimensions: 512 }  // Reducir de 1536 a 512
  }
});
```

OpenAI permite truncar dimensiones manteniendo utilidad (Matryoshka representation learning).

## embedMany: Procesamiento en Lote

```typescript
import { embedMany } from 'ai';

const productos = [
  'Laptop gaming con RTX 4060',
  'Teclado mecánico RGB',
  'Mouse inalámbrico ergonómico',
];

const { embeddings, usage } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: productos,
  maxParallelCalls: 5,  // Control de concurrencia
});

console.log('Productos procesados:', embeddings.length);  // 3
```

`embedMany` es más eficiente porque agrupa las solicitudes en una sola llamada.

---

## El Flujo: Indexación y Búsqueda

### Fase 1: Indexación (se hace una vez)

```
Documentos → Chunking → Embeddings → Almacenamiento
```

### Fase 2: Búsqueda (cada consulta)

```
Consulta → Embedding → Similitud → Top-K → Resultados
```

---

## Chunking: Dividiendo Documentos

Un embedding representa un texto como un solo vector. Documentos largos pierden detalle. La solución: **chunking**.

```typescript
function chunkText(text: string, maxSize = 500, overlap = 50): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxSize && current) {
      chunks.push(current.trim());
      const words = current.split(' ');
      current = words.slice(-Math.ceil(overlap / 5)).join(' ') + ' ';
    }
    current += sentence + ' ';
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
```

### ¿Por qué overlap?

Sin overlap podrías cortar una oración a la mitad. Con overlap, la información del borde aparece en ambos chunks.

---

## Sistema Completo de Búsqueda

```typescript
// lib/semantic-search.ts
import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

const model = openai.embedding('text-embedding-3-small');

interface Chunk {
  id: string;
  content: string;
  sourceId: string;
  embedding?: number[];
}

// ============ INDEXACIÓN ============
export async function indexDocuments(
  documents: Array<{ id: string; content: string }>
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  // Crear chunks
  for (const doc of documents) {
    const textChunks = chunkText(doc.content);
    textChunks.forEach((content, i) => {
      chunks.push({ id: `${doc.id}-${i}`, content, sourceId: doc.id });
    });
  }

  // Generar embeddings en lote
  const { embeddings } = await embedMany({
    model,
    values: chunks.map(c => c.content),
  });

  chunks.forEach((chunk, i) => { chunk.embedding = embeddings[i]; });
  return chunks;
}

// ============ BÚSQUEDA ============
export async function search(
  query: string,
  chunks: Chunk[],
  { topK = 3, minScore = 0.4 } = {}
) {
  const { embedding } = await embed({ model, value: query });

  return chunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(embedding, chunk.embedding!),
    }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

### Uso

```typescript
const documentos = [
  {
    id: 'pozole',
    content: `El pozole es un platillo tradicional mexicano.
    El pozole rojo de Jalisco usa chile guajillo.
    El pozole verde de Guerrero lleva pepita y chile poblano.`
  },
  {
    id: 'mole',
    content: `El mole poblano contiene más de 20 ingredientes
    incluyendo chocolate, chiles y especias.`
  },
];

// Indexar (una vez)
const indice = await indexDocuments(documentos);

// Buscar (cada consulta)
const resultados = await search('¿qué platillo lleva chocolate?', indice);

resultados.forEach((r, i) => {
  console.log(`${i + 1}. ${r.chunk.sourceId}: ${(r.score * 100).toFixed(1)}%`);
});
// 1. mole: 72.3%
```

---

## De Búsqueda a RAG

```typescript
import { generateText } from 'ai';

async function preguntarConContexto(pregunta: string, indice: Chunk[]) {
  const resultados = await search(pregunta, indice, { topK: 3 });

  if (resultados.length === 0) {
    return 'No encontré información relevante.';
  }

  const contexto = resultados
    .map(r => `[${r.chunk.sourceId}]\n${r.chunk.content}`)
    .join('\n\n---\n\n');

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Responde con información del contexto.
Si no está, di que no lo sabes.

CONTEXTO:
${contexto}`,
    prompt: pregunta,
  });

  return text;
}
```

---

## Almacenamiento para Producción

El ejemplo anterior mantiene todo en memoria. Para producción con datos grandes:

### MongoDB Atlas Vector Search

```typescript
// Guardar con embeddings
await db.chunk.createMany({
  data: chunks.map(c => ({
    content: c.content,
    sourceId: c.sourceId,
    embedding: c.embedding,
  })),
});

// Buscar
const resultados = await db.$runCommandRaw({
  aggregate: 'chunks',
  pipeline: [{
    $vectorSearch: {
      index: 'embedding_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 5,
    }
  }],
  cursor: {},
});
```

### PostgreSQL con pgvector

```sql
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536)
);

SELECT content, 1 - (embedding <=> $1) as score
FROM chunks
WHERE 1 - (embedding <=> $1) > 0.4
ORDER BY embedding <=> $1
LIMIT 5;
```

### Bases de Datos Vectoriales

| Base | Característica |
|------|----------------|
| **Pinecone** | Serverless, escala automática |
| **Weaviate** | Open source, búsqueda híbrida |
| **Qdrant** | Open source, alto rendimiento |

---

## Costos y Optimización

### Costos (enero 2026)

```typescript
// Indexación: 100 docs × 500 tokens = 50,000 tokens
// = $0.001 USD

// Búsqueda: 10,000 consultas × 20 tokens = 200,000 tokens
// = $0.004 USD

// Total mensual: ~$0.005 USD
```

Los embeddings son extremadamente económicos.

### Estrategias

1. **Indexar una vez** — Los embeddings de documentos no cambian
2. **Reducir dimensiones** — 512 dims suficiente para muchos casos
3. **Cachear consultas** — Misma pregunta = mismo embedding

---

## Otros Proveedores

```typescript
// Google
import { google } from '@ai-sdk/google';
const { embedding } = await embed({
  model: google.embedding('text-embedding-004'),
  value: 'Tu texto',
});  // 768 dimensiones

// Mistral
import { mistral } from '@ai-sdk/mistral';
const { embedding } = await embed({
  model: mistral.embedding('mistral-embed'),
  value: 'Tu texto',
});  // 1024 dimensiones
```

---

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `embed()` | Convierte texto en vector numérico |
| `embedMany()` | Procesa múltiples textos en lote |
| `cosineSimilarity()` | Mide similitud entre vectores (0 a 1) |
| **Chunking** | Dividir documentos en fragmentos |
| **Overlap** | Solapamiento para no perder contexto |
| **Top-K** | Seleccionar los K más relevantes |

### El flujo completo

```
INDEXACIÓN (una vez):
Documentos → Chunking → embedMany() → Almacenar

BÚSQUEDA (cada consulta):
Pregunta → embed() → cosineSimilarity() → Top-K → Resultados
```

### ¿Cuándo usar Embeddings?

| Usar Embeddings | NO usar Embeddings |
|----------------|-------------------|
| Búsqueda semántica | Búsqueda por palabras exactas |
| RAG / Chat con docs | Consultas SQL estructuradas |
| Recomendaciones | Filtros simples (precio, categoría) |

---

En el próximo capítulo exploraremos **RAG en Profundidad**: estrategias avanzadas de chunking, re-ranking, y cómo manejar documentos de diferentes formatos.
