/**
 * Ejemplo Creativo: Gestión de Micro Negocio
 *
 * Este ejemplo usa un caso muy familiar para emprendedores mexicanos:
 * automatizar la gestión de un micro negocio desde casa
 * (venta de productos caseros, servicios, etc.)
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Eventos del workflow de micro negocio
export class PedidoMicroNegocioEvent extends WorkflowEvent<{
  cliente: string;
  productos: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
    categoria: "comida" | "artesania" | "servicio" | "ropa";
  }>;
  contacto: string;
  fechaEntrega?: string;
}> {}

export class InventarioRevisadoEvent extends WorkflowEvent<{
  pedido: any;
  disponible: boolean;
  productosConfirmados: any[];
  productosNoDisponibles: string[];
  total: number;
  tiempoPreparacion: number;
}> {}

export class PedidoConfirmadoEvent extends WorkflowEvent<{
  pedido: any;
  metodoPago: "efectivo" | "transferencia" | "tarjeta";
  anticipo?: number;
  fechaEntrega: string;
  instruccionesEspeciales?: string;
}> {}

/**
 * Workflow para Gestión de Micro Negocio
 *
 * Casos familiares para emprendedores:
 * - Recibir pedidos por redes sociales
 * - Gestionar inventario casero
 * - Calcular costos y ganancias
 * - Coordinar entregas y pagos
 */
export class MicroNegocioWorkflow extends Workflow {
  private catalogo = {
    // Comida casera
    tamales: {
      precio: 25,
      stock: 20,
      tiempoPrep: 120,
      categoria: "comida",
      ingredientes: ["masa", "relleno", "hoja"],
    },
    pozole: {
      precio: 80,
      stock: 10,
      tiempoPrep: 180,
      categoria: "comida",
      ingredientes: ["maíz", "carne", "chile"],
    },
    quesadillas: {
      precio: 15,
      stock: 30,
      tiempoPrep: 15,
      categoria: "comida",
      ingredientes: ["tortilla", "queso"],
    },
    "agua fresca": {
      precio: 20,
      stock: 15,
      tiempoPrep: 30,
      categoria: "comida",
      ingredientes: ["fruta", "agua", "azúcar"],
    },

    // Artesanías
    "pulsera tejida": {
      precio: 50,
      stock: 25,
      tiempoPrep: 60,
      categoria: "artesania",
      ingredientes: ["hilo", "chaquira"],
    },
    "llavero bordado": {
      precio: 35,
      stock: 40,
      tiempoPrep: 45,
      categoria: "artesania",
      ingredientes: ["tela", "hilo"],
    },
    "bolsa tejida": {
      precio: 150,
      stock: 8,
      tiempoPrep: 240,
      categoria: "artesania",
      ingredientes: ["estambre", "forro"],
    },

    // Servicios
    "arreglo de ropa": {
      precio: 80,
      stock: 999,
      tiempoPrep: 60,
      categoria: "servicio",
      ingredientes: ["hilo", "tiempo"],
    },
    planchado: {
      precio: 15,
      stock: 999,
      tiempoPrep: 10,
      categoria: "servicio",
      ingredientes: ["tiempo"],
    },

    // Ropa
    "playera bordada": {
      precio: 200,
      stock: 12,
      tiempoPrep: 180,
      categoria: "ropa",
      ingredientes: ["playera", "hilo"],
    },
    delantal: {
      precio: 120,
      stock: 15,
      tiempoPrep: 120,
      categoria: "ropa",
      ingredientes: ["tela", "hilo"],
    },
  };

  private clientesFrecuentes = new Map([
    ["Comadre Lupita", { descuento: 0.1, pedidos: 15 }],
    ["Vecina Carmen", { descuento: 0.05, pedidos: 8 }],
    ["Doña Rosa", { descuento: 0.15, pedidos: 25 }],
  ]);

  private costosFijos = {
    luz: 500,
    gas: 300,
    materiales: 800,
    transporte: 200,
  };

  /**
   * Paso 1: Recibir pedido por redes sociales
   */
  @step()
  async recibirPedidoRedes(
    ev: StartEvent<{
      cliente: string;
      mensaje: string; // "Hola! Quiero 10 tamales y 2 aguas frescas para mañana"
      plataforma: "whatsapp" | "facebook" | "instagram";
      contacto: string;
    }>
  ) {
    console.log(
      `📱 Nuevo pedido por ${ev.data.plataforma} de ${ev.data.cliente}`
    );
    console.log(`💬 "${ev.data.mensaje}"`);

    // Procesar mensaje usando IA (simulado)
    const productos = this.procesarMensajePedido(ev.data.mensaje);

    if (productos.length === 0) {
      console.log("❓ No se pudo entender el pedido");
      return new StopEvent({
        error:
          "Hola! No entendí bien tu pedido. ¿Me puedes decir qué productos necesitas y para cuándo? 😊",
      });
    }

    // Detectar fecha de entrega
    const fechaEntrega = this.detectarFechaEntrega(ev.data.mensaje);

    console.log(`✅ Pedido procesado: ${productos.length} productos`);
    console.log(`📅 Fecha de entrega: ${fechaEntrega}`);

    return new PedidoMicroNegocioEvent({
      cliente: ev.data.cliente,
      productos,
      contacto: ev.data.contacto,
      fechaEntrega,
    });
  }

  /**
   * Paso 2: Revisar inventario y disponibilidad
   */
  @step()
  async revisarInventario(ev: PedidoMicroNegocioEvent) {
    console.log(`🔍 Revisando disponibilidad para ${ev.data.cliente}...`);

    const productosConfirmados = [];
    const productosNoDisponibles = [];
    let total = 0;
    let tiempoMaximo = 0;

    for (const producto of ev.data.productos) {
      const item = this.catalogo[producto.nombre as keyof typeof this.catalogo];

      if (!item) {
        productosNoDisponibles.push(`${producto.nombre} (no lo manejamos)`);
        console.log(`❌ No manejamos: ${producto.nombre}`);
        continue;
      }

      if (item.stock < producto.cantidad) {
        productosNoDisponibles.push(
          `${producto.nombre} (solo tenemos ${item.stock})`
        );
        console.log(
          `❌ Stock insuficiente: ${producto.nombre} (necesita ${producto.cantidad}, tenemos ${item.stock})`
        );
        continue;
      }

      const subtotal = item.precio * producto.cantidad;
      productosConfirmados.push({
        ...producto,
        precio: item.precio,
        subtotal,
        categoria: item.categoria,
        tiempoPrep: item.tiempoPrep,
      });

      total += subtotal;
      tiempoMaximo = Math.max(
        tiempoMaximo,
        item.tiempoPrep * producto.cantidad
      );

      console.log(
        `✅ ${producto.nombre}: ${producto.cantidad} x $${item.precio} = $${subtotal}`
      );
    }

    const disponible = productosConfirmados.length > 0;

    console.log(`💰 Total: $${total} pesos`);
    console.log(
      `⏱️ Tiempo de preparación: ${Math.round(tiempoMaximo / 60)} horas`
    );

    return new InventarioRevisadoEvent({
      pedido: ev.data,
      disponible,
      productosConfirmados,
      productosNoDisponibles,
      total,
      tiempoPreparacion: tiempoMaximo,
    });
  }

  /**
   * Paso 3: Confirmar pedido y condiciones
   */
  @step()
  async confirmarPedido(ev: InventarioRevisadoEvent) {
    if (!ev.data.disponible) {
      console.log("❌ Pedido no disponible");

      let mensaje = `Hola ${ev.data.pedido.cliente}! 😔\n\n`;
      mensaje += "Lamentablemente no puedo completar tu pedido:\n";
      ev.data.productosNoDisponibles.forEach((prod) => {
        mensaje += `• ${prod}\n`;
      });
      mensaje += "\n¿Te interesa algo más de mi catálogo? 😊";

      return new StopEvent({
        success: false,
        mensaje,
      });
    }

    console.log(`✅ Confirmando pedido de ${ev.data.pedido.cliente}`);

    // Aplicar descuentos por cliente frecuente
    let total = ev.data.total;
    let descuentoAplicado = 0;

    const clienteInfo = this.clientesFrecuentes.get(ev.data.pedido.cliente);
    if (clienteInfo) {
      descuentoAplicado = total * clienteInfo.descuento;
      total -= descuentoAplicado;
      console.log(
        `🎉 Descuento cliente frecuente: -$${descuentoAplicado.toFixed(2)}`
      );
    }

    // Determinar método de pago sugerido
    const metodoPago = total > 200 ? "transferencia" : "efectivo";
    const anticipo = total > 300 ? Math.round(total * 0.5) : 0;

    // Calcular fecha de entrega realista
    const fechaEntrega = this.calcularFechaEntrega(
      ev.data.pedido.fechaEntrega,
      ev.data.tiempoPreparacion
    );

    console.log(`💳 Método de pago sugerido: ${metodoPago}`);
    if (anticipo > 0) {
      console.log(`💰 Anticipo sugerido: $${anticipo} pesos`);
    }
    console.log(`📅 Fecha de entrega: ${fechaEntrega}`);

    return new PedidoConfirmadoEvent({
      pedido: {
        ...ev.data.pedido,
        productos: ev.data.productosConfirmados,
        total,
        descuento: descuentoAplicado,
      },
      metodoPago,
      anticipo,
      fechaEntrega,
    });
  }

  /**
   * Paso 4: Generar confirmación y actualizar registros
   */
  @step()
  async finalizarPedido(ev: PedidoConfirmadoEvent) {
    console.log(`📋 Finalizando pedido de ${ev.data.pedido.cliente}...`);

    // Actualizar inventario
    this.actualizarInventario(ev.data.pedido.productos);

    // Calcular ganancia estimada
    const costoProduccion = this.calcularCostoProduccion(
      ev.data.pedido.productos
    );
    const ganancia = ev.data.pedido.total - costoProduccion;

    // Generar mensaje de confirmación
    const mensajeConfirmacion = this.generarMensajeConfirmacion(ev.data);

    // Actualizar registro de cliente
    this.actualizarRegistroCliente(ev.data.pedido.cliente);

    console.log(`💰 Costo de producción: $${costoProduccion}`);
    console.log(`💚 Ganancia estimada: $${ganancia}`);
    console.log(`✅ Pedido registrado exitosamente`);

    return new StopEvent({
      success: true,
      pedido: ev.data.pedido,
      confirmacion: mensajeConfirmacion,
      analisis: {
        costoProduccion,
        ganancia,
        margenGanancia: Math.round((ganancia / ev.data.pedido.total) * 100),
        fechaEntrega: ev.data.fechaEntrega,
      },
    });
  }

  // Métodos auxiliares

  private procesarMensajePedido(mensaje: string) {
    const productos = [];
    const texto = mensaje.toLowerCase();

    // Mapear productos del catálogo
    const productosDisponibles = Object.keys(this.catalogo);

    for (const producto of productosDisponibles) {
      // Buscar menciones del producto
      const regex = new RegExp(`(\\d+)\\s*${producto}s?`, "gi");
      const match = texto.match(regex);

      if (match) {
        const cantidad = parseInt(match[0].match(/\d+/)?.[0] || "1");
        productos.push({
          nombre: producto,
          cantidad,
          precio: this.catalogo[producto as keyof typeof this.catalogo].precio,
          categoria:
            this.catalogo[producto as keyof typeof this.catalogo].categoria,
        });
      } else if (texto.includes(producto)) {
        // Si se menciona sin cantidad, asumir 1
        productos.push({
          nombre: producto,
          cantidad: 1,
          precio: this.catalogo[producto as keyof typeof this.catalogo].precio,
          categoria:
            this.catalogo[producto as keyof typeof this.catalogo].categoria,
        });
      }
    }

    return productos;
  }

  private detectarFechaEntrega(mensaje: string): string {
    const texto = mensaje.toLowerCase();
    const hoy = new Date();

    if (texto.includes("hoy") || texto.includes("ahorita")) {
      return "Hoy";
    }

    if (texto.includes("mañana")) {
      const mañana = new Date(hoy);
      mañana.setDate(hoy.getDate() + 1);
      return "Mañana";
    }

    if (texto.includes("pasado mañana")) {
      const pasado = new Date(hoy);
      pasado.setDate(hoy.getDate() + 2);
      return "Pasado mañana";
    }

    // Detectar días de la semana
    const dias = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    for (const dia of dias) {
      if (texto.includes(dia)) {
        return `El ${dia}`;
      }
    }

    return "A coordinar";
  }

  private calcularFechaEntrega(
    fechaSolicitada: string | undefined,
    tiempoPrep: number
  ): string {
    const horasNecesarias = Math.ceil(tiempoPrep / 60);

    if (fechaSolicitada === "Hoy" && horasNecesarias > 4) {
      return "Mañana (necesita más tiempo de preparación)";
    }

    if (fechaSolicitada === "Mañana" && horasNecesarias > 8) {
      return "Pasado mañana (necesita más tiempo de preparación)";
    }

    return fechaSolicitada || "A coordinar";
  }

  private actualizarInventario(productos: any[]) {
    for (const producto of productos) {
      const item = this.catalogo[producto.nombre as keyof typeof this.catalogo];
      if (item && item.stock !== 999) {
        // 999 = stock ilimitado para servicios
        item.stock -= producto.cantidad;
        console.log(`📦 ${producto.nombre}: quedan ${item.stock} unidades`);
      }
    }
  }

  private calcularCostoProduccion(productos: any[]): number {
    let costoTotal = 0;

    for (const producto of productos) {
      // Estimar costo como 40% del precio de venta
      const costoUnitario = producto.precio * 0.4;
      costoTotal += costoUnitario * producto.cantidad;
    }

    // Agregar proporción de costos fijos
    const proporcionCostosFijos =
      Object.values(this.costosFijos).reduce((a, b) => a + b, 0) / 100; // Por cada 100 pesos de venta
    costoTotal +=
      (productos.reduce((sum, p) => sum + p.subtotal, 0) / 100) *
      proporcionCostosFijos;

    return Math.round(costoTotal);
  }

  private actualizarRegistroCliente(cliente: string) {
    const registro = this.clientesFrecuentes.get(cliente);
    if (registro) {
      registro.pedidos += 1;
      // Aumentar descuento cada 10 pedidos
      if (registro.pedidos % 10 === 0 && registro.descuento < 0.2) {
        registro.descuento += 0.05;
        console.log(
          `🎉 ${cliente} ahora tiene ${registro.descuento * 100}% de descuento!`
        );
      }
    } else {
      this.clientesFrecuentes.set(cliente, { descuento: 0, pedidos: 1 });
    }
  }

  private generarMensajeConfirmacion(data: any): string {
    const { pedido, metodoPago, anticipo, fechaEntrega } = data;

    let mensaje = `¡Hola ${pedido.cliente}! 😊\n\n`;
    mensaje += `✅ *PEDIDO CONFIRMADO*\n\n`;

    mensaje += `📋 *Tu pedido:*\n`;
    pedido.productos.forEach((prod: any) => {
      mensaje += `• ${prod.cantidad} ${prod.nombre} - $${prod.subtotal}\n`;
    });

    if (pedido.descuento > 0) {
      mensaje += `\n🎁 Descuento cliente frecuente: -$${pedido.descuento.toFixed(
        2
      )}\n`;
    }

    mensaje += `\n💰 *Total: $${pedido.total} pesos*\n`;
    mensaje += `📅 *Entrega: ${fechaEntrega}*\n`;
    mensaje += `💳 *Pago: ${metodoPago}*\n`;

    if (anticipo > 0) {
      mensaje += `💵 *Anticipo: $${anticipo} pesos*\n`;
    }

    mensaje += `\n¡Gracias por tu confianza! 🙏\n`;
    mensaje += `Cualquier duda me escribes 📱`;

    return mensaje;
  }
}

/**
 * Función de uso del workflow
 */
export async function gestionarMicroNegocio(
  cliente: string,
  mensaje: string,
  plataforma: "whatsapp" | "facebook" | "instagram",
  contacto: string
) {
  console.log(`🏠 MICRO NEGOCIO "HECHOS EN CASA"`);
  console.log("=".repeat(50));

  const workflow = new MicroNegocioWorkflow();

  try {
    const result = await workflow.run({
      cliente,
      mensaje,
      plataforma,
      contacto,
    });

    if (result.data.success) {
      console.log("\n🎉 ¡PEDIDO PROCESADO EXITOSAMENTE!");
      console.log(`👤 Cliente: ${result.data.pedido.cliente}`);
      console.log(`📦 Productos: ${result.data.pedido.productos.length}`);
      console.log(`💰 Total: $${result.data.pedido.total} pesos`);
      console.log(
        `💚 Ganancia: $${result.data.analisis.ganancia} pesos (${result.data.analisis.margenGanancia}%)`
      );
      console.log(`📅 Entrega: ${result.data.analisis.fechaEntrega}`);

      console.log("\n📱 MENSAJE DE CONFIRMACIÓN:");
      console.log(result.data.confirmacion);
    } else {
      console.log("\n❌ No se pudo procesar el pedido");
      console.log(`💬 ${result.data.mensaje}`);
    }

    return result.data;
  } catch (error) {
    console.error(`❌ Error gestionando pedido: ${error}`);
    throw error;
  }
}

// Ejemplos de uso
if (require.main === module) {
  console.log("🚀 Probando el micro negocio...\n");

  // Ejemplo 1: Pedido de comida casera
  gestionarMicroNegocio(
    "Comadre Lupita",
    "Hola! Necesito 15 tamales y 3 aguas frescas para mañana, es para una reunión familiar",
    "whatsapp",
    "55-1234-5678"
  )
    .then(() => {
      console.log("\n" + "=".repeat(50));

      // Ejemplo 2: Pedido de artesanías
      return gestionarMicroNegocio(
        "Cliente Nuevo",
        "Me interesan 5 pulseras tejidas y 2 bolsas tejidas para el fin de semana",
        "facebook",
        "cliente@email.com"
      );
    })
    .then(() => {
      console.log("\n" + "=".repeat(50));

      // Ejemplo 3: Pedido de servicios
      return gestionarMicroNegocio(
        "Vecina Carmen",
        "Hola! Necesito arreglo de 3 pantalones y planchado de 10 camisas para el viernes",
        "whatsapp",
        "55-9876-5432"
      );
    })
    .then(() => {
      console.log("\n✅ Todos los ejemplos del micro negocio completados");
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
