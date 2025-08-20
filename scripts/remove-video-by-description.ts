#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeVideoByDescription() {
  try {
    console.log('🔍 Buscando video con descripción específica...\n')
    
    const targetDescription = "Grabación completa del webinar de Claude Code - 19 de Agosto 2025"
    
    // Buscar el video por descripción
    const video = await prisma.video.findFirst({
      where: {
        description: targetDescription
      }
    })

    if (!video) {
      console.log(`❌ No se encontró ningún video con la descripción: "${targetDescription}"`)
      
      // Buscar todos los videos para verificar
      console.log('\n📋 Buscando todos los videos en la base de datos...')
      const allVideos = await prisma.video.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          slug: true
        }
      })
      
      console.log(`\nTotal de videos encontrados: ${allVideos.length}`)
      allVideos.forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.title}`)
        console.log(`   ID: ${v.id}`)
        console.log(`   Slug: ${v.slug}`)
        console.log(`   Descripción: ${v.description || 'Sin descripción'}`)
      })
      
      return
    }

    console.log('✅ Video encontrado:')
    console.log(`   Título: ${video.title}`)
    console.log(`   ID: ${video.id}`)
    console.log(`   Slug: ${video.slug}`)
    console.log(`   Descripción: ${video.description}`)
    
    // Eliminar el video de todos los cursos que lo contengan
    console.log('\n🔄 Eliminando referencias del video en cursos...')
    
    // Buscar todos los cursos que contengan este video
    const coursesWithVideo = await prisma.course.findMany({
      where: {
        videoIds: {
          has: video.id
        }
      }
    })
    
    console.log(`   Cursos afectados: ${coursesWithVideo.length}`)
    
    // Actualizar cada curso para remover el video
    for (const course of coursesWithVideo) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          videoIds: {
            set: course.videoIds.filter(id => id !== video.id)
          }
        }
      })
      console.log(`   ✅ Removido del curso: ${course.title}`)
    }
    
    // Eliminar el video de la base de datos
    console.log('\n🗑️  Eliminando video de la base de datos...')
    await prisma.video.delete({
      where: { id: video.id }
    })
    
    console.log('\n✅ Video eliminado exitosamente')
    
    // Verificar videos restantes
    const remainingVideos = await prisma.video.count()
    console.log(`\n📊 Videos restantes en la base de datos: ${remainingVideos}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeVideoByDescription()