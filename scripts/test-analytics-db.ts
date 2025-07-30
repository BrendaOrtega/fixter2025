#!/usr/bin/env tsx

/**
 * Test script to verify BlogAnalytics database operations
 * Tests that we can save and retrieve analytics data correctly
 */

import { db } from "../app/.server/db";

async function testAnalyticsDatabase() {
  console.log("🧪 Testing BlogAnalytics Database Operations...\n");

  // Test data
  const testPostId = "507f1f77bcf86cd799439011"; // Valid ObjectId
  const sessionId = "test-session-" + Date.now();

  // Clean up any existing test data
  console.log("🧹 Cleaning up existing test data...");
  await db.blogAnalytics.deleteMany({
    where: {
      postId: testPostId,
    },
  });

  // Test 1: Save click event with coordinates
  console.log("📤 Test 1: Saving click event with coordinates...");
  const clickEvent = await db.blogAnalytics.create({
    data: {
      event: "click",
      postId: testPostId,
      sessionId: sessionId + "-click",
      timestamp: new Date(),
      clickX: 50.5, // Normalized coordinate
      clickY: 75.2, // Normalized coordinate
      elementClicked: "button.primary",
      textSelected: "Click me!",
      viewportWidth: 1920,
      viewportHeight: 1080,
      userAgent: "Test-Agent/1.0",
      metadata: {
        customField: "test-value",
      },
    },
  });
  console.log("✅ Click event saved with ID:", clickEvent.id);

  // Test 2: Save scroll event
  console.log("📤 Test 2: Saving scroll event...");
  const scrollEvent = await db.blogAnalytics.create({
    data: {
      event: "scroll",
      postId: testPostId,
      sessionId: sessionId + "-scroll",
      timestamp: new Date(),
      scrollDepth: 60.5,
      readingTime: 45,
      scrollY: 800,
      userAgent: "Test-Agent/1.0",
    },
  });
  console.log("✅ Scroll event saved with ID:", scrollEvent.id);

  // Test 3: Save page view event (minimal data)
  console.log("📤 Test 3: Saving page view event...");
  const pageViewEvent = await db.blogAnalytics.create({
    data: {
      event: "page_view",
      postId: testPostId,
      sessionId: sessionId + "-pageview",
      timestamp: new Date(),
      userAgent: "Test-Agent/1.0",
      referrer: "https://google.com",
    },
  });
  console.log("✅ Page view event saved with ID:", pageViewEvent.id);

  // Test 4: Query saved data
  console.log("\n🔍 Querying saved analytics data...");
  const savedEvents = await db.blogAnalytics.findMany({
    where: {
      postId: testPostId,
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  console.log(`📊 Found ${savedEvents.length} saved events:`);

  savedEvents.forEach((event, index) => {
    console.log(`\n${index + 1}. Event: ${event.event}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Session: ${event.sessionId}`);
    console.log(`   Timestamp: ${event.timestamp.toISOString()}`);

    if (event.clickX !== null || event.clickY !== null) {
      console.log(`   Click coordinates: (${event.clickX}, ${event.clickY})`);
    }

    if (event.scrollDepth !== null) {
      console.log(`   Scroll depth: ${event.scrollDepth}%`);
    }

    if (event.readingTime !== null) {
      console.log(`   Reading time: ${event.readingTime}s`);
    }

    if (event.elementClicked) {
      console.log(`   Element clicked: ${event.elementClicked}`);
    }

    if (event.viewportWidth && event.viewportHeight) {
      console.log(
        `   Viewport: ${event.viewportWidth}x${event.viewportHeight}`
      );
    }

    if (event.metadata) {
      console.log(`   Metadata: ${JSON.stringify(event.metadata)}`);
    }
  });

  // Test 5: Query heatmap data specifically
  console.log("\n🗺️  Testing heatmap data queries...");
  const heatmapData = await db.blogAnalytics.findMany({
    where: {
      postId: testPostId,
      event: "click",
      clickX: { not: null },
      clickY: { not: null },
    },
    select: {
      clickX: true,
      clickY: true,
      elementClicked: true,
      timestamp: true,
    },
  });

  console.log(`🎯 Found ${heatmapData.length} heatmap points:`);
  heatmapData.forEach((point, index) => {
    console.log(
      `   ${index + 1}. (${point.clickX}, ${point.clickY}) on ${
        point.elementClicked
      }`
    );
  });

  // Validation
  console.log("\n✅ Validation Results:");

  const clickEventCheck = savedEvents.find((e) => e.event === "click");
  if (
    clickEventCheck &&
    clickEventCheck.clickX === 50.5 &&
    clickEventCheck.clickY === 75.2
  ) {
    console.log("✅ Click coordinates saved correctly");
  } else {
    console.log("❌ Click coordinates not saved correctly");
  }

  const scrollEventCheck = savedEvents.find((e) => e.event === "scroll");
  if (scrollEventCheck && scrollEventCheck.scrollDepth === 60.5) {
    console.log("✅ Scroll depth saved correctly");
  } else {
    console.log("❌ Scroll depth not saved correctly");
  }

  const pageViewCheck = savedEvents.find((e) => e.event === "page_view");
  if (pageViewCheck && pageViewCheck.referrer === "https://google.com") {
    console.log("✅ Page view data saved correctly");
  } else {
    console.log("❌ Page view data not saved correctly");
  }

  console.log("\n🎉 Database test completed successfully!");

  // Clean up test data
  console.log("\n🧹 Cleaning up test data...");
  await db.blogAnalytics.deleteMany({
    where: {
      postId: testPostId,
    },
  });
  console.log("✅ Test data cleaned up");
}

// Run the test
testAnalyticsDatabase().catch(console.error);
