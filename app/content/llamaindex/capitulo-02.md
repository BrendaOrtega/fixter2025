# Capítulo 2: Tu Primer Workflow

¡Es hora de crear tu primer workflow real! En este capítulo construiremos un sistema completo para una taquería que puede procesar pedidos automáticamente.

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

¡Vamos a automatizar todo esto!

## Configuración inicial

Primero, necesitamos instalar LlamaIndex TypeScript:

```bash
# Crear un nuevo proyecto
mkdir taqueria-workflow
cd taqueria-workflow
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
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Diseñando nuestro workflow

Antes de escribir código, pensemos en los pasos:

```
1. Recibir pedido → 2. Procesar mensaje → 3. Validar inventario → 4. Calcular total → 5. Responder cliente
```

### Los eventos que necesitamos

```typescript
// Eventos personalizados para nuestro workflow
class PedidoRecibidoEvent extends WorkflowEvent<{
  cliente: string;
  mensaje: string;
  telefono: string;
}> {}

class PedidoProcesadoEvent extends WorkflowEvent<{
  cliente: string;
  items: Array<{
    producto: string;
    cantidad: number;
    precio: number;
  }>;
}> {}

class PedidoValidadoEvent extends WorkflowEvent<{
  pedido: any;
  total: number;
  disponible: boolean;
}> {}
```

## Implementación completa

Aquí está nuestro workflow completo:

```typescript
import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Definir eventos
class PedidoRecibidoEvent extends WorkflowEvent<{
  cliente: string;
  mensaje: string;
  telefono: string;
}> {}

class PedidoProcesadoEvent extends WorkflowEvent<{
  cliente: string;
  items: Array<{
    producto: string;
    cantidad: number;
    precio: number;
  }>;
}> {}

class PedidoValidadoEvent extends WorkflowEvent<{
  pedido: any;
  total: number;
  disponible: boolean;
  tiempoEstimado: number;
}> {}

class TaqueriaWorkflow extends Workflow {
  // Menú con precios
  private menu = {
    "taco de pastor": 15,
    "taco de carnitas": 15,
    "taco de suadero": 16,
    "taco de chorizo": 14,
    "quesadilla de queso": 25,
    "quesadilla de flor de calabaza": 30,
    "agua de horchata": 20,
    "agua de jamaica": 18,
    "coca cola": 25,
  };

  // Inventario disponible
  private inventario = {
    pastor: 50,
    carnitas: 30,
    suadero: 25,
    chorizo: 40,
    queso: 20,
    "flor de calabaza": 15,
    horchata: 10,
    jamaica: 8,
    "coca cola": 15,
  };

  @step()
  async recibirPedido(
    ev: StartEvent<{
      cliente: string;
      mensaje: string;
      telefono: string;
    }>
  ) {
    console.log(`📱 Nuevo pedido de ${ev.data.cliente}`);
    console.log(`💬 Mensaje: "${ev.data.mensaje}"`);

    return new PedidoRecibidoEvent({
      cliente: ev.data.cliente,
      mensaje: ev.data.mensaje,
      telefono: ev.data.telefono,
    });
  }

  @step()
  async procesarMensaje(ev: PedidoRecibidoEvent) {
    console.log(`🔍 Procesando mensaje de ${ev.data.cliente}`);

    const items = this.extraerProductos(ev.data.mensaje);

    if (items.length === 0) {
      return new StopEvent({
        success: false,
        mensaje: "No entendí tu pedido. ¿Podrías ser más específico?",
      });
    }

    console.log(`✅ Productos identificados: ${items.length}`);

    return new PedidoProcesadoEvent({
      cliente: ev.data.cliente,
      items,
    });
  }

  @step()
  async validarInventario(ev: PedidoProcesadoEvent) {
    console.log(`📦 Validando inventario...`);

    let total = 0;
    let disponible = true;
    const itemsValidados = [];

    for (const item of ev.data.items) {
      const precioUnitario = this.menu[item.producto as keyof typeof this.menu];

      if (!precioUnitario) {
        console.log(`❌ Producto no disponible: ${item.producto}`);
        disponible = false;
        continue;
      }

      // Verificar inventario (simplificado)
      const ingredientePrincipal = this.obtenerIngredientePrincipal(
        item.producto
      );
      const stockDisponible =
        this.inventario[ingredientePrincipal as keyof typeof this.inventario];

      if (!stockDisponible || stockDisponible < item.cantidad) {
        console.log(`❌ Sin stock suficiente para: ${item.producto}`);
        disponible = false;
        continue;
      }

      const subtotal = precioUnitario * item.cantidad;
      total += subtotal;

      itemsValidados.push({
        ...item,
        precio: precioUnitario,
        subtotal,
      });

      console.log(`✅ ${item.cantidad} ${item.producto} - $${subtotal}`);
    }

    // Calcular tiempo estimado (2-5 minutos por item)
    const tiempoEstimado = Math.max(5, itemsValidados.length * 3);

    console.log(`💰 Total: $${total}`);
    console.log(`⏱️ Tiempo estimado: ${tiempoEstimado} minutos`);

    return new PedidoValidadoEvent({
      pedido: {
        cliente: ev.data.cliente,
        items: itemsValidados,
      },
      total,
      disponible,
      tiempoEstimado,
    });
  }

  @step()
  async responderCliente(ev: PedidoValidadoEvent) {
    if (!ev.data.disponible) {
      console.log("❌ Pedido no disponible");
      return new StopEvent({
        success: false,
        mensaje:
          "Lo siento, algunos productos no están disponibles. ¿Te gustaría ordenar algo más?",
      });
    }

    console.log(`📞 Generando respuesta para ${ev.data.pedido.cliente}`);

    // Generar mensaje de confirmación
    const mensaje = this.generarMensajeConfirmacion(
      ev.data.pedido,
      ev.data.total,
      ev.data.tiempoEstimado
    );

    // Actualizar inventario
    this.actualizarInventario(ev.data.pedido.items);

    console.log(`✅ Pedido confirmado`);

    return new StopEvent({
      success: true,
      mensaje,
      pedido: ev.data.pedido,
      total: ev.data.total,
      tiempoEstimado: ev.data.tiempoEstimado,
    });
  }

  // Métodos auxiliares
  private extraerProductos(mensaje: string) {
    const items = [];
    const texto = mensaje.toLowerCase();

    // Buscar tacos
    const regexTacos = /(\d+)\s*tacos?\s*de\s*(\w+)/g;
    let match;
    while ((match = regexTacos.exec(texto)) !== null) {
      const cantidad = parseInt(match[1]);
      const tipo = match[2];
      items.push({
        producto: `taco de ${tipo}`,
        cantidad,
      });
    }

    // Buscar quesadillas
    const regexQuesadillas = /(\d+)\s*quesadillas?\s*de\s*([\w\s]+)/g;
    while ((match = regexQuesadillas.exec(texto)) !== null) {
      const cantidad = parseInt(match[1]);
      const tipo = match[2].trim();
      items.push({
        producto: `quesadilla de ${tipo}`,
        cantidad,
      });
    }

    // Buscar bebidas
    if (texto.includes("horchata")) {
      items.push({ producto: "agua de horchata", cantidad: 1 });
    }
    if (texto.includes("jamaica")) {
      items.push({ producto: "agua de jamaica", cantidad: 1 });
    }
    if (texto.includes("coca")) {
      items.push({ producto: "coca cola", cantidad: 1 });
    }

    return items;
  }

  private obtenerIngredientePrincipal(producto: string): string {
    if (producto.includes("pastor")) return "pastor";
    if (producto.includes("carnitas")) return "carnitas";
    if (producto.includes("suadero")) return "suadero";
    if (producto.includes("chorizo")) return "chorizo";
    if (producto.includes("queso")) return "queso";
    if (producto.includes("flor de calabaza")) return "flor de calabaza";
    if (producto.includes("horchata")) return "horchata";
    if (producto.includes("jamaica")) return "jamaica";
    if (producto.includes("coca")) return "coca cola";
    return "desconocido";
  }

  private generarMensajeConfirmacion(
    pedido: any,
    total: number,
    tiempo: number
  ): string {
    const items = pedido.items
      .map(
        (item: any) => `• ${item.cantidad} ${item.producto} - $${item.subtotal}`
      )
      .join("\n");

    return `🌮 ¡Hola ${pedido.cliente}!

Tu pedido ha sido confirmado:

${items}

💰 Total: $${total} pesos
⏱️ Tiempo estimado: ${tiempo} minutos

¡Gracias por tu preferencia!
*Taquería Doña Carmen*`;
  }

  private actualizarInventario(items: any[]) {
    for (const item of items) {
      const ingrediente = this.obtenerIngredientePrincipal(item.producto);
      if (this.inventario[ingrediente as keyof typeof this.inventario]) {
        this.inventario[ingrediente as keyof typeof this.inventario] -=
          item.cantidad;
        console.log(
          `📦 Inventario actualizado: ${ingrediente} (quedan ${
            this.inventario[ingrediente as keyof typeof this.inventario]
          })`
        );
      }
    }
  }
}
```

## Probando nuestro workflow

Ahora vamos a probar nuestro sistema:

```typescript
async function probarTaqueria() {
  console.log("🌮 TAQUERÍA DOÑA CARMEN - Sistema de Pedidos");
  console.log("=".repeat(50));

  const workflow = new TaqueriaWorkflow();

  // Ejemplo 1: Pedido normal
  console.log("\n📱 Pedido 1:");
  const resultado1 = await workflow.run({
    cliente: "María González",
    mensaje: "Hola, quiero 3 tacos de pastor y 2 quesadillas de queso",
    telefono: "55-1234-5678",
  });

  if (resultado1.data.success) {
    console.log("✅ Pedido exitoso:");
    console.log(resultado1.data.mensaje);
  } else {
    console.log("❌ Error:", resultado1.data.mensaje);
  }

  // Ejemplo 2: Pedido más complejo
  console.log("\n📱 Pedido 2:");
  const resultado2 = await workflow.run({
    cliente: "Carlos Mendoza",
    mensaje:
      "Buenos días, me das 5 tacos de carnitas, 1 quesadilla de flor de calabaza y una horchata",
    telefono: "55-9876-5432",
  });

  if (resultado2.data.success) {
    console.log("✅ Pedido exitoso:");
    console.log(resultado2.data.mensaje);
  } else {
    console.log("❌ Error:", resultado2.data.mensaje);
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

📱 Pedido 1:
📱 Nuevo pedido de María González
💬 Mensaje: "Hola, quiero 3 tacos de pastor y 2 quesadillas de queso"
🔍 Procesando mensaje de María González
✅ Productos identificados: 2
📦 Validando inventario...
✅ 3 taco de pastor - $45
✅ 2 quesadilla de queso - $50
💰 Total: $95
⏱️ Tiempo estimado: 6 minutos
📞 Generando respuesta para María González
✅ Pedido confirmado

✅ Pedido exitoso:
🌮 ¡Hola María González!

Tu pedido ha sido confirmado:

• 3 taco de pastor - $45
• 2 quesadilla de queso - $50

💰 Total: $95 pesos
⏱️ Tiempo estimado: 6 minutos

¡Gracias por tu preferencia!
*Taquería Doña Carmen*
```

## ¿Qué acabamos de lograr?

1. **Procesamiento de lenguaje natural**: El sistema entiende pedidos en español natural
2. **Validación de inventario**: Verifica disponibilidad antes de confirmar
3. **Cálculos automáticos**: Precios y tiempos se calculan automáticamente
4. **Respuestas personalizadas**: Genera mensajes listos para WhatsApp
5. **Gestión de inventario**: Actualiza stock automáticamente

## Mejoras que puedes hacer

### 1. Agregar más productos

```typescript
private menu = {
  // Tacos
  'taco de pastor': 15,
  'taco de carnitas': 15,
  'taco de barbacoa': 18,
  'taco de cochinita': 17,
  // Tortas
  'torta de milanesa': 45,
  'torta de pastor': 40,
  // Bebidas
  'agua de tamarindo': 18,
  'cerveza': 30
};
```

### 2. Manejar promociones

```typescript
private aplicarPromociones(items: any[], dia: string) {
  if (dia === 'martes') {
    // Martes de tacos: 2x1 en tacos
    // Lógica de promoción
  }
  return items;
}
```

### 3. Integrar con WhatsApp real

```typescript
private async enviarWhatsApp(telefono: string, mensaje: string) {
  // Usar API de WhatsApp Business
  // await whatsappAPI.sendMessage(telefono, mensaje);
}
```

## Conceptos clave aprendidos

### Workflow como orquestador

El workflow coordina todos los pasos sin hacer el trabajo pesado él mismo.

### Steps especializados

Cada step tiene una responsabilidad específica y bien definida.

### Eventos tipados

Los eventos llevan información específica entre steps de manera segura.

### Manejo de errores

El workflow puede manejar casos donde algo sale mal.

### Estado interno

El workflow puede mantener información (como inventario) entre ejecuciones.

## Lo que viene

En el siguiente capítulo profundizaremos en **Steps y Eventos**, aprendiendo:

- Cómo crear eventos personalizados más complejos
- Patrones de comunicación entre steps
- Manejo avanzado de errores
- Workflows con ramificaciones condicionales

¡Ya tienes tu primer workflow funcionando! 🎉
