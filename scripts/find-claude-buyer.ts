import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findClaudeBuyer() {
  try {
    console.log("🔍 Buscando usuario que compró el curso de Claude Code ayer\n");
    
    // Buscar usuarios con tags de claude-workshop-paid
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    
    console.log(`Buscando entre: ${yesterdayStart.toLocaleString()} y ${todayEnd.toLocaleString()}\n`);
    
    // Buscar usuarios con tags de Claude
    const claudeUsers = await prisma.user.findMany({
      where: {
        tags: { has: "claude-workshop-paid" },
        updatedAt: {
          gte: yesterdayStart
        }
      },
      select: {
        email: true,
        displayName: true,
        courses: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" }
    });
    
    const courseId = "68a617e896468300160b6dfb"; // ID del curso Claude Code
    
    console.log(`📧 Usuarios con compras de Claude recientes: ${claudeUsers.length}\n`);
    
    claudeUsers.forEach(u => {
      const hasCourse = u.courses.includes(courseId);
      console.log(`👤 ${u.email} (${u.displayName || "sin nombre"})`);
      console.log(`   - Actualizado: ${u.updatedAt.toLocaleString()}`);
      console.log(`   - Tiene curso Claude: ${hasCourse ? "✅ SÍ" : "❌ NO"}`);
      console.log(`   - Tags: ${u.tags?.filter(t => t.includes("claude")).join(", ")}`);
      if (u.metadata && Object.keys(u.metadata).length > 0) {
        console.log(`   - Metadata: ${JSON.stringify(u.metadata, null, 2)}`);
      }
      
      if (!hasCourse && u.tags?.includes("claude-workshop-paid")) {
        console.log(`   ⚠️  POSIBLE AFECTADO: Pagó pero no tiene el curso asignado`);
      }
      console.log();
    });
    
    // Buscar también por email si el usuario nos contactó
    console.log("\n🔍 Buscando usuarios que podrían haber contactado...");
    
    // Los usuarios que típicamente contactan después de comprar
    const possibleEmails = [
      // Aquí podrías poner emails específicos si los conoces
    ];
    
    // Buscar todos los usuarios actualizados ayer sin el curso
    const yesterdayUsers = await prisma.user.findMany({
      where: {
        updatedAt: {
          gte: yesterdayStart,
          lt: todayEnd
        },
        NOT: {
          courses: { has: courseId }
        }
      },
      select: {
        email: true,
        displayName: true,
        courses: true,
        tags: true,
        metadata: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" }
    });
    
    console.log(`\n📅 Usuarios actualizados ayer SIN el curso Claude: ${yesterdayUsers.length}`);
    
    yesterdayUsers.forEach(u => {
      // Solo mostrar si tiene alguna relación con pagos o workshops
      const hasPaymentTags = u.tags?.some(t => 
        t.includes("paid") || 
        t.includes("workshop") || 
        t.includes("claude")
      );
      
      const hasWorkshopMetadata = u.metadata && 
        (u.metadata.workshop || u.metadata.selectedModules);
      
      if (hasPaymentTags || hasWorkshopMetadata) {
        console.log(`\n🚨 CANDIDATO: ${u.email}`);
        console.log(`   - Nombre: ${u.displayName || "sin nombre"}`);
        console.log(`   - Actualizado: ${u.updatedAt.toLocaleString()}`);
        console.log(`   - Total cursos: ${u.courses.length}`);
        console.log(`   - Tags relevantes: ${u.tags?.filter(t => 
          t.includes("paid") || t.includes("workshop") || t.includes("claude")
        ).join(", ")}`);
        if (hasWorkshopMetadata) {
          console.log(`   - Metadata workshop: SÍ`);
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

findClaudeBuyer();