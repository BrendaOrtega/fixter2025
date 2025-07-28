// Available TTS voices for OpenRouter
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  language: string;
  gender: "male" | "female" | "neutral";
  accent?: string;
  category: "standard" | "premium" | "neural";
  previewText?: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // OpenAI TTS-1 Voices (Standard)
  {
    id: "alloy",
    name: "Alloy",
    description: "Voz neutral y clara, ideal para contenido técnico",
    language: "es",
    gender: "neutral",
    category: "standard",
    previewText: "Hola, soy Alloy. Mi voz es clara y profesional.",
  },
  {
    id: "echo",
    name: "Echo",
    description: "Voz masculina con tono cálido y amigable",
    language: "es",
    gender: "male",
    category: "standard",
    previewText: "Hola, soy Echo. Mi voz es cálida y conversacional.",
  },
  {
    id: "fable",
    name: "Fable",
    description: "Voz femenina expresiva, perfecta para storytelling",
    language: "es",
    gender: "female",
    category: "standard",
    previewText: "Hola, soy Fable. Mi voz es expresiva y envolvente.",
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Voz masculina profunda y autoritaria",
    language: "es",
    gender: "male",
    category: "standard",
    previewText: "Hola, soy Onyx. Mi voz es profunda y confiable.",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Voz femenina joven y energética",
    language: "es",
    gender: "female",
    category: "standard",
    previewText: "Hola, soy Nova. Mi voz es joven y llena de energía.",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Voz femenina suave y elegante",
    language: "es",
    gender: "female",
    category: "standard",
    previewText: "Hola, soy Shimmer. Mi voz es suave y sofisticada.",
  },
];

// Voice categories for filtering
export const VOICE_CATEGORIES = {
  all: "Todas las voces",
  male: "Voces masculinas",
  female: "Voces femeninas",
  neutral: "Voces neutrales",
  standard: "Voces estándar",
  premium: "Voces premium",
  neural: "Voces neurales",
} as const;

// Default voice
export const DEFAULT_VOICE = "alloy";

// Get voice by ID
export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return AVAILABLE_VOICES.find((voice) => voice.id === voiceId);
}

// Get voices by category
export function getVoicesByCategory(
  category: keyof typeof VOICE_CATEGORIES
): VoiceOption[] {
  if (category === "all") return AVAILABLE_VOICES;

  return AVAILABLE_VOICES.filter((voice) => {
    switch (category) {
      case "male":
      case "female":
      case "neutral":
        return voice.gender === category;
      case "standard":
      case "premium":
      case "neural":
        return voice.category === category;
      default:
        return true;
    }
  });
}

// Get voice display name
export function getVoiceDisplayName(voiceId: string): string {
  const voice = getVoiceById(voiceId);
  return voice ? voice.name : "Voz desconocida";
}

// Validate voice ID
export function isValidVoice(voiceId: string): boolean {
  return AVAILABLE_VOICES.some((voice) => voice.id === voiceId);
}
