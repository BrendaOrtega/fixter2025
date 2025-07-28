import { useCallback } from "react";
import { useFetcher } from "react-router";
import type { AudioEvent, AudioTrackingResponse } from "~/types/audio";

interface UseAudioTrackingProps {
  postId: string;
}

export function useAudioTracking({ postId }: UseAudioTrackingProps) {
  const fetcher = useFetcher<AudioTrackingResponse>();

  const trackEvent = useCallback(
    (event: AudioEvent, currentTime = 0, duration = 0) => {
      const formData = new FormData();
      formData.append("intent", "track_playback");
      formData.append("postId", postId);
      formData.append("event", event);
      formData.append("currentTime", currentTime.toString());
      formData.append("duration", duration.toString());

      fetcher.submit(formData, {
        method: "POST",
        action: "/api/audio",
      });
    },
    [fetcher, postId]
  );

  const trackPlay = useCallback(
    (currentTime = 0, duration = 0) => {
      trackEvent("play", currentTime, duration);
    },
    [trackEvent]
  );

  const trackPause = useCallback(
    (currentTime = 0, duration = 0) => {
      trackEvent("pause", currentTime, duration);
    },
    [trackEvent]
  );

  const trackComplete = useCallback(
    (duration = 0) => {
      trackEvent("complete", duration, duration);
    },
    [trackEvent]
  );

  return {
    trackPlay,
    trackPause,
    trackComplete,
    trackEvent,
    isTracking: fetcher.state !== "idle",
  };
}
