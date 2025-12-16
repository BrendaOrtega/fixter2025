#!/usr/bin/env -S npx tsx

import { MongoClient } from 'mongodb'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupVideoSystem() {
  console.log('🧹 Limpieza completa del sistema de video...\n')

  // 1. Verificar videos actuales en DB
  const currentVideos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      processingStatus: true,
      m3u8: true,
      storageLink: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log(`📋 Videos actuales en DB: ${currentVideos.length}`)
  currentVideos.forEach((video, index) => {
    console.log(`  ${index + 1}. ${video.title} - ${video.processingStatus || 'Sin estado'}`)
  })
  console.log('')

  // 2. Limpiar todos los jobs de video en Agenda
  console.log('🧹 Limpiando jobs de procesamiento de video en Agenda...')
  const client = new MongoClient(process.env.DATABASE_URL!)
  await client.connect()
  
  const db = client.db()
  const agendaJobs = db.collection('agenda')

  // Buscar todos los jobs de video
  const videoJobs = await agendaJobs.find({
    name: "process_video_hls"
  }).toArray()

  console.log(`📊 Jobs de video encontrados: ${videoJobs.length}`)

  if (videoJobs.length > 0) {
    // Eliminar todos los jobs de video
    const deleteResult = await agendaJobs.deleteMany({
      name: "process_video_hls"
    })
    console.log(`🗑️ Eliminados ${deleteResult.deletedCount} jobs de video`)
  }

  await client.close()

  // 3. Reset de estados de procesamiento problemáticos
  console.log('\n🔄 Limpiando estados de procesamiento...')
  const updateResult = await prisma.video.updateMany({
    where: {
      processingStatus: "processing"
    },
    data: {
      processingStatus: null,
      processingStartedAt: null,
      processingError: null
    }
  })

  console.log(`✅ Limpiados ${updateResult.count} videos con estado "processing"`)

  // 4. Verificar estado final
  console.log('\n📊 Estado final del sistema:')
  const finalCount = await prisma.video.count()
  const processingCount = await prisma.video.count({
    where: { processingStatus: "processing" }
  })

  console.log(`  📹 Total de videos: ${finalCount}`)
  console.log(`  ⏳ Videos procesando: ${processingCount}`)
  
  if (processingCount === 0 && finalCount === 0) {
    console.log('  ✅ Sistema completamente limpio')
  } else {
    console.log('  ℹ️ Sistema listo para nuevos videos')
  }

  await prisma.$disconnect()
  console.log('\n🎉 Limpieza completada. El sistema está listo para procesar nuevos videos.')
}

cleanupVideoSystem().catch(console.error)