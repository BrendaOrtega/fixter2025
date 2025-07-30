import { db } from "../app/.server/db";

async function createTestHeatmapData() {
  console.log("Creating test heatmap data...");

  try {
    // Get the first post
    const post = await db.post.findFirst({
      select: { id: true, title: true },
    });

    if (!post) {
      console.log("No posts found in database");
      return;
    }

    console.log(`Creating test data for post: ${post.title} (ID: ${post.id})`);

    // Generate realistic click patterns
    const clickPatterns = [
      // Header area clicks (title, navigation)
      { x: 50, y: 15, count: 8 }, // Title area
      { x: 20, y: 10, count: 3 }, // Navigation
      { x: 80, y: 10, count: 2 }, // Navigation right

      // Content area clicks
      { x: 45, y: 30, count: 12 }, // First paragraph
      { x: 55, y: 35, count: 6 }, // First paragraph continued
      { x: 40, y: 45, count: 9 }, // Second paragraph
      { x: 60, y: 50, count: 4 }, // Second paragraph continued

      // Button/CTA clicks
      { x: 30, y: 65, count: 15 }, // Primary button
      { x: 70, y: 65, count: 8 }, // Secondary button

      // Social sharing clicks
      { x: 25, y: 80, count: 5 }, // Facebook
      { x: 35, y: 80, count: 3 }, // Twitter
      { x: 45, y: 80, count: 2 }, // LinkedIn

      // Footer area
      { x: 50, y: 90, count: 4 }, // Footer links

      // Random scattered clicks
      { x: 15, y: 25, count: 2 },
      { x: 85, y: 40, count: 1 },
      { x: 25, y: 55, count: 3 },
      { x: 75, y: 70, count: 2 },
    ];

    let totalInserted = 0;

    for (const pattern of clickPatterns) {
      for (let i = 0; i < pattern.count; i++) {
        // Add some randomness to make it more realistic
        const randomX = pattern.x + (Math.random() - 0.5) * 10; // ±5% variation
        const randomY = pattern.y + (Math.random() - 0.5) * 8; // ±4% variation

        // Ensure coordinates stay within bounds
        const finalX = Math.max(0, Math.min(100, randomX));
        const finalY = Math.max(0, Math.min(100, randomY));

        // Generate a realistic session ID
        const sessionId = `test-session-${Math.random()
          .toString(36)
          .substring(2, 15)}`;

        // Random timestamp within the last 7 days
        const randomTime = new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        );

        await db.blogAnalytics.create({
          data: {
            postId: post.id,
            sessionId,
            event: "click",
            timestamp: randomTime,
            clickX: finalX,
            clickY: finalY,
            userAgent: "Mozilla/5.0 (Test Data Generator)",
            viewportWidth: 1920,
            viewportHeight: 1080,
            elementClicked: "test-element",
          },
        });

        totalInserted++;
      }
    }

    console.log(`✅ Successfully created ${totalInserted} test click events`);

    // Verify the data was created
    const clickCount = await db.blogAnalytics.count({
      where: {
        postId: post.id,
        event: "click",
        clickX: { not: null },
        clickY: { not: null },
      },
    });

    console.log(`📊 Total click events for this post: ${clickCount}`);
    console.log(`🔗 View heatmap at: /admin/heatmap/${post.id}`);
  } catch (error) {
    console.error("Error creating test heatmap data:", error);
  }
}

// Run the script
createTestHeatmapData()
  .then(() => {
    console.log("\nTest data creation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
