#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { scheduleVideoProcessing } from "../app/.server/agenda";

const db = new PrismaClient();

async function testVideoProcessingLive() {
  console.log("🧪 Testing live video processing with pending video...\n");

  try {
    // Get the pending video
    const video = await db.video.findFirst({
      where: { processingStatus: "pending" },
      include: { courses: { select: { id: true, title: true } } }
    });

    if (!video) {
      console.log("ℹ️ No pending videos found. Looking for any video with storage but no HLS...");
      
      const videoWithStorage = await db.video.findFirst({
        where: {
          AND: [
            { storageLink: { not: null } },
            { m3u8: null }
          ]
        },
        include: { courses: { select: { id: true, title: true } } }
      });

      if (!videoWithStorage) {
        console.log("❌ No videos found that need processing");
        return;
      }
      
      console.log(`Found video with storage: ${videoWithStorage.title}`);
      // Update to pending for testing
      await db.video.update({
        where: { id: videoWithStorage.id },
        data: { processingStatus: "pending" }
      });
      
      video = videoWithStorage;
    }

    console.log(`📹 Testing with video: "${video.title}"`);
    console.log(`   Course: ${video.courses[0]?.title || 'No course'}`);
    console.log(`   Storage Link: ${video.storageLink}`);
    console.log();

    if (!video.storageLink || !video.courses[0]) {
      console.log("❌ Video lacks storage link or course. Cannot process.");
      return;
    }

    // Extract S3 key from storage link
    const url = new URL(video.storageLink);
    const s3Key = url.pathname.substring(1); // Remove leading slash
    
    console.log(`🔑 S3 Key: ${s3Key}`);
    console.log(`📤 Scheduling video processing job...`);

    // Schedule the processing job
    await scheduleVideoProcessing({
      courseId: video.courses[0].id,
      videoId: video.id,
      videoS3Key: s3Key
    });

    console.log("✅ Video processing job scheduled!");
    console.log("🕐 Job should execute within the next few seconds...");
    console.log("\n📊 Monitor the Agenda bootstrap output to see job execution");

  } catch (error) {
    console.error("❌ Error testing video processing:", error);
  } finally {
    await db.$disconnect();
  }
}

testVideoProcessingLive().catch(console.error);