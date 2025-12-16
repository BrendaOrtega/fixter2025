#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'
import { scheduleVideoProcessing } from '../app/.server/agenda'

const prisma = new PrismaClient()

async function forceResetVideo(videoId: string) {
  console.log(`🔄 Forzando reset del video: ${videoId}`)
  
  // 1. Obtener info del video
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
  console.log(`🎯 Curso: ${video.courses[0]?.title || 'Sin curso'}`)

  const courseId = video.courses[0]?.id
  if (!courseId) {
    console.log('❌ No se encontró courseId')
    return false
  }

  // 2. Limpiar jobs de Agenda colgados
  console.log(`🧹 Limpiando jobs de Agenda colgados...`)
  const client = new MongoClient(process.env.DATABASE_URL!)
  await client.connect()
  
  const db = client.db()
  const agendaJobs = db.collection('agenda')

  // Eliminar CUALQUIER job de procesamiento de este video
  const deleteResult = await agendaJobs.deleteMany({
    name: "process_video_hls",
    "data.videoId": videoId
  })
  console.log(`🗑️ Eliminados ${deleteResult.deletedCount} jobs existentes`)

  await client.close()

  // 3. Reset completo del video en DB
  console.log(`🔧 Reseteando estado del video en DB...`)
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

  // 4. Crear nuevo job de procesamiento
  console.log(`📤 Creando nuevo job de procesamiento...`)
  const videoS3Key = `fixtergeek/videos/${courseId}/${videoId}/original/Introduccion-al-AI-SDK-c1b068e6-aab3-431a-a294-ace9e6ead6af.mp4`
  console.log(`🔑 S3 Key: ${videoS3Key}`)
  
  await scheduleVideoProcessing({
    courseId,
    videoId,
    videoS3Key
  })

  console.log('✅ Video completamente reseteado y nuevo job programado')
  return true
}

// Video específico problemático
const VIDEO_ID = "6933379c88a49ff14e1bad14" // "Introducción al AI-SDK"

forceResetVideo(VIDEO_ID)
  .then(() => {
    console.log('\n🎯 Monitorea los logs de la aplicación para ver el progreso del procesamiento')
    console.log('📊 Usa: npx tsx scripts/debug-videos.ts para verificar el estado')
    return prisma.$disconnect()
  })
  .catch(console.error)