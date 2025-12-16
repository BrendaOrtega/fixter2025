#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function findNewFormatVideos() {
  console.log("🔍 Searching for videos with new format...\n");

  try {
    // Find videos with the new format - handle nulls properly
    const videos = await db.video.findMany({
      where: {
        OR: [
          { 
            AND: [
              { storageLink: { not: null } },
              { storageLink: { contains: "fixtergeek/videos/" } }
            ]
          },
          { 
            AND: [
              { m3u8: { not: null } },
              { m3u8: { contains: "fixtergeek/videos/" } }
            ]
          },
          { 
            AND: [
              { storageLink: { not: null } },
              { storageLink: { contains: "fly.storage.tigris.dev" } }
            ]
          },
          { 
            AND: [
              { m3u8: { not: null } },
              { m3u8: { contains: "fly.storage.tigris.dev" } }
            ]
          }
        ]
      },
      include: {
        courses: { select: { id: true, title: true } }
      },
      take: 10
    });

    console.log(`Found ${videos.length} videos with new format:\n`);

    for (const video of videos) {
      console.log(`📹 ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Course: ${video.courses[0]?.title || 'No course'}`);
      console.log(`   Processing Status: ${video.processingStatus || 'null'}`);
      
      if (video.storageLink) {
        console.log(`   Storage Link: ${video.storageLink.substring(0, 100)}...`);
        const hasNewFormat = video.storageLink.includes('fixtergeek/videos/');
        console.log(`   Has new format: ${hasNewFormat ? '✅' : '❌'}`);
      }
      
      if (video.m3u8) {
        console.log(`   HLS Link: ${video.m3u8.substring(0, 100)}...`);
        const hasNewFormat = video.m3u8.includes('fixtergeek/videos/');
        console.log(`   HLS has new format: ${hasNewFormat ? '✅' : '❌'}`);
      }
      
      console.log();
    }

    // Count videos by format
    console.log("📊 Video Format Statistics:\n");
    
    const totalVideos = await db.video.count();
    const videosWithStorage = await db.video.count({ where: { storageLink: { not: null } } });
    const videosWithHLS = await db.video.count({ where: { m3u8: { not: null } } });
    const newFormatVideos = await db.video.count({
      where: {
        OR: [
          { 
            AND: [
              { storageLink: { not: null } },
              { storageLink: { contains: "fixtergeek/videos/" } }
            ]
          },
          { 
            AND: [
              { m3u8: { not: null } },
              { m3u8: { contains: "fixtergeek/videos/" } }
            ]
          }
        ]
      }
    });
    const processingVideos = await db.video.count({
      where: { processingStatus: { not: null } }
    });

    console.log(`   Total videos: ${totalVideos}`);
    console.log(`   Videos with storage link: ${videosWithStorage}`);
    console.log(`   Videos with HLS: ${videosWithHLS}`);
    console.log(`   Videos with new format: ${newFormatVideos}`);
    console.log(`   Videos with processing status: ${processingVideos}`);
    console.log();

    // Check processing statuses
    const statuses = await db.video.groupBy({
      by: ['processingStatus'],
      _count: true
    });

    console.log("📈 Processing Status Distribution:\n");
    for (const status of statuses) {
      console.log(`   ${status.processingStatus || 'null'}: ${status._count} videos`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

findNewFormatVideos().catch(console.error);