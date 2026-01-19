// scripts/fix-animaciones-urls.ts
// Corrige las rutas de storageLink y m3u8 para los videos del curso de Animaciones

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COURSE_ID = "645d3dbd668b73b34443789c";

async function fix() {
  console.log("🔍 Buscando videos del curso de Animaciones...\n");

  const videos = await db.video.findMany({
    where: { courseIds: { has: COURSE_ID } },
    select: { id: true, storageLink: true, m3u8: true, title: true },
  });

  console.log(`📹 Encontrados ${videos.length} videos\n`);

  let updated = 0;
  let skipped = 0;

  for (const v of videos) {
    // Solo actualizar si storageLink no tiene el prefijo correcto
    if (v.storageLink && !v.storageLink.startsWith("animaciones/")) {
      const videoId = v.storageLink; // video-xxx
      await db.video.update({
        where: { id: v.id },
        data: {
          storageLink: `animaciones/${videoId}`,
          m3u8: `animaciones/chunks/${videoId}/720p.m3u8`,
        },
      });
      console.log(`✅ ${v.title}`);
      console.log(`   storageLink: animaciones/${videoId}`);
      console.log(`   m3u8: animaciones/chunks/${videoId}/720p.m3u8\n`);
      updated++;
    } else {
      console.log(`⏭️  Saltado (ya tiene prefijo): ${v.title}`);
      skipped++;
    }
  }

  console.log("\n📊 Resumen:");
  console.log(`   Actualizados: ${updated}`);
  console.log(`   Saltados: ${skipped}`);
  console.log(`   Total: ${videos.length}`);

  await db.$disconnect();
}

fix().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
