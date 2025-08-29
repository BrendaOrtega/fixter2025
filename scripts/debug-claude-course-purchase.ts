import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugClaudeCourse() {
  try {
    console.log("🔍 Debugging del problema de asignación del curso de Claude Code\n");
    console.log("=" .repeat(60));
    
    // 1. Verificar que el curso existe y está publicado
    console.log("\n1️⃣ Verificando el curso en la base de datos:");
    const course = await prisma.course.findUnique({
      where: { slug: "power-user-en-claude-code" },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        isFree: true,
        stripeId: true,
        basePrice: true,
        createdAt: true,
      }
    });
    
    if (!course) {
      console.log("❌ ERROR: El curso NO existe con el slug 'power-user-en-claude-code'");
      
      // Buscar cursos similares
      const similarCourses = await prisma.course.findMany({
        where: {
          OR: [
            { title: { contains: "Claude" } },
            { slug: { contains: "claude" } }
          ]
        },
        select: {
          title: true,
          slug: true,
          published: true
        }
      });
      
      console.log("\n📚 Cursos relacionados con Claude encontrados:");
      similarCourses.forEach(c => {
        console.log(`   - ${c.title} (slug: ${c.slug}, published: ${c.published})`);
      });
      
      return;
    }
    
    console.log(`   ✅ Curso encontrado: ${course.title}`);
    console.log(`   - ID: ${course.id}`);
    console.log(`   - Slug: ${course.slug}`);
    console.log(`   - Publicado: ${course.published ? "✅ SÍ" : "❌ NO"}`);
    console.log(`   - Precio: ${course.isFree ? "GRATIS" : `$${course.basePrice} MXN`}`);
    console.log(`   - Stripe ID: ${course.stripeId || "NO CONFIGURADO"}`);
    
    if (!course.published) {
      console.log("\n⚠️  PROBLEMA ENCONTRADO: El curso NO está publicado");
      console.log("   Esto impediría que aparezca en listados pero NO debería impedir la asignación");
    }
    
    // 2. Verificar usuarios que deberían tener el curso
    console.log("\n2️⃣ Verificando usuarios con el curso asignado:");
    const usersWithCourse = await prisma.user.findMany({
      where: {
        courses: { has: course.id }
      },
      select: {
        email: true,
        displayName: true,
        createdAt: true,
        courses: true
      }
    });
    
    console.log(`   Total de usuarios con el curso: ${usersWithCourse.length}`);
    if (usersWithCourse.length > 0) {
      console.log("\n   Últimos 5 usuarios:");
      usersWithCourse.slice(-5).forEach(u => {
        console.log(`   - ${u.email} (${u.displayName || "sin nombre"})`);
        console.log(`     Total de cursos: ${u.courses.length}`);
      });
    }
    
    // 3. Verificar usuarios que compraron ayer
    console.log("\n3️⃣ Verificando compras recientes (últimas 48 horas):");
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const recentUsers = await prisma.user.findMany({
      where: {
        OR: [
          { createdAt: { gte: twoDaysAgo } },
          { updatedAt: { gte: twoDaysAgo } }
        ]
      },
      select: {
        email: true,
        displayName: true,
        courses: true,
        tags: true,
        metadata: true,
        webinar: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    });
    
    console.log(`   Usuarios creados/actualizados recientemente: ${recentUsers.length}`);
    
    recentUsers.forEach(u => {
      const hasCourse = u.courses.includes(course.id);
      const hasMetadata = u.metadata && Object.keys(u.metadata).length > 0;
      const hasWebinar = u.webinar && Object.keys(u.webinar).length > 0;
      const isClaudeRelated = u.tags?.some(t => t.includes("claude"));
      
      if (isClaudeRelated || hasMetadata || hasWebinar || hasCourse) {
        console.log(`\n   👤 ${u.email}`);
        console.log(`      - Nombre: ${u.displayName || "sin nombre"}`);
        console.log(`      - Tiene curso Claude: ${hasCourse ? "✅ SÍ" : "❌ NO"}`);
        console.log(`      - Total cursos: ${u.courses.length}`);
        if (hasMetadata) {
          console.log(`      - Metadata: ${JSON.stringify(u.metadata, null, 2)}`);
        }
        if (hasWebinar) {
          console.log(`      - Webinar data: ${JSON.stringify(u.webinar, null, 2)}`);
        }
        if (isClaudeRelated) {
          console.log(`      - Tags Claude: ${u.tags?.filter(t => t.includes("claude")).join(", ")}`);
        }
        console.log(`      - Creado: ${u.createdAt.toLocaleString()}`);
        console.log(`      - Actualizado: ${u.updatedAt.toLocaleString()}`);
      }
    });
    
    // 4. Verificar el flujo del webhook
    console.log("\n4️⃣ Análisis del flujo del webhook:");
    console.log("   El webhook maneja dos tipos de compras:");
    console.log("   a) Workshop de Claude (metadata.type = 'claude-workshop')");
    console.log("   b) Curso regular (usa metadata.courseSlug)");
    console.log("\n   ⚠️  PROBLEMA IDENTIFICADO:");
    console.log("   Cuando se compra el curso desde /cursos/power-user-en-claude-code");
    console.log("   el webhook lo procesa como curso regular (opción b)");
    console.log("   Esto DEBERÍA funcionar si el curso existe con el slug correcto");
    
    // 5. Propuesta de solución
    console.log("\n5️⃣ SOLUCIÓN PROPUESTA:");
    console.log("   Opción 1: Asignar manualmente el curso al usuario afectado");
    console.log("   Opción 2: Modificar el webhook para detectar específicamente este curso");
    console.log("   Opción 3: Unificar el flujo para que siempre use el mismo tipo");
    
    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMEN:");
    if (course) {
      if (!course.published) {
        console.log("   ⚠️  El curso existe pero NO está publicado");
      }
      if (!course.stripeId) {
        console.log("   ⚠️  El curso NO tiene Stripe ID configurado");
      }
      if (course.published && course.stripeId) {
        console.log("   ✅ El curso está correctamente configurado");
        console.log("   El problema puede ser en el webhook o en el momento de asignación");
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugClaudeCourse();