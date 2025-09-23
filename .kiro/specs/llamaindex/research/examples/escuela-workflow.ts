/**
 * Ejemplo Creativo: Sistema de Calificaciones Escolares
 *
 * Este ejemplo usa un caso muy familiar: automatizar
 * el cálculo de calificaciones y generar reportes
 * para padres de familia.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Eventos del workflow escolar
export class CalificacionesRecibidasEvent extends WorkflowEvent<{
  estudiante: string;
  grado: string;
  materias: Array<{
    materia: string;
    calificaciones: number[];
    tareas: number;
    participacion: number;
    examen: number;
  }>;
}> {}

export class PromediosCalculadosEvent extends WorkflowEvent<{
  estudiante: string;
  resultados: Array<{
    materia: string;
    promedio: number;
    estado: "excelente" | "muy bien" | "bien" | "regular" | "necesita apoyo";
    comentarios: string[];
  }>;
  promedioGeneral: number;
}> {}

export class ReporteGeneradoEvent extends WorkflowEvent<{
  estudiante: string;
  reporte: {
    resumen: any;
    recomendaciones: string[];
    reconocimientos: string[];
    areasAMejorar: string[];
  };
}> {}

/**
 * Workflow para Sistema de Calificaciones Escolares
 *
 * Casos familiares:
 * - Recibir calificaciones de diferentes materias
 * - Calcular promedios y estados académicos
 * - Generar reportes para padres
 * - Dar recomendaciones personalizadas
 */
export class EscuelaWorkflow extends Workflow {
  private materiasPrimaria = {
    español: { peso: 1.2, minimo: 6 },
    matemáticas: { peso: 1.2, minimo: 6 },
    "ciencias naturales": { peso: 1.0, minimo: 6 },
    historia: { peso: 1.0, minimo: 6 },
    geografía: { peso: 1.0, minimo: 6 },
    "formación cívica": { peso: 0.8, minimo: 6 },
    "educación física": { peso: 0.8, minimo: 6 },
    "educación artística": { peso: 0.8, minimo: 6 },
  };

  private frasesMotivaciónales = [
    "¡Sigue así, vas muy bien! 🌟",
    "Tu esfuerzo se nota, ¡felicidades! 👏",
    "Eres un estudiante ejemplar 📚",
    "¡Qué orgullo verte crecer! 🎉",
    "Tu dedicación es admirable 💪",
  ];

  private frasesApoyo = [
    "Sabemos que puedes mejorar, ¡tú puedes! 💪",
    "Con un poquito más de esfuerzo lo lograrás 🌱",
    "Todos aprendemos a nuestro ritmo, ¡sigue adelante! 🚀",
    "Tu maestra está aquí para apoyarte 👩‍🏫",
    "Cada día es una oportunidad para mejorar ☀️",
  ];

  /**
   * Paso 1: Recibir calificaciones del estudiante
   */
  @step()
  async recibirCalificaciones(
    ev: StartEvent<{
      estudiante: string;
      grado: string;
      periodo: string; // "Primer Bimestre", "Segundo Bimestre", etc.
      calificacionesPorMateria: Record<
        string,
        {
          tareas: number[];
          participacion: number;
          examen: number;
        }
      >;
    }>
  ) {
    console.log(`📚 Procesando calificaciones de ${ev.data.estudiante}`);
    console.log(`🎓 Grado: ${ev.data.grado} - ${ev.data.periodo}`);

    const materias = [];

    for (const [materia, datos] of Object.entries(
      ev.data.calificacionesPorMateria
    )) {
      // Validar que la materia existe en el plan de estudios
      if (!(materia in this.materiasPrimaria)) {
        console.log(`⚠️ Materia no reconocida: ${materia}`);
        continue;
      }

      // Calcular promedio de tareas
      const promedioTareas =
        datos.tareas.length > 0
          ? datos.tareas.reduce((sum, cal) => sum + cal, 0) /
            datos.tareas.length
          : 0;

      materias.push({
        materia,
        calificaciones: datos.tareas,
        tareas: Math.round(promedioTareas * 10) / 10,
        participacion: datos.participacion,
        examen: datos.examen,
      });

      console.log(
        `📖 ${materia}: Tareas=${promedioTareas.toFixed(1)}, Participación=${
          datos.participacion
        }, Examen=${datos.examen}`
      );
    }

    if (materias.length === 0) {
      return new StopEvent({
        error: "No se encontraron materias válidas para procesar",
      });
    }

    return new CalificacionesRecibidasEvent({
      estudiante: ev.data.estudiante,
      grado: ev.data.grado,
      materias,
    });
  }

  /**
   * Paso 2: Calcular promedios y estados académicos
   */
  @step()
  async calcularPromedios(ev: CalificacionesRecibidasEvent) {
    console.log(`🧮 Calculando promedios para ${ev.data.estudiante}...`);

    const resultados = [];
    let sumaPromedios = 0;
    let sumaPesos = 0;

    for (const materia of ev.data.materias) {
      // Calcular promedio de la materia (40% tareas, 30% participación, 30% examen)
      const promedio =
        materia.tareas * 0.4 +
        materia.participacion * 0.3 +
        materia.examen * 0.3;
      const promedioRedondeado = Math.round(promedio * 10) / 10;

      // Determinar estado académico
      const estado = this.determinarEstado(promedioRedondeado);

      // Generar comentarios específicos
      const comentarios = this.generarComentarios(
        materia.materia,
        promedioRedondeado,
        materia
      );

      resultados.push({
        materia: materia.materia,
        promedio: promedioRedondeado,
        estado,
        comentarios,
      });

      // Para promedio general ponderado
      const pesoMateria =
        this.materiasPrimaria[
          materia.materia as keyof typeof this.materiasPrimaria
        ].peso;
      sumaPromedios += promedioRedondeado * pesoMateria;
      sumaPesos += pesoMateria;

      console.log(`📊 ${materia.materia}: ${promedioRedondeado} (${estado})`);
    }

    const promedioGeneral = Math.round((sumaPromedios / sumaPesos) * 10) / 10;
    console.log(`🎯 Promedio general: ${promedioGeneral}`);

    return new PromediosCalculadosEvent({
      estudiante: ev.data.estudiante,
      resultados,
      promedioGeneral,
    });
  }

  /**
   * Paso 3: Generar reporte personalizado
   */
  @step()
  async generarReporte(ev: PromediosCalculadosEvent) {
    console.log(`📋 Generando reporte para ${ev.data.estudiante}...`);

    const { estudiante, resultados, promedioGeneral } = ev.data;

    // Analizar fortalezas y áreas de oportunidad
    const materiasExcelentes = resultados.filter(
      (r) => r.estado === "excelente"
    );
    const materiasBuenas = resultados.filter(
      (r) => r.estado === "muy bien" || r.estado === "bien"
    );
    const materiasRegulares = resultados.filter((r) => r.estado === "regular");
    const materiasNecesitanApoyo = resultados.filter(
      (r) => r.estado === "necesita apoyo"
    );

    // Generar reconocimientos
    const reconocimientos = this.generarReconocimientos(
      materiasExcelentes,
      materiasBuenas
    );

    // Generar recomendaciones
    const recomendaciones = this.generarRecomendaciones(
      materiasRegulares,
      materiasNecesitanApoyo,
      promedioGeneral
    );

    // Identificar áreas a mejorar
    const areasAMejorar = this.identificarAreasAMejorar(resultados);

    const resumen = {
      promedioGeneral,
      totalMaterias: resultados.length,
      materiasExcelentes: materiasExcelentes.length,
      materiasBuenas: materiasBuenas.length,
      materiasRegulares: materiasRegulares.length,
      materiasNecesitanApoyo: materiasNecesitanApoyo.length,
      estadoGeneral: this.determinarEstado(promedioGeneral),
    };

    console.log(
      `✅ Reporte generado - Estado general: ${resumen.estadoGeneral}`
    );

    return new ReporteGeneradoEvent({
      estudiante,
      reporte: {
        resumen,
        reconocimientos,
        recomendaciones,
        areasAMejorar,
      },
    });
  }

  /**
   * Paso 4: Finalizar y enviar reporte a padres
   */
  @step()
  async enviarReportePadres(ev: ReporteGeneradoEvent) {
    console.log(
      `📧 Preparando reporte para enviar a padres de ${ev.data.estudiante}...`
    );

    const reporteFormateado = this.formatearReporteParaPadres(
      ev.data.estudiante,
      ev.data.reporte
    );

    // Simular envío por WhatsApp o email
    await this.simularEnvioReporte(reporteFormateado);

    console.log(`✅ Reporte enviado exitosamente`);

    return new StopEvent({
      success: true,
      estudiante: ev.data.estudiante,
      reporte: ev.data.reporte,
      mensaje: "Reporte académico generado y enviado a los padres de familia",
    });
  }

  // Métodos auxiliares

  private determinarEstado(
    promedio: number
  ): "excelente" | "muy bien" | "bien" | "regular" | "necesita apoyo" {
    if (promedio >= 9.0) return "excelente";
    if (promedio >= 8.0) return "muy bien";
    if (promedio >= 7.0) return "bien";
    if (promedio >= 6.0) return "regular";
    return "necesita apoyo";
  }

  private generarComentarios(
    materia: string,
    promedio: number,
    datos: any
  ): string[] {
    const comentarios = [];

    // Comentarios específicos por materia
    if (materia === "matemáticas") {
      if (promedio >= 8.5) {
        comentarios.push("Excelente razonamiento matemático");
      } else if (promedio < 7.0) {
        comentarios.push(
          "Recomendamos práctica adicional con operaciones básicas"
        );
      }
    }

    if (materia === "español") {
      if (datos.participacion >= 9.0) {
        comentarios.push("Muy buena participación en clase");
      }
      if (promedio >= 8.5) {
        comentarios.push("Excelente comprensión lectora");
      }
    }

    // Comentarios generales basados en componentes
    if (datos.tareas < 7.0) {
      comentarios.push("Necesita entregar tareas más consistentemente");
    }

    if (datos.participacion >= 9.0) {
      comentarios.push("Participa activamente en clase");
    }

    if (datos.examen >= 9.0) {
      comentarios.push("Excelente desempeño en evaluaciones");
    }

    return comentarios;
  }

  private generarReconocimientos(excelentes: any[], buenas: any[]): string[] {
    const reconocimientos = [];

    if (excelentes.length > 0) {
      const materias = excelentes.map((m) => m.materia).join(", ");
      reconocimientos.push(`🌟 Excelente desempeño en: ${materias}`);

      if (excelentes.length >= 3) {
        reconocimientos.push(
          this.frasesMotivaciónales[
            Math.floor(Math.random() * this.frasesMotivaciónales.length)
          ]
        );
      }
    }

    if (buenas.length > 0) {
      reconocimientos.push(`👏 Buen trabajo en ${buenas.length} materias`);
    }

    return reconocimientos;
  }

  private generarRecomendaciones(
    regulares: any[],
    necesitanApoyo: any[],
    promedioGeneral: number
  ): string[] {
    const recomendaciones = [];

    if (necesitanApoyo.length > 0) {
      const materias = necesitanApoyo.map((m) => m.materia).join(", ");
      recomendaciones.push(`📚 Reforzar conocimientos en: ${materias}`);
      recomendaciones.push("👨‍👩‍👧‍👦 Recomendamos apoyo adicional en casa");
      recomendaciones.push(
        this.frasesApoyo[Math.floor(Math.random() * this.frasesApoyo.length)]
      );
    }

    if (regulares.length > 0) {
      recomendaciones.push("📖 Dedicar más tiempo al estudio diario");
    }

    if (promedioGeneral >= 8.5) {
      recomendaciones.push("🎯 ¡Sigue así! Estás en el camino correcto");
    } else if (promedioGeneral < 7.0) {
      recomendaciones.push("⏰ Establecer horarios fijos de estudio");
      recomendaciones.push(
        "🤝 Solicitar apoyo de la maestra cuando sea necesario"
      );
    }

    return recomendaciones;
  }

  private identificarAreasAMejorar(resultados: any[]): string[] {
    const areas = [];

    // Identificar patrones en los componentes de calificación
    const tareasBasas = resultados.filter(
      (r) =>
        r.promedio < 7.0 &&
        r.comentarios.some((c: string) => c.includes("tareas"))
    );
    const participacionBaja = resultados.filter((r) =>
      r.comentarios.some((c: string) => c.includes("participación"))
    );

    if (tareasBasas.length > 0) {
      areas.push("Entrega puntual de tareas");
    }

    if (participacionBaja.length === 0) {
      // Si no hay comentarios de buena participación
      areas.push("Participación en clase");
    }

    // Áreas específicas por materia
    const matematicasBaja = resultados.find(
      (r) => r.materia === "matemáticas" && r.promedio < 7.0
    );
    if (matematicasBaja) {
      areas.push("Razonamiento matemático");
    }

    const españolBajo = resultados.find(
      (r) => r.materia === "español" && r.promedio < 7.0
    );
    if (españolBajo) {
      areas.push("Comprensión lectora");
    }

    return areas;
  }

  private formatearReporteParaPadres(estudiante: string, reporte: any): string {
    const { resumen, reconocimientos, recomendaciones, areasAMejorar } =
      reporte;

    let mensaje = `📚 REPORTE ACADÉMICO - ${estudiante.toUpperCase()}\n`;
    mensaje += `${"=".repeat(40)}\n\n`;

    mensaje += `📊 RESUMEN GENERAL:\n`;
    mensaje += `• Promedio General: ${resumen.promedioGeneral} (${resumen.estadoGeneral})\n`;
    mensaje += `• Total de Materias: ${resumen.totalMaterias}\n`;
    mensaje += `• Materias Excelentes: ${resumen.materiasExcelentes}\n`;
    mensaje += `• Materias Buenas: ${resumen.materiasBuenas}\n`;

    if (resumen.materiasNecesitanApoyo > 0) {
      mensaje += `• Materias que Necesitan Apoyo: ${resumen.materiasNecesitanApoyo}\n`;
    }

    if (reconocimientos.length > 0) {
      mensaje += `\n🎉 RECONOCIMIENTOS:\n`;
      reconocimientos.forEach((rec: string) => {
        mensaje += `• ${rec}\n`;
      });
    }

    if (recomendaciones.length > 0) {
      mensaje += `\n💡 RECOMENDACIONES:\n`;
      recomendaciones.forEach((rec: string) => {
        mensaje += `• ${rec}\n`;
      });
    }

    if (areasAMejorar.length > 0) {
      mensaje += `\n🎯 ÁREAS A MEJORAR:\n`;
      areasAMejorar.forEach((area: string) => {
        mensaje += `• ${area}\n`;
      });
    }

    mensaje += `\n👩‍🏫 Cualquier duda, estamos aquí para apoyar a ${estudiante}.\n`;
    mensaje += `📞 Escuela Primaria "Benito Juárez"`;

    return mensaje;
  }

  private async simularEnvioReporte(reporte: string) {
    console.log(`📱 Enviando reporte por WhatsApp...`);
    console.log(reporte);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Función de uso del workflow
 */
export async function procesarCalificacionesEstudiante(
  estudiante: string,
  grado: string,
  periodo: string,
  calificaciones: Record<
    string,
    { tareas: number[]; participacion: number; examen: number }
  >
) {
  console.log(`🏫 ESCUELA PRIMARIA "BENITO JUÁREZ"`);
  console.log("=".repeat(50));

  const workflow = new EscuelaWorkflow();

  try {
    const result = await workflow.run({
      estudiante,
      grado,
      periodo,
      calificacionesPorMateria: calificaciones,
    });

    if (result.data.success) {
      console.log(
        `\n🎉 Reporte generado exitosamente para ${result.data.estudiante}`
      );
      console.log(
        `📊 Promedio general: ${result.data.reporte.resumen.promedioGeneral}`
      );
      console.log(`🎯 Estado: ${result.data.reporte.resumen.estadoGeneral}`);
      console.log(`📧 ${result.data.mensaje}`);
    } else {
      console.log(`\n❌ Error: ${result.data.error}`);
    }

    return result.data;
  } catch (error) {
    console.error(`❌ Error procesando calificaciones: ${error}`);
    throw error;
  }
}

// Ejemplos de uso
if (require.main === module) {
  console.log("🚀 Probando el sistema escolar...\n");

  // Ejemplo 1: Estudiante con buen desempeño
  procesarCalificacionesEstudiante(
    "María Fernanda López",
    "4° Grado",
    "Primer Bimestre",
    {
      español: { tareas: [9, 8, 9, 10], participacion: 9, examen: 8 },
      matemáticas: { tareas: [8, 9, 7, 8], participacion: 8, examen: 9 },
      "ciencias naturales": { tareas: [10, 9, 9], participacion: 9, examen: 9 },
      historia: { tareas: [8, 8, 9], participacion: 7, examen: 8 },
    }
  )
    .then(() => {
      console.log("\n" + "=".repeat(50));

      // Ejemplo 2: Estudiante que necesita apoyo
      return procesarCalificacionesEstudiante(
        "Carlos Mendoza",
        "3° Grado",
        "Primer Bimestre",
        {
          español: { tareas: [6, 7, 5, 6], participacion: 6, examen: 6 },
          matemáticas: { tareas: [5, 6, 5], participacion: 5, examen: 5 },
          "ciencias naturales": {
            tareas: [7, 8, 7],
            participacion: 7,
            examen: 7,
          },
          "educación física": {
            tareas: [9, 9, 10],
            participacion: 10,
            examen: 9,
          },
        }
      );
    })
    .then(() => {
      console.log("\n✅ Todos los ejemplos escolares completados");
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
