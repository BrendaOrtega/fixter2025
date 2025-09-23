/**
 * Ejemplo Real: Análisis de Repositorio GitHub
 *
 * Este ejemplo demuestra un caso de uso real de Agent Workflows
 * para analizar repositorios de GitHub y generar documentación automática.
 * Basado en patrones comunes de la comunidad LlamaIndex.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";
import { Octokit } from "@octokit/rest";

// Eventos personalizados para el workflow
export class RepoFetchedEvent extends WorkflowEvent<{
  repo: any;
  files: string[];
  readme?: string;
}> {}

export class CodeAnalyzedEvent extends WorkflowEvent<{
  structure: {
    totalFiles: number;
    fileTypes: Record<string, number>;
    directories: string[];
    complexity: number;
  };
  insights: string[];
}> {}

export class DocumentationGeneratedEvent extends WorkflowEvent<{
  documentation: {
    overview: string;
    structure: any;
    recommendations: string[];
    metrics: any;
  };
}> {}

/**
 * Workflow para Análisis Automático de Repositorios GitHub
 *
 * Casos de uso reales:
 * - Generar documentación automática de proyectos
 * - Analizar estructura y complejidad del código
 * - Identificar patrones y mejores prácticas
 * - Crear reportes de salud del proyecto
 */
export class GitHubAnalysisWorkflow extends Workflow {
  private github: Octokit;

  constructor(githubToken?: string) {
    super();
    this.github = new Octokit({
      auth: githubToken || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Paso 1: Obtener información del repositorio
   */
  @step()
  async fetchRepository(ev: StartEvent<{ owner: string; repo: string }>) {
    console.log(`📦 Analizando repositorio ${ev.data.owner}/${ev.data.repo}`);

    try {
      // Obtener información básica del repositorio
      const { data: repo } = await this.github.rest.repos.get({
        owner: ev.data.owner,
        repo: ev.data.repo,
      });

      // Obtener estructura de archivos
      const { data: tree } = await this.github.rest.git.getTree({
        owner: ev.data.owner,
        repo: ev.data.repo,
        tree_sha: repo.default_branch || "main",
        recursive: "true",
      });

      // Filtrar archivos relevantes
      const files = tree.tree
        .filter((item) => item.type === "blob" && item.path)
        .map((item) => item.path!)
        .filter((path) => this.isRelevantFile(path))
        .slice(0, 50); // Limitar para el ejemplo

      // Intentar obtener README
      let readme = "";
      try {
        const { data: readmeData } = await this.github.rest.repos.getReadme({
          owner: ev.data.owner,
          repo: ev.data.repo,
        });
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      } catch {
        console.log("📝 No se encontró README");
      }

      console.log(
        `✅ Repositorio obtenido: ${files.length} archivos relevantes`
      );

      return new RepoFetchedEvent({
        repo,
        files,
        readme,
      });
    } catch (error) {
      console.error(`❌ Error obteniendo repositorio: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 2: Analizar estructura del código
   */
  @step()
  async analyzeCodeStructure(ev: RepoFetchedEvent) {
    console.log(`🔍 Analizando estructura de ${ev.data.files.length} archivos`);

    const { files, repo } = ev.data;

    // Análisis de tipos de archivo
    const fileTypes = this.categorizeFiles(files);

    // Análisis de directorios
    const directories = this.extractDirectories(files);

    // Cálculo de complejidad
    const complexity = this.calculateComplexity(files, directories);

    // Generar insights
    const insights = this.generateInsights(
      fileTypes,
      directories,
      complexity,
      repo
    );

    const structure = {
      totalFiles: files.length,
      fileTypes,
      directories: directories.slice(0, 10), // Top 10 directorios
      complexity,
    };

    console.log(`📊 Análisis completado - Complejidad: ${complexity}`);

    return new CodeAnalyzedEvent({ structure, insights });
  }

  /**
   * Paso 3: Generar documentación automática
   */
  @step()
  async generateDocumentation(ev: CodeAnalyzedEvent) {
    console.log(`📝 Generando documentación automática`);

    const { structure, insights } = ev.data;

    // Generar overview del proyecto
    const overview = this.generateOverview(structure);

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(structure, insights);

    // Calcular métricas
    const metrics = this.calculateMetrics(structure);

    const documentation = {
      overview,
      structure: {
        fileDistribution: structure.fileTypes,
        mainDirectories: structure.directories,
        complexityScore: structure.complexity,
      },
      recommendations,
      metrics,
      generatedAt: new Date().toISOString(),
      insights,
    };

    console.log(
      `✅ Documentación generada con ${recommendations.length} recomendaciones`
    );

    return new DocumentationGeneratedEvent({ documentation });
  }

  /**
   * Paso 4: Finalizar y formatear resultado
   */
  @step()
  async finalizeReport(ev: DocumentationGeneratedEvent) {
    console.log(`🎯 Finalizando reporte de análisis`);

    const { documentation } = ev.data;

    // Formatear reporte final
    const report = {
      title: "Análisis Automático de Repositorio",
      summary: documentation.overview,
      details: {
        structure: documentation.structure,
        insights: documentation.insights,
        recommendations: documentation.recommendations,
        metrics: documentation.metrics,
      },
      metadata: {
        analyzedAt: documentation.generatedAt,
        tool: "LlamaIndex Agent Workflow",
        version: "1.0.0",
      },
    };

    console.log(`🎉 Análisis completado exitosamente`);

    return new StopEvent({ report });
  }

  // Métodos auxiliares

  private isRelevantFile(path: string): boolean {
    const relevantExtensions = [
      ".ts",
      ".js",
      ".tsx",
      ".jsx",
      ".py",
      ".java",
      ".go",
      ".rs",
      ".cpp",
      ".c",
    ];
    const irrelevantPaths = [
      "node_modules/",
      ".git/",
      "dist/",
      "build/",
      ".next/",
    ];

    return (
      relevantExtensions.some((ext) => path.endsWith(ext)) &&
      !irrelevantPaths.some((ignore) => path.includes(ignore))
    );
  }

  private categorizeFiles(files: string[]): Record<string, number> {
    return files.reduce((acc, file) => {
      const ext = "." + file.split(".").pop();
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private extractDirectories(files: string[]): string[] {
    const dirs = new Set<string>();

    files.forEach((file) => {
      const parts = file.split("/");
      if (parts.length > 1) {
        dirs.add(parts[0]);
        if (parts.length > 2) {
          dirs.add(`${parts[0]}/${parts[1]}`);
        }
      }
    });

    return Array.from(dirs).sort();
  }

  private calculateComplexity(files: string[], directories: string[]): number {
    // Algoritmo simple de complejidad
    let score = 0;

    // Más archivos = mayor complejidad
    score += files.length * 2;

    // Más directorios = mayor complejidad organizacional
    score += directories.length * 3;

    // Archivos en raíz = menor organización
    const rootFiles = files.filter((f) => !f.includes("/")).length;
    score += rootFiles * 1.5;

    return Math.round(score);
  }

  private generateInsights(
    fileTypes: Record<string, number>,
    directories: string[],
    complexity: number,
    repo: any
  ): string[] {
    const insights: string[] = [];

    // Insights sobre lenguajes
    const mainLanguage = Object.entries(fileTypes).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (mainLanguage) {
      insights.push(
        `Lenguaje principal: ${mainLanguage[0]} (${mainLanguage[1]} archivos)`
      );
    }

    // Insights sobre estructura
    if (directories.includes("src")) {
      insights.push("Proyecto bien estructurado con directorio 'src'");
    }

    if (directories.includes("test") || directories.includes("tests")) {
      insights.push("Incluye suite de pruebas");
    }

    // Insights sobre complejidad
    if (complexity > 100) {
      insights.push("Proyecto de alta complejidad - considerar modularización");
    } else if (complexity < 30) {
      insights.push("Proyecto simple y bien organizado");
    }

    // Insights sobre actividad
    if (repo.stargazers_count > 100) {
      insights.push(`Proyecto popular con ${repo.stargazers_count} estrellas`);
    }

    return insights;
  }

  private generateOverview(structure: any): string {
    const { totalFiles, fileTypes, complexity } = structure;
    const mainType = Object.entries(fileTypes).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0];

    return (
      `Proyecto con ${totalFiles} archivos, principalmente ${mainType?.[0]} ` +
      `(${mainType?.[1]} archivos). Complejidad estimada: ${complexity} puntos.`
    );
  }

  private generateRecommendations(
    structure: any,
    insights: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Recomendaciones basadas en estructura
    if (structure.totalFiles > 50 && structure.directories.length < 5) {
      recommendations.push("Considerar mejor organización en directorios");
    }

    if (
      !structure.directories.includes("test") &&
      !structure.directories.includes("tests")
    ) {
      recommendations.push("Agregar suite de pruebas al proyecto");
    }

    if (structure.complexity > 150) {
      recommendations.push("Refactorizar para reducir complejidad");
      recommendations.push("Considerar dividir en módulos más pequeños");
    }

    // Recomendaciones basadas en tipos de archivo
    const hasTypeScript =
      ".ts" in structure.fileTypes || ".tsx" in structure.fileTypes;
    const hasJavaScript =
      ".js" in structure.fileTypes || ".jsx" in structure.fileTypes;

    if (hasJavaScript && !hasTypeScript) {
      recommendations.push(
        "Considerar migración a TypeScript para mejor type safety"
      );
    }

    return recommendations;
  }

  private calculateMetrics(structure: any): any {
    return {
      codeHealth: structure.complexity < 100 ? "Buena" : "Necesita atención",
      organizationScore:
        (structure.directories.length / structure.totalFiles) * 100,
      diversityIndex: Object.keys(structure.fileTypes).length,
      maintenanceRisk: structure.complexity > 200 ? "Alto" : "Bajo",
    };
  }
}

/**
 * Función de uso del workflow
 */
export async function analyzeGitHubRepository(owner: string, repo: string) {
  console.log(`🚀 Iniciando análisis de ${owner}/${repo}\n`);

  const workflow = new GitHubAnalysisWorkflow();

  try {
    const result = await workflow.run({ owner, repo });

    console.log("\n📊 REPORTE DE ANÁLISIS");
    console.log("=".repeat(50));
    console.log(`📋 ${result.data.report.title}`);
    console.log(`📝 ${result.data.report.summary}`);
    console.log("\n🔍 INSIGHTS:");
    result.data.report.details.insights.forEach((insight: string) => {
      console.log(`  • ${insight}`);
    });
    console.log("\n💡 RECOMENDACIONES:");
    result.data.report.details.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
    console.log("\n📈 MÉTRICAS:");
    Object.entries(result.data.report.details.metrics).forEach(
      ([key, value]) => {
        console.log(`  • ${key}: ${value}`);
      }
    );

    return result.data.report;
  } catch (error) {
    console.error(`❌ Error en análisis: ${error}`);
    throw error;
  }
}

// Ejemplo de uso
if (require.main === module) {
  // Analizar el repositorio de TypeScript de Microsoft
  analyzeGitHubRepository("microsoft", "TypeScript")
    .then((report) => {
      console.log("\n✅ Análisis completado exitosamente");
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
