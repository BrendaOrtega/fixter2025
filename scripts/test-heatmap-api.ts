import { db } from "../app/.server/db";

async function testHeatmapAPI() {
  console.log("Testing heatmap data retrieval...");

  try {
    // First, let's see what posts exist
    const posts = await db.post.findMany({
      select: { id: true, title: true, slug: true },
      take: 5,
    });

    console.log("Available posts:");
    posts.forEach((post) => {
      console.log(`- ${post.title} (ID: ${post.id})`);
    });

    if (posts.length === 0) {
      console.log("No posts found in database");
      return;
    }

    // Test with the first post
    const testPostId = posts[0].id;
    console.log(`\nTesting with post ID: ${testPostId}`);

    // Check if there's any analytics data for this post
    const analyticsData = await db.blogAnalytics.findMany({
      where: { postId: testPostId },
      select: {
        event: true,
        clickX: true,
        clickY: true,
        timestamp: true,
      },
      take: 10,
    });

    console.log(`Found ${analyticsData.length} analytics events for this post`);

    if (analyticsData.length > 0) {
      console.log("Sample analytics data:");
      analyticsData.forEach((data, index) => {
        console.log(
          `  ${index + 1}. Event: ${data.event}, X: ${data.clickX}, Y: ${
            data.clickY
          }`
        );
      });
    }

    // Test the heatmap query specifically
    const clickData = await db.blogAnalytics.findMany({
      where: {
        postId: testPostId,
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

    console.log(`\nFound ${clickData.length} click events with coordinates`);

    if (clickData.length > 0) {
      console.log("Click coordinate data:");
      clickData.forEach((click, index) => {
        console.log(`  ${index + 1}. X: ${click.clickX}%, Y: ${click.clickY}%`);
      });

      // Simulate the API response
      const heatmapData = {
        clicks: clickData.map((click) => ({
          x: click.clickX || 0,
          y: click.clickY || 0,
        })),
        totalClicks: clickData.length,
        postId: testPostId,
      };

      console.log("\nSimulated API response:");
      console.log(JSON.stringify(heatmapData, null, 2));
    } else {
      console.log("No click coordinate data found. You may need to:");
      console.log("1. Visit some posts and click on elements");
      console.log("2. Ensure the analytics tracking is working");
      console.log("3. Check that coordinates are being saved properly");
    }
  } catch (error) {
    console.error("Error testing heatmap API:", error);
  }
}

// Run the test
testHeatmapAPI()
  .then(() => {
    console.log("\nTest completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
