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
        // Extract language code from voice name (e.g., "es-ES-Neural2-A" -> "es-ES")
        const voiceName = options.voiceName || "es-US-Neural2-A";
        const extractedLanguageCode = voiceName
          .split("-")
          .slice(0, 2)
          .join("-");

        const request = {
          input: { text: chunk },
          voice: {
            languageCode: options.languageCode || extractedLanguageCode,
            name: voiceName,
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

// Common emoji to text mapping @todo remove?
const EMOJI_MAP: Record<string, string> = {
  "😊": "sonriendo",
  "😂": "riendo",
  "😍": "enamorado",
  "🥰": "enamorado",
  "😎": "con gafas de sol",
  "👍": "pulgar arriba",
  "👎": "pulgar abajo",
  "❤️": "corazón",
  "🔥": "fuego",
  "🎉": "festejando",
  "✨": "brillando",
  "🤔": "pensando",
  "🤯": "sorprendido",
  "👏": "aplaudiendo",
  "🙏": "rezando",
  "💪": "músculo",
  "🎯": "diana",
  "🚀": "cohete",
  "📚": "libros",
  "💡": "bombilla",
  "👀": "ojos",
  "🙌": "celebrando",
  "🤝": "apretón de manos",
  "💯": "cien puntos",
  "✅": "marca de verificación",
  "❌": "equis",
  "⚠️": "advertencia",
  "❓": "signo de interrogación",
  "❗": "signo de exclamación",
};

// Clean text for TTS (remove markdown, HTML, URLs, etc.)
function cleanTextForTTS(text: string): string {
  if (!text) return "";

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

  // Remove all emojis
  cleaned = cleaned.replace(/[\p{Emoji}]/gu, " ");

  // Clean up markdown, HTML, and other formatting
  cleaned = cleaned
    .replace(/^#{1,6}\s+/gm, "") // Headers
    .replace(/\([^[]+\]\([^)]+\)/g, "$1") // Links [text](url)
    .replace(/\[([^\]]+)\]/g, "$1") // Link text [text]
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold **text**
    .replace(/\*([^*]+)\*/g, "$1") // Italic *text*
    .replace(/__([^_]+)__/g, "$1") // Bold __text__
    .replace(/_([^_]+)_/g, "$1") // Italic _text_
    .replace(/```[\s\S]*?```/gs, "") // Code blocks (with 's' flag for . to match newlines)
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/<[^>]*>/g, "") // HTML tags
    .replace(/\[([^\]]+)\]/g, "$1") // Remove any remaining square brackets
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // Replace en/em dashes with hyphen
    .replace(/\s*[\r\n]+\s*/g, "\n") // Normalize line breaks
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines to 2
    .replace(/\.(\s|$)/g, ".$1") // Ensure space after periods
    .replace(/([.!?])\s*/g, "$1 ") // Ensure space after sentence endings
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/^\s+|\s+$/g, ""); // Trim whitespace

  // Format numbers for proper speech using SSML
  // Match numbers with potential decimal points and convert them to SSML say-as tags
  cleaned = cleaned.replace(
    /(\d+(\.\d+)?)/g,
    '<say-as interpret-as="cardinal">$1</say-as>'
  );

  // Add a natural pause after titles and headings
  // 1. For titles followed by text (title ends with punctuation and newline)
  cleaned = cleaned.replace(
    /([.!?])\s*\n\s*([A-Z])/g,
    '$1<break time="1s"/> $2'
  );

  // 2. For headings (lines ending with : or ? followed by newline)
  cleaned = cleaned.replace(/([:?])\s*\n/g, '$1<break time="1.5s"/>\n');

  // 3. For paragraphs (double newlines)
  cleaned = cleaned.replace(/\n\s*\n/g, '<break time="2s"/>');

  // 4. For list items (lines starting with - or *)
  cleaned = cleaned.replace(/\n\s*[-*]\s+/g, '<break time="1s"/> ');

  // 5. For sentences (add a small pause after sentence-ending punctuation)
  cleaned = cleaned.replace(/([.!?])\s+/g, '$1<break time="0.8s"/> ');

  // 6. For commas and semicolons (shorter pause)
  cleaned = cleaned.replace(/([,;])\s+/g, '$1<break time="0.3s"/> ');

  // Remove any remaining double spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Wrap the final text in SSML tags for better control
  cleaned = `<speak>${cleaned}</speak>`;

  return cleaned;
}

/**
 * Splits text into chunks that are at most maxBytes bytes long, trying to split at sentence boundaries.
 * If a single sentence exceeds maxBytes, it will be split at the word boundary.
 */
function splitTextIntoChunks(text: string, maxBytes: number): string[] {
  // First, try to split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const sentenceBytes = Buffer.byteLength(sentence, "utf8");
    const currentChunkBytes = Buffer.byteLength(currentChunk, "utf8");

    // If adding this sentence would exceed maxBytes, finalize the current chunk
    if (currentChunkBytes + sentenceBytes > maxBytes) {
      // If the current chunk is not empty, add it to chunks
      if (currentChunkBytes > 0) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If this single sentence is larger than maxBytes, we need to split it
      if (sentenceBytes > maxBytes) {
        chunks.push(...splitLongText(sentence, maxBytes));
        continue;
      }
    }

    // Add the sentence to the current chunk
    currentChunk += sentence;
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxBytes)];
}

/**
 * Splits a long text into chunks that are at most maxBytes bytes long,
 * trying to split at word boundaries.
 */
function splitLongText(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let remainingText = text;

  while (Buffer.byteLength(remainingText, "utf8") > maxBytes) {
    // Start with the maximum possible chunk
    let chunk = remainingText.substring(0, maxBytes);

    // Find the last space in the chunk to split at word boundary
    let lastSpace = chunk.lastIndexOf(" ");
    if (lastSpace > 0) {
      chunk = chunk.substring(0, lastSpace).trim();
    }

    // If we couldn't find a space, just split at maxBytes
    if (chunk.length === 0) {
      chunk = remainingText.substring(0, maxBytes).trim();
    }

    chunks.push(chunk);
    remainingText = remainingText.substring(chunk.length).trimStart();

    // Safety check to prevent infinite loops
    if (chunk.length === 0) {
      break;
    }
  }

  // Add the remaining text if there's any left
  if (remainingText.trim().length > 0) {
    chunks.push(remainingText.trim());
  }

  return chunks;
}

// Export service instance
export const ttsService = TTSServiceLive;
