import { Effect } from "effect";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { cleanTextForTTS } from "fonema";

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
  voiceName?: string; // e.g., 'es-US-Neural2-A'
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
          const credentialsJson = Buffer.from(
            process.env.GOOGLE_CREDENTIALS_BASE64,
            "base64"
          ).toString("utf-8");
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

      const cleanText = yield* cleanTextForTTS(text);
      if (cleanText.length === 0) {
        yield* Effect.fail(
          new TTSError("No valid text content for TTS", "EMPTY_TEXT")
        );
      }

      // Google Cloud handles long text, but let's keep a reasonable limit
      const chunks = splitTextIntoChunks(cleanText, 5000);
      const audioBuffers: ArrayBuffer[] = [];

      for (const chunk of chunks) {
        // Extract language code from voice name (e.g., "es-ES-Neural2-A" -> "es-ES")
        const voiceName = options.voiceName || "es-US-Neural2-A";
        const extractedLanguageCode = voiceName
          .split("-")
          .slice(0, 2)
          .join("-");

        // Configuración optimizada para español
        const request = {
          input: { text: chunk },
          voice: {
            languageCode: options.languageCode || extractedLanguageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3" as const,
            speakingRate: options.speakingRate || 1.0, // Velocidad ligeramente reducida para mejor claridad
            pitch: options.pitch || 0,
            volumeGainDb: 0, // Volumen normal
            sampleRateHertz: 24000, // Frecuencia de muestreo óptima para voz

            // Perfil de efectos optimizado para voz clara en español
            effectsProfileId: ["telephony-class-application"],

            // Configuración específica para puntuación
            enableTimepointing: ["SSML_MARK"],
          },
        };

        const [response] = yield* Effect.tryPromise({
          try: () => client.synthesizeSpeech(request),
          catch: (error) =>
            new TTSError(
              `Google Cloud TTS API error: ${
                error instanceof Error ? error.message : "Unknown"
              }`,
              "API_ERROR",
              error
            ),
        });

        if (response.audioContent instanceof Uint8Array) {
          // Cast to ArrayBuffer to ensure compatibility
          audioBuffers.push(response.audioContent.buffer as ArrayBuffer);
        } else {
          yield* Effect.fail(
            new TTSError(
              "Received invalid audio content from API",
              "INVALID_RESPONSE"
            )
          );
        }
      }

      // For now, return the first chunk. Concatenation would be needed for production.
      if (audioBuffers.length === 0) {
        yield* Effect.fail(
          new TTSError(
            "Audio generation failed, no buffers created",
            "GENERATION_FAILED"
          )
        );
      }

      return audioBuffers[0];
    }),

  listVoices: () =>
    Effect.gen(function* () {
      let client: TextToSpeechClient;
      if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        try {
          const credentialsJson = Buffer.from(
            process.env.GOOGLE_CREDENTIALS_BASE64,
            "base64"
          ).toString("utf-8");
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
            `Google Cloud TTS API error: ${
              error instanceof Error ? error.message : "Unknown"
            }`,
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

/**
 * Splits text into chunks that are at most maxBytes bytes long, trying to split at sentence boundaries.
 * If a single sentence exceeds maxBytes, it will be split at the word boundary.
 */
function splitTextIntoChunks(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  // Split text into sentences first (naive approach)
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    const sentenceBytes = Buffer.byteLength(sentence, "utf8");

    // If the sentence is too large, split it into words
    if (sentenceBytes > maxBytes) {
      const words = sentence.split(/(\s+)/);

      for (const word of words) {
        const wordBytes = Buffer.byteLength(word, "utf8");
        const chunkWithWordBytes = Buffer.byteLength(
          currentChunk + word,
          "utf8"
        );

        if (chunkWithWordBytes <= maxBytes) {
          currentChunk += word;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
          }

          // If a single word is larger than maxBytes, we have to split it
          if (wordBytes > maxBytes) {
            const splitWord = splitLongText(word, maxBytes);
            // Add all but the last part to chunks
            chunks.push(...splitWord.slice(0, -1));
            // Set the last part as current chunk
            currentChunk = splitWord[splitWord.length - 1] || "";
          } else {
            currentChunk = word;
          }
        }
      }
    } else {
      const chunkWithSentenceBytes = Buffer.byteLength(
        currentChunk + " " + sentence,
        "utf8"
      );

      if (currentChunk && chunkWithSentenceBytes > maxBytes) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
      }
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Splits a long text into chunks that are at most maxBytes bytes long,
 * trying to split at word boundaries when possible.
 * This is a helper function used when we have text that needs to be split
 * to fit within size constraints.
 */
function splitLongText(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    // If the remaining text is small enough, add it and finish
    if (Buffer.byteLength(remainingText, "utf8") <= maxBytes) {
      chunks.push(remainingText);
      break;
    }

    // Start by trying to split at a word boundary
    let splitPos = Math.min(maxBytes, remainingText.length);
    let chunk = remainingText.slice(0, splitPos);

    // Adjust for multi-byte characters
    while (Buffer.byteLength(chunk, "utf8") > maxBytes) {
      splitPos--;
      chunk = remainingText.slice(0, splitPos);
    }

    // Try to find the last space to avoid splitting words
    const lastSpace = chunk.lastIndexOf(" ");
    if (lastSpace > 0 && splitPos - lastSpace < 20) {
      // Only move back a little to avoid very long words
      splitPos = lastSpace + 1; // Include the space
      chunk = remainingText.slice(0, splitPos);
    }

    // If we couldn't find a good split point, just split at the maxBytes
    if (chunk.length === 0) {
      splitPos = Math.min(maxBytes, remainingText.length);
      chunk = remainingText.slice(0, splitPos);

      // Adjust for multi-byte characters
      while (Buffer.byteLength(chunk, "utf8") > maxBytes) {
        splitPos--;
        chunk = remainingText.slice(0, splitPos);
      }
    }

    chunks.push(chunk.trim());
    remainingText = remainingText.slice(splitPos).trimStart();
  }

  return chunks;
}

// Export service instance
export const ttsService = TTSServiceLive;
