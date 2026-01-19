import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findProblematicCourses() {
  // Find all videos with t3.storage.dev URLs (wrong format)
  const problematicVideos = await prisma.video.findMany({
    where: {
      storageLink: { contains: "t3.storage.dev" },
    },
    select: { id: true, title: true, storageLink: true, courseIds: true },
  });

  console.log("=== Videos con URLs problemáticas (t3.storage.dev) ===\n");
  console.log("Total:", problematicVideos.length, "videos\n");

  // Get unique course IDs
  const courseIds = [...new Set(problematicVideos.flatMap((v) => v.courseIds))];

  // Get course details
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true, slug: true },
  });

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  // Group by course
  const byCourse = new Map<string, typeof problematicVideos>();
  for (const video of problematicVideos) {
    for (const courseId of video.courseIds) {
      const existing = byCourse.get(courseId) || [];
      existing.push(video);
      byCourse.set(courseId, existing);
    }
  }

  for (const [courseId, videos] of byCourse) {
    const course = courseMap.get(courseId);
    console.log(`📚 ${course?.title || "Unknown"}`);
    console.log(`   Slug: ${course?.slug}`);
    console.log(`   Videos: ${videos.length}`);
    console.log(`   Ejemplo: ${videos[0].storageLink}\n`);
  }

  // Also check for Firebase courses specifically
  console.log("\n=== Buscando cursos de Firebase ===\n");
  const firebaseCourses = await prisma.course.findMany({
    where: {
      OR: [
        { title: { contains: "Firebase", mode: "insensitive" } },
        { slug: { contains: "firebase" } },
      ],
    },
    select: { id: true, title: true, slug: true },
  });

  for (const course of firebaseCourses) {
    const videos = await prisma.video.findMany({
      where: { courseIds: { has: course.id } },
      select: { id: true, title: true, storageLink: true },
    });

    console.log(`🔥 ${course.title}`);
    console.log(`   Slug: ${course.slug}`);
    console.log(`   Videos: ${videos.length}`);
    if (videos.length > 0 && videos[0].storageLink) {
      console.log(`   Ejemplo URL: ${videos[0].storageLink}`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

findProblematicCourses().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
