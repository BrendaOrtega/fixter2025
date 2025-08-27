import { db } from "../app/.server/db";

async function createTestPerformanceData() {
  console.log("Creating test performance data...\n");

  try {
    // Get some existing posts
    const posts = await db.post.findMany({
      where: { published: true },
      take: 3,
      select: { id: true, title: true },
    });

    if (posts.length === 0) {
      console.log("No published posts found. Please create some posts first.");
      return;
    }

    console.log(`Found ${posts.length} posts to add analytics data to:`);
    posts.forEach((post) => console.log(`- ${post.title}`));

    const now = new Date();
    const sessionIds = [
      "session-1",
      "session-2",
      "session-3",
      "session-4",
      "session-5",
    ];

    // Create varied analytics data for each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const baseScore = 30 + i * 25; // Different performance levels

      console.log(`\nCreating analytics data for: ${post.title}`);

      // Create multiple sessions with different engagement patterns
      for (let j = 0; j < sessionIds.length; j++) {
        const sessionId = `${sessionIds[j]}-${post.id}`;
        const readingTime = Math.max(30, baseScore * 2 + Math.random() * 120);
        const scrollDepth = Math.max(20, baseScore + Math.random() * 40);
        const completionRate = Math.max(
          10,
          scrollDepth * 0.8 + Math.random() * 20
        );

        // Page view event
        await db.blogAnalytics.create({
          data: {
            postId: post.id,
            sessionId,
            event: "page_view",
            timestamp: new Date(
              now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ),
            readingTime: Math.round(readingTime),
            scrollDepth: Math.round(scrollDepth),
            completionRate: Math.round(completionRate),
            userAgent: "Mozilla/5.0 (Test Browser)",
          },
        });

        // Scroll events
        await db.blogAnalytics.create({
          data: {
            postId: post.id,
            sessionId,
            event: "scroll",
            timestamp: new Date(
              now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ),
            scrollDepth: Math.round(scrollDepth),
            readingTime: Math.round(readingTime * 0.7),
            userAgent: "Mozilla/5.0 (Test Browser)",
          },
        });

        // Click events with coordinates
        if (Math.random() > 0.3) {
          // 70% chance of clicks
          await db.blogAnalytics.create({
            data: {
              postId: post.id,
              sessionId,
              event: "click",
              timestamp: new Date(
                now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
              ),
              clickX: Math.random() * 100,
              clickY: Math.random() * 100,
              elementClicked: "p",
              userAgent: "Mozilla/5.0 (Test Browser)",
            },
          });
        }

        // Some sessions return (simulate returning users)
        if (j < 2) {
          await db.blogAnalytics.create({
            data: {
              postId: post.id,
              sessionId,
              event: "page_view",
              timestamp: new Date(
                now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000
              ),
              readingTime: Math.round(readingTime * 1.2),
              scrollDepth: Math.round(Math.min(100, scrollDepth * 1.1)),
              completionRate: Math.round(Math.min(100, completionRate * 1.1)),
              userAgent: "Mozilla/5.0 (Test Browser)",
            },
          });
        }
      }

      console.log(`✅ Created analytics data for ${post.title}`);
    }

    console.log("\n✅ Test performance data created successfully!");
    console.log(
      "You can now visit /analytics to see the performance scoring in action."
    );
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  }
}

createTestPerformanceData();
