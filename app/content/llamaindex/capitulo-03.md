# Capítulo 3: Herramientas Avanzadas y Coordinación

En el capítulo anterior creamos un agente simple para una taquería. Ahora vamos a llevarlo al siguiente nivel: **herramientas más sofisticadas y coordinación entre múltiples agentes especializados**.

Imagínate que la Taquería Doña Carmen ha crecido tanto que ahora necesita:

- Un agente para **pedidos** (lo que ya tenemos)
- Un agente para **inventario y proveedores**
- Un agente para **atención al cliente y quejas**
- Un agente **coordinador** que los organice a todos

¡Vamos a construir este sistema completo!

## El problema que vamos a resolver

La taquería ahora recibe diferentes tipos de mensajes:

- **Pedidos**: "Quiero 3 tacos de pastor"
- **Consultas de inventario**: "¿Tienen tacos de barbacoa?"
- **Quejas**: "Mi pedido llegó frío"
- **Información general**: "¿A qué hora abren?"

Necesitamos un sistema que:

1. **Clasifique** automáticamente el tipo de mensaje
2. **Derive** al agente especializado correcto
3. **Coordine** la respuesta entre múltiples agentes si es necesario
4. **Mantenga contexto** de conversaciones largas

## Herramientas avanzadas

Primero, vamos a crear herramientas más sofisticadas que pueden manejar datos complejos y tomar decisiones inteligentes.

### Herramienta de clasificación inteligente

```typescript
import { agent, tool } from "llamaindex";

// Herramienta que clasifica el tipo de mensaje
const clasificarMensaje = tool(
  async ({ mensaje }: { mensaje: string }) => {
    const texto = mensaje.toLowerCase();

    // Palabras clave para cada categoría
    const patrones = {
      pedido: [
        "quiero",
        "necesito",
        "me das",
        "pido",
        "orden",
        "llevar",
        "tacos",
        "quesadillas",
        "tortas",
        "bebidas",
      ],
      inventario: [
        "tienen",
        "hay",
        "disponible",
        "stock",
        "existe",
        "qué tienen",
        "qué hay",
        "menú",
        "carta",
      ],
      queja: [
        "problema",
        "queja",
        "mal",
        "frío",
        "tardó",
        "error",
        "equivocaron",
        "reclamo",
        "devolver",
        "reembolso",
      ],
      informacion: [
        "horario",
        "abren",
        "cierran",
        "ubicación",
        "dirección",
        "teléfono",
        "dónde",
        "cuándo",
        "cómo llegar",
      ],
      saludo: [
        "hola",
        "buenos días",
        "buenas tardes",
        "buenas noches",
        "saludos",
        "qué tal",
      ],
    };

    // Calcular puntuación para cada categoría
    const puntuaciones = {};

    for (const [categoria, palabras] of Object.entries(patrones)) {
      let puntuacion = 0;
      for (const palabra of palabras) {
        if (texto.includes(palabra)) {
          puntuacion += 1;
        }
      }
      puntuaciones[categoria] = puntuacion;
    }

    // Encontrar la categoría con mayor puntuación
    const categoriaDetectada = Object.entries(puntuaciones).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0][0];

    // Si no hay puntuación clara, es consulta general
    const puntuacionMaxima = Math.max(
      ...(Object.values(puntuaciones) as number[])
    );
    const categoria = puntuacionMaxima > 0 ? categoriaDetectada : "informacion";

    return {
      categoria,
      confianza: puntuacionMaxima / 10, // Normalizar a 0-1
      mensaje: `Mensaje clasificado como: ${categoria} (confianza: ${Math.round(
        puntuacionMaxima * 10
      )}%)`,
    };
  },
  {
    name: "clasificar_mensaje",
    description:
      "Clasifica un mensaje en categorías: pedido, inventario, queja, informacion, saludo",
  }
);
```

### Herramienta de gestión de contexto

```typescript
// Base de datos simulada de conversaciones
const conversaciones = new Map<
  string,
  Array<{
    timestamp: number;
    tipo: string;
    mensaje: string;
    respuesta?: string;
  }>
>();

const gestionarContexto = tool(
  async ({
    clienteId,
    mensaje,
    tipo,
    respuesta,
  }: {
    clienteId: string;
    mensaje: string;
    tipo: string;
    respuesta?: string;
  }) => {
    // Obtener historial existente
    const historial = conversaciones.get(clienteId) || [];

    // Agregar nueva interacción
    const nuevaInteraccion = {
      timestamp: Date.now(),
      tipo,
      mensaje,
      respuesta,
    };

    historial.push(nuevaInteraccion);
    conversaciones.set(clienteId, historial);

    // Analizar patrones del cliente
    const tiposRecientes = historial
      .slice(-5) // Últimas 5 interacciones
      .map((h) => h.tipo);

    const esClienteFrecuente = historial.length > 3;
    const tieneQuejasPrevias = historial.some((h) => h.tipo === "queja");
    const ultimaInteraccion = historial[historial.length - 2]; // Anterior a la actual

    return {
      historialLength: historial.length,
      esClienteFrecuente,
      tieneQuejasPrevias,
      tiposRecientes,
      ultimaInteraccion,
      contexto: `Cliente ${esClienteFrecuente ? "frecuente" : "nuevo"} con ${
        historial.length
      } interacciones`,
    };
  },
  {
    name: "gestionar_contexto",
    description:
      "Gestiona el historial y contexto de conversaciones con clientes",
  }
);
```

### Herramienta de coordinación entre agentes

```typescript
const coordinarAgentes = tool(
  async ({
    categoria,
    mensaje,
    contexto,
  }: {
    categoria: string;
    mensaje: string;
    contexto: any;
  }) => {
    const estrategias = {
      pedido: {
        agentePrincipal: "pedidos",
        agentesApoyo: ["inventario"],
        prioridad: "alta",
        tiempoRespuesta: "inmediato",
      },
      inventario: {
        agentePrincipal: "inventario",
        agentesApoyo: [],
        prioridad: "media",
        tiempoRespuesta: "rapido",
      },
      queja: {
        agentePrincipal: "atencion_cliente",
        agentesApoyo: ["pedidos", "inventario"],
        prioridad: "muy_alta",
        tiempoRespuesta: "inmediato",
      },
      informacion: {
        agentePrincipal: "informacion",
        agentesApoyo: [],
        prioridad: "baja",
        tiempoRespuesta: "normal",
      },
      saludo: {
        agentePrincipal: "general",
        agentesApoyo: [],
        prioridad: "media",
        tiempoRespuesta: "rapido",
      },
    };

    const estrategia = estrategias[categoria] || estrategias.informacion;

    // Ajustar estrategia basada en contexto
    if (contexto.tieneQuejasPrevias && categoria === "pedido") {
      estrategia.prioridad = "muy_alta";
      estrategia.agentesApoyo.push("atencion_cliente");
    }

    if (contexto.esClienteFrecuente) {
      estrategia.prioridad =
        estrategia.prioridad === "baja" ? "media" : estrategia.prioridad;
    }

    return {
      ...estrategia,
      instruccionesEspeciales: contexto.tieneQuejasPrevias
        ? "Tratar con especial cuidado - cliente con quejas previas"
        : contexto.esClienteFrecuente
        ? "Cliente frecuente - dar trato preferencial"
        : "Cliente estándar",
    };
  },
  {
    name: "coordinar_agentes",
    description:
      "Determina qué agentes usar y cómo coordinarlos según el tipo de mensaje y contexto",
  }
);
```

## Agentes especializados

Ahora vamos a crear agentes especializados para cada tipo de tarea:

### Agente de Pedidos (mejorado)

```typescript
// Reutilizamos las herramientas del capítulo anterior
import {
  procesarPedido,
  verificarInventario,
  calcularPrecio,
  actualizarInventario,
} from "./capitulo-02";

const agentePedidos = agent({
  tools: [
    procesarPedido,
    verificarInventario,
    calcularPrecio,
    actualizarInventario,
  ],
  systemPrompt: `
    Eres el especialista en pedidos de Taquería Doña Carmen.
    
    Tu única responsabilidad es procesar pedidos de comida de manera eficiente:
    
    1. Procesa el pedido usando las herramientas disponibles
    2. Verifica inventario y ofrece alternativas si algo no está disponible
    3. Calcula precios con descuentos aplicables
    4. Presenta un resumen claro y atractivo
    5. Confirma antes de actualizar inventario
    
    IMPORTANTE:
    - Sé eficiente pero amigable
    - Siempre ofrece alternativas si algo no está disponible
    - Menciona promociones cuando apliquen
    - Confirma el pedido antes de procesar
    
    Si el cliente pregunta algo que no sea sobre pedidos, responde:
    "Para esa consulta, déjame conectarte con mi compañero especialista"
  `,
});
```

### Agente de Inventario

```typescript
const consultarInventarioDetallado = tool(
  async ({ consulta }: { consulta: string }) => {
    const texto = consulta.toLowerCase();

    // Información detallada del menú
    const menuCompleto = {
      tacos: {
        disponibles: ["pastor", "carnitas", "suadero", "chorizo"],
        noDisponibles: ["barbacoa", "cochinita"],
        precios: { pastor: 15, carnitas: 15, suadero: 16, chorizo: 14 },
      },
      quesadillas: {
        disponibles: ["queso", "flor de calabaza"],
        noDisponibles: ["huitlacoche", "champiñones"],
        precios: { queso: 25, "flor de calabaza": 30 },
      },
      bebidas: {
        disponibles: ["horchata", "jamaica", "coca cola"],
        noDisponibles: ["tamarindo", "limón"],
        precios: { horchata: 20, jamaica: 18, "coca cola": 25 },
      },
    };

    // Buscar en el menú
    let resultados = [];

    for (const [categoria, info] of Object.entries(menuCompleto)) {
      if (texto.includes(categoria.slice(0, -1))) {
        // quitar 's' final
        resultados.push({
          categoria,
          disponibles: info.disponibles,
          noDisponibles: info.noDisponibles,
          precios: info.precios,
        });
      } else {
        // Buscar productos específicos
        for (const producto of [...info.disponibles, ...info.noDisponibles]) {
          if (texto.includes(producto)) {
            resultados.push({
              producto,
              disponible: info.disponibles.includes(producto),
              precio: info.precios[producto] || "No disponible",
              categoria,
            });
          }
        }
      }
    }

    return {
      resultados,
      mensaje:
        resultados.length > 0
          ? `Encontré información sobre ${resultados.length} productos`
          : "No encontré información específica, pero puedo ayudarte con nuestro menú completo",
    };
  },
  {
    name: "consultar_inventario_detallado",
    description:
      "Consulta información detallada sobre disponibilidad, precios y productos del menú",
  }
);

const agenteInventario = agent({
  tools: [consultarInventarioDetallado],
  systemPrompt: `
    Eres el especialista en inventario y menú de Taquería Doña Carmen.
    
    Tu responsabilidad es proporcionar información precisa sobre:
    - Qué productos tenemos disponibles
    - Precios actuales
    - Alternativas cuando algo no esté disponible
    - Recomendaciones basadas en disponibilidad
    
    IMPORTANTE:
    - Sé específico con precios y disponibilidad
    - Siempre sugiere alternativas si algo no está disponible
    - Menciona productos populares o recomendados
    - Si te preguntan sobre pedidos, deriva al especialista en pedidos
    
    Ejemplo de respuesta:
    "Tenemos tacos de pastor ($15), carnitas ($15) y suadero ($16) disponibles.
    Lamentablemente no tenemos barbacoa hoy, pero te recomiendo el suadero que está delicioso."
  `,
});
```

### Agente de Atención al Cliente

```typescript
const gestionarQueja = tool(
  async ({
    tipoQueja,
    descripcion,
    clienteId,
  }: {
    tipoQueja: string;
    descripcion: string;
    clienteId: string;
  }) => {
    const solucionesPorTipo = {
      comida_fria: {
        solucion: "Reemplazo gratuito + bebida de cortesía",
        compensacion: "Descuento 20% próximo pedido",
        tiempoResolucion: "15 minutos",
      },
      pedido_incorrecto: {
        solucion: "Corrección inmediata del pedido",
        compensacion: "Descuento 15% próximo pedido",
        tiempoResolucion: "10 minutos",
      },
      demora_entrega: {
        solucion: "Descuento en pedido actual",
        compensacion: "Entrega gratuita próximo pedido",
        tiempoResolucion: "Inmediato",
      },
      mala_atencion: {
        solucion: "Disculpa personal del gerente",
        compensacion: "Combo gratuito próxima visita",
        tiempoResolucion: "5 minutos",
      },
    };

    const solucion = solucionesPorTipo[tipoQueja] || {
      solucion: "Revisión personalizada del caso",
      compensacion: "Compensación a determinar",
      tiempoResolucion: "24 horas",
    };

    // Registrar la queja
    const ticketId = `Q${Date.now()}`;

    return {
      ticketId,
      ...solucion,
      mensaje: `Queja registrada con ID: ${ticketId}. Procederemos con: ${solucion.solucion}`,
    };
  },
  {
    name: "gestionar_queja",
    description: "Gestiona quejas de clientes y propone soluciones apropiadas",
  }
);

const agenteAtencionCliente = agent({
  tools: [gestionarQueja],
  systemPrompt: `
    Eres el especialista en atención al cliente de Taquería Doña Carmen.
    
    Tu misión es resolver problemas y mantener clientes satisfechos:
    
    1. Escucha activamente la queja o problema
    2. Muestra empatía y comprensión
    3. Usa la herramienta para gestionar la queja apropiadamente
    4. Ofrece soluciones concretas e inmediatas
    5. Asegúrate de que el cliente se sienta valorado
    
    IMPORTANTE:
    - Siempre pide disculpas primero, sin importar la situación
    - Sé empático: "Entiendo tu frustración..."
    - Ofrece soluciones concretas, no solo palabras
    - Haz seguimiento: "¿Esto resuelve tu problema?"
    - Convierte la experiencia negativa en positiva
    
    Ejemplo de respuesta:
    "Lamento mucho que tu pedido haya llegado frío. Eso no es la experiencia que queremos darte.
    Voy a enviarte un reemplazo caliente inmediatamente y una bebida de cortesía.
    Además, tendrás 20% de descuento en tu próximo pedido. ¿Te parece bien esta solución?"
  `,
});
```

## Agente Coordinador Principal

Ahora creamos el agente que coordina todo el sistema:

```typescript
const agenteCoordinador = agent({
  tools: [clasificarMensaje, gestionarContexto, coordinarAgentes],
  systemPrompt: `
    Eres el coordinador principal de Taquería Doña Carmen.
    
    Tu trabajo es:
    1. Clasificar cada mensaje que llega
    2. Gestionar el contexto del cliente
    3. Coordinar con el agente especializado apropiado
    4. Asegurar una experiencia fluida
    
    PROCESO:
    1. Usa clasificar_mensaje para entender el tipo de consulta
    2. Usa gestionar_contexto para obtener historial del cliente
    3. Usa coordinar_agentes para determinar la estrategia
    4. Deriva al agente especializado con contexto completo
    
    IMPORTANTE:
    - Siempre saluda cálidamente
    - Reconoce si es cliente frecuente
    - Deriva rápidamente al especialista correcto
    - No intentes resolver consultas especializadas tú mismo
    
    Ejemplo:
    "¡Hola! Bienvenido a Taquería Doña Carmen 🌮
    Veo que quieres hacer un pedido. Te conecto con nuestro especialista en pedidos
    que te ayudará inmediatamente."
  `,
});
```

## Sistema completo en acción

Ahora vamos a crear una función que simule el sistema completo:

```typescript
async function sistemaCompleto() {
  console.log("🌮 SISTEMA COMPLETO - TAQUERÍA DOÑA CARMEN");
  console.log("=".repeat(60));

  // Simular diferentes tipos de mensajes
  const mensajes = [
    {
      cliente: "maria_123",
      mensaje: "Hola, quiero 3 tacos de pastor y 2 quesadillas",
      tipo: "pedido",
    },
    {
      cliente: "carlos_456",
      mensaje: "¿Tienen tacos de barbacoa disponibles?",
      tipo: "inventario",
    },
    {
      cliente: "ana_789",
      mensaje: "Mi pedido llegó frío y tardó mucho",
      tipo: "queja",
    },
    {
      cliente: "luis_012",
      mensaje: "¿A qué hora abren los domingos?",
      tipo: "informacion",
    },
  ];

  for (const { cliente, mensaje, tipo } of mensajes) {
    console.log(`\n📱 Cliente ${cliente}: "${mensaje}"`);
    console.log("-".repeat(40));

    // 1. Coordinador clasifica y deriva
    console.log("🎯 Coordinador analizando...");
    const streamCoordinador = await agenteCoordinador.runStream({
      message: `Cliente: ${cliente}, Mensaje: ${mensaje}`,
    });

    for await (const chunk of streamCoordinador) {
      process.stdout.write(chunk.delta);
    }

    console.log("\n");

    // 2. Agente especializado responde
    let agenteEspecializado;
    switch (tipo) {
      case "pedido":
        agenteEspecializado = agentePedidos;
        console.log("🍽️ Especialista en pedidos respondiendo...");
        break;
      case "inventario":
        agenteEspecializado = agenteInventario;
        console.log("📦 Especialista en inventario respondiendo...");
        break;
      case "queja":
        agenteEspecializado = agenteAtencionCliente;
        console.log("🤝 Especialista en atención al cliente respondiendo...");
        break;
      default:
        console.log("ℹ️ Información general...");
        continue;
    }

    if (agenteEspecializado) {
      const streamEspecialista = await agenteEspecializado.runStream({
        message: mensaje,
      });

      for await (const chunk of streamEspecialista) {
        process.stdout.write(chunk.delta);
      }
    }

    console.log("\n" + "=".repeat(60));
  }
}

// Ejecutar el sistema completo
sistemaCompleto().catch(console.error);
```

## Resultado esperado

```
🌮 SISTEMA COMPLETO - TAQUERÍA DOÑA CARMEN
============================================================

📱 Cliente maria_123: "Hola, quiero 3 tacos de pastor y 2 quesadillas"
----------------------------------------
🎯 Coordinador analizando...
¡Hola! Bienvenido a Taquería Doña Carmen 🌮

Veo que quieres hacer un pedido. Te conecto inmediatamente con nuestro especialista en pedidos que te ayudará con todo lo que necesitas.

🍽️ Especialista en pedidos respondiendo...
¡Perfecto! Quieres 3 tacos de pastor y 2 quesadillas de queso.

✅ Todos los productos están disponibles:
• 3 tacos de pastor - $45
• 2 quesadillas de queso - $50

💰 Total: $95 pesos
⏱️ Tiempo estimado: 15 minutos

¿Confirmas tu pedido?

============================================================

📱 Cliente carlos_456: "¿Tienen tacos de barbacoa disponibles?"
----------------------------------------
🎯 Coordinador analizando...
¡Hola! Veo que quieres consultar sobre nuestro inventario. Te conecto con nuestro especialista que te dará información precisa sobre disponibilidad.

📦 Especialista en inventario respondiendo...
Lamentablemente no tenemos tacos de barbacoa disponibles hoy.

Pero tenemos otras opciones deliciosas:
• Tacos de pastor - $15
• Tacos de carnitas - $15
• Tacos de suadero - $16
• Tacos de chorizo - $14

Te recomiendo especialmente el suadero, está muy sabroso hoy. ¿Te interesa alguna de estas opciones?

============================================================
```

## ¿Qué acabamos de lograr?

1. **Sistema de clasificación inteligente**: Identifica automáticamente el tipo de consulta
2. **Agentes especializados**: Cada uno experto en su área específica
3. **Coordinación fluida**: El coordinador deriva al especialista correcto
4. **Gestión de contexto**: Recuerda interacciones previas del cliente
5. **Experiencia personalizada**: Trato diferenciado según historial del cliente

## Conceptos clave aprendidos

### Especialización de agentes

Cada agente se enfoca en una tarea específica, haciéndolo más efectivo.

### Coordinación inteligente

Un agente coordinador toma decisiones sobre qué especialista usar.

### Herramientas sofisticadas

Las herramientas pueden tomar decisiones complejas y manejar datos estructurados.

### Contexto persistente

El sistema recuerda interacciones previas para personalizar la experiencia.

### Composición escalable

Puedes agregar nuevos agentes especializados sin afectar el sistema existente.

## Lo que viene

En el siguiente capítulo exploraremos **Workflows con Múltiples Steps**, donde aprenderemos:

- Cómo crear secuencias complejas de operaciones
- Manejo de dependencias entre tareas
- Paralelización de operaciones independientes
- Manejo de errores en workflows complejos

¡Ya tienes un sistema multi-agente funcionando! 🎉

## Ejercicio práctico

Expande el sistema agregando:

### Nivel 1: Básico

1. **Agente de promociones** que maneje descuentos y ofertas especiales
2. **Herramienta de horarios** que verifique si la taquería está abierta
3. **Sistema de notificaciones** para avisar cuando el pedido esté listo

### Nivel 2: Intermedio

4. **Agente de delivery** que calcule rutas y tiempos de entrega
5. **Sistema de puntos** de lealtad con agente especializado
6. **Agente de análisis** que genere reportes de ventas

### Nivel 3: Avanzado

7. **Integración con WhatsApp Business API** real
8. **Base de datos persistente** para clientes y pedidos
9. **Dashboard en tiempo real** para monitorear el sistema

¿Te animas a expandir el sistema? En el próximo capítulo veremos cómo manejar workflows aún más complejos.
