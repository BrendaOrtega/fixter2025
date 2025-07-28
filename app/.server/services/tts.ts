import { Effect } from "effect";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// Google Cloud TTS Service using Effect
export interface Voice {
  name: string;
  gender: string;
}

export interface TTSService {
  generateSpeech: (
    text: string,
    options?: TTSOptions
  ) => Effect.Effect<ArrayBuffer, TTSError>;
  listVoices: () => Effect.Effect<Voice[], TTSError>;
}

export interface TTSOptions {
  languageCode?: string;
  voiceName?: string; // e.g., 'en-US-Wavenet-F'
  speakingRate?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
}

export class TTSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "TTSError";
  }
}

// Google Cloud TTS implementation
export const TTSServiceLive: TTSService = {
  generateSpeech: (text: string, options: TTSOptions = {}) =>
    Effect.gen(function* () {
      let client: TextToSpeechClient;

      if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        try {
          const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
          const credentials = JSON.parse(credentialsJson);
          client = new TextToSpeechClient({ credentials });
        } catch (error) {
          yield* Effect.fail(
            new TTSError(
              "Failed to parse Google Cloud credentials from GOOGLE_CREDENTIALS_BASE64.",
              "INVALID_CREDENTIALS",
              error
            )
          );
        }
      } else {
        yield* Effect.fail(
          new TTSError(
            "Google Cloud credentials not configured. Please set the GOOGLE_CREDENTIALS_BASE64 environment variable.",
            "MISSING_CONFIG"
          )
        );
      }


      const cleanText = cleanTextForTTS(text);
      if (cleanText.length === 0) {
        yield* Effect.fail(
          new TTSError("No valid text content for TTS", "EMPTY_TEXT")
        );
      }

      // Google Cloud handles long text, but let's keep a reasonable limit
      const chunks = splitTextIntoChunks(cleanText, 5000);
      const audioBuffers: ArrayBuffer[] = [];

      for (const chunk of chunks) {
        const request = {
          input: { text: chunk },
          voice: {
            languageCode: options.languageCode || "es-US",
            name: options.voiceName || "es-US-Wavenet-A",
          },
          audioConfig: {
            audioEncoding: "MP3" as const,
            speakingRate: options.speakingRate || 1.0,
            pitch: options.pitch || 0,
          },
        };

        const [response] = yield* Effect.tryPromise({
          try: () => client.synthesizeSpeech(request),
          catch: (error) =>
            new TTSError(
              `Google Cloud TTS API error: ${error instanceof Error ? error.message : 'Unknown'}`,
              "API_ERROR",
              error
            ),
        });

        if (response.audioContent instanceof Uint8Array) {
          audioBuffers.push(response.audioContent.buffer);
        } else {
          yield* Effect.fail(
            new TTSError("Received invalid audio content from API", "INVALID_RESPONSE")
          );
        }
      }

      // For now, return the first chunk. Concatenation would be needed for production.
      if (audioBuffers.length === 0) {
        yield* Effect.fail(new TTSError("Audio generation failed, no buffers created", "GENERATION_FAILED"));
      }

      return audioBuffers[0];
    }),

  listVoices: () =>
    Effect.gen(function* () {
      let client: TextToSpeechClient;
      if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        try {
          const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
          const credentials = JSON.parse(credentialsJson);
          client = new TextToSpeechClient({ credentials });
        } catch (error) {
          yield* Effect.fail(
            new TTSError(
              "Failed to parse Google Cloud credentials from GOOGLE_CREDENTIALS_BASE64.",
              "INVALID_CREDENTIALS",
              error
            )
          );
        }
      } else {
        yield* Effect.fail(
          new TTSError(
            "Google Cloud credentials not configured. Please set the GOOGLE_CREDENTIALS_BASE64 environment variable.",
            "MISSING_CONFIG"
          )
        );
      }

      const [response] = yield* Effect.tryPromise({
        try: () => client.listVoices({ languageCode: "es-US" }),
        catch: (error) =>
          new TTSError(
            `Google Cloud TTS API error: ${error instanceof Error ? error.message : 'Unknown'}`,
            "API_ERROR",
            error
          ),
      });

      const voices = response.voices || [];

      return (
        voices
          .filter(
            (voice) =>
              voice.name?.includes("Wavenet") &&
              (voice.languageCodes?.includes("es-US") ||
                voice.languageCodes?.includes("es-ES"))
          )
          .map((voice) => ({
            name: voice.name || "Unknown",
            gender: (voice.ssmlGender || "Unknown").toString(),
          }))
          // Sort to have female voices first
          .sort((a, b) => (a.gender === "FEMALE" ? -1 : 1))
      );
    }),
};

// Clean text for TTS (remove markdown, HTML, URLs, etc.)
function cleanTextForTTS(text: string): string {
  if (!text) return '';
  
  // First, remove all URLs and email addresses
  const urlPatterns = [
    // Standard URLs with http/https
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+[^\s]*/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // URL fragments without protocol
    /(?:^|\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/g,
  ];

  let cleaned = text;
  for (const pattern of urlPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Then clean up markdown and HTML
  cleaned = cleaned
    .replace(/^#{1,6}\s+/gm, "") // Headers
    .replace(/\([^[]+\]\([^)]+\)/g, "$1") // Links [text](url)
    .replace(/\[([^\]]+)\]/g, "$1") // Link text [text]
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold **text**
    .replace(/\*([^*]+)\*/g, "$1") // Italic *text*
    .replace(/__([^_]+)__/g, "$1") // Bold __text__
    .replace(/_([^_]+)_/g, "$1") // Italic _text_
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/<[^>]*>/g, "") // HTML tags
    .replace(/\n\s*\n/g, "\n\n") // Multiple newlines
    .replace(/\.(\s|$)/g, '$1') // Remove trailing dots
    .replace(/\s+/g, " ") // Multiple spaces
    .trim();

  return cleaned;
}

// Split text into chunks for TTS processing
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

// Export service instance
export const ttsService = TTSServiceLive;
