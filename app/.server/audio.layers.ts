import { Layer } from "effect";
import { AudioServiceLive } from "./audio.service";
import { S3ServiceLive } from "./s3.service";
import { OpenRouterTTSServiceLive } from "./openrouter.service";

/**
 * Combined layer that provides all dependencies for the audio service
 */
export const AudioServiceLayer = AudioServiceLive.pipe(
  Layer.provide(S3ServiceLive),
  Layer.provide(OpenRouterTTSServiceLive)
);

/**
 * Main layer for audio functionality - use this in your application
 */
export const AudioLayer = Layer.mergeAll(
  S3ServiceLive,
  OpenRouterTTSServiceLive,
  AudioServiceLive
);
