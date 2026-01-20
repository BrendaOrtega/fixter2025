#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📝 Actualizando título y slug del curso...\n')

  const course = await prisma.course.findUnique({
    where: { slug: 'retos-react' },
    select: {
      id: true,
      title: true,
      slug: true,
      basePrice: true,
    }
  })

  if (!course) {
    console.log('❌ Curso no encontrado')
    return
  }

  console.log(`📚 Curso encontrado:`)
  console.log(`   Título actual: ${course.title}`)
  console.log(`   Slug actual: ${course.slug}`)

  const updated = await prisma.course.update({
    where: { slug: 'retos-react' },
    data: {
      title: 'Props en React: El Reto del Botón',
      slug: 'props-react-reto-boton',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      basePrice: true,
    }
  })

  console.log(`\n✅ Curso actualizado!`)
  console.log(`   Nuevo título: ${updated.title}`)
  console.log(`   Nuevo slug: ${updated.slug}`)
  console.log(`   Precio: $${updated.basePrice} MXN`)
  console.log(`\n🔗 Nueva URL: /cursos/${updated.slug}`)

  await prisma.$disconnect()
}

main().catch(console.error)
