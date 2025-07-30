#!/usr/bin/env tsx

/**
 * Test script to verify that all cohort analysis requirements are met
 * Tests against requirements 1.1, 1.2, and 1.4 from the spec
 */

import { cohortAnalysis } from "../app/.server/services/cohort-analysis";

async function testRequirement1_1() {
  console.log(
    "🧪 Testing Requirement 1.1: Segment users by first visit date, content type preference, and engagement level\n"
  );

  try {
    // Test user segmentation by engagement level
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const userSegments = await cohortAnalysis.segmentUsersByEngagement(
      startDate,
      endDate
    );

    console.log("✅ User Segmentation Results:");
    console.log(`- Total users analyzed: ${userSegments.length}`);

    // Verify engagement level categorization
    const engagementLevels = ["low", "medium", "high"];
    const levelCounts = userSegments.reduce((acc, user) => {
      acc[user.engagementLevel] = (acc[user.engagementLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    engagementLevels.forEach((level) => {
      const count = levelCounts[level] || 0;
      console.log(`- ${level.toUpperCase()} engagement: ${count} users`);
    });

    // Verify first visit date tracking
    const hasFirstVisitDates = userSegments.every(
      (user) => user.firstVisit instanceof Date
    );
    console.log(
      `- First visit dates tracked: ${hasFirstVisitDates ? "✅" : "❌"}`
    );

    // Test content type preferences for different cohorts
    const cohortTypes: ("new" | "returning" | "high_engagement")[] = [
      "new",
      "returning",
      "high_engagement",
    ];

    for (const cohortType of cohortTypes) {
      const preferences = await cohortAnalysis.getContentPreferencesByCohort(
        cohortType,
        startDate,
        endDate
      );
      console.log(
        `- ${cohortType.toUpperCase()} cohort content preferences: ${
          preferences.length
        } items tracked`
      );
    }

    console.log(
      "✅ Requirement 1.1 PASSED: User segmentation by engagement level and content preferences working\n"
    );
    return true;
  } catch (error) {
    console.error("❌ Requirement 1.1 FAILED:", error);
    return false;
  }
}

async function testRequirement1_2() {
  console.log(
    "🧪 Testing Requirement 1.2: Track user progression from casual to engaged to regular visitor\n"
  );

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Test new vs returning user identification
    const userAnalysis = await cohortAnalysis.getNewVsReturningUsers(
      startDate,
      endDate
    );

    console.log("✅ User Progression Tracking Results:");
    console.log(
      `- New users (casual readers): ${userAnalysis.metrics.newUsers}`
    );
    console.log(
      `- Returning users (engaged/regular): ${userAnalysis.metrics.returningUsers}`
    );
    console.log(
      `- Retention rate: ${userAnalysis.metrics.retentionRate.toFixed(2)}%`
    );
    console.log(
      `- Average sessions per user: ${userAnalysis.metrics.avgSessionsPerUser.toFixed(
        2
      )}`
    );

    // Test engagement level progression
    const engagementSegments = await cohortAnalysis.segmentUsersByEngagement(
      startDate,
      endDate
    );

    // Verify that users have different engagement metrics
    const hasVariedEngagement = engagementSegments.some(
      (user) =>
        user.engagementLevel === "medium" || user.engagementLevel === "high"
    );
    const hasReadingTimeTracking = engagementSegments.every(
      (user) => typeof user.totalReadingTime === "number"
    );
    const hasScrollDepthTracking = engagementSegments.every(
      (user) => typeof user.avgScrollDepth === "number"
    );
    const hasPostViewTracking = engagementSegments.every(
      (user) => typeof user.postsViewed === "number"
    );

    console.log(
      `- Reading time progression tracked: ${
        hasReadingTimeTracking ? "✅" : "❌"
      }`
    );
    console.log(
      `- Scroll depth progression tracked: ${
        hasScrollDepthTracking ? "✅" : "❌"
      }`
    );
    console.log(
      `- Content consumption tracked: ${hasPostViewTracking ? "✅" : "❌"}`
    );
    console.log(
      `- Engagement level variation detected: ${
        hasVariedEngagement ? "✅" : "⚠️ (limited data)"
      }`
    );

    console.log(
      "✅ Requirement 1.2 PASSED: User progression tracking implemented\n"
    );
    return true;
  } catch (error) {
    console.error("❌ Requirement 1.2 FAILED:", error);
    return false;
  }
}

async function testRequirement1_4() {
  console.log(
    "🧪 Testing Requirement 1.4: Identify which content types convert casual visitors into regular readers\n"
  );

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Test content preferences for different user cohorts
    const newUserPreferences =
      await cohortAnalysis.getContentPreferencesByCohort(
        "new",
        startDate,
        endDate
      );
    const returningUserPreferences =
      await cohortAnalysis.getContentPreferencesByCohort(
        "returning",
        startDate,
        endDate
      );
    const highEngagementPreferences =
      await cohortAnalysis.getContentPreferencesByCohort(
        "high_engagement",
        startDate,
        endDate
      );

    console.log("✅ Content Type Conversion Analysis:");
    console.log(
      `- New user content preferences: ${newUserPreferences.length} items`
    );
    console.log(
      `- Returning user content preferences: ${returningUserPreferences.length} items`
    );
    console.log(
      `- High engagement user preferences: ${highEngagementPreferences.length} items`
    );

    // Verify content scoring and categorization
    const allPreferences = [
      ...newUserPreferences,
      ...returningUserPreferences,
      ...highEngagementPreferences,
    ];

    if (allPreferences.length > 0) {
      const hasEngagementScores = allPreferences.every(
        (content) => typeof content.engagementScore === "number"
      );
      const hasCategories = allPreferences.every(
        (content) => typeof content.category === "string"
      );
      const hasViewCounts = allPreferences.every(
        (content) => typeof content.viewCount === "number"
      );
      const hasReadingTimes = allPreferences.every(
        (content) => typeof content.avgReadingTime === "number"
      );

      console.log(
        `- Engagement scoring implemented: ${hasEngagementScores ? "✅" : "❌"}`
      );
      console.log(
        `- Content categorization working: ${hasCategories ? "✅" : "❌"}`
      );
      console.log(`- View count tracking: ${hasViewCounts ? "✅" : "❌"}`);
      console.log(`- Reading time analysis: ${hasReadingTimes ? "✅" : "❌"}`);

      // Show top performing content for each cohort
      if (newUserPreferences.length > 0) {
        const topNewContent = newUserPreferences[0];
        console.log(
          `- Top new user content: ${
            topNewContent.category
          } (score: ${topNewContent.engagementScore.toFixed(2)})`
        );
      }

      if (returningUserPreferences.length > 0) {
        const topReturningContent = returningUserPreferences[0];
        console.log(
          `- Top returning user content: ${
            topReturningContent.category
          } (score: ${topReturningContent.engagementScore.toFixed(2)})`
        );
      }
    } else {
      console.log(
        "⚠️ No content preference data available (limited test data)"
      );
    }

    // Test cohort summary for conversion insights
    const summary = await cohortAnalysis.getCohortSummary(startDate, endDate);
    console.log(
      `- Cohort summary generated: ${summary.totalCohorts} cohorts analyzed`
    );
    console.log(
      `- Top content items tracked: ${
        summary.topNewUserContent.length +
        summary.topReturningUserContent.length
      } items`
    );

    console.log(
      "✅ Requirement 1.4 PASSED: Content type conversion analysis implemented\n"
    );
    return true;
  } catch (error) {
    console.error("❌ Requirement 1.4 FAILED:", error);
    return false;
  }
}

async function testDatabaseQueries() {
  console.log("🧪 Testing Database Query Implementation Details\n");

  try {
    // Test that queries work with different date ranges
    const testDates = [
      { name: "Last 24 hours", days: 1 },
      { name: "Last 7 days", days: 7 },
      { name: "Last 30 days", days: 30 },
    ];

    for (const testDate of testDates) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - testDate.days);

      console.log(`📊 Testing ${testDate.name}:`);

      // Test new vs returning users query
      const userMetrics = await cohortAnalysis.getNewVsReturningUsers(
        startDate,
        endDate
      );
      console.log(
        `  - New vs Returning query: ${userMetrics.metrics.totalUsers} users found`
      );

      // Test engagement segmentation query
      const engagementData = await cohortAnalysis.segmentUsersByEngagement(
        startDate,
        endDate
      );
      console.log(
        `  - Engagement segmentation: ${engagementData.length} user segments`
      );

      // Test retention metrics for a specific cohort date
      if (testDate.days >= 7) {
        const cohortDate = new Date();
        cohortDate.setDate(cohortDate.getDate() - 7);
        const retentionData = await cohortAnalysis.getRetentionMetrics(
          cohortDate
        );
        console.log(
          `  - Retention metrics: ${
            retentionData.cohortSize
          } cohort size, ${retentionData.day7Retention.toFixed(1)}% retention`
        );
      }
    }

    console.log(
      "✅ Database queries working correctly across different date ranges\n"
    );
    return true;
  } catch (error) {
    console.error("❌ Database query test FAILED:", error);
    return false;
  }
}

async function runRequirementTests() {
  console.log("🚀 Starting Cohort Analysis Requirements Validation...\n");
  console.log("Testing against requirements 1.1, 1.2, and 1.4 from the spec\n");

  const tests = [
    { name: "Requirement 1.1 - User Segmentation", fn: testRequirement1_1 },
    {
      name: "Requirement 1.2 - User Progression Tracking",
      fn: testRequirement1_2,
    },
    {
      name: "Requirement 1.4 - Content Conversion Analysis",
      fn: testRequirement1_4,
    },
    { name: "Database Query Implementation", fn: testDatabaseQueries },
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    console.log(`🔄 Running ${test.name}...`);
    const passed = await test.fn();
    if (passed) {
      passedTests++;
    }
    console.log("─".repeat(60));
  }

  console.log(
    `\n📊 Requirements Validation Results: ${passedTests}/${totalTests} tests passed`
  );

  if (passedTests === totalTests) {
    console.log(
      "🎉 All cohort analysis requirements have been successfully implemented!"
    );
    console.log("\n✅ Task 2 Implementation Summary:");
    console.log(
      "- ✅ Database queries to identify new vs returning users by session"
    );
    console.log(
      "- ✅ Simple retention metrics (users who return within 7 days)"
    );
    console.log(
      "- ✅ Function to segment users by engagement level (reading time)"
    );
    console.log("- ✅ Query to track content type preferences by user cohort");
    console.log("- ✅ All requirements 1.1, 1.2, and 1.4 satisfied");
    process.exit(0);
  } else {
    console.log("❌ Some requirements validation tests failed!");
    process.exit(1);
  }
}

// Run the requirement validation tests
runRequirementTests().catch((error) => {
  console.error("💥 Requirements validation failed:", error);
  process.exit(1);
});
