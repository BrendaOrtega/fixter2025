import { db } from "../app/.server/db";

const postContent = `Un **skeleton** es un marcador de posición temporal que anticipa la estructura del contenido que se va a cargar.

## Beneficios de usar skeletons

- **Evita que el usuario piense que el sitio no funciona:** Los skeletons proporcionan retroalimentación visual inmediata, indicando que el contenido está en proceso de carga.

- **Modifica la percepción del tiempo de espera:** La animación y el movimiento del skeleton crean la ilusión de que el contenido se está cargando más rápidamente de lo que realmente es.

- **Reduce la carga cognitiva:** Los skeletons preparan al usuario para el tipo de contenido que está por llegar, facilitando la transición y mejorando la experiencia de usuario.

## Tipos de skeleton

Según el [N/N group](https://www.nngroup.com/articles/skeleton-screens/) existen tres tipos de skeleton:

### Static-content Skeleton

Es la versión más básica que existe. Son grises de fondo.

### Animated skeleton

Es la opción más usada por ofrecer una mejor experiencia de usuario.

![Skeleton animado ejemplo](https://i.imgur.com/2uCfOIi.gif)

### Frame-display skeleton

Muestra el contenido del sitio, por ejemplo las imágenes en baja resolución.

## ¿Cuándo usar skeleton, spinner o progress bar?

- **Skeleton:** Cuando el tiempo de carga es de 3 a 10 segundos.
- **Spinner:** Para cargas de menos de 3 segundos.
- **Progress bar:** Si el tiempo de carga supera los 10 segundos.

![Ejemplo de loading states](https://i.imgur.com/E9OFiKo.gif)

> 👀 Aprende aquí cómo hacer un skeleton utilizando [HydrateFallback](/blog/Hydrate-Fallback-para-que-sirve).

---

¿Te gustaría recibir más tips de diseño UI/UX? Suscríbete a nuestro [newsletter](/newsletter) para no perderte ningún artículo.`;

async function main() {
  const slug = "Skeletons.-Que-son-y-cuando-utilizarlos_E8M";

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

  // Crear el post con la fecha original (1 Abril 2025)
  const post = await db.post.create({
    data: {
      slug,
      title: "Skeletons. ¿Qué son y cuando utilizarlos?",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage: "https://i.imgur.com/cNrF5Fm.png",
      metaImage: "https://i.imgur.com/cNrF5Fm.png",

      // Autor - BrendaGo (no Héctorbliss)
      authorName: "BrendaGo",
      authorAt: "@brendago",
      photoUrl: "https://i.imgur.com/TFQxcIu.jpg",
      authorAtLink: "https://www.linkedin.com/in/brendago",

      // Clasificación
      mainTag: "UI",
      tags: ["Diseño"],
      category: ["design"],

      // Fecha original del post (1 Abril 2025)
      createdAt: new Date(1743537874361),
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
  console.log(`  Autor: ${post.authorName}`);
  console.log(`  Cover: ${post.coverImage}`);

  await db.$disconnect();
}

main().catch(console.error);
