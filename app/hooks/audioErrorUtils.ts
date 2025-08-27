// Client-side audio error utilities
export function getAudioErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    // Handle common error patterns
    if (error.includes("rate limit") || error.includes("Rate limit")) {
      return "Has alcanzado el límite de generaciones. Intenta de nuevo más tarde.";
    }
    if (error.includes("not found") || error.includes("Not found")) {
      return "El post no fue encontrado o no tiene contenido.";
    }
    if (error.includes("TTS") || error.includes("audio generation")) {
      return "Error al generar el audio. Por favor intenta de nuevo.";
    }
    if (error.includes("S3") || error.includes("upload")) {
      return "Error al guardar el audio. Por favor intenta de nuevo.";
    }
    if (error.includes("network") || error.includes("Network")) {
      return "Error de conexión. Verifica tu internet e intenta de nuevo.";
    }
    if (error.includes("config") || error.includes("credentials")) {
      return "Configuración no disponible. Contacta al administrador.";
    }

    return error;
  }

  if (error instanceof Error) {
    return getAudioErrorMessage(error.message);
  }

  return "Error desconocido. Por favor intenta de nuevo.";
}

export function isRetryableError(error: unknown): boolean {
  if (typeof error === "string") {
    // Non-retryable errors
    const nonRetryablePatterns = [
      "not found",
      "no content",
      "config",
      "credentials",
      "missing",
    ];

    return !nonRetryablePatterns.some((pattern) =>
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return true; // Default to retryable
}

export function shouldShowRateLimit(error: unknown): boolean {
  if (typeof error === "string") {
    return error.toLowerCase().includes("rate limit");
  }
  return false;
}
