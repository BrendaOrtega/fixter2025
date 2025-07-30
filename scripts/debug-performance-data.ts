import { db } from "../app/.server/db";

async function debugPerformanceData() {
  console.log("Debugging performance data...\n");

  try {
    // Check recent analytics data
    const recentAnalytics = await db.blogAnalytics.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      include: {
        // We can't include post directly since it's not a relation, so we'll fetch it separately
      },
    });

    console.log(`Found ${recentAnalytics.length} recent analytics records:`);

    for (const analytics of recentAnalytics) {
      // Get post title
      const post = await db.post.findUnique({
        where: { id: analytics.postId },
        select: { title: true },
      });

      console.log(
        `- ${analytics.event} for "${
          post?.title || "Unknown"
        }" at ${analytics.timestamp.toISOString()}`
      );
      console.log(
        `  Reading: ${analytics.readingTime}s, Scroll: ${analytics.scrollDepth}%, Completion: ${analytics.completionRate}%`
      );
    }

    // Check posts with page_view events specifically
    console.log("\nPosts with page_view events in last 7 days:");
    const pageViewPosts = await db.blogAnalytics.groupBy({
      by: ["postId"],
      where: {
        event: "page_view",
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        postId: true,
      },
    });

    for (const postGroup of pageViewPosts) {
      const post = await db.post.findUnique({
        where: { id: postGroup.postId },
        select: { title: true, published: true },
      });

      if (post) {
        console.log(
          `- "${post.title}" (published: ${post.published}): ${postGroup._count.postId} page views`
        );
      }
    }

    // Test the performance scoring logic directly
    console.log("\nTesting performance scoring logic directly:");
    const testPost = pageViewPosts[0];
    if (testPost) {
      const post = await db.post.findUnique({
        where: { id: testPost.postId },
        select: { title: true, id: true, published: true },
      });

      if (post && post.published) {
        console.log(`\nAnalyzing: ${post.title}`);

        const analytics = await db.blogAnalytics.findMany({
          where: {
            postId: post.id,
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              lte: new Date(),
            },
          },
        });

        console.log(`Total analytics records: ${analytics.length}`);

        const pageViews = analytics.filter(
          (a) => a.event === "page_view"
        ).length;
        const uniqueSessions = new Set(analytics.map((a) => a.sessionId)).size;

        const readingTimes = analytics
          .filter((a) => a.readingTime !== null && a.readingTime > 0)
          .map((a) => a.readingTime!);

        const scrollDepths = analytics
          .filter((a) => a.scrollDepth !== null && a.scrollDepth > 0)
          .map((a) => a.scrollDepth!);

        console.log(`Page views: ${pageViews}`);
        console.log(`Unique sessions: ${uniqueSessions}`);
        console.log(
          `Reading times: ${readingTimes.length} records, avg: ${
            readingTimes.length > 0
              ? Math.round(
                  readingTimes.reduce((sum, time) => sum + time, 0) /
                    readingTimes.length
                )
              : 0
          }s`
        );
        console.log(
          `Scroll depths: ${scrollDepths.length} records, avg: ${
            scrollDepths.length > 0
              ? Math.round(
                  scrollDepths.reduce((sum, depth) => sum + depth, 0) /
                    scrollDepths.length
                )
              : 0
          }%`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error debugging performance data:", error);
  }
}

debugPerformanceData();
