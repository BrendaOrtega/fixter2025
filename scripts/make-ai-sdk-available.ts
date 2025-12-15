#!/usr/bin/env npx tsx
import { db } from "../app/.server/db";

async function main() {
  // Find AI SDK course
  const aiSdkCourse = await db.course.findFirst({
    where: {
      OR: [
        { slug: "ai-sdk" },
        { title: { contains: "AI SDK" } },
        { title: { contains: "ai sdk" } }
      ]
    }
  });

  if (!aiSdkCourse) {
    console.log("❌ No se encontró el curso AI SDK");
    
    // List all courses with tipo="proximamente" to help identify it
    const proximamenteCourses = await db.course.findMany({
      where: { tipo: "proximamente" },
      select: { id: true, title: true, slug: true }
    });
    
    if (proximamenteCourses.length > 0) {
      console.log("\n📚 Cursos con tipo='proximamente':");
      proximamenteCourses.forEach(course => {
        console.log(`  - ${course.title} (slug: ${course.slug}, id: ${course.id})`);
      });
    }
    return;
  }

  console.log(`✅ Curso encontrado: ${aiSdkCourse.title} (${aiSdkCourse.slug})`);
  
  // Update tipo to null to make it accessible
  if (aiSdkCourse.tipo === "proximamente") {
    await db.course.update({
      where: { id: aiSdkCourse.id },
      data: { tipo: null }
    });
    console.log("🚀 Curso AI SDK ahora es accesible (tipo: null)");
  } else {
    console.log(`ℹ️  El curso ya estaba accesible (tipo: ${aiSdkCourse.tipo || 'null'})`);
  }
  
  // Verify the course has videos or create placeholder
  const videos = await db.video.findMany({
    where: { courseIds: { has: aiSdkCourse.id } }
  });
  
  console.log(`\n📹 Videos asociados: ${videos.length}`);
  
  if (videos.length === 0) {
    console.log("⚠️  No hay videos asociados al curso AI SDK");
    console.log("💡 Recuerda subir el primer video a través del admin");
  } else {
    videos.forEach(v => {
      console.log(`  - ${v.title} (${v.m3u8 ? 'HLS' : v.storageLink ? 'Direct' : 'Sin URL'})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));