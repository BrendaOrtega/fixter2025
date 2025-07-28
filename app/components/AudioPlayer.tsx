import { useReducer, useRef, useEffect, useCallback, useState } from "react";
import { cn } from "~/utils/cn";
import Spinner from "./common/Spinner";
import { useAudioGeneration } from "~/hooks/useAudioGeneration";
import { useAudioTracking } from "~/hooks/useAudioTracking";
import { useVoiceSelection } from "~/hooks/useVoiceSelection";

// Types and interfaces
interface AudioPlayerProps {
  postId: string;
  postTitle: string;
  postBody: string;
  className?: string;
  autoPlay?: boolean;
}

interface AudioPlayerState {
  status: "idle" | "generating" | "ready" | "playing" | "paused" | "error";
  audioUrl?: string;
  currentTime: number;
  duration: number;
  error?: string;
  isLoading: boolean;
  isPlaying: boolean;
  isGenerating: boolean;
}

type AudioAction =
  | { type: "GENERATE_START" }
  | { type: "GENERATE_SUCCESS"; payload: { audioUrl: string; duration: number } }
  | { type: "GENERATE_ERROR"; payload: { error: string } }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "SEEK"; payload: { time: number } }
  | { type: "SET_DURATION"; payload: { duration: number } }
  | { type: "UPDATE_TIME"; payload: { currentTime: number } }
  | { type: "RESET" };

// Initial state
const initialState: AudioPlayerState = {
  status: "idle",
  currentTime: 0,
  duration: 0,
  isLoading: false,
  isPlaying: false,
  isGenerating: false,
};

// Reducer
function audioPlayerReducer(
  state: AudioPlayerState,
  action: AudioAction
): AudioPlayerState {
  switch (action.type) {
    case "GENERATE_START":
      return {
        ...state,
        status: "generating",
        isLoading: true,
        isGenerating: true,
        isPlaying: false,
        error: undefined,
      };
    case "GENERATE_SUCCESS":
      return {
        ...state,
        status: "ready",
        audioUrl: action.payload.audioUrl,
        duration: action.payload.duration,
        isLoading: false,
        isGenerating: false,
        isPlaying: false,
        error: undefined,
      };
    case "GENERATE_ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload.error,
        isLoading: false,
        isGenerating: false,
        isPlaying: false,
      };
    case "PLAY":
      return {
        ...state,
        status: "playing",
        isPlaying: true,
      };
    case "PAUSE":
      return {
        ...state,
        status: "paused",
        isPlaying: false,
      };
    case "SEEK":
      return {
        ...state,
        currentTime: action.payload.time,
      };
    case "SET_DURATION":
      return {
        ...state,
        duration: action.payload.duration,
      };
    case "UPDATE_TIME":
      return {
        ...state,
        currentTime: action.payload.currentTime,
      };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

// Utility functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const calculateProgress = (currentTime: number, duration: number): number => {
  if (duration === 0) return 0;
  return (currentTime / duration) * 100;
};

export default function AudioPlayer({
  postId,
  postTitle,
  postBody,
  className,
  autoPlay = false,
}: AudioPlayerProps) {
  const [state, dispatch] = useReducer(audioPlayerReducer, initialState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Callbacks for hooks
  const onSuccess = useCallback(
    (audioData: { audioUrl: string; duration: number }) => {
      dispatch({
        type: "GENERATE_SUCCESS",
        payload: audioData,
      });
    },
    [dispatch]
  );

  const onError = useCallback(
    (error: string) => {
      dispatch({ type: "GENERATE_ERROR", payload: { error } });
    },
    [dispatch]
  );

  // Voice selection state
  const [localSelectedVoice, setLocalSelectedVoice] = useState<string>("");
  
  // Get available voices
  const {
    voices,
    selectedVoice,
    isLoading: isVoicesLoading,
    error: voiceError,
    setSelectedVoice,
    getFriendlyName,
  } = useVoiceSelection();

  // Initialize local selected voice when voices are loaded
  useEffect(() => {
    if (voices.length > 0 && !localSelectedVoice) {
      const defaultVoice = selectedVoice || voices[0]?.name || "";
      setLocalSelectedVoice(defaultVoice);

    }
  }, [voices, selectedVoice, localSelectedVoice]);

  // Memoize callbacks to prevent recreation on each render
  const onSuccessCallback = useCallback((data: any) => {
    dispatch({ type: "GENERATE_SUCCESS", payload: data });
    onSuccess(data);
  }, [onSuccess]);

  const onErrorCallback = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Error al generar el audio';
    dispatch({ type: "GENERATE_ERROR", payload: { error: errorMessage } });
    onError(errorMessage);
  }, [onError]);

  // Audio generation - only set up the generator, don't trigger it automatically
  const audioGeneration = useAudioGeneration({
    postId,
    postTitle,
    postBody,
    voice: localSelectedVoice || undefined,
    onSuccess: onSuccessCallback,
    onError: onErrorCallback
  });

  const audioTracking = useAudioTracking({ postId });

  // Removed automatic audio generation on mount
  // Audio will only be generated when user explicitly clicks the generate button

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceName = e.target.value;

    
    if (voiceName) {
      setLocalSelectedVoice(voiceName);
      setSelectedVoice(voiceName);
    }
  };

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      dispatch({ type: 'PAUSE' });
    } else {
      audioRef.current.play().catch(error => {
        // Handle play error silently
        dispatch({ type: 'GENERATE_ERROR', payload: { error: 'Error al reproducir el audio' } });
      });
      dispatch({ type: 'PLAY' });
    }
  }, [state.isPlaying]);

  // Memoize the generateAudio function to prevent recreation on each render
  const generateAudio = useCallback(async () => {
    if (!localSelectedVoice) {
      dispatch({ 
        type: "GENERATE_ERROR", 
        payload: { error: "Por favor selecciona una voz primero" } 
      });
      return;
    }
    
    dispatch({ type: 'GENERATE_START' });
    
    try {
      if (audioGeneration?.generateAudio) {
        await audioGeneration.generateAudio();
      }
    } catch (error) {
      // Handle generation error silently
      dispatch({ 
        type: "GENERATE_ERROR", 
        payload: { 
          error: error instanceof Error ? error.message : 'Error al generar el audio' 
        } 
      });
    }
  }, [localSelectedVoice, audioGeneration?.generateAudio]);

  // Handle the button click with a stable reference
  const handleGenerateAudio = useCallback(() => {
    generateAudio();
  }, [generateAudio]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!audioRef.current) return;

    switch (e.key) {
      case ' ':
      case 'Spacebar':
      case 'Enter':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'ArrowLeft':
        if (audioRef.current) {
          e.preventDefault();
          const newTime = Math.max(0, state.currentTime - 5);
          audioRef.current.currentTime = newTime;
          dispatch({ type: 'UPDATE_TIME', payload: { currentTime: newTime } });
        }
        break;
      case 'ArrowRight':
        if (audioRef.current) {
          e.preventDefault();
          const newTime = Math.min(state.duration, state.currentTime + 5);
          audioRef.current.currentTime = newTime;
          dispatch({ type: 'UPDATE_TIME', payload: { currentTime: newTime } });
        }
        break;
      default:
        break;
    }
  }, [handlePlayPause, state.currentTime, state.duration]);

  // Handle time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (audio) {
        dispatch({
          type: "UPDATE_TIME",
          payload: { currentTime: audio.currentTime },
        });
      }
    };

    const updateDuration = () => {
      if (audio) {
        dispatch({
          type: "SET_DURATION",
          payload: { duration: audio.duration || 0 },
        });
      }
    };

    const handleEnded = () => {
      dispatch({ type: "PAUSE" });
      if (audio) {
        audio.currentTime = 0;
        dispatch({
          type: "UPDATE_TIME",
          payload: { currentTime: 0 },
        });
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * state.duration;

    audioRef.current.currentTime = newTime;
    dispatch({ type: "UPDATE_TIME", payload: { currentTime: newTime } });
  };

  // Handle retry by resetting and generating again
  const handleRetry = useCallback(() => {
    if (audioGeneration?.reset) {
      audioGeneration.reset();
      generateAudio();
    }
  }, [audioGeneration?.reset, generateAudio]);

  return (
    <div
      className={cn(
        "bg-backface border border-colorOutline rounded-xl p-6 shadow-lg",
        "transition-all duration-300 hover:shadow-xl hover:border-brand-500/30",
        "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20",
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Reproductor de audio para ${postTitle}`}
    >
      {/* Audio element */}
      {state.audioUrl && (
        <audio
          ref={audioRef}
          src={state.audioUrl}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-brand-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-brand-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.5 13.5H2a1 1 0 01-1-1V7.5a1 1 0 011-1h2.5l3.883-3.316z" />
            <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">
            {postTitle}
          </h3>
          <p className="text-colorCaption text-xs">
            {state.status === "idle" && "Elige tu voz y dale play!"}
            {state.status === "generating" && "Creando tu audio ..."}
            {state.status === "ready" && "Listo para el show!"}
            {state.status === "playing" && "Suena increíble, ¿verdad?"}
            {state.status === "paused" && "Pausado - ¿Seguimos la fiesta?"}
            {state.status === "error" &&
              "Ups! Algo salió mal. Intenta de nuevo!"}
          </p>
        </div>
      </div>

      {/* Voice Selector and Generate Button (Initial State) */}
      {state.status === "idle" && (
        <div className="space-y-4">
          {/* Voice Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-colorParagraph">
              Elige a tu narrador:
            </label>
            <div className="relative">
              <select
                value={localSelectedVoice}
                onChange={handleVoiceChange}
                className="block w-full pl-3 pr-10 py-2 text-base bg-surface border border-colorOutline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent sm:text-sm rounded-md"
                disabled={state.isGenerating}
              >
                <option value="">Selecciona una voz</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {getFriendlyName(voice.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateAudio}
            disabled={state.isGenerating || !localSelectedVoice}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500/70 to-brand-500 text-white rounded-md",
              "hover:from-brand-600 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02]",
              "shadow-lg hover:shadow-xl"
            )}
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 5a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V5z" />
              <path d="M3 10a1 1 0 011-1h1a1 1 0 011 1v0a1 1 0 01-1 1H4a1 1 0 01-1-1v0z" />
              <path d="M15 10a1 1 0 011-1h1a1 1 0 011 1v0a1 1 0 01-1 1h-1a1 1 0 01-1-1v0z" />
            </svg>
            {`Crear audio con ${
              localSelectedVoice ? getFriendlyName(localSelectedVoice) : "tu voz favorita"
            }`}
          </button>
        </div>
      )}

      {/* Loading State */}
      {state.status === "generating" && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Spinner className="mb-3" />
            <p className="text-colorParagraph text-sm">
              Generando audio del post...
            </p>
            <p className="text-colorCaption text-xs mt-1">
              Esto puede tomar unos segundos
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.status === "error" && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-red-400 text-sm mb-3">
            {audioGeneration?.isRateLimited
              ? "Has alcanzado el límite de generaciones. Intenta de nuevo en unos minutos."
              : state.error}
          </p>
          {audioGeneration?.canRetry && (
            <button
              onClick={handleRetry}
              disabled={
                audioGeneration.isRateLimited || audioGeneration.isLoading
              }
              className={cn(
                "px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 text-brand-500 rounded-lg",
                "transition-colors duration-200 text-sm font-medium",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {audioGeneration.isRateLimited
                ? "Límite alcanzado"
                : audioGeneration.isLoading
                ? "Reintentando..."
                : "Reintentar"}
            </button>
          )}
        </div>
      )}

      {/* Audio Controls (Ready/Playing/Paused) */}
      {(state.status === "ready" ||
        state.status === "playing" ||
        state.status === "paused") && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              ref={progressRef}
              onClick={handleSeek}
              role="progressbar"
              aria-label="Progreso del audio"
              aria-valuenow={state.currentTime}
              aria-valuemin={0}
              aria-valuemax={state.duration}
              className="h-2 bg-surface rounded-full cursor-pointer group relative overflow-hidden"
            >
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-150"
                style={{
                  width: `${calculateProgress(
                    state.currentTime,
                    state.duration
                  )}%`,
                }}
              />
              <div className="absolute inset-0 bg-brand-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div className="flex justify-between text-xs text-colorCaption">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full bg-surface text-white hover:bg-surface/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-background"
              )}
              onClick={handlePlayPause}
              disabled={!state.audioUrl || state.isLoading}
              aria-label={state.isPlaying ? "Pausar" : "Reproducir"}
            >
              {state.isLoading ? (
                <Spinner className="w-5 h-5" />
              ) : state.isPlaying ? (
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
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 0110 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={handleGenerateAudio}
              disabled={state.isGenerating || state.isPlaying || !audioGeneration}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500/70 to-brand-500 text-white rounded-md",
                "hover:from-brand-600 hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105",
                "shadow-lg hover:shadow-xl"
              )}
            >
              {state.isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando audio...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8 5a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V5z" />
                    <path d="M3 10a1 1 0 011-1h1a1 1 0 011 1v0a1 1 0 01-1 1H4a1 1 0 01-1-1v0z" />
                    <path d="M15 10a1 1 0 011-1h1a1 1 0 011 1v0a1 1 0 01-1 1h-1a1 1 0 01-1-1v0z" />
                  </svg>
                  {state.audioUrl
                    ? "Escuchar de nuevo"
                    : `Crear audio con ${
                        localSelectedVoice ? getFriendlyName(localSelectedVoice) : "tu voz favorita"
                      }`}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
