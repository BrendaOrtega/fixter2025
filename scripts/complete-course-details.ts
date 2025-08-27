#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function completeCourseDetails() {
  try {
    console.log('📝 Completando detalles del curso Power-User en Claude Code...\n')
    
    const courseId = "68a617e896468300160b6dfb"
    
    // Datos completos del curso
    const courseData = {
      published: true,
      basePrice: 2490,
      summary: "Domina Claude Code y conviértete en un desarrollador 10x más productivo. Aprende las técnicas avanzadas de prompting, context management y automatización que usan los profesionales.",
      description: `# Power-User en Claude Code

## Conviértete en un desarrollador 10x más productivo

Este taller intensivo te enseña las técnicas avanzadas que necesitas para dominar Claude Code y transformar tu flujo de desarrollo.

## ¿Qué aprenderás?

### 🎯 Fundamentos y Context Management
- Técnicas avanzadas de prompting para mejores resultados
- Gestión eficiente del contexto y memoria del proyecto
- Estrategias para conversaciones largas y complejas

### ⚡ Productividad Extrema
- Workflows de desarrollo optimizados
- Automatización de tareas repetitivas
- Shortcuts y trucos de poder-usuario

### 🛠️ Herramientas y Integraciones
- SDK y scripting avanzado
- Subagentes y delegación de tareas
- MCP (Model Context Protocol) y automatización

## Para quién es este curso

- **Desarrolladores** que quieren acelerar su productividad
- **Tech leads** que buscan optimizar sus equipos
- **Emprendedores** que necesitan desarrollar más rápido
- **Estudiantes** que quieren ventaja competitiva

## Lo que obtienes

- 🎥 **Videos paso a paso** con ejemplos reales
- 📚 **Guías y recursos** descargables
- 💬 **Acceso a la comunidad** privada
- 🔄 **Actualizaciones de por vida**

## Precio especial de lanzamiento

**$2,490 MXN** (valor regular $4,990 MXN)

¡Transforma tu manera de desarrollar software hoy mismo!`,
      
      authorName: "Héctorbliss",
      authorDescription: "Full-stack developer con más de 10 años de experiencia. Fundador de FixterGeek y experto en herramientas de IA para desarrollo.",
      level: "Intermedio-Avanzado",
      duration: "2+ horas",
      tipo: "Taller",
      tool: "Claude Code",
      version: "2025.1",
      banner: "/images/claude-code-banner.jpg",
      photoUrl: "/images/claude-code-poster.jpg",
      poster: "/images/claude-code-poster.jpg",
      meta: "claude code, ai development, productivity, automation, prompting",
    }
    
    console.log('📋 Datos a actualizar:')
    console.log(`   Published: ${courseData.published}`)
    console.log(`   Precio: $${courseData.basePrice}`)
    console.log(`   Autor: ${courseData.authorName}`)
    console.log(`   Nivel: ${courseData.level}`)
    console.log(`   Duración: ${courseData.duration}`)
    console.log(`   Tipo: ${courseData.tipo}`)
    
    // Actualizar el curso
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: courseData,
      include: {
        videos: {
          select: {
            title: true,
            slug: true,
            duration: true
          }
        }
      }
    })
    
    console.log('\n✅ Curso actualizado exitosamente!')
    console.log(`   Título: ${updatedCourse.title}`)
    console.log(`   Slug: ${updatedCourse.slug}`)
    console.log(`   Published: ${updatedCourse.published ? '✅ PUBLICADO' : '❌ No publicado'}`)
    console.log(`   Precio: $${updatedCourse.basePrice}`)
    console.log(`   Videos: ${updatedCourse.videos.length}`)
    
    if (updatedCourse.videos.length > 0) {
      console.log('\n📹 Contenido del curso:')
      updatedCourse.videos.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title} (${v.duration}min)`)
      })
    }
    
    console.log('\n🎉 ¡Curso listo para la venta!')
    console.log(`🛒 Disponible en el catálogo: /cursos`)
    console.log(`📱 Página del curso: /cursos/${updatedCourse.slug}`)
    console.log(`🎬 Viewer: /cursos/${updatedCourse.slug}/viewer`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeCourseDetails()