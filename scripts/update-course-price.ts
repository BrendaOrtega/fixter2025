#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateCoursePrice(courseId: string, newPrice: number) {
  try {
    console.log(`🔍 Actualizando precio del curso: ${courseId}...`)
    
    // Buscar curso actual
    const currentCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        slug: true,
        basePrice: true,
        published: true
      }
    })

    if (!currentCourse) {
      console.log('❌ Curso no encontrado')
      return
    }

    console.log(`📚 Curso encontrado: ${currentCourse.title}`)
    console.log(`   Precio actual: $${currentCourse.basePrice}`)
    console.log(`   Nuevo precio: $${newPrice}`)

    // Actualizar precio
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        basePrice: newPrice
      },
      select: {
        id: true,
        title: true,
        slug: true,
        basePrice: true,
        published: true
      }
    })

    console.log(`✅ Precio actualizado exitosamente!`)
    console.log(`   Curso: ${updatedCourse.title}`)
    console.log(`   Slug: ${updatedCourse.slug}`)
    console.log(`   Nuevo precio: $${updatedCourse.basePrice}`)
    console.log(`   Published: ${updatedCourse.published}`)

  } catch (error) {
    console.error('❌ Error actualizando precio:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Actualizar precio del curso "Power-User en Claude Code" a $2490
const COURSE_ID = "68a617e896468300160b6dfb"
const NEW_PRICE = 2490

console.log('💰 Actualizando precio de "Power-User en Claude Code" a $2490...\n')
updateCoursePrice(COURSE_ID, NEW_PRICE)