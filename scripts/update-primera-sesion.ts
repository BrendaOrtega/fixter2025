#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePrimeraSession() {
  try {
    console.log('🎬 Actualizando URL del video de la primera sesión...\n')
    
    // Buscar video de la primera sesión
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { slug: { contains: "sesion-1", mode: 'insensitive' } },
          { slug: { contains: "primera", mode: 'insensitive' } },
          { title: { contains: "Primera sesión", mode: 'insensitive' } },
          { title: { contains: "Fundamentos", mode: 'insensitive' } }
        ]
      }
    })

    console.log(`📹 Videos encontrados: ${videos.length}`)
    videos.forEach(video => {
      console.log(`   - ${video.title} (${video.slug})`)
      console.log(`     URL actual: ${video.storageLink}`)
    })

    // Buscar el que corresponda al curso de Claude Code
    const claudeVideos = videos.filter(v => 
      v.slug.includes('claude') || v.title.includes('Claude') ||
      v.title.includes('Fundamentos y Context')
    )

    if (claudeVideos.length === 0) {
      console.log('❌ No se encontró el video de la primera sesión de Claude')
      return
    }

    const video = claudeVideos[0]
    
    const newUrl = "https://easybits-dev.t3.storage.dev/6814ed40681c31b087c02c3a/GMT20250820-011002_Recording_1920x1080_Ca9k2qyJFAVSTxNILpk6o.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_dlHabTgwlmwyGi_yyLjBagKyPMEQBTJgsQVdOFCdzrgyaAFZXW%2F20250831%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250831T022826Z&X-Amz-Expires=2592000&X-Amz-SignedHeaders=host&X-Amz-Signature=ff4e6010f534937fa7140373a773acaf071d01e44eaaa56b0691b25d6df5fb60"

    console.log('\n📝 Actualizando URL...')
    console.log(`Nueva URL: ${newUrl}\n`)

    const updatedVideo = await prisma.video.update({
      where: { id: video.id },
      data: {
        storageLink: newUrl
      }
    })

    console.log('✅ Video actualizado exitosamente:')
    console.log(`   ID: ${updatedVideo.id}`)
    console.log(`   Título: ${updatedVideo.title}`)
    console.log(`   Nueva URL: ${updatedVideo.storageLink}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePrimeraSession()