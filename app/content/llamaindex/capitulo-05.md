# Capítulo 5: Streaming en Tiempo Real

En los capítulos anteriores hemos construido workflows complejos, pero todas las respuestas llegaban de una vez al final. En el mundo real, los usuarios esperan **feedback inmediato** y **actualizaciones en tiempo real**.

Imagínate que la Taquería Doña Carmen quiere implementar:

- **Notificaciones en vivo** del progreso de pedidos
- **Actualizaciones automáticas** cuando cambia el estado del repartidor
- **Streaming de eventos** para múltiples clientes simultáneamente
- **Procesamiento continuo** de pedidos sin bloquear la interfaz

¡Vamos a construir un sistema de streaming completo!

## El problema del tiempo real

Cuando un cliente hace un pedido, quiere saber:

```
"¿Ya empezaron a preparar mi comida?" → Actualización inmediata
"¿Dónde está mi repartidor?" → Ubicación en tiempo real
"¿Cuánto falta?" → Estimación actualizada constantemente
```

El streaming nos permite enviar estas actualizaciones **conforme suceden**, no al final del proceso.

## Conceptos básicos de streaming

### ¿Qué es streaming en LlamaIndex?

El streaming permite que los agentes envíen respuestas **por partes** mientras procesan información:

```typescript
// Sin streaming: esperas todo el resultado
const respuesta = await agente.run({ message: "Hola" });
console.log(respuesta); // Se imprime todo de una vez

// Con streaming: recibes partes conforme se generan
const stream = await agente.runStream({ message: "Hola" });
for await (const chunk of stream) {
  process.stdout.write(chunk.delta); // Se imprime palabra por palabra
}
```

### Ventajas del streaming

1. **Experiencia más fluida**: El usuario ve progreso inmediato
2. **Mejor percepción de velocidad**: Parece más rápido aunque tome el mismo tiempo
3. **Feedback temprano**: Puedes mostrar resultados parciales
4. **Interactividad**: El usuario puede interrumpir o modificar el proceso

## Implementando streaming básico

Empezemos con un ejemplo simple de streaming:

```typescript
import { agent, tool } from "llamaindex";

// Herramienta que simula procesamiento paso a paso
const procesarPedidoConStreaming = tool(
  async ({ pedido }: { pedido: string }) => {
    // Simular pasos de procesamiento
    const pasos = [
      "🔍 Analizando tu pedido...",
      "📋 Verificando ingredientes...",
      "💰 Calculando precios...",
      "✅ Pedido procesado correctamente",
    ];

    let resultado = "";

    for (const paso of pasos) {
      resultado += paso + "\n";
      // Simular tiempo de procesamiento
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      pasos: pasos.length,
      resultado,
      mensaje: "Procesamiento completado con streaming",
    };
  },
  {
    name: "procesar_pedido_streaming",
    description: "Procesa un pedido mostrando progreso paso a paso",
  }
);

const agenteStreamingBasico = agent({
  tools: [procesarPedidoConStreaming],
  systemPrompt: `
    Eres un asistente que muestra el progreso de procesamiento en tiempo real.
    
    Cuando proceses un pedido:
    1. Usa la herramienta de procesamiento con streaming
    2. Explica cada paso conforme sucede
    3. Mantén al usuario informado del progreso
    4. Proporciona feedback continuo
    
    Ejemplo de flujo:
    "¡Hola! Voy a procesar tu pedido paso a paso:
    
    [usar herramienta]
    
    ¡Listo! Tu pedido ha sido procesado exitosamente."
  `,
});
```

## Streaming avanzado con eventos

Ahora vamos a crear un sistema más sofisticado que maneja **eventos en tiempo real**:

```typescript
// Simulador de eventos en tiempo real
class EventosPedido {
  private listeners: Map<string, Function[]> = new Map();

  // Suscribirse a eventos
  on(evento: string, callback: Function) {
    if (!this.listeners.has(evento)) {
      this.listeners.set(evento, []);
    }
    this.listeners.get(evento)!.push(callback);
  }

  // Emitir evento
  emit(evento: string, data: any) {
    const callbacks = this.listeners.get(evento) || [];
    callbacks.forEach((callback) => callback(data));
  }

  // Simular progreso de pedido
  async simularProgresoPedido(pedidoId: string) {
    const eventos = [
      { tipo: "pedido_recibido", mensaje: "📝 Pedido recibido", tiempo: 0 },
      {
        tipo: "preparacion_iniciada",
        mensaje: "👨‍🍳 Iniciando preparación",
        tiempo: 2000,
      },
      { tipo: "comida_lista", mensaje: "🍽️ Comida lista", tiempo: 15000 },
      {
        tipo: "repartidor_asignado",
        mensaje: "🚚 Repartidor en camino",
        tiempo: 17000,
      },
      { tipo: "en_ruta", mensaje: "🛣️ En ruta a tu domicilio", tiempo: 20000 },
      { tipo: "entregado", mensaje: "✅ ¡Pedido entregado!", tiempo: 35000 },
    ];

    for (const evento of eventos) {
      setTimeout(() => {
        this.emit("progreso_pedido", {
          pedidoId,
          ...evento,
          timestamp: new Date().toLocaleTimeString(),
        });
      }, evento.tiempo);
    }
  }
}

const eventosManager = new EventosPedido();

// Herramienta para iniciar seguimiento en tiempo real
const iniciarSeguimientoTiempoReal = tool(
  async ({ pedidoId }: { pedidoId: string }) => {
    // Iniciar simulación de eventos
    eventosManager.simularProgresoPedido(pedidoId);

    return {
      pedidoId,
      seguimientoIniciado: true,
      mensaje: `Seguimiento en tiempo real iniciado para pedido ${pedidoId}`,
      linkSeguimiento: `https://taqueria.com/live/${pedidoId}`,
    };
  },
  {
    name: "iniciar_seguimiento_tiempo_real",
    description: "Inicia el seguimiento en tiempo real de un pedido",
  }
);

// Herramienta para obtener actualizaciones en vivo
const obtenerActualizacionesVivo = tool(
  async ({ pedidoId }: { pedidoId: string }) => {
    return new Promise((resolve) => {
      const actualizaciones: any[] = [];

      // Escuchar eventos por 5 segundos
      const listener = (data: any) => {
        if (data.pedidoId === pedidoId) {
          actualizaciones.push(data);
        }
      };

      eventosManager.on("progreso_pedido", listener);

      setTimeout(() => {
        resolve({
          pedidoId,
          actualizaciones,
          mensaje: `${actualizaciones.length} actualizaciones recibidas`,
        });
      }, 5000);
    });
  },
  {
    name: "obtener_actualizaciones_vivo",
    description: "Obtiene actualizaciones en tiempo real de un pedido",
  }
);
```

## Agente de streaming completo

Ahora creamos un agente que maneja streaming y eventos en tiempo real:

```typescript
const agenteStreamingCompleto = agent({
  tools: [
    procesarPedidoConStreaming,
    iniciarSeguimientoTiempoReal,
    obtenerActualizacionesVivo,
  ],
  systemPrompt: `
    Eres el especialista en seguimiento en tiempo real de Taquería Doña Carmen.
    
    Tu trabajo es proporcionar actualizaciones continuas y streaming de información:
    
    PARA NUEVOS PEDIDOS:
    1. Procesa el pedido con streaming paso a paso
    2. Inicia seguimiento en tiempo real
    3. Proporciona link de seguimiento en vivo
    4. Explica cómo funcionan las notificaciones
    
    PARA CONSULTAS DE ESTADO:
    1. Obtén actualizaciones en vivo del pedido
    2. Presenta la información de forma clara
    3. Indica el siguiente paso esperado
    4. Proporciona tiempo estimado actualizado
    
    IMPORTANTE:
    - Usa streaming para mostrar progreso paso a paso
    - Proporciona feedback continuo al usuario
    - Explica cada actualización que recibas
    - Mantén al usuario informado en todo momento
    - Usa emojis para hacer más visual el progreso
    
    Ejemplo de flujo:
    "¡Hola! Voy a procesar tu pedido en tiempo real:
    
    🔍 Analizando tu pedido...
    ✅ Pedido analizado
    
    📋 Verificando ingredientes...
    ✅ Ingredientes disponibles
    
    [continuar con streaming...]
    
    🚀 ¡Seguimiento en tiempo real activado!"
  `,
});
```

## Sistema de notificaciones push

Vamos a crear un sistema que simule notificaciones push reales:

```typescript
// Simulador de notificaciones push
class NotificacionesPush {
  private suscriptores: Map<string, any> = new Map();

  // Suscribir cliente a notificaciones
  suscribir(clienteId: string, callback: Function) {
    this.suscriptores.set(clienteId, callback);
    console.log(`📱 Cliente ${clienteId} suscrito a notificaciones push`);
  }

  // Enviar notificación a cliente específico
  enviarNotificacion(clienteId: string, notificacion: any) {
    const callback = this.suscriptores.get(clienteId);
    if (callback) {
      callback(notificacion);
    }
  }

  // Enviar notificación a todos los clientes
  broadcast(notificacion: any) {
    this.suscriptores.forEach((callback, clienteId) => {
      console.log(`📢 Enviando a ${clienteId}:`, notificacion.mensaje);
      callback(notificacion);
    });
  }
}

const pushManager = new NotificacionesPush();

// Herramienta para gestionar notificaciones
const gestionarNotificaciones = tool(
  async ({
    accion,
    clienteId,
    mensaje,
  }: {
    accion: "suscribir" | "enviar" | "broadcast";
    clienteId?: string;
    mensaje?: string;
  }) => {
    switch (accion) {
      case "suscribir":
        if (clienteId) {
          pushManager.suscribir(clienteId, (notif: any) => {
            console.log(`🔔 [${clienteId}] ${notif.mensaje}`);
          });
          return {
            suscrito: true,
            mensaje: `Cliente ${clienteId} suscrito a notificaciones`,
          };
        }
        break;

      case "enviar":
        if (clienteId && mensaje) {
          pushManager.enviarNotificacion(clienteId, {
            mensaje,
            timestamp: new Date().toLocaleTimeString(),
          });
          return {
            enviado: true,
            mensaje: `Notificación enviada a ${clienteId}`,
          };
        }
        break;

      case "broadcast":
        if (mensaje) {
          pushManager.broadcast({
            mensaje,
            timestamp: new Date().toLocaleTimeString(),
          });
          return {
            broadcast: true,
            mensaje: "Notificación enviada a todos los clientes",
          };
        }
        break;
    }

    return { error: "Parámetros inválidos" };
  },
  {
    name: "gestionar_notificaciones",
    description: "Gestiona suscripciones y envío de notificaciones push",
  }
);
```

## Ejemplo completo de streaming

Ahora vamos a crear una demostración completa del sistema:

```typescript
async function demoStreamingCompleto() {
  console.log("🔴 DEMO STREAMING EN TIEMPO REAL - TAQUERÍA DOÑA CARMEN");
  console.log("=".repeat(70));

  // Simular cliente suscribiéndose a notificaciones
  console.log("\n📱 Cliente María se suscribe a notificaciones...");
  await agenteStreamingCompleto.runStream({
    message: "Quiero suscribirme a notificaciones para mi pedido",
  });

  console.log("\n" + "=".repeat(70));

  // Procesar pedido con streaming
  console.log("\n🍽️ Procesando pedido con streaming en tiempo real...");
  console.log("-".repeat(50));

  const streamPedido = await agenteStreamingCompleto.runStream({
    message: `Hola, quiero hacer un pedido: 3 tacos de pastor y 2 quesadillas. 
              Quiero seguimiento en tiempo real por favor.`,
  });

  for await (const chunk of streamPedido) {
    process.stdout.write(chunk.delta);
    // Simular pequeña pausa para efecto visual
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("\n" + "=".repeat(70));

  // Simular consulta de estado en tiempo real
  console.log("\n📊 Consultando estado del pedido en tiempo real...");
  console.log("-".repeat(50));

  // Esperar un poco para que haya eventos
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const streamEstado = await agenteStreamingCompleto.runStream({
    message: "¿Cuál es el estado actual de mi pedido PED123456?",
  });

  for await (const chunk of streamEstado) {
    process.stdout.write(chunk.delta);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("\n" + "=".repeat(70));

  // Demostrar notificaciones broadcast
  console.log("\n📢 Enviando notificación a todos los clientes...");

  const streamBroadcast = await agenteStreamingCompleto.runStream({
    message:
      "Envía una notificación a todos los clientes sobre una promoción especial",
  });

  for await (const chunk of streamBroadcast) {
    process.stdout.write(chunk.delta);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
```

## Streaming con WebSockets (simulado)

Para aplicaciones web reales, usarías WebSockets. Aquí una simulación:

```typescript
// Simulador de WebSocket para streaming
class WebSocketSimulado {
  private conexiones: Map<string, Function> = new Map();

  // Simular conexión de cliente
  conectar(clienteId: string, onMessage: Function) {
    this.conexiones.set(clienteId, onMessage);
    console.log(`🔌 Cliente ${clienteId} conectado via WebSocket`);

    // Enviar mensaje de bienvenida
    this.enviarMensaje(clienteId, {
      tipo: "conexion",
      mensaje: "¡Conectado al streaming en tiempo real!",
    });
  }

  // Enviar mensaje a cliente específico
  enviarMensaje(clienteId: string, data: any) {
    const callback = this.conexiones.get(clienteId);
    if (callback) {
      callback(data);
    }
  }

  // Streaming continuo de datos
  async iniciarStreaming(clienteId: string, datos: any[]) {
    for (const dato of datos) {
      this.enviarMensaje(clienteId, {
        tipo: "stream",
        data: dato,
        timestamp: new Date().toISOString(),
      });

      // Pausa entre mensajes para simular streaming
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Mensaje de finalización
    this.enviarMensaje(clienteId, {
      tipo: "fin_stream",
      mensaje: "Streaming completado",
    });
  }
}

const wsManager = new WebSocketSimulado();

// Herramienta para manejar WebSocket streaming
const manejarWebSocketStreaming = tool(
  async ({
    clienteId,
    accion,
    datos,
  }: {
    clienteId: string;
    accion: "conectar" | "stream" | "desconectar";
    datos?: any[];
  }) => {
    switch (accion) {
      case "conectar":
        wsManager.conectar(clienteId, (message: any) => {
          console.log(`📨 [${clienteId}] Recibido:`, message);
        });
        return { conectado: true, mensaje: `Cliente ${clienteId} conectado` };

      case "stream":
        if (datos) {
          await wsManager.iniciarStreaming(clienteId, datos);
          return {
            streaming: true,
            mensaje: `Streaming iniciado para ${clienteId}`,
          };
        }
        break;

      case "desconectar":
        // Simular desconexión
        return {
          desconectado: true,
          mensaje: `Cliente ${clienteId} desconectado`,
        };
    }

    return { error: "Acción no válida" };
  },
  {
    name: "manejar_websocket_streaming",
    description:
      "Maneja conexiones WebSocket y streaming de datos en tiempo real",
  }
);
```

## Ejecutando el sistema completo

```typescript
async function ejecutarSistemaStreaming() {
  console.log("🚀 INICIANDO SISTEMA DE STREAMING COMPLETO");
  console.log("=".repeat(60));

  try {
    // 1. Demo básico de streaming
    await demoStreamingCompleto();

    console.log("\n\n🔌 DEMO WEBSOCKET STREAMING");
    console.log("=".repeat(60));

    // 2. Demo WebSocket streaming
    const clienteId = "cliente_maria_123";

    // Conectar cliente
    await manejarWebSocketStreaming({
      clienteId,
      accion: "conectar",
    });

    // Iniciar streaming de datos
    const datosStreaming = [
      { evento: "pedido_recibido", mensaje: "📝 Tu pedido ha sido recibido" },
      { evento: "preparacion", mensaje: "👨‍🍳 Preparando tu comida..." },
      { evento: "listo", mensaje: "🍽️ ¡Tu comida está lista!" },
      { evento: "en_camino", mensaje: "🚚 Repartidor en camino" },
      { evento: "entregado", mensaje: "✅ ¡Pedido entregado!" },
    ];

    await manejarWebSocketStreaming({
      clienteId,
      accion: "stream",
      datos: datosStreaming,
    });

    console.log("\n✅ Demo de streaming completado exitosamente!");
  } catch (error) {
    console.error("❌ Error en el sistema de streaming:", error);
  }
}

// Ejecutar el sistema
ejecutarSistemaStreaming().catch(console.error);
```

## Resultado esperado

```
🚀 INICIANDO SISTEMA DE STREAMING COMPLETO
============================================================

📱 Cliente María se suscribe a notificaciones...
¡Hola María! Te voy a suscribir a nuestras notificaciones en tiempo real...

✅ ¡Suscripción completada! Ahora recibirás actualizaciones automáticas.

======================================================================

🍽️ Procesando pedido con streaming en tiempo real...
--------------------------------------------------
¡Hola! Voy a procesar tu pedido en tiempo real:

🔍 Analizando tu pedido...
   ✅ 3 tacos de pastor detectados
   ✅ 2 quesadillas detectadas

📋 Verificando ingredientes...
   ✅ Pastor disponible (suficiente stock)
   ✅ Queso disponible (suficiente stock)
   ✅ Tortillas disponibles

💰 Calculando precios...
   • 3 tacos de pastor: $45
   • 2 quesadillas: $50
   • Total: $95

🚀 Iniciando seguimiento en tiempo real...
   📱 Link de seguimiento: https://taqueria.com/live/PED123456
   🔔 Notificaciones activadas

✅ ¡Pedido procesado! Recibirás actualizaciones automáticas.

======================================================================

📊 Consultando estado del pedido en tiempo real...
--------------------------------------------------
Consultando el estado actual de tu pedido PED123456...

📡 Obteniendo actualizaciones en vivo...

🔄 Actualizaciones recibidas:
   📝 15:30:15 - Pedido recibido
   👨‍🍳 15:32:15 - Iniciando preparación
   🍽️ 15:47:15 - Comida lista

📍 Estado actual: Comida lista, esperando repartidor
⏱️ Próximo paso: Asignación de repartidor (2-3 minutos)

======================================================================

🔌 DEMO WEBSOCKET STREAMING
============================================================

🔌 Cliente cliente_maria_123 conectado via WebSocket
📨 [cliente_maria_123] Recibido: {
  tipo: 'conexion',
  mensaje: '¡Conectado al streaming en tiempo real!'
}

📨 [cliente_maria_123] Recibido: {
  tipo: 'stream',
  data: { evento: 'pedido_recibido', mensaje: '📝 Tu pedido ha sido recibido' },
  timestamp: '2024-01-15T15:30:00.000Z'
}

📨 [cliente_maria_123] Recibido: {
  tipo: 'stream',
  data: { evento: 'preparacion', mensaje: '👨‍🍳 Preparando tu comida...' },
  timestamp: '2024-01-15T15:31:00.000Z'
}

[... más actualizaciones en tiempo real ...]

✅ Demo de streaming completado exitosamente!
```

## ¿Qué acabamos de lograr?

1. **Streaming paso a paso**: Los usuarios ven el progreso conforme sucede
2. **Eventos en tiempo real**: Actualizaciones automáticas sin necesidad de preguntar
3. **Notificaciones push**: Sistema de notificaciones para múltiples clientes
4. **WebSocket simulado**: Base para implementación web real
5. **Experiencia fluida**: Feedback continuo que mejora la percepción del usuario

## Conceptos clave aprendidos

### Streaming vs. Respuestas tradicionales

**Tradicional**: Esperar → Procesar → Responder todo junto
**Streaming**: Procesar → Enviar partes → Continuar procesando

### Eventos asíncronos

Los eventos permiten que diferentes partes del sistema se comuniquen sin bloquear el flujo principal.

### Gestión de estado en tiempo real

El sistema mantiene estado actualizado y lo comparte con múltiples clientes simultáneamente.

### Experiencia de usuario mejorada

El streaming hace que las aplicaciones se sientan más responsivas y modernas.

## Mejoras que puedes implementar

### 1. Persistencia de eventos

```typescript
// Guardar eventos en base de datos para recuperación
const guardarEvento = tool(async ({ evento, pedidoId }) => {
  // await db.eventos.create({ evento, pedidoId, timestamp: new Date() });
  return { guardado: true };
});
```

### 2. Filtros de notificaciones

```typescript
// Permitir que usuarios configuren qué notificaciones recibir
const configurarNotificaciones = tool(async ({ clienteId, preferencias }) => {
  // Solo enviar notificaciones que el cliente quiere recibir
  return { configurado: true };
});
```

### 3. Streaming con límites de velocidad

```typescript
// Controlar la velocidad de streaming para no abrumar al usuario
const streamingControlado = async (datos: any[], velocidad: number) => {
  for (const dato of datos) {
    await enviarDato(dato);
    await new Promise((resolve) => setTimeout(resolve, velocidad));
  }
};
```

## Lo que viene

En el siguiente capítulo exploraremos **Integrando Tools Externos**, donde aprenderemos:

- Cómo conectar workflows con APIs externas
- Integración con servicios de terceros
- Manejo de autenticación y rate limiting
- Patrones para sistemas híbridos

¡Ya tienes streaming en tiempo real funcionando! 🎉

## Ejercicio práctico

Expande el sistema de streaming:

### Nivel 1: Básico

1. **Agregar más tipos de eventos** (promociones, alertas de inventario)
2. **Implementar filtros de streaming** (solo eventos importantes)
3. **Crear sistema de replay** (reproducir eventos pasados)

### Nivel 2: Intermedio

4. **Integrar con WebSockets reales** usando Socket.io
5. **Implementar salas de chat** para soporte en tiempo real
6. **Crear dashboard de monitoreo** con métricas en vivo

### Nivel 3: Avanzado

7. **Implementar streaming con backpressure** (control de flujo)
8. **Crear sistema de eventos distribuido** con Redis
9. **Implementar streaming de video/audio** para llamadas de soporte

¿Te animas a llevarlo al siguiente nivel? En el próximo capítulo veremos cómo integrar con el mundo exterior.
