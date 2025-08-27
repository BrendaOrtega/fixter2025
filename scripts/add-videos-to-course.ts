#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface VideoData {
  slug: string
  title: string
  storageLink: string
  duration?: string
  description?: string
  index?: number
}

async function addVideosToCourse(courseId: string, videos: VideoData[]) {
  try {
    console.log('🎬 Añadiendo videos al curso...\n')
    
    // Verificar que el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        slug: true,
        videoIds: true,
        videos: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    if (!course) {
      console.log('❌ Curso no encontrado')
      return
    }

    console.log(`📚 Curso: ${course.title}`)
    console.log(`   Slug: ${course.slug}`)
    console.log(`   Videos existentes: ${course.videos.length}\n`)
    console.log('─'.repeat(50))

    const createdVideoIds: string[] = []

    for (const videoData of videos) {
      console.log(`\n📹 Procesando: ${videoData.title}`)
      
      try {
        // Verificar si el video ya existe
        const existingVideo = await prisma.video.findUnique({
          where: { slug: videoData.slug }
        })

        if (existingVideo) {
          console.log(`   ⚠️  Video ya existe con slug: ${videoData.slug}`)
          
          // Actualizar el video existente si es necesario
          const updated = await prisma.video.update({
            where: { slug: videoData.slug },
            data: {
              title: videoData.title,
              storageLink: videoData.storageLink,
              duration: videoData.duration,
              description: videoData.description,
              index: videoData.index,
              courseIds: {
                set: [...new Set([...existingVideo.courseIds, courseId])]
              }
            }
          })
          
          console.log(`   ✅ Video actualizado y asociado al curso`)
          createdVideoIds.push(updated.id)
          
        } else {
          // Crear nuevo video
          const newVideo = await prisma.video.create({
            data: {
              slug: videoData.slug,
              title: videoData.title,
              storageLink: videoData.storageLink,
              duration: videoData.duration || "5",
              description: videoData.description,
              index: videoData.index,
              isPublic: false, // Privado por defecto
              courseIds: [courseId]
            }
          })
          
          console.log(`   ✅ Video creado exitosamente`)
          console.log(`   ID: ${newVideo.id}`)
          console.log(`   S3 Link: ${newVideo.storageLink}`)
          createdVideoIds.push(newVideo.id)
        }

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`)
      }
    }

    // Actualizar el curso con los nuevos video IDs
    if (createdVideoIds.length > 0) {
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          videoIds: {
            set: [...new Set([...course.videoIds, ...createdVideoIds])]
          }
        },
        include: {
          videos: {
            select: {
              title: true,
              storageLink: true
            }
          }
        }
      })

      console.log('\n' + '─'.repeat(50))
      console.log('✅ Curso actualizado exitosamente')
      console.log(`📊 Total de videos en el curso: ${updatedCourse.videos.length}`)
      console.log('\n📋 Lista de videos:')
      updatedCourse.videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title}`)
        console.log(`      📁 ${v.storageLink}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================
// CONFIGURACIÓN DE VIDEOS
// ============================================

const COURSE_ID = "68a617e896468300160b6dfb" // Power-User en Claude Code

// Videos con enlaces de Tigris/S3
const VIDEOS: VideoData[] = [
  {
    slug: "claude-code-sesion-3-mcp",
    title: "Tercera sesión: MCP y Automatización",
    storageLink: "https://easybits-dev.t3.storage.dev/fixtergeek%40gmail.com/sesion_3_claude.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_dlHabTgwlmwyGi_yyLjBagKyPMEQBTJgsQVdOFCdzrgyaAFZXW%2F20250827%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250827T151619Z&X-Amz-Expires=2592000&X-Amz-SignedHeaders=host&X-Amz-Signature=3949fb25e22268cd2a57400f1345faa9f472aee74ef35c75166021fdcc25c854",
    duration: "120",
    description: "Tercera sesión del taller: MCP (Model Context Protocol) y Automatización avanzada con Claude Code",
    index: 3
  }
]

// ============================================
// EJECUTAR
// ============================================

console.log(`🚀 Añadiendo ${VIDEOS.length} videos al curso "Power-User en Claude Code"`)
console.log('─'.repeat(50))

addVideosToCourse(COURSE_ID, VIDEOS)