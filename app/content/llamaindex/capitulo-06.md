# Capítulo 6: Integrando Tools Externos

En los capítulos anteriores hemos construido workflows complejos y sistemas de streaming, pero todo ha funcionado de manera aislada. En el mundo real, los agentes necesitan **conectarse con servicios externos**: APIs de pago, sistemas de inventario, servicios de mapas, bases de datos, y mucho más.

Imagínate que la Taquería Doña Carmen quiere integrar:

- **Pagos con Stripe** para procesar tarjetas de crédito
- **Google Maps API** para calcular rutas de entrega
- **WhatsApp Business API** para enviar mensajes automáticos
- **Sistema de inventario externo** para sincronizar stock
- **Servicio de calificaciones** para recopilar feedback

¡Vamos a construir un sistema híbrido que conecte nuestros workflows con el mundo exterior!

## El problema de la integración

Cuando conectas agentes con servicios externos, enfrentas nuevos desafíos:

```
Agente → API Externa → ¿Autenticación? → ¿Rate Limiting? → ¿Errores de red?
```

Necesitamos herramientas robustas que manejen:

- **Autenticación** con diferentes servicios
- **Manejo de errores** cuando las APIs fallan
- **Rate limiting** para no exceder límites
- **Transformación de datos** entre formatos
- **Fallbacks** cuando servicios no están disponibles

## Configuración para integraciones externas

Primero, vamos a configurar las dependencias necesarias:

```bash
# Instalar librerías para integraciones
npm install axios stripe google-maps-services-js
npm install twilio  # Para WhatsApp Business API
npm install redis   # Para caché y rate limiting
npm install -D @types/node
```

### Variables de entorno

Crea un archivo `.env` para las credenciales:

```env
# APIs de pago
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# WhatsApp Business (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Base de datos externa
EXTERNAL_INVENTORY_API_URL=https://api.inventario.com
EXTERNAL_INVENTORY_API_KEY=inv_...

# Redis para caché
REDIS_URL=redis://localhost:6379
```

## Herramientas para integración con Stripe

Empezemos con la integración de pagos:

```typescript
import { tool } from "llamaindex";
import Stripe from "stripe";

// Configurar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Herramienta para procesar pagos
const procesarPagoStripe = tool(
  async ({
    monto,
    moneda,
    descripcion,
    metodoPago,
  }: {
    monto: number;
    moneda: string;
    descripcion: string;
    metodoPago: string;
  }) => {
    try {
      // Crear Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(monto * 100), // Stripe usa centavos
        currency: moneda,
        description: descripcion,
        payment_method: metodoPago,
        confirm: true,
        return_url: "https://taqueria.com/pago-completado",
      });

      return {
        exito: true,
        transaccionId: paymentIntent.id,
        estado: paymentIntent.status,
        monto: monto,
        mensaje: `Pago de $${monto} ${moneda} procesado exitosamente`,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      return {
        exito: false,
        error: error.message,
        codigo: error.code,
        mensaje: `Error al procesar pago: ${error.message}`,
      };
    }
  },
  {
    name: "procesar_pago_stripe",
    description: "Procesa pagos con tarjeta de crédito usando Stripe",
  }
);

// Herramienta para verificar estado de pago
const verificarEstadoPago = tool(
  async ({ transaccionId }: { transaccionId: string }) => {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transaccionId);

      return {
        transaccionId,
        estado: paymentIntent.status,
        monto: paymentIntent.amount / 100,
        moneda: paymentIntent.currency,
        fechaCreacion: new Date(paymentIntent.created * 1000).toISOString(),
        mensaje: `Pago ${paymentIntent.status}`,
      };
    } catch (error: any) {
      return {
        error: true,
        mensaje: `No se pudo verificar el pago: ${error.message}`,
      };
    }
  },
  {
    name: "verificar_estado_pago",
    description: "Verifica el estado actual de una transacción de Stripe",
  }
);
```

## Integración con Google Maps API

Ahora vamos a integrar cálculo de rutas y distancias:

```typescript
import { Client } from "@googlemaps/google-maps-services-js";

// Configurar cliente de Google Maps
const mapsClient = new Client({});

// Herramienta para calcular ruta de entrega
const calcularRutaEntrega = tool(
  async ({
    origen,
    destino,
    modo,
  }: {
    origen: string;
    destino: string;
    modo?: "driving" | "walking" | "bicycling";
  }) => {
    try {
      const response = await mapsClient.directions({
        params: {
          origin: origen,
          destination: destino,
          mode: modo || "driving",
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: "es",
          region: "mx",
        },
      });

      const ruta = response.data.routes[0];
      const tramo = ruta.legs[0];

      return {
        exito: true,
        distancia: tramo.distance.text,
        duracion: tramo.duration.text,
        distanciaMetros: tramo.distance.value,
        duracionSegundos: tramo.duration.value,
        instrucciones: tramo.steps.map((step) => step.html_instructions),
        costoEstimado: Math.ceil(tramo.distance.value / 1000) * 5, // $5 por km
        mensaje: `Ruta calculada: ${tramo.distance.text} en ${tramo.duration.text}`,
      };
    } catch (error: any) {
      return {
        exito: false,
        error: error.message,
        mensaje: "No se pudo calcular la ruta de entrega",
      };
    }
  },
  {
    name: "calcular_ruta_entrega",
    description:
      "Calcula ruta, distancia y tiempo de entrega usando Google Maps",
  }
);

// Herramienta para geocodificar direcciones
const geocodificarDireccion = tool(
  async ({ direccion }: { direccion: string }) => {
    try {
      const response = await mapsClient.geocode({
        params: {
          address: direccion,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: "es",
          region: "mx",
        },
      });

      const resultado = response.data.results[0];

      return {
        exito: true,
        direccionFormateada: resultado.formatted_address,
        latitud: resultado.geometry.location.lat,
        longitud: resultado.geometry.location.lng,
        tipoUbicacion: resultado.geometry.location_type,
        componentes: resultado.address_components,
        mensaje: `Dirección geocodificada exitosamente`,
      };
    } catch (error: any) {
      return {
        exito: false,
        error: error.message,
        mensaje: "No se pudo geocodificar la dirección",
      };
    }
  },
  {
    name: "geocodificar_direccion",
    description: "Convierte una dirección en coordenadas geográficas",
  }
);
```

## Integración con WhatsApp Business API

Vamos a conectar con WhatsApp para enviar mensajes automáticos:

```typescript
import twilio from "twilio";

// Configurar cliente de Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Herramienta para enviar mensajes de WhatsApp
const enviarWhatsApp = tool(
  async ({
    numeroDestino,
    mensaje,
    tipoMensaje,
  }: {
    numeroDestino: string;
    mensaje: string;
    tipoMensaje?: "texto" | "plantilla";
  }) => {
    try {
      // Formatear número para WhatsApp
      const numeroWhatsApp = `whatsapp:${numeroDestino}`;

      const mensajeEnviado = await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER!,
        to: numeroWhatsApp,
        body: mensaje,
      });

      return {
        exito: true,
        mensajeId: mensajeEnviado.sid,
        estado: mensajeEnviado.status,
        numeroDestino: numeroDestino,
        fechaEnvio: mensajeEnviado.dateCreated,
        mensaje: `Mensaje de WhatsApp enviado exitosamente`,
      };
    } catch (error: any) {
      return {
        exito: false,
        error: error.message,
        codigo: error.code,
        mensaje: `Error al enviar WhatsApp: ${error.message}`,
      };
    }
  },
  {
    name: "enviar_whatsapp",
    description: "Envía mensajes automáticos por WhatsApp Business API",
  }
);

// Herramienta para enviar confirmación de pedido
const enviarConfirmacionPedido = tool(
  async ({
    numeroCliente,
    pedidoId,
    items,
    total,
    tiempoEstimado,
  }: {
    numeroCliente: string;
    pedidoId: string;
    items: string[];
    total: number;
    tiempoEstimado: number;
  }) => {
    const mensaje = `
🌮 *Taquería Doña Carmen*

¡Hola! Tu pedido ha sido confirmado:

📋 *Pedido:* ${pedidoId}
🍽️ *Items:* ${items.join(", ")}
💰 *Total:* $${total} MXN
⏰ *Tiempo estimado:* ${tiempoEstimado} minutos

Te mantendremos informado del progreso.

¡Gracias por tu preferencia! 🙏
    `.trim();

    return await enviarWhatsApp({
      numeroDestino: numeroCliente,
      mensaje,
      tipoMensaje: "texto",
    });
  },
  {
    name: "enviar_confirmacion_pedido",
    description: "Envía confirmación automática de pedido por WhatsApp",
  }
);
```

## Sistema de inventario externo

Ahora vamos a integrar con un sistema de inventario externo:

```typescript
import axios from "axios";

// Cliente para API de inventario externo
const inventarioAPI = axios.create({
  baseURL: process.env.EXTERNAL_INVENTORY_API_URL,
  headers: {
    Authorization: `Bearer ${process.env.EXTERNAL_INVENTORY_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 5000, // 5 segundos timeout
});

// Herramienta para sincronizar inventario
const sincronizarInventario = tool(
  async ({ productos }: { productos: string[] }) => {
    try {
      const response = await inventarioAPI.post("/sync", {
        productos,
        tienda: "taqueria-dona-carmen",
        timestamp: new Date().toISOString(),
      });

      return {
        exito: true,
        productosActualizados: response.data.updated,
        stockDisponible: response.data.stock,
        ultimaActualizacion: response.data.lastUpdate,
        mensaje: `${response.data.updated.length} productos sincronizados`,
      };
    } catch (error: any) {
      // Fallback: usar inventario local si la API falla
      return {
        exito: false,
        usandoFallback: true,
        error: error.message,
        mensaje: "API de inventario no disponible, usando datos locales",
      };
    }
  },
  {
    name: "sincronizar_inventario",
    description: "Sincroniza inventario con sistema externo",
  }
);

// Herramienta para verificar stock en tiempo real
const verificarStockExterno = tool(
  async ({ productoId }: { productoId: string }) => {
    try {
      const response = await inventarioAPI.get(`/stock/${productoId}`);

      return {
        exito: true,
        productoId,
        stockDisponible: response.data.quantity,
        reservado: response.data.reserved,
        disponibleVenta: response.data.available,
        proximoRestock: response.data.nextRestock,
        mensaje: `Stock verificado: ${response.data.available} unidades disponibles`,
      };
    } catch (error: any) {
      return {
        exito: false,
        error: error.message,
        mensaje: `No se pudo verificar stock para ${productoId}`,
      };
    }
  },
  {
    name: "verificar_stock_externo",
    description: "Verifica stock disponible en sistema externo",
  }
);
```

## Sistema de rate limiting y caché

Para manejar límites de API y mejorar performance:

```typescript
import Redis from "ioredis";

// Configurar Redis para caché
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Herramienta para manejar rate limiting
const verificarRateLimit = tool(
  async ({
    servicio,
    identificador,
    limite,
    ventanaTiempo,
  }: {
    servicio: string;
    identificador: string;
    limite: number;
    ventanaTiempo: number; // en segundos
  }) => {
    try {
      const clave = `rate_limit:${servicio}:${identificador}`;
      const solicitudesActuales = await redis.incr(clave);

      if (solicitudesActuales === 1) {
        // Primera solicitud, establecer expiración
        await redis.expire(clave, ventanaTiempo);
      }

      const permitido = solicitudesActuales <= limite;

      return {
        permitido,
        solicitudesActuales,
        limite,
        tiempoRestante: await redis.ttl(clave),
        mensaje: permitido
          ? `Solicitud permitida (${solicitudesActuales}/${limite})`
          : `Rate limit excedido (${solicitudesActuales}/${limite})`,
      };
    } catch (error: any) {
      // Si Redis falla, permitir la solicitud
      return {
        permitido: true,
        error: error.message,
        mensaje: "Rate limiting no disponible, permitiendo solicitud",
      };
    }
  },
  {
    name: "verificar_rate_limit",
    description:
      "Verifica si una solicitud está dentro de los límites de rate limiting",
  }
);

// Herramienta para caché inteligente
const manejarCache = tool(
  async ({
    clave,
    accion,
    valor,
    ttl,
  }: {
    clave: string;
    accion: "get" | "set" | "delete";
    valor?: any;
    ttl?: number; // tiempo de vida en segundos
  }) => {
    try {
      switch (accion) {
        case "get":
          const valorCache = await redis.get(clave);
          return {
            encontrado: valorCache !== null,
            valor: valorCache ? JSON.parse(valorCache) : null,
            mensaje: valorCache
              ? "Datos encontrados en caché"
              : "No hay datos en caché",
          };

        case "set":
          if (valor) {
            if (ttl) {
              await redis.setex(clave, ttl, JSON.stringify(valor));
            } else {
              await redis.set(clave, JSON.stringify(valor));
            }
            return {
              guardado: true,
              ttl: ttl || "sin expiración",
              mensaje: "Datos guardados en caché",
            };
          }
          break;

        case "delete":
          const eliminados = await redis.del(clave);
          return {
            eliminado: eliminados > 0,
            mensaje:
              eliminados > 0
                ? "Datos eliminados del caché"
                : "Clave no encontrada",
          };
      }

      return { error: "Acción no válida" };
    } catch (error: any) {
      return {
        error: true,
        mensaje: `Error en caché: ${error.message}`,
      };
    }
  },
  {
    name: "manejar_cache",
    description: "Maneja operaciones de caché para optimizar performance",
  }
);
```

## Agente híbrido completo

Ahora vamos a crear un agente que integre todos estos servicios externos:

```typescript
import { agent } from "llamaindex";

const agenteHibrido = agent({
  tools: [
    // Herramientas de pagos
    procesarPagoStripe,
    verificarEstadoPago,

    // Herramientas de mapas
    calcularRutaEntrega,
    geocodificarDireccion,

    // Herramientas de WhatsApp
    enviarWhatsApp,
    enviarConfirmacionPedido,

    // Herramientas de inventario
    sincronizarInventario,
    verificarStockExterno,

    // Herramientas de infraestructura
    verificarRateLimit,
    manejarCache,
  ],
  systemPrompt: `
    Eres el agente híbrido de Taquería Doña Carmen que integra múltiples servicios externos.
    
    Tu trabajo es coordinar entre nuestro sistema interno y servicios externos:
    
    FLUJO COMPLETO DE PEDIDO CON INTEGRACIONES:
    
    1. **Recibir pedido** y verificar rate limits
    2. **Verificar stock** en sistema externo (con fallback a local)
    3. **Geocodificar dirección** del cliente
    4. **Calcular ruta** y costo de entrega
    5. **Procesar pago** con Stripe
    6. **Enviar confirmación** por WhatsApp
    7. **Sincronizar inventario** después de la venta
    8. **Usar caché** para optimizar consultas frecuentes
    
    MANEJO DE ERRORES:
    - Si un servicio externo falla, usa fallbacks
    - Siempre verifica rate limits antes de hacer llamadas
    - Usa caché para reducir llamadas a APIs
    - Informa al usuario sobre cualquier limitación
    
    OPTIMIZACIONES:
    - Cachea resultados de geocodificación por 24 horas
    - Cachea stock de inventario por 5 minutos
    - Respeta rate limits de cada servicio
    - Usa datos locales como fallback
    
    IMPORTANTE:
    - Sé transparente sobre qué servicios estás usando
    - Explica si hay demoras por servicios externos
    - Proporciona alternativas si algo falla
    - Mantén al usuario informado del progreso
  `,
});
```

## Ejemplo completo de integración

Vamos a probar el sistema híbrido completo:

```typescript
async function demoIntegracionCompleta() {
  console.log("🔗 DEMO INTEGRACIÓN COMPLETA - SERVICIOS EXTERNOS");
  console.log("=".repeat(70));

  // Escenario 1: Pedido completo con todas las integraciones
  console.log("\n🌮 Escenario 1: Pedido completo con integraciones externas");
  console.log("-".repeat(60));

  const streamCompleto = await agenteHibrido.runStream({
    message: `
      Hola, quiero hacer un pedido completo:
      - 4 tacos de pastor
      - 2 quesadillas de queso  
      - 1 agua de horchata
      
      Para entrega a: Av. Insurgentes 123, Col. Roma Norte, CDMX
      Voy a pagar con tarjeta de crédito
      Mi WhatsApp es +52 55 1234 5678
    `,
  });

  for await (const chunk of streamCompleto) {
    process.stdout.write(chunk.delta);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  console.log("\n" + "=".repeat(70));

  // Escenario 2: Manejo de errores de servicios externos
  console.log("\n⚠️ Escenario 2: Manejo de errores de servicios externos");
  console.log("-".repeat(60));

  const streamErrores = await agenteHibrido.runStream({
    message: `
      Quiero verificar el stock de tacos de pastor y procesar un pago,
      pero simula que algunos servicios externos no están disponibles.
    `,
  });

  for await (const chunk of streamErrores) {
    process.stdout.write(chunk.delta);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  console.log("\n" + "=".repeat(70));

  // Escenario 3: Optimización con caché
  console.log("\n⚡ Escenario 3: Optimización con caché y rate limiting");
  console.log("-".repeat(60));

  const streamOptimizado = await agenteHibrido.runStream({
    message: `
      Calcula la ruta para 3 entregas diferentes:
      1. Av. Reforma 456, Polanco
      2. Calle Madero 789, Centro Histórico  
      3. Av. Universidad 321, Coyoacán
      
      Usa caché para optimizar las consultas repetidas.
    `,
  });

  for await (const chunk of streamOptimizado) {
    process.stdout.write(chunk.delta);
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
```

## Resultado esperado

```
🔗 DEMO INTEGRACIÓN COMPLETA - SERVICIOS EXTERNOS
======================================================================

🌮 Escenario 1: Pedido completo con integraciones externas
------------------------------------------------------------
¡Hola! Voy a procesar tu pedido completo integrando todos nuestros servicios externos:

🔍 **Paso 1: Verificando rate limits**
✅ Rate limit OK - puedo proceder con las integraciones

📦 **Paso 2: Verificando stock en sistema externo**
🔄 Consultando inventario externo...
✅ Stock verificado:
   • Tacos de pastor: 15 disponibles
   • Quesadillas de queso: 8 disponibles
   • Agua de horchata: 12 disponibles

📍 **Paso 3: Geocodificando tu dirección**
🗺️ Procesando "Av. Insurgentes 123, Col. Roma Norte, CDMX"...
✅ Dirección geocodificada:
   • Ubicación: Avenida Insurgentes Sur 123, Roma Norte, CDMX
   • Coordenadas: 19.4326, -99.1332

🚚 **Paso 4: Calculando ruta de entrega**
🛣️ Calculando desde nuestra taquería...
✅ Ruta calculada:
   • Distancia: 3.2 km
   • Tiempo estimado: 12 minutos
   • Costo de entrega: $25

💰 **Paso 5: Calculando total**
   • 4 tacos de pastor: $60
   • 2 quesadillas de queso: $50
   • 1 agua de horchata: $20
   • Entrega: $25
   • **TOTAL: $155 MXN**

💳 **Paso 6: Procesando pago con Stripe**
🔄 Procesando pago de $155 MXN...
✅ Pago procesado exitosamente:
   • ID de transacción: pi_1234567890
   • Estado: succeeded

📱 **Paso 7: Enviando confirmación por WhatsApp**
📲 Enviando a +52 55 1234 5678...
✅ Confirmación enviada por WhatsApp

🔄 **Paso 8: Sincronizando inventario**
📊 Actualizando stock en sistema externo...
✅ Inventario sincronizado

🎉 **¡Pedido completado exitosamente!**
   • Pedido ID: PED789012345
   • Tiempo estimado de entrega: 35 minutos
   • Recibirás actualizaciones por WhatsApp

======================================================================

⚠️ Escenario 2: Manejo de errores de servicios externos
------------------------------------------------------------
Verificando stock y procesando pago...

📦 **Verificando stock externo**
❌ Sistema de inventario externo no disponible
✅ **Fallback activado**: Usando inventario local
   • Tacos de pastor: 20 disponibles (datos locales)

💳 **Procesando pago**
❌ Error en Stripe: "Rate limit exceeded"
⏳ **Reintentando en 30 segundos...**
✅ Pago procesado en segundo intento

💡 **Resumen**: Algunos servicios tuvieron problemas temporales, pero tu pedido se procesó correctamente usando nuestros sistemas de respaldo.

======================================================================

⚡ Escenario 3: Optimización con caché y rate limiting
------------------------------------------------------------
Calculando rutas para 3 entregas...

🔍 **Verificando rate limits para Google Maps API**
✅ Rate limit OK (2/100 solicitudes por minuto)

📍 **Ruta 1: Av. Reforma 456, Polanco**
🗺️ Geocodificando...
✅ Dirección procesada y guardada en caché (24h)
🛣️ Ruta: 4.1 km, 18 minutos, $30 entrega

📍 **Ruta 2: Calle Madero 789, Centro Histórico**
🗺️ Geocodificando...
✅ Dirección procesada y guardada en caché (24h)
🛣️ Ruta: 2.8 km, 15 minutos, $20 entrega

📍 **Ruta 3: Av. Universidad 321, Coyoacán**
🗺️ Geocodificando...
✅ Dirección procesada y guardada en caché (24h)
🛣️ Ruta: 6.2 km, 25 minutos, $40 entrega

⚡ **Optimizaciones aplicadas**:
   • 3 direcciones guardadas en caché
   • Rate limiting respetado (5/100 solicitudes)
   • Próximas consultas serán instantáneas

📊 **Resumen de entregas**:
   • Total de rutas: 3
   • Distancia total: 13.1 km
   • Tiempo total estimado: 58 minutos
   • Costo total de entregas: $90
```

## ¿Qué acabamos de lograr?

1. **Integración completa** con servicios externos reales
2. **Manejo robusto de errores** con fallbacks automáticos
3. **Optimización inteligente** con caché y rate limiting
4. **Experiencia fluida** a pesar de la complejidad técnica
5. **Sistema híbrido** que combina lo mejor de cada servicio

## Conceptos clave aprendidos

### Arquitectura híbrida

Combinar servicios internos con APIs externas para crear experiencias más ricas.

### Manejo de errores resiliente

Siempre tener un plan B cuando los servicios externos fallan.

### Optimización de performance

Usar caché y rate limiting para mejorar velocidad y confiabilidad.

### Integración transparente

El usuario no necesita saber la complejidad técnica detrás de escena.

## Patrones de integración avanzados

### 1. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailTime > 60000) {
        // 1 minuto
        this.state = "half-open";
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      return fallback();
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    if (this.failures >= 5) {
      this.state = "open";
    }
  }

  private reset() {
    this.failures = 0;
    this.state = "closed";
  }
}
```

### 2. Retry con backoff exponencial

```typescript
const retryConBackoff = tool(
  async ({
    operacion,
    maxReintentos = 3,
    delayInicial = 1000,
  }: {
    operacion: string;
    maxReintentos?: number;
    delayInicial?: number;
  }) => {
    for (let intento = 1; intento <= maxReintentos; intento++) {
      try {
        // Ejecutar operación
        const resultado = await ejecutarOperacion(operacion);
        return { exito: true, resultado, intento };
      } catch (error) {
        if (intento === maxReintentos) {
          return { exito: false, error, intentos: intento };
        }

        // Backoff exponencial: 1s, 2s, 4s, 8s...
        const delay = delayInicial * Math.pow(2, intento - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  },
  {
    name: "retry_con_backoff",
    description: "Reintenta operaciones con backoff exponencial",
  }
);
```

### 3. Agregación de múltiples APIs

```typescript
const consultarMultiplesAPIs = tool(
  async ({ consulta }: { consulta: string }) => {
    const promesas = [
      consultarAPI1(consulta),
      consultarAPI2(consulta),
      consultarAPI3(consulta),
    ];

    // Usar Promise.allSettled para manejar fallos parciales
    const resultados = await Promise.allSettled(promesas);

    const exitosos = resultados
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const fallidos = resultados
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason);

    return {
      exitosos: exitosos.length,
      fallidos: fallidos.length,
      datos: exitosos,
      errores: fallidos,
      mensaje: `${exitosos.length}/${resultados.length} APIs respondieron exitosamente`,
    };
  },
  {
    name: "consultar_multiples_apis",
    description: "Consulta múltiples APIs y agrega los resultados",
  }
);
```

## Lo que viene

En el siguiente capítulo exploraremos **Patrones y Mejores Prácticas**, donde aprenderemos:

- Arquitecturas escalables para workflows complejos
- Patrones de diseño específicos para agentes
- Optimización de performance y recursos
- Debugging y monitoreo de sistemas de agentes
- Casos de uso avanzados y soluciones empresariales

¡Ya tienes un sistema híbrido completo funcionando! 🎉

## Ejercicio práctico

Expande el sistema de integraciones:

### Nivel 1: Básico

1. **Integrar con más APIs** (clima, noticias, redes sociales)
2. **Implementar webhooks** para recibir notificaciones
3. **Crear dashboard de monitoreo** de APIs externas

### Nivel 2: Intermedio

4. **Implementar autenticación OAuth** para servicios que lo requieran
5. **Crear sistema de métricas** para monitorear performance de APIs
6. **Implementar queue system** para procesar integraciones asíncronamente

### Nivel 3: Avanzado

7. **Crear API Gateway** para centralizar todas las integraciones
8. **Implementar sistema de eventos** distribuido con Apache Kafka
9. **Crear orquestador de workflows** para manejar procesos complejos

¿Te animas a construir un ecosistema completo? En el próximo capítulo veremos cómo optimizar y escalar todo lo que hemos construido.
