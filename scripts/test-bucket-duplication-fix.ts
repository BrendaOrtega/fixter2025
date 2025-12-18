#!/usr/bin/env npx tsx
/**
 * Test script to verify bucket duplication fixes are working correctly
 * This script tests the fixBucketDuplication function with various URL patterns
 */

import { fixBucketDuplication } from '../app/.server/services/s3-video';

interface TestCase {
  name: string;
  input: string;
  expectedOutput: string;
  bucketName?: string;
}

const testCases: TestCase[] = [
  {
    name: "Basic bucket duplication",
    input: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8",
    expectedOutput: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8"
  },
  {
    name: "Triple bucket duplication", 
    input: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8",
    expectedOutput: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8"
  },
  {
    name: "No duplication (should not change)",
    input: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8",
    expectedOutput: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8"
  },
  {
    name: "Different bucket name",
    input: "https://fly.storage.tigris.dev/my-bucket/my-bucket/files/video.m3u8",
    expectedOutput: "https://fly.storage.tigris.dev/my-bucket/files/video.m3u8",
    bucketName: "my-bucket"
  },
  {
    name: "Empty URL",
    input: "",
    expectedOutput: ""
  },
  {
    name: "AWS S3 format with duplication",
    input: "https://wild-bird-2039.s3.auto.amazonaws.com/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8",
    expectedOutput: "https://wild-bird-2039.s3.auto.amazonaws.com/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8"
  },
  {
    name: "Storage link duplication", 
    input: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/original/video.mp4",
    expectedOutput: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video1/original/video.mp4"
  }
];

console.log("🧪 Testing bucket duplication fixes...\n");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const result = fixBucketDuplication(testCase.input, testCase.bucketName);
  const passed = result === testCase.expectedOutput;
  
  if (passed) {
    console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    passedTests++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Input:    ${testCase.input}`);
    console.log(`   Expected: ${testCase.expectedOutput}`);
    console.log(`   Got:      ${result}`);
    failedTests++;
  }
});

console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log("\n🎉 All tests passed! Bucket duplication fix is working correctly.");
} else {
  console.log("\n⚠️  Some tests failed. Please review the fixBucketDuplication function.");
  process.exit(1);
}