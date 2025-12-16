#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'
import { MongoClient } from 'mongodb'
import { scheduleVideoProcessing } from '../app/.server/agenda'

const prisma = new PrismaClient()

async function fixVideoProcessing() {
  console.log('🔧 Reparando sistema de procesamiento de video...\n')

  // 1. Revisar videos problemáticos
  const problematicVideos = await prisma.video.findMany({
    where: {
      OR: [
        {
          processingStatus: "processing",
          processingStartedAt: {
            lt: new Date(Date.now() - 2 * 60 * 60 * 1000) // Más de 2 horas
          }
        },
        {
          processingStatus: null,
          m3u8: null,
          storageLink: null,
          createdAt: {
            lt: new Date(Date.now() - 1 * 60 * 60 * 1000) // Más de 1 hora sin procesar
          }
        }
      ]
    },
    include: {
      courses: {
        select: { id: true, title: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`🔍 Encontrados ${problematicVideos.length} videos problemáticos:\n`)
  
  problematicVideos.forEach((video, index) => {
    const hoursAgo = Math.round((Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60))
    const courseTitle = video.courses[0]?.title || 'Sin curso'
    
    console.log(`${index + 1}. 📹 ${video.title}`)
    console.log(`   Course: ${courseTitle}`)
    console.log(`   Status: ${video.processingStatus || 'Sin estado'}`)
    console.log(`   Created: ${hoursAgo}h ago`)
    console.log(`   ID: ${video.id}`)
    console.log('')
  })

  if (problematicVideos.length === 0) {
    console.log('✅ No se encontraron videos problemáticos para reparar.')
    await prisma.$disconnect()
    return
  }

  // 2. Conectar a MongoDB para limpiar jobs de Agenda
  console.log('🧹 Limpiando jobs de Agenda relacionados...')
  const client = new MongoClient(process.env.DATABASE_URL!)
  await client.connect()
  
  const db = client.db()
  const agendaJobs = db.collection('agenda')

  // Buscar jobs de video procesamiento
  const videoJobs = await agendaJobs.find({
    name: "process_video_hls"
  }).toArray()

  console.log(`📋 Encontrados ${videoJobs.length} jobs de procesamiento de video`)

  if (videoJobs.length > 0) {
    // Cancelar jobs existentes que puedan estar colgados
    const result = await agendaJobs.deleteMany({
      name: "process_video_hls",
      $or: [
        { failedAt: { $exists: true } },
        { lastRunAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } }, // Más de 2 horas
        { lockedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } } // Locked más de 30 min
      ]
    })
    console.log(`🗑️ Limpiados ${result.deletedCount} jobs problemáticos`)
  }

  await client.close()

  // 3. Reiniciar procesamiento para videos problemáticos
  console.log('\n🚀 Reiniciando procesamiento para videos problemáticos...\n')
  
  for (const video of problematicVideos.slice(0, 3)) { // Solo los primeros 3 para no saturar
    try {
      console.log(`⚡ Reiniciando procesamiento: ${video.title}`)
      
      // Primero resetear el estado del video
      await prisma.video.update({
        where: { id: video.id },
        data: {
          processingStatus: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          processingFailedAt: null,
          processingError: null,
        }
      })

      // Verificar que tenemos courseId
      const courseId = video.courses[0]?.id
      if (!courseId) {
        console.log(`   ❌ No se encontró courseId para ${video.title}`)
        continue
      }

      // Generar videoS3Key esperado (asumiendo que se subió con el patrón estándar)
      const videoS3Key = `fixtergeek/videos/${courseId}/${video.id}/original/${video.slug}.mp4`
      
      // Programar nuevo job de procesamiento
      await scheduleVideoProcessing({
        courseId,
        videoId: video.id,
        videoS3Key
      })

      console.log(`   ✅ Job reprogramado para ${video.title}`)
      
      // Esperar un poco entre jobs para no saturar
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.log(`   ❌ Error reprogramando ${video.title}: ${error}`)
    }
  }

  console.log('\n🎉 Proceso de reparación completado!')
  console.log('💡 Los videos deberían empezar a procesarse en los próximos minutos.')
  console.log('🔍 Puedes verificar el progreso con: npx tsx scripts/debug-videos.ts')

  await prisma.$disconnect()
}

// Función para resetear un video específico
export async function resetSpecificVideo(videoId: string) {
  console.log(`🔄 Reseteando video específico: ${videoId}`)
  
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { courses: { select: { id: true } } }
  })

  if (!video) {
    console.log('❌ Video no encontrado')
    return false
  }

  const courseId = video.courses[0]?.id
  if (!courseId) {
    console.log('❌ No se encontró courseId')
    return false
  }

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

  // Reprogram job
  const videoS3Key = `fixtergeek/videos/${courseId}/${videoId}/original/${video.slug}.mp4`
  await scheduleVideoProcessing({
    courseId,
    videoId,
    videoS3Key
  })

  console.log('✅ Video reseteado y reprogramado')
  return true
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixVideoProcessing().catch(console.error)
}