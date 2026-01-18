/**
 * Script para migrar los videos del curso de animaciones
 * de formato interno (/videos?storageKey=...) a S3 key directo
 *
 * Esto permite que useVideoPlayer use el proxy HLS directamente
 * sin necesidad de pasar por la ruta /videos
 *
 * Uso:
 *   npx tsx scripts/migrate-animation-videos.ts --dry-run  # Ver cambios sin aplicar
 *   npx tsx scripts/migrate-animation-videos.ts            # Aplicar cambios
 */

import { db } from "../app/.server/db";

const ANIMATION_COURSE_ID = "645d3dbd668b73b34443789c";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n🎬 Migración de videos de animaciones`);
  console.log(`   Modo: ${isDryRun ? "DRY RUN (sin cambios)" : "APLICAR CAMBIOS"}`);
  console.log(`   Curso ID: ${ANIMATION_COURSE_ID}\n`);

  // Obtener todos los videos del curso
  // Nota: No seleccionamos m3u8 porque algunos tienen datos corruptos (array en vez de string)
  const videos = await db.video.findMany({
    where: { courseIds: { has: ANIMATION_COURSE_ID } },
    select: {
      id: true,
      title: true,
      storageLink: true,
    },
  });

  console.log(`📋 Encontrados ${videos.length} videos\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const video of videos) {
    const { id, title, storageLink } = video;

    // Skip si no tiene storageLink
    if (!storageLink) {
      console.log(`⏭️  ${title}: Sin storageLink, saltando`);
      skipped++;
      continue;
    }

    // Skip si ya es un S3 key directo (no empieza con / ni http)
    if (!storageLink.startsWith("/") && !storageLink.startsWith("http")) {
      console.log(`✅ ${title}: Ya es S3 key directo`);
      skipped++;
      continue;
    }

    // Extraer el storageKey del formato interno
    // Formatos: /videos?storageKey=video-xxx o /files?storageKey=video-xxx
    const match = storageLink.match(/storageKey=([^&]+)/);
    if (!match) {
      console.log(`❌ ${title}: No se pudo extraer storageKey de "${storageLink}"`);
      errors++;
      continue;
    }

    const storageKey = match[1];
    // El S3 key completo será: fixtergeek/videos/{storageKey}
    // (la ruta /videos ya añade el prefijo fixtergeek/)
    const newStorageLink = `fixtergeek/videos/${storageKey}`;

    console.log(`🔄 ${title}`);
    console.log(`   Antes:   ${storageLink}`);
    console.log(`   Después: ${newStorageLink}`);

    if (!isDryRun) {
      try {
        // Usar operación raw de MongoDB para evitar validación de Prisma
        // (algunos videos tienen m3u8 corrupto como array)
        await db.$runCommandRaw({
          update: "videos",
          updates: [
            {
              q: { _id: { $oid: id } },
              u: {
                $set: { storageLink: newStorageLink },
                $unset: { m3u8: "" } // Limpiar campo corrupto
              }
            }
          ]
        });
        console.log(`   ✅ Actualizado`);
        migrated++;
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
        errors++;
      }
    } else {
      migrated++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Migrados: ${migrated}`);
  console.log(`   Saltados: ${skipped}`);
  console.log(`   Errores:  ${errors}`);

  if (isDryRun) {
    console.log(`\n💡 Ejecuta sin --dry-run para aplicar los cambios`);
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
