#!/usr/bin/env npx tsx

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { scheduleVideoProcessing } from "../app/.server/agenda";

const db = new PrismaClient();

async function reprocessPendingVideos() {
  console.log("🔍 Buscando videos pendientes de procesamiento HLS...\n");

  try {
    // Find videos that need HLS processing
    const pendingVideos = await db.video.findMany({
      where: {
        // Has storage link (original video uploaded)
        storageLink: { not: null },
        // And either: no m3u8, or status is pending/failed
        OR: [
          { m3u8: null },
          { processingStatus: "pending" },
          { processingStatus: "failed" },
        ]
      },
      include: {
        courses: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`📹 Encontrados ${pendingVideos.length} videos pendientes:\n`);

    if (pendingVideos.length === 0) {
      console.log("✅ No hay videos pendientes de procesamiento");
      return;
    }

    // Show what we found
    for (const video of pendingVideos) {
      console.log(`  - ${video.title}`);
      console.log(`    ID: ${video.id}`);
      console.log(`    Curso: ${video.courses[0]?.title || 'Sin curso'}`);
      console.log(`    Estado: ${video.processingStatus || 'null'}`);
      console.log(`    HLS: ${video.m3u8 ? '✅' : '❌'}`);
      console.log();
    }

    // Confirm before processing
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`\n¿Procesar ${pendingVideos.length} videos? (s/n): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== "s") {
      console.log("❌ Cancelado");
      return;
    }

    console.log("\n🚀 Iniciando procesamiento...\n");

    for (const video of pendingVideos) {
      if (!video.storageLink || !video.courses[0]?.id) {
        console.log(`⏭️ Saltando ${video.title} - sin storageLink o curso`);
        continue;
      }

      // Extract S3 key from storage link
      const s3Key = extractS3Key(video.storageLink);
      if (!s3Key) {
        console.log(`⏭️ Saltando ${video.title} - no se pudo extraer S3 key`);
        continue;
      }

      console.log(`📤 Encolando: ${video.title}`);
      console.log(`   S3 Key: ${s3Key}`);

      try {
        await scheduleVideoProcessing({
          courseId: video.courses[0].id,
          videoId: video.id,
          videoS3Key: s3Key,
          force: true, // Force reprocess even if job exists
        });
        console.log(`   ✅ Encolado exitosamente\n`);
      } catch (error) {
        console.log(`   ❌ Error: ${error}\n`);
      }

      // Small delay between scheduling
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("\n🎉 Todos los videos han sido encolados para procesamiento");
    console.log("💡 Los jobs se ejecutarán en el servidor después del deploy");
    console.log("📋 Monitorea con: fly logs");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname.substring(1); // Remove leading slash

    // Handle bucket name prefix (e.g., /wild-bird-2039/fixtergeek/... -> fixtergeek/...)
    const parts = path.split('/');
    const bucketIdx = parts.findIndex(p => p === 'fixtergeek');
    if (bucketIdx > 0) {
      path = parts.slice(bucketIdx).join('/');
    }

    return path || null;
  } catch {
    return null;
  }
}

reprocessPendingVideos().catch(console.error);
