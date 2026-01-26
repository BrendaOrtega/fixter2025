import { db } from "../app/.server/db";

const promptsPostContent = `
En este video ensayo un poco sobre mi auto-educación en AI y cómo estoy construyendo un app AI para aprender más rápido.

---

🎬 **¿Te interesa aprender más sobre IA?** Tenemos más contenido en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

Abrazo. Bliss. 🤓
`;

async function main() {
  console.log("Importando post de trucos para prompts...");

  const slug = "3-trucos-mejorar-prompts";
  const title = "Estos son 3 pequeños trucos que mejorarán tus prompts";

  // Verificar si ya existe por slug o título
  const existingBySlug = await db.post.findUnique({
    where: { slug },
  });

  const existingByTitle = await db.post.findUnique({
    where: { title },
  });

  const existing = existingBySlug || existingByTitle;

  if (existing) {
    console.log("⚠️  El post ya existe (ID: " + existing.id + "). Actualizando...");
    const post = await db.post.update({
      where: { id: existing.id },
      data: {
        slug,
        title,
        body: promptsPostContent.trim(),
        published: true,
        coverImage: "https://i.imgur.com/Z2L4fDg.jpg",
        metaImage: "https://i.imgur.com/Z2L4fDg.jpg",
        youtubeLink: "https://youtu.be/o1ciYMHN-Wo",
        authorName: "Héctorbliss",
        authorAt: "@blissito",
        photoUrl: "https://i.imgur.com/TaDTihr.png",
        authorAtLink: "https://www.hectorbliss.com",
        tags: ["llm", "webdev", "tips"],
        mainTag: "prompt",
      },
    });
    console.log("✅ Post actualizado exitosamente!");
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   URL: /blog/${post.slug}`);
    return;
  }

  const post = await db.post.create({
    data: {
      slug,
      title,
      body: promptsPostContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/Z2L4fDg.jpg",
      metaImage: "https://i.imgur.com/Z2L4fDg.jpg",

      // YouTube
      youtubeLink: "https://youtu.be/o1ciYMHN-Wo",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@blissito",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://www.hectorbliss.com",

      // Clasificación
      tags: ["llm", "webdev", "tips"],
      mainTag: "prompt",
    },
  });

  console.log("✅ Post importado exitosamente!");
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   URL: /blog/${post.slug}`);
}

main()
  .catch((e) => {
    console.error("❌ Error creando post:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
