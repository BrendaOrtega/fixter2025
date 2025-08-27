import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testFinalIntegration() {
  console.log("Testing final integration of performance scoring...\n");

  try {
    // Check if we have analytics data
    const analyticsCount = await db.blogAnalytics.count();
    console.log(`Total analytics records: ${analyticsCount}`);

    // Check posts with analytics
    const postsWithAnalytics = await db.blogAnalytics.groupBy({
      by: ["postId"],
      _count: {
        postId: true,
      },
    });

    console.log(`Posts with analytics data: ${postsWithAnalytics.length}`);

    // Get detailed analytics for each post
    for (const postGroup of postsWithAnalytics.slice(0, 3)) {
      const post = await db.post.findUnique({
        where: { id: postGroup.postId },
        select: { title: true, id: true },
      });

      if (post) {
        console.log(`\nPost: ${post.title}`);
        console.log(`Analytics records: ${postGroup._count.postId}`);

        // Get sample analytics data
        const analytics = await db.blogAnalytics.findMany({
          where: { postId: post.id },
          take: 5,
        });

        console.log("Sample analytics:");
        analytics.forEach((a) => {
          console.log(
            `  - ${a.event}: reading=${a.readingTime}s, scroll=${a.scrollDepth}%, completion=${a.completionRate}%`
          );
        });

        // Calculate basic metrics
        const pageViews = await db.blogAnalytics.count({
          where: { postId: post.id, event: "page_view" },
        });

        const avgReadingTime = await db.blogAnalytics.aggregate({
          where: {
            postId: post.id,
            readingTime: { not: null, gt: 0 },
          },
          _avg: { readingTime: true },
        });

        const avgScrollDepth = await db.blogAnalytics.aggregate({
          where: {
            postId: post.id,
            scrollDepth: { not: null, gt: 0 },
          },
          _avg: { scrollDepth: true },
        });

        console.log(
          `Metrics: ${pageViews} views, ${Math.round(
            avgReadingTime._avg.readingTime || 0
          )}s avg read, ${Math.round(
            avgScrollDepth._avg.scrollDepth || 0
          )}% avg scroll`
        );
      }
    }

    console.log("\n✅ Final integration test completed!");
  } catch (error) {
    console.error("❌ Error in final integration test:", error);
  } finally {
    await db.$disconnect();
  }
}

testFinalIntegration();
