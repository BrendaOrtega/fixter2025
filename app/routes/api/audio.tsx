import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Effect, pipe } from "effect";
import { db } from "~/.server/db";
import { getUserOrNull } from "~/.server/dbGetters";
import { audioService } from "~/.server/services/audio";
import { ttsService } from "~/.server/services/tts";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  maxRequests: 10, // Max requests per window
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// Rate limiting function using Effect
const checkRateLimit = (clientId: string) =>
  Effect.gen(function* () {
    const now = Date.now();
    const clientData = rateLimitStore.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize rate limit
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + RATE_LIMIT.windowMs,
      });
      return true;
    }

    if (clientData.count >= RATE_LIMIT.maxRequests) {
      return false;
    }

    // Increment count
    rateLimitStore.set(clientId, {
      ...clientData,
      count: clientData.count + 1,
    });

    return true;
  });

// Get client identifier for rate limiting
const getClientId = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}-${userAgent}`;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const postId = url.searchParams.get("postId");
  const voice = url.searchParams.get("voice") || "en-US-Neural2-D";

  // Handle voice listing
  if (intent === "list_voices") {
    try {
      const voices = await Effect.runPromise(
        pipe(
          ttsService.listVoices(),
          Effect.catchAll((error) => {
            console.error("Voice listing error:", error);
            return Effect.succeed([]);
          })
        )
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: voices,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch voices",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  if (!postId) {
    return new Response(JSON.stringify({ error: "postId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const cachedAudio = await Effect.runPromise(
      pipe(
        audioService.getCachedAudio(postId),
        Effect.catchAll(() => Effect.succeed(null))
      )
    );

    if (cachedAudio) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            audioUrl: cachedAudio.audioUrl,
            duration: cachedAudio.duration,
            cached: true,
            generatedAt: cachedAudio.createdAt,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Audio not found in cache",
        cached: false,
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Import the cleanTextForTTS function from fonema
import { cleanTextForTTS } from "fonema";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate_audio") {
    const postId = formData.get("postId") as string;
    const postTitle = formData.get("postTitle") as string;
    const postBody = formData.get("postBody") as string;
    const voice = formData.get("voice") as string;

    if (!postId || !postTitle || !postBody) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "postId, postTitle, and postBody are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const clientId = getClientId(request);

    try {
      // Check rate limit
      const canProceed = await Effect.runPromise(checkRateLimit(clientId));
      if (!canProceed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please try again later.",
            rateLimited: true,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Get user if authenticated
      const user = await getUserOrNull(request);

      // Generate audio using the real audio service
      const audioResult = await Effect.runPromise(
        Effect.gen(function* () {
          return yield* audioService.getOrCreateAudio(postId, { voice });
        }).pipe(
          Effect.catchAll((error) => {
            console.error("Audio generation error:", error);
            // Include the original error message in the error
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return Effect.fail(
              new Error(`Failed to generate audio: ${errorMessage}`)
            );
          })
        )
      );

      // Track analytics
      try {
        await db.blogAnalytics.create({
          data: {
            postId,
            event: "audio_generated",
            userId: user?.id || null,
            sessionId: clientId,
            metadata: {
              duration: audioResult.duration,
              fileSize: audioResult.fileSize,
              cached: audioResult.cached,
              s3Key: audioResult.s3Key,
              clientId,
            },
          },
        });
      } catch (analyticsError) {
        console.error("Analytics tracking error:", analyticsError);
        // Don't fail the request if analytics fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            audioUrl: audioResult.audioUrl,
            duration: audioResult.duration,
            cached: audioResult.cached,
            generatedAt: audioResult.createdAt,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Audio generation failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorDetails = {
        error: "Failed to generate audio",
        message: errorMessage,
        code:
          error instanceof Error && "code" in error ? error.code : undefined,
        // Only include stack trace in development
        ...(process.env.NODE_ENV === "development"
          ? { stack: error instanceof Error ? error.stack : undefined }
          : {}),
      };

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No se pudo generar el audio. Por favor inténtalo de nuevo más tarde.",
          // Only include details in development
          ...(process.env.NODE_ENV === "development"
            ? { details: errorDetails }
            : {}),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  if (intent === "track_playback") {
    const postId = formData.get("postId") as string;
    const event = formData.get("event") as string; // 'play', 'pause', 'complete'
    const currentTime = parseFloat(formData.get("currentTime") as string) || 0;
    const duration = parseFloat(formData.get("duration") as string) || 0;

    if (!postId || !event) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "postId and event are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const user = await getUserOrNull(request);

      await db.blogAnalytics.create({
        data: {
          postId,
          event: `audio_${event}`,
          userId: user?.id || null,
          sessionId: getClientId(request),
          metadata: {
            currentTime,
            duration,
            progress: duration > 0 ? (currentTime / duration) * 100 : 0,
            clientId: getClientId(request),
          },
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Tracking error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to track event",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: "Invalid intent" }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
};
