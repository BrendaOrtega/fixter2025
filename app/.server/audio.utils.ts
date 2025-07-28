/**
 * Audio utility functions for text processing and cost calculations
 */

// Clean HTML and markdown from text for TTS
export function cleanTextForTTS(htmlContent: string): string {
  // Remove HTML tags
  let cleanText = htmlContent.replace(/<[^>]*>/g, " ");

  // Remove markdown syntax
  cleanText = cleanText
    // Remove headers
    .replace(/#{1,6}\s+/g, "")
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove list markers
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "");

  // Clean up whitespace
  cleanText = cleanText
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return cleanText;
}

// Estimate reading time in seconds
export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const words = text.split(/\s+/).length;
  return Math.ceil((words / wordsPerMinute) * 60);
}

// Estimate TTS duration in seconds
export function estimateTTSDuration(text: string): number {
  // TTS is typically slower than reading
  // Average TTS speed is about 150-180 words per minute
  const wordsPerMinute = 160;
  const words = text.split(/\s+/).length;
  return Math.ceil((words / wordsPerMinute) * 60);
}

// Calculate cost based on character count
export function calculateTTSCost(
  text: string,
  costPerCharacter: number = 0.000015
): number {
  return text.length * costPerCharacter;
}

// Validate text for TTS generation
export function validateTextForTTS(text: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Text cannot be empty" };
  }

  if (text.length > 100000) {
    return {
      valid: false,
      error: "Text is too long for TTS generation (max 100,000 characters)",
    };
  }

  if (text.length < 10) {
    return {
      valid: false,
      error: "Text is too short for meaningful audio generation",
    };
  }

  return { valid: true };
}

// Generate S3 key for audio file
export function generateAudioS3Key(
  postId: string,
  format: string = "mp3"
): string {
  return `${postId}.${format}`;
}

// Format duration for display
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format cost for display
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}
