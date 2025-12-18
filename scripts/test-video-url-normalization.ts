#!/usr/bin/env npx tsx
/**
 * Comprehensive test script for video URL normalization
 * Tests the complete solution including both individual and batch normalization
 */

import { normalizeVideoUrls, normalizeVideoArray, isNormalizedVideo } from '../app/.server/utils/video-url-normalizer';

// Mock video data with various URL patterns
const mockVideos = [
  {
    id: "video1",
    title: "Test Video 1",
    m3u8: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/hls/master.m3u8",
    storageLink: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video1/original/video.mp4",
  },
  {
    id: "video2", 
    title: "Test Video 2",
    m3u8: "https://wild-bird-2039.s3.auto.amazonaws.com/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video2/hls/master.m3u8",
    storageLink: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video2/original/video.mp4",
  },
  {
    id: "video3",
    title: "Test Video 3 (No issues)", 
    m3u8: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video3/hls/master.m3u8",
    storageLink: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/course1/video3/original/video.mp4",
  },
  {
    id: "video4",
    title: "Test Video 4 (Triple duplication)",
    m3u8: "https://fly.storage.tigris.dev/wild-bird-2039/wild-bird-2039/wild-bird-2039/fixtergeek/videos/course1/video4/hls/master.m3u8",
    storageLink: null,
  },
  {
    id: "video5",
    title: "Test Video 5 (No URLs)",
    m3u8: null,
    storageLink: null,
  }
];

console.log("🧪 Testing Video URL Normalization System...\n");

// Test 1: Individual video normalization
console.log("📋 Test 1: Individual Video Normalization");
console.log("=".repeat(50));

mockVideos.forEach((video, index) => {
  console.log(`\n🎬 Testing video ${index + 1}: ${video.title}`);
  
  const normalized = normalizeVideoUrls(video);
  
  if (isNormalizedVideo(normalized)) {
    if (normalized._urlsChanged) {
      console.log("  ✅ URLs were normalized:");
      
      if (normalized._changes.m3u8) {
        console.log(`    📹 m3u8: ${normalized._changes.m3u8.before.substring(0, 80)}...`);
        console.log(`         -> ${normalized._changes.m3u8.after.substring(0, 80)}...`);
      }
      
      if (normalized._changes.storageLink) {
        console.log(`    💾 storageLink: ${normalized._changes.storageLink.before.substring(0, 80)}...`);
        console.log(`               -> ${normalized._changes.storageLink.after.substring(0, 80)}...`);
      }
    } else {
      console.log("  ✅ No changes needed (URLs are already correct)");
    }
  } else {
    console.log("  ❌ Failed to normalize video");
  }
});

// Test 2: Batch normalization
console.log("\n\n📋 Test 2: Batch Video Normalization");
console.log("=".repeat(50));

const { normalizedVideos, statistics } = normalizeVideoArray(mockVideos);

console.log("\n📊 Batch Normalization Statistics:");
console.log(`   Total videos: ${statistics.total}`);
console.log(`   Changed videos: ${statistics.changed}`);
console.log(`   m3u8 fixes: ${statistics.m3u8Fixed}`);
console.log(`   storageLink fixes: ${statistics.storageLinkFixed}`);

// Test 3: Validation of expected fixes
console.log("\n\n📋 Test 3: Validation of Expected Fixes");
console.log("=".repeat(50));

const expectedChanges = {
  video1: { shouldFixM3u8: true, shouldFixStorageLink: true },
  video2: { shouldFixM3u8: true, shouldFixStorageLink: false },
  video3: { shouldFixM3u8: false, shouldFixStorageLink: false },
  video4: { shouldFixM3u8: true, shouldFixStorageLink: false },
  video5: { shouldFixM3u8: false, shouldFixStorageLink: false },
};

let validationsPassed = 0;
let validationsFailed = 0;

normalizedVideos.forEach(video => {
  const expected = expectedChanges[video.id as keyof typeof expectedChanges];
  if (!expected) return;
  
  const actualM3u8Fix = !!video._changes.m3u8;
  const actualStorageFix = !!video._changes.storageLink;
  
  if (actualM3u8Fix === expected.shouldFixM3u8 && actualStorageFix === expected.shouldFixStorageLink) {
    console.log(`✅ ${video.id}: Expected fixes match actual fixes`);
    validationsPassed++;
  } else {
    console.log(`❌ ${video.id}: Expected (m3u8:${expected.shouldFixM3u8}, storage:${expected.shouldFixStorageLink}) but got (m3u8:${actualM3u8Fix}, storage:${actualStorageFix})`);
    validationsFailed++;
  }
});

// Test 4: URL Pattern Validation
console.log("\n\n📋 Test 4: URL Pattern Validation");
console.log("=".repeat(50));

const validPatterns = {
  validTigrisUrl: "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/",
  noBucketDuplication: /^https:\/\/[^\/]+\/wild-bird-2039\/(?!wild-bird-2039\/)/,
  noAwsEndpoint: /^(?!.*\.s3\.auto\.amazonaws\.com)/,
};

let patternValidationsPassed = 0;
let patternValidationsFailed = 0;

normalizedVideos.forEach(video => {
  if (video.m3u8) {
    const url = video.m3u8;
    
    // Check for bucket duplication
    if (validPatterns.noBucketDuplication.test(url)) {
      console.log(`✅ ${video.id}: m3u8 has no bucket duplication`);
      patternValidationsPassed++;
    } else {
      console.log(`❌ ${video.id}: m3u8 still has bucket duplication: ${url}`);
      patternValidationsFailed++;
    }
    
    // Check for AWS endpoint (should be converted to Tigris)
    if (validPatterns.noAwsEndpoint.test(url)) {
      console.log(`✅ ${video.id}: m3u8 uses correct endpoint`);
      patternValidationsPassed++;
    } else {
      console.log(`❌ ${video.id}: m3u8 still uses AWS endpoint: ${url}`);
      patternValidationsFailed++;
    }
  }
  
  if (video.storageLink) {
    if (validPatterns.noBucketDuplication.test(video.storageLink)) {
      console.log(`✅ ${video.id}: storageLink has no bucket duplication`);
      patternValidationsPassed++;
    } else {
      console.log(`❌ ${video.id}: storageLink still has bucket duplication: ${video.storageLink}`);
      patternValidationsFailed++;
    }
  }
});

// Final Results
console.log("\n\n🎯 Final Test Results");
console.log("=".repeat(50));
console.log(`Functional Validations: ${validationsPassed} passed, ${validationsFailed} failed`);
console.log(`Pattern Validations: ${patternValidationsPassed} passed, ${patternValidationsFailed} failed`);

const totalPassed = validationsPassed + patternValidationsPassed;
const totalFailed = validationsFailed + patternValidationsFailed;
const successRate = totalPassed / (totalPassed + totalFailed) * 100;

console.log(`Overall Success Rate: ${successRate.toFixed(1)}%`);

if (totalFailed === 0) {
  console.log("\n🎉 All tests passed! Video URL normalization is working correctly.");
} else {
  console.log("\n⚠️  Some tests failed. Please review the normalization logic.");
  process.exit(1);
}