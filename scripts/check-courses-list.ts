#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCoursesList() {
  try {
    console.log('🔍 Verificando lista de cursos publicados...\n')
    
    // Obtener todos los cursos publicados (lo mismo que hace /cursos)
    const publishedCourses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        published: true,
      },
      select: {
        title: true,
        duration: true,
        icon: true,
        isFree: true,
        createdAt: true,
        level: true,
        videoIds: true,
        id: true,
        slug: true,
        published: true,
        basePrice: true,
      },
    })

    console.log(`📊 Cursos publicados encontrados: ${publishedCourses.length}\n`)
    
    if (publishedCourses.length === 0) {
      console.log('❌ No hay cursos publicados')
      return
    }

    publishedCourses.forEach((course, i) => {
      console.log(`${i + 1}. ${course.title}`)
      console.log(`   Slug: ${course.slug}`)
      console.log(`   Published: ${course.published ? '✅' : '❌'}`)
      console.log(`   Price: $${course.basePrice}`)
      console.log(`   Level: ${course.level || 'No especificado'}`)
      console.log(`   Videos: ${course.videoIds.length}`)
      console.log(`   Free: ${course.isFree ? 'Sí' : 'No'}`)
      console.log(`   Created: ${course.createdAt.toLocaleDateString()}`)
      console.log(`   URL: /cursos/${course.slug}`)
      console.log('')
    })

    // Verificar específicamente el curso de Claude Code
    console.log('🎯 Verificando curso Power-User en Claude Code específicamente...')
    const claudeCourse = publishedCourses.find(c => c.slug === 'power-user-en-claude-code')
    
    if (claudeCourse) {
      console.log('✅ Curso Power-User en Claude Code SÍ aparece en la lista')
      console.log(`   Posición en lista: ${publishedCourses.indexOf(claudeCourse) + 1}`)
    } else {
      console.log('❌ Curso Power-User en Claude Code NO aparece en la lista')
      
      // Buscar si existe pero no está publicado
      const unpublishedClaude = await prisma.course.findUnique({
        where: { slug: 'power-user-en-claude-code' },
        select: { published: true, title: true }
      })
      
      if (unpublishedClaude) {
        console.log(`   El curso existe pero published: ${unpublishedClaude.published}`)
      }
    }

    // Verificar que no exista el curso viejo
    console.log('\n🔍 Verificando que no exista el curso viejo...')
    const oldCourse = await prisma.course.findUnique({
      where: { slug: 'domina_claude_code' }
    })
    
    if (oldCourse) {
      console.log('⚠️  El curso viejo "domina_claude_code" AÚN EXISTE')
      console.log(`   Published: ${oldCourse.published}`)
    } else {
      console.log('✅ El curso viejo "domina_claude_code" ya no existe')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCoursesList()