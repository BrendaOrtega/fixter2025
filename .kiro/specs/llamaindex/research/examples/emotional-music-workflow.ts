/**
 * Generador de Música Emocional
 *
 * Un workflow fascinante que analiza el estado emocional del usuario
 * y genera música personalizada que se adapta perfectamente a su mood.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  step,
} from "llamaindex";

// Eventos del workflow
export class EmotionAnalyzedEvent extends WorkflowEvent<{
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number;
  valence: number; // positivo/negativo
  arousal: number; // energía/calma
  context: string;
  personalityTraits: string[];
}> {}

export class MusicalElementsEvent extends WorkflowEvent<{
  composition: {
    key: string;
    scale: string;
    tempo: number;
    timeSignature: string;
    melody: number[];
    harmony: string[];
    rhythm: string;
    instruments: string[];
    dynamics: string;
    structure: string[];
  };
  emotionalMapping: any;
}> {}

export class MusicRefinedEvent extends WorkflowEvent<{
  finalComposition: {
    mainTheme: any;
    variations: any[];
    transitions: any[];
    climax: any;
    resolution: any;
    adaptiveElements: any[];
  };
  metadata: any;
}> {}

/**
 * Workflow para Generación de Música Emocional Adaptativa
 *
 * Este workflow crea composiciones musicales únicas que resuenan
 * profundamente con el estado emocional del usuario.
 */
export class EmotionalMusicWorkflow extends Workflow {
  private emotionalScales = {
    happy: ["C major", "G major", "D major", "A major"],
    sad: ["A minor", "D minor", "F# minor", "B minor"],
    energetic: ["E major", "B major", "F# major"],
    calm: ["F major", "Bb major", "Eb major"],
    mysterious: ["C# minor", "G# minor", "F minor"],
    romantic: ["Ab major", "Db major", "Gb major"],
    anxious: ["B minor", "F# minor", "C# minor"],
    triumphant: ["C major", "F major", "Bb major"],
  };

  private instruments = {
    happy: ["piano", "violin", "flute", "guitar", "ukulele"],
    sad: ["cello", "piano", "violin", "oboe", "french horn"],
    energetic: ["electric guitar", "drums", "bass", "synthesizer", "trumpet"],
    calm: ["harp", "flute", "soft piano", "strings", "ambient pads"],
    mysterious: ["theremin", "low strings", "muted trumpet", "vibraphone"],
    romantic: ["violin", "piano", "cello", "soft strings", "harp"],
    anxious: ["dissonant strings", "prepared piano", "electronic textures"],
    triumphant: ["full orchestra", "brass section", "timpani", "choir"],
  };

  /**
   * Paso 1: Análisis emocional multi-modal
   */
  @step()
  async analyzeEmotionalState(
    ev: StartEvent<{
      textInput?: string;
      voiceInput?: Buffer;
      contextualInfo?: {
        timeOfDay: string;
        weather: string;
        activity: string;
        location: string;
      };
      userPreferences?: {
        favoriteGenres: string[];
        dislikedInstruments: string[];
        energyPreference: "low" | "medium" | "high";
      };
    }>
  ) {
    console.log(`🎭 Analizando estado emocional del usuario`);

    let emotionalProfile = {
      primaryEmotion: "neutral",
      secondaryEmotions: [],
      intensity: 0.5,
      valence: 0, // -1 (negativo) a 1 (positivo)
      arousal: 0.5, // 0 (calma) a 1 (energía)
      context: "general",
      personalityTraits: [],
    };

    // Análisis de texto si está disponible
    if (ev.data.textInput) {
      const textAnalysis = await this.analyzeTextEmotion(ev.data.textInput);
      emotionalProfile = this.mergeEmotionalData(
        emotionalProfile,
        textAnalysis
      );
      console.log(
        `📝 Análisis de texto: ${textAnalysis.primaryEmotion} (${textAnalysis.intensity})`
      );
    }

    // Análisis de voz si está disponible
    if (ev.data.voiceInput) {
      const voiceAnalysis = await this.analyzeVoiceEmotion(ev.data.voiceInput);
      emotionalProfile = this.mergeEmotionalData(
        emotionalProfile,
        voiceAnalysis
      );
      console.log(
        `🎤 Análisis de voz: ${voiceAnalysis.primaryEmotion} (${voiceAnalysis.intensity})`
      );
    }

    // Análisis contextual
    if (ev.data.contextualInfo) {
      const contextualEmotions = this.inferContextualEmotions(
        ev.data.contextualInfo
      );
      emotionalProfile.context = this.determineContext(ev.data.contextualInfo);
      emotionalProfile.secondaryEmotions.push(...contextualEmotions);
    }

    // Análisis de personalidad basado en preferencias
    if (ev.data.userPreferences) {
      emotionalProfile.personalityTraits = this.inferPersonalityTraits(
        ev.data.userPreferences
      );
    }

    console.log(
      `🎯 Perfil emocional: ${emotionalProfile.primaryEmotion} (intensidad: ${emotionalProfile.intensity})`
    );
    console.log(
      `💫 Emociones secundarias: ${emotionalProfile.secondaryEmotions.join(
        ", "
      )}`
    );

    return new EmotionAnalyzedEvent(emotionalProfile);
  }

  /**
   * Paso 2: Generación de elementos musicales base
   */
  @step()
  async generateMusicalElements(ev: EmotionAnalyzedEvent) {
    console.log(
      `🎵 Generando elementos musicales para ${ev.data.primaryEmotion}`
    );

    const emotionalMapping = this.createEmotionalMapping(ev.data);

    // Seleccionar tonalidad y escala
    const key = this.selectOptimalKey(ev.data.primaryEmotion, ev.data.valence);
    const scale = this.selectScale(ev.data.primaryEmotion, ev.data.arousal);

    // Calcular tempo basado en arousal y contexto
    const tempo = this.calculateTempo(
      ev.data.arousal,
      ev.data.intensity,
      ev.data.context
    );

    // Generar melodía principal
    const melody = await this.generateMelody(
      key,
      scale,
      ev.data.valence,
      ev.data.intensity,
      ev.data.personalityTraits
    );

    // Crear armonía
    const harmony = this.generateHarmony(key, scale, ev.data.valence, melody);

    // Diseñar ritmo
    const rhythm = this.createRhythm(
      tempo,
      ev.data.arousal,
      ev.data.primaryEmotion
    );

    // Seleccionar instrumentos
    const instruments = this.selectInstruments(
      ev.data.primaryEmotion,
      ev.data.secondaryEmotions,
      ev.data.personalityTraits
    );

    // Determinar dinámicas
    const dynamics = this.calculateDynamics(ev.data.intensity, ev.data.arousal);

    // Crear estructura musical
    const structure = this.designStructure(ev.data.intensity, ev.data.context);

    const composition = {
      key,
      scale,
      tempo,
      timeSignature: this.selectTimeSignature(ev.data.primaryEmotion),
      melody,
      harmony,
      rhythm,
      instruments,
      dynamics,
      structure,
    };

    console.log(`🎼 Composición base: ${key} ${scale}, ${tempo} BPM`);
    console.log(`🎺 Instrumentos: ${instruments.join(", ")}`);

    return new MusicalElementsEvent({
      composition,
      emotionalMapping,
    });
  }

  /**
   * Paso 3: Refinamiento y adaptación emocional
   */
  @step()
  async refineEmotionalAdaptation(ev: MusicalElementsEvent) {
    console.log(`🎨 Refinando adaptación emocional de la composición`);

    const { composition, emotionalMapping } = ev.data;

    // Crear tema principal con variaciones emocionales
    const mainTheme = this.developMainTheme(
      composition.melody,
      emotionalMapping
    );

    // Generar variaciones que exploren diferentes aspectos emocionales
    const variations = await this.createEmotionalVariations(
      mainTheme,
      emotionalMapping,
      composition
    );

    // Diseñar transiciones suaves entre secciones
    const transitions = this.createEmotionalTransitions(
      variations,
      emotionalMapping.emotionalJourney
    );

    // Crear clímax emocional
    const climax = this.designEmotionalClimax(
      mainTheme,
      emotionalMapping.peakEmotion,
      composition
    );

    // Diseñar resolución satisfactoria
    const resolution = this.createEmotionalResolution(
      climax,
      emotionalMapping.targetResolution,
      composition
    );

    // Elementos adaptativos para diferentes contextos
    const adaptiveElements = this.createAdaptiveElements(
      composition,
      emotionalMapping
    );

    const finalComposition = {
      mainTheme,
      variations,
      transitions,
      climax,
      resolution,
      adaptiveElements,
    };

    const metadata = {
      emotionalJourney: emotionalMapping.emotionalJourney,
      keyMoments: this.identifyKeyMoments(finalComposition),
      adaptationPoints: this.identifyAdaptationPoints(adaptiveElements),
      estimatedDuration: this.calculateDuration(finalComposition),
      moodDescription: this.generateMoodDescription(emotionalMapping),
    };

    console.log(`✨ Composición refinada con ${variations.length} variaciones`);
    console.log(`⏱️ Duración estimada: ${metadata.estimatedDuration}`);

    return new MusicRefinedEvent({
      finalComposition,
      metadata,
    });
  }

  /**
   * Paso 4: Finalización y exportación
   */
  @step()
  async finalizeComposition(ev: MusicRefinedEvent) {
    console.log(`🎯 Finalizando composición musical personalizada`);

    const { finalComposition, metadata } = ev.data;

    // Crear partitura digital
    const digitalScore = this.generateDigitalScore(finalComposition);

    // Generar archivo MIDI
    const midiData = this.exportToMIDI(finalComposition);

    // Crear visualización de la composición
    const visualization = this.createMusicVisualization(
      finalComposition,
      metadata
    );

    // Generar recomendaciones de interpretación
    const performanceNotes = this.generatePerformanceNotes(
      finalComposition,
      metadata.emotionalJourney
    );

    // Crear variantes para diferentes instrumentaciones
    const arrangements = this.createArrangements(finalComposition);

    const finalMusic = {
      composition: finalComposition,
      metadata: {
        ...metadata,
        generatedAt: new Date(),
        uniqueId: this.generateUniqueId(),
        version: "1.0",
      },
      exports: {
        digitalScore,
        midiData,
        visualization,
        arrangements,
      },
      performanceGuide: {
        notes: performanceNotes,
        emotionalCues: this.createEmotionalCues(metadata.emotionalJourney),
        interpretationSuggestions:
          this.generateInterpretationSuggestions(finalComposition),
      },
      adaptiveFeatures: {
        realTimeModulation: this.createRealTimeModulation(finalComposition),
        contextualVariations: this.createContextualVariations(finalComposition),
        interactiveElements: this.createInteractiveElements(finalComposition),
      },
    };

    console.log(`🎉 Composición musical personalizada completada`);
    console.log(`🎼 ${finalMusic.metadata.moodDescription}`);

    return new StopEvent({ music: finalMusic });
  }

  // Métodos especializados de análisis emocional

  private async analyzeTextEmotion(text: string) {
    // Análisis sofisticado de emociones en texto
    const emotionKeywords = {
      happy: [
        "feliz",
        "alegre",
        "contento",
        "eufórico",
        "radiante",
        "jubiloso",
      ],
      sad: ["triste", "melancólico", "deprimido", "desanimado", "nostálgico"],
      energetic: ["energético", "vibrante", "dinámico", "activo", "entusiasta"],
      calm: ["tranquilo", "sereno", "pacífico", "relajado", "zen"],
      anxious: ["ansioso", "nervioso", "preocupado", "estresado", "inquieto"],
      romantic: ["romántico", "amoroso", "tierno", "apasionado", "íntimo"],
      mysterious: ["misterioso", "enigmático", "intrigante", "oculto"],
      triumphant: [
        "triunfante",
        "victorioso",
        "exitoso",
        "orgulloso",
        "conquistador",
      ],
    };

    const lowerText = text.toLowerCase();
    const emotionScores = {};

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const score = keywords.reduce((sum, keyword) => {
        const matches = (lowerText.match(new RegExp(keyword, "g")) || [])
          .length;
        return sum + matches;
      }, 0);
      emotionScores[emotion] = score;
    }

    const primaryEmotion = Object.entries(emotionScores).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    const intensity = Math.min(
      Object.values(emotionScores).reduce((a, b) => a + b, 0) / 10,
      1
    );
    const valence = this.calculateValence(primaryEmotion);

    return {
      primaryEmotion,
      intensity,
      valence,
      secondaryEmotions: Object.entries(emotionScores)
        .filter(([emotion, score]) => score > 0 && emotion !== primaryEmotion)
        .map(([emotion]) => emotion)
        .slice(0, 2),
    };
  }

  private async generateMelody(
    key: string,
    scale: string,
    valence: number,
    intensity: number,
    personalityTraits: string[]
  ): Promise<number[]> {
    const melody = [];
    const scaleNotes = this.getScaleNotes(key, scale);
    const melodyLength = 16; // 16 notas para la melodía base

    // Generar contorno melódico basado en emociones
    const contour = this.generateMelodicContour(valence, intensity);

    for (let i = 0; i < melodyLength; i++) {
      const contourDirection = contour[i % contour.length];
      const noteIndex = this.selectNoteIndex(
        scaleNotes,
        contourDirection,
        valence
      );
      const note = scaleNotes[noteIndex];

      // Aplicar modificaciones basadas en personalidad
      const modifiedNote = this.applyPersonalityModifications(
        note,
        personalityTraits,
        i,
        melodyLength
      );

      melody.push(modifiedNote);
    }

    return melody;
  }

  private createEmotionalMapping(emotionData: any) {
    return {
      primaryEmotion: emotionData.primaryEmotion,
      emotionalJourney: this.designEmotionalJourney(emotionData),
      peakEmotion: this.identifyPeakEmotion(emotionData),
      targetResolution: this.determineTargetResolution(emotionData),
      emotionalContrasts: this.identifyEmotionalContrasts(emotionData),
      dynamicRange: this.calculateDynamicRange(
        emotionData.intensity,
        emotionData.arousal
      ),
    };
  }

  private async createEmotionalVariations(
    mainTheme: any,
    emotionalMapping: any,
    composition: any
  ) {
    const variations = [];

    // Variación de intensidad
    variations.push({
      type: "intensity",
      theme: this.modulateIntensity(mainTheme, emotionalMapping.dynamicRange),
      description: "Exploración de diferentes niveles de intensidad emocional",
    });

    // Variación de tempo
    variations.push({
      type: "temporal",
      theme: this.modulateTempo(mainTheme, composition.tempo),
      description:
        "Variación temporal que refleja cambios en el arousal emocional",
    });

    // Variación armónica
    variations.push({
      type: "harmonic",
      theme: this.reharmonize(mainTheme, emotionalMapping.emotionalContrasts),
      description: "Reharmonización que explora matices emocionales",
    });

    return variations;
  }

  private generateMoodDescription(emotionalMapping: any): string {
    const descriptions = {
      happy:
        "Una composición luminosa y elevadora que irradia alegría y optimismo",
      sad: "Una pieza melancólica y contemplativa que abraza la tristeza con belleza",
      energetic:
        "Una composición vibrante y dinámica que pulsa con energía vital",
      calm: "Una pieza serena y meditativa que invita a la tranquilidad interior",
      romantic: "Una composición íntima y apasionada que celebra el amor",
      mysterious:
        "Una pieza enigmática que explora los misterios del alma humana",
      anxious:
        "Una composición que captura la tensión y la inquietud con sensibilidad",
      triumphant: "Una pieza majestuosa que celebra la victoria y el logro",
    };

    return (
      descriptions[emotionalMapping.primaryEmotion] ||
      "Una composición única que refleja la complejidad emocional humana"
    );
  }
}

/**
 * Función de uso del workflow
 */
export async function generateEmotionalMusic(input: {
  textInput?: string;
  voiceInput?: Buffer;
  context?: any;
  preferences?: any;
}) {
  console.log(`🚀 Iniciando generación de música emocional personalizada\n`);

  const workflow = new EmotionalMusicWorkflow();

  try {
    const result = await workflow.run(input);
    const { music } = result.data;

    console.log("\n🎼 COMPOSICIÓN MUSICAL GENERADA");
    console.log("=".repeat(50));

    console.log(`\n🎭 PERFIL EMOCIONAL:`);
    console.log(`Descripción: ${music.metadata.moodDescription}`);
    console.log(`Duración: ${music.metadata.estimatedDuration}`);

    console.log(`\n🎵 ELEMENTOS MUSICALES:`);
    console.log(`Tonalidad: ${music.composition.mainTheme.key}`);
    console.log(`Tempo: ${music.composition.mainTheme.tempo} BPM`);
    console.log(
      `Instrumentos: ${music.composition.mainTheme.instruments?.join(", ")}`
    );

    console.log(`\n🎨 CARACTERÍSTICAS ADAPTATIVAS:`);
    console.log(`Variaciones: ${music.composition.variations.length}`);
    console.log(
      `Elementos interactivos: ${
        Object.keys(music.adaptiveFeatures.interactiveElements).length
      }`
    );

    return music;
  } catch (error) {
    console.error(`❌ Error en generación musical: ${error}`);
    throw error;
  }
}

// Ejemplo de uso
if (require.main === module) {
  generateEmotionalMusic({
    textInput:
      "Me siento nostálgico pensando en los veranos de mi infancia, cuando todo parecía posible y el tiempo se movía más lento",
    context: {
      timeOfDay: "evening",
      weather: "rainy",
      activity: "reflecting",
      location: "home",
    },
    preferences: {
      favoriteGenres: ["classical", "ambient", "neo-classical"],
      energyPreference: "low",
    },
  })
    .then((music) => {
      console.log("\n✅ Música emocional generada exitosamente");
      console.log(`🎼 ID único: ${music.metadata.uniqueId}`);
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
    });
}
