/**
 * Ejemplo Real: Clasificación de Issues de GitHub
 *
 * Este ejemplo demuestra un workflow para clasificar y priorizar
 * issues de GitHub automáticamente, un caso de uso muy común
 * en proyectos open source.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";
import { Octokit } from "@octokit/rest";

// Eventos del workflow
export class IssuesFetchedEvent extends WorkflowEvent<{
  issues: any[];
  repository: string;
}> {}

export class IssuesClassifiedEvent extends WorkflowEvent<{
  classified: Array<{
    id: number;
    title: string;
    body: string;
    type: "bug" | "feature" | "documentation" | "question" | "enhancement";
    priority: "low" | "medium" | "high" | "critical";
    sentiment: "positive" | "negative" | "neutral";
    complexity: number;
    labels: string[];
    assignable: boolean;
  }>;
}> {}

export class ReportGeneratedEvent extends WorkflowEvent<{
  report: {
    summary: any;
    recommendations: string[];
    actionItems: Array<{
      issue: number;
      action: string;
      reason: string;
    }>;
  };
}> {}

/**
 * Workflow para Clasificación Automática de Issues
 *
 * Casos de uso reales:
 * - Triaje automático de issues nuevos
 * - Priorización basada en impacto y urgencia
 * - Asignación automática a equipos
 * - Generación de reportes de estado del proyecto
 */
export class IssueClassificationWorkflow extends Workflow {
  private github: Octokit;

  constructor(githubToken?: string) {
    super();
    this.github = new Octokit({
      auth: githubToken || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Paso 1: Obtener issues del repositorio
   */
  @step()
  async fetchIssues(
    ev: StartEvent<{
      owner: string;
      repo: string;
      state?: "open" | "closed" | "all";
      limit?: number;
    }>
  ) {
    const { owner, repo, state = "open", limit = 30 } = ev.data;

    console.log(`📥 Obteniendo issues de ${owner}/${repo} (estado: ${state})`);

    try {
      const { data: issues } = await this.github.rest.issues.listForRepo({
        owner,
        repo,
        state,
        per_page: limit,
        sort: "created",
        direction: "desc",
      });

      // Filtrar solo issues (no PRs)
      const actualIssues = issues.filter((issue) => !issue.pull_request);

      console.log(`✅ Obtenidos ${actualIssues.length} issues para análisis`);

      return new IssuesFetchedEvent({
        issues: actualIssues,
        repository: `${owner}/${repo}`,
      });
    } catch (error) {
      console.error(`❌ Error obteniendo issues: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 2: Clasificar cada issue
   */
  @step()
  async classifyIssues(ev: IssuesFetchedEvent) {
    console.log(`🔍 Clasificando ${ev.data.issues.length} issues`);

    const classified = ev.data.issues.map((issue) => {
      const classification = {
        id: issue.number,
        title: issue.title,
        body: issue.body || "",
        type: this.detectIssueType(issue),
        priority: this.calculatePriority(issue),
        sentiment: this.analyzeSentiment(issue.body || ""),
        complexity: this.estimateComplexity(issue),
        labels: issue.labels.map((label: any) => label.name),
        assignable: this.isAssignable(issue),
      };

      return classification;
    });

    // Estadísticas de clasificación
    const stats = this.generateClassificationStats(classified);
    console.log(`📊 Clasificación completada:`, stats);

    return new IssuesClassifiedEvent({ classified });
  }

  /**
   * Paso 3: Generar reporte y recomendaciones
   */
  @step()
  async generateReport(ev: IssuesClassifiedEvent) {
    console.log(`📝 Generando reporte de análisis`);

    const { classified } = ev.data;

    // Generar resumen
    const summary = this.generateSummary(classified);

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(classified);

    // Generar acciones específicas
    const actionItems = this.generateActionItems(classified);

    const report = {
      summary,
      recommendations,
      actionItems,
    };

    console.log(
      `✅ Reporte generado con ${actionItems.length} acciones recomendadas`
    );

    return new ReportGeneratedEvent({ report });
  }

  /**
   * Paso 4: Finalizar análisis
   */
  @step()
  async finalizeAnalysis(ev: ReportGeneratedEvent) {
    console.log(`🎯 Finalizando análisis de issues`);

    const finalReport = {
      timestamp: new Date().toISOString(),
      analysis: ev.data.report,
      metadata: {
        tool: "LlamaIndex Issue Classification Workflow",
        version: "1.0.0",
      },
    };

    return new StopEvent({ report: finalReport });
  }

  // Métodos de clasificación

  private detectIssueType(
    issue: any
  ): "bug" | "feature" | "documentation" | "question" | "enhancement" {
    const text = `${issue.title} ${issue.body || ""}`.toLowerCase();
    const labels = issue.labels.map((l: any) => l.name.toLowerCase());

    // Detectar por labels primero
    if (labels.some((l) => l.includes("bug") || l.includes("error")))
      return "bug";
    if (labels.some((l) => l.includes("feature") || l.includes("enhancement")))
      return "feature";
    if (labels.some((l) => l.includes("doc") || l.includes("documentation")))
      return "documentation";
    if (labels.some((l) => l.includes("question") || l.includes("help")))
      return "question";

    // Detectar por contenido
    const bugKeywords = [
      "bug",
      "error",
      "crash",
      "broken",
      "fail",
      "exception",
      "not working",
    ];
    const featureKeywords = ["feature", "add", "implement", "support", "new"];
    const docKeywords = [
      "documentation",
      "docs",
      "readme",
      "guide",
      "tutorial",
    ];
    const questionKeywords = ["how to", "question", "help", "clarification"];

    if (bugKeywords.some((keyword) => text.includes(keyword))) return "bug";
    if (featureKeywords.some((keyword) => text.includes(keyword)))
      return "feature";
    if (docKeywords.some((keyword) => text.includes(keyword)))
      return "documentation";
    if (questionKeywords.some((keyword) => text.includes(keyword)))
      return "question";

    return "enhancement";
  }

  private calculatePriority(
    issue: any
  ): "low" | "medium" | "high" | "critical" {
    let score = 0;

    // Factores de prioridad

    // Número de comentarios (más actividad = mayor prioridad)
    score += Math.min(issue.comments * 2, 20);

    // Labels de prioridad
    const labels = issue.labels.map((l: any) => l.name.toLowerCase());
    if (labels.some((l) => l.includes("critical") || l.includes("urgent")))
      score += 40;
    if (labels.some((l) => l.includes("high") || l.includes("important")))
      score += 25;
    if (labels.some((l) => l.includes("low") || l.includes("minor")))
      score -= 10;

    // Palabras clave en el título
    const title = issue.title.toLowerCase();
    if (
      title.includes("crash") ||
      title.includes("critical") ||
      title.includes("urgent")
    )
      score += 30;
    if (title.includes("security") || title.includes("vulnerability"))
      score += 35;

    // Antigüedad del issue
    const daysSinceCreated =
      (Date.now() - new Date(issue.created_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 30) score += 10; // Issues antiguos necesitan atención

    // Asignación
    if (!issue.assignee) score += 5; // Issues sin asignar necesitan atención

    // Determinar prioridad final
    if (score >= 40) return "critical";
    if (score >= 25) return "high";
    if (score >= 10) return "medium";
    return "low";
  }

  private analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
    const lowerText = text.toLowerCase();

    const positiveWords = [
      "great",
      "awesome",
      "excellent",
      "love",
      "amazing",
      "perfect",
      "thank",
      "appreciate",
      "helpful",
      "good",
      "nice",
      "wonderful",
    ];

    const negativeWords = [
      "terrible",
      "awful",
      "hate",
      "broken",
      "frustrated",
      "angry",
      "disappointed",
      "useless",
      "horrible",
      "worst",
      "annoying",
      "stupid",
    ];

    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount + 1) return "positive";
    if (negativeCount > positiveCount + 1) return "negative";
    return "neutral";
  }

  private estimateComplexity(issue: any): number {
    let complexity = 1; // Base complexity

    const text = `${issue.title} ${issue.body || ""}`.toLowerCase();

    // Factores que aumentan complejidad
    const complexityIndicators = [
      "refactor",
      "architecture",
      "breaking change",
      "major",
      "multiple",
      "integration",
      "performance",
      "optimization",
      "security",
      "database",
      "api",
      "framework",
    ];

    complexity += complexityIndicators.filter((indicator) =>
      text.includes(indicator)
    ).length;

    // Longitud del texto (más detalle = más complejidad)
    if (text.length > 500) complexity += 2;
    else if (text.length > 200) complexity += 1;

    // Número de comentarios (más discusión = más complejidad)
    complexity += Math.min(Math.floor(issue.comments / 5), 3);

    return Math.min(complexity, 10); // Máximo 10
  }

  private isAssignable(issue: any): boolean {
    // Un issue es asignable si:
    // - No está ya asignado
    // - Tiene suficiente información
    // - No es una pregunta simple

    if (issue.assignee) return false;

    const hasGoodDescription = (issue.body || "").length > 50;
    const isQuestion = this.detectIssueType(issue) === "question";

    return hasGoodDescription && !isQuestion;
  }

  // Métodos de reporte

  private generateClassificationStats(classified: any[]) {
    const typeCount = classified.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    const priorityCount = classified.reduce((acc, issue) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1;
      return acc;
    }, {});

    return { typeCount, priorityCount };
  }

  private generateSummary(classified: any[]) {
    const total = classified.length;
    const highPriority = classified.filter(
      (i) => i.priority === "high" || i.priority === "critical"
    ).length;
    const bugs = classified.filter((i) => i.type === "bug").length;
    const unassigned = classified.filter((i) => i.assignable).length;

    return {
      totalIssues: total,
      highPriorityIssues: highPriority,
      bugReports: bugs,
      assignableIssues: unassigned,
      averageComplexity:
        Math.round(
          (classified.reduce((sum, i) => sum + i.complexity, 0) / total) * 10
        ) / 10,
    };
  }

  private generateRecommendations(classified: any[]): string[] {
    const recommendations: string[] = [];

    const highPriority = classified.filter(
      (i) => i.priority === "high" || i.priority === "critical"
    );
    const bugs = classified.filter((i) => i.type === "bug");
    const oldIssues = classified.filter((i) => i.priority === "low").length;

    if (highPriority.length > 5) {
      recommendations.push(
        `Atención: ${highPriority.length} issues de alta prioridad requieren atención inmediata`
      );
    }

    if (bugs.length > classified.length * 0.4) {
      recommendations.push(
        "Alto número de bugs reportados - considerar revisión de calidad"
      );
    }

    if (oldIssues > 10) {
      recommendations.push(
        "Considerar cerrar o actualizar issues de baja prioridad antiguos"
      );
    }

    const unassigned = classified.filter((i) => i.assignable).length;
    if (unassigned > 5) {
      recommendations.push(
        `${unassigned} issues listos para asignación a desarrolladores`
      );
    }

    return recommendations;
  }

  private generateActionItems(classified: any[]) {
    const actions: Array<{
      issue: number;
      action: string;
      reason: string;
    }> = [];

    // Issues críticos
    classified
      .filter((i) => i.priority === "critical")
      .forEach((issue) => {
        actions.push({
          issue: issue.id,
          action: "Asignar inmediatamente",
          reason: "Prioridad crítica",
        });
      });

    // Bugs de alta prioridad
    classified
      .filter((i) => i.type === "bug" && i.priority === "high")
      .slice(0, 3) // Top 3
      .forEach((issue) => {
        actions.push({
          issue: issue.id,
          action: "Investigar y reproducir",
          reason: "Bug de alta prioridad",
        });
      });

    // Issues asignables
    classified
      .filter((i) => i.assignable && i.priority !== "low")
      .slice(0, 5) // Top 5
      .forEach((issue) => {
        actions.push({
          issue: issue.id,
          action: "Asignar a desarrollador",
          reason: "Issue bien definido y listo para desarrollo",
        });
      });

    return actions;
  }
}

/**
 * Función de uso del workflow
 */
export async function classifyRepositoryIssues(
  owner: string,
  repo: string,
  options: { state?: "open" | "closed" | "all"; limit?: number } = {}
) {
  console.log(`🚀 Iniciando clasificación de issues de ${owner}/${repo}\n`);

  const workflow = new IssueClassificationWorkflow();

  try {
    const result = await workflow.run({
      owner,
      repo,
      ...options,
    });

    const { report } = result.data;

    console.log("\n📊 REPORTE DE CLASIFICACIÓN DE ISSUES");
    console.log("=".repeat(50));

    console.log("\n📈 RESUMEN:");
    Object.entries(report.analysis.summary).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });

    console.log("\n💡 RECOMENDACIONES:");
    report.analysis.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });

    console.log("\n🎯 ACCIONES RECOMENDADAS:");
    report.analysis.actionItems.forEach((action: any) => {
      console.log(
        `  • Issue #${action.issue}: ${action.action} (${action.reason})`
      );
    });

    return report;
  } catch (error) {
    console.error(`❌ Error en clasificación: ${error}`);
    throw error;
  }
}

// Ejemplo de uso
if (require.main === module) {
  // Clasificar issues del repositorio de LlamaIndex
  classifyRepositoryIssues("run-llama", "LlamaIndexTS", { limit: 20 })
    .then((report) => {
      console.log("\n✅ Clasificación completada exitosamente");
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
