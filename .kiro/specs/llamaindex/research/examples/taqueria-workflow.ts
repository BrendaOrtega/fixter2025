/**
 * Ejemplo Creativo: Sistema de Pedidos de Taquería
 *
 * Este ejemplo demuestra Agent Workflows usando un caso familiar
 * para el público mexicano: automatizar pedidos de una taquería.
 * Es más accesible que ejemplos técnicos de GitHub.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Eventos del workflow de taquería
export class PedidoRecibidoEvent extends WorkflowEvent<{
  cliente: string;
  items: Array<{
    tipo: "taco" | "quesadilla" | "torta" | "bebida";
    sabor: string;
    cantidad: number;
    extras?: string[];
  }>;
  telefono: string;
}> {}

export class PedidoValidadoEvent extends WorkflowEvent<{
  pedido: any;
  total: number;
  tiempoEstimado: number;
  disponible: boolean;
}> {}

export class PedidoPreparadoEvent extends WorkflowEvent<{
  pedido: any;
  ingredientesUsados: string[];
  tiempoReal: number;
}> {}

/**
 * Workflow para Gestión de Pedidos de Taquería
 *
 * Casos de uso familiares:
 * - Recibir pedidos por WhatsApp/teléfono
 * - Validar disponibilidad de ingredientes
 * - Calcular tiempos de preparación
 * - Notificar al cliente cuando esté listo
 */
export class TaqueriaWorkflow extends Workflow {
  private menu = {
    tacos: {
      pastor: {
        precio: 15,
        tiempo: 3,
        ingredientes: ["tortilla", "pastor", "piña", "cebolla"],
      },
      carnitas: {
        precio: 15,
        tiempo: 2,
        ingredientes: ["tortilla", "carnitas", "cebolla", "cilantro"],
      },
      suadero: {
        precio: 16,
        tiempo: 4,
        ingredientes: ["tortilla", "suadero", "cebolla", "cilantro"],
      },
      chorizo: {
        precio: 14,
        tiempo: 2,
        ingredientes: ["tortilla", "chorizo", "cebolla"],
      },
    },
    quesadillas: {
      queso: {
        precio: 25,
        tiempo: 5,
        ingredientes: ["tortilla", "queso oaxaca"],
      },
      "flor de calabaza": {
        precio: 30,
        tiempo: 6,
        ingredientes: ["tortilla", "queso", "flor de calabaza"],
      },
      huitlacoche: {
        precio: 32,
        tiempo: 6,
        ingredientes: ["tortilla", "queso", "huitlacoche"],
      },
    },
    bebidas: {
      "agua de horchata": { precio: 20, tiempo: 1, ingredientes: ["horchata"] },
      "agua de jamaica": { precio: 18, tiempo: 1, ingredientes: ["jamaica"] },
      "coca cola": { precio: 25, tiempo: 1, ingredientes: ["refresco"] },
    },
  };

  private inventario = {
    tortilla: 100,
    pastor: 50,
    carnitas: 30,
    suadero: 25,
    chorizo: 40,
    "queso oaxaca": 20,
    "flor de calabaza": 15,
    huitlacoche: 10,
    piña: 5,
    cebolla: 30,
    cilantro: 20,
    horchata: 10,
    jamaica: 8,
    refresco: 15,
  };

  /**
   * Paso 1: Recibir y procesar el pedido
   */
  @step()
  async recibirPedido(
    ev: StartEvent<{
      cliente: string;
      mensaje: string; // "Quiero 3 tacos de pastor y 2 quesadillas de queso"
      telefono: string;
    }>
  ) {
    console.log(`📱 Nuevo pedido de ${ev.data.cliente}`);
    console.log(`💬 Mensaje: "${ev.data.mensaje}"`);

    // Procesar el mensaje usando IA (simulado)
    const items = this.procesarMensaje(ev.data.mensaje);

    if (items.length === 0) {
      console.log("❌ No se pudo entender el pedido");
      return new StopEvent({
        error: "No entendí tu pedido. ¿Podrías ser más específico?",
      });
    }

    console.log(`✅ Pedido procesado: ${items.length} items`);

    return new PedidoRecibidoEvent({
      cliente: ev.data.cliente,
      items,
      telefono: ev.data.telefono,
    });
  }

  /**
   * Paso 2: Validar disponibilidad y calcular total
   */
  @step()
  async validarPedido(ev: PedidoRecibidoEvent) {
    console.log(`🔍 Validando pedido de ${ev.data.cliente}`);

    let total = 0;
    let tiempoEstimado = 0;
    let disponible = true;
    const itemsValidados = [];

    for (const item of ev.data.items) {
      const categoria = this.menu[item.tipo as keyof typeof this.menu];
      const producto = categoria?.[item.sabor as keyof typeof categoria];

      if (!producto) {
        console.log(`❌ No tenemos ${item.tipo} de ${item.sabor}`);
        disponible = false;
        continue;
      }

      // Verificar inventario
      const ingredientesDisponibles = producto.ingredientes.every(
        (ing) =>
          this.inventario[ing as keyof typeof this.inventario] >= item.cantidad
      );

      if (!ingredientesDisponibles) {
        console.log(
          `❌ No hay suficientes ingredientes para ${item.tipo} de ${item.sabor}`
        );
        disponible = false;
        continue;
      }

      total += producto.precio * item.cantidad;
      tiempoEstimado = Math.max(tiempoEstimado, producto.tiempo);
      itemsValidados.push({
        ...item,
        precio: producto.precio,
        subtotal: producto.precio * item.cantidad,
      });
    }

    // Agregar tiempo extra si hay muchos items
    if (itemsValidados.length > 5) {
      tiempoEstimado += 5;
    }

    console.log(`💰 Total: $${total} pesos`);
    console.log(`⏱️ Tiempo estimado: ${tiempoEstimado} minutos`);

    return new PedidoValidadoEvent({
      pedido: {
        cliente: ev.data.cliente,
        items: itemsValidados,
        telefono: ev.data.telefono,
      },
      total,
      tiempoEstimado,
      disponible,
    });
  }

  /**
   * Paso 3: Procesar el pedido si está disponible
   */
  @step()
  async procesarPedido(ev: PedidoValidadoEvent) {
    if (!ev.data.disponible) {
      console.log("❌ Pedido no disponible");
      return new StopEvent({
        success: false,
        mensaje:
          "Lo siento, algunos productos no están disponibles. ¿Te gustaría ordenar algo más?",
      });
    }

    console.log(`👨‍🍳 Preparando pedido de ${ev.data.pedido.cliente}`);
    console.log(`💵 Total a pagar: $${ev.data.total} pesos`);

    // Simular preparación
    const tiempoInicio = Date.now();
    await this.simularPreparacion(ev.data.tiempoEstimado);
    const tiempoReal = Math.round((Date.now() - tiempoInicio) / 100); // Simulado

    // Actualizar inventario
    const ingredientesUsados = this.actualizarInventario(ev.data.pedido.items);

    console.log(`✅ Pedido listo en ${tiempoReal} minutos`);

    return new PedidoPreparadoEvent({
      pedido: ev.data.pedido,
      ingredientesUsados,
      tiempoReal,
    });
  }

  /**
   * Paso 4: Notificar al cliente
   */
  @step()
  async notificarCliente(ev: PedidoPreparadoEvent) {
    console.log(`📞 Notificando a ${ev.data.pedido.cliente}`);

    const mensaje = this.generarMensajeWhatsApp(
      ev.data.pedido,
      ev.data.tiempoReal
    );

    // Simular envío de WhatsApp
    await this.enviarWhatsApp(ev.data.pedido.telefono, mensaje);

    console.log(`✅ Cliente notificado por WhatsApp`);

    return new StopEvent({
      success: true,
      pedido: ev.data.pedido,
      mensaje: "Pedido completado y cliente notificado",
      resumen: {
        cliente: ev.data.pedido.cliente,
        items: ev.data.pedido.items.length,
        tiempoPreparacion: ev.data.tiempoReal,
        ingredientesUsados: ev.data.ingredientesUsados,
      },
    });
  }

  // Métodos auxiliares

  private procesarMensaje(mensaje: string) {
    const items = [];
    const texto = mensaje.toLowerCase();

    // Detectar tacos
    const tacoMatch = texto.match(/(\d+)\s*tacos?\s*de\s*(\w+)/g);
    if (tacoMatch) {
      tacoMatch.forEach((match) => {
        const [, cantidad, sabor] =
          match.match(/(\d+)\s*tacos?\s*de\s*(\w+)/) || [];
        if (cantidad && sabor) {
          items.push({
            tipo: "taco" as const,
            sabor: sabor.trim(),
            cantidad: parseInt(cantidad),
          });
        }
      });
    }

    // Detectar quesadillas
    const quesaMatch = texto.match(/(\d+)\s*quesadillas?\s*de\s*([\w\s]+)/g);
    if (quesaMatch) {
      quesaMatch.forEach((match) => {
        const [, cantidad, sabor] =
          match.match(/(\d+)\s*quesadillas?\s*de\s*([\w\s]+)/) || [];
        if (cantidad && sabor) {
          items.push({
            tipo: "quesadilla" as const,
            sabor: sabor.trim(),
            cantidad: parseInt(cantidad),
          });
        }
      });
    }

    // Detectar bebidas
    if (texto.includes("horchata")) {
      items.push({
        tipo: "bebida" as const,
        sabor: "agua de horchata",
        cantidad: 1,
      });
    }
    if (texto.includes("jamaica")) {
      items.push({
        tipo: "bebida" as const,
        sabor: "agua de jamaica",
        cantidad: 1,
      });
    }
    if (texto.includes("coca") || texto.includes("refresco")) {
      items.push({ tipo: "bebida" as const, sabor: "coca cola", cantidad: 1 });
    }

    return items;
  }

  private async simularPreparacion(minutos: number) {
    // Simular tiempo de preparación (acelerado para demo)
    await new Promise((resolve) => setTimeout(resolve, minutos * 100));
  }

  private actualizarInventario(items: any[]) {
    const ingredientesUsados = [];

    for (const item of items) {
      const categoria = this.menu[item.tipo as keyof typeof this.menu];
      const producto = categoria?.[item.sabor as keyof typeof categoria];

      if (producto) {
        for (const ingrediente of producto.ingredientes) {
          this.inventario[ingrediente as keyof typeof this.inventario] -=
            item.cantidad;
          ingredientesUsados.push(`${ingrediente} (${item.cantidad})`);
        }
      }
    }

    return ingredientesUsados;
  }

  private generarMensajeWhatsApp(pedido: any, tiempoReal: number) {
    const items = pedido.items
      .map(
        (item: any) =>
          `• ${item.cantidad} ${item.tipo}(s) de ${item.sabor} - $${item.subtotal}`
      )
      .join("\n");

    return `🌮 ¡Hola ${pedido.cliente}!

Tu pedido está LISTO 🎉

📋 *Resumen:*
${items}

💰 *Total: $${pedido.items.reduce(
      (sum: number, item: any) => sum + item.subtotal,
      0
    )} pesos*
⏱️ *Tiempo de preparación: ${tiempoReal} minutos*

¡Pasa a recogerlo cuando gustes!

Gracias por tu preferencia 🙏
*Taquería Don Pepe*`;
  }

  private async enviarWhatsApp(telefono: string, mensaje: string) {
    // Simular envío de WhatsApp
    console.log(`📱 WhatsApp a ${telefono}:`);
    console.log(mensaje);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Función de uso del workflow
 */
export async function procesarPedidoTaqueria(
  cliente: string,
  mensaje: string,
  telefono: string
) {
  console.log(`🌮 TAQUERÍA DON PEPE - Sistema de Pedidos`);
  console.log("=".repeat(50));

  const workflow = new TaqueriaWorkflow();

  try {
    const result = await workflow.run({
      cliente,
      mensaje,
      telefono,
    });

    if (result.data.success) {
      console.log("\n🎉 ¡PEDIDO COMPLETADO EXITOSAMENTE!");
      console.log(`👤 Cliente: ${result.data.resumen.cliente}`);
      console.log(`📦 Items: ${result.data.resumen.items}`);
      console.log(
        `⏱️ Tiempo: ${result.data.resumen.tiempoPreparacion} minutos`
      );
      console.log(
        `🥘 Ingredientes usados: ${result.data.resumen.ingredientesUsados.length}`
      );
    } else {
      console.log("\n❌ No se pudo completar el pedido");
      console.log(`💬 Mensaje: ${result.data.mensaje}`);
    }

    return result.data;
  } catch (error) {
    console.error(`❌ Error procesando pedido: ${error}`);
    throw error;
  }
}

// Ejemplos de uso
if (require.main === module) {
  console.log("🚀 Probando el sistema de pedidos...\n");

  // Ejemplo 1: Pedido normal
  procesarPedidoTaqueria(
    "María González",
    "Hola, quiero 3 tacos de pastor y 2 quesadillas de queso, y un agua de horchata",
    "55-1234-5678"
  )
    .then(() => {
      console.log("\n" + "=".repeat(50));

      // Ejemplo 2: Pedido más complejo
      return procesarPedidoTaqueria(
        "Carlos Mendoza",
        "Buenos días, me das 5 tacos de carnitas, 1 quesadilla de flor de calabaza y una coca",
        "55-9876-5432"
      );
    })
    .then(() => {
      console.log("\n✅ Todos los ejemplos completados");
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
