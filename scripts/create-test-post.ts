#!/usr/bin/env tsx

/**
 * Script para crear un post de prueba para el AudioPlayer
 * Ejecutar con: npx tsx scripts/create-test-post.ts
 */

import { db } from "../app/.server/db";

async function createTestPost() {
  try {
    console.log("📝 Creando post de prueba...\n");

    const testPost = await db.post.create({
      data: {
        title: "Audio Test - Hackea tu futuro con Fixtergeek",
        slug: "audio-test-hackea-tu-futuro",
        body: `
¿Cansado de tutoriales básicos que no te llevan a ningún lado? En Fixtergeek.com rompemos las reglas del aprendizaje tradicional. Aquí no memorizas sintaxis, aquí aprendes a pensar como un hacker.

Dominamos JavaScript, React, Node.js, Python, y las últimas tecnologías de inteligencia artificial. Pero no solo eso: te enseñamos a quebrar problemas complejos, a optimizar como un ninja, y a construir productos que realmente importen.

Nuestros instructores no son profesores de academia. Son desarrolladores que han estado en las trincheras, que han construido startups, que han escalado sistemas a millones de usuarios.

Miles de developers ya han hackeado su carrera con nosotros. Es tu turno de unirte a la revolución del código. Fixtergeek: donde los developers reales aprenden las skills que realmente importan.

## ¿Qué aprenderás?

- JavaScript avanzado y patrones de diseño
- React y el ecosistema moderno de frontend
- Node.js y desarrollo backend escalable
- Integración con APIs de inteligencia artificial
- Optimización de performance y mejores prácticas
- Deployment y DevOps para developers

## ¿Por qué Fixtergeek?

Porque no somos una escuela tradicional. Somos hackers que enseñan a otros hackers. Nuestro enfoque es práctico, directo, y enfocado en resultados reales.

¡Únete a la comunidad de developers que están cambiando el mundo, una línea de código a la vez!
        `.trim(),
        published: true,
        metaImage: "/stars.png",
        coverImage: "/stars.png",
        mainTag: "javascript",
        tags: ["javascript", "react", "nodejs", "ai", "tutorial"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Post de prueba creado exitosamente!");
    console.log(`   ID: ${testPost.id}`);
    console.log(`   Título: ${testPost.title}`);
    console.log(`   Slug: ${testPost.slug}`);
    console.log(`   URL: http://localhost:3000/blog/${testPost.slug}`);
    console.log(`   Contenido: ${testPost.body?.length} caracteres`);

    console.log("\n🎵 Ahora puedes probar el AudioPlayer en:");
    console.log(`   http://localhost:3000/blog/${testPost.slug}`);
  } catch (error) {
    console.error("❌ Error creando el post:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestPost().catch(console.error);
