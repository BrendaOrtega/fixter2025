import { Effect } from "effect";
import { db } from "../db";
import { s3Service, generateAudioKeyFromPost, S3Error } from "./s3";
import { ttsService, TTSError } from "./tts";
import type { AudioCache } from "@prisma/client";

// Combined Error type for the Audio Service
export type AudioError = S3Error | TTSError | PostError;

export class PostError extends Error {
  public _tag = "PostError";
  constructor(
    public message: string,
    public code: "POST_NOT_FOUND" | "DATABASE_ERROR"
  ) {
    super(message);
  }
}

export interface AudioResult extends AudioCache {
  audioUrl: string;
  cached: boolean;
}

// Service Definition
export interface AudioService {
  getOrCreateAudio: (
    postId: string,
    options?: { voice?: string }
  ) => Effect.Effect<AudioResult, AudioError>;
}

/**
 * Estimates the duration of an audio clip based on the text length.
 * @param text The text to be spoken.
 * @returns The estimated duration in seconds.
 */
function estimateAudioDuration(text: string): number {
  const wordsPerMinute = 150; // Average reading speed
  const words = text.trim().split(/\s+/).length;
  const minutes = words / wordsPerMinute;
  return Math.ceil(minutes * 60); // Duration in seconds
}

// Live Implementation
const AudioServiceLive: AudioService = {
  getOrCreateAudio: (postId: string, options: { voice?: string } = {}) =>
    Effect.gen(function* (_) {
      // 1. Check for cached audio in the database first
      const cachedAudio = yield* _(
        Effect.tryPromise({
          try: () => db.audioCache.findUnique({ where: { postId } }),
          catch: (error) =>
            new PostError(
              `DB lookup failed: ${(error as Error).message}`,
              "DATABASE_ERROR"
            ),
        })
      );

      if (cachedAudio && cachedAudio.s3Key) {
        const presignedUrl = yield* _(s3Service.getPresignedUrl(cachedAudio.s3Key));
        return {
          ...cachedAudio,
          audioUrl: presignedUrl,
          cached: true,
        };
      }

      // 2. If not cached, fetch post content to generate audio
      const post = yield* _(
        Effect.tryPromise({
          try: () =>
            db.post.findUnique({
              where: { id: postId, published: true },
              select: {
                id: true,
                slug: true,  // Include slug in the query
                title: true,
                body: true,
                updatedAt: true,
              },
            }),
          catch: (error) =>
            new PostError(
              `Post lookup failed: ${(error as Error).message}`,
              "DATABASE_ERROR"
            ),
        })
      );

      if (!post || !post.body || !post.updatedAt || !post.slug) {
        return yield* _(
          Effect.fail(
            new PostError(
              "Post not found, has no content, or is missing a slug",
              "POST_NOT_FOUND"
            )
          )
        );
      }

      const validPost = post as {
        id: string;
        title: string;
        body: string;
        updatedAt: Date;
        slug: string;
      };

      const s3Key = generateAudioKeyFromPost(validPost.slug, validPost.updatedAt);
      const text = `${validPost.title}. ${validPost.body}`;

      // 3. Generate audio from text using TTS service
      const audioBuffer = yield* _(ttsService.generateSpeech(text, { voiceName: options.voice }));

      // 4. Upload the generated audio to S3
      const uploadResult = yield* _(s3Service.uploadAudio(s3Key, audioBuffer));

      // 5. Save the new audio metadata to the database cache
      const duration = estimateAudioDuration(text);
      const newCachedAudio = yield* _(
        Effect.tryPromise({
          try: () =>
            db.audioCache.create({
              data: {
                postId: validPost.id,
                s3Key: uploadResult.key,
                fileSize: uploadResult.size,
                duration: duration,
                audioUrl: "", // Not stored, generated on the fly
              },
            }),
          catch: (error) =>
            new PostError(
              `DB cache creation failed: ${(error as Error).message}`,
              "DATABASE_ERROR"
            ),
        })
      );

      // 6. Get a presigned URL for the newly uploaded file
      const presignedUrl = yield* _(s3Service.getPresignedUrl(uploadResult.key));

      return {
        ...newCachedAudio,
        audioUrl: presignedUrl,
        cached: false,
      };
    }),
};

// Export service instance
export const audioService = AudioServiceLive;
