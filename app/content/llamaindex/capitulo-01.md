# Capítulo 1: ¿Qué son los Agent Workflows?

Imagínate que tienes una taquería y cada día recibes decenas de pedidos por WhatsApp. Tienes que:

1. Leer cada mensaje
2. Entender qué quiere el cliente
3. Verificar si tienes los ingredientes
4. Calcular el precio total
5. Estimar el tiempo de preparación
6. Responder al cliente
7. Actualizar tu inventario

¿Te suena familiar? Es exactamente el tipo de proceso repetitivo que los **Agent Workflows** pueden automatizar completamente.

Pero no solo eso. Los Agent Workflows pueden manejar procesos mucho más complejos: desde gestionar las calificaciones de una escuela hasta coordinar las ventas en un mercado. Son como tener un empleado digital súper eficiente que nunca se cansa y siempre sigue los procedimientos correctos.

## Definición simple

Un **Agent Workflow** en LlamaIndex TypeScript es una función inteligente que puede:

- **Entender** instrucciones complejas usando IA
- **Tomar decisiones** basadas en datos
- **Ejecutar tareas** paso a paso de forma funcional
- **Comunicarse** con sistemas externos
- **Procesar información** en tiempo real con streaming

## El enfoque funcional de LlamaIndex

A diferencia de otros frameworks que usan clases complejas, LlamaIndex TypeScript usa **programación funcional pura**:

### 1. Agentes como funciones

```typescript
import { agent } from "llamaindex";

const saludoAgent = agent({
  tools: [herramientaSaludo],
  systemPrompt: "Eres un asistente amigable de taquería",
});
```

### 2. Streaming en tiempo real

```typescript
const stream = await saludoAgent.runStream({
  message: "Hola, soy María González, cliente frecuente",
});

for await (const chunk of stream) {
  console.log(chunk.delta); // Respuesta en tiempo real
}
```

### 3. Herramientas como funciones puras

```typescript
import { tool } from "llamaindex";

const verificarCliente = tool(
  async ({ nombre }: { nombre: string }) => {
    // Lógica pura sin efectos secundarios
    return clientesDB.find((c) => c.nombre === nombre);
  },
  {
    name: "verificar_cliente",
    description: "Verifica si un cliente existe en la base de datos",
  }
);
```

## Tu primer workflow: Sistema de saludo inteligente

Empecemos con algo súper simple pero poderoso. Un agente que saluda a los clientes de manera personalizada:

```typescript
import { agent, tool } from "llamaindex";

// Base de datos simulada de clientes
const clientesDB = [
  { nombre: "María González", esVIP: true, compras: 15 },
  { nombre: "Carlos López", esVIP: false, compras: 5 },
  { nombre: "Ana García", esVIP: false, compras: 0 },
];

// Herramienta para verificar cliente
const verificarCliente = tool(
  async ({ nombre }: { nombre: string }) => {
    const cliente = clientesDB.find((c) =>
      c.nombre.toLowerCase().includes(nombre.toLowerCase())
    );

    if (!cliente) {
      return { tipo: "nuevo", compras: 0, esVIP: false };
    }

    return {
      tipo:
        cliente.compras >= 10
          ? "vip"
          : cliente.compras > 0
          ? "frecuente"
          : "nuevo",
      compras: cliente.compras,
      esVIP: cliente.esVIP,
    };
  },
  {
    name: "verificar_cliente",
    description: "Verifica el tipo de cliente y su historial de compras",
  }
);

// Herramienta para obtener hora actual
const obtenerHora = tool(
  async () => {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const horaNum = ahora.getHours();
    let saludoTiempo = "";
    if (horaNum < 12) saludoTiempo = "Buenos días";
    else if (horaNum < 18) saludoTiempo = "Buenas tardes";
    else saludoTiempo = "Buenas noches";

    return { hora, saludoTiempo };
  },
  {
    name: "obtener_hora",
    description: "Obtiene la hora actual y el saludo apropiado",
  }
);

// Crear el agente de saludo
const saludoAgent = agent({
  tools: [verificarCliente, obtenerHora],
  systemPrompt: `
    Eres un asistente amigable de la Taquería "El Buen Sabor".
    
    Tu trabajo es saludar a los clientes de manera personalizada:
    
    1. Usa la herramienta verificar_cliente para conocer el tipo de cliente
    2. Usa obtener_hora para saber qué saludo usar según la hora
    3. Personaliza el mensaje según el tipo de cliente:
       - NUEVO: Saludo de bienvenida, ofrece conocer especialidades
       - FRECUENTE: Saludo de agradecimiento, pregunta si quiere "lo de siempre"
       - VIP: Saludo especial, menciona promociones VIP
    
    Siempre sé cálido, usa emojis apropiados y habla de manera amigable.
    Termina preguntando "¿En qué te puedo ayudar?"
  `,
});
```

### Cómo usarlo

```typescript
async function ejemplosSaludo() {
  // Cliente nuevo
  console.log("=== Cliente Nuevo ===");
  const stream1 = await saludoAgent.runStream({
    message: "Hola, soy Ana García",
  });

  for await (const chunk of stream1) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n\n=== Cliente Frecuente ===");
  const stream2 = await saludoAgent.runStream({
    message: "Buenos días, soy Carlos López",
  });

  for await (const chunk of stream2) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n\n=== Cliente VIP ===");
  const stream3 = await saludoAgent.runStream({
    message: "Hola, soy María González",
  });

  for await (const chunk of stream3) {
    process.stdout.write(chunk.delta);
  }
}
```

### Resultado esperado

```
=== Cliente Nuevo ===
¡Buenos días Ana García! 👋 ¡Bienvenida a la Taquería "El Buen Sabor"!

Es un placer atenderte por primera vez. Somos una taquería familiar con más de 20 años sirviendo los mejores tacos de la colonia.

📋 ¿Te gustaría conocer nuestras especialidades? Tenemos tacos de pastor, carnitas, suadero y nuestras famosas quesadillas de flor de calabaza.

Son las 10:30. ¿En qué te puedo ayudar?

=== Cliente Frecuente ===
¡Buenos días Carlos López! 😊 ¡Qué gusto verte de nuevo!

Gracias por tu preferencia, ya eres parte de la familia de "El Buen Sabor".

¿Lo de siempre? ¿O te gustaría probar nuestra especialidad del día?

Son las 10:30. ¿En qué te puedo ayudar?

=== Cliente VIP ===
¡Buenos días María González! 🌟 ¡Qué honor tenerte aquí de nuevo!

Como cliente VIP de la casa, tienes acceso a nuestras promociones especiales. Hoy tenemos 20% de descuento en combos y bebidas gratis con pedidos mayores a $150.

🎁 Además, como siempre, tu pedido tiene prioridad en la preparación.

Son las 10:30. ¿En qué te puedo ayudar?
```

## ¿Qué acabamos de hacer?

1. **Creamos un agente funcional** usando `agent()` sin clases
2. **Definimos herramientas puras** con `tool()` que no tienen efectos secundarios
3. **Usamos streaming en tiempo real** con `runStream()` para respuestas fluidas
4. **Aplicamos lógica de negocio** a través del prompt del sistema
5. **Generamos respuestas contextuales** basadas en datos reales

## La arquitectura funcional

### Flujo de datos funcional

```
Mensaje → Agente → Herramientas → IA → Stream de respuesta
```

### Composición de funciones

- **Agente**: Función principal que orquesta todo
- **Herramientas**: Funciones puras que procesan datos
- **Stream**: Función generadora que produce respuestas en tiempo real

### Sin estado mutable

- No hay clases ni objetos con estado
- Cada función recibe inputs y produce outputs
- Los datos fluyen de manera inmutable

## Beneficios del enfoque funcional

### 🔧 Simplicidad extrema

No hay clases complejas, decoradores raros, o jerarquías confusas. Solo funciones simples y claras.

### 🔄 Composición natural

Puedes combinar agentes y herramientas como bloques de LEGO. Todo se compone de manera natural.

### 🧪 Testing trivial

Las funciones puras son súper fáciles de probar. Mismo input = mismo output, siempre.

### 📈 Escalabilidad real

Agregar funcionalidad es agregar más herramientas. No hay que modificar clases existentes.

### 🛡️ Manejo de errores simple

Los errores se propagan naturalmente a través de las funciones sin complejidad adicional.

### 📊 Streaming nativo

El streaming está integrado desde el diseño. Respuestas en tiempo real sin configuración extra.

### 🔀 Flexibilidad total

Puedes usar el mismo agente para diferentes canales (WhatsApp, web, API) sin cambios.

### ⚡ Performance optimizado

Sin overhead de clases u objetos. Solo funciones ejecutándose eficientemente.

## Casos de uso reales

### 🌮 Sector Alimentario

**Taquería "El Buen Sabor"**

```typescript
const taqueriaAgent = agent({
  tools: [procesarPedido, verificarInventario, calcularPrecio],
  systemPrompt: "Eres el asistente de pedidos de una taquería mexicana...",
});
```

**Restaurante familiar**

```typescript
const restauranteAgent = agent({
  tools: [manejarReservaciones, consultarMenu, aplicarPromociones],
  systemPrompt: "Ayudas a gestionar reservaciones y pedidos...",
});
```

### 🏪 Comercio Local

**Tienda de abarrotes "Doña Carmen"**

```typescript
const tiendaAgent = agent({
  tools: [consultarProductos, calcularEntrega, manejarCredito],
  systemPrompt: "Eres el asistente de una tienda de abarrotes...",
});
```

### 🎓 Sector Educativo

**Escuela Primaria "Benito Juárez"**

```typescript
const escuelaAgent = agent({
  tools: [calcularCalificaciones, generarReportes, enviarAvisos],
  systemPrompt: "Ayudas a gestionar información académica...",
});
```

### 🏥 Servicios de Salud

**Consultorio médico**

```typescript
const consultorioAgent = agent({
  tools: [agendarCitas, enviarRecordatorios, organizarExpedientes],
  systemPrompt: "Asistes en la gestión de un consultorio médico...",
});
```

## Conceptos clave para recordar

### Agent = Función inteligente

Como un empleado digital que puede razonar y tomar decisiones.

### Tool = Función pura

Como una herramienta específica que hace una tarea concreta.

### Stream = Respuesta en tiempo real

Como una conversación fluida donde ves las respuestas conforme se generan.

### Prompt = Instrucciones claras

Como el manual de trabajo que le das a tu empleado digital.

## Lo que viene

En el siguiente capítulo, crearemos tu primer agente realmente complejo: un sistema para procesar pedidos de taquería que incluye:

- Procesamiento de lenguaje natural para entender pedidos
- Validación de inventario en tiempo real
- Cálculo automático de precios y tiempos
- Streaming de confirmaciones
- Integración con WhatsApp (simulada)

¡Prepárate para ver la magia funcional en acción!

## Ejercicio práctico: Mejora el agente

Ahora que entiendes el enfoque funcional, intenta expandir nuestro agente de saludo:

### Nivel 1: Básico

1. **Agregar herramienta de día** que detecte el día de la semana
2. **Crear herramienta de promociones** para lunes y viernes
3. **Implementar herramienta de festivos** que detecte días especiales

### Nivel 2: Intermedio

4. **Crear herramienta de horarios** que verifique si está abierto
5. **Agregar herramienta de clima** (simulada) para promociones especiales
6. **Implementar sistema de puntos** con herramienta de cálculo

### Nivel 3: Avanzado

7. **Integrar base de datos real** (SQLite o JSON)
8. **Crear agentes especializados** (pedidos vs consultas)
9. **Implementar cola de atención** para horarios ocupados

### Pista para empezar

```typescript
const promocionesHoy = tool(
  async () => {
    const hoy = new Date().getDay(); // 0 = domingo, 1 = lunes, etc.

    const promociones = {
      1: "Lunes de tacos: 2x1 en tacos de pastor",
      5: "Viernes de bebidas: 2x1 en aguas frescas",
    };

    return promociones[hoy] || "No hay promociones especiales hoy";
  },
  {
    name: "promociones_hoy",
    description: "Obtiene las promociones activas del día actual",
  }
);
```

### ¿Te sientes listo?

Si lograste crear al menos una herramienta nueva, estás preparado para el siguiente capítulo. Si no, no te preocupes: en el Capítulo 2 construiremos un sistema completo desde cero, paso a paso.

## Reflexión final

Los Agent Workflows funcionales no son solo una herramienta técnica; son una forma elegante y simple de pensar sobre la automatización inteligente. Cada proceso en tu negocio puede convertirse en un agente que:

- **Libera tu tiempo** para tareas más importantes
- **Reduce errores** humanos con lógica consistente
- **Mejora la experiencia** de tus clientes con respuestas inteligentes
- **Escala tu negocio** sin complejidad técnica

En el siguiente capítulo, pondremos estos conceptos en práctica con un ejemplo real y completo que podrás usar inmediatamente en tu propio negocio.
