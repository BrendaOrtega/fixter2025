/**
 * Script de migración: Regenera el campo `body` desde `content` (Tiptap JSON)
 * para posts que ya tienen formato Tiptap.
 *
 * Uso: npx tsx scripts/migrate-tiptap-to-markdown.ts
 *
 * Opciones:
 *   --dry-run    Solo muestra qué se actualizaría sin hacer cambios
 */

import { PrismaClient } from "@prisma/client";
import { tiptapToMarkdown } from "../app/.server/utils/tiptap-to-markdown";

const db = new PrismaClient();

async function migrate() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("🔍 Buscando posts con formato Tiptap...\n");

  const posts = await db.post.findMany({
    where: {
      contentFormat: "tiptap",
      content: { not: null },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      body: true,
    },
  });

  console.log(`📝 Encontrados ${posts.length} posts con formato Tiptap\n`);

  if (posts.length === 0) {
    console.log("✅ No hay posts que migrar");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      const markdown = tiptapToMarkdown(post.content);

      if (!markdown || markdown.trim() === "") {
        console.log(`⏭️  [SKIP] "${post.title}" - Markdown vacío generado`);
        skipped++;
        continue;
      }

      // Comparar si el body ya está actualizado
      if (post.body === markdown) {
        console.log(`⏭️  [SKIP] "${post.title}" - Body ya está actualizado`);
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`📋 [DRY-RUN] "${post.title}"`);
        console.log(`   Slug: ${post.slug}`);
        console.log(
          `   Body actual: ${post.body?.substring(0, 50) || "(vacío)"}...`
        );
        console.log(`   Nuevo body: ${markdown.substring(0, 50)}...`);
        console.log("");
        updated++;
        continue;
      }

      await db.post.update({
        where: { id: post.id },
        data: { body: markdown },
      });

      console.log(`✅ [UPDATED] "${post.title}"`);
      updated++;
    } catch (error: any) {
      console.error(`❌ [ERROR] "${post.title}": ${error.message}`);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Resumen de migración:");
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ⏭️  Omitidos: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);

  if (isDryRun) {
    console.log(
      "\n⚠️  Modo DRY-RUN: No se realizaron cambios en la base de datos"
    );
    console.log("   Ejecuta sin --dry-run para aplicar los cambios");
  }
}

migrate()
  .catch((e) => {
    console.error("Error fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
