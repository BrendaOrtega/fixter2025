import React, { useCallback, useState } from "react";
import { useFetcher } from "react-router";
import type { AudioData, AudioGenerationResponse } from "~/types/audio";
import { cleanTextForTTS } from "~/utils/textUtils";
import {
  getAudioErrorMessage,
  isRetryableError,
  shouldShowRateLimit,
} from "./audioErrorUtils";

interface AudioGenerationState {
  isLoading: boolean;
  error: string | null;
  audioData: AudioData | null;
  isRateLimited: boolean;
}

interface UseAudioGenerationProps {
  postId: string;
  postTitle: string;
  postBody: string;
  voice?: string;
  onSuccess?: (audioData: AudioData) => void;
  onError?: (error: string) => void;
}

export function useAudioGeneration({
  postId,
  postTitle,
  postBody,
  voice,
  onSuccess,
  onError,
}: UseAudioGenerationProps) {
  const fetcher = useFetcher<AudioGenerationResponse>();

  const [state, setState] = useState<AudioGenerationState>({
    isLoading: false,
    error: null,
    audioData: null,
    isRateLimited: false,
  });

  // Check if audio exists in cache
  const checkCache = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/audio?postId=${encodeURIComponent(postId)}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          audioData: result.data,
          error: null,
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error checking cache:", error);
      return null;
    }
  }, [postId]);

  // Generate audio
  const generateAudio = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      isRateLimited: false,
    }));

    try {
      // Clean the text before sending to the API with byte limit check
      const cleanedBody = cleanTextForTTS(postBody, {
        maxBytes: 4500, // Slightly below the 5000 limit to be safe
        truncate: true,
      });
      
      const cleanedTitle = cleanTextForTTS(postTitle, {
        maxBytes: 200, // Shorter limit for title
        truncate: true,
      });

      const formData = new FormData();
      formData.append('intent', 'generate_audio');
      formData.append('postId', postId);
      formData.append('postTitle', cleanedTitle);
      formData.append('postBody', cleanedBody);
      
      if (voice) {
        formData.append('voice', voice);
      }

      fetcher.submit(formData, {
        method: 'POST',
        action: '/api/audio',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error preparing text for TTS';
      console.error('Error generating audio:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [fetcher, postId, postTitle, postBody, voice, onError]);

  // Memoize callbacks to prevent unnecessary re-renders
  const successCallback = React.useCallback((data: AudioData) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      audioData: data,
      error: null,
    }));
    onSuccess?.(data);
  }, [onSuccess]);

  const errorCallback = React.useCallback((error: string) => {
    const errorMessage = getAudioErrorMessage(error);
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
      isRateLimited: shouldShowRateLimit(error),
    }));
    onError?.(errorMessage);
  }, [onError]);

  // Handle fetcher state changes
  React.useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data;

      if (result.success && result.data) {
        successCallback(result.data);
      } else {
        errorCallback(result.error || 'Unknown error occurred');
      }
    } else if (fetcher.state === "submitting" || fetcher.state === "loading") {
      setState(prev => ({
        ...prev,
        isLoading: true,
      }));
    }
  }, [fetcher.state, fetcher.data, successCallback, errorCallback]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      audioData: null,
      isRateLimited: false,
    });
  }, []);

  return {
    ...state,
    generateAudio,
    checkCache,
    reset,
    isSubmitting: fetcher.state === "submitting",
    canRetry: state.error ? isRetryableError(state.error) : true,
  };
}
