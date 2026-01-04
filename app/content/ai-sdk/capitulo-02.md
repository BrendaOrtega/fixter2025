# Capítulo 2: React y el Hook useChat

En el capítulo anterior generamos texto con streaming en la terminal. Ahora llevaremos el streaming a React con `useChat`, el hook que hace que construir interfaces de chat sea casi trivial.

## Por qué necesitas un hook especializado

Tu primer instinto podría ser: "Es solo un fetch con useState". Pero hay varios problemas con ese approach:

1. **No hay streaming**: El usuario ve pantalla vacía hasta que termina la respuesta
2. **No hay historial estructurado**: Mensajes como strings planos, sin roles ni metadata
3. **No hay manejo de errores mid-stream**: ¿Qué pasa si la conexión falla a mitad?
4. **Re-renders excesivos**: Cada token causa un re-render de todo el componente

`useChat` resuelve todo con una API declarativa:

```tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      sendMessage({ text: input });
      setInput("");
    }}>
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

> **Cambio en v6:** El hook ya no maneja el input internamente. Usas `useState` para el campo de texto, `sendMessage` para enviar, `status` en lugar de `isLoading`, y los mensajes tienen `parts` en lugar de `content`.

## Anatomía de useChat

El hook devuelve un objeto con estas propiedades esenciales:

```typescript
interface UseChatReturn {
  // Estado
  messages: Message[];
  status: "ready" | "submitted" | "streaming" | "error";
  error: Error | undefined;

  // Acciones
  sendMessage: (message: { text: string }) => Promise<void>;
  regenerate: () => Promise<void>;  // Antes era reload()
  stop: () => void;
  setMessages: (messages: Message[]) => void;
}
```

Los estados de `status`:
- `ready`: Listo para recibir input
- `submitted`: Mensaje enviado, esperando respuesta
- `streaming`: Recibiendo tokens del servidor
- `error`: Hubo un error en la petición

### El tipo Message en v6

Los mensajes usan `parts` en lugar de `content`:

```typescript
interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: MessagePart[];
  createdAt?: Date;
}

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-invocation"; toolInvocation: ToolInvocation }
  | { type: "tool-result"; toolResult: ToolResult };
```

Esta estructura permite mensajes más ricos que pueden contener texto, invocaciones de herramientas, y resultados — todo en el mismo mensaje.

## El protocolo de streaming

`useChat` usa un protocolo de texto optimizado para streaming, no JSON plano. Cada línea tiene un prefijo:

| Prefijo | Significado |
|---------|-------------|
| `0:` | Chunk de texto |
| `2:` | Tool call |
| `8:` | Tool result |
| `d:` | Metadata final (finish reason, usage) |
| `e:` | Error |

JSON requiere el documento completo para parsearlo. Con este protocolo, cada línea es independiente y parseable inmediatamente.

## Implementación paso a paso

### 1. El servidor (React Router v7)

```typescript
// app/routes/api.chat.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages } from "ai";
import type { Route } from "./+types/api.chat";

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: "Eres un asistente útil que responde en español.",
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
```

> **Nota v6:** `convertToModelMessages` reemplaza a `convertToCoreMessages` y ahora es **async**. También `toDataStreamResponse()` fue reemplazado por `toUIMessageStreamResponse()`.

### 2. El cliente

```tsx
// app/routes/chat.tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

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

      <form onSubmit={(e) => {
        e.preventDefault();
        if (input.trim()) {
          sendMessage({ text: input });
          setInput("");
        }
      }} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border rounded"
        />
        <button
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

### 3. Registrar la ruta

```typescript
// routes.ts
export default [
  route("api/chat", "./routes/api.chat.ts"),
];
```

En v6, `useChat()` usa `/api/chat` por defecto.

## Patrones de UI para Chat

### Indicador de escritura

```tsx
{(status === "submitted" || status === "streaming") &&
  messages[messages.length - 1]?.role === "user" && (
  <div className="flex items-center gap-1 text-gray-500 p-3">
    <span className="animate-bounce">●</span>
    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
  </div>
)}
```

### Scroll automático inteligente

El scroll debe respetar cuando el usuario está leyendo mensajes anteriores:

```tsx
function useAutoScroll<T extends HTMLElement>(deps: any[], threshold = 100) {
  const containerRef = useRef<T>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Solo scrollea si está cerca del fondo
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, deps);

  return [containerRef, endRef] as const;
}

// Uso
function Chat() {
  const { messages } = useChat();
  const [containerRef, endRef] = useAutoScroll<HTMLElement>([messages]);

  return (
    <section ref={containerRef} className="overflow-auto h-96">
      {messages.map((m) => <div key={m.id}>{/* ... */}</div>)}
      <div ref={endRef} />
    </section>
  );
}
```

## Optimización de Re-renders

`useChat` puede causar muchos re-renders — cada token actualiza el estado.

### React.memo para mensajes

```tsx
const Message = React.memo(function Message({ message }: { message: Message }) {
  return (
    <div className={message.role === "user" ? "user-msg" : "assistant-msg"}>
      {message.parts.map((part, i) =>
        part.type === "text" ? <span key={i}>{part.text}</span> : null
      )}
    </div>
  );
});
```

### Separar mensaje en streaming

```tsx
function Chat() {
  const { messages, status } = useChat();

  // Mensajes completados (no cambian durante streaming)
  const completedMessages = messages.slice(0, -1);

  // Mensaje en progreso (cambia con cada token)
  const streamingMessage = status === "streaming"
    ? messages[messages.length - 1]
    : null;

  return (
    <>
      {completedMessages.map((m) => <Message key={m.id} message={m} />)}
      {streamingMessage && <StreamingMessage message={streamingMessage} />}
    </>
  );
}
```

## Customización

### Callbacks

```tsx
const { messages } = useChat({
  onFinish: (message) => {
    console.log("Mensaje completado:", message);
  },
  onError: (error) => {
    console.error("Error:", error);
  },
});
```

### Transport personalizado

```tsx
import { DefaultChatTransport } from "@ai-sdk/react";

const { messages } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/my-custom-chat",
    headers: { Authorization: `Bearer ${token}` },
    body: { userId: currentUser.id },
  }),
});
```

### Cancelación

```tsx
const { stop, status } = useChat();

{status === "streaming" && (
  <button onClick={stop}>Detener</button>
)}
```

## Edge Cases

### Enviar mientras genera

```tsx
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (status === "streaming") {
    stop(); // Detener generación actual
  }
  sendMessage({ text: input });
  setInput("");
};
```

### Múltiples instancias

```tsx
const chat1 = useChat({ id: "soporte" });
const chat2 = useChat({ id: "ventas" });
```

### Persistir conversación

```tsx
const { messages, setMessages } = useChat();

useEffect(() => {
  const saved = localStorage.getItem("chat-messages");
  if (saved) setMessages(JSON.parse(saved));
}, []);

useEffect(() => {
  localStorage.setItem("chat-messages", JSON.stringify(messages));
}, [messages]);
```

### Error mid-stream

```tsx
const { error, regenerate, status } = useChat();

{status === "error" && (
  <div>
    <p>Error: {error?.message}</p>
    <button onClick={regenerate}>Reintentar</button>
  </div>
)}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| `useChat` | Hook que maneja estado y streaming de chat |
| `sendMessage` | Reemplaza a `append` — envía mensajes |
| `status` | Estados: `ready`, `submitted`, `streaming`, `error` |
| `message.parts` | Nuevo formato con array de partes tipadas |
| `transport` | Configuración de endpoint y headers |
| `regenerate` | Reemplaza a `reload` — reintenta última respuesta |
| Optimización | React.memo y split components |

### Migración automática v5 → v6

```bash
npx @ai-sdk/codemod v6
```

---

En el próximo capítulo abriremos el capó del streaming. Usaremos Hono como microscopio para ver exactamente qué viaja por el wire—cada `text-delta`, cada `finish-step`. Cuando tu chat falle en producción, este conocimiento te salvará.
