# Capítulo 3: Dentro del Streaming

React Router v7 es genial, pero esconde los detalles. En este capítulo usamos Hono—un framework mínimo—para ver exactamente qué viaja por el wire.

Cuando tu chat falle en producción a las 3am, este conocimiento te salvará.

## Setup

Si aún no tienes el repositorio del taller:

```bash
git clone https://github.com/blissito/taller-ai-sdk-para-principiantes.git
cd taller-ai-sdk-para-principiantes
npm install
```

Cambia a la branch bonus:

```bash
git checkout ejercicio/bonus-migrate_to_hono
```

Esta branch tiene un servidor Hono funcionando. Vamos a entenderlo pieza por pieza.

## Por qué Hono (y no RRv7) para este capítulo

Hono pesa ~14kb. No tiene magia. Cuando escribes un endpoint, ves exactamente qué pasa: qué headers se envían, qué bytes viajan, cómo se cierra la conexión.

React Router v7 es más cómodo para producción, pero esconde estos detalles detrás de abstracciones. Primero entenderemos los fundamentos con Hono, luego en el próximo capítulo veremos cómo RRv7 simplifica todo.

Es como aprender JavaScript antes de React: no es estrictamente necesario, pero te hace mejor desarrollador.

## Tu primer endpoint

Abre el archivo del servidor y mira el endpoint de chat:

```typescript
import { serve } from '@hono/node-server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Hono } from 'hono';

const app = new Hono();

app.post('/api/chat', async (c) => {
  const { messages } = await c.req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
  });

  return result.toUIMessageStreamResponse();
});

serve({ fetch: app.fetch, port: 8080 });
```

Ejecútalo con `npm run dev`. Funciona. Pero ¿qué acaba de pasar?

## Abre DevTools: El protocolo v1

Abre tu navegador, ve al chat, y abre DevTools → Network. Envía un mensaje y busca la request a `/api/chat`.

Click en la request → Response. Verás algo como esto:

```
data: {"type":"start","messageId":"msg_abc123"}

data: {"type":"text-start","id":"txt_1"}

data: {"type":"text-delta","id":"txt_1","delta":"Hola"}

data: {"type":"text-delta","id":"txt_1","delta":", "}

data: {"type":"text-delta","id":"txt_1","delta":"¿cómo"}

data: {"type":"text-delta","id":"txt_1","delta":" estás?"}

data: {"type":"text-end","id":"txt_1"}

data: {"type":"finish-step"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

**Esto es lo que `useChat` parsea.** No es magia—es un protocolo de texto estructurado.

### Las partes del protocolo

| Parte | Cuándo aparece | Para qué sirve |
|-------|----------------|----------------|
| `start` | Inicio del mensaje | Asigna un `messageId` único |
| `text-start` | Antes del texto | Inicia un bloque de texto con ID |
| `text-delta` | Cada fragmento | El texto real, token por token |
| `text-end` | Fin del texto | Cierra el bloque de texto |
| `reasoning-start/delta/end` | Modelos que "piensan" | Claude y o3 exponen su razonamiento |
| `tool-input-start/delta/available` | Tool calls | Cuando el modelo quiere usar una herramienta |
| `tool-output-available` | Resultado de tools | Lo que devolvió la herramienta |
| `finish-step` | Fin de un paso | Importante para agentes multi-step |
| `finish` | Todo terminó | Incluye `finishReason` |
| `[DONE]` | Cierre del stream | Señal de terminación |

El header `x-vercel-ai-ui-message-stream: v1` le dice al cliente qué versión del protocolo usar. Hono lo incluye automáticamente cuando usas `toUIMessageStreamResponse()`.

## Callbacks: Tu servidor ahora tiene ojos

El endpoint básico funciona, pero no sabes qué está pasando. Con callbacks, puedes observar cada paso:

```typescript
app.post('/api/chat', async (c) => {
  const { messages } = await c.req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,

    // Cada fragmento del stream
    onChunk({ chunk }) {
      if (chunk.type === 'text-delta') {
        console.log('Token:', chunk.textDelta);
      }
      if (chunk.type === 'reasoning-delta') {
        // Modelos como Claude o o3 exponen su razonamiento
        console.log('Pensando:', chunk.textDelta);
      }
    },

    // Cuando termina un paso (importante para agentes)
    onStepFinish({ usage, finishReason }) {
      console.log(`Paso terminado: ${usage.totalTokens} tokens`);
      console.log(`Razón: ${finishReason}`);
    },

    // Cuando todo termina
    onFinish({ text, usage, steps, finishReason }) {
      const costo = usage.totalTokens * 0.00000015; // Precio GPT-4o-mini
      console.log(`Respuesta completa: ${text.substring(0, 50)}...`);
      console.log(`Tokens totales: ${usage.totalTokens}`);
      console.log(`Costo estimado: $${costo.toFixed(6)} USD`);
      console.log(`Pasos ejecutados: ${steps.length}`);

      // Aquí guardarías en base de datos
      // db.conversacion.create({ data: { texto: text, tokens: usage.totalTokens }});
    },

    onError({ error }) {
      console.error('Error en streaming:', error);
      // Reportar a Sentry, Datadog, etc.
    }
  });

  return result.toUIMessageStreamResponse();
});
```

### ¿Por qué `onStepFinish` importa?

En un chat simple, solo hay un paso. Pero los agentes ejecutan múltiples pasos:

1. Modelo recibe pregunta
2. Modelo decide usar herramienta
3. Herramienta se ejecuta
4. Modelo recibe resultado
5. Modelo genera respuesta final

Cada uno de estos es un "step". `onStepFinish` te dice cuándo terminó cada uno.

## Datos custom: Más que texto

A veces quieres enviar información adicional al cliente: qué modelo estás usando, cuánto costó, metadata del usuario. Con `createUIMessageStream` puedes hacerlo:

```typescript
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse
} from 'ai';

app.post('/api/chat', async (c) => {
  const { messages } = await c.req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Enviar metadata ANTES del texto
      writer.write({
        type: 'data-context',  // data-<nombre> para custom
        data: {
          modelo: 'gpt-4o-mini',
          timestamp: Date.now(),
          precioEstimado: 0.002  // En pesos sería ~0.04 MXN
        }
      });

      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages,
      });

      // Mergear el stream de texto
      writer.merge(result.toUIMessageStream());
    },

    onFinish: ({ messages, responseMessage }) => {
      console.log('Mensaje final:', responseMessage);
    }
  });

  return createUIMessageStreamResponse({ stream });
});
```

En el cliente, estos datos llegan como partes del mensaje:

```typescript
const { messages } = useChat();

// Cada mensaje tiene .parts en lugar de .content (AI SDK v6)
messages[0].parts.forEach(part => {
  if (part.type === 'text') {
    console.log('Texto:', part.text);
  }
  if (part.type === 'data-context') {
    console.log('Metadata:', part.data);
    // { modelo: 'gpt-4o-mini', timestamp: 1704067200000, precioEstimado: 0.002 }
  }
});
```

**Esto es la base de UI generativa:** en lugar de solo texto, puedes enviar componentes, estados, acciones. El cliente decide cómo renderizarlos.

## Structured output (AI SDK v6)

En el Capítulo 1 vimos `generateObject` para obtener datos estructurados. En AI SDK v6, esa función está **deprecada**. Ahora usas el parámetro `output` directamente en `streamText`:

```typescript
import { streamText, Output } from 'ai';
import { z } from 'zod';

app.post('/api/clasificar', async (c) => {
  const { texto } = await c.req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt: `Clasifica este review de tacos: "${texto}"`,
    output: Output.object({
      schema: z.object({
        sentimiento: z.enum(['positivo', 'neutral', 'negativo']),
        confianza: z.number().min(0).max(1),
        resumen: z.string().max(100),
        recomendaria: z.boolean(),
      })
    })
  });

  // El output es tipado automáticamente
  const { output } = await result;

  return c.json({
    sentimiento: output.sentimiento,
    confianza: output.confianza,
    resumen: output.resumen,
    recomendaria: output.recomendaria
  });
});
```

### Otras opciones de output

```typescript
// Array de objetos
output: Output.array({
  element: z.object({ nombre: z.string(), precio: z.number() })
})

// Una opción de varias (clasificación)
output: Output.choice({
  choices: ['spam', 'promocion', 'importante', 'personal']
})

// JSON flexible (sin schema estricto)
output: Output.json()
```

**¿Por qué deprecaron `generateObject`?** Porque ahora puedes combinar structured output con tool calling en la misma llamada. Antes tenías que elegir uno u otro.

## Preview: El vocabulario de agentes

No vamos a implementar agentes todavía—eso es el Capítulo 6. Pero quiero que veas el código para que el vocabulario no sea nuevo cuando llegues ahí:

```typescript
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

// Definir un agente
const asistenteTaqueria = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  // En v6 es "instructions", no "system"
  instructions: `Eres el asistente de Taquería Don Pepe.
                 Ayudas a los clientes a elegir del menú.
                 Precios en pesos mexicanos.`,

  // Las herramientas que puede usar
  tools: {
    consultarMenu: tool({
      description: 'Consulta platillos disponibles por categoría',
      parameters: z.object({
        categoria: z.enum(['tacos', 'bebidas', 'postres'])
      }),
      execute: async ({ categoria }) => {
        // Aquí consultarías tu base de datos
        const menu = {
          tacos: [
            { nombre: 'Al pastor', precio: 25 },
            { nombre: 'Carnitas', precio: 28 },
          ],
          bebidas: [
            { nombre: 'Agua de horchata', precio: 20 },
          ],
          postres: [
            { nombre: 'Flan', precio: 35 },
          ]
        };
        return menu[categoria];
      }
    }),
  },

  // Máximo 5 pasos (default es 20)
  stopWhen: stepCountIs(5),
});

// Ejecutar el agente
const { text, steps } = await asistenteTaqueria.generate({
  prompt: '¿Qué tacos tienen y cuánto cuestan?'
});

console.log(text);
// "Tenemos tacos al pastor por $25 y carnitas por $28..."

console.log(`Ejecutado en ${steps.length} pasos`);
```

### Lo que ya conoces

Mira el código anterior. Ya sabes qué son:
- `instructions` — El system prompt (lo vimos en caps anteriores)
- `tools` — Las herramientas (lo veremos a fondo en Cap 5)
- `execute` — La función que corre cuando el modelo llama la herramienta
- `steps` — El array de pasos que vimos en `onStepFinish`
- `stopWhen` — Condición de parada (lo que controla el loop del agente)

Cuando llegues al Capítulo 6, solo estarás conectando piezas que ya conoces.

### Preview: Tool approval (human-in-the-loop)

AI SDK v6 introdujo aprobación de herramientas. Esto es crucial para tools peligrosas:

```typescript
const herramientaPago = tool({
  description: 'Procesa un pago con tarjeta',
  parameters: z.object({
    monto: z.number(),
    tarjeta: z.string()
  }),

  // Requiere aprobación humana antes de ejecutar
  needsApproval: true,

  execute: async ({ monto, tarjeta }) => {
    return await procesarPago(monto, tarjeta);
  }
});
```

Cuando el modelo quiere usar esta herramienta, el SDK **no la ejecuta automáticamente**. En su lugar:

1. Devuelve un `tool-approval-request` al cliente
2. Tu UI muestra: "¿Aprobar pago de $500?"
3. El usuario aprueba o rechaza
4. Envías `tool-approval-response` al servidor
5. Si aprobado, se ejecuta

Esto lo veremos en detalle en el Capítulo 5.

## Un caso práctico: Asistente con contexto dinámico

Juntemos todo en un endpoint real:

```typescript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse
} from 'ai';
import { openai } from '@ai-sdk/openai';

const app = new Hono();

app.post('/api/chat', async (c) => {
  const { messages } = await c.req.json();

  // Contexto dinámico
  const hora = new Date().getHours();
  const esDesayuno = hora >= 6 && hora < 12;
  const esComida = hora >= 12 && hora < 18;
  const esCena = hora >= 18 || hora < 6;

  const menuActivo = esDesayuno ? 'desayuno' : esComida ? 'comida' : 'cena';

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Metadata para el cliente
      writer.write({
        type: 'data-context',
        data: {
          menu: menuActivo,
          hora,
          modelo: 'gpt-4o-mini'
        }
      });

      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `Eres el asistente de Taquería Don Pepe.

                 Hora actual: ${hora}:00
                 Menú activo: ${menuActivo.toUpperCase()}

                 ${esDesayuno ? 'Ofrece huevos, chilaquiles, y café.' : ''}
                 ${esComida ? 'Ofrece tacos, tortas, y aguas frescas.' : ''}
                 ${esCena ? 'Ofrece quesadillas, gringas, y cerveza.' : ''}

                 Precios en pesos mexicanos. Sé amable y breve.`,
        messages,

        onStepFinish({ usage }) {
          const costoUSD = usage.totalTokens * 0.00000015;
          const costoMXN = costoUSD * 20; // Tipo de cambio aproximado
          console.log(`Costo del paso: $${costoMXN.toFixed(4)} MXN`);
        },

        onFinish({ text, usage, steps }) {
          console.log('---');
          console.log(`Respuesta: ${text.substring(0, 80)}...`);
          console.log(`Tokens: ${usage.totalTokens}`);
          console.log(`Pasos: ${steps.length}`);
          console.log('---');

          // Aquí guardarías en tu base de datos
          // await db.conversacion.create({
          //   data: {
          //     mensajes: messages.length,
          //     respuesta: text,
          //     tokens: usage.totalTokens,
          //     menu: menuActivo
          //   }
          // });
        }
      });

      writer.merge(result.toUIMessageStream());
    }
  });

  return createUIMessageStreamResponse({ stream });
});

serve({ fetch: app.fetch, port: 8080 });
console.log('Servidor corriendo en http://localhost:8080');
```

Este endpoint:
1. Detecta la hora y selecciona el menú apropiado
2. Envía metadata al cliente antes del streaming
3. Usa un system prompt dinámico
4. Loguea costos en pesos mexicanos
5. Está listo para guardar en base de datos

## En una frase

- **Protocolo v1**: Cada token tiene nombre y apellido (`text-delta`, `finish-step`).
- **Callbacks**: Tu servidor ahora tiene ojos (`onChunk`) y memoria (`onFinish`).
- **Datos custom**: Puedes mandar lo que quieras al frontend, no solo texto.
- **El patrón de agentes**: Loop de pasos + herramientas. Ya lo viste. Ya no es misterio.

---

En el próximo capítulo veremos cómo React Router v7 simplifica todo esto. Spoiler: mucho del código que escribiste aquí desaparece—pero ahora sabes qué está pasando por debajo.
