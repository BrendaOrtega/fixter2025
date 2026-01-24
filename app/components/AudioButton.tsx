import { useState, useRef, useEffect } from "react";
import Spinner from "./common/Spinner";

interface AudioButtonProps {
  postId: string;
  postTitle: string;
  postBody: string;
  audioData?: { audioUrl: string; duration: number } | null;
  minLength?: number;
}

// Minimum number of words required to show the audio button
const MIN_POST_WORDS = 300;

export function AudioButton({
  postId,
  postTitle,
  postBody,
  audioData,
  minLength = MIN_POST_WORDS,
}: AudioButtonProps) {
  // Don't render if the post is too short
  const wordCount = postBody.trim().split(/\s+/).length;
  if (!postBody || wordCount < minLength) {
    return null;
  }

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAudio, setHasAudio] = useState(!!audioData?.audioUrl);
  const [audioUrl, setAudioUrl] = useState(audioData?.audioUrl || "");

  // Voz por defecto: Carmen (México)
  const DEFAULT_VOICE = "es-US-Neural2-A";

  // Update hasAudio when audioData changes
  useEffect(() => {
    if (audioData?.audioUrl) {
      setHasAudio(true);
      setAudioUrl(audioData.audioUrl);
    }
  }, [audioData]);

  const generateAudio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/audio", {
        method: "POST",
        body: new URLSearchParams({
          intent: "generate_audio",
          postId,
          postTitle,
          postBody,
          voice: DEFAULT_VOICE,
        }),
      });
      const result = await response.json();
      if (result.success && result.data?.audioUrl) {
        setAudioUrl(result.data.audioUrl);
        setHasAudio(true);
        // Auto-play after generation
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = result.data.audioUrl;
            audioRef.current.load();
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error generating audio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleClick = () => {
    if (!hasAudio && !isLoading) {
      generateAudio();
    } else if (hasAudio) {
      togglePlay();
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Generando...";
    if (!hasAudio) return "Audio";
    return isPlaying ? "Pausar" : "Escuchar";
  };

  const getTitle = () => {
    if (isLoading) return "Generando audio...";
    if (!hasAudio) return "Generar audio del post";
    return isPlaying ? "Pausar audio" : "Escuchar audio";
  };

  return (
    <>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-800 text-gray-300 hover:text-purple-400 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={getTitle()}
      >
        {isLoading ? (
          <Spinner className="w-4 h-4" />
        ) : !hasAudio ? (
          <SpeakerIcon />
        ) : isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
        <span className="text-xs font-medium hidden sm:inline">
          {getButtonText()}
        </span>
      </button>
    </>
  );
}

// Iconos inline (SVG)
const SpeakerIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export default AudioButton;
