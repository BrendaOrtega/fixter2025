#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('💰 Actualizando precio de "Retos de React" a $150 MXN...\n')

  const course = await prisma.course.findUnique({
    where: { slug: 'retos-react' },
    select: {
      id: true,
      title: true,
      slug: true,
      basePrice: true,
      isFree: true,
      published: true
    }
  })

  if (!course) {
    console.log('❌ Curso no encontrado')
    return
  }

  console.log(`📚 Curso encontrado: ${course.title}`)
  console.log(`   Precio actual: $${course.basePrice}`)
  console.log(`   isFree: ${course.isFree}`)

  const updated = await prisma.course.update({
    where: { slug: 'retos-react' },
    data: {
      basePrice: 150,
      isFree: false
    },
    select: {
      id: true,
      title: true,
      slug: true,
      basePrice: true,
      isFree: true,
      published: true
    }
  })

  console.log(`\n✅ Precio actualizado!`)
  console.log(`   Curso: ${updated.title}`)
  console.log(`   Nuevo precio: $${updated.basePrice} MXN`)
  console.log(`   isFree: ${updated.isFree}`)
  console.log(`   Published: ${updated.published}`)

  await prisma.$disconnect()
}

main().catch(console.error)
