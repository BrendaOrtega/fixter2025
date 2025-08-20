#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeDuplicateVideo() {
  try {
    console.log('🔍 Buscando videos duplicados en el curso...\n')
    
    const COURSE_ID = "68a617e896468300160b6dfb"
    
    // Obtener el curso con sus videos
    const course = await prisma.course.findUnique({
      where: { id: COURSE_ID },
      include: {
        videos: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            createdAt: true
          }
        }
      }
    })

    if (!course) {
      console.log('❌ Curso no encontrado')
      return
    }

    console.log(`📚 Curso: ${course.title}`)
    console.log(`📊 Videos encontrados: ${course.videos.length}\n`)
    
    if (course.videos.length > 0) {
      console.log('📋 Lista de videos:')
      course.videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title}`)
        console.log(`      ID: ${v.id}`)
        console.log(`      Slug: ${v.slug}`)
        console.log(`      Creado: ${v.createdAt.toISOString()}`)
      })
    }

    // Eliminar el primer video (el webinar) y mantener el segundo (Primera sesión: Prompts)
    if (course.videos.length >= 2) {
      const videoToRemove = course.videos[0] // El más antiguo (webinar)
      const videoToKeep = course.videos[1] // El más nuevo (Primera sesión)
      
      console.log('\n' + '─'.repeat(50))
      console.log(`\n🗑️  Eliminando: "${videoToRemove.title}"`)
      console.log(`✅ Manteniendo: "${videoToKeep.title}"\n`)
      
      // Eliminar la relación del video con el curso
      await prisma.course.update({
        where: { id: COURSE_ID },
        data: {
          videoIds: {
            set: course.videoIds.filter(id => id !== videoToRemove.id)
          }
        }
      })
      
      // Eliminar el video de la base de datos
      await prisma.video.delete({
        where: { id: videoToRemove.id }
      })
      
      console.log('✅ Video duplicado eliminado exitosamente')
      
      // Verificar el resultado
      const updatedCourse = await prisma.course.findUnique({
        where: { id: COURSE_ID },
        include: {
          videos: {
            select: {
              title: true,
              slug: true
            }
          }
        }
      })
      
      console.log('\n' + '─'.repeat(50))
      console.log('📊 Estado final del curso:')
      console.log(`   Videos: ${updatedCourse.videos.length}`)
      if (updatedCourse.videos.length > 0) {
        console.log(`   - ${updatedCourse.videos[0].title}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicateVideo()