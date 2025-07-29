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

        // Configuración optimizada para español
        const request = {
          input: { text: chunk },
          voice: {
            languageCode: options.languageCode || extractedLanguageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3" as const,
            speakingRate: options.speakingRate || 1.0,  // Velocidad ligeramente reducida para mejor claridad
            pitch: options.pitch || 0,
            volumeGainDb: 0,  // Volumen normal
            sampleRateHertz: 24000,  // Frecuencia de muestreo óptima para voz
            
            // Perfil de efectos optimizado para voz clara en español
            effectsProfileId: ["telephony-class-application"],
            
            // Configuración específica para puntuación
            enableTimepointing: ["SSML_MARK"]
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
export function cleanTextForTTS(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // First, remove all image references and markdown images
  cleaned = cleaned
    .replace(/!\[([^\]]*?)\]\([^)]+?\)/g, "") // Markdown images: ![...](...)
    .replace(/<img[^>]+>/g, "") // HTML images
    .replace(/\[img\][^\[]*\[\/img\]/gi, ""); // BBCode images

  // Remove all URLs and email addresses
  const urlPatterns = [
    // Standard URLs with http/https
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+[^\s]*/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // URL fragments without protocol
    /(?:^|\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/g,
    // File paths
    /(?:\/[\w.-]+)+\/?(?:\?[^\s]*)?/g,
    // Common file extensions
    /\b\w+\.(?:jpg|jpeg|png|gif|svg|webp|pdf|docx?|xlsx?|pptx?|txt|csv|zip|tar\.gz|mp3|mp4|mov|avi|wav|flac|aac|ogg|webm)\b/gi,
  ];

  // Apply all URL patterns
  urlPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Remove all emojis
  cleaned = cleaned.replace(/[\p{Emoji}]/gu, " ");

  // Handle code blocks and inline code
  cleaned = cleaned
    // Completely remove code blocks with triple backticks
    .replace(/```[\s\S]*?```/gs, '')
    // Remove indented code blocks (4 spaces or tab at start of line)
    .replace(/^( {4,}|\t).*$/gm, '')
    // Remove backticks but keep the content inside for inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks in HTML <pre> and <code> tags but keep content
    .replace(/<(pre|code|kbd|samp|var)>([\s\S]*?)<\/\1>/gi, '$2')
    // Remove XML/HTML comments
    .replace(/<!--[\s\S]*?-->/g, "");

  // Clean up markdown, HTML, and other formatting
  cleaned = cleaned
    // Remove # from headers but keep the text
    .replace(/^#{1,6}\s+/gm, (match) => '\n\n') // Add double newline before headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links [text](url)
    .replace(
      /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      "$2"
    ) // HTML links
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold **text**
    .replace(/\*([^*]+)\*/g, "$1") // Italic *text*
    .replace(/__([^_]+)__/g, "$1") // Bold __text__
    .replace(/_([^_]+)_/g, "$1") // Italic _text_
    .replace(/<[^>]*>/g, "") // HTML tags
    .replace(/\[([^\]]+)\]/g, "$1") // Remove any remaining square brackets
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // Replace en/em dashes with hyphen
    
  // Normalize line breaks and paragraphs
  cleaned = cleaned
    .replace(/\s*\n\s*\n\s*/g, '\n\n')  // Preserve double newlines as paragraph breaks
    .replace(/\s*\n\s*/g, ' ')  // Convert single newlines to spaces
    
  // Mejorar el manejo de puntuación para español
  // 1. Manejo de espacios alrededor de signos de puntuación
  // Primero normalizamos todos los signos de puntuación para que no tengan espacios antes
  cleaned = cleaned
    .replace(/\s*([.,;:!?])\s*/g, '$1 ')  // Un solo espacio después de cada signo de puntuación
    .replace(/\s+/g, ' ')  // Normalizar múltiples espacios a uno solo
    
  // 2. Manejo especial para comas - asegurar que siempre tengan un espacio después
  // y que no tengan espacios antes
  cleaned = cleaned
    .replace(/,+/g, ',')  // Eliminar comas duplicadas
    .replace(/\s*,/g, ',')  // Eliminar espacios antes de comas
    .replace(/,(?=[^\s])/g, ', ')  // Añadir espacio después de comas si no lo hay
    
  // 3. Manejo especial para puntos - asegurar que terminen oraciones
  cleaned = cleaned
    .replace(/\.+/g, '.')  // Eliminar puntos duplicados
    .replace(/([a-z])\.\s*([a-z])/g, (match, p1, p2) => {
      // Asegurar mayúscula después de punto si es inicio de oración
      return `${p1}. ${p2.toUpperCase()}`;
    });
    
  // Handle lists
  cleaned = cleaned
    .replace(/\s*[\*\-]\s+/g, '\n• ')  // Convert bullet points
    .replace(/\s*\d+\.\s+/g, '\n$&')  // Numbered lists on new lines
    .replace(/\.(\s|$)/g, ".$1") // Ensure space after periods
    .replace(/(?:^|\s)@[\w-]+/g, "") // Remove mentions (@username)
    .replace(/(?:^|\s)#[\w-]+/g, "") // Remove hashtags
    .replace(/\b(?:https?|ftp|file|chrome|about|data):\/\/[^\s)]+/gi, "") // More URL patterns
    .replace(/\b(?:www\.[^\s)]+)/gi, "") // Remove www. links
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "") // Remove email addresses
    // Remove common programming language keywords and syntax
    .replace(
      /\b(function|const|let|var|return|if|else|for|while|do|switch|case|break|continue|class|interface|type|import|export|from|require|default|export default)\b/gi,
      ""
    )
    // Remove common code patterns
    .replace(/[{}()\[\]=+\-*\/%,;:<>]/g, " ")
    // Remove console logs and debug statements
    .replace(/console\.[a-z]+\([^)]*\)/gi, "")
    // Remove variable assignments (var x = y;)
    .replace(/\b(?:const|let|var)\s+[a-zA-Z_$][0-9a-zA-Z_$]*\s*=[^;]+;/g, "")
    // Clean up any remaining technical artifacts
    .replace(
      /\b(?:function|class|interface|type)\s+[a-zA-Z_$][0-9a-zA-Z_$]*/g,
      ""
    )
    // Clean up multiple spaces after removing code
    .replace(/\s+/g, " ")
    // Remove any single characters that might be left from code
    .replace(/\s[^\w\s]\s/g, " ")
    // Final cleanup
    .replace(/([.!?])\s*/g, "$1 ") // Ensure space after sentence endings
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/^\s+|\s+$/g, ""); // Trim whitespace

  // No convertimos números, dejamos que el LLM los maneje
  // Solo nos aseguramos de que tengan el formato adecuado
  
  // Normalizar espacios y saltos de línea
  cleaned = cleaned
    .replace(/\s*[\r\n]+\s*/g, "\n") // Normalize line breaks
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines to 2
    .replace(/([.!?])\s*/g, "$1 ") // Ensure space after sentence endings
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/^\s+|\s+$/g, ""); // Trim whitespace

  // Add natural paragraph breaks
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");

  // Remove any remaining technical artifacts
  cleaned = cleaned
    .replace(/\[\^[^\]]+\]/g, "") // Remove footnotes [^1]
    .replace(/\[\d+\]/g, "") // Remove numbered references [1]
    .replace(/#+\s*([^\n]+)/g, "$1") // Remove markdown headers but keep text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();

  return cleaned;

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
}

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
    const sentenceBytes = Buffer.byteLength(sentence, 'utf8');
    
    // If the sentence is too large, split it into words
    if (sentenceBytes > maxBytes) {
      const words = sentence.split(/(\s+)/);
      
      for (const word of words) {
        const wordBytes = Buffer.byteLength(word, 'utf8');
        const chunkWithWordBytes = Buffer.byteLength(currentChunk + word, 'utf8');
        
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
      const chunkWithSentenceBytes = Buffer.byteLength(currentChunk + ' ' + sentence, 'utf8');
      
      if (currentChunk && chunkWithSentenceBytes > maxBytes) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
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
    if (Buffer.byteLength(remainingText, 'utf8') <= maxBytes) {
      chunks.push(remainingText);
      break;
    }
    
    // Start by trying to split at a word boundary
    let splitPos = Math.min(maxBytes, remainingText.length);
    let chunk = remainingText.slice(0, splitPos);
    
    // Adjust for multi-byte characters
    while (Buffer.byteLength(chunk, 'utf8') > maxBytes) {
      splitPos--;
      chunk = remainingText.slice(0, splitPos);
    }
    
    // Try to find the last space to avoid splitting words
    const lastSpace = chunk.lastIndexOf(' ');
    if (lastSpace > 0 && (splitPos - lastSpace) < 20) { // Only move back a little to avoid very long words
      splitPos = lastSpace + 1; // Include the space
      chunk = remainingText.slice(0, splitPos);
    }
    
    // If we couldn't find a good split point, just split at the maxBytes
    if (chunk.length === 0) {
      splitPos = Math.min(maxBytes, remainingText.length);
      chunk = remainingText.slice(0, splitPos);
      
      // Adjust for multi-byte characters
      while (Buffer.byteLength(chunk, 'utf8') > maxBytes) {
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
