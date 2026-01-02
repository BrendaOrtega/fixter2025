# Capítulo 2: React y el Hook useChat

En el capítulo anterior generamos texto con streaming en la terminal. Funciona, pero nadie quiere un chat en la consola. En este capítulo llevaremos el streaming a React con `useChat`, el hook que hace que construir interfaces de chat sea casi trivial.

Pero no nos quedaremos en lo superficial. Vamos a entender **cómo funciona internamente**, qué decisiones de diseño tomó el equipo de Vercel, y cómo optimizar para producción.

## Por qué necesitas un hook especializado

Tu primer instinto podría ser: "Es solo un fetch con useState, ¿no?". Intentémoslo:

```tsx
function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    });

    // Problema: ¿cómo hago streaming aquí?
    const data = await response.json();
    setMessages([...messages, data.response]);
    setIsLoading(false);
  };

  return (/* ... */);
}
```

Este código tiene varios problemas:

1. **No hay streaming**: El usuario ve una pantalla vacía hasta que termina toda la respuesta
2. **No hay historial estructurado**: Los mensajes son strings planos, sin roles ni metadata
3. **No hay manejo de errores mid-stream**: ¿Qué pasa si la conexión falla a mitad de respuesta?
4. **Re-renders excesivos**: Cada token nuevo causa un re-render de todo el componente

`useChat` resuelve todo esto con una API declarativa:

```tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong>
          {m.parts.map((part, i) =>
            part.type === "text" ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button disabled={status === "streaming"}>Enviar</button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

> **Cambio importante en v6:** El hook ya no maneja el input internamente. Usas `useState` de React para el campo de texto, y `sendMessage` para enviar. También nota que usamos `status` en lugar de `isLoading`, y los mensajes tienen `parts` en lugar de `content`.

## Anatomía de useChat

El hook devuelve un objeto con muchas propiedades. Entender cada una es clave para usarlo bien:

### Estado principal

```typescript
interface UseChatReturn {
  // Array de mensajes en la conversación
  messages: Message[];

  // Estado actual del chat
  status: "ready" | "submitted" | "streaming" | "error";

  // Último error, si hubo
  error: Error | undefined;
}
```

Los estados de `status` son:
- `ready`: Listo para recibir input
- `submitted`: Mensaje enviado, esperando respuesta
- `streaming`: Recibiendo tokens del servidor
- `error`: Hubo un error en la petición

### Funciones principales

```typescript
interface UseChatReturn {
  // Enviar un mensaje
  sendMessage: (message: { text: string }) => Promise<void>;

  // Regenerar la última respuesta del asistente
  regenerate: () => Promise<void>;

  // Detener la generación actual
  stop: () => void;

  // Reemplazar todos los mensajes
  setMessages: (messages: Message[]) => void;

  // Añadir resultado de tool
  addToolOutput: (output: ToolOutput) => void;
}
```

> **Migración desde v5:** `append` → `sendMessage`, `reload` → `regenerate`, `isLoading` → `status`. Los handlers `handleInputChange` y `handleSubmit` ya no existen - manejas el input tú mismo con `useState`.

### El tipo Message

En v6, los mensajes usan `parts` en lugar de `content`:

```typescript
interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: MessagePart[];  // Array de partes del mensaje
  createdAt?: Date;
}

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-invocation"; toolInvocation: ToolInvocation }
  | { type: "tool-result"; toolResult: ToolResult };
```

Esta estructura permite mensajes más ricos que pueden contener texto, invocaciones de herramientas, y resultados - todo en el mismo mensaje.

El `id` es importante: React lo usa como `key` para optimizar renders. Si modificas mensajes, asegúrate de preservar o generar nuevos IDs únicos.

## El protocolo de streaming

`useChat` no usa JSON plano. Usa un protocolo de texto especial optimizado para streaming. Entenderlo te ayuda a debuggear problemas.

### El formato de respuesta

Cuando el servidor responde, envía datos en este formato:

```
0:"Hola"
0:", "
0:"¿cómo"
0:" estás?"
d:{"finishReason":"stop"}
```

Cada línea tiene un prefijo que indica el tipo de dato:

| Prefijo | Significado |
|---------|-------------|
| `0:` | Chunk de texto |
| `2:` | Tool call |
| `8:` | Tool result |
| `d:` | Metadata final (finish reason, usage) |
| `e:` | Error |

### Por qué no JSON puro

JSON requiere que el documento esté completo para parsearlo. Si el servidor envía:

```json
{"content": "Hola, ¿cómo est
```

...no puedes parsearlo hasta que llegue el `}` final. Con el protocolo de texto, cada línea es independiente y parseable inmediatamente.

### Viendo el protocolo en acción

Abre DevTools → Network → Filtra por "chat" → Click en la request → Response. Verás el stream de texto en tiempo real.

## Implementación paso a paso

Vamos a construir un chat funcional desde cero.

### 1. El servidor (React Router v7)

Crea el endpoint que `useChat` consumirá:

```typescript
// app/routes/api.chat.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages } from "ai";
import type { Route } from "./+types/api.chat";

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  // convertToModelMessages es async en v6
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: "Eres un asistente útil que responde en español.",
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
```

El método `toUIMessageStreamResponse()` convierte el stream al formato que `useChat` espera.

> **Nota sobre versiones:** En v6, `convertToModelMessages` reemplaza a `convertToCoreMessages` y ahora es **async**. También nota que `toDataStreamResponse()` de versiones anteriores fue reemplazado por `toUIMessageStreamResponse()`.

### 2. El cliente

```tsx
// app/routes/chat.tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === "user" ? "bg-blue-100 ml-8" : "bg-gray-100 mr-8"
            }`}
          >
            {m.parts.map((part, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null
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
          disabled={status === "streaming" || status === "submitted"}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {status === "streaming" ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
```

### 3. Registrar la ruta API

En tu `routes.ts`:

```typescript
export default [
  // ... otras rutas
  route("api/chat", "./routes/api.chat.ts"),
];
```

Eso es todo. Tienes un chat funcional con streaming. Nota que en v6, `useChat()` usa `/api/chat` por defecto, así que no necesitas especificar el endpoint.

## Cómo funciona el streaming internamente

Vamos a abrir el capó y ver qué hace `useChat` por debajo.

### El flujo de datos

```
Usuario escribe → handleSubmit → fetch POST → servidor →
  ↓
streamText genera tokens → toDataStreamResponse envía chunks →
  ↓
useChat parsea chunks → actualiza messages → React re-renderiza
```

### ReadableStream en el navegador

`useChat` usa la API de Streams del navegador:

```typescript
// Simplificación de lo que hace useChat internamente
const response = await fetch("/api/chat", { method: "POST", body });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Parsear el chunk y actualizar estado
  parseStreamChunk(chunk);
}
```

### El truco del estado parcial

El hook mantiene el mensaje del asistente en construcción como un estado separado. Cuando llega un chunk:

1. Extrae el texto del chunk
2. Lo concatena al mensaje parcial
3. Actualiza el array de mensajes con el mensaje parcial

Esto permite que veas el texto aparecer token por token sin crear nuevos objetos Message en cada chunk.

## Patrones de UI para Chat

### Loading state: más allá del spinner

Un spinner genérico es aburrido. Mejores opciones:

```tsx
// Indicador de "escribiendo..." usando status
{(status === "submitted" || status === "streaming") &&
  messages[messages.length - 1]?.role === "user" && (
  <div className="flex items-center gap-1 text-gray-500 p-3">
    <span className="animate-bounce">●</span>
    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
  </div>
)}
```

### Scroll automático

El chat debe scrollear al último mensaje. La solución más simple:

```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

return (
  <div>
    {messages.map(/* ... */)}
    <div ref={messagesEndRef} />
  </div>
);
```

Esta solución funciona, pero tiene limitaciones: scrollea incluso cuando el usuario está leyendo mensajes anteriores, lo cual es molesto.

#### Hook de producción: useAutoScroll

En el [repositorio del taller](https://github.com/blissito/taller-ai-sdk-para-principiantes) usamos un hook que resuelve este problema:

```tsx
// client/src/hooks/useAutoScroll.ts
import { useRef, useEffect, type RefObject, type DependencyList } from "react";

export function useAutoScroll<T extends HTMLElement>(
  deps: DependencyList,
  threshold = 100
): [RefObject<T | null>, RefObject<HTMLDivElement | null>] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Solo scrollea si el usuario está cerca del fondo
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;

    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, deps);

  return [containerRef, endRef];
}
```

Las ventajas de este hook:

1. **Respeta la lectura del usuario**: Solo auto-scrollea si está dentro del `threshold` del fondo
2. **API simple**: Retorna dos refs que asignas al contenedor y al final del contenido
3. **Reactivo**: Se ejecuta cuando cambian las dependencias (típicamente `messages`)
4. **Configurable**: El umbral por defecto es 100px, pero puedes ajustarlo

El uso es sencillo:

```tsx
function Chat() {
  const { messages } = useChat();
  const [containerRef, endRef] = useAutoScroll<HTMLElement>([messages]);

  return (
    <section ref={containerRef} className="overflow-auto h-96">
      {messages.map((m) => (
        <div key={m.id}>
          {/* contenido del mensaje */}
        </div>
      ))}
      <div ref={endRef} />
    </section>
  );
}
```

El `endRef` actúa como ancla al final del contenido. Cuando llegan nuevos mensajes y el usuario está cerca del fondo, el hook hace scroll suave hacia ese elemento.

### Optimistic UI

Muestra el mensaje del usuario inmediatamente, antes de que el servidor responda:

```tsx
// useChat ya hace esto automáticamente
// Cuando llamas sendMessage:
// 1. Añade el mensaje del usuario a messages inmediatamente
// 2. Envía al servidor
// 3. Cuando llega la respuesta, añade el mensaje del asistente

// No necesitas hacer nada especial
```

## Optimización y Re-renders

`useChat` puede causar muchos re-renders. Cada token nuevo actualiza el estado.

### El problema

```tsx
function Chat() {
  const { messages } = useChat();

  // Este componente se re-renderiza en CADA token
  // Si tienes 50 mensajes, re-renderizas 50 componentes Message
  return (
    <div>
      {messages.map((m) => <Message key={m.id} message={m} />)}
    </div>
  );
}
```

### Solución: React.memo

```tsx
const Message = React.memo(function Message({ message }: { message: Message }) {
  return (
    <div className={message.role === "user" ? "user-msg" : "assistant-msg"}>
      {message.content}
    </div>
  );
});

// Ahora los mensajes que no cambian no se re-renderizan
```

### Solución avanzada: Split components

Separa el mensaje en streaming del resto:

```tsx
function Chat() {
  const { messages, status } = useChat();

  // Mensajes completados (no cambian durante streaming)
  const completedMessages = messages.slice(0, -1);

  // Mensaje en progreso (cambia con cada token)
  const isStreaming = status === "streaming";
  const streamingMessage = isStreaming ? messages[messages.length - 1] : null;

  return (
    <>
      {/* Estos NO se re-renderizan durante streaming */}
      {completedMessages.map((m) => <Message key={m.id} message={m} />)}

      {/* Solo este se re-renderiza */}
      {streamingMessage && <StreamingMessage message={streamingMessage} />}
    </>
  );
}
```

## Customización avanzada

### Callbacks

`useChat` acepta callbacks para diferentes eventos:

```tsx
const { messages } = useChat({
  // Cuando termina de generar
  onFinish: (message) => {
    console.log("Mensaje completado:", message);
    // Guardar en analytics, base de datos, etc.
  },

  // Cuando hay error
  onError: (error) => {
    console.error("Error en chat:", error);
    // Mostrar toast, reportar a Sentry, etc.
  },

  // Cuando llegan datos adicionales
  onData: (data) => {
    console.log("Datos recibidos:", data);
  },
});
```

> **Nota v6:** El callback `onResponse` fue removido. Usa `onError` para manejar errores HTTP.

### Transport personalizado

Para endpoints custom o autenticación, usa `transport`:

```tsx
import { DefaultChatTransport } from "@ai-sdk/react";

const { messages } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/my-custom-chat",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      userId: currentUser.id,
    },
  }),
});
```

### Modificar mensajes antes de enviar

```tsx
const [input, setInput] = useState("");
const { messages, sendMessage } = useChat();

const handleCustomSubmit = (e: FormEvent) => {
  e.preventDefault();

  // Envía con contexto adicional
  sendMessage({
    text: `[Contexto especial] ${input}`,
  });
  setInput("");
};
```

### Cancelación

```tsx
const { stop, status } = useChat();

// Botón para detener generación
{status === "streaming" && (
  <button onClick={stop}>
    Detener
  </button>
)}
```

## Edge Cases

### El usuario envía mientras está generando

Por defecto, `useChat` ignora nuevos envíos durante la generación. Si quieres cambiar esto:

```tsx
const [input, setInput] = useState("");
const { sendMessage, stop, status } = useChat();

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();

  if (status === "streaming") {
    stop(); // Detener generación actual
  }

  sendMessage({ text: input });
  setInput("");
};
```

### Múltiples instancias de useChat

Si tienes varios chats en la misma página, usa `id` para aislarlos:

```tsx
// Chat 1
const chat1 = useChat({ id: "soporte" });

// Chat 2 (estado completamente separado)
const chat2 = useChat({ id: "ventas" });
```

### Persistir conversación

`useChat` no persiste por defecto. Para guardar/cargar:

```tsx
const { messages, setMessages } = useChat();

// Cargar al montar
useEffect(() => {
  const saved = localStorage.getItem("chat-messages");
  if (saved) {
    setMessages(JSON.parse(saved));
  }
}, []);

// Guardar cuando cambian
useEffect(() => {
  localStorage.setItem("chat-messages", JSON.stringify(messages));
}, [messages]);
```

### Error mid-stream

¿Qué pasa si la conexión falla mientras se genera? El mensaje parcial queda en `messages` con el contenido que llegó. El `error` se popula y el `status` cambia a `"error"`.

```tsx
const { messages, error, regenerate, status } = useChat();

// Mostrar mensaje parcial + error + opción de reintentar
{status === "error" && (
  <div>
    <p>Error: {error?.message}</p>
    <button onClick={regenerate}>Reintentar</button>
  </div>
)}
```

> **Nota v6:** `reload` fue renombrado a `regenerate`.

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `useChat` | Hook que maneja el estado y streaming de chat |
| `sendMessage` | Reemplaza a `append` - envía mensajes al servidor |
| `status` | Estados: `ready`, `submitted`, `streaming`, `error` |
| `message.parts` | Nuevo formato de mensajes con array de partes tipadas |
| `transport` | Configuración de endpoint y headers personalizada |
| `regenerate` | Reemplaza a `reload` - reintenta última respuesta |
| Optimización | React.memo y split components para evitar re-renders |

### Migración automática v5 → v6

Si tienes un proyecto existente en v5, Vercel proporciona un codemod que actualiza tu código automáticamente:

```bash
npx @ai-sdk/codemod v6
```

Este comando renombra funciones, actualiza imports, y hace las transformaciones necesarias con mínimos cambios manuales.

---

En el próximo capítulo abriremos el capó del streaming. Usaremos Hono como microscopio para ver exactamente qué viaja por el wire—cada `text-delta`, cada `finish-step`. Cuando tu chat falle en producción, este conocimiento te salvará.
