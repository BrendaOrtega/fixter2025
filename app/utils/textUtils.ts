/**
 * Utility functions for text processing
 */

// Maximum number of bytes allowed by Google TTS API
const MAX_TTS_BYTES = 5000;

/**
 * Calculate the byte length of a string in UTF-8
 * @param str The string to measure
 * @returns The number of bytes the string would use in UTF-8
 */
function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Truncates text to fit within the TTS byte limit while preserving whole words
 * @param text The text to truncate
 * @param maxBytes Maximum number of bytes (default: 5000)
 * @returns The truncated text that fits within the byte limit
 */
export function truncateToByteLimit(text: string, maxBytes: number = MAX_TTS_BYTES): string {
  if (!text) return '';
  
  // If text is already within limit, return as is
  if (getUtf8ByteLength(text) <= maxBytes) {
    return text;
  }

  // Start with an empty string and build up to the limit
  let result = '';
  let lastGoodIndex = 0;
  
  // Split into words to try to preserve whole words when possible
  const words = text.split(/\s+/);
  
  for (const word of words) {
    const potentialText = result ? `${result} ${word}`.trim() : word;
    
    if (getUtf8ByteLength(potentialText) <= maxBytes) {
      result = potentialText;
      lastGoodIndex = result.length;
    } else {
      // If we can't add the whole word, try adding part of it
      for (let i = 1; i <= word.length; i++) {
        const partialWord = word.substring(0, i);
        const potentialPartialText = result ? `${result} ${partialWord}`.trim() : partialWord;
        
        if (getUtf8ByteLength(potentialPartialText) > maxBytes) {
          // We've gone over the limit, use the last good index
          return result.substring(0, lastGoodIndex);
        }
        
        result = potentialPartialText;
      }
    }
  }
  
  return result;
}

/**
 * Removes URLs from text to prevent TTS from reading them
 * @param text The input text that may contain URLs
 * @returns The text with URLs removed
 */
export function removeUrls(text: string): string {
  if (!text) return '';
  
  // Match various URL patterns including:
  // - http(s):// links
  // - www. links
  // - URL fragments (e.g., example.com/path)
  // - Email addresses
  // - Common TLDs
  const urlPatterns = [
    // Standard URLs
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+[^\s]*/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // URL fragments without protocol
    /(?:^|\s)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/g,
  ];

  // Apply all patterns
  let cleaned = text;
  for (const pattern of urlPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up any leftover artifacts and normalize whitespace
  return cleaned
    .replace(/\s+/g, ' ')
    .replace(/\.(\s|$)/g, '$1') // Remove trailing dots that might be part of a URL
    .trim();
}

/**
 * Cleans text before sending to TTS by removing URLs and extra whitespace
 * @param text The input text to clean
 * @param options Options for text cleaning
 * @returns The cleaned text ready for TTS
 */
export function cleanTextForTTS(
  text: string, 
  options: { 
    maxBytes?: number;
    truncate?: boolean;
  } = {}
): string {
  if (!text) return '';
  
  const {
    maxBytes = MAX_TTS_BYTES,
    truncate = true
  } = options;
  
  // Remove URLs
  let cleaned = removeUrls(text);
  
  // Normalize whitespace and clean up any artifacts
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')  // Remove space before punctuation
    .replace(/([.,!?;:])(\S)/g, '$1 $2')  // Add space after punctuation
    .trim();
    
  // Truncate if needed and requested
  if (truncate && getUtf8ByteLength(cleaned) > maxBytes) {
    console.warn(`Text exceeds ${maxBytes} bytes and will be truncated`);
    return truncateToByteLimit(cleaned, maxBytes);
  }
    
  return cleaned;
}
