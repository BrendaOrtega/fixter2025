# Capítulo 4: Workflows Complejos con Múltiples Agentes

En los capítulos anteriores creamos agentes individuales y aprendimos a coordinarlos. Ahora vamos a construir **workflows complejos** que manejan procesos de negocio completos con múltiples pasos, validaciones, y flujos condicionales.

Imagínate que la Taquería Doña Carmen quiere implementar un sistema completo de **pedidos a domicilio** que incluya:

- Validación de zona de entrega
- Cálculo de costo de envío
- Asignación de repartidor
- Seguimiento en tiempo real
- Confirmación de entrega
- Sistema de calificaciones

¡Vamos a construir este sistema paso a paso!

## El problema complejo que vamos a resolver

Un pedido a domicilio requiere muchos pasos coordinados:

```
1. Recibir pedido → 2. Validar zona → 3. Calcular envío → 4. Confirmar disponibilidad
     ↓
5. Asignar repartidor → 6. Preparar comida → 7. Enviar seguimiento → 8. Confirmar entrega
```

Cada paso puede fallar o requerir validaciones adicionales. Necesitamos un sistema robusto que maneje todas estas complejidades.

## Diseñando el workflow complejo

### Herramientas base para delivery

```typescript
import { agent, tool } from "llamaindex";

// Base de datos simulada de zonas de entrega
const zonasEntrega = {
  centro: { disponible: true, costo: 25, tiempoExtra: 10 },
  norte: { disponible: true, costo: 35, tiempoExtra: 15 },
  sur: { disponible: true, costo: 30, tiempoExtra: 12 },
  oriente: { disponible: false, costo: 0, tiempoExtra: 0 },
  poniente: { disponible: true, costo: 40, tiempoExtra: 20 },
};

// Repartidores disponibles
let repartidores = [
  {
    id: "REP001",
    nombre: "Miguel",
    disponible: true,
    zona: "centro",
    pedidosActivos: 0,
  },
  {
    id: "REP002",
    nombre: "Carlos",
    disponible: true,
    zona: "norte",
    pedidosActivos: 1,
  },
  {
    id: "REP003",
    nombre: "Ana",
    disponible: true,
    zona: "sur",
    pedidosActivos: 0,
  },
  {
    id: "REP004",
    nombre: "Luis",
    disponible: false,
    zona: "poniente",
    pedidosActivos: 2,
  },
];

// Herramienta para validar zona de entrega
const validarZonaEntrega = tool(
  async ({ direccion }: { direccion: string }) => {
    const texto = direccion.toLowerCase();

    // Detectar zona basada en palabras clave
    let zonaDetectada = 'desconocida';

    if (texto.includes('centro') || texto.includes('zócalo') || texto.includes('catedral')) {
      zonaDetectada = 'centro';
    } else if (texto.includes('norte') || texto.includes('satelite') || texto.includes('lindavista')) {
      zonaDetectada = 'norte';
    } else if (texto.includes('sur') || texto.includes('coyoacán') || texto.includes('xochimilco')) {
      zonaDetectada = 'sur';
    } else if (texto.includes('oriente') || texto.includes('iztapalapa') || texto.includes('nezahualcóyotl')) {
      zonaDetectada = 'oriente';
    } else if (texto.includes('poniente') || texto.includes('santa fe') || texto.includes('polanco')) {
      zonaDetectada = 'poniente';
    }

    const infoZona = zonasEntrega[zonaDetectada] || { disponible: false, costo: 0, tiempoExtra: 0 };

    return {
      zona: zonaDetectada,
      disponible: infoZona.disponible,
      costoEnvio: infoZona.costo,
      tiempoExtra: infoZona.tiempoExtra,
      mensaje: infoZona.disponible
        ? `Entregamos en ${zonaDetectada}. Costo: $${infoZona.costo}, tiempo extra: ${infoZona.tiempoExtra} min`
        : `Lo siento, no entregamos en ${zonaDetectada} por el momento`
    };
  },
  {
    name: "validar_zona_entrega",
    description: "Valida si entregamos en una zona específica y calcula costo de envío"
  }
);

// Herramienta para asignar repartidor
const asignarRepartidor = tool(
  async ({ zona, prioridad }: { zona: string; prioridad: 'normal' | 'alta' | 'urgente' }) => {
    // Filtrar repartidores disponibles en la zona
    const candidatos = repartidores.filter(r =>
      r.disponible &&
      (r.zona === zona || r.pedidosActivos === 0) // Puede ir a cualquier zona si no tiene pedidos
    );

    if (candidatos.length === 0) {
      return {
        asignado: false,
        mensaje: 'No hay repartidores disponibles en este momento',
        tiempoEspera: 30 // minutos
      };
    }

    // Seleccionar el mejor repartidor
    const mejorRepartidor = candidatos.sort((a, b) => {
      // Priorizar por menos pedidos activos, luego por zona correcta
      if (a.pedidosActivos !== b.pedidosActivos) {
        return a.pedidosActivos - b.pedidosActivos;
      }
      return a.zona === zona ? -1 : 1;
    })[0];

    // Asignar el pedido
    mejorRepartidor.pedidosActivos += 1;
    if (mejorRepartidor.pedidosActivos >= 2) {
      mejorRepartidor.disponible = false;
    }

    return {
      asignado: true,
      repartidor: mejorRepartidor.nombre,
      id: mejorRepartidor.id,
      tiempoEstimado: zona === mejorRepartidor.zona ? 5 : 10, // minutos extra para llegar
      mensaje: `Repartidor ${mejorRepartidor.nombre} asignado para zona ${zona}`
    };
  },
  {
    name: "asignar_repartidor",
    description: "Asigna el mejor repartidor disponible según zona y prioridad"
  }
);

// Herramienta para generar seguimiento
const generarSeguimiento = tool(
  async ({
    pedidoId,
    tiempoPreparacion,
    tiempoEntrega,
    repartidor
  }: {
    pedidoId: string;
    tiempoPreparacion: number;
    tiempoEntrega: number;
    repartidor: string;
  }) => {

    const ahora = new Date();
    const tiempoTotal = tiempoPreparacion + tiempoEntrega;
    const horaEstimada = new Date(ahora.getTime() + tiempoTotal * 60000);

    const seguimiento = {
      pedidoId,
      estado: 'confirmado',
      tiempoEstimado: tiempoTotal,
      horaEstimada: horaEstimada.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      repartidor,
      pasos: [
        { paso: 'Pedido confirmado', completado: true, tiempo: 0 },
        { paso: 'Preparando comida', completado: false, tiempo: tiempoPreparacion },
        { paso: 'En camino', completado: false, tiempo: tiempoPreparacion + 5 },
        { paso: 'Entregado', completado: false, tiempo: tiempoTotal }
      ]
    };

    return {
      seguimiento,
      linkSeguimiento: `https://taqueria.com/seguimiento/${pedidoId}`,
      mensaje: `Tu pedido ${pedidoId} llegará aproximadamente a las ${seguimiento.horaEstimada}`
    };
  },
  {
    name: "generar_seguimiento",
    description: "Genera información de seguimiento en tiempo real para el pedido"
  }
);
```

## Agente de Delivery Completo

Ahora vamos a crear el agente que maneja todo el proceso de delivery:

```typescript
// Importar herramientas de capítulos anteriores
import { procesarPedido, verificarInventario, calcularPrecio } from './capitulo-02';

const agenteDelivery = agent({
  tools: [
    procesarPedido,
    verificarInventario,
    calcularPrecio,
    validarZonaEntrega,
    asignarRepartidor,
    generarSeguimiento
  ],
  systemPrompt: `
    Eres el especialista en entregas a domicilio de Taquería Doña Carmen.

    Tu proceso COMPLETO para pedidos a domicilio:

    1. SALUDA y confirma que es pedido a domicilio
    2. USA procesar_pedido para entender qué quiere
    3. USA verificar_inventario para confirmar disponibilidad
    4. PIDE la dirección de entrega
    5. USA validar_zona_entrega para verificar si entregamos ahí
    6. USA calcular_precio para obtener subtotal
    7. AGREGA el costo de envío al total
    8. PRESENTA resumen completo (comida + envío)
    9. Si confirma, USA asignar_repartidor
    10. USA generar_seguimiento para dar información de tracking
    11. PROPORCIONA link de seguimiento y tiempo estimado

    IMPORTANTE:
    - Siempre pide la dirección DESPUÉS de confirmar disponibilidad
    - Explica claramente los costos de envío
    - Si no entregamos en la zona, sugiere recoger en local
    - Proporciona información de seguimiento detallada
    - Sé transparente sobre tiempos de entrega

    FLUJO DE CONVERSACIÓN:
    "¡Hola! ¿Es para entrega a domicilio? Perfecto.
    [procesar pedido]
    [verificar inventario]
    ¿Cuál es tu dirección de entrega?
    [validar zona]
    [calcular precios]
    Tu pedido sería: [resumen] + envío $X = Total $Y
    ¿Confirmas?
    [asignar repartidor]
    [generar seguimiento]
    ¡Listo! Tu pedido llegará a las X:XX"
  `
});
```

## Workflow complejo en acción

Vamos a probar el sistema completo con diferentes escenarios:

```typescript
async function probarWorkflowComplejo() {
  console.log("🚚 SISTEMA DE DELIVERY - TAQUERÍA DOÑA CARMEN");
  console.log("=".repeat(60));

  // Escenario 1: Pedido exitoso
  console.log("\n📱 Escenario 1: Pedido a domicilio exitoso");
  console.log("-".repeat(40));

  const stream1 = await agenteDelivery.runStream({
    message: `Hola, quiero pedir a domicilio: 4 tacos de pastor, 2 quesadillas de queso y un agua de horchata. 
              Mi dirección es Av. Insurgentes 123, Colonia Centro`,
  });

  for await (const chunk of stream1) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n" + "=".repeat(60));

  // Escenario 2: Zona no disponible
  console.log("\n📱 Escenario 2: Zona no disponible para entrega");
  console.log("-".repeat(40));

  const stream2 = await agenteDelivery.runStream({
    message: `Buenos días, quiero 3 tacos de carnitas para entrega. 
              Vivo en Av. Oriente 456, Colonia Iztapalapa`,
  });

  for await (const chunk of stream2) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n" + "=".repeat(60));

  // Escenario 3: Sin repartidores disponibles
  console.log("\n📱 Escenario 3: Sin repartidores disponibles");
  console.log("-".repeat(40));

  // Simular que todos los repartidores están ocupados
  repartidores.forEach((r) => (r.disponible = false));

  const stream3 = await agenteDelivery.runStream({
    message: `Quiero 2 tacos de suadero para entrega a Colonia Norte, Calle Reforma 789`,
  });

  for await (const chunk of stream3) {
    process.stdout.write(chunk.delta);
  }
}
```

## Resultado esperado del workflow

```
🚚 SISTEMA DE DELIVERY - TAQUERÍA DOÑA CARMEN
============================================================

📱 Escenario 1: Pedido a domicilio exitoso
----------------------------------------
¡Hola! Veo que quieres pedir a domicilio. ¡Perfecto! 🚚

Tu pedido:
• 4 tacos de pastor - $60
• 2 quesadillas de queso - $50
• 1 agua de horchata - $20

✅ Todos los productos están disponibles.

Veo que tu dirección es en Colonia Centro. ¡Excelente! Sí entregamos ahí.

💰 Resumen de tu pedido:
Subtotal comida: $130
Costo de envío: $25
TOTAL: $155 pesos

⏱️ Tiempo estimado: 35 minutos (25 min preparación + 10 min entrega)

¿Confirmas tu pedido?

✅ ¡Pedido confirmado!

🚚 Repartidor Miguel asignado para tu entrega
📱 Link de seguimiento: https://taqueria.com/seguimiento/PED1234567890
🕐 Tu pedido llegará aproximadamente a las 15:35

¡Gracias por tu preferencia! Te mantendremos informado del progreso.

============================================================

📱 Escenario 2: Zona no disponible para entrega
----------------------------------------
¡Hola! Quieres 3 tacos de carnitas, ¡excelente elección! 🌮

✅ Los tacos de carnitas están disponibles - $45 total

Revisando tu dirección en Iztapalapa...

❌ Lo siento, actualmente no entregamos en esa zona.

Pero tienes estas opciones:
🏪 Puedes recoger en nuestro local (sin costo extra)
📍 Ubicación: Calle Principal 123, Centro
🕐 Horario: 9:00 AM - 9:00 PM

¿Te gustaría cambiar a pedido para recoger?

============================================================

📱 Escenario 3: Sin repartidores disponibles
----------------------------------------
¡Hola! Quieres 2 tacos de suadero, ¡excelente elección! 🌮

✅ Los tacos de suadero están disponibles - $30 total

Verificando tu dirección en Colonia Norte...
✅ Sí entregamos en esa zona - Costo de envío: $35

💰 Resumen:
Subtotal comida: $30
Costo de envío: $35
TOTAL: $65 pesos

⚠️ Lo siento, en este momento no tenemos repartidores disponibles.

Pero tienes estas opciones:
⏰ Podemos programar tu entrega para dentro de 30 minutos
🏪 Puedes recoger en nuestro local (sin costo de envío)
📞 Te avisamos cuando haya repartidores disponibles

¿Cuál opción prefieres?

============================================================
```

## Ejecuta el código

Para probar este sistema completo, guarda el código en un archivo llamado `delivery-workflow.ts` y ejecuta:

```bash
npx tsx delivery-workflow.ts
```

Asegúrate de tener instaladas las dependencias:

```bash
npm install llamaindex @ai-sdk/openai
```

También necesitarás configurar tu API key de OpenAI:

```bash
export OPENAI_API_KEY="tu-api-key-aqui"
```

## Conceptos clave de workflows complejos

### 1. Coordinación de herramientas múltiples

En este capítulo integramos **6 herramientas diferentes** que trabajan en secuencia:

- `procesarPedido` → Comprende la intención del cliente
- `verificarInventario` → Valida disponibilidad
- `validarZonaEntrega` → Verifica cobertura geográfica
- `calcularPrecio` → Calcula costos totales
- `asignarRepartidor` → Gestiona recursos humanos
- `generarSeguimiento` → Crea tracking en tiempo real

### 2. Manejo de estados complejos

El workflow mantiene estado a través de:

- **Variables globales** para repartidores y zonas
- **Datos persistentes** en cada herramienta
- **Flujo condicional** basado en disponibilidad

### 3. Validaciones en cascada

Cada paso valida el anterior antes de continuar:

```
Pedido válido → Inventario disponible → Zona cubierta → Repartidor libre → Seguimiento activo
```

### 4. Experiencia de usuario inteligente

El agente maneja **3 escenarios** automáticamente:

- ✅ **Éxito completo**: Pedido procesado sin problemas
- ⚠️ **Zona no disponible**: Ofrece alternativas automáticamente
- 🚫 **Sin repartidores**: Propone opciones de reprogramación

## ¿Qué acabamos de lograr?

En este capítulo construiste un **sistema de delivery completo** que maneja:

### ✅ Funcionalidades empresariales

- **Validación automática** de pedidos y disponibilidad
- **Cálculo dinámico** de costos de envío por zona
- **Asignación inteligente** de repartidores
- **Seguimiento en tiempo real** con timestamps
- **Manejo de excepciones** con alternativas útiles

### ✅ Arquitectura robusta

- **6 herramientas especializadas** trabajando en coordinación
- **Flujo de decisiones complejas** con múltiples validaciones
- **Estado compartido** entre herramientas
- **Manejo de errores** graceful con opciones al usuario

### ✅ Experiencia de usuario superior

- **Comunicación clara** en cada paso del proceso
- **Transparencia total** en costos y tiempos
- **Alternativas automáticas** cuando hay problemas
- **Seguimiento profesional** con links y estimaciones

### ✅ Escalabilidad real

- **Fácil agregar** nuevas zonas de entrega
- **Simple modificar** precios y tiempos
- **Rápido integrar** nuevos repartidores
- **Directo conectar** con sistemas externos (pagos, mapas, etc.)

### 🎯 Lo más importante

**Has creado un agente que piensa como un gerente experimentado**: evalúa, decide, actúa y comunica de forma profesional. Este no es solo código; es **inteligencia de negocio automatizada**.

## Reflexión para desarrolladores

Este capítulo demuestra que los Agent Workflows pueden manejar **procesos empresariales completos** sin complejidad técnica excesiva. En menos de 300 líneas de TypeScript limpio y funcional:

- ✨ **Automatizaste** un proceso que normalmente requiere múltiples sistemas
- 🧠 **Integraste** lógica de negocio compleja con IA conversacional
- 🔄 **Creaste** flujos adaptativos que manejan excepciones inteligentemente
- 📱 **Construiste** una experiencia que mejora la satisfacción del cliente

En el próximo capítulo aprenderemos **streaming en tiempo real** para hacer estos workflows aún más interactivos y dinámicos.

¡Gracias por acompañarme en este viaje! 🌮✨
Abrazo. Blissmo. 🤓 🤓
