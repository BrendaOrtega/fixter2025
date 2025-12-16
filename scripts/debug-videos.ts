#!/usr/bin/env -S npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugVideos() {
  console.log('🔍 Verificando estado de videos...\n')

  // Obtener videos con estado de procesamiento
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      processingStatus: true,
      m3u8: true,
      storageLink: true,
      createdAt: true,
      updatedAt: true,
      courses: {
        select: {
          title: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  console.log(`📊 Encontrados ${videos.length} videos recientes:\n`)

  videos.forEach((video, index) => {
    const hoursAgo = Math.round((Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60))
    const hoursUpdated = Math.round((Date.now() - video.updatedAt.getTime()) / (1000 * 60 * 60))
    
    console.log(`${index + 1}. 📹 ${video.title}`)
    console.log(`   Course: ${video.courses[0]?.title || 'Sin curso'}`)
    console.log(`   Status: ${video.processingStatus || 'Sin estado'}`)
    console.log(`   Has HLS: ${!!video.m3u8 ? '✅' : '❌'}`)
    console.log(`   Has Direct: ${!!video.storageLink ? '✅' : '❌'}`)
    console.log(`   Created: ${hoursAgo}h ago`)
    console.log(`   Updated: ${hoursUpdated}h ago`)
    console.log(`   ID: ${video.id}`)
    console.log('')
  })

  // Buscar videos problemáticos (más de 2 horas procesando)
  const stuckVideos = videos.filter(video => {
    const hoursAgo = Math.round((Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60))
    return hoursAgo > 2 && !video.m3u8 && !video.storageLink
  })

  if (stuckVideos.length > 0) {
    console.log(`🚨 Videos problemáticos (${stuckVideos.length} encontrados):`)
    stuckVideos.forEach(video => {
      const hoursAgo = Math.round((Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60))
      console.log(`   - ${video.title} (${hoursAgo}h procesando)`)
    })
  } else {
    console.log('✅ No se encontraron videos problemáticos')
  }

  await prisma.$disconnect()
}

debugVideos().catch(console.error)