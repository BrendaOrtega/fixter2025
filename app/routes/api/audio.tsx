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

// Function to clean text from emojis and special characters for TTS
function cleanTextForTTS(text: string): string {
  if (!text) return "";
  
  // Remove emojis and special symbols
  return text
    // Remove emojis (Unicode ranges for emojis)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{2389}-\u{23FA}]|[\u{2B50}-\u{2B55}]|[\u{23F0}-\u{23FA}]|[\u{24C2}]|[\u{25AA}-\u{25AB}]|[\u{25FB}-\u{25FE}]|[\u{2600}-\u{26FF}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{2709}]|[\u{270A}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F321}]|[\u{1F324}-\u{1F393}]|[\u{1F396}-\u{1F397}]|[\u{1F399}-\u{1F39B}]|[\u{1F39E}-\u{1F3F0}]|[\u{1F3F3}-\u{1F3F5}]|[\u{1F3F7}-\u{1F3FA}]|[\u{1F400}-\u{1F4FF}]|[\u{1F500}-\u{1F53D}]|[\u{1F546}-\u{1F579}]|[\u{1F57A}-\u{1F5A3}]|[\u{1F5A5}-\u{1F5FA}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CB}-\u{1F6D2}]|[\u{1F6E0}-\u{1F6E5}]|[\u{1F6E9}]|[\u{1F6EB}-\u{1F6EC}]|[\u{1F6F0}]|[\u{1F6F3}-\u{1F6F8}]|[\u{1F910}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|[\u{1F950}-\u{1F95E}]|[\u{1F980}-\u{1F991}]|[\u{1F992}-\u{1F997}]|[\u{1F9C0}]|[\u{1F9D0}-\u{1F9E6}]|[\u{1F9E7}-\u{1F9FF}]|[\u{1FA70}-\u{1FA73}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA82}]|[\u{1FA90}-\u{1FA95}]/gu, "")
    // Clean up extra spaces
    .replace(/\s+/g, " ")
    .trim();
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate_audio") {
    const postId = formData.get("postId") as string;
    const postTitle = formData.get("postTitle") as string;
    const postBody = formData.get("postBody") as string;
    const voice = formData.get("voice") as string;

    // Clean text from emojis for better TTS experience
    const cleanTitle = cleanTextForTTS(postTitle);
    const cleanBody = cleanTextForTTS(postBody);

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
            const errorMessage = error instanceof Error ? error.message : String(error);
            return Effect.fail(new Error(`Failed to generate audio: ${errorMessage}`));
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        error: "Failed to generate audio",
        message: errorMessage,
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        // Only include stack trace in development
        ...(process.env.NODE_ENV === "development" ? { stack: error instanceof Error ? error.stack : undefined } : {})
      };
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo generar el audio. Por favor inténtalo de nuevo más tarde.",
          // Only include details in development
          ...(process.env.NODE_ENV === "development" ? { details: errorDetails } : {}),
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
