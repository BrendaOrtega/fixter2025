/**
 * Script para arreglar tablas mal formateadas en posts del blog
 *
 * Problema: Las tablas GFM tienen \n\n entre filas en lugar de \n
 * Esto rompe el parsing de tablas en Streamdown/remark-gfm
 *
 * Uso: npx tsx scripts/fix-table-formatting.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function fixTableFormatting() {
  console.log("🔍 Buscando posts con tablas...\n");

  const posts = await db.post.findMany({
    where: { published: true },
    select: { id: true, slug: true, body: true },
  });

  let fixedCount = 0;

  for (const post of posts) {
    if (!post.body) continue;

    // Detectar si tiene tablas con formato roto (doble salto entre filas)
    // Patrón: línea con | seguida de \n\n seguida de otra línea con |
    const brokenTablePattern = /(\|[^\n]+\|)\n\n(\|[^\n]+\|)/g;

    if (brokenTablePattern.test(post.body)) {
      console.log(`📝 Arreglando: ${post.slug}`);

      // Arreglar el markdown
      let fixedBody = post.body;

      // Reemplazar \n\n por \n entre filas de tabla
      // Hacerlo múltiples veces porque el regex consume caracteres
      let prevBody = "";
      while (prevBody !== fixedBody) {
        prevBody = fixedBody;
        fixedBody = fixedBody.replace(
          /(\|[^\n]+\|)\n\n(\|[^\n]+\|)/g,
          "$1\n$2"
        );
      }

      // Mostrar el antes y después de la tabla
      const tableMatch = fixedBody.match(/\|[^\n]+\|[\s\S]*?\|[^\n]+\|\n(?!\|)/);
      if (tableMatch) {
        console.log("   Tabla arreglada:");
        console.log(
          tableMatch[0]
            .split("\n")
            .slice(0, 5)
            .map((l) => "   " + l)
            .join("\n")
        );
        console.log("   ...\n");
      }

      // Actualizar en la DB
      await db.post.update({
        where: { id: post.id },
        data: { body: fixedBody },
      });

      fixedCount++;
    }
  }

  console.log(`\n✅ Proceso completado. Posts arreglados: ${fixedCount}`);
  await db.$disconnect();
}

fixTableFormatting().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
