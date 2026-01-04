# Capítulo 10: RAG — Retrieval Augmented Generation

En el capítulo anterior aprendimos sobre embeddings y búsqueda semántica. Ahora vamos a usar esa búsqueda para algo más poderoso: **hacer que un modelo responda preguntas sobre tus propios documentos**.

RAG significa "Retrieval Augmented Generation":
- **Retrieval**: Buscar información relevante
- **Augmented**: Aumentar el prompt con esa información
- **Generation**: Generar una respuesta basada en el contexto

Es el patrón que usan los chatbots empresariales para responder sobre políticas internas, manuales de producto, o cualquier documento privado.

## Código Primero

Construyamos un asistente que responde preguntas sobre políticas de empresa:

```typescript
import { embed, embedMany, generateText, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

// 1. Nuestros documentos (en producción vendrían de una base de datos)
const documentos = [
  {
    titulo: 'Vacaciones',
    contenido: `Los empleados tienen derecho a vacaciones según antigüedad:
      - Primer año: 12 días
      - Segundo año: 14 días
      - Tercer año en adelante: 16 días
      Las vacaciones deben solicitarse con 15 días de anticipación.`
  },
  {
    titulo: 'Home Office',
    contenido: `El trabajo remoto está disponible:
      - Máximo 3 días por semana
      - Requiere 6 meses de antigüedad
      - Necesita aprobación del supervisor`
  },
  {
    titulo: 'Aguinaldo',
    contenido: `El aguinaldo se paga antes del 20 de diciembre.
      La empresa otorga 20 días de salario (5 más que el mínimo legal).
      Es proporcional si tienes menos de un año.`
  },
];

// 2. Indexar: convertir documentos a embeddings
async function indexar(docs: typeof documentos) {
  const textos = docs.map(d => `${d.titulo}: ${d.contenido}`);

  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: textos,
  });

  // Retornar documentos con su embedding
  return docs.map((doc, i) => ({ ...doc, embedding: embeddings[i] }));
}

// 3. Buscar documentos relevantes
async function buscar(pregunta: string, docsIndexados: any[], topK = 2) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: pregunta,
  });

  return docsIndexados
    .map(doc => ({
      doc,
      score: cosineSimilarity(embedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// 4. RAG: buscar + generar respuesta
async function responder(pregunta: string, docsIndexados: any[]) {
  // Buscar documentos relevantes
  const resultados = await buscar(pregunta, docsIndexados);

  // Construir contexto con los documentos encontrados
  const contexto = resultados
    .map(r => `${r.doc.titulo}:\n${r.doc.contenido}`)
    .join('\n\n');

  // Generar respuesta usando el contexto
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `Responde basándote SOLO en el contexto proporcionado.
Si no hay información suficiente, di "No tengo información sobre eso".`,
    prompt: `Contexto:\n${contexto}\n\nPregunta: ${pregunta}`,
  });

  return text;
}

// Uso
async function main() {
  const docsIndexados = await indexar(documentos);

  const respuesta = await responder(
    '¿Cuántos días de vacaciones tengo después de 2 años?',
    docsIndexados
  );

  console.log(respuesta);
  // "Después de 2 años tienes derecho a 14 días de vacaciones."
}

main();
```

Eso es todo. En ~60 líneas tienes un sistema RAG funcional.

## ¿Qué Acaba de Pasar?

El flujo RAG tiene dos fases:

```
INDEXACIÓN (una sola vez):
Documentos → embedMany() → Guardar embeddings

CONSULTA (cada pregunta):
Pregunta → embed() → Buscar similares → Contexto → generateText() → Respuesta
```

La clave está en el prompt final. El modelo no "sabe" sobre tus documentos, pero **puede razonar sobre la información que le pasas en el contexto**.

## El Truco del Contexto

Sin RAG:
```
Pregunta: "¿Cuántos días de vacaciones tengo?"
Modelo: "Depende de tu país y empresa..." (respuesta genérica)
```

Con RAG:
```
Contexto: "Los empleados tienen 12 días el primer año, 14 el segundo..."
Pregunta: "¿Cuántos días de vacaciones tengo después de 2 años?"
Modelo: "Tienes 14 días de vacaciones." (respuesta específica)
```

El modelo usa la información del contexto para dar respuestas precisas.

## Chunking: Dividir Documentos Grandes

Un problema: ¿qué pasa si tus documentos son muy largos?

Los embeddings funcionan mejor con textos cortos (200-500 palabras). Si tienes un manual de 50 páginas, necesitas dividirlo en "chunks" (fragmentos).

```typescript
// Estrategia simple: dividir por párrafos
function dividirEnChunks(texto: string, maxPalabras = 200): string[] {
  const parrafos = texto.split('\n\n');
  const chunks: string[] = [];
  let chunkActual = '';

  for (const parrafo of parrafos) {
    const palabras = (chunkActual + ' ' + parrafo).split(' ').length;

    if (palabras > maxPalabras && chunkActual) {
      chunks.push(chunkActual.trim());
      chunkActual = parrafo;
    } else {
      chunkActual += '\n\n' + parrafo;
    }
  }

  if (chunkActual.trim()) {
    chunks.push(chunkActual.trim());
  }

  return chunks;
}
```

**Regla práctica**: chunks de 200-500 palabras suelen funcionar bien. Muy cortos pierden contexto, muy largos diluyen la relevancia.

## Citando Fuentes

Para que las respuestas sean verificables, haz que el modelo cite sus fuentes:

```typescript
const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  system: `Responde basándote SOLO en el contexto proporcionado.
Cita la fuente entre corchetes: [Vacaciones], [Home Office], etc.
Si no hay información, di "No tengo información sobre eso".`,
  prompt: `Contexto:\n${contexto}\n\nPregunta: ${pregunta}`,
});

// Respuesta: "Tienes 14 días de vacaciones [Vacaciones]."
```

## Integrándolo en React Router v7

```typescript
// app/routes/api.chat-rh.ts
import type { Route } from './+types/api.chat-rh';
import { responder, docsIndexados } from '~/lib/rag';

export async function action({ request }: Route.ActionArgs) {
  const { pregunta } = await request.json();

  const respuesta = await responder(pregunta, docsIndexados);

  return Response.json({ respuesta });
}
```

```tsx
// app/routes/chat-rh.tsx
import { useState } from 'react';

export default function ChatRH() {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');

  const enviar = async () => {
    const res = await fetch('/api/chat-rh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta }),
    });
    const data = await res.json();
    setRespuesta(data.respuesta);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Asistente de RH</h1>

      <input
        value={pregunta}
        onChange={e => setPregunta(e.target.value)}
        placeholder="Pregunta sobre vacaciones, aguinaldo..."
        className="w-full p-2 border rounded mb-2"
      />

      <button
        onClick={enviar}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Preguntar
      </button>

      {respuesta && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          {respuesta}
        </div>
      )}
    </div>
  );
}
```

## Mejorando la Precisión

Si las respuestas no son lo suficientemente precisas, hay varias técnicas:

### 1. Buscar más documentos
```typescript
const resultados = await buscar(pregunta, docsIndexados, 5); // Top 5 en lugar de 2
```

### 2. Filtrar por relevancia mínima
```typescript
const relevantes = resultados.filter(r => r.score > 0.5);
```

### 3. Mejor prompt de sistema
```typescript
system: `Eres el asistente de Recursos Humanos de la empresa.
Responde ÚNICAMENTE con información del contexto.
Si la pregunta no se puede responder con el contexto, di "No tengo esa información".
Sé conciso y amable.`
```

### 4. Agregar metadata
```typescript
const documentos = [
  {
    titulo: 'Vacaciones',
    categoria: 'beneficios', // Para filtrar antes de buscar
    contenido: '...'
  }
];
```

## Resumen

| Paso | Función | Descripción |
|------|---------|-------------|
| 1. Indexar | `embedMany()` | Convertir documentos a vectores |
| 2. Buscar | `embed()` + similitud | Encontrar docs relevantes |
| 3. Contexto | String con docs | Información para el modelo |
| 4. Generar | `generateText()` | Respuesta basada en contexto |

### El flujo completo

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ Pregunta │ -> │ Buscar   │ -> │ Contexto  │ -> │ Respuesta│
└──────────┘    │ similares│    │ + Prompt  │    └──────────┘
                └──────────┘    └───────────┘
```

### ¿Cuándo usar RAG?

| Usa RAG | No necesitas RAG |
|---------|------------------|
| Documentos privados/actualizados | Conocimiento general |
| Necesitas citar fuentes | Respuestas creativas |
| Información cambia frecuentemente | Datos estáticos y simples |
| Manuales, políticas, FAQs | Chat casual |

---

En el próximo capítulo veremos **Agentic RAG**: cuando el modelo decide autónomamente si necesita buscar, qué buscar, y cuándo buscar de nuevo para responder preguntas complejas.
