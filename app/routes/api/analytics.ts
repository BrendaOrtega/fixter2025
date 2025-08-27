import type { ActionFunction } from "react-router";
import { db } from "~/.server/db";

// Generate a session ID based on user agent and timestamp
function generateSessionId(userAgent: string, ip: string): string {
  const hash = Buffer.from(`${userAgent}-${ip}-${Date.now()}`).toString(
    "base64"
  );
  return hash.substring(0, 16);
}

// Validate coordinate data
function validateCoordinates(
  x?: number,
  y?: number
): { isValid: boolean; normalizedX?: number; normalizedY?: number } {
  if (x === undefined || y === undefined) {
    return { isValid: true }; // Coordinates are optional
  }

  if (typeof x !== "number" || typeof y !== "number") {
    return { isValid: false };
  }

  // Ensure coordinates are between 0 and 1, then convert to percentage (0-100)
  const normalizedX = Math.max(0, Math.min(1, x)) * 100;
  const normalizedY = Math.max(0, Math.min(1, y)) * 100;

  return { isValid: true, normalizedX, normalizedY };
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const event = await request.json();

    // Basic validation
    if (!event.type) {
      return new Response(JSON.stringify({ error: "Event type is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get client info
    const userAgent = request.headers.get("user-agent") || "";
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Generate session ID
    const sessionId = generateSessionId(userAgent, ipAddress);

    // Validate and normalize coordinates if present
    const coordinateValidation = validateCoordinates(
      event.metadata?.x,
      event.metadata?.y
    );
    if (!coordinateValidation.isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinate data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare data for BlogAnalytics table
    const analyticsData: any = {
      event: event.type,
      postId: event.postId || "000000000000000000000000", // Default ObjectId for MongoDB
      sessionId,
      timestamp: new Date(),
      userAgent,
      referrer: request.headers.get("referer") || undefined,
    };

    // Map metadata fields to specific BlogAnalytics fields
    if (event.metadata) {
      // Map coordinates from metadata.x/y to clickX/clickY
      if (coordinateValidation.normalizedX !== undefined) {
        analyticsData.clickX = coordinateValidation.normalizedX;
      }
      if (coordinateValidation.normalizedY !== undefined) {
        analyticsData.clickY = coordinateValidation.normalizedY;
      }

      // Map other metadata fields
      if (event.metadata.scrollDepth !== undefined) {
        analyticsData.scrollDepth = Math.max(
          0,
          Math.min(100, event.metadata.scrollDepth * 100)
        );
      }
      if (event.metadata.readingTime !== undefined) {
        analyticsData.readingTime = Math.max(0, event.metadata.readingTime);
      }
      if (event.metadata.element !== undefined) {
        analyticsData.elementClicked = String(event.metadata.element).substring(
          0,
          100
        );
      }
      if (event.metadata.text !== undefined) {
        analyticsData.textSelected = String(event.metadata.text).substring(
          0,
          100
        );
      }
      if (event.metadata.scrollY !== undefined) {
        analyticsData.scrollY = Math.max(0, event.metadata.scrollY);
      }
      if (event.metadata.viewportWidth !== undefined) {
        analyticsData.viewportWidth = Math.max(0, event.metadata.viewportWidth);
      }
      if (event.metadata.viewportHeight !== undefined) {
        analyticsData.viewportHeight = Math.max(
          0,
          event.metadata.viewportHeight
        );
      }

      // Store remaining metadata as JSON
      const remainingMetadata = { ...event.metadata };
      delete remainingMetadata.x;
      delete remainingMetadata.y;
      delete remainingMetadata.scrollDepth;
      delete remainingMetadata.readingTime;
      delete remainingMetadata.element;
      delete remainingMetadata.text;
      delete remainingMetadata.scrollY;
      delete remainingMetadata.viewportWidth;
      delete remainingMetadata.viewportHeight;

      if (Object.keys(remainingMetadata).length > 0) {
        analyticsData.metadata = remainingMetadata;
      }
    }

    // Save to BlogAnalytics table instead of analyticsEvent
    await db.blogAnalytics.create({
      data: analyticsData,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing analytics event:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process analytics event" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// This ensures we only respond to POST requests
export const loader = () => {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};
