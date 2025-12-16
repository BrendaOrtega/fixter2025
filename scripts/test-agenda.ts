#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import Agenda from "agenda";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testAgenda() {
  console.log("🔍 Testing Agenda Job System...\n");

  try {
    // Test 1: Initialize Agenda
    console.log("⚙️ Initializing Agenda...");
    const agenda = new Agenda({ db: { address: process.env.DATABASE_URL! } });
    console.log("✅ Agenda initialized");
    console.log(`   Database URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
    console.log();

    // Test 2: Connect to database
    console.log("🔌 Connecting to database...");
    await agenda.start();
    console.log("✅ Agenda connected and started");
    console.log();

    // Test 3: Check existing jobs
    console.log("📋 Checking existing jobs...");
    const jobs = await agenda.jobs({});
    console.log(`Found ${jobs.length} total jobs in database`);
    
    if (jobs.length > 0) {
      console.log("\n📊 Job breakdown:");
      const jobCounts = {};
      jobs.forEach(job => {
        const name = job.attrs.name;
        jobCounts[name] = (jobCounts[name] || 0) + 1;
      });
      
      for (const [name, count] of Object.entries(jobCounts)) {
        console.log(`   ${name}: ${count} jobs`);
      }
    }
    console.log();

    // Test 4: Check for video processing jobs specifically
    console.log("🎬 Checking video processing jobs...");
    const videoJobs = await agenda.jobs({ name: "process_video_hls" });
    console.log(`Found ${videoJobs.length} video processing jobs`);
    
    if (videoJobs.length > 0) {
      console.log("\n📹 Video job details:");
      for (const job of videoJobs.slice(0, 3)) {
        console.log(`   Job ID: ${job.attrs._id}`);
        console.log(`   Video ID: ${job.attrs.data?.videoId || 'Unknown'}`);
        console.log(`   Last run: ${job.attrs.lastRunAt || 'Never'}`);
        console.log(`   Next run: ${job.attrs.nextRunAt || 'Not scheduled'}`);
        console.log(`   Locked: ${job.attrs.lockedAt ? 'Yes' : 'No'}`);
        console.log(`   Failed: ${job.attrs.failCount || 0} times`);
        if (job.attrs.failReason) {
          console.log(`   Fail reason: ${job.attrs.failReason}`);
        }
        console.log();
      }
    }
    
    // Test 5: Check for pending video processing jobs
    console.log("⏳ Checking pending/running jobs...");
    const pendingJobs = await agenda.jobs({
      $or: [
        { nextRunAt: { $exists: true, $ne: null } },
        { lockedAt: { $exists: true, $ne: null } }
      ]
    });
    console.log(`Found ${pendingJobs.length} pending/running jobs`);
    
    // Test 6: Check sequence processing jobs
    console.log("📧 Checking sequence processing...");
    const sequenceJobs = await agenda.jobs({ name: "process_sequences" });
    console.log(`Found ${sequenceJobs.length} sequence processing jobs`);
    
    if (sequenceJobs.length > 0) {
      const lastSequenceJob = sequenceJobs[sequenceJobs.length - 1];
      console.log(`   Last sequence job run: ${lastSequenceJob.attrs.lastRunAt || 'Never'}`);
      console.log(`   Next sequence job run: ${lastSequenceJob.attrs.nextRunAt || 'Not scheduled'}`);
    }
    console.log();

    // Test 7: Check videos that need processing
    console.log("📹 Checking videos needing processing...");
    const videosNeedingProcessing = await db.video.findMany({
      where: {
        OR: [
          { processingStatus: "pending" },
          { 
            AND: [
              { storageLink: { not: null } },
              { processingStatus: null },
              { m3u8: null }
            ]
          }
        ]
      },
      include: {
        courses: { select: { id: true, title: true } }
      }
    });

    console.log(`Found ${videosNeedingProcessing.length} videos that need processing:`);
    for (const video of videosNeedingProcessing.slice(0, 3)) {
      console.log(`   📹 ${video.title}`);
      console.log(`      Video ID: ${video.id}`);
      console.log(`      Course ID: ${video.courses[0]?.id || 'No course'}`);
      console.log(`      Processing Status: ${video.processingStatus || 'null'}`);
      console.log(`      Has Storage Link: ${video.storageLink ? 'YES' : 'NO'}`);
      console.log(`      Has HLS: ${video.m3u8 ? 'YES' : 'NO'}`);
      console.log();
    }

    // Test 8: Try to manually schedule a job for testing
    if (videosNeedingProcessing.length > 0) {
      const testVideo = videosNeedingProcessing[0];
      console.log("🧪 Testing manual job scheduling...");
      
      if (testVideo.storageLink && testVideo.courses[0]) {
        // Extract S3 key from storage link
        const url = new URL(testVideo.storageLink);
        const s3Key = url.pathname.substring(1); // Remove leading slash
        
        console.log(`   Scheduling test job for video: ${testVideo.title}`);
        console.log(`   S3 Key: ${s3Key}`);
        
        // Check if there's already a job for this video
        const existingJob = await agenda.jobs({ 
          name: "process_video_hls",
          "data.videoId": testVideo.id
        });
        
        console.log(`   Existing jobs for this video: ${existingJob.length}`);
        
        if (existingJob.length === 0) {
          try {
            const job = await agenda.now("process_video_hls", {
              courseId: testVideo.courses[0].id,
              videoId: testVideo.id,
              videoS3Key: s3Key
            });
            console.log(`   ✅ Test job scheduled: ${job.attrs._id}`);
          } catch (error) {
            console.log(`   ❌ Failed to schedule job: ${error}`);
          }
        } else {
          console.log(`   ⏭️ Job already exists for this video`);
        }
      }
    }

    console.log("\n✨ Agenda testing completed!");
    
    await agenda.stop();

  } catch (error) {
    console.error("❌ Error during Agenda testing:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testAgenda().catch(console.error);