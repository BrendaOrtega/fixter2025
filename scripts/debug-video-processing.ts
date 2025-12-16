#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function debugVideoProcessing() {
  console.log("🔍 Debugging Video Processing System...\n");

  try {
    // Find the most recent video
    console.log("📹 Finding most recent video...");
    const recentVideo = await db.video.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        courses: { select: { id: true, title: true } }
      }
    });

    if (!recentVideo) {
      console.log("❌ No videos found");
      process.exit(1);
    }

    console.log(`✅ Most recent video: "${recentVideo.title}"`);
    console.log(`   ID: ${recentVideo.id}`);
    console.log(`   Created: ${recentVideo.createdAt}`);
    console.log(`   Course: ${recentVideo.courses[0]?.title || 'No course'}`);
    console.log(`   Course ID: ${recentVideo.courses[0]?.id || 'No course'}`);
    console.log(`   Storage Link: ${recentVideo.storageLink ? 'YES' : 'NO'}`);
    console.log(`   HLS Link: ${recentVideo.m3u8 ? 'YES' : 'NO'}`);
    console.log(`   Processing Status: ${recentVideo.processingStatus || 'null'}`);
    console.log(`   Processing Started: ${recentVideo.processingStartedAt || 'null'}`);
    console.log(`   Processing Completed: ${recentVideo.processingCompletedAt || 'null'}`);
    console.log(`   Processing Failed: ${recentVideo.processingFailedAt || 'null'}`);
    console.log(`   Processing Error: ${recentVideo.processingError || 'null'}`);
    console.log();

    if (recentVideo.storageLink) {
      console.log(`📎 Storage Link Details:`);
      console.log(`   URL: ${recentVideo.storageLink}`);
      
      // Check if it's new format
      const isNewFormat = recentVideo.storageLink.includes('fixtergeek/videos/');
      const isOldFormat = recentVideo.storageLink.includes('easybits-dev.t3.storage.dev');
      console.log(`   New format: ${isNewFormat ? '✅' : '❌'}`);
      console.log(`   Old format: ${isOldFormat ? '✅' : '❌'}`);
      console.log();
    }

    // Check for videos pending processing
    console.log("⏳ Checking videos pending processing...");
    const pendingVideos = await db.video.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`Found ${pendingVideos.length} videos that should be processed:\n`);
    for (const video of pendingVideos) {
      console.log(`   📹 ${video.title}`);
      console.log(`      Status: ${video.processingStatus || 'null'}`);
      console.log(`      Has storage: ${video.storageLink ? 'YES' : 'NO'}`);
      console.log(`      Has HLS: ${video.m3u8 ? 'YES' : 'NO'}`);
      console.log(`      Created: ${video.createdAt}`);
      console.log();
    }

    // Check Agenda jobs collection
    console.log("🗂️ Checking Agenda jobs...");
    
    // Check if agenda collection exists
    const agendaJobs = await db.agendaJob.findMany({
      orderBy: { lastRunAt: 'desc' },
      take: 10
    });

    console.log(`Found ${agendaJobs.length} agenda jobs:\n`);
    for (const job of agendaJobs.slice(0, 5)) {
      console.log(`   🔄 ${job.name}`);
      console.log(`      Last run: ${job.lastRunAt || 'Never'}`);
      console.log(`      Next run: ${job.nextRunAt || 'Not scheduled'}`);
      console.log(`      Disabled: ${job.disabled ? 'YES' : 'NO'}`);
      console.log(`      Failed count: ${job.failCount}`);
      if (job.failReason) {
        console.log(`      Fail reason: ${job.failReason.substring(0, 100)}...`);
      }
      console.log();
    }

    // Check for video processing jobs specifically
    const videoJobs = agendaJobs.filter(job => 
      job.name.includes('video') || 
      job.name.includes('process') ||
      job.name.includes('hls')
    );

    if (videoJobs.length > 0) {
      console.log("🎥 Video processing jobs:\n");
      for (const job of videoJobs) {
        console.log(`   📼 ${job.name}`);
        console.log(`      Data: ${job.data ? JSON.stringify(job.data).substring(0, 200) + '...' : 'No data'}`);
        console.log(`      Last run: ${job.lastRunAt || 'Never'}`);
        console.log(`      Next run: ${job.nextRunAt || 'Not scheduled'}`);
        console.log();
      }
    }

    // Check recent agenda job activity
    console.log("📊 Recent job activity...");
    const recentJobs = await db.agendaJob.findMany({
      where: {
        lastRunAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { lastRunAt: 'desc' },
      take: 10
    });

    console.log(`${recentJobs.length} jobs ran in the last 24 hours:\n`);
    for (const job of recentJobs.slice(0, 5)) {
      console.log(`   ⚡ ${job.name}`);
      console.log(`      Run: ${job.lastRunAt}`);
      console.log(`      Result: ${job.failCount === 0 ? '✅ Success' : `❌ Failed (${job.failCount} times)`}`);
      console.log();
    }

  } catch (error) {
    console.error("❌ Error during debugging:");
    console.error(error);
  } finally {
    await db.$disconnect();
  }
}

debugVideoProcessing().catch(console.error);