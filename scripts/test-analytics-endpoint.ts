#!/usr/bin/env tsx

/**
 * Test script to verify analytics endpoint is working correctly
 * Tests coordinate mapping and data validation
 */

import { db } from "../app/.server/db";

async function testAnalyticsEndpoint() {
  console.log("🧪 Testing Analytics Endpoint...\n");

  // Test data with various scenarios
  const testEvents = [
    {
      name: "Click event with coordinates",
      data: {
        type: "click",
        postId: "507f1f77bcf86cd799439011", // Valid ObjectId
        metadata: {
          x: 0.5, // Should map to clickX: 50
          y: 0.75, // Should map to clickY: 75
          element: "button",
          text: "Click me",
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      },
    },
    {
      name: "Scroll event with depth",
      data: {
        type: "scroll",
        postId: "507f1f77bcf86cd799439011",
        metadata: {
          scrollDepth: 0.6, // Should map to scrollDepth: 60
          readingTime: 45,
          scrollY: 800,
        },
      },
    },
    {
      name: "Page view event (no coordinates)",
      data: {
        type: "page_view",
        postId: "507f1f77bcf86cd799439011",
        metadata: {
          referrer: "https://google.com",
        },
      },
    },
    {
      name: "Click with invalid coordinates (should be normalized)",
      data: {
        type: "click",
        postId: "507f1f77bcf86cd799439011",
        metadata: {
          x: 1.5, // Should be normalized to 1.0 -> 100
          y: -0.2, // Should be normalized to 0.0 -> 0
          element: "link",
        },
      },
    },
  ];

  // Clear existing test data
  console.log("🧹 Cleaning up existing test data...");
  await db.blogAnalytics.deleteMany({
    where: {
      postId: "507f1f77bcf86cd799439011",
    },
  });

  // Test each event
  for (const testEvent of testEvents) {
    console.log(`📤 Testing: ${testEvent.name}`);

    try {
      // Simulate the API call
      const response = await fetch("http://localhost:3000/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Test-Script/1.0",
          "X-Forwarded-For": "127.0.0.1",
        },
        body: JSON.stringify(testEvent.data),
      });

      if (!response.ok) {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText}`);
        continue;
      }

      const result = await response.json();
      console.log(`✅ Success: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`❌ Network error: ${error}`);
    }
  }

  // Verify data was saved correctly
  console.log("\n🔍 Verifying saved data...");
  const savedEvents = await db.blogAnalytics.findMany({
    where: {
      postId: "507f1f77bcf86cd799439011",
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  console.log(`📊 Found ${savedEvents.length} saved events:`);

  savedEvents.forEach((event, index) => {
    console.log(`\n${index + 1}. Event: ${event.event}`);
    console.log(`   Session ID: ${event.sessionId}`);
    console.log(`   Click coordinates: (${event.clickX}, ${event.clickY})`);
    console.log(`   Scroll depth: ${event.scrollDepth}%`);
    console.log(`   Reading time: ${event.readingTime}s`);
    console.log(`   Element clicked: ${event.elementClicked}`);
    console.log(`   Viewport: ${event.viewportWidth}x${event.viewportHeight}`);
    console.log(`   Metadata: ${JSON.stringify(event.metadata)}`);
  });

  // Validate specific mappings
  console.log("\n✅ Validation Results:");

  const clickEvent = savedEvents.find(
    (e) => e.event === "click" && e.clickX === 50
  );
  if (clickEvent && clickEvent.clickY === 75) {
    console.log(
      "✅ Coordinate mapping works correctly (0.5, 0.75) -> (50, 75)"
    );
  } else {
    console.log("❌ Coordinate mapping failed");
  }

  const scrollEvent = savedEvents.find((e) => e.event === "scroll");
  if (scrollEvent && scrollEvent.scrollDepth === 60) {
    console.log("✅ Scroll depth mapping works correctly (0.6) -> (60)");
  } else {
    console.log("❌ Scroll depth mapping failed");
  }

  const normalizedEvent = savedEvents.find(
    (e) => e.clickX === 100 && e.clickY === 0
  );
  if (normalizedEvent) {
    console.log(
      "✅ Coordinate normalization works correctly (1.5, -0.2) -> (100, 0)"
    );
  } else {
    console.log("❌ Coordinate normalization failed");
  }

  console.log("\n🎉 Analytics endpoint test completed!");
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAnalyticsEndpoint().catch(console.error);
}

export { testAnalyticsEndpoint };
