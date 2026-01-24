/**
 * Script para renombrar el slug del curso Prisma ORM
 * Ejecutar con: npx tsx scripts/rename-prisma-course.ts
 */

import { db } from "../app/.server/db";

const OLD_SLUG = "prisma-orm";
const NEW_SLUG = "construye-un-backend-con-prisma-typescript-y-express-en-nodejs";
const NEW_TITLE = "Construye un Backend con Prisma, TypeScript y Express en Node.js";

async function renamePrismaCourse() {
  console.log("🔄 Buscando curso con slug:", OLD_SLUG);

  // Buscar el curso existente
  const course = await db.course.findUnique({
    where: { slug: OLD_SLUG },
    select: { id: true, slug: true, title: true },
  });

  if (!course) {
    console.log("❌ No se encontró el curso con slug:", OLD_SLUG);
    console.log("   Puede que ya haya sido renombrado.");

    // Verificar si ya existe con el nuevo slug
    const existingNew = await db.course.findUnique({
      where: { slug: NEW_SLUG },
      select: { id: true, slug: true, title: true },
    });

    if (existingNew) {
      console.log("✅ El curso ya existe con el nuevo slug:", NEW_SLUG);
      console.log("   Título:", existingNew.title);
    }
    return;
  }

  console.log("📋 Curso encontrado:");
  console.log("   ID:", course.id);
  console.log("   Slug actual:", course.slug);
  console.log("   Título actual:", course.title);

  // Actualizar el slug y título
  const updated = await db.course.update({
    where: { slug: OLD_SLUG },
    data: {
      slug: NEW_SLUG,
      title: NEW_TITLE,
    },
  });

  console.log("\n✅ Curso actualizado exitosamente:");
  console.log("   Nuevo slug:", updated.slug);
  console.log("   Nuevo título:", updated.title);
  console.log("\n🔗 Nueva URL: /cursos/" + NEW_SLUG + "/detalle");
}

renamePrismaCourse()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
