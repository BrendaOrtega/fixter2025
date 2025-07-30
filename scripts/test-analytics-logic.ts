#!/usr/bin/env tsx

/**
 * Test script to verify analytics coordinate validation and mapping logic
 * Tests the core logic without requiring server to be running
 */

// Extract the validation function from the analytics route
function validateCoordinates(
  x?: number,
  y?: number
): { isValid: boolean; normalizedX?: number; normalizedY?: number } {
  if (x === undefined || y === undefined) {
    return { isValid: true }; // Coordinates are optional
  }

  if (typeof x !== "number" || typeof y !== "number") {
    return { isValid: false };
  }

  // Ensure coordinates are between 0 and 1, then convert to percentage (0-100)
  const normalizedX = Math.max(0, Math.min(1, x)) * 100;
  const normalizedY = Math.max(0, Math.min(1, y)) * 100;

  return { isValid: true, normalizedX, normalizedY };
}

function testCoordinateValidation() {
  console.log("🧪 Testing Coordinate Validation and Mapping Logic...\n");

  const testCases = [
    {
      name: "Valid coordinates (0.5, 0.75)",
      input: { x: 0.5, y: 0.75 },
      expected: { isValid: true, normalizedX: 50, normalizedY: 75 },
    },
    {
      name: "Coordinates at boundaries (0, 1)",
      input: { x: 0, y: 1 },
      expected: { isValid: true, normalizedX: 0, normalizedY: 100 },
    },
    {
      name: "Out of bounds coordinates (1.5, -0.2)",
      input: { x: 1.5, y: -0.2 },
      expected: { isValid: true, normalizedX: 100, normalizedY: 0 },
    },
    {
      name: "Missing coordinates (undefined)",
      input: { x: undefined, y: undefined },
      expected: { isValid: true },
    },
    {
      name: "Partial coordinates (x only)",
      input: { x: 0.5, y: undefined },
      expected: { isValid: true },
    },
    {
      name: "Invalid type (string)",
      input: { x: "0.5" as any, y: 0.75 },
      expected: { isValid: false },
    },
    {
      name: "Invalid type (null)",
      input: { x: null as any, y: 0.75 },
      expected: { isValid: false },
    },
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`📤 Test ${index + 1}: ${testCase.name}`);

    const result = validateCoordinates(testCase.input.x, testCase.input.y);

    // Compare results
    const passed =
      result.isValid === testCase.expected.isValid &&
      result.normalizedX === testCase.expected.normalizedX &&
      result.normalizedY === testCase.expected.normalizedY;

    if (passed) {
      console.log(`✅ PASS: ${JSON.stringify(result)}`);
      passedTests++;
    } else {
      console.log(
        `❌ FAIL: Expected ${JSON.stringify(
          testCase.expected
        )}, got ${JSON.stringify(result)}`
      );
    }
    console.log("");
  });

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All coordinate validation tests passed!");
  } else {
    console.log("❌ Some tests failed!");
    process.exit(1);
  }
}

function testMetadataMapping() {
  console.log("\n🧪 Testing Metadata Mapping Logic...\n");

  // Simulate the metadata mapping logic from the analytics route
  function mapMetadata(metadata: any) {
    const analyticsData: any = {};

    if (metadata) {
      // Map coordinates
      const coordinateValidation = validateCoordinates(metadata.x, metadata.y);
      if (coordinateValidation.isValid) {
        if (coordinateValidation.normalizedX !== undefined) {
          analyticsData.clickX = coordinateValidation.normalizedX;
        }
        if (coordinateValidation.normalizedY !== undefined) {
          analyticsData.clickY = coordinateValidation.normalizedY;
        }
      }

      // Map other fields
      if (metadata.scrollDepth !== undefined) {
        analyticsData.scrollDepth = Math.max(
          0,
          Math.min(100, metadata.scrollDepth * 100)
        );
      }
      if (metadata.readingTime !== undefined) {
        analyticsData.readingTime = Math.max(0, metadata.readingTime);
      }
      if (metadata.element !== undefined) {
        analyticsData.elementClicked = String(metadata.element).substring(
          0,
          100
        );
      }
      if (metadata.text !== undefined) {
        analyticsData.textSelected = String(metadata.text).substring(0, 100);
      }
    }

    return analyticsData;
  }

  const testCases = [
    {
      name: "Complete click metadata",
      input: {
        x: 0.5,
        y: 0.75,
        element: "button.primary",
        text: "Click me!",
        scrollDepth: 0.6,
        readingTime: 45,
      },
      expected: {
        clickX: 50,
        clickY: 75,
        elementClicked: "button.primary",
        textSelected: "Click me!",
        scrollDepth: 60,
        readingTime: 45,
      },
    },
    {
      name: "Scroll metadata only",
      input: {
        scrollDepth: 0.8,
        readingTime: 120,
      },
      expected: {
        scrollDepth: 80,
        readingTime: 120,
      },
    },
    {
      name: "Invalid scroll depth (normalized)",
      input: {
        scrollDepth: 1.5, // Should be clamped to 1.0 -> 100
        readingTime: -10, // Should be clamped to 0
      },
      expected: {
        scrollDepth: 100,
        readingTime: 0,
      },
    },
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`📤 Test ${index + 1}: ${testCase.name}`);

    const result = mapMetadata(testCase.input);

    // Compare results by checking each property
    const passed =
      Object.keys(testCase.expected).every(
        (key) => result[key] === testCase.expected[key]
      ) &&
      Object.keys(result).every(
        (key) => testCase.expected[key] === result[key]
      );

    if (passed) {
      console.log(`✅ PASS: ${JSON.stringify(result)}`);
      passedTests++;
    } else {
      console.log(
        `❌ FAIL: Expected ${JSON.stringify(
          testCase.expected
        )}, got ${JSON.stringify(result)}`
      );
    }
    console.log("");
  });

  console.log(
    `📊 Metadata Mapping Results: ${passedTests}/${totalTests} tests passed`
  );

  if (passedTests === totalTests) {
    console.log("🎉 All metadata mapping tests passed!");
  } else {
    console.log("❌ Some metadata mapping tests failed!");
    process.exit(1);
  }
}

// Run the tests
testCoordinateValidation();
testMetadataMapping();

console.log("\n🎉 All analytics logic tests completed successfully!");
