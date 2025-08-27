import { performanceScoring } from "../app/.server/services/performance-scoring";

async function testPerformanceScoring() {
  console.log("Testing Performance Scoring Service...\n");

  try {
    // Test getting performance trends
    console.log("1. Testing performance trends...");
    const trends = await performanceScoring.getPerformanceTrends();

    console.log("This week scores:", trends.thisWeek.length);
    console.log("Last week scores:", trends.lastWeek.length);
    console.log("Top performers:", trends.topPerformers.length);
    console.log("Recommendations:", trends.recommendations.length);

    if (trends.topPerformers.length > 0) {
      console.log("\nTop performer example:");
      const top = trends.topPerformers[0];
      console.log(`- Title: ${top.title}`);
      console.log(`- Score: ${top.score}/100`);
      console.log(`- Metrics:`, {
        avgReadingTime: Math.round(top.metrics.avgReadingTime),
        avgScrollDepth: Math.round(top.metrics.avgScrollDepth),
        viewCount: top.metrics.viewCount,
        returnVisitorRate:
          Math.round(top.metrics.returnVisitorRate * 100) + "%",
      });
      console.log(`- Recommendations: ${top.recommendations.length}`);
      if (top.recommendations.length > 0) {
        console.log(`  - ${top.recommendations[0]}`);
      }
    }

    // Test getting performance scores for a specific date range
    console.log("\n2. Testing performance scores for last 30 days...");
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const scores = await performanceScoring.getPerformanceScores(
      startDate,
      endDate,
      5
    );
    console.log(`Found ${scores.length} posts with performance data`);

    if (scores.length > 0) {
      console.log("\nPerformance scores:");
      scores.forEach((score, index) => {
        console.log(`${index + 1}. ${score.title} - Score: ${score.score}/100`);
      });
    }

    console.log("\n✅ Performance scoring test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing performance scoring:", error);
  }
}

testPerformanceScoring();
