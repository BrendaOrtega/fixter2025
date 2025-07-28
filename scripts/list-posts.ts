#!/usr/bin/env tsx

/**
 * Script para listar posts disponibles en la base de datos
 * Ejecutar con: npx tsx scripts/list-posts.ts
 */

import { db } from "../app/.server/db";

async function listPosts() {
  try {
    console.log("📚 Listando posts disponibles...\n");

    const posts = await db.post.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        body: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (posts.length === 0) {
      console.log("❌ No hay posts publicados en la base de datos");
      console.log(
        "\n💡 Necesitas crear algunos posts primero para probar el AudioPlayer"
      );
      return;
    }

    console.log(`✅ Encontrados ${posts.length} posts:\n`);

    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   URL: http://localhost:3000/blog/${post.slug}`);
      console.log(
        `   Contenido: ${post.body ? "Sí" : "No"} (${
          post.body?.length || 0
        } caracteres)`
      );
      console.log(`   Fecha: ${post.createdAt.toLocaleDateString()}`);
      console.log("");
    });

    console.log(
      "💡 Puedes probar el AudioPlayer en cualquiera de estos posts!"
    );
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    console.log(
      "\n💡 Verifica que DATABASE_URL esté configurado correctamente"
    );
  } finally {
    await db.$disconnect();
  }
}

listPosts().catch(console.error);
