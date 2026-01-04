# Capítulo 11: Agentic RAG — Agentes con Conocimiento

En el capítulo anterior construimos RAG: buscar información relevante y pasarla como contexto al modelo. Funciona bien para preguntas directas.

Pero el flujo es rígido. Siempre busca, siempre usa los resultados, siempre genera. ¿Qué pasa cuando:

- La pregunta no requiere buscar ("Hola, ¿cómo estás?")
- La primera búsqueda no encuentra lo que necesita
- La pregunta requiere combinar información de múltiples consultas
- El usuario hace seguimiento de algo que ya respondiste

**Agentic RAG** resuelve esto: el modelo decide cuándo buscar, qué buscar, y si necesita buscar de nuevo.

## La Diferencia Fundamental

```
RAG TRADICIONAL:
Pregunta → Buscar SIEMPRE → Generar con contexto

AGENTIC RAG:
Pregunta → Modelo DECIDE si buscar →
  SÍ: Buscar → Evaluar → ¿Buscar más? → Generar
  NO: Generar directamente
```

El truco es convertir la búsqueda en un **tool** que el agente puede usar (o no) según lo necesite.

## El Tool de Búsqueda

La clave está en la descripción del tool. Le dice al modelo **cuándo** usarlo:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const buscarDocumentos = tool({
  description: `Busca información en la base de conocimiento.

  USA este tool cuando:
  - El usuario pregunta sobre datos específicos
  - Necesitas información verificable
  - La respuesta requiere precisión

  NO uses este tool para:
  - Saludos y despedidas
  - Preguntas que puedes responder con conocimiento general
  - Seguimiento de algo que ya respondiste`,

  inputSchema: z.object({
    consulta: z.string().describe('Tema a buscar'),
    topK: z.number().optional().default(3),
  }),

  execute: async ({ consulta, topK }) => {
    // Tu lógica de búsqueda semántica aquí
    const resultados = await buscarEnIndice(consulta, topK);

    if (resultados.length === 0) {
      return {
        encontrado: false,
        sugerencia: 'Intenta reformular la pregunta',
      };
    }

    return {
      encontrado: true,
      documentos: resultados,
    };
  },
});
```

La descripción es crucial. Un modelo bien instruido distingue entre "¿Cuántos días de vacaciones tengo?" (buscar) y "Gracias por la info" (no buscar).

## El Agente

```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';

const asistente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres un asistente de recursos humanos.

PROCESO:
1. Evalúa si la pregunta requiere información específica
2. Si SÍ: usa buscarDocumentos
3. Evalúa los resultados - ¿responden la pregunta?
4. Si NO: reformula y busca de nuevo
5. Si SÍ: genera respuesta citando fuentes

CUÁNDO BUSCAR:
- Datos, políticas, procedimientos
- Información verificable

CUÁNDO NO BUSCAR:
- Conversación casual
- Conocimiento general
- Seguimiento de respuestas anteriores`,

  tools: { buscarDocumentos },
  stopWhen: stepCountIs(5),
});
```

## Comportamiento Inteligente

Con esta configuración, el agente se comporta diferente según la pregunta:

```typescript
// Pregunta que SÍ requiere búsqueda
const { text: r1, steps: s1 } = await asistente.generate({
  prompt: '¿Cuántos días de vacaciones me tocan si tengo 3 años?'
});
console.log(`Pasos: ${s1.length}`); // 2 (buscar + responder)

// Pregunta que NO requiere búsqueda
const { text: r2, steps: s2 } = await asistente.generate({
  prompt: 'Hola, buenas tardes'
});
console.log(`Pasos: ${s2.length}`); // 1 (solo responder)

// Pregunta compleja que requiere múltiples búsquedas
const { text: r3, steps: s3 } = await asistente.generate({
  prompt: 'Me despidieron sin causa, ¿qué me corresponde?'
});
console.log(`Pasos: ${s3.length}`); // 3-4 (buscar varios conceptos)
```

## Query Reformulation

A veces la primera búsqueda no encuentra lo que necesita. Un agente inteligente reformula:

```typescript
const buscarConFeedback = tool({
  description: 'Busca documentos. Si no encuentra, el agente puede reformular.',

  inputSchema: z.object({
    consulta: z.string(),
    intentoPrevio: z.string().optional()
      .describe('Consulta anterior que no dio resultados'),
  }),

  execute: async ({ consulta, intentoPrevio }) => {
    const resultados = await buscarEnIndice(consulta);

    if (resultados.length === 0) {
      return {
        encontrado: false,
        consultaUsada: consulta,
        intentoPrevio,
        sugerencias: [
          'Usa términos más generales',
          'Prueba sinónimos',
          'Divide la pregunta en partes',
        ],
      };
    }

    return { encontrado: true, resultados };
  },
});
```

El agente aprende del feedback:

```
Usuario: "¿Qué pasa si no me pagan a tiempo?"

Paso 1: buscar("no me pagan a tiempo") → No encontrado
Paso 2: buscar("retraso pago salario", intentoPrevio: "no me pagan...") → Encontrado
Paso 3: Genera respuesta
```

## Multi-Hop Reasoning

Preguntas complejas requieren múltiples búsquedas que se construyen una sobre otra:

```
Pregunta: "Si me despiden después de 5 años, ¿cuánto me toca de finiquito?"

Paso 1: buscar("indemnización despido") → Art. 48 (3 meses)
Paso 2: buscar("prima antigüedad") → Art. 162 (12 días por año)
Paso 3: buscar("aguinaldo proporcional") → Art. 87
Paso 4: Combinar información y calcular
```

Para habilitar esto, estructura las instructions:

```typescript
instructions: `Para preguntas complejas:
1. Identifica todos los conceptos involucrados
2. Busca cada concepto por separado
3. Recopila la información necesaria
4. Combina los resultados
5. Presenta un desglose claro`
```

## Contexto de Conversación

Para preguntas de seguimiento, pasa el historial:

```typescript
const mensajes: Array<{ role: string; content: string }> = [];

async function chat(pregunta: string) {
  mensajes.push({ role: 'user', content: pregunta });

  const { text, steps } = await asistente.generate({
    messages: mensajes,
  });

  mensajes.push({ role: 'assistant', content: text });

  // Ver qué buscó
  const busquedas = steps
    .flatMap(s => s.toolCalls || [])
    .map(tc => tc.args.consulta);

  if (busquedas.length > 0) {
    console.log('Búsquedas:', busquedas);
  }

  return text;
}

// Conversación
await chat('¿Cuántos días de vacaciones me tocan?');
// Busca: "días de vacaciones"

await chat('¿Y si tengo más de 6 años?');
// Puede no buscar - ya tiene el contexto del Art. 76

await chat('¿Cómo las solicito?');
// Busca: "solicitud vacaciones" o "procedimiento vacaciones"
```

## Integrándolo en React Router v7

```typescript
// app/routes/api.asistente.ts
import type { Route } from './+types/api.asistente';
import { asistente } from '~/lib/agentes/asistente.server';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = asistente.stream({ messages });

  return result.toUIMessageStreamResponse();
}
```

En el cliente, usas `useChat` como siempre:

```typescript
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: '/api/asistente' }),
});
```

## Cuándo Usar Cada Enfoque

| RAG Tradicional | Agentic RAG |
|-----------------|-------------|
| Siempre busca | Decide si buscar |
| Una consulta por pregunta | Múltiples si necesita |
| Flujo predecible | Flujo adaptativo |
| No reformula | Reformula si falla |
| Sin contexto conversacional | Recuerda búsquedas previas |

**Usa RAG tradicional cuando:**
- Todas las preguntas son sobre documentos
- Necesitas latencia predecible
- El presupuesto de tokens es limitado

**Usa Agentic RAG cuando:**
- Mezcla de chat general y consultas específicas
- Preguntas complejas que requieren múltiples fuentes
- Quieres una experiencia conversacional natural

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| **Agentic RAG** | El agente decide cuándo y qué buscar |
| **Tool de búsqueda** | La descripción guía cuándo usarlo |
| **Query reformulation** | Reintentar con términos diferentes |
| **Multi-hop** | Múltiples búsquedas para preguntas complejas |
| **Contexto conversacional** | Pasar historial para seguimiento |

El secreto está en las instructions y la descripción del tool. Un agente bien configurado sabe cuándo buscar, cuándo reformular, y cuándo simplemente conversar.

---

En el próximo capítulo exploraremos **Audio y Speech**: cómo integrar voz en tus aplicaciones, desde transcripción hasta síntesis de voz.
