import { Effect } from "effect";
import { db } from "~/.server/db";

// Types
type AnalyticsEvent = {
  type:
    | "page_view"
    | "click"
    | "audio_play"
    | "audio_pause"
    | "audio_end"
    | "scroll"
    | "read_time";
  postId?: string;
  pathname: string;
  metadata?: Record<string, unknown>;
};

type ClickEvent = AnalyticsEvent & {
  type: "click";
  metadata: {
    x: number; // Normalized x coordinate (0-1)
    y: number; // Normalized y coordinate (0-1)
    element: string; // Tag name of the clicked element
    text?: string; // Text content (truncated)
  };
};

type ScrollEvent = AnalyticsEvent & {
  type: "scroll";
  metadata: {
    depth: number; // Scroll depth percentage (0-1)
    timeOnPage: number; // Time on page in seconds
  };
};

// Service
class AnalyticsService {
  // Track a generic analytics event
  track(event: AnalyticsEvent | ClickEvent | ScrollEvent) {
    return Effect.tryPromise({
      try: async () => {
        // In development, just log the event
        if (process.env.NODE_ENV === "development") {
          console.log("[Analytics]", event);
          return;
        }

        // Prepare the data according to the BlogAnalytics model
        const analyticsData: any = {
          event: event.type,
          postId: event.postId || '000000000000000000000000', // Default ObjectId
          sessionId: 'session-' + Date.now(),
          timestamp: new Date(),
          // Optional fields with default values
          userId: undefined,
          readingTime: undefined,
          scrollDepth: undefined,
          completionRate: undefined,
          elementClicked: undefined,
          textSelected: undefined,
          clickX: undefined,
          clickY: undefined,
          scrollY: undefined,
          // Add metadata as JSON string in a field if needed
          // Or map specific metadata to the corresponding fields
          ...(event.metadata || {})
        };

        // Store the event in the database
        await db.blogAnalytics.create({
          data: analyticsData
        });
      },
      catch: (error) => new Error(`Failed to track event: ${error}`),
    });
  }

  // Track a page view
  trackPageView(postId: string, pathname: string) {
    return this.track({
      type: "page_view",
      postId,
      pathname,
    });
  }

  // Track a click with normalized coordinates
  trackClick(
    postId: string,
    pathname: string,
    clickData: ClickEvent["metadata"]
  ) {
    return this.track({
      type: "click",
      postId,
      pathname,
      metadata: clickData,
    });
  }

  // Track scroll depth and time on page
  trackScroll(
    postId: string,
    pathname: string,
    scrollData: ScrollEvent["metadata"]
  ) {
    return this.track({
      type: "scroll",
      postId,
      pathname,
      metadata: scrollData,
    });
  }
}

export const analytics = new AnalyticsService();

// Client-side utilities (for use in React components)
type TrackEvent = (event: Omit<AnalyticsEvent, "pathname">) => Promise<void>;

export const trackEvent: TrackEvent = async (event) => {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...event,
        pathname: window.location.pathname,
      }),
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};

// Hook para uso en componentes React
export const useAnalytics = () => {
  return {
    trackEvent,
    trackClick: (event: Omit<ClickEvent, "type" | "pathname">) =>
      trackEvent({
        type: "click",
        ...event,
      }),
    trackPageView: (postId: string) =>
      trackEvent({
        type: "page_view",
        postId,
      }),
    trackScroll: (postId: string, metadata: ScrollEvent["metadata"]) =>
      trackEvent({
        type: "scroll",
        postId,
        metadata,
      }),
  };
};

// Server-side function for API routes
export async function trackAnalyticsEvent(event: {
  type: string;
  postId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const result = await Effect.runPromise(
      analytics.track({
        type: event.type as any,
        postId: event.postId,
        pathname: '/', // Default since we don't have pathname in server context
        metadata: event.metadata,
      })
    );
    return result;
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    throw error;
  }
}
