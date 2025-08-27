import type { LoaderFunction } from "react-router";
import { db } from "~/.server/db";

export const loader: LoaderFunction = async ({ params }) => {
  const { postId } = params;

  if (!postId) {
    return new Response(JSON.stringify({ error: "Post ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch click coordinate data from BlogAnalytics table
    const clickData = await db.blogAnalytics.findMany({
      where: {
        postId,
        event: "click",
        clickX: { not: null },
        clickY: { not: null },
      },
      select: {
        clickX: true,
        clickY: true,
        timestamp: true,
        sessionId: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Transform data for heatmap visualization
    const clicks = clickData.map((click) => ({
      x: click.clickX || 0,
      y: click.clickY || 0,
    }));

    const heatmapData = {
      clicks,
      totalClicks: clicks.length,
      postId,
    };

    return new Response(JSON.stringify(heatmapData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch heatmap data" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
