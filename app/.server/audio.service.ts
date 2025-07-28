import { Effect, Context, Layer } from "effect";
import { PrismaClient } from "@prisma/client";
import { S3Service } from "./s3.service";
import { OpenRouterTTSService } from "./openrouter.service";
import {
  cleanTextForTTS,
  estimateTTSDuration,
  validateTextForTTS,
  generateAudioS3Key,
  calculateTTSCost,
} from "./audio.utils";

// Audio Result Interface
export interface AudioResult {
  audioUrl: string;
  s3Key: string;
  duration: number;
  fileSize: number;
  cost: number;
}

// Audio Stats Interface
export interface AudioStats {
  totalGenerations: number;
  totalCost: number;
  totalPlayTime: number;
  averageDuration: number;
}

// Audio Service Interface
export interface AudioService {
  generateAudio: (
    postId: string,
    text: string
  ) => Effect.Effect<AudioResult, Error>;
  getAudioUrl: (postId: string) => Effect.Effect<string | null, Error>;
  deleteAudio: (postId: string) => Effect.Effect<void, Error>;
  getAudioStats: (postId: string) => Effect.Effect<AudioStats, Error>;
  trackAudioEvent: (
    postId: string,
    event: string,
    sessionId?: string,
    playDuration?: number
  ) => Effect.Effect<void, Error>;
}

// Audio Service Tag
export const AudioService = Context.GenericTag<AudioService>("AudioService");

// Database Service Interface
export interface DatabaseService {
  prisma: PrismaClient;
}

// Database Service Tag
export const DatabaseService =
  Context.GenericTag<DatabaseService>("DatabaseService");

// Audio Service Implementation
const makeAudioService = Effect.gen(function* () {
  const s3Service = yield* S3Service;
  const ttsService = yield* OpenRouterTTSService;
  const dbService = yield* DatabaseService;

  const generateAudio = (postId: string, text: string) =>
    Effect.gen(function* () {
      // Validate input text
      const validation = validateTextForTTS(text);
      if (!validation.valid) {
        yield* Effect.fail(new Error(validation.error!));
      }

      // Check if audio already exists in cache
      const existingCache = yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioCache.findUnique({
            where: { postId },
          }),
        catch: (error) => new Error(`Database query failed: ${error}`),
      });

      if (existingCache) {
        // Check if S3 file still exists
        const fileExists = yield* s3Service.fileExists(existingCache.s3Key);

        if (fileExists) {
          // Generate fresh pre-signed URL for existing audio
          const freshUrl = yield* s3Service.generatePresignedUrl(
            existingCache.s3Key
          );

          // Update the URL in cache
          yield* Effect.tryPromise({
            try: () =>
              dbService.prisma.audioCache.update({
                where: { postId },
                data: { audioUrl: freshUrl },
              }),
            catch: (error) => new Error(`Failed to update cache: ${error}`),
          });

          return {
            audioUrl: freshUrl,
            s3Key: existingCache.s3Key,
            duration: existingCache.duration,
            fileSize: existingCache.fileSize,
            cost: 0, // No cost for cached audio
          };
        } else {
          // File doesn't exist in S3, remove from cache and regenerate
          yield* Effect.tryPromise({
            try: () =>
              dbService.prisma.audioCache.delete({
                where: { postId },
              }),
            catch: (error) => new Error(`Failed to clean cache: ${error}`),
          });
        }
      }

      // Clean text for TTS
      const cleanText = cleanTextForTTS(text);

      // Estimate cost before generation
      const estimatedCost = calculateTTSCost(cleanText);

      // Generate audio using TTS service
      const audioBuffer = yield* ttsService.generateSpeech(cleanText, {
        voice: "nova", // Female voice for better engagement
        speed: 1.0,
        format: "mp3",
      });

      // Calculate file size and estimated duration
      const fileSize = audioBuffer.length;
      const estimatedDuration = estimateTTSDuration(cleanText);

      // Generate S3 key
      const s3Key = generateAudioS3Key(postId);

      // Upload to S3
      const audioUrl = yield* s3Service.uploadFile(
        audioBuffer,
        s3Key,
        "audio/mpeg"
      );

      // Generate pre-signed URL for secure access
      const presignedUrl = yield* s3Service.generatePresignedUrl(s3Key, 86400); // 24 hours

      // Cache the audio metadata in database
      yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioCache.create({
            data: {
              postId,
              s3Key,
              audioUrl: presignedUrl,
              duration: estimatedDuration,
              fileSize,
              cost: estimatedCost,
            },
          }),
        catch: (error) => new Error(`Failed to cache audio metadata: ${error}`),
      });

      // Track generation event
      yield* trackAudioEvent(postId, "generate");

      return {
        audioUrl: presignedUrl,
        s3Key,
        duration: estimatedDuration,
        fileSize,
        cost: estimatedCost,
      };
    });

  const getAudioUrl = (postId: string) =>
    Effect.gen(function* () {
      const audioCache = yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioCache.findUnique({
            where: { postId },
          }),
        catch: (error) => new Error(`Database query failed: ${error}`),
      });

      if (!audioCache) {
        return null;
      }

      // Check if the cached URL is still valid (not expired)
      // For simplicity, we'll regenerate if older than 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      if (audioCache.updatedAt < twelveHoursAgo) {
        // Generate fresh pre-signed URL
        const freshUrl = yield* s3Service.generatePresignedUrl(
          audioCache.s3Key
        );

        // Update the URL in cache
        yield* Effect.tryPromise({
          try: () =>
            dbService.prisma.audioCache.update({
              where: { postId },
              data: { audioUrl: freshUrl },
            }),
          catch: (error) => new Error(`Failed to update cache: ${error}`),
        });

        return freshUrl;
      }

      return audioCache.audioUrl;
    });

  const deleteAudio = (postId: string) =>
    Effect.gen(function* () {
      // Get audio cache info
      const audioCache = yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioCache.findUnique({
            where: { postId },
          }),
        catch: (error) => new Error(`Database query failed: ${error}`),
      });

      if (!audioCache) {
        return; // Nothing to delete
      }

      // Delete from S3
      yield* s3Service.deleteFile(audioCache.s3Key);

      // Delete from database cache
      yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioCache.delete({
            where: { postId },
          }),
        catch: (error) => new Error(`Failed to delete from cache: ${error}`),
      });

      // Delete related analytics
      yield* Effect.tryPromise({
        try: () =>
          dbService.prisma.audioAnalytics.deleteMany({
            where: { postId },
          }),
        catch: (error) => new Error(`Failed to delete analytics: ${error}`),
      });
    });

  const getAudioStats = (postId: string) =>
    Effect.gen(function* () {
      const [cacheStats, analyticsStats] = yield* Effect.all([
        Effect.tryPromise({
          try: () =>
            dbService.prisma.audioCache.findMany({
              where: postId ? { postId } : {},
              select: {
                cost: true,
                duration: true,
              },
            }),
          catch: (error) => new Error(`Failed to get cache stats: ${error}`),
        }),
        Effect.tryPromise({
          try: () =>
            dbService.prisma.audioAnalytics.aggregate({
              where: {
                postId,
                event: "play",
              },
              _count: {
                id: true,
              },
              _sum: {
                playDuration: true,
              },
            }),
          catch: (error) =>
            new Error(`Failed to get analytics stats: ${error}`),
        }),
      ]);

      const totalGenerations = cacheStats.length;
      const totalCost = cacheStats.reduce((sum, cache) => sum + cache.cost, 0);
      const averageDuration =
        totalGenerations > 0
          ? cacheStats.reduce((sum, cache) => sum + cache.duration, 0) /
            totalGenerations
          : 0;
      const totalPlayTime = analyticsStats._sum.playDuration || 0;

      return {
        totalGenerations,
        totalCost,
        totalPlayTime,
        averageDuration,
      };
    });

  const trackAudioEvent = (
    postId: string,
    event: string,
    sessionId?: string,
    playDuration?: number
  ) =>
    Effect.tryPromise({
      try: () =>
        dbService.prisma.audioAnalytics.create({
          data: {
            postId,
            event,
            sessionId,
            playDuration,
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : undefined,
          },
        }),
      catch: (error) => new Error(`Failed to track audio event: ${error}`),
    });

  return AudioService.of({
    generateAudio,
    getAudioUrl,
    deleteAudio,
    getAudioStats,
    trackAudioEvent,
  });
});

// Database Service Layer
export const DatabaseServiceLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    prisma: new PrismaClient(),
  })
);

// Audio Service Layer
export const AudioServiceLive = Layer.effect(
  AudioService,
  makeAudioService
).pipe(
  Layer.provide(DatabaseServiceLive),
  Layer.provide(
    Layer.mergeAll(
      Layer.empty, // S3ServiceLive will be provided externally
      Layer.empty // OpenRouterTTSServiceLive will be provided externally
    )
  )
);
