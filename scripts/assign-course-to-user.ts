#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignCourseToUser(userEmail: string, courseId: string) {
  try {
    console.log(`🔍 Buscando usuario: ${userEmail}...`)
    
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        courses: true
      }
    })

    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }

    console.log(`👤 Usuario encontrado: ${user.username || user.displayName || user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Cursos actuales: ${user.courses.length}`)

    // Buscar curso
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

    console.log(`📚 Curso encontrado: ${course.title}`)
    console.log(`   ID: ${course.id}`)
    console.log(`   Slug: ${course.slug}`)
    console.log(`   Published: ${course.published}`)
    console.log(`   Price: $${course.basePrice}`)

    // Verificar si el usuario ya tiene el curso
    if (user.courses.includes(courseId)) {
      console.log('⚠️  El usuario ya tiene este curso asignado')
      return
    }

    // Asignar curso al usuario
    console.log(`\n🚀 Asignando curso "${course.title}" al usuario...`)

    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: {
        courses: {
          push: courseId
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        courses: true
      }
    })

    console.log(`✅ Curso asignado exitosamente!`)
    console.log(`   Usuario: ${updatedUser.email}`)
    console.log(`   Total de cursos: ${updatedUser.courses.length}`)
    console.log(`   Nuevo curso ID: ${courseId}`)
    
    console.log(`\n🔗 El usuario ahora puede ver el curso en: /mis-cursos`)
    console.log(`📱 URL del curso: /cursos/${course.slug}/viewer`)

  } catch (error) {
    console.error('❌ Error asignando curso:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Asignar curso "Power-User en Claude Code" a contacto@fixter.org
const USER_EMAIL = "contacto@fixter.org"
const COURSE_ID = "68a617e896468300160b6dfb" // ID del curso recién clonado

console.log('🎯 Asignando curso "Power-User en Claude Code" a contacto@fixter.org...\n')
assignCourseToUser(USER_EMAIL, COURSE_ID)