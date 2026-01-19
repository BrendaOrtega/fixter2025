import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixPongUrls() {
  // Find the Pong course
  const pongCourse = await prisma.course.findFirst({
    where: { slug: "pong-vanilla-js" },
    select: { id: true, title: true },
  });

  if (!pongCourse) {
    console.log("❌ Pong course not found");
    return;
  }

  console.log(`✅ Found course: ${pongCourse.title} (${pongCourse.id})`);

  // Find all videos for this course
  const videos = await prisma.video.findMany({
    where: { courseIds: { has: pongCourse.id } },
    select: { id: true, title: true, storageLink: true },
  });

  console.log(`\n📹 Found ${videos.length} videos\n`);

  let updatedCount = 0;

  for (const video of videos) {
    console.log(`Video: ${video.title}`);
    console.log(`  Current URL: ${video.storageLink}`);

    if (video.storageLink?.includes("wild-bird-2039.t3.storage.dev")) {
      const newUrl = video.storageLink.replace(
        "https://wild-bird-2039.t3.storage.dev/",
        "https://fly.storage.tigris.dev/wild-bird-2039/"
      );

      console.log(`  New URL: ${newUrl}`);

      await prisma.video.update({
        where: { id: video.id },
        data: { storageLink: newUrl },
      });

      console.log(`  ✅ Updated!\n`);
      updatedCount++;
    } else {
      console.log(`  ⏭️ Skipped (format OK)\n`);
    }
  }

  console.log(`\n🎉 Updated ${updatedCount} videos`);
}

fixPongUrls()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
