#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteOldClaudeCourse() {
  try {
    console.log('🔍 Buscando el curso "Domina Claude Code"...\n')
    
    // Buscar el curso por slug
    const oldCourse = await prisma.course.findUnique({
      where: {
        slug: "domina_claude_code"
      },
      include: {
        videos: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        Users: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    })

    if (!oldCourse) {
      console.log('❌ No se encontró curso con slug "domina_claude_code"')
      
      // Buscar por título similar
      console.log('\n🔍 Buscando por título similar...')
      const similarCourses = await prisma.course.findMany({
        where: {
          OR: [
            { title: { contains: "Claude", mode: 'insensitive' } },
            { title: { contains: "Domina", mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          slug: true,
          title: true,
          published: true,
          createdAt: true
        }
      })
      
      console.log(`\n📋 Cursos similares encontrados: ${similarCourses.length}`)
      similarCourses.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.title}`)
        console.log(`      Slug: ${c.slug}`)
        console.log(`      Published: ${c.published}`)
        console.log(`      Created: ${c.createdAt.toISOString()}`)
      })
      
      return
    }

    console.log('📚 Curso encontrado:')
    console.log(`   Título: ${oldCourse.title}`)
    console.log(`   Slug: ${oldCourse.slug}`)
    console.log(`   ID: ${oldCourse.id}`)
    console.log(`   Published: ${oldCourse.published}`)
    console.log(`   Price: $${oldCourse.basePrice}`)
    console.log(`   Videos: ${oldCourse.videos.length}`)
    console.log(`   Usuarios asignados: ${oldCourse.Users.length}`)

    if (oldCourse.videos.length > 0) {
      console.log('\n📹 Videos del curso:')
      oldCourse.videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title} (${v.slug})`)
      })
    }

    if (oldCourse.Users.length > 0) {
      console.log('\n👥 Usuarios que lo tienen:')
      oldCourse.Users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.username || 'sin username'})`)
      })
    }

    console.log('\n⚠️  IMPORTANTE: Este curso será eliminado permanentemente.')
    console.log('   - Se perderán todas las relaciones con usuarios')
    console.log('   - Los videos se mantendrán en la base de datos')
    
    console.log('\n🗑️  Procediendo a eliminar el curso...')
    
    // Eliminar el curso (las relaciones se eliminan automáticamente)
    await prisma.course.delete({
      where: { id: oldCourse.id }
    })
    
    console.log('✅ Curso eliminado exitosamente!')
    console.log('\n📊 Resumen:')
    console.log(`   ❌ Eliminado: "${oldCourse.title}"`)
    console.log(`   🔗 URL antigua: /cursos/${oldCourse.slug}/detalle`)
    console.log(`   👥 Usuarios afectados: ${oldCourse.Users.length}`)
    
    console.log('\n🎯 Curso actual activo:')
    console.log(`   ✅ "Power-User en Claude Code"`)
    console.log(`   🔗 URL nueva: /cursos/power-user-en-claude-code`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteOldClaudeCourse()