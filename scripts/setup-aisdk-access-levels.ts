/**
 * Script para configurar los accessLevel de los videos del curso AI-SDK
 *
 * Modelo de acceso:
 * - Videos 1-2 (index 0-1): "public" - sin cuenta
 * - Videos 3-4 (index 2-3): "subscriber" - requiere email
 * - Resto (index 4+): "paid" - requiere compra
 *
 * Uso: npx tsx scripts/setup-aisdk-access-levels.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Configurando accessLevel para videos de AI-SDK...\n");

  // Buscar el curso AI-SDK
  const course = await db.course.findUnique({
    where: { slug: "ai-sdk" },
  });

  if (!course) {
    console.error("Curso AI-SDK no encontrado");
    process.exit(1);
  }

  console.log(`Curso encontrado: ${course.title} (${course.id})\n`);

  // Buscar todos los videos del curso ordenados por index
  const videos = await db.video.findMany({
    where: {
      courseIds: { has: course.id },
    },
    orderBy: { index: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      index: true,
      accessLevel: true,
      isPublic: true,
    },
  });

  console.log(`Videos encontrados: ${videos.length}\n`);

  // Configurar accessLevel según el index (índices empiezan en 1)
  for (const video of videos) {
    const index = video.index ?? 999;
    let newAccessLevel: string;
    let newIsPublic: boolean;

    if (index <= 2) {
      // Videos 1-2 (index 1-2): públicos - sin cuenta
      newAccessLevel = "public";
      newIsPublic = true;
    } else if (index <= 4) {
      // Videos 3-4 (index 3-4): requieren suscripción (email)
      newAccessLevel = "subscriber";
      newIsPublic = false;
    } else {
      // Resto (index 5+): requieren compra
      newAccessLevel = "paid";
      newIsPublic = false;
    }

    // Solo actualizar si cambió
    if (video.accessLevel !== newAccessLevel || video.isPublic !== newIsPublic) {
      await db.video.update({
        where: { id: video.id },
        data: {
          accessLevel: newAccessLevel,
          isPublic: newIsPublic,
        },
      });
      console.log(
        `✓ ${video.index}: "${video.title}" -> ${newAccessLevel} (isPublic: ${newIsPublic})`
      );
    } else {
      console.log(
        `- ${video.index}: "${video.title}" -> ya configurado como ${newAccessLevel}`
      );
    }
  }

  console.log("\n✅ Configuración completada");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
