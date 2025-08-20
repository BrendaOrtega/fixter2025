#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignCourseToMultipleUsers(userEmails: string[], courseId: string) {
  console.log(`🎯 Asignando curso a ${userEmails.length} usuarios...\n`)
  
  // Buscar el curso primero
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      basePrice: true
    }
  })

  if (!course) {
    console.log('❌ Curso no encontrado')
    return
  }

  console.log(`📚 Curso: ${course.title}`)
  console.log(`   ID: ${course.id}`)
  console.log(`   Slug: ${course.slug}`)
  console.log(`   Published: ${course.published}`)
  console.log(`   Price: $${course.basePrice}\n`)
  console.log('─'.repeat(50))

  let successCount = 0
  let errorCount = 0
  let alreadyHadCount = 0

  for (const email of userEmails) {
    console.log(`\n👤 Procesando: ${email}`)
    
    try {
      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          courses: true
        }
      })

      if (!user) {
        console.log(`   ❌ Usuario no encontrado: ${email}`)
        errorCount++
        continue
      }

      // Verificar si ya tiene el curso
      if (user.courses.includes(courseId)) {
        console.log(`   ⚠️  Ya tiene el curso`)
        alreadyHadCount++
        continue
      }

      // Asignar curso
      await prisma.user.update({
        where: { email },
        data: {
          courses: {
            push: courseId
          }
        }
      })

      console.log(`   ✅ Curso asignado exitosamente`)
      successCount++

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('📊 Resumen:')
  console.log(`   ✅ Asignados exitosamente: ${successCount}`)
  console.log(`   ⚠️  Ya tenían el curso: ${alreadyHadCount}`)
  console.log(`   ❌ Errores: ${errorCount}`)
  console.log(`   📋 Total procesados: ${userEmails.length}`)
  
  if (successCount > 0) {
    console.log(`\n🔗 Los usuarios ahora pueden ver el curso en: /mis-cursos`)
    console.log(`📱 URL del curso: /cursos/${course.slug}/viewer`)
  }
}

// Lista de usuarios a los que asignar el curso
const USERS = [
  "contacto@fixter.org",      // Ya lo tiene, será skipped
  "oswaldinho963@gmail.com",
  "bernardinoveronica@gmail.com",
  "maguz.ricardo@gmail.com",
  "elcfm1@gmail.com",
  "brenda@fixter.org"
]

// ID del curso "Power-User en Claude Code"
const COURSE_ID = "68a617e896468300160b6dfb"

// Ejecutar
assignCourseToMultipleUsers(USERS, COURSE_ID)
  .catch(console.error)
  .finally(() => prisma.$disconnect())