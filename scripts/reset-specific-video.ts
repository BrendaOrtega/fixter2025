#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { scheduleVideoProcessing } from '../app/.server/agenda'

const prisma = new PrismaClient()

async function resetSpecificVideo(videoId: string) {
  console.log(`🔄 Reseteando video específico: ${videoId}`)
  
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { 
      courses: { 
        select: { id: true, title: true } 
      } 
    }
  })

  if (!video) {
    console.log('❌ Video no encontrado')
    return false
  }

  console.log(`📹 Video: ${video.title}`)
  console.log(`📅 Creado: ${video.createdAt.toLocaleString()}`)
  console.log(`⚙️ Estado actual: ${video.processingStatus || 'Sin estado'}`)
  console.log(`🎯 Curso: ${video.courses[0]?.title || 'Sin curso'}`)
  console.log(`📺 Tiene HLS: ${!!video.m3u8 ? 'Sí' : 'No'}`)
  console.log(`🔗 Tiene Direct Link: ${!!video.storageLink ? 'Sí' : 'No'}`)

  const courseId = video.courses[0]?.id
  if (!courseId) {
    console.log('❌ No se encontró courseId')
    return false
  }

  console.log(`\n🔧 Reseteando estado del video...`)
  
  // Reset status
  await prisma.video.update({
    where: { id: videoId },
    data: {
      processingStatus: null,
      processingStartedAt: null,
      processingCompletedAt: null,
      processingFailedAt: null,
      processingError: null,
    }
  })

  console.log(`📤 Reprogramando job de procesamiento...`)
  
  // Reprogram job
  const videoS3Key = `fixtergeek/videos/${courseId}/${videoId}/original/${video.slug}.mp4`
  console.log(`🔑 S3 Key: ${videoS3Key}`)
  
  await scheduleVideoProcessing({
    courseId,
    videoId,
    videoS3Key
  })

  console.log('✅ Video reseteado y reprogramado exitosamente')
  return true
}

// Para el video específico que está en "processing"
const VIDEO_ID = "6933379c88a49ff14e1bad14" // "Introducción al AI-SDK"

resetSpecificVideo(VIDEO_ID)
  .then(() => prisma.$disconnect())
  .catch(console.error)