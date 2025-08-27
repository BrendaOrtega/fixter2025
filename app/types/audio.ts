export interface AudioData {
  audioUrl: string;
  duration: number;
  cached: boolean;
  generatedAt: string;
}

export interface AudioGenerationResponse {
  success: boolean;
  data?: AudioData;
  error?: string;
  rateLimited?: boolean;
}

export interface AudioTrackingResponse {
  success: boolean;
  error?: string;
}

export type AudioEvent = "play" | "pause" | "complete" | "progress";

export interface AudioMetadata {
  currentTime?: number;
  duration?: number;
  progress?: number;
  fileSize?: number;
  clientId?: string;
}
