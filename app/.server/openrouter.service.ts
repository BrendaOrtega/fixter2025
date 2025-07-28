import { Effect, Context, Layer } from "effect";

// TTS Options Interface
export interface TTSOptions {
  voice?: string;
  speed?: number;
  format?: "mp3" | "wav";
}

// Voice Interface
export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

// OpenRouter TTS Service Interface
export interface OpenRouterTTSService {
  generateSpeech: (
    text: string,
    options?: TTSOptions
  ) => Effect.Effect<Buffer, Error>;
  estimateCost: (text: string) => Effect.Effect<number, Error>;
  getSupportedVoices: () => Effect.Effect<Voice[], Error>;
}

// OpenRouter TTS Service Tag
export const OpenRouterTTSService = Context.GenericTag<OpenRouterTTSService>(
  "OpenRouterTTSService"
);

// OpenRouter Configuration
interface OpenRouterConfig {
  apiKey: string;
  apiUrl: string;
}

// OpenRouter Config Tag
export const OpenRouterConfig =
  Context.GenericTag<OpenRouterConfig>("OpenRouterConfig");

// Default TTS options
const DEFAULT_TTS_OPTIONS: Required<TTSOptions> = {
  voice: "es-ES-Standard-A", // Spanish voice
  speed: 1.0,
  format: "mp3",
};

// OpenRouter TTS Service Implementation
const makeOpenRouterTTSService = Effect.gen(function* () {
  const config = yield* OpenRouterConfig;

  const generateSpeech = (text: string, options: TTSOptions = {}) =>
    Effect.tryPromise({
      try: async () => {
        const finalOptions = { ...DEFAULT_TTS_OPTIONS, ...options };

        const response = await fetch(`${config.apiUrl}/audio/speech`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://fixtergeek.com",
            "X-Title": "FixterGeek Audio Posts",
          },
          body: JSON.stringify({
            model: "tts-1", // OpenAI TTS model via OpenRouter
            input: text,
            voice: finalOptions.voice,
            response_format: finalOptions.format,
            speed: finalOptions.speed,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenRouter TTS API error: ${response.status} - ${errorText}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      catch: (error) => new Error(`Failed to generate speech: ${error}`),
    });

  const estimateCost = (text: string) =>
    Effect.succeed(() => {
      // OpenRouter TTS pricing estimation (approximate)
      // Based on character count - roughly $0.000015 per character
      const characterCount = text.length;
      const costPerCharacter = 0.000015;
      return characterCount * costPerCharacter;
    });

  const getSupportedVoices = () =>
    Effect.succeed([
      {
        id: "alloy",
        name: "Alloy",
        language: "en-US",
        gender: "neutral",
      },
      {
        id: "echo",
        name: "Echo",
        language: "en-US",
        gender: "male",
      },
      {
        id: "fable",
        name: "Fable",
        language: "en-US",
        gender: "neutral",
      },
      {
        id: "onyx",
        name: "Onyx",
        language: "en-US",
        gender: "male",
      },
      {
        id: "nova",
        name: "Nova",
        language: "en-US",
        gender: "female",
      },
      {
        id: "shimmer",
        name: "Shimmer",
        language: "en-US",
        gender: "female",
      },
    ]);

  return OpenRouterTTSService.of({
    generateSpeech,
    estimateCost,
    getSupportedVoices,
  });
});

// OpenRouter TTS Service Layer
export const OpenRouterTTSServiceLive = Layer.effect(
  OpenRouterTTSService,
  makeOpenRouterTTSService
).pipe(
  Layer.provide(
    Layer.succeed(OpenRouterConfig, {
      apiKey: process.env.OPEN_ROUTER_API_KEY!,
      apiUrl: process.env.OPEN_ROUTER_API_URL!,
    })
  )
);
