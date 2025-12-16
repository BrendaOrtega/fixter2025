#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { Effect } from "effect";
import { s3VideoService } from "../app/.server/services/s3-video";

async function testPresignedUrls() {
  console.log("🔍 Testing Presigned URLs Generation...\n");

  // Test video key - adjust this to match an actual video in your S3
  const testKey = "fixtergeek/videos/cm5ezapfo000hstcx0wh8zt3e/cm5ezbc27000xstcx8yp6m0kk/original/test-video.mp4";
  
  try {
    // Test 1: Generate presigned URL for video preview
    console.log("📹 Test 1: Generating presigned URL for video preview...");
    const previewUrl = await Effect.runPromise(
      s3VideoService.getVideoPreviewUrl(testKey, 300) // 5 minutes for testing
    );
    
    console.log("✅ Preview URL generated successfully:");
    console.log(`   URL: ${previewUrl.substring(0, 100)}...`);
    console.log(`   Full URL length: ${previewUrl.length} characters\n`);

    // Test 2: Verify URL components
    console.log("🔗 Test 2: Analyzing URL components...");
    const url = new URL(previewUrl);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
    console.log(`   Path: ${url.pathname}`);
    console.log(`   Has Query Params: ${url.search ? 'Yes' : 'No'}`);
    
    if (url.search) {
      const params = new URLSearchParams(url.search);
      console.log(`   X-Amz-Algorithm: ${params.get('X-Amz-Algorithm')}`);
      console.log(`   X-Amz-Expires: ${params.get('X-Amz-Expires')}`);
      console.log(`   Has Signature: ${params.has('X-Amz-Signature') ? 'Yes' : 'No'}`);
    }
    console.log();

    // Test 3: Generate HLS presigned URL
    console.log("📺 Test 3: Generating presigned URL for HLS content...");
    const hlsTestKey = "fixtergeek/videos/cm5ezapfo000hstcx0wh8zt3e/cm5ezbc27000xstcx8yp6m0kk/hls/master.m3u8";
    const hlsUrl = await Effect.runPromise(
      s3VideoService.getHLSPresignedUrl(hlsTestKey, 1800) // 30 minutes
    );
    
    console.log("✅ HLS URL generated successfully:");
    console.log(`   URL: ${hlsUrl.substring(0, 100)}...`);
    console.log(`   Full URL length: ${hlsUrl.length} characters\n`);

    // Test 4: Verify AWS credentials are set
    console.log("🔑 Test 4: Checking AWS configuration...");
    console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'Not set (defaulting to us-east-1)'}`);
    console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
    console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || 'Not set (defaulting to wild-bird-2039)'}`);
    console.log(`   AWS_ENDPOINT_URL_S3: ${process.env.AWS_ENDPOINT_URL_S3 || 'Not set (using AWS default)'}`);
    console.log();

    // Test 5: Test fetching the URL (only if running locally)
    if (process.env.NODE_ENV !== 'production') {
      console.log("🌐 Test 5: Testing URL accessibility...");
      console.log("   Note: This test requires the URL to point to an actual file in S3");
      
      try {
        const response = await fetch(previewUrl, { method: 'HEAD' });
        console.log(`   Response Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type') || 'Not specified'}`);
        console.log(`   Content-Length: ${response.headers.get('content-length') || 'Not specified'} bytes`);
        
        if (response.ok) {
          console.log("   ✅ URL is accessible!");
        } else {
          console.log(`   ⚠️ URL returned status ${response.status} - check if file exists in S3`);
        }
      } catch (error) {
        console.log(`   ❌ Could not access URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log("\n✨ All tests completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Error during testing:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testPresignedUrls().catch(console.error);