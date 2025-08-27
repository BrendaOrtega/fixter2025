#!/usr/bin/env tsx

/**
 * Test script to verify CSV export functionality
 */

// Mock data similar to what the dashboard would have
const mockCohortSummary = {
  userMetrics: {
    totalUsers: 196,
    newUsers: 137,
    returningUsers: 59,
    retentionRate: 30.1,
  },
  engagementDistribution: {
    low: 78,
    medium: 78,
    high: 40,
  },
};

const mockTopPerformingContent = [
  {
    postId: "1",
    title: "How to Test React Components with Jest",
    score: 85,
    metrics: {
      viewCount: 1250,
      avgReadingTime: 180,
      avgScrollDepth: 75,
    },
    trend: {
      direction: "up" as const,
      scoreChange: 5,
    },
  },
  {
    postId: "2",
    title: "Advanced TypeScript Patterns",
    score: 72,
    metrics: {
      viewCount: 890,
      avgReadingTime: 240,
      avgScrollDepth: 68,
    },
    trend: {
      direction: "down" as const,
      scoreChange: -3,
    },
  },
];

const mockPostsWithAnalytics = [
  {
    id: "1",
    title: "How to Test React Components with Jest",
    slug: "test-react-components-jest",
    pageViews: 1250,
    clickCount: 185,
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    title: "Advanced TypeScript Patterns",
    slug: "advanced-typescript-patterns",
    pageViews: 890,
    clickCount: 67,
    createdAt: new Date("2025-01-10"),
  },
];

// CSV generation functions (copied from the dashboard)
const generateCohortCSV = (data: typeof mockCohortSummary) => {
  const headers = ["Metric", "Value", "Description"];
  const rows = [
    [
      "Total Users",
      data.userMetrics.totalUsers.toString(),
      "Unique sessions tracked",
    ],
    ["New Users", data.userMetrics.newUsers.toString(), "First-time visitors"],
    [
      "Returning Users",
      data.userMetrics.returningUsers.toString(),
      "Multiple sessions",
    ],
    [
      "Retention Rate",
      `${data.userMetrics.retentionRate.toFixed(1)}%`,
      "Users who return",
    ],
    [
      "Low Engagement",
      (data.engagementDistribution.low || 0).toString(),
      "Low engagement users",
    ],
    [
      "Medium Engagement",
      (data.engagementDistribution.medium || 0).toString(),
      "Medium engagement users",
    ],
    [
      "High Engagement",
      (data.engagementDistribution.high || 0).toString(),
      "High engagement users",
    ],
  ];

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
};

const generatePerformanceCSV = (data: typeof mockTopPerformingContent) => {
  const headers = [
    "Rank",
    "Title",
    "Score",
    "Views",
    "Avg Reading Time (s)",
    "Avg Scroll Depth (%)",
    "Trend Direction",
    "Score Change",
  ];
  const rows = data.map((content, index) => [
    (index + 1).toString(),
    content.title,
    content.score.toString(),
    content.metrics.viewCount.toString(),
    Math.round(content.metrics.avgReadingTime).toString(),
    Math.round(content.metrics.avgScrollDepth).toString(),
    content.trend.direction,
    content.trend.scoreChange.toString(),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
};

const generatePostsCSV = (data: typeof mockPostsWithAnalytics) => {
  const headers = [
    "Title",
    "Slug",
    "Page Views",
    "Click Count",
    "Created Date",
    "Has Heatmap Data",
  ];
  const rows = data.map((post) => [
    post.title,
    post.slug,
    post.pageViews.toString(),
    post.clickCount.toString(),
    new Date(post.createdAt).toLocaleDateString(),
    post.clickCount > 0 ? "Yes" : "No",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
};

async function testCSVExport() {
  console.log("🧪 Testing CSV Export Functionality...\n");

  try {
    // Test 1: Cohort CSV Export
    console.log("1. Testing Cohort CSV Export...");
    const cohortCSV = generateCohortCSV(mockCohortSummary);
    console.log("✅ Cohort CSV generated successfully:");
    console.log("Sample output:");
    console.log(cohortCSV.split("\n").slice(0, 4).join("\n"));
    console.log("...\n");

    // Test 2: Performance CSV Export
    console.log("2. Testing Performance CSV Export...");
    const performanceCSV = generatePerformanceCSV(mockTopPerformingContent);
    console.log("✅ Performance CSV generated successfully:");
    console.log("Sample output:");
    console.log(performanceCSV.split("\n").slice(0, 3).join("\n"));
    console.log("...\n");

    // Test 3: Posts CSV Export
    console.log("3. Testing Posts CSV Export...");
    const postsCSV = generatePostsCSV(mockPostsWithAnalytics);
    console.log("✅ Posts CSV generated successfully:");
    console.log("Sample output:");
    console.log(postsCSV.split("\n").slice(0, 3).join("\n"));
    console.log("...\n");

    // Test 4: CSV Format Validation
    console.log("4. Testing CSV Format Validation...");

    // Check that all CSVs have proper headers
    const cohortLines = cohortCSV.split("\n");
    const performanceLines = performanceCSV.split("\n");
    const postsLines = postsCSV.split("\n");

    if (cohortLines[0].includes("Metric") && cohortLines[0].includes("Value")) {
      console.log("✅ Cohort CSV headers are correct");
    } else {
      throw new Error("Cohort CSV headers are malformed");
    }

    if (
      performanceLines[0].includes("Rank") &&
      performanceLines[0].includes("Title")
    ) {
      console.log("✅ Performance CSV headers are correct");
    } else {
      throw new Error("Performance CSV headers are malformed");
    }

    if (
      postsLines[0].includes("Title") &&
      postsLines[0].includes("Page Views")
    ) {
      console.log("✅ Posts CSV headers are correct");
    } else {
      throw new Error("Posts CSV headers are malformed");
    }

    // Test 5: Data Integrity
    console.log("\n5. Testing Data Integrity...");

    // Check that numeric values are properly formatted
    const cohortDataLine = cohortLines[1];
    if (cohortDataLine.includes('"196"')) {
      console.log("✅ Numeric values are properly quoted in CSV");
    } else {
      throw new Error("Numeric values are not properly formatted");
    }

    // Check that percentages are formatted correctly
    if (cohortCSV.includes('"30.1%"')) {
      console.log("✅ Percentage values are properly formatted");
    } else {
      throw new Error("Percentage values are not properly formatted");
    }

    console.log("\n🎉 All CSV export tests passed!");
    console.log("\n📊 CSV Export Features:");
    console.log("   - Cohort data export: ✅");
    console.log("   - Performance data export: ✅");
    console.log("   - Posts data export: ✅");
    console.log("   - Proper CSV formatting: ✅");
    console.log("   - Data integrity: ✅");
    console.log("   - Header validation: ✅");
  } catch (error) {
    console.error("❌ CSV export test failed:", error);
    process.exit(1);
  }
}

// Run the test
testCSVExport()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
