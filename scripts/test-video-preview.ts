#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { Effect } from "effect";
import { s3VideoService } from "../app/.server/services/s3-video";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testVideoPreview() {
  console.log("🔍 Testing Video Preview with Real Data...\n");

  try {
    // Get a video with storageLink
    console.log("📹 Finding a video with storage link...");
    const video = await db.video.findFirst({
      where: { 
        storageLink: { not: null },
        courses: { some: {} }
      },
      include: { 
        courses: { select: { id: true, title: true } }
      }
    });

    if (!video) {
      console.log("❌ No video found with storage link");
      process.exit(1);
    }

    console.log(`✅ Found video: ${video.title}`);
    console.log(`   ID: ${video.id}`);
    console.log(`   Course: ${video.courses[0]?.title || 'Unknown'}`);
    console.log(`   Storage Link: ${video.storageLink}`);
    console.log(`   HLS Link: ${video.m3u8 || 'Not available'}`);
    console.log(`   Processing Status: ${video.processingStatus}`);
    console.log();

    if (video.storageLink) {
      // Extract S3 key from storageLink
      console.log("🔑 Extracting S3 key from storage link...");
      const url = new URL(video.storageLink);
      const s3Key = url.pathname.substring(1); // Remove leading slash
      console.log(`   S3 Key: ${s3Key}`);
      console.log();

      // Test generating presigned URL for original video
      console.log("🔗 Generating presigned URL for original video...");
      const previewUrl = await Effect.runPromise(
        s3VideoService.getVideoPreviewUrl(s3Key, 3600)
      );
      
      console.log("✅ Presigned URL generated:");
      console.log(`   URL: ${previewUrl.substring(0, 150)}...`);
      console.log();

      // Test the URL
      console.log("🌐 Testing URL accessibility...");
      const response = await fetch(previewUrl, { method: 'HEAD' });
      console.log(`   Response Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type') || 'Not specified'}`);
      console.log(`   Content-Length: ${response.headers.get('content-length') || 'Not specified'} bytes`);
      
      if (response.ok) {
        console.log("   ✅ Video is accessible with presigned URL!");
      } else if (response.status === 403) {
        console.log("   ❌ Access denied - check S3 bucket policies or key path");
      } else if (response.status === 404) {
        console.log("   ❌ Video not found in S3 - file may have been deleted");
      }
      console.log();
    }

    if (video.m3u8) {
      // Extract HLS key
      console.log("📺 Testing HLS presigned URL...");
      const hlsUrl = new URL(video.m3u8);
      const hlsKey = hlsUrl.pathname.substring(1);
      console.log(`   HLS Key: ${hlsKey}`);
      
      const hlsPresignedUrl = await Effect.runPromise(
        s3VideoService.getHLSPresignedUrl(hlsKey, 1800)
      );
      
      console.log("✅ HLS Presigned URL generated:");
      console.log(`   URL: ${hlsPresignedUrl.substring(0, 150)}...`);
      
      // Test HLS URL
      const hlsResponse = await fetch(hlsPresignedUrl, { method: 'HEAD' });
      console.log(`   Response Status: ${hlsResponse.status} ${hlsResponse.statusText}`);
      
      if (hlsResponse.ok) {
        console.log("   ✅ HLS playlist is accessible!");
      } else {
        console.log(`   ⚠️ HLS playlist returned status ${hlsResponse.status}`);
      }
      console.log();
    }

    // Test the interceptor logic
    console.log("🎯 Testing URL interceptor patterns...");
    const testUrls = [
      video.storageLink!,
      video.m3u8 || "",
      "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/abc/def/hls/master.m3u8",
      "https://fly.storage.tigris.dev/wild-bird-2039/fixtergeek/videos/abc/def/original/video.mp4"
    ].filter(Boolean);

    for (const testUrl of testUrls) {
      const isS3 = testUrl.includes('.s3.') || testUrl.includes('storage.tigris.dev');
      const hasVideosPath = testUrl.includes('fixtergeek/videos/');
      const isHLS = testUrl.includes('/hls/') && (testUrl.includes('.m3u8') || testUrl.includes('.ts'));
      const isOriginal = testUrl.includes('/original/') && testUrl.includes('.mp4');
      
      console.log(`   URL: ${testUrl.substring(testUrl.lastIndexOf('/') + 1)}`);
      console.log(`     Is S3: ${isS3 ? '✅' : '❌'}`);
      console.log(`     Has videos path: ${hasVideosPath ? '✅' : '❌'}`);
      console.log(`     Is HLS: ${isHLS ? '✅' : '❌'}`);
      console.log(`     Is Original: ${isOriginal ? '✅' : '❌'}`);
      console.log(`     Would intercept: ${(isS3 && hasVideosPath && (isHLS || isOriginal)) ? '✅ YES' : '❌ NO'}`);
      console.log();
    }

    console.log("✨ Testing completed!");

  } catch (error) {
    console.error("❌ Error during testing:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run tests
testVideoPreview().catch(console.error);