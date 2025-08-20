#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function replaceCourseWithNewOne() {
  try {
    console.log('🔍 Buscando cursos con el mismo slug...\n')
    
    const courseSlug = "power-user-en-claude-code"
    
    // Buscar todos los cursos con este slug
    const courses = await prisma.course.findMany({
      where: {
        slug: courseSlug
      },
      orderBy: {
        createdAt: 'asc' // Más antiguo primero
      },
      include: {
        videos: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    console.log(`📊 Cursos encontrados: ${courses.length}`)
    courses.forEach((course, i) => {
      console.log(`\n${i + 1}. ${course.title}`)
      console.log(`   ID: ${course.id}`)
      console.log(`   Published: ${course.published}`)
      console.log(`   Price: $${course.basePrice}`)
      console.log(`   Videos: ${course.videos.length}`)
      console.log(`   Created: ${course.createdAt.toISOString()}`)
      if (course.videos.length > 0) {
        course.videos.forEach(v => {
          console.log(`     - ${v.title} (${v.slug})`)
        })
      }
    })

    if (courses.length !== 2) {
      console.log(`\n❌ Se esperaban exactamente 2 cursos, pero se encontraron ${courses.length}`)
      return
    }

    const [oldCourse, newCourse] = courses
    
    console.log('\n' + '─'.repeat(60))
    console.log(`\n🗑️  ELIMINAR: "${oldCourse.title}" (el original sin nuestro contenido)`)
    console.log(`   ID: ${oldCourse.id}`)
    console.log(`   Videos: ${oldCourse.videos.length}`)
    
    console.log(`\n✅ MANTENER: "${newCourse.title}" (con nuestro video)`)
    console.log(`   ID: ${newCourse.id}`)
    console.log(`   Videos: ${newCourse.videos.length}`)
    
    // 1. Eliminar el curso viejo
    console.log('\n🗑️  Eliminando curso original...')
    await prisma.course.delete({
      where: { id: oldCourse.id }
    })
    console.log('✅ Curso original eliminado')

    // 2. Actualizar el curso nuevo: publicarlo y ajustar precio
    console.log('\n📝 Actualizando curso nuevo...')
    const updatedCourse = await prisma.course.update({
      where: { id: newCourse.id },
      data: {
        published: true,  // Publicar
        basePrice: 2490   // Precio correcto
      },
      include: {
        videos: {
          select: {
            title: true,
            slug: true
          }
        }
      }
    })
    
    console.log('\n✅ Curso actualizado exitosamente:')
    console.log(`   Título: ${updatedCourse.title}`)
    console.log(`   Slug: ${updatedCourse.slug}`)
    console.log(`   Published: ${updatedCourse.published} ✅`)
    console.log(`   Precio: $${updatedCourse.basePrice} ✅`)
    console.log(`   Videos: ${updatedCourse.videos.length}`)
    
    if (updatedCourse.videos.length > 0) {
      console.log('\n📹 Videos incluidos:')
      updatedCourse.videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title}`)
      })
    }
    
    console.log('\n🎉 ¡Proceso completado!')
    console.log(`📱 Curso disponible en: /cursos/${updatedCourse.slug}`)
    console.log(`🎬 Viewer: /cursos/${updatedCourse.slug}/viewer`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

replaceCourseWithNewOne()