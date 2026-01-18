/**
 * Rollback: Revertir videos de animaciones al formato interno
 */
import { db } from "../app/.server/db";

const ANIMATION_COURSE_ID = "645d3dbd668b73b34443789c";

async function main() {
  console.log("🔄 Revirtiendo migración de videos de animaciones...\n");

  const videos = await db.video.findMany({
    where: { courseIds: { has: ANIMATION_COURSE_ID } },
    select: { id: true, title: true, storageLink: true },
  });

  let reverted = 0;

  for (const video of videos) {
    const { id, title, storageLink } = video;

    // Solo revertir si tiene formato S3 key
    if (!storageLink || !storageLink.startsWith("fixtergeek/")) {
      continue;
    }

    // Extraer el storageKey del path S3
    const match = storageLink.match(/fixtergeek\/videos\/(video-[^\/]+)/);
    if (!match) continue;

    const storageKey = match[1];
    const originalStorageLink = `/videos?storageKey=${storageKey}`;

    console.log(`🔄 ${title}`);
    console.log(`   Antes:   ${storageLink}`);
    console.log(`   Después: ${originalStorageLink}`);

    await db.$runCommandRaw({
      update: "videos",
      updates: [
        {
          q: { _id: { $oid: id } },
          u: { $set: { storageLink: originalStorageLink } }
        }
      ]
    });
    
    console.log(`   ✅ Revertido`);
    reverted++;
  }

  console.log(`\n📊 Revertidos: ${reverted} videos`);
  await db.$disconnect();
}

main().catch(console.error);
