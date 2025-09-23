/**
 * LlamaIndex Agent Workflows - Ejemplos Creativos y Accesibles
 *
 * Este archivo demuestra casos de uso familiares para el público mexicano
 * usando situaciones cotidianas que todos pueden entender.
 */

import { procesarPedidoTaqueria } from "./taqueria-workflow";
import { gestionarMicroNegocio } from "./micronegocio-workflow";
import { procesarCalificacionesEstudiante } from "./escuela-workflow";

/**
 * Función principal que ejecuta todos los ejemplos creativos
 */
async function runEjemplosCreativos() {
  console.log("🚀 LlamaIndex Agent Workflows - Ejemplos Creativos Mexicanos\n");
  console.log("=".repeat(60));

  try {
    // Ejemplo 1: Taquería - Sistema de Pedidos
    console.log("\n🌮 EJEMPLO 1: Sistema de Pedidos de Taquería");
    console.log("-".repeat(40));

    await procesarPedidoTaqueria(
      "Doña María",
      "Quiero 4 tacos de pastor, 2 quesadillas de queso y un agua de horchata",
      "55-1234-5678"
    );

    console.log("\n" + "=".repeat(60));

    // Ejemplo 2: Micro Negocio - Emprendimiento desde Casa
    console.log("\n🏠 EJEMPLO 2: Micro Negocio desde Casa");
    console.log("-".repeat(40));

    await gestionarMicroNegocio(
      "Comadre Lupita",
      "Hola! Necesito 10 tamales y 2 pulseras tejidas para el sábado",
      "whatsapp",
      "55-1234-5678"
    );

    console.log("\n" + "=".repeat(60));

    // Ejemplo 3: Escuela - Sistema de Calificaciones
    console.log("\n📚 EJEMPLO 3: Sistema Escolar de Calificaciones");
    console.log("-".repeat(40));

    await procesarCalificacionesEstudiante(
      "Ana Sofía Hernández",
      "5° Grado",
      "Segundo Bimestre",
      {
        español: { tareas: [9, 8, 9, 10], participacion: 9, examen: 8 },
        matemáticas: { tareas: [8, 9, 7, 8], participacion: 8, examen: 9 },
        "ciencias naturales": {
          tareas: [10, 9, 9],
          participacion: 9,
          examen: 9,
        },
        historia: { tareas: [8, 8, 9], participacion: 7, examen: 8 },
      }
    );

    console.log("\n" + "=".repeat(60));
    console.log("\n🎉 ¡Todos los ejemplos completados exitosamente!");

    console.log("\n🌟 CASOS DE USO DEMOSTRADOS:");
    console.log("🌮 Taquería: Procesamiento de pedidos con IA");
    console.log("🏠 Micro Negocio: Gestión integral de emprendimiento");
    console.log("📚 Escuela: Análisis de calificaciones y reportes");

    console.log("\n💡 CONCEPTOS DE WORKFLOWS APRENDIDOS:");
    console.log("• Procesamiento de lenguaje natural (pedidos, listas)");
    console.log("• Validación de datos y reglas de negocio");
    console.log("• Cálculos automáticos y análisis");
    console.log("• Generación de reportes personalizados");
    console.log("• Integración con sistemas de comunicación");

    console.log("\n🎯 PRÓXIMOS PASOS:");
    console.log("- Adapta estos ejemplos a tu propio negocio");
    console.log("- Experimenta con diferentes tipos de datos");
    console.log("- Agrega más pasos a los workflows");
    console.log("- Integra con APIs reales (WhatsApp, email, etc.)");
  } catch (error) {
    console.error("\n❌ Error ejecutando ejemplos:", error);
    process.exit(1);
  }
}

/**
 * Ejemplos individuales para ejecución selectiva
 */
export const ejemplos = {
  taqueria: procesarPedidoTaqueria,
  micronegocio: gestionarMicroNegocio,
  escuela: procesarCalificacionesEstudiante,
};

/**
 * Interfaz CLI para ejecutar ejemplos específicos
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await runEjemplosCreativos();
    return;
  }

  const comando = args[0];

  switch (comando) {
    case "taqueria":
      console.log("🌮 Ejecutando ejemplo de taquería...");
      await procesarPedidoTaqueria(
        "Cliente Ejemplo",
        args[1] || "Quiero 2 tacos de carnitas y un agua de jamaica",
        "55-0000-0000"
      );
      break;

    case "micronegocio":
      console.log("🏠 Ejecutando ejemplo de micro negocio...");
      await gestionarMicroNegocio(
        "Cliente Ejemplo",
        args[1] || "Quiero 5 tamales y 1 pulsera tejida",
        "whatsapp",
        "55-0000-0000"
      );
      break;

    case "escuela":
      console.log("📚 Ejecutando ejemplo escolar...");
      await procesarCalificacionesEstudiante(
        "Estudiante Ejemplo",
        "4° Grado",
        "Primer Bimestre",
        {
          español: { tareas: [8, 9, 8], participacion: 8, examen: 8 },
          matemáticas: { tareas: [7, 8, 7], participacion: 7, examen: 8 },
        }
      );
      break;

    case "help":
      console.log("🚀 LlamaIndex Agent Workflows - Ejemplos Creativos");
      console.log("\nComandos disponibles:");
      console.log(
        "  npm run dev                    - Ejecutar todos los ejemplos"
      );
      console.log("  npm run dev taqueria [pedido]  - Ejemplo de taquería");
      console.log(
        "  npm run dev micronegocio [pedido] - Ejemplo de micro negocio"
      );
      console.log("  npm run dev escuela            - Ejemplo escolar");
      console.log("  npm run dev help               - Mostrar esta ayuda");
      console.log("\nEjemplos:");
      console.log('  npm run dev taqueria "3 tacos de pastor"');
      console.log('  npm run dev micronegocio "10 tamales y 2 pulseras"');
      console.log("  npm run dev escuela");
      break;

    default:
      console.log(`❌ Comando desconocido: ${comando}`);
      console.log("   Usa 'npm run dev help' para ver comandos disponibles");
  }
}

// Ejecutar si este archivo se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

export { runEjemplosCreativos };
