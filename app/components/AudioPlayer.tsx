import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "~/utils/cn";
import { useSubmit } from "react-router";
import Spinner from "./common/Spinner";

interface AudioPlayerProps {
  postId: string;
  postTitle: string;
  postBody: string;
  className?: string;
  autoPlay?: boolean;
  minLength?: number;
  audioData?: {
    audioUrl: string;
    duration: number;
  } | null;
}

// Minimum number of words required to show the audio player
const MIN_POST_WORDS = 300;

export function AudioPlayer({
  postId,
  postTitle,
  postBody,
  className,
  autoPlay = false,
  minLength = MIN_POST_WORDS,
  audioData,
}: AudioPlayerProps) {
  // Don't render the audio player if the post is too short
  const wordCount = postBody.trim().split(/\s+/).length;
  if (!postBody || wordCount < minLength) {
    return null;
  }

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Local state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioData?.duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices] = useState<Array<{ name: string; displayName: string }>>([
    // Voces REALES de Google Cloud TTS (NO hay WaveNet para español)
    { name: "es-ES-Neural2-A", displayName: "Lucía (España)" },
    { name: "es-US-Neural2-A", displayName: "Carmen (Latina)" },
    { name: "es-US-Neural2-B", displayName: "Diego (Latino)" },
  ]);
  const [selectedVoice, setSelectedVoice] = useState("es-US-Neural2-A");

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const calculateProgress = (current: number, total: number): number => {
    if (!total) return 0;
    return (current / total) * 100;
  };

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        setError("Error playing audio");
        console.error("Audio playback error:", err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // Handle seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !audioRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      const newTime = position * duration;

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  // Handle end of playback
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [autoPlay]);

  // Generate audio function
  const submit = useSubmit();
  const generateAudio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/audio", {
        method: "POST",
        body: new URLSearchParams({
          intent: "generate_audio",
          postId,
          postTitle,
          postBody,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const result = await response.json();
      if (result.success && result.data?.audioUrl) {
        // Update audio data in background without page reload
        setDuration(result.data.duration || 0);
        setCurrentTime(0);
        setIsPlaying(false);

        // Create new audio element with the generated URL
        if (audioRef.current) {
          audioRef.current.src = result.data.audioUrl;
          audioRef.current.load();
        }
      } else {
        throw new Error(result.error || "Failed to generate audio");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate audio");
    } finally {
      setIsLoading(false);
      submit({});
    }
  };

  // Debug log
  useEffect(() => {
    console.log("AudioPlayer state:", {
      isPlaying,
      currentTime,
      duration,
      audioUrl: audioData?.audioUrl,
    });
  }, [isPlaying, currentTime, duration, audioData?.audioUrl]);

  return (
    <div
      className={cn(
        "bg-backface border border-colorOutline rounded-xl p-6 shadow-lg",
        "transition-all duration-300 hover:shadow-xl hover:border-brand-500/30",
        "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20",
        className
      )}
      tabIndex={0}
      role="region"
      aria-label={`Audio player for ${postTitle}`}
    >
      {/* Audio element */}
      {audioData?.audioUrl && (
        <audio
          ref={audioRef}
          src={audioData.audioUrl}
          preload="metadata"
          className="hidden"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      {audioData?.audioUrl ? (
        // Audio player when audio exists
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.5 13.5H2a1 1 0 01-1-1V7.5a1 1 0 011-1h2.5l3.883-3.316z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate">
                {postTitle}
              </h3>
              <p className="text-colorCaption text-xs">
                {isPlaying ? "Reproduciendo" : "Pausado"}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              ref={progressRef}
              onClick={handleSeek}
              role="progressbar"
              aria-label="Audio progress"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
              className="h-2 bg-surface rounded-full cursor-pointer group relative overflow-hidden"
            >
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-150"
                style={{
                  width: `${calculateProgress(currentTime, duration)}%`,
                }}
              />
              <div className="absolute inset-0 bg-brand-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="flex justify-between text-xs text-colorCaption">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={isLoading}
              className="w-12 h-12 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface"
              aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
            >
              {isLoading ? (
                <Spinner className="w-5 h-5" />
              ) : isPlaying ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </>
      ) : (
        // Generate audio button when no audio exists
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-brand-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.5 13.5H2a1 1 0 01-1-1V7.5a1 1 0 011-1h2.5l3.883-3.316z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-2">Escuchar este post</h3>
          <p className="text-colorCaption text-sm mb-2">
            Selecciona una voz y genera audio para escuchar este post
          </p>

          {/* Selector de voz */}
          <div className="mb-4">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-surface border border-surface-light rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Seleccionar voz"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.displayName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={generateAudio}
            disabled={isLoading}
            className=" bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner />
                Generando...
              </div>
            ) : (
              "Generar Audio"
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 text-sm text-red-400 text-center">{error}</div>
      )}
    </div>
  );
}

export default AudioPlayer;
