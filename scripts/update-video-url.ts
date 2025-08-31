#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateVideoUrl() {
  try {
    console.log('🎬 Actualizando URL del video de la segunda sesión...\n')
    
    // Buscar específicamente el video del curso de Claude Code
    const videos = await prisma.video.findMany({
      where: {
        slug: "claude-code-sesion-2-automatizacion"
      }
    })

    console.log(`📹 Videos encontrados: ${videos.length}`)
    videos.forEach(video => {
      console.log(`   - ${video.title} (${video.slug})`)
      console.log(`     URL actual: ${video.storageLink}`)
    })

    if (videos.length === 0) {
      console.log('❌ No se encontró el video de la segunda sesión')
      return
    }

    // Tomar el primer video encontrado (debería ser único)
    const video = videos[0]
    
    const newUrl = "https://easybits-dev.t3.storage.dev/6814ed40681c31b087c02c3a/GMT20250822-010814_Recording_1920x1080_gmAqVgw0VOeCymGS3nRhB.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_dlHabTgwlmwyGi_yyLjBagKyPMEQBTJgsQVdOFCdzrgyaAFZXW%2F20250831%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250831T022636Z&X-Amz-Expires=2592000&X-Amz-SignedHeaders=host&X-Amz-Signature=8b5ab7cee4817636291c5e05268ec25b0bfbc290d583ab83fb5aab13a5ff1468"

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

updateVideoUrl()