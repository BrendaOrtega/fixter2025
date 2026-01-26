import { db } from "../app/.server/db";

const postContent = `## CONTENIDO PENDIENTE ##

El contenido del body del post se perdió durante la compactación del contexto.
Por favor, proporciona nuevamente el contenido del post de msw.js del archivo Wayback Machine.`;

async function main() {
  const slug = "como-emular-axiosfetch-para-manejar-peticiones-http-en-tests-con-mswjs";

  // Verificar si ya existe
  const existing = await db.post.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log(`Post ya existe con slug: ${slug}`);
    console.log(`ID: ${existing.id}`);
    console.log(`Título: ${existing.title}`);
    await db.$disconnect();
    return;
  }

  // Crear el post con la fecha original (21 Mayo 2022)
  const post = await db.post.create({
    data: {
      slug,
      title: "Cómo emular axios/fetch para manejar peticiones http en tests con msw.js",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/QcqjakC.png",
      metaImage: "https://i.imgur.com/QcqjakC.png",

      // Autor (David Zavala, no Héctorbliss)
      authorName: "David Zavala",
      authorAt: null,
      photoUrl: "https://i.imgur.com/X7m3EsR.jpg",
      authorAtLink: "https://www.linkedin.com/company/fixtergeek/",

      // Clasificación
      mainTag: "Jest",
      tags: ["jest", "testing", "msw", "axios", "fetch"],
      category: ["testing"],

      // Fecha original del post (21 Mayo 2022)
      createdAt: new Date(1653111354523),
      updatedAt: new Date(),

      isFeatured: false,
    },
  });

  console.log("Post creado exitosamente:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Título: ${post.title}`);
  console.log(`  URL: /blog/${post.slug}`);
  console.log(`  Fecha original: ${post.createdAt}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
