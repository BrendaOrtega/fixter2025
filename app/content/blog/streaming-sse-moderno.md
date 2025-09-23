# Streaming en Tiempo Real: Server-Sent Events para Aplicaciones Modernas

El streaming de datos en tiempo real se ha convertido en una necesidad fundamental para crear aplicaciones web responsivas y con experiencia de usuario superior. En este artículo exploraremos cómo implementar **Server-Sent Events (SSE)** de manera efectiva, desde el servidor hasta el cliente.

## ¿Por Qué Server-Sent Events?

SSE ofrece ventajas significativas sobre otras tecnologías de streaming:

- **Simplicidad**: Protocolo HTTP estándar, sin protocolos adicionales
- **Reconexión automática**: El navegador maneja desconexiones automáticamente
- **Compatibilidad**: Soporte nativo en todos los navegadores modernos
- **Eficiencia**: Conexión unidireccional optimizada para streaming de datos

## Implementación Server-Side: ReadableStream

El patrón moderno utiliza `ReadableStream` para crear respuestas streaming eficientes:

```typescript
// Backend: Endpoint SSE con ReadableStream
export const action = async ({ request }) => {
  const { message } = await request.json();
  const user = await getUserOrNull(request);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Streaming de eventos desde el agente IA
        for await (const event of streamAgentV0(user, message)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
};
```

### Eventos Estructurados

Cada evento incluye metadatos específicos para diferentes estados del streaming:

```typescript
// Tipos de eventos que el cliente puede recibir
type StreamEvent =
  | { type: "tool-start"; tool: string; message: string }
  | { type: "tool-complete"; tool: string; result: any }
  | { type: "chunk"; content: string }
  | { type: "complete"; message: string };
```

## Cliente: Hook React Optimizado

El frontend consume estos streams mediante un hook React personalizado:

```typescript
export const useStreamingChat = () => {
  const [messages, setMessages] = useState([]);
  const [toolProgress, setToolProgress] = useState(new Map());

  const sendMessage = async (message: string) => {
    const response = await fetch("/api/agent/stream", {
      method: "POST",
      body: JSON.stringify({ message }),
      headers: { "Content-Type": "application/json" },
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let currentContent = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const event = JSON.parse(line.slice(6));

          switch (event.type) {
            case "tool-start":
              setToolProgress((prev) =>
                new Map(prev).set(event.tool, {
                  status: "running",
                  message: event.message,
                })
              );
              break;

            case "tool-complete":
              setToolProgress((prev) => {
                const updated = new Map(prev);
                updated.set(event.tool, {
                  status: "completed",
                  result: event.result,
                });
                return updated;
              });
              break;

            case "chunk":
              currentContent += event.content;
              updateCurrentMessage(currentContent);
              break;

            case "complete":
              finalizeMessage(currentContent);
              setToolProgress(new Map());
              break;
          }
        }
      }
    }
  };

  return { messages, sendMessage, toolProgress };
};
```

## UI Reactiva con Feedback Visual

La interfaz proporciona feedback visual granular durante el streaming:

```typescript
const StreamingInterface = () => {
  const { messages, sendMessage, toolProgress } = useStreamingChat();

  return (
    <div>
      {/* Indicadores de progreso de herramientas */}
      <ProgressIndicator toolProgress={toolProgress} />

      {/* Mensajes con streaming en tiempo real */}
      <MessageList messages={messages} />

      {/* Input con estado de envío */}
      <ChatInput onSend={sendMessage} />
    </div>
  );
};
```

## Ventajas de Esta Implementación

### 1. **Performance Optimizada**

- Streaming nativo sin buffering innecesario
- Reconexión automática del navegador
- Gestión eficiente de memoria

### 2. **Experiencia de Usuario Superior**

- Feedback inmediato durante operaciones largas
- Progreso granular de herramientas en ejecución
- Actualizaciones fluidas sin bloqueos

### 3. **Escalabilidad**

- Una conexión por usuario
- Recursos del servidor optimizados
- Compatible con edge functions

## Casos de Uso Prácticos

Esta implementación es ideal para:

- **Agentes IA conversacionales** con múltiples herramientas
- **Procesamiento de datos** con feedback de progreso
- **Notificaciones en tiempo real** para aplicaciones web
- **Dashboards dinámicos** con actualizaciones continuas

## Consideraciones de Implementación

**Manejo de Errores**: Implementar retry logic y fallback strategies

**Autenticación**: Validar usuarios en cada conexión streaming

**Rate Limiting**: Controlar la frecuencia de conexiones por usuario

**Testing**: Simular diferentes escenarios de red y latencia

Server-Sent Events representa la evolución natural para aplicaciones que requieren actualizaciones en tiempo real sin la complejidad de WebSockets. Esta implementación proporciona una base sólida para crear experiencias de usuario modernas y responsivas.

Estos ejemplos son válidos para frameworks maduros como Next o React Router.

Abrazo. bliss.
