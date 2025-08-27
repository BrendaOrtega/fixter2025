#!/usr/bin/env tsx

/**
 * Test script to verify cohort analysis queries
 * Tests the cohort analysis service functions
 */

import { cohortAnalysis } from "../app/.server/services/cohort-analysis";

async function testNewVsReturningUsers() {
  console.log("🧪 Testing New vs Returning Users Analysis...\n");

  try {
    // Test with a recent date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const result = await cohortAnalysis.getNewVsReturningUsers(
      startDate,
      endDate
    );

    console.log("📊 New vs Returning Users Results:");
    console.log(`Total Users: ${result.metrics.totalUsers}`);
    console.log(
      `New Users: ${result.metrics.newUsers} (${result.newUsers.length} sessions)`
    );
    console.log(
      `Returning Users: ${result.metrics.returningUsers} (${result.returningUsers.length} sessions)`
    );
    console.log(`Retention Rate: ${result.metrics.retentionRate.toFixed(2)}%`);
    console.log(
      `Avg Sessions per User: ${result.metrics.avgSessionsPerUser.toFixed(2)}`
    );

    // Show sample session IDs
    if (result.newUsers.length > 0) {
      console.log(
        `Sample New User Sessions: ${result.newUsers.slice(0, 3).join(", ")}`
      );
    }
    if (result.returningUsers.length > 0) {
      console.log(
        `Sample Returning User Sessions: ${result.returningUsers
          .slice(0, 3)
          .join(", ")}`
      );
    }

    console.log("✅ New vs Returning Users test completed\n");
    return true;
  } catch (error) {
    console.error("❌ New vs Returning Users test failed:", error);
    return false;
  }
}

async function testRetentionMetrics() {
  console.log("🧪 Testing Retention Metrics...\n");

  try {
    // Test retention for users who first visited 7 days ago
    const cohortDate = new Date();
    cohortDate.setDate(cohortDate.getDate() - 7);

    const result = await cohortAnalysis.getRetentionMetrics(cohortDate);

    console.log("📊 Retention Metrics Results:");
    console.log(`Cohort Size: ${result.cohortSize}`);
    console.log(`Day 1 Retention: ${result.day1Retention.toFixed(2)}%`);
    console.log(`Day 7 Retention: ${result.day7Retention.toFixed(2)}%`);
    console.log(`Retained Users: ${result.retainedUsers.length}`);

    if (result.retainedUsers.length > 0) {
      console.log(
        `Sample Retained Sessions: ${result.retainedUsers
          .slice(0, 3)
          .join(", ")}`
      );
    }

    console.log("✅ Retention Metrics test completed\n");
    return true;
  } catch (error) {
    console.error("❌ Retention Metrics test failed:", error);
    return false;
  }
}

async function testEngagementSegmentation() {
  console.log("🧪 Testing User Engagement Segmentation...\n");

  try {
    // Test with last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const result = await cohortAnalysis.segmentUsersByEngagement(
      startDate,
      endDate
    );

    console.log("📊 Engagement Segmentation Results:");
    console.log(`Total Users Analyzed: ${result.length}`);

    // Group by engagement level
    const engagementGroups = result.reduce((acc, user) => {
      acc[user.engagementLevel] = (acc[user.engagementLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("Engagement Distribution:");
    Object.entries(engagementGroups).forEach(([level, count]) => {
      const percentage =
        result.length > 0 ? ((count / result.length) * 100).toFixed(1) : "0";
      console.log(`  ${level.toUpperCase()}: ${count} users (${percentage}%)`);
    });

    // Show sample high engagement users
    const highEngagementUsers = result
      .filter((u) => u.engagementLevel === "high")
      .slice(0, 3);
    if (highEngagementUsers.length > 0) {
      console.log("\nSample High Engagement Users:");
      highEngagementUsers.forEach((user) => {
        console.log(`  Session: ${user.sessionId.substring(0, 12)}...`);
        console.log(`    Reading Time: ${user.totalReadingTime}s`);
        console.log(`    Avg Scroll Depth: ${user.avgScrollDepth.toFixed(1)}%`);
        console.log(`    Posts Viewed: ${user.postsViewed}`);
        console.log(`    Total Sessions: ${user.totalSessions}`);
      });
    }

    console.log("✅ Engagement Segmentation test completed\n");
    return true;
  } catch (error) {
    console.error("❌ Engagement Segmentation test failed:", error);
    return false;
  }
}

async function testContentPreferences() {
  console.log("🧪 Testing Content Preferences by Cohort...\n");

  try {
    // Test with last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Test for different cohorts
    const cohortTypes: ("new" | "returning" | "high_engagement")[] = [
      "new",
      "returning",
      "high_engagement",
    ];

    for (const cohortType of cohortTypes) {
      console.log(
        `📊 Content Preferences for ${cohortType.toUpperCase()} users:`
      );

      const preferences = await cohortAnalysis.getContentPreferencesByCohort(
        cohortType,
        startDate,
        endDate
      );

      if (preferences.length === 0) {
        console.log(`  No data available for ${cohortType} cohort`);
      } else {
        console.log(`  Top ${Math.min(5, preferences.length)} content pieces:`);
        preferences.slice(0, 5).forEach((content, index) => {
          console.log(
            `    ${index + 1}. Post: ${content.postId.substring(0, 12)}...`
          );
          console.log(`       Category: ${content.category}`);
          console.log(
            `       Engagement Score: ${content.engagementScore.toFixed(2)}`
          );
          console.log(`       View Count: ${content.viewCount}`);
          console.log(
            `       Avg Reading Time: ${content.avgReadingTime.toFixed(1)}s`
          );
        });
      }
      console.log("");
    }

    console.log("✅ Content Preferences test completed\n");
    return true;
  } catch (error) {
    console.error("❌ Content Preferences test failed:", error);
    return false;
  }
}

async function testCohortSummary() {
  console.log("🧪 Testing Cohort Summary Dashboard Data...\n");

  try {
    // Test with last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const summary = await cohortAnalysis.getCohortSummary(startDate, endDate);

    console.log("📊 Cohort Summary Results:");
    console.log("User Metrics:");
    console.log(`  Total Users: ${summary.userMetrics.totalUsers}`);
    console.log(`  New Users: ${summary.userMetrics.newUsers}`);
    console.log(`  Returning Users: ${summary.userMetrics.returningUsers}`);
    console.log(
      `  Retention Rate: ${summary.userMetrics.retentionRate.toFixed(2)}%`
    );

    console.log("\nEngagement Distribution:");
    Object.entries(summary.engagementDistribution).forEach(([level, count]) => {
      console.log(`  ${level.toUpperCase()}: ${count} users`);
    });

    console.log(
      `\nTop New User Content: ${summary.topNewUserContent.length} items`
    );
    console.log(
      `Top Returning User Content: ${summary.topReturningUserContent.length} items`
    );
    console.log(`Total Cohorts Analyzed: ${summary.totalCohorts}`);

    console.log("✅ Cohort Summary test completed\n");
    return true;
  } catch (error) {
    console.error("❌ Cohort Summary test failed:", error);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 Starting Cohort Analysis Tests...\n");

  const tests = [
    { name: "New vs Returning Users", fn: testNewVsReturningUsers },
    { name: "Retention Metrics", fn: testRetentionMetrics },
    { name: "Engagement Segmentation", fn: testEngagementSegmentation },
    { name: "Content Preferences", fn: testContentPreferences },
    { name: "Cohort Summary", fn: testCohortSummary },
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    console.log(`🔄 Running ${test.name} test...`);
    const passed = await test.fn();
    if (passed) {
      passedTests++;
    }
    console.log("─".repeat(50));
  }

  console.log(`\n📊 Final Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All cohort analysis tests completed successfully!");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed!");
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error("💥 Test runner failed:", error);
  process.exit(1);
});
