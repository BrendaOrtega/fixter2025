/**
 * Asistente de Creatividad Artística
 *
 * Un workflow revolucionario que ayuda a artistas, escritores y creativos
 * a superar bloqueos y generar ideas innovadoras usando técnicas de inspiración cruzada.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Eventos del workflow
export class CreativeBlockAnalyzedEvent extends WorkflowEvent<{
  blockType:
    | "inspiration"
    | "technique"
    | "direction"
    | "motivation"
    | "perfectionism";
  severity: number;
  artistProfile: {
    discipline: string;
    experience: string;
    style: string[];
    strengths: string[];
    challenges: string[];
    influences: string[];
  };
  projectContext: {
    type: string;
    stage: string;
    deadline?: Date;
    constraints: string[];
    goals: string[];
  };
}> {}

export class InspirationGeneratedEvent extends WorkflowEvent<{
  inspirations: Array<{
    type:
      | "cross-domain"
      | "historical"
      | "nature"
      | "cultural"
      | "technological"
      | "emotional";
    source: string;
    concept: string;
    adaptation: string;
    relevance: number;
    actionable: boolean;
    timeToImplement: string;
  }>;
  techniques: Array<{
    name: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    timeRequired: string;
    materials: string[];
  }>;
  crossConnections: Array<{
    domain1: string;
    domain2: string;
    connection: string;
    creativeOpportunity: string;
  }>;
}> {}

export class CreativePlanGeneratedEvent extends WorkflowEvent<{
  actionPlan: {
    immediateActions: any[];
    shortTermGoals: any[];
    longTermVision: any[];
    experiments: any[];
    collaborations: any[];
  };
  motivationalElements: {
    affirmations: string[];
    successStories: any[];
    communityConnections: string[];
    rewards: string[];
  };
  adaptiveStrategies: any[];
}> {}

/**
 * Workflow para Asistencia Creativa Inteligente
 *
 * Este workflow utiliza técnicas avanzadas de generación de ideas,
 * inspiración cruzada y análisis psicológico para desbloquear la creatividad.
 */
export class CreativeAssistantWorkflow extends Workflow {
  private creativeDomains = [
    "architecture",
    "nature",
    "music",
    "mathematics",
    "cooking",
    "dance",
    "technology",
    "psychology",
    "philosophy",
    "sports",
    "fashion",
    "science",
    "literature",
    "cinema",
    "gaming",
    "travel",
    "history",
    "mythology",
  ];

  private creativeExercises = {
    inspiration: [
      "Observación detallada de objetos cotidianos",
      "Combinación aleatoria de conceptos",
      "Exploración de opuestos",
      "Técnica de los seis sombreros",
      "Mapas mentales visuales",
    ],
    technique: [
      "Experimentación con nuevos materiales",
      "Limitaciones autoimpuestas",
      "Técnicas de otros medios",
      "Colaboración interdisciplinaria",
      "Deconstrucción y reconstrucción",
    ],
    direction: [
      "Análisis de valores personales",
      "Exploración de temas universales",
      "Investigación de audiencias",
      "Estudio de tendencias emergentes",
      "Reflexión sobre propósito artístico",
    ],
  };

  /**
   * Paso 1: Análisis profundo del bloqueo creativo
   */
  @step()
  async analyzeCreativeBlock(
    ev: StartEvent<{
      artistType: string;
      currentProject: string;
      blockDescription: string;
      previousWork: any[];
      timeframe: string;
      constraints: string[];
      goals: string[];
    }>
  ) {
    console.log(`🎨 Analizando bloqueo creativo de ${ev.data.artistType}`);

    // Identificar tipo de bloqueo
    const blockType = this.identifyBlockType(ev.data.blockDescription);
    const severity = this.assessBlockSeverity(
      ev.data.blockDescription,
      ev.data.timeframe
    );

    console.log(`🔍 Tipo de bloqueo: ${blockType} (severidad: ${severity}/10)`);

    // Crear perfil del artista
    const artistProfile = {
      discipline: ev.data.artistType,
      experience: this.inferExperience(ev.data.previousWork),
      style: this.analyzeArtisticStyle(ev.data.previousWork),
      strengths: this.identifyStrengths(
        ev.data.previousWork,
        ev.data.artistType
      ),
      challenges: this.identifyRecurringChallenges(
        ev.data.previousWork,
        ev.data.blockDescription
      ),
      influences: this.extractInfluences(ev.data.previousWork),
    };

    // Analizar contexto del proyecto
    const projectContext = {
      type: this.categorizeProject(ev.data.currentProject),
      stage: this.identifyProjectStage(ev.data.blockDescription),
      deadline: this.extractDeadline(ev.data.timeframe),
      constraints: ev.data.constraints,
      goals: ev.data.goals,
    };

    console.log(
      `👤 Perfil: ${artistProfile.experience} ${artistProfile.discipline}`
    );
    console.log(
      `📋 Proyecto: ${projectContext.type} en etapa ${projectContext.stage}`
    );

    return new CreativeBlockAnalyzedEvent({
      blockType,
      severity,
      artistProfile,
      projectContext,
    });
  }

  /**
   * Paso 2: Generación de inspiración multi-dominio
   */
  @step()
  async generateMultiDomainInspiration(ev: CreativeBlockAnalyzedEvent) {
    console.log(
      `💡 Generando inspiración para superar bloqueo de ${ev.data.blockType}`
    );

    const inspirations = [];
    const techniques = [];
    const crossConnections = [];

    // Inspiración cross-domain
    const selectedDomains = this.selectRelevantDomains(
      ev.data.artistProfile.discipline,
      ev.data.blockType,
      3
    );

    for (const domain of selectedDomains) {
      const domainInspiration = await this.generateDomainInspiration(
        domain,
        ev.data.artistProfile,
        ev.data.projectContext
      );
      inspirations.push(...domainInspiration);
    }

    // Inspiración histórica
    const historicalInspirations = await this.generateHistoricalInspiration(
      ev.data.artistProfile.discipline,
      ev.data.blockType
    );
    inspirations.push(...historicalInspirations);

    // Inspiración de la naturaleza
    const natureInspirations = await this.generateNatureInspiration(
      ev.data.blockType,
      ev.data.projectContext.type
    );
    inspirations.push(...natureInspirations);

    // Técnicas específicas para el bloqueo
    const blockSpecificTechniques = this.generateBlockSpecificTechniques(
      ev.data.blockType,
      ev.data.artistProfile.discipline,
      ev.data.severity
    );
    techniques.push(...blockSpecificTechniques);

    // Conexiones cruzadas innovadoras
    const innovativeConnections = this.generateCrossConnections(
      selectedDomains,
      ev.data.artistProfile.discipline
    );
    crossConnections.push(...innovativeConnections);

    // Filtrar y rankear por relevancia
    const rankedInspirations = inspirations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 15);

    console.log(
      `✨ Generadas ${rankedInspirations.length} inspiraciones de ${selectedDomains.length} dominios`
    );
    console.log(`🛠️ Sugeridas ${techniques.length} técnicas específicas`);
    console.log(
      `🔗 Identificadas ${crossConnections.length} conexiones innovadoras`
    );

    return new InspirationGeneratedEvent({
      inspirations: rankedInspirations,
      techniques,
      crossConnections,
    });
  }

  /**
   * Paso 3: Creación de plan de acción personalizado
   */
  @step()
  async createPersonalizedActionPlan(ev: InspirationGeneratedEvent) {
    console.log(`📋 Creando plan de acción creativo personalizado`);

    // Acciones inmediatas (próximas 2 horas)
    const immediateActions = this.generateImmediateActions(
      ev.data.inspirations.slice(0, 3),
      ev.data.techniques.filter((t) => t.difficulty === "beginner")
    );

    // Metas a corto plazo (próxima semana)
    const shortTermGoals = this.generateShortTermGoals(
      ev.data.inspirations,
      ev.data.crossConnections
    );

    // Visión a largo plazo (próximo mes)
    const longTermVision = this.generateLongTermVision(
      ev.data.inspirations.filter((i) => i.type === "cross-domain"),
      ev.data.techniques.filter((t) => t.difficulty === "advanced")
    );

    // Experimentos creativos
    const experiments = this.designCreativeExperiments(
      ev.data.crossConnections,
      ev.data.techniques
    );

    // Oportunidades de colaboración
    const collaborations = this.identifyCollaborationOpportunities(
      ev.data.inspirations,
      ev.data.crossConnections
    );

    const actionPlan = {
      immediateActions,
      shortTermGoals,
      longTermVision,
      experiments,
      collaborations,
    };

    console.log(`⚡ ${immediateActions.length} acciones inmediatas`);
    console.log(`🎯 ${shortTermGoals.length} metas a corto plazo`);
    console.log(`🔬 ${experiments.length} experimentos creativos`);

    return new CreativePlanGeneratedEvent({
      actionPlan,
      motivationalElements: await this.generateMotivationalElements(),
      adaptiveStrategies: this.createAdaptiveStrategies(ev.data.inspirations),
    });
  }

  /**
   * Paso 4: Finalización con sistema de seguimiento
   */
  @step()
  async finalizeCreativeAssistance(ev: CreativePlanGeneratedEvent) {
    console.log(
      `🎯 Finalizando asistencia creativa con sistema de seguimiento`
    );

    const creativeAssistance = {
      actionPlan: ev.data.actionPlan,
      motivationalSupport: ev.data.motivationalElements,
      adaptiveStrategies: ev.data.adaptiveStrategies,

      trackingSystem: {
        dailyCheckins: this.createDailyCheckins(),
        progressMilestones: this.defineMilestones(ev.data.actionPlan),
        reflectionPrompts: this.generateReflectionPrompts(),
        celebrationRituals: this.suggestCelebrationRituals(),
      },

      emergencyToolkit: {
        quickInspiration: this.createQuickInspirationTools(),
        blockBusters: this.createBlockBusterExercises(),
        motivationBoosters: this.createMotivationBoosters(),
        communitySupport: this.suggestCommunitySupport(),
      },

      evolutionPath: {
        skillDevelopment: this.mapSkillDevelopment(ev.data.actionPlan),
        styleEvolution: this.predictStyleEvolution(ev.data.actionPlan),
        careerOpportunities: this.identifyCareerOpportunities(
          ev.data.actionPlan
        ),
        legacyBuilding: this.suggestLegacyBuilding(ev.data.actionPlan),
      },

      metadata: {
        generatedAt: new Date(),
        personalityType: this.inferPersonalityType(ev.data.actionPlan),
        creativityProfile: this.generateCreativityProfile(ev.data.actionPlan),
        successPredictors: this.identifySuccessPredictors(ev.data.actionPlan),
      },
    };

    console.log(
      `🎉 Asistencia creativa completa con sistema de seguimiento integral`
    );

    return new StopEvent({ assistance: creativeAssistance });
  }

  // Métodos especializados de análisis creativo

  private identifyBlockType(
    description: string
  ):
    | "inspiration"
    | "technique"
    | "direction"
    | "motivation"
    | "perfectionism" {
    const blockIndicators = {
      inspiration: [
        "no ideas",
        "sin inspiración",
        "vacío creativo",
        "mente en blanco",
      ],
      technique: ["no sé cómo", "técnica", "habilidad", "método"],
      direction: ["no sé qué hacer", "perdido", "sin rumbo", "confundido"],
      motivation: ["sin ganas", "desmotivado", "sin energía", "desanimado"],
      perfectionism: [
        "no es suficiente",
        "perfecto",
        "crítico",
        "insatisfecho",
      ],
    };

    const lowerDesc = description.toLowerCase();

    for (const [type, indicators] of Object.entries(blockIndicators)) {
      if (indicators.some((indicator) => lowerDesc.includes(indicator))) {
        return type as any;
      }
    }

    return "inspiration"; // default
  }

  private async generateDomainInspiration(
    domain: string,
    artistProfile: any,
    projectContext: any
  ) {
    const domainPrinciples = {
      architecture: {
        principles: [
          "forma sigue función",
          "espacio negativo",
          "proporción áurea",
          "flujo de movimiento",
        ],
        concepts: [
          "estructuras tensionales",
          "luz natural",
          "materiales honestos",
          "integración contextual",
        ],
      },
      nature: {
        principles: ["biomimética", "fractales", "simbiosis", "adaptación"],
        concepts: [
          "patrones de crecimiento",
          "ciclos naturales",
          "ecosistemas",
          "evolución",
        ],
      },
      music: {
        principles: ["ritmo", "armonía", "contrapunto", "dinámica"],
        concepts: [
          "improvisación",
          "variaciones temáticas",
          "modulación",
          "silencio",
        ],
      },
      mathematics: {
        principles: [
          "simetría",
          "secuencias",
          "transformaciones",
          "optimización",
        ],
        concepts: ["teoría de grafos", "topología", "probabilidad", "caos"],
      },
    };

    const domainData = domainPrinciples[domain] || domainPrinciples.nature;
    const inspirations = [];

    for (const principle of domainData.principles.slice(0, 2)) {
      const adaptation = this.adaptPrincipleToArt(
        principle,
        domain,
        artistProfile.discipline
      );

      inspirations.push({
        type: "cross-domain" as const,
        source: `${domain} - ${principle}`,
        concept: principle,
        adaptation,
        relevance: this.calculateRelevance(
          adaptation,
          artistProfile,
          projectContext
        ),
        actionable: true,
        timeToImplement: this.estimateImplementationTime(adaptation),
      });
    }

    return inspirations;
  }

  private generateImmediateActions(inspirations: any[], techniques: any[]) {
    return inspirations.slice(0, 3).map((inspiration, index) => ({
      id: `immediate_${index + 1}`,
      title: `Explorar: ${inspiration.concept}`,
      description: inspiration.adaptation,
      timeEstimate: "15-30 minutos",
      materials: this.suggestMaterials(inspiration),
      steps: this.breakDownIntoSteps(inspiration.adaptation),
      expectedOutcome: this.predictOutcome(inspiration),
      motivationBoost: this.generateMotivationBoost(inspiration),
    }));
  }

  private generateCreativeExperiments(
    crossConnections: any[],
    techniques: any[]
  ) {
    return crossConnections.slice(0, 5).map((connection, index) => ({
      id: `experiment_${index + 1}`,
      title: `Fusión: ${connection.domain1} + ${connection.domain2}`,
      hypothesis: connection.creativeOpportunity,
      method: this.designExperimentMethod(connection),
      duration: "1-2 semanas",
      resources: this.listRequiredResources(connection),
      successMetrics: this.defineSuccessMetrics(connection),
      learningObjectives: this.defineLearningObjectives(connection),
      riskMitigation: this.identifyRisks(connection),
    }));
  }

  private async generateMotivationalElements() {
    return {
      affirmations: [
        "Mi creatividad es única e invaluable",
        "Cada bloqueo es una oportunidad de crecimiento",
        "Confío en mi proceso creativo",
        "Mis ideas tienen valor y merecen ser expresadas",
        "Soy capaz de crear algo hermoso y significativo",
      ],
      successStories: [
        {
          artist: "Maya Lin",
          challenge: "Diseñar el Memorial de Vietnam siendo estudiante",
          breakthrough: "Confió en su visión minimalista única",
          lesson: "La simplicidad puede ser profundamente poderosa",
        },
        {
          artist: "Lin-Manuel Miranda",
          challenge: "Crear un musical sobre Alexander Hamilton",
          breakthrough: "Combinó hip-hop con historia americana",
          lesson: "Las combinaciones inesperadas crean magia",
        },
      ],
      communityConnections: [
        "Grupos locales de artistas",
        "Comunidades online de tu disciplina",
        "Espacios de coworking creativo",
        "Talleres y workshops",
        "Mentores en tu campo",
      ],
      rewards: [
        "Celebra cada pequeño progreso",
        "Comparte tu trabajo con alguien de confianza",
        "Date un descanso creativo cuando lo necesites",
        "Invierte en nuevos materiales o herramientas",
        "Documenta tu proceso para inspiración futura",
      ],
    };
  }

  private createAdaptiveStrategies(inspirations: any[]) {
    return [
      {
        trigger: "Cuando te sientas abrumado",
        strategy: "Enfócate en una sola inspiración por día",
        backup: "Haz un ejercicio de respiración creativa de 5 minutos",
      },
      {
        trigger: "Cuando las ideas no fluyen",
        strategy: "Cambia de entorno físico",
        backup: "Usa la técnica de escritura automática por 10 minutos",
      },
      {
        trigger: "Cuando dudas de tu trabajo",
        strategy: "Busca feedback de tu comunidad creativa",
        backup: "Revisa tus trabajos anteriores exitosos",
      },
      {
        trigger: "Cuando te falta motivación",
        strategy: "Conecta con tu propósito artístico original",
        backup: "Consume arte que te inspire en otros medios",
      },
    ];
  }
}

/**
 * Función de uso del workflow
 */
export async function getCreativeAssistance(input: {
  artistType: string;
  currentProject: string;
  blockDescription: string;
  previousWork?: any[];
  timeframe?: string;
  constraints?: string[];
  goals?: string[];
}) {
  console.log(`🚀 Iniciando asistencia creativa para ${input.artistType}\n`);

  const workflow = new CreativeAssistantWorkflow();

  try {
    const result = await workflow.run({
      previousWork: [],
      timeframe: "1 semana",
      constraints: [],
      goals: [],
      ...input,
    });

    const { assistance } = result.data;

    console.log("\n🎨 ASISTENCIA CREATIVA PERSONALIZADA");
    console.log("=".repeat(50));

    console.log(
      `\n⚡ ACCIONES INMEDIATAS (${assistance.actionPlan.immediateActions.length}):`
    );
    assistance.actionPlan.immediateActions.forEach((action: any, i: number) => {
      console.log(`  ${i + 1}. ${action.title} (${action.timeEstimate})`);
      console.log(`     ${action.description}`);
    });

    console.log(
      `\n🔬 EXPERIMENTOS CREATIVOS (${assistance.actionPlan.experiments.length}):`
    );
    assistance.actionPlan.experiments.forEach((exp: any, i: number) => {
      console.log(`  ${i + 1}. ${exp.title}`);
      console.log(`     ${exp.hypothesis}`);
    });

    console.log(`\n💪 HERRAMIENTAS DE EMERGENCIA:`);
    console.log(
      `  • ${assistance.emergencyToolkit.quickInspiration.length} herramientas de inspiración rápida`
    );
    console.log(
      `  • ${assistance.emergencyToolkit.blockBusters.length} ejercicios rompe-bloqueos`
    );
    console.log(
      `  • ${assistance.emergencyToolkit.motivationBoosters.length} potenciadores de motivación`
    );

    console.log(`\n🎯 PERFIL DE CREATIVIDAD:`);
    console.log(`Tipo de personalidad: ${assistance.metadata.personalityType}`);
    console.log(`Perfil creativo: ${assistance.metadata.creativityProfile}`);

    return assistance;
  } catch (error) {
    console.error(`❌ Error en asistencia creativa: ${error}`);
    throw error;
  }
}

// Ejemplo de uso
if (require.main === module) {
  getCreativeAssistance({
    artistType: "escritor",
    currentProject: "Novela de ciencia ficción sobre inteligencia artificial",
    blockDescription:
      "Estoy atascado en el desarrollo del personaje principal. No logro que se sienta auténtico y tridimensional. Llevo semanas dando vueltas a lo mismo.",
    timeframe: "2 semanas",
    constraints: ["Debe ser publicable", "Audiencia joven adulta"],
    goals: ["Crear un personaje memorable", "Avanzar en la trama principal"],
  })
    .then((assistance) => {
      console.log("\n✅ Asistencia creativa generada exitosamente");
      console.log(
        `🎨 Estrategias adaptativas: ${assistance.adaptiveStrategies.length}`
      );
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
