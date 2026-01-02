# Capítulo 4: El Atajo

Ya entiendes el streaming. Viste cada `text-delta`, cada `finish-step`, cada byte viajando por el wire.

Ahora veamos cuánto código desaparece cuando usas un framework full-stack.

## El mismo chat, menos código

Así se ve el endpoint de chat en Hono:

```typescript
// Hono (Capítulo 3)
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

Así se ve en React Router v7:

```typescript
// React Router v7
// app/routes/api.chat.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Route } from './+types/api.chat';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

Sin `Hono()`. Sin `serve()`. Sin configurar puerto. React Router v7 maneja todo eso por ti.

## El endpoint como action

En React Router v7, cada archivo en `app/routes/` puede exportar un `action`. Cuando haces POST a esa ruta, se ejecuta el action.

```typescript
// app/routes/api.chat.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Route } from './+types/api.chat';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: 'Eres un asistente útil. Responde en español.',
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

Registra la ruta en `routes.ts`:

```typescript
// app/routes.ts
import { type RouteConfig, route } from '@react-router/dev/routes';

export default [
  // ... otras rutas
  route('api/chat', './routes/api.chat.ts'),
] satisfies RouteConfig;
```

Listo. POST a `/api/chat` ejecuta tu action y retorna el stream.

## Lo que React Router v7 hace por ti

### Headers correctos
`toUIMessageStreamResponse()` configura automáticamente:
- `Content-Type: text/plain; charset=utf-8`
- `x-vercel-ai-ui-message-stream: v1`
- `Cache-Control: no-cache`
- `Transfer-Encoding: chunked`

No tienes que pensar en esto.

### Type safety con Route types
El tipo `Route.ActionArgs` viene generado automáticamente. TypeScript sabe exactamente qué propiedades tiene `request`.

```typescript
// TypeScript sabe que request es Request
export async function action({ request }: Route.ActionArgs) {
  const body = await request.json(); // Tipado
}
```

### Hot reload
Cambias el código, el servidor se recarga. Sin reiniciar manualmente.

### Deploy integrado
Un `fly deploy` y tu app está en producción. El mismo código corre en desarrollo y producción.

## useChat apuntando a tu action

En el cliente, `useChat` se conecta al action:

```typescript
// app/routes/chat.tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ content: input });
      setInput('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
            }`}
          >
            {m.parts.map((part, i) =>
              part.type === 'text' ? <span key={i}>{part.text}</span> : null
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          disabled={status === 'streaming'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {status === 'streaming' ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
```

> **Nota AI SDK v6:** El hook ya no maneja el input internamente. Usamos `useState` de React para el campo de texto, y `sendMessage({ content })` para enviar. Los mensajes tienen `parts` en lugar de `content`.

## Callbacks en el servidor RRv7

Los callbacks funcionan igual que en Hono:

```typescript
// app/routes/api.chat.ts
export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,

    onStepFinish({ usage, finishReason }) {
      console.log(`Paso terminado: ${usage.totalTokens} tokens`);
    },

    onFinish({ text, usage, steps }) {
      const costoMXN = usage.totalTokens * 0.00000015 * 20;
      console.log(`Costo: $${costoMXN.toFixed(4)} MXN`);

      // Guardar en base de datos
      // await db.conversacion.create({...});
    },

    onError({ error }) {
      console.error('Error:', error);
    }
  });

  return result.toUIMessageStreamResponse();
}
```

**Mismo código que en Hono.** El AI SDK no cambia—solo cambia el framework que lo envuelve.

## Datos custom en RRv7

`createUIMessageStream` también funciona igual:

```typescript
// app/routes/api.chat.ts
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse
} from 'ai';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Metadata antes del streaming
      writer.write({
        type: 'data-context',
        data: {
          modelo: 'gpt-4o-mini',
          timestamp: Date.now()
        }
      });

      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages,
      });

      writer.merge(result.toUIMessageStream());
    }
  });

  return createUIMessageStreamResponse({ stream });
}
```

El cliente recibe los datos en `message.parts` exactamente igual.

## Un chat completo en RRv7

Aquí está el ejemplo completo con contexto dinámico, callbacks, y persistencia:

```typescript
// app/routes/api.chat.ts
import { streamText, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Route } from './+types/api.chat';
// import { db } from '~/lib/db.server';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const hora = new Date().getHours();
  const periodo = hora < 12 ? 'mañana' : hora < 18 ? 'tarde' : 'noche';

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({
        type: 'data-context',
        data: { periodo, hora, modelo: 'gpt-4o-mini' }
      });

      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `Eres un asistente amigable.
                 Es de ${periodo} (${hora}:00).
                 Saluda apropiadamente y responde en español.`,
        messages,

        onFinish: async ({ text, usage }) => {
          console.log(`[${periodo}] Tokens: ${usage.totalTokens}`);

          // Persistir conversación
          // await db.conversacion.create({
          //   data: {
          //     hora,
          //     tokens: usage.totalTokens,
          //     respuesta: text.substring(0, 200)
          //   }
          // });
        }
      });

      writer.merge(result.toUIMessageStream());
    }
  });

  return createUIMessageStreamResponse({ stream });
}
```

Y el cliente:

```typescript
// app/routes/chat.tsx
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Chat con IA</h1>

        <div className="bg-white rounded-lg shadow p-4 mb-4 min-h-[400px]">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center mt-20">
              Envía un mensaje para comenzar
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg ${
                    m.role === 'user'
                      ? 'bg-blue-500 text-white ml-12'
                      : 'bg-gray-100 mr-12'
                  }`}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return <span key={i}>{part.text}</span>;
                    }
                    if (part.type === 'data-context') {
                      return (
                        <span key={i} className="text-xs text-gray-400 block mt-1">
                          {part.data.periodo} • {part.data.modelo}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ content: input });
              setInput('');
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe algo..."
            className="flex-1 p-3 border rounded-lg"
            disabled={status === 'streaming'}
          />
          <button
            type="submit"
            disabled={status === 'streaming' || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Cuándo elegir cada uno

| Escenario | Usa |
|-----------|-----|
| API standalone para múltiples clientes | Hono |
| Microservicio de IA en el edge | Hono |
| App full-stack con React | React Router v7 |
| Debugging profundo del protocolo | Hono |
| Máxima productividad | React Router v7 |
| Deploy a Cloudflare Workers | Hono |
| Ya tienes una app RRv7 | React Router v7 |

**No es una competencia.** Son herramientas para diferentes contextos.

## En una frase

- **RRv7**: El framework hace el trabajo sucio. Tú escribes la lógica.
- **El conocimiento de Hono no fue en vano**: Cuando algo falle, sabrás dónde buscar.
- **Mismo AI SDK, diferente envoltorio**: Los callbacks, el protocolo, todo funciona igual.

---

Hasta ahora el modelo solo genera texto. En el próximo capítulo le daremos manos: herramientas que puede ejecutar para buscar datos, llamar APIs, y tomar acciones reales.
