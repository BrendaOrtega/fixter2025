#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cloneCourse(originalCourseId: string, newSlug: string, newTitle: string) {
  try {
    console.log(`🔍 Buscando curso original: ${originalCourseId}...`)
    
    // Obtener curso original con todas sus relaciones
    const originalCourse = await prisma.course.findUnique({
      where: { id: originalCourseId },
      include: {
        videos: true,
        Modules: true,
        Users: true
      }
    })

    if (!originalCourse) {
      console.log('❌ Curso no encontrado')
      return
    }

    console.log(`📋 Curso encontrado: ${originalCourse.title}`)
    console.log(`   Published: ${originalCourse.published}`)
    console.log(`   IsLive: ${originalCourse.isLive}`)
    console.log(`   Videos: ${originalCourse.videos.length}`)
    console.log(`   Modules: ${originalCourse.Modules.length}`)
    console.log(`   Enrolled users: ${originalCourse.Users.length}`)

    // Verificar que el nuevo slug no exista
    const existingCourse = await prisma.course.findUnique({
      where: { slug: newSlug }
    })

    if (existingCourse) {
      console.log(`❌ Ya existe un curso con slug: ${newSlug}`)
      return
    }

    console.log(`\n🚀 Clonando curso como "${newTitle}" (${newSlug})...`)

    // Crear curso clonado
    const clonedCourse = await prisma.course.create({
      data: {
        slug: newSlug,
        title: newTitle,
        isFree: originalCourse.isFree,
        published: false, // Por defecto no publicado
        basePrice: originalCourse.basePrice,
        stripeCoupon: originalCourse.stripeCoupon,
        stripeId: null, // Nuevo curso, nuevo stripe ID
        icon: originalCourse.icon,
        poster: originalCourse.poster,
        isLive: originalCourse.isLive,
        summary: originalCourse.summary,
        authorAt: originalCourse.authorAt,
        authorDescription: originalCourse.authorDescription,
        authorName: originalCourse.authorName,
        authorSocial: originalCourse.authorSocial,
        banner: originalCourse.banner,
        classTime: originalCourse.classTime,
        description: originalCourse.description,
        duration: originalCourse.duration,
        level: originalCourse.level,
        logos: originalCourse.logos,
        meta: originalCourse.meta,
        offer: originalCourse.offer,
        photoUrl: originalCourse.photoUrl,
        tipo: originalCourse.tipo,
        tool: originalCourse.tool,
        trailer: originalCourse.trailer,
        version: originalCourse.version,
        theme: originalCourse.theme,
        startDate: null, // Nueva fecha será asignada después
        module: originalCourse.module,
        videoIds: originalCourse.videoIds, // Copiar referencias a videos
        modules: originalCourse.modules, // Copiar referencias a módulos
        userIds: [] // Nuevo curso sin usuarios
      }
    })

    console.log(`✅ Curso clonado exitosamente!`)
    console.log(`   Nuevo ID: ${clonedCourse.id}`)
    console.log(`   Slug: ${clonedCourse.slug}`)
    console.log(`   Title: ${clonedCourse.title}`)
    console.log(`   Published: ${clonedCourse.published}`)
    
    return clonedCourse

  } catch (error) {
    console.error('❌ Error clonando curso:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejemplo de uso - clonar el curso "Introducción a Tailwind"
const ORIGINAL_COURSE_ID = "64fba494944b3ed06271aab8"
const NEW_SLUG = "power-user-en-claude-code"
const NEW_TITLE = "Power-User en Claude Code"

console.log('🎯 Clonando curso como "Power-User en Claude Code"...\n')
cloneCourse(ORIGINAL_COURSE_ID, NEW_SLUG, NEW_TITLE)