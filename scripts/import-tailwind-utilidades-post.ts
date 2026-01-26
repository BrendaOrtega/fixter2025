import { db } from "../app/.server/db";

const postContent = `Existen muchas herramientas en Tailwind que ignoramos, a veces porque ni siquiera las conocemos en CSS, pero al mismo tiempo cuando descubrimos estas herramientas dentro de Tailwind y las vamos a comparar con cómo se hace con CSS, resulta que Tailwind incluso las simplifica, y puedes comenzar a usarlas para mejorar tus estilos, sin esfuerzo.

Por eso en este post vamos a explorar 3 herramientas escondidas de Tailwind ¡que valen mucho la pena!

### Rings

Los anillos son poco comunes, pero cuando los utilizas adecuadamente pueden ser una ayuda visual muy útil para tu diseño.

\`\`\`html
<button class="ring-4 rounded-2xl px-8 py-4 bg-blue-500 text-white ring-blue-500/50">
  Soy un botón con anillo
</button>
\`\`\`

[Aquí el resultado](https://play.tailwindcss.com/ApX8QQAGgo)

[Aprende más sobre los anillos aquí](https://tailwindcss.com/docs/ring-width)

---

🎬 **¿Te está gustando este contenido?** Tenemos más tutoriales en video en nuestro [canal de YouTube](https://www.youtube.com/@fixtergeek).

---

### Animaciones

Las animaciones en Tailwind son súper fáciles de usar. Por ejemplo, para crear un spinner de carga:

\`\`\`html
<button class="flex gap-2 items-center rounded-2xl px-8 py-4 bg-blue-500 text-white">
  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  Cargando...
</button>
\`\`\`

[Aquí el resultado](https://play.tailwindcss.com/wYtQYQO1ID)

[Aprende más sobre las animaciones aquí](https://tailwindcss.com/docs/animation)

### Space Between

Esta utilidad es genial para agregar espaciado entre elementos hijos en un contenedor flex, sin tener que usar \`gap\` o agregar clases a cada elemento:

\`\`\`html
<div class="flex flex-wrap space-x-6 space-y-8">
  <div class="w-20 h-20 bg-red-500"></div>
  <div class="w-20 h-20 bg-green-500"></div>
  <div class="w-20 h-20 bg-blue-500"></div>
  <div class="w-20 h-20 bg-yellow-500"></div>
</div>
\`\`\`

[Aquí el resultado](https://play.tailwindcss.com/9My0c6Nky5)

[Aprende más sobre space aquí](https://tailwindcss.com/docs/space)

### Conclusión

Estas 3 utilidades de Tailwind pueden ahorrarte mucho tiempo y hacer que tu código sea más limpio. Si quieres aprender más sobre Tailwind, te recomiendo revisar [este otro post sobre clases dinámicas en Tailwind](/blog/tailwindcss-clases-dinamicas) y seguirme en [Twitter](https://twitter.com/HectorBlisS) donde comparto más tips.

Abrazo. Bliss.`;

async function main() {
  const slug = "utilidades-escondidas-de-tailwindcss--2022";

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

  // Crear el post con la fecha original (19 Diciembre 2022)
  const post = await db.post.create({
    data: {
      slug,
      title: "Utilidades escondidas de tailwindcss 😱",
      body: postContent.trim(),
      published: true,

      // Imágenes
      coverImage:
        "https://www.atsistemas.com/dam/jcr:20b575da-1767-43dc-b18f-4f2a9f722877/1375-775-tailwind-css.png",
      metaImage: "https://i.imgur.com/P8E8BPI.png",

      // Autor
      authorName: "Héctorbliss",
      authorAt: "@hectorbliss",
      photoUrl: "https://i.imgur.com/TaDTihr.png",
      authorAtLink: "https://twitter.com/HectorBlisS",

      // Clasificación
      mainTag: "Tailwind",
      tags: ["diseño", "estilos", "html5"],
      category: ["css", "html", "ui", "tailwind"],

      // Fecha original del post (19 Diciembre 2022)
      createdAt: new Date(1671472219072),
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
