# Capítulo 2: Tu Primer Workflow

¡Es hora de crear tu primer agente realmente complejo! En este capítulo construiremos un sistema completo para una taquería que puede procesar pedidos automáticamente usando el enfoque funcional de LlamaIndex TypeScript.

## El problema que vamos a resolver

Doña Carmen tiene una taquería muy popular, pero está abrumada con los pedidos por WhatsApp. Cada día recibe mensajes como:

- "Hola, quiero 3 tacos de pastor y 2 de carnitas"
- "Buenos días, me das 4 quesadillas de queso y un agua de horchata"
- "Necesito 5 tacos de suadero para llevar"

Ella tiene que:

1. Leer cada mensaje
2. Entender qué quiere el cliente
3. Verificar si tiene ingredientes
4. Calcular el precio
5. Responder al cliente
6. Actualizar su inventario

¡Vamos a automatizar todo esto con un agente inteligente!

## Configuración inicial

Primero, necesitamos instalar LlamaIndex TypeScript:

```bash
# Crear un nuevo proyecto
mkdir taqueria-agent
cd taqueria-agent
npm init -y

# Instalar dependencias
npm install llamaindex
npm install -D typescript @types/node ts-node

# Configurar TypeScript
npx tsc --init
```

### Configuración de TypeScript

Actualiza tu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Diseñando nuestro agente

Antes de escribir código, pensemos en las herramientas que necesitamos:

```
1. Procesar pedido → 2. Verificar inventario → 3. Calcular precio → 4. Generar respuesta
```

### Las herramientas que necesitamos

1. **`procesarPedido`**: Extrae productos y cantidades del mensaje
2. **`verificarInventario`**: Verifica disponibilidad de ingredientes
3. **`calcularPrecio`**: Calcula el total del pedido
4. **`actualizarInventario`**: Actualiza el stock después de confirmar

## Implementación completa

Aquí está nuestro agente completo para la taquería:

```typescript
import { agent, tool } from "llamaindex";

// Base de datos simulada del menú
const menu = {
  "taco de pastor": {
    precio: 15,
    ingredientes: ["tortilla", "pastor", "piña"],
  },
  "taco de carnitas": { precio: 15, ingredientes: ["tortilla", "carnitas"] },
  "taco de suadero": { precio: 16, ingredientes: ["tortilla", "suadero"] },
  "taco de chorizo": { precio: 14, ingredientes: ["tortilla", "chorizo"] },
  "quesadilla de queso": { precio: 25, ingredientes: ["tortilla", "queso"] },
  "quesadilla de flor de calabaza": {
    precio: 30,
    ingredientes: ["tortilla", "queso", "flor de calabaza"],
  },
  "agua de horchata": { precio: 20, ingredientes: ["horchata"] },
  "agua de jamaica": { precio: 18, ingredientes: ["jamaica"] },
  "coca cola": { precio: 25, ingredientes: ["refresco"] },
};

// Inventario disponible (simulado)
let inventario = {
  tortilla: 100,
  pastor: 50,
  carnitas: 30,
  suadero: 25,
  chorizo: 40,
  queso: 20,
  "flor de calabaza": 15,
  piña: 10,
  horchata: 10,
  jamaica: 8,
  refresco: 15,
};

// Herramienta para procesar pedidos
const procesarPedido = tool(
  async ({ mensaje }: { mensaje: string }) => {
    const texto = mensaje.toLowerCase();
    const items = [];

    // Buscar tacos
    const regexTacos = /(\d+)\s*tacos?\s*de\s*(\w+)/g;
    let match;
    while ((match = regexTacos.exec(texto)) !== null) {
      const cantidad = parseInt(match[1]);
      const tipo = match[2];
      const producto = `taco de ${tipo}`;

      if (menu[producto as keyof typeof menu]) {
        items.push({ producto, cantidad });
      }
    }

    // Buscar quesadillas
    const regexQuesadillas = /(\d+)\s*quesadillas?\s*de\s*([\w\s]+)/g;
    while ((match = regexQuesadillas.exec(texto)) !== null) {
      const cantidad = parseInt(match[1]);
      const tipo = match[2].trim();
      const producto = `quesadilla de ${tipo}`;

      if (menu[producto as keyof typeof menu]) {
        items.push({ producto, cantidad });
      }
    }

    // Buscar bebidas
    if (texto.includes("horchata")) {
      items.push({ producto: "agua de horchata", cantidad: 1 });
    }
    if (texto.includes("jamaica")) {
      items.push({ producto: "agua de jamaica", cantidad: 1 });
    }
    if (texto.includes("coca") || texto.includes("refresco")) {
      items.push({ producto: "coca cola", cantidad: 1 });
    }

    return {
      items,
      mensaje: `Encontré ${items.length} productos en tu pedido`,
    };
  },
  {
    name: "procesar_pedido",
    description:
      "Extrae productos y cantidades de un mensaje de pedido en español",
  }
);

// Herramienta para verificar inventario
const verificarInventario = tool(
  async ({
    items,
  }: {
    items: Array<{ producto: string; cantidad: number }>;
  }) => {
    const disponibles = [];
    const noDisponibles = [];

    for (const item of items) {
      const productoInfo = menu[item.producto as keyof typeof menu];

      if (!productoInfo) {
        noDisponibles.push(`${item.producto} (no está en el menú)`);
        continue;
      }

      // Verificar cada ingrediente
      let disponible = true;
      for (const ingrediente of productoInfo.ingredientes) {
        const stockDisponible =
          inventario[ingrediente as keyof typeof inventario];
        if (!stockDisponible || stockDisponible < item.cantidad) {
          disponible = false;
          break;
        }
      }

      if (disponible) {
        disponibles.push({
          ...item,
          precio: productoInfo.precio,
          subtotal: productoInfo.precio * item.cantidad,
        });
      } else {
        noDisponibles.push(
          `${item.cantidad} ${item.producto} (sin ingredientes suficientes)`
        );
      }
    }

    return {
      disponibles,
      noDisponibles,
      mensaje: `${disponibles.length} productos disponibles, ${noDisponibles.length} no disponibles`,
    };
  },
  {
    name: "verificar_inventario",
    description:
      "Verifica la disponibilidad de productos según el inventario actual",
  }
);

// Herramienta para calcular precios
const calcularPrecio = tool(
  async ({
    items,
  }: {
    items: Array<{
      producto: string;
      cantidad: number;
      precio: number;
      subtotal: number;
    }>;
  }) => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tiempoEstimado = Math.max(5, items.length * 3); // 3 minutos por producto, mínimo 5

    // Aplicar descuentos si aplica
    let descuento = 0;
    let mensajeDescuento = "";

    if (total > 100) {
      descuento = total * 0.05; // 5% descuento por compra mayor a $100
      mensajeDescuento = "¡Descuento del 5% por compra mayor a $100!";
    }

    const totalFinal = total - descuento;

    return {
      subtotal: total,
      descuento,
      total: totalFinal,
      tiempoEstimado,
      mensajeDescuento,
      resumen: `Subtotal: $${total}, Descuento: $${descuento}, Total: $${totalFinal}, Tiempo: ${tiempoEstimado} min`,
    };
  },
  {
    name: "calcular_precio",
    description:
      "Calcula el precio total, descuentos y tiempo estimado de preparación",
  }
);

// Herramienta para actualizar inventario
const actualizarInventario = tool(
  async ({
    items,
  }: {
    items: Array<{ producto: string; cantidad: number }>;
  }) => {
    const actualizaciones = [];

    for (const item of items) {
      const productoInfo = menu[item.producto as keyof typeof menu];
      if (productoInfo) {
        for (const ingrediente of productoInfo.ingredientes) {
          const stockAnterior =
            inventario[ingrediente as keyof typeof inventario];
          inventario[ingrediente as keyof typeof inventario] -= item.cantidad;
          const stockNuevo = inventario[ingrediente as keyof typeof inventario];

          actualizaciones.push(
            `${ingrediente}: ${stockAnterior} → ${stockNuevo}`
          );
        }
      }
    }

    return {
      actualizaciones,
      mensaje: `Inventario actualizado para ${items.length} productos`,
    };
  },
  {
    name: "actualizar_inventario",
    description: "Actualiza el inventario después de confirmar un pedido",
  }
);

// Crear el agente de la taquería
const taqueriaAgent = agent({
  tools: [
    procesarPedido,
    verificarInventario,
    calcularPrecio,
    actualizarInventario,
  ],
  systemPrompt: `
    Eres el asistente inteligente de la Taquería "Doña Carmen", una taquería familiar mexicana.
    
    Tu trabajo es procesar pedidos de WhatsApp de manera amigable y eficiente:
    
    1. SIEMPRE saluda al cliente de manera cálida
    2. Usa la herramienta procesar_pedido para entender qué quiere el cliente
    3. Usa verificar_inventario para confirmar disponibilidad
    4. Si hay productos no disponibles, ofrece alternativas similares
    5. Usa calcular_precio para obtener el total y tiempo estimado
    6. Presenta un resumen claro del pedido con precios
    7. Pregunta si confirma el pedido
    8. Si confirma, usa actualizar_inventario
    9. Da un mensaje final con tiempo de preparación y agradecimiento
    
    IMPORTANTE:
    - Sé siempre amigable y usa emojis apropiados
    - Habla como una persona real, no como un robot
    - Si algo no está disponible, sugiere alternativas
    - Siempre confirma antes de actualizar el inventario
    - Menciona el tiempo estimado de preparación
    
    Ejemplo de flujo:
    "¡Hola! Bienvenido a Taquería Doña Carmen 🌮
    
    Veo que quieres [productos]. Déjame verificar qué tenemos disponible...
    
    ✅ Disponible: [lista]
    ❌ No disponible: [lista con alternativas]
    
    Tu pedido sería:
    [resumen con precios]
    
    ¿Confirmas tu pedido?"
  `,
});
```

## Probando nuestro agente

Ahora vamos a probar nuestro sistema:

```typescript
async function probarTaqueria() {
  console.log("🌮 TAQUERÍA DOÑA CARMEN - Sistema de Pedidos");
  console.log("=".repeat(50));

  // Ejemplo 1: Pedido normal
  console.log("\n📱 Pedido 1: Cliente María");
  const stream1 = await taqueriaAgent.runStream({
    message:
      "Hola, quiero 3 tacos de pastor y 2 quesadillas de queso, por favor",
  });

  for await (const chunk of stream1) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n\n" + "=".repeat(50));

  // Ejemplo 2: Pedido más complejo
  console.log("\n📱 Pedido 2: Cliente Carlos");
  const stream2 = await taqueriaAgent.runStream({
    message:
      "Buenos días, me das 5 tacos de carnitas, 1 quesadilla de flor de calabaza y una horchata",
  });

  for await (const chunk of stream2) {
    process.stdout.write(chunk.delta);
  }

  console.log("\n\n" + "=".repeat(50));

  // Ejemplo 3: Pedido con productos no disponibles
  console.log("\n📱 Pedido 3: Cliente Ana");
  const stream3 = await taqueriaAgent.runStream({
    message: "Quiero 10 tacos de pastor y 5 quesadillas de queso",
  });

  for await (const chunk of stream3) {
    process.stdout.write(chunk.delta);
  }
}

// Ejecutar la prueba
probarTaqueria().catch(console.error);
```

## Ejecutando el código

Guarda todo en un archivo `src/taqueria.ts` y ejecuta:

```bash
npx ts-node src/taqueria.ts
```

Deberías ver algo como:

```
🌮 TAQUERÍA DOÑA CARMEN - Sistema de Pedidos
==================================================

📱 Pedido 1: Cliente María
¡Hola! Bienvenido a Taquería Doña Carmen 🌮

Veo que quieres 3 tacos de pastor y 2 quesadillas de queso. Déjame verificar qué tenemos disponible...

✅ Productos disponibles:
• 3 tacos de pastor - $45
• 2 quesadillas de queso - $50

💰 Resumen de tu pedido:
Subtotal: $95
Total: $95 pesos
⏱️ Tiempo estimado: 15 minutos

¿Confirmas tu pedido?

==================================================

📱 Pedido 2: Cliente Carlos
¡Buenos días! Bienvenido a Taquería Doña Carmen 🌮

Perfecto, quieres 5 tacos de carnitas, 1 quesadilla de flor de calabaza y un agua de horchata.

✅ Todos los productos están disponibles:
• 5 tacos de carnitas - $75
• 1 quesadilla de flor de calabaza - $30
• 1 agua de horchata - $20

💰 Resumen de tu pedido:
Subtotal: $125
¡Descuento del 5% por compra mayor a $100! - $6.25
Total: $118.75 pesos
⏱️ Tiempo estimado: 21 minutos

¿Confirmas tu pedido?
```

## ¿Qué acabamos de lograr?

1. **Procesamiento de lenguaje natural**: El agente entiende pedidos en español natural
2. **Validación de inventario**: Verifica disponibilidad antes de confirmar
3. **Cálculos automáticos**: Precios, descuentos y tiempos se calculan automáticamente
4. **Respuestas en streaming**: El cliente ve la respuesta conforme se genera
5. **Gestión de inventario**: Actualiza stock automáticamente
6. **Experiencia conversacional**: Se siente como hablar con una persona real

## La magia del enfoque funcional

### Composición natural

Cada herramienta hace una cosa específica y se combina naturalmente:

```
Mensaje → procesarPedido → verificarInventario → calcularPrecio → actualizarInventario
```

### Funciones puras

Cada herramienta es una función pura que:

- Recibe inputs específicos
- Produce outputs predecibles
- No tiene efectos secundarios (excepto actualizar inventario al final)

### Streaming nativo

El agente responde en tiempo real, creando una experiencia fluida para el cliente.

## Mejoras que puedes hacer

### 1. Agregar más productos

```typescript
const menu = {
  // Tacos
  "taco de pastor": {
    precio: 15,
    ingredientes: ["tortilla", "pastor", "piña"],
  },
  "taco de barbacoa": { precio: 18, ingredientes: ["tortilla", "barbacoa"] },
  "taco de cochinita": { precio: 17, ingredientes: ["tortilla", "cochinita"] },

  // Tortas
  "torta de milanesa": {
    precio: 45,
    ingredientes: ["pan", "milanesa", "verduras"],
  },
  "torta de pastor": { precio: 40, ingredientes: ["pan", "pastor", "piña"] },

  // Más bebidas
  "agua de tamarindo": { precio: 18, ingredientes: ["tamarindo"] },
  cerveza: { precio: 30, ingredientes: ["cerveza"] },
};
```

### 2. Manejar promociones por día

```typescript
const verificarPromociones = tool(
  async () => {
    const hoy = new Date().getDay(); // 0 = domingo, 1 = lunes, etc.

    const promociones = {
      1: { nombre: "Lunes de tacos", descuento: 0.15, productos: ["taco"] },
      5: {
        nombre: "Viernes de bebidas",
        descuento: 0.2,
        productos: ["agua", "coca"],
      },
    };

    return promociones[hoy] || null;
  },
  {
    name: "verificar_promociones",
    description: "Verifica si hay promociones activas para el día actual",
  }
);
```

### 3. Integrar con WhatsApp real

```typescript
const enviarWhatsApp = tool(
  async ({ telefono, mensaje }: { telefono: string; mensaje: string }) => {
    // Usar API de WhatsApp Business
    // const response = await whatsappAPI.sendMessage(telefono, mensaje);
    console.log(`📱 Enviando a ${telefono}: ${mensaje}`);
    return { enviado: true };
  },
  {
    name: "enviar_whatsapp",
    description: "Envía un mensaje por WhatsApp al cliente",
  }
);
```

### 4. Persistir datos

```typescript
const guardarPedido = tool(
  async ({ pedido }: { pedido: any }) => {
    // Guardar en base de datos
    // await db.pedidos.create(pedido);
    console.log("💾 Pedido guardado en base de datos");
    return { guardado: true, id: Date.now() };
  },
  {
    name: "guardar_pedido",
    description: "Guarda el pedido en la base de datos",
  }
);
```

## Conceptos clave aprendidos

### Agente como orquestador

El agente coordina todas las herramientas sin hacer el trabajo pesado él mismo.

### Herramientas especializadas

Cada herramienta tiene una responsabilidad específica y bien definida.

### Streaming para UX

El streaming hace que la experiencia se sienta natural y responsiva.

### Funciones puras

Las herramientas son predecibles y fáciles de probar.

### Composición flexible

Puedes agregar, quitar o modificar herramientas sin afectar el resto.

## Lo que viene

En el siguiente capítulo profundizaremos en **Agentes Múltiples y Colaboración**, aprendiendo:

- Cómo crear múltiples agentes especializados
- Patrones de comunicación entre agentes
- Coordinación de tareas complejas
- Manejo de conflictos y prioridades

¡Ya tienes tu primer agente complejo funcionando! 🎉

## Ejercicio práctico

Antes de continuar, intenta expandir el agente de la taquería:

### Nivel 1: Básico

1. **Agregar validación de horarios** - verificar si la taquería está abierta
2. **Implementar sistema de descuentos** por cliente frecuente
3. **Crear herramienta de sugerencias** cuando algo no esté disponible

### Nivel 2: Intermedio

4. **Agregar gestión de mesas** para pedidos en el local
5. **Implementar sistema de puntos** de lealtad
6. **Crear estimación de entrega** para pedidos a domicilio

### Nivel 3: Avanzado

7. **Integrar base de datos real** (SQLite o MongoDB)
8. **Crear dashboard de administración** para ver pedidos
9. **Implementar notificaciones** cuando el pedido esté listo

¿Te animas a intentarlo? En el próximo capítulo veremos implementaciones avanzadas de estos conceptos.
