#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findUnpublishedCourses() {
  try {
    console.log('🔍 Buscando cursos no publicados...\n')
    
    // Buscar cursos con published: false
    const unpublishedCourses = await prisma.course.findMany({
      where: {
        published: false
      },
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        isLive: true,
        isFree: true,
        basePrice: true,
        createdAt: true,
        Users: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true
          }
        }
      }
    })

    console.log(`📊 Encontrados ${unpublishedCourses.length} cursos no publicados:\n`)
    
    unpublishedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title}`)
      console.log(`   ID: ${course.id}`)
      console.log(`   Slug: ${course.slug}`)
      console.log(`   Published: ${course.published}`)
      console.log(`   IsLive: ${course.isLive}`)
      console.log(`   IsFree: ${course.isFree}`)
      console.log(`   Price: $${course.basePrice}`)
      console.log(`   Users enrolled: ${course.Users.length}`)
      console.log(`   Created: ${course.createdAt.toISOString()}`)
      console.log('   ---')
    })

    // También buscar cursos que podrían ser candidatos (isLive: true)
    console.log('\n🎥 Cursos en vivo (candidatos para clonar):')
    const liveCourses = await prisma.course.findMany({
      where: {
        isLive: true
      },
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        isLive: true,
        Users: {
          select: {
            id: true
          }
        }
      }
    })

    liveCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.published ? 'PUBLICADO' : 'NO PUBLICADO'})`)
      console.log(`   ID: ${course.id}`)
      console.log(`   Enrolled: ${course.Users.length} usuarios`)
      console.log('   ---')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findUnpublishedCourses()