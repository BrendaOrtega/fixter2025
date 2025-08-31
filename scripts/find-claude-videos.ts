#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COURSE_ID = "68a617e896468300160b6dfb" // Power-User en Claude Code

async function findClaudeVideos() {
  try {
    console.log('🔍 Buscando videos del curso de Claude Code...\n')
    
    // Buscar el curso y sus videos
    const course = await prisma.course.findUnique({
      where: { id: COURSE_ID },
      select: {
        id: true,
        title: true,
        slug: true,
        videoIds: true,
        videos: {
          select: {
            id: true,
            title: true,
            slug: true,
            storageLink: true,
            index: true
          },
          orderBy: {
            index: 'asc'
          }
        }
      }
    })

    if (!course) {
      console.log('❌ Curso no encontrado')
      return
    }

    console.log(`📚 Curso: ${course.title}`)
    console.log(`   ID: ${course.id}`)
    console.log(`   Slug: ${course.slug}`)
    console.log(`   Videos en videoIds: ${course.videoIds.length}`)
    console.log(`   Videos encontrados: ${course.videos.length}\n`)

    console.log('📹 Videos del curso:')
    console.log('─'.repeat(80))
    
    course.videos.forEach((video, i) => {
      console.log(`${i + 1}. ${video.title}`)
      console.log(`   ID: ${video.id}`)
      console.log(`   Slug: ${video.slug}`)
      console.log(`   Index: ${video.index}`)
      console.log(`   URL: ${video.storageLink}`)
      console.log('─'.repeat(80))
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findClaudeVideos()