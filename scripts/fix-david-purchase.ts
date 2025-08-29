import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDavidPurchase() {
  try {
    console.log("🔧 Arreglando la compra de David Zavala\n");
    
    const email = "crusedmoss@gmail.com";
    const courseId = "68a617e896468300160b6dfb"; // ID del curso Power-User en Claude Code
    
    // Datos del webhook de Stripe
    const workshopData = {
      selectedModules: [1, 2, 3, 4, 5],
      totalPrice: 1490,
      paidAt: new Date("2025-08-28T18:12:03Z").toISOString(),
      sessionId: "cs_live_b1cYJ5q4tfsf9KNps0QQOM3NbcYES5PabnmY44nFSamNsjEuLJ1UmJ2nNf",
      paymentStatus: "completed",
      purchaseType: "direct",
      discountApplied: true,
      originalPrice: 1490,
      finalPrice: 745
    };
    
    // Buscar el usuario
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        courses: true,
        tags: true,
        metadata: true
      }
    });
    
    if (!existingUser) {
      console.log("❌ Usuario no encontrado. Creando nuevo usuario...");
      
      const newUser = await prisma.user.create({
        data: {
          email,
          username: email,
          displayName: "Angel David Zavala Bartolome",
          phoneNumber: "+525560703961",
          courses: [courseId],
          editions: [],
          roles: [],
          tags: [
            "claude-workshop-paid",
            "newsletter",
            "direct-purchase"
          ],
          metadata: { workshop: workshopData },
          confirmed: true,
          role: "STUDENT"
        }
      });
      
      console.log("✅ Usuario creado con el curso asignado");
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Curso Claude Code: ASIGNADO`);
      
    } else {
      console.log("👤 Usuario encontrado:", existingUser.displayName || existingUser.email);
      console.log(`   Cursos actuales: ${existingUser.courses.length}`);
      
      const hasCourse = existingUser.courses.includes(courseId);
      console.log(`   ¿Tiene el curso Claude Code?: ${hasCourse ? "✅ SÍ" : "❌ NO"}`);
      
      if (!hasCourse) {
        // Actualizar usuario para añadir el curso y los datos del workshop
        const updatedUser = await prisma.user.update({
          where: { email },
          data: {
            displayName: "Angel David Zavala Bartolome",
            phoneNumber: "+525560703961",
            courses: { push: courseId },
            tags: { 
              push: existingUser.tags?.includes("claude-workshop-paid") 
                ? [] 
                : "claude-workshop-paid" 
            },
            metadata: {
              ...(existingUser.metadata || {}),
              workshop: workshopData
            }
          }
        });
        
        console.log("\n✅ Usuario actualizado exitosamente");
        console.log(`   Curso Claude Code: ASIGNADO`);
        console.log(`   Total de cursos ahora: ${updatedUser.courses.length}`);
        console.log(`   Datos del workshop guardados en metadata`);
        
      } else {
        console.log("\n✅ El usuario YA tenía el curso asignado");
        
        // Verificar si necesita actualizar metadata del workshop
        if (!existingUser.metadata?.workshop) {
          await prisma.user.update({
            where: { email },
            data: {
              metadata: {
                ...(existingUser.metadata || {}),
                workshop: workshopData
              }
            }
          });
          console.log("   Metadata del workshop actualizada");
        }
      }
    }
    
    console.log("\n📧 Recomendación: Enviar email manual de confirmación a David");
    console.log("   Email: crusedmoss@gmail.com");
    console.log("   Incluir:");
    console.log("   - Disculpa por el inconveniente");
    console.log("   - Confirmación de acceso al curso");
    console.log("   - Link directo: https://www.fixtergeek.com/mis-cursos");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDavidPurchase();