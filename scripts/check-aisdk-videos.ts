import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const course = await db.course.findUnique({ where: { slug: "ai-sdk" } });
  if (!course) {
    console.log("Curso no encontrado");
    return;
  }

  const videos = await db.video.findMany({
    where: { courseIds: { has: course.id } },
    orderBy: { index: "asc" },
    select: {
      index: true,
      title: true,
      accessLevel: true,
      isPublic: true,
      storageLink: true
    }
  });

  console.log("\nVideos del curso AI-SDK:\n");
  videos.forEach(v => {
    const hasLink = v.storageLink ? "✓" : "✗";
    console.log(`${v.index}: ${v.accessLevel || "undefined"} | isPublic: ${v.isPublic} | link: ${hasLink} | ${v.title}`);
  });
}

main().finally(() => db.$disconnect());
