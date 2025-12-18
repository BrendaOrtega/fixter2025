#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { Effect } from "effect";
import { s3VideoService } from "../app/.server/services/s3-video";

const db = new PrismaClient();

async function simpleDebug() {
  console.log("🔍 Diagnóstico Simplificado\n");

  try {
    // 1. Videos recientes
    const videos = await db.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { courses: { select: { id: true, title: true } } }
    });

    console.log("📹 Videos recientes:");
    videos.forEach((video, i) => {
      console.log(`${i + 1}. ${video.title}`);
      console.log(`   - Storage: ${video.storageLink ? '✅' : '❌'}`);
      console.log(`   - HLS: ${video.m3u8 ? '✅' : '❌'}`);
      console.log(`   - Estado: ${video.processingStatus || 'sin procesar'}`);
      console.log();
    });

    // 2. Videos pendientes
    const pending = await db.video.findMany({
      where: {
        AND: [
          { storageLink: { not: null } },
          { m3u8: null }
        ]
      }
    });

    console.log(`⏳ Videos pendientes de procesar: ${pending.length}`);
    
    if (pending.length > 0) {
      const example = pending[0];
      console.log(`\n📋 Ejemplo de video pendiente:`);
      console.log(`   ID: ${example.id}`);
      console.log(`   Título: ${example.title}`);
      console.log(`   Storage: ${example.storageLink}`);
      console.log(`   Estado: ${example.processingStatus || 'null'}`);
    }

    console.log("\n✅ Diagnóstico completado");

    // Test presigned URLs for new format videos
    if (pending.length > 0) {
      console.log("\n🔗 Probando presigned URLs...");
      const testVideo = pending[0];
      
      if (testVideo.storageLink && testVideo.storageLink.includes('fixtergeek/videos/')) {
        try {
          console.log(`   Testing video: ${testVideo.title}`);
          
          // Get course for this video
          const videoWithCourse = await db.video.findUnique({
            where: { id: testVideo.id },
            include: { courses: { select: { id: true } } }
          });
          
          if (videoWithCourse?.courses[0]) {
            // Extract S3 key (removing bucket name if present)
            const url = new URL(testVideo.storageLink);
            let s3Key = url.pathname.substring(1); // Remove leading slash
            
            // If key starts with bucket name, remove it
            const bucketName = "wild-bird-2039";
            if (s3Key.startsWith(bucketName + "/")) {
              s3Key = s3Key.substring(bucketName.length + 1);
            }
            
            console.log(`   S3 Key: ${s3Key}`);
            
            // Generate presigned URL
            const presignedUrl = await Effect.runPromise(
              s3VideoService.getVideoPreviewUrl(s3Key, 3600)
            );
            
            console.log(`   Presigned URL: ${presignedUrl.substring(0, 100)}...`);
            
            // Test access
            const response = await fetch(presignedUrl, { method: 'HEAD' });
            console.log(`   Access test: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
              console.log("   ✅ Presigned URL works!");
            } else {
              console.log("   ❌ Presigned URL failed");
            }
          }
        } catch (error) {
          console.error("   ❌ Error testing presigned URL:", error);
        }
      } else {
        console.log("   ⏭️ Video uses legacy format, skipping presigned test");
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

simpleDebug();